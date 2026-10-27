"""Polling worker that claims due monitors before performing network checks.

The MVP worker can run in more than one API process without two workers
claiming the same due schedule at once. The claim is a short database update;
network I/O happens after the claim transaction has been committed.
"""
import logging
import threading
from datetime import datetime, timedelta, timezone

from sqlalchemy import select, update
from sqlalchemy.exc import SQLAlchemyError

from app.core.monitoring import perform_check
from app.db.session import SessionLocal
from app.models import Monitor

logger = logging.getLogger(__name__)

POLL_INTERVAL_SECONDS = 10
BATCH_SIZE = 20
# The API caps monitor timeouts at 30 seconds. This lease leaves a small buffer
# if a process crashes after claiming a monitor but before persisting its check.
CLAIM_LEASE_SECONDS = 40
SHUTDOWN_TIMEOUT_SECONDS = 35


def run_due_checks() -> int:
    """Claim due monitors atomically, then check them outside the claim transaction."""
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
        # Conditional UPDATE is the claim: only one concurrent worker can move
        # this still-due schedule into the lease window. Commit before HTTP I/O.
        claim_time = datetime.now(timezone.utc)
        lease_until = claim_time + timedelta(seconds=CLAIM_LEASE_SECONDS)
        with SessionLocal() as db:
            try:
                claim = db.execute(
                    update(Monitor)
                    .where(
                        Monitor.id == monitor_id,
                        Monitor.is_active.is_(True),
                        Monitor.next_check_at <= claim_time,
                    )
                    .values(next_check_at=lease_until)
                )
                if claim.rowcount != 1:
                    db.rollback()
                    continue
                db.commit()
            except SQLAlchemyError:
                db.rollback()
                logger.exception("Could not claim monitor_id=%s", monitor_id)
                continue

        # The lease prevents other scheduled workers from claiming this monitor
        # while the endpoint is checked. No row lock/transaction is held over HTTP.
        with SessionLocal() as db:
            try:
                monitor = db.scalar(
                    select(Monitor).where(Monitor.id == monitor_id)
                )
                if monitor is None or not monitor.is_active:
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
            logger.warning(
                "Monitoring worker did not stop within %s seconds; "
                "will not start a replacement while it is still running",
                SHUTDOWN_TIMEOUT_SECONDS,
            )
            return

        self._thread = None
