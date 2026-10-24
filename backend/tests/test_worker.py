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
