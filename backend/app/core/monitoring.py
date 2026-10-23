from datetime import datetime, timedelta, timezone
from time import perf_counter

import httpx
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.url_security import UnsafeTargetError, validate_public_http_url
from app.models import CheckResult, Incident, Monitor


def perform_check(db: Session, monitor: Monitor) -> CheckResult:
    """Check one monitor, persist the result, and update its incident state.

    The caller should hold a row lock for this monitor (PostgreSQL FOR UPDATE) to
    serialize overlapping manual checks. Scheduled workers should claim due monitors
    separately rather than keeping a transaction open during the network request.
    """
    now = datetime.now(timezone.utc)
    started = perf_counter()
    status_code: int | None = None
    error_type: str | None = None
    error_message: str | None = None

    try:
        validate_public_http_url(monitor.url)
        timeout = httpx.Timeout(float(monitor.timeout_seconds))
        with httpx.Client(timeout=timeout, follow_redirects=False, trust_env=False) as client:
            response = client.get(monitor.url, headers={"User-Agent": "TraceStack-Monitor/0.1"})
            status_code = response.status_code
        success = status_code == monitor.expected_status_code
        if not success:
            error_type = "unexpected_status"
            error_message = f"Expected HTTP {monitor.expected_status_code}, received HTTP {status_code}."
    except UnsafeTargetError as exc:
        success = False
        error_type = "unsafe_target"
        error_message = str(exc)
    except httpx.TimeoutException:
        success = False
        error_type = "timeout"
        error_message = f"Request exceeded the {monitor.timeout_seconds}-second timeout."
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
    result = CheckResult(
        monitor_id=monitor.id,
        checked_at=now,
        success=success,
        status_code=status_code,
        response_time_ms=elapsed_ms,
        error_type=error_type,
        error_message=error_message,
    )
    db.add(result)

    monitor.last_checked_at = now
    monitor.next_check_at = now + timedelta(seconds=monitor.check_interval_seconds)

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
                db.add(
                    Incident(
                        monitor_id=monitor.id,
                        title=f"{monitor.name} is failing",
                        status="open",
                        started_at=now,
                        failure_count_at_open=monitor.consecutive_failures,
                        summary=error_message or "The endpoint did not return the expected status.",
                    )
                )

    db.add(monitor)
    db.commit()
    db.refresh(result)
    return result
