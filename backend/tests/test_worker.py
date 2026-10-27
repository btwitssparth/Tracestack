from datetime import datetime, timedelta, timezone
from types import SimpleNamespace

from sqlalchemy import create_engine, select
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.db.session import Base
from app.models import Monitor
from app.core import worker


def test_worker_checks_only_active_due_monitors(monkeypatch):
    engine = create_engine(
        "sqlite+pysqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    TestingSessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)
    Base.metadata.create_all(engine)

    now = datetime.now(timezone.utc)
    with TestingSessionLocal() as db:
        due = Monitor(
            owner_id="owner",
            name="Due active",
            url="https://example.com",
            is_active=True,
            check_interval_seconds=300,
            expected_status_code=200,
            timeout_seconds=5,
            current_status="unknown",
            consecutive_failures=0,
            consecutive_successes=0,
            next_check_at=now - timedelta(seconds=1),
        )
        paused = Monitor(
            owner_id="owner",
            name="Paused",
            url="https://example.org",
            is_active=False,
            check_interval_seconds=300,
            expected_status_code=200,
            timeout_seconds=5,
            current_status="unknown",
            consecutive_failures=0,
            consecutive_successes=0,
            next_check_at=now - timedelta(seconds=1),
        )
        future = Monitor(
            owner_id="owner",
            name="Not due",
            url="https://example.net",
            is_active=True,
            check_interval_seconds=300,
            expected_status_code=200,
            timeout_seconds=5,
            current_status="unknown",
            consecutive_failures=0,
            consecutive_successes=0,
            next_check_at=now + timedelta(minutes=5),
        )
        db.add_all([due, paused, future])
        db.commit()
        due_id, paused_id, future_id = due.id, paused.id, future.id

    monkeypatch.setattr(worker, "SessionLocal", TestingSessionLocal)
    checked_ids = []

    def fake_perform_check(db, monitor):
        checked_ids.append(monitor.id)
        monitor.next_check_at = datetime.now(timezone.utc) + timedelta(seconds=300)
        db.commit()
        return SimpleNamespace(
            success=True,
            status_code=200,
            response_time_ms=12.5,
        )

    monkeypatch.setattr(worker, "perform_check", fake_perform_check)

    try:
        attempted = worker.run_due_checks()
        assert attempted == 1
        assert checked_ids == [due_id]

        with TestingSessionLocal() as db:
            active_paused = db.scalar(select(Monitor).where(Monitor.id == paused_id))
            active_future = db.scalar(select(Monitor).where(Monitor.id == future_id))
            assert active_paused.is_active is False
            assert active_future.next_check_at is not None
            future_next_check = active_future.next_check_at
            if future_next_check.tzinfo is None:
                future_next_check = future_next_check.replace(tzinfo=timezone.utc)
            assert future_next_check > datetime.now(timezone.utc)
    finally:
        Base.metadata.drop_all(engine)
        engine.dispose()

def test_stop_keeps_reference_when_worker_thread_is_still_running(monkeypatch):
    class StillRunningThread:
        def __init__(self):
            self.join_timeout = None

        def join(self, timeout=None):
            self.join_timeout = timeout

        def is_alive(self):
            return True

    instance = worker.MonitoringWorker()
    running_thread = StillRunningThread()
    instance._thread = running_thread
    monkeypatch.setattr(worker, "SHUTDOWN_TIMEOUT_SECONDS", 35)

    instance.stop()

    assert instance._stop_event.is_set()
    assert running_thread.join_timeout == 35
    assert instance._thread is running_thread



def test_worker_claims_monitor_before_check_and_skips_it_until_next_schedule(monkeypatch):
    engine = create_engine(
        "sqlite+pysqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    TestingSessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)
    Base.metadata.create_all(engine)

    try:
        with TestingSessionLocal() as db:
            monitor = Monitor(
                owner_id="owner",
                name="Claim test",
                url="https://example.com",
                is_active=True,
                check_interval_seconds=300,
                expected_status_code=200,
                timeout_seconds=5,
                current_status="unknown",
                consecutive_failures=0,
                consecutive_successes=0,
                next_check_at=datetime.now(timezone.utc) - timedelta(seconds=1),
            )
            db.add(monitor)
            db.commit()
            monitor_id = monitor.id

        monkeypatch.setattr(worker, "SessionLocal", TestingSessionLocal)
        observed_claims = []

        def fake_perform_check(db, monitor):
            claimed_time = monitor.next_check_at
            if claimed_time.tzinfo is None:
                claimed_time = claimed_time.replace(tzinfo=timezone.utc)
            observed_claims.append(claimed_time > datetime.now(timezone.utc))
            monitor.next_check_at = datetime.now(timezone.utc) + timedelta(seconds=300)
            db.commit()
            return SimpleNamespace(success=True, status_code=200, response_time_ms=8.0)

        monkeypatch.setattr(worker, "perform_check", fake_perform_check)

        assert worker.run_due_checks() == 1
        assert observed_claims == [True]
        # The committed claim/schedule means a second worker pass won't select it.
        assert worker.run_due_checks() == 0
        assert observed_claims == [True]

        with TestingSessionLocal() as db:
            persisted = db.scalar(select(Monitor).where(Monitor.id == monitor_id))
            persisted_time = persisted.next_check_at
            if persisted_time.tzinfo is None:
                persisted_time = persisted_time.replace(tzinfo=timezone.utc)
            assert persisted_time > datetime.now(timezone.utc)
    finally:
        Base.metadata.drop_all(engine)
        engine.dispose()


def test_worker_claims_are_conditional_on_monitor_still_being_due(monkeypatch):
    engine = create_engine(
        "sqlite+pysqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    TestingSessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)
    Base.metadata.create_all(engine)

    try:
        with TestingSessionLocal() as db:
            monitor = Monitor(
                owner_id="owner",
                name="No longer due",
                url="https://example.com",
                is_active=True,
                check_interval_seconds=300,
                expected_status_code=200,
                timeout_seconds=5,
                current_status="unknown",
                consecutive_failures=0,
                consecutive_successes=0,
                next_check_at=datetime.now(timezone.utc) - timedelta(seconds=1),
            )
            db.add(monitor)
            db.commit()
            monitor_id = monitor.id

        monkeypatch.setattr(worker, "SessionLocal", TestingSessionLocal)
        # Simulate another scheduler having advanced this monitor after the initial
        # candidate list was read but before this worker tries to claim it.
        with TestingSessionLocal() as db:
            db.execute(
                worker.update(Monitor)
                .where(Monitor.id == monitor_id)
                .values(next_check_at=datetime.now(timezone.utc) + timedelta(minutes=5))
            )
            db.commit()

        called = []
        monkeypatch.setattr(worker, "perform_check", lambda db, monitor: called.append(monitor.id))
        assert worker.run_due_checks() == 0
        assert called == []
    finally:
        Base.metadata.drop_all(engine)
        engine.dispose()
