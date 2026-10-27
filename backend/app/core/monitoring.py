from datetime import datetime, timedelta, timezone
from time import perf_counter

import httpx
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.url_security import UnsafeTargetError, validate_public_http_url
from app.models import CheckResult, Incident, Monitor, Notification
from app.core.notifications import dispatch_web_push


class CheckClaimLost(RuntimeError):
    """Raised when a check's claim expired or was replaced before persistence."""


def perform_check(db: Session, monitor: Monitor, *, claim_token: str | None = None) -> CheckResult:
    """Run HTTP outside a transaction and persist only while the claim is still owned."""
    monitor_id = monitor.id
    monitor_url = monitor.url
    timeout_seconds = monitor.timeout_seconds
    expected_status_code = monitor.expected_status_code
    check_interval_seconds = monitor.check_interval_seconds
    now = datetime.now(timezone.utc)
    started = perf_counter()
    status_code: int | None = None
    error_type: str | None = None
    error_message: str | None = None

    try:
        validate_public_http_url(monitor_url)
        timeout = httpx.Timeout(float(timeout_seconds))
        with httpx.Client(timeout=timeout, follow_redirects=False, trust_env=False) as client:
            response = client.get(monitor_url, headers={"User-Agent": "TraceStack-Monitor/0.1"})
            status_code = response.status_code
        success = status_code == expected_status_code
        if not success:
            error_type = "unexpected_status"
            error_message = f"Expected HTTP {expected_status_code}, received HTTP {status_code}."
    except UnsafeTargetError as exc:
        success = False
        error_type = "unsafe_target"
        error_message = str(exc)
    except httpx.TimeoutException:
        success = False
        error_type = "timeout"
        error_message = f"Request exceeded the {timeout_seconds}-second timeout."
    except httpx.RequestError:
        success = False
        error_type = "connection_error"
        error_message = "The endpoint could not be reached."
    except Exception:
        # Do not expose internal exception details or connection configuration to API clients.
        success = False
        error_type = "check_error"
        error_message = "The check failed because of an unexpected internal error."

    elapsed_ms = round((perf_counter() - started) * 1000, 2)
    notification: Notification | None = None

    if claim_token is not None:
        # End the read transaction and re-read under a row lock before persisting.
        # If the lease was reclaimed, discard this stale result and all state changes.
        db.rollback()
        monitor = db.scalar(
            select(Monitor).where(Monitor.id == monitor_id).with_for_update()
        )
        if monitor is None or monitor.check_claim_token != claim_token or not monitor.is_active:
            db.rollback()
            raise CheckClaimLost(f"Check claim was lost for monitor_id={monitor_id}")

    result = CheckResult(
        monitor_id=monitor_id,
        checked_at=now,
        success=success,
        status_code=status_code,
        response_time_ms=elapsed_ms,
        error_type=error_type,
        error_message=error_message,
    )
    db.add(result)

    monitor.last_checked_at = now
    monitor.next_check_at = now + timedelta(seconds=check_interval_seconds)
    if claim_token is not None:
        monitor.check_claim_token = None
        monitor.check_claim_expires_at = None

    if success:
        monitor.current_status = "up"
        monitor.consecutive_successes += 1
        monitor.consecutive_failures = 0
        if monitor.consecutive_successes >= 2:
            incident = db.scalar(
                select(Incident)
                .where(Incident.monitor_id == monitor.id, Incident.status == "open")
                .order_by(Incident.started_at.desc())
                .limit(1)
            )
            if incident is not None:
                incident.status = "resolved"
                incident.resolved_at = now
                incident.summary = "Endpoint recovered after two consecutive successful checks."
                if monitor.owner_id:
                    notification = Notification(
                        owner_id=monitor.owner_id, monitor_id=monitor.id, incident_id=incident.id,
                        type="monitor_recovered", title=f"{monitor.name} recovered",
                        message=f"{monitor.url} is responding normally again.",
                    )
                    db.add(notification)
    else:
        monitor.current_status = "down"
        monitor.consecutive_failures += 1
        monitor.consecutive_successes = 0
        if monitor.consecutive_failures >= 2:
            open_incident = db.scalar(
                select(Incident.id)
                .where(Incident.monitor_id == monitor.id, Incident.status == "open")
                .limit(1)
            )
            if open_incident is None:
                incident = Incident(
                    monitor_id=monitor.id, title=f"{monitor.name} is failing", status="open",
                    started_at=now, failure_count_at_open=monitor.consecutive_failures,
                    summary=error_message or "The endpoint did not return the expected status.",
                )
                db.add(incident)
                db.flush()
                if monitor.owner_id:
                    notification = Notification(
                        owner_id=monitor.owner_id, monitor_id=monitor.id, incident_id=incident.id,
                        type="monitor_down", title=f"{monitor.name} is down",
                        message=error_message or f"{monitor.url} failed its health check.",
                    )
                    db.add(notification)

    db.add(monitor)
    db.commit()
    db.refresh(result)
    if notification is not None:
        db.refresh(notification)
        try:
            dispatch_web_push(db, notification)
        except Exception:
            import logging
            logging.getLogger(__name__).exception("Web push dispatch failed for notification_id=%s", notification.id)
    return result
