"""Polling worker that uses shared expiring claims for monitor checks."""
import logging
import threading
from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.exc import SQLAlchemyError

from app.core.check_claims import claim_monitor_check, release_monitor_claim
from app.core.monitoring import CheckClaimLost, perform_check
from app.db.session import SessionLocal
from app.models import Monitor

logger = logging.getLogger(__name__)

POLL_INTERVAL_SECONDS = 10
BATCH_SIZE = 20
CLAIM_LEASE_SECONDS = 40
SHUTDOWN_TIMEOUT_SECONDS = 35


def run_due_checks() -> int:
    """Find due monitors, claim each atomically, and check without holding a DB lock."""
    now = datetime.now(timezone.utc)
    with SessionLocal() as db:
        monitor_ids = list(
            db.scalars(
                select(Monitor.id)
                .where(
                    Monitor.is_active.is_(True),
                    Monitor.next_check_at <= now,
                )
                .order_by(Monitor.next_check_at.asc())
                .limit(BATCH_SIZE)
            ).all()
        )

    attempted = 0
    for monitor_id in monitor_ids:
        with SessionLocal() as db:
            try:
                claim = claim_monitor_check(
                    db, monitor_id, scheduled=True, lease_seconds=CLAIM_LEASE_SECONDS
                )
            except SQLAlchemyError:
                logger.exception("Could not claim monitor_id=%s", monitor_id)
                continue
        if claim is None:
            continue

        with SessionLocal() as db:
            try:
                monitor = db.scalar(select(Monitor).where(Monitor.id == monitor_id))
                if monitor is None:
                    continue
                result = perform_check(db, monitor, claim_token=claim.token)
                attempted += 1
                logger.info(
                    "Monitor check completed",
                    extra={
                        "monitor_id": monitor_id,
                        "success": result.success,
                        "status_code": result.status_code,
                        "response_time_ms": result.response_time_ms,
                    },
                )
            except CheckClaimLost:
                logger.info("Discarded stale check result for monitor_id=%s", monitor_id)
            except SQLAlchemyError:
                db.rollback()
                logger.exception("Database error while checking monitor_id=%s", monitor_id)
            except Exception:
                db.rollback()
                logger.exception("Unexpected error while checking monitor_id=%s", monitor_id)
            finally:
                # Safe if perform_check already cleared it; token matching prevents
                # this cleanup from releasing a newer worker's claim.
                try:
                    release_monitor_claim(db, claim)
                except SQLAlchemyError:
                    logger.exception("Could not release claim for monitor_id=%s", monitor_id)

    return attempted


def _worker_loop(stop_event: threading.Event) -> None:
    logger.info("TraceStack monitoring worker started")
    while not stop_event.is_set():
        try:
            run_due_checks()
        except Exception:
            logger.exception("Monitoring worker iteration failed")
        stop_event.wait(POLL_INTERVAL_SECONDS)
    logger.info("TraceStack monitoring worker stopped")


class MonitoringWorker:
    """Owns the background thread lifecycle for the FastAPI application."""

    def __init__(self) -> None:
        self._stop_event = threading.Event()
        self._thread: threading.Thread | None = None

    def start(self) -> None:
        if self._thread is not None and self._thread.is_alive():
            return
        self._stop_event.clear()
        self._thread = threading.Thread(
            target=_worker_loop,
            args=(self._stop_event,),
            name="tracestack-monitor-worker",
            daemon=True,
        )
        self._thread.start()

    def stop(self) -> None:
        self._stop_event.set()
        thread = self._thread
        if thread is None:
            return

        thread.join(timeout=SHUTDOWN_TIMEOUT_SECONDS)
        if thread.is_alive():
            logger.warning(
                "Monitoring worker did not stop within %s seconds; "
                "will not start a replacement while it is still running",
                SHUTDOWN_TIMEOUT_SECONDS,
            )
            return

        self._thread = None
