"""Small polling worker that automatically checks due active monitors.

This MVP worker is intended for a single FastAPI process. For multi-instance
production deployments, move scheduling to a dedicated worker/queue and use
database-level claiming to avoid duplicate checks.
"""
import logging
import threading
from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.exc import SQLAlchemyError

from app.core.monitoring import perform_check
from app.db.session import SessionLocal
from app.models import Monitor

logger = logging.getLogger(__name__)

POLL_INTERVAL_SECONDS = 10
BATCH_SIZE = 20
# Monitor timeout is constrained to 30 seconds by the API schema. Allow a
# running check plus one polling interval to finish during graceful shutdown.
SHUTDOWN_TIMEOUT_SECONDS = 35


def run_due_checks() -> int:
    """Run checks for currently due monitors; return the number attempted."""
    now = datetime.now(timezone.utc)

    # Read only IDs here; each check gets its own short-lived session.
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
                # Serialize checks for the same monitor. perform_check commits
                # and advances next_check_at after recording the result.
                monitor = db.scalar(
                    select(Monitor)
                    .where(Monitor.id == monitor_id)
                    .with_for_update(skip_locked=True)
                )
                if monitor is None or not monitor.is_active:
                    db.rollback()
                    continue

                # Re-check due time after obtaining the lock; another worker or
                # manual check may already have advanced the schedule.
                now = datetime.now(timezone.utc)
                next_check_at = monitor.next_check_at
                # SQLite drops timezone information when round-tripping DateTime
                # values. Normalize only naive values so tests behave like the
                # timezone-aware timestamps returned by PostgreSQL in production.
                if next_check_at is not None and next_check_at.tzinfo is None:
                    next_check_at = next_check_at.replace(tzinfo=timezone.utc)
                if next_check_at is not None and next_check_at > now:
                    db.rollback()
                    continue

                result = perform_check(db, monitor)
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
            except SQLAlchemyError:
                db.rollback()
                logger.exception("Database error while checking monitor_id=%s", monitor_id)
            except Exception:
                db.rollback()
                logger.exception("Unexpected error while checking monitor_id=%s", monitor_id)

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
            # Keep the reference so start() cannot create a second worker while
            # the previous thread is still finishing a slow in-flight check.
            logger.warning(
                "Monitoring worker did not stop within %s seconds; "
                "will not start a replacement while it is still running",
                SHUTDOWN_TIMEOUT_SECONDS,
            )
            return

        self._thread = None
