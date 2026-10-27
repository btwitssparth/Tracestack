from datetime import datetime, timedelta, timezone

from sqlalchemy import create_engine, select, update
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.check_claims import claim_monitor_check, release_monitor_claim
from app.db.session import Base
from app.models import Monitor


def test_competing_claims_allow_only_one_active_owner():
    engine = create_engine(
        "sqlite+pysqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Session = sessionmaker(bind=engine, autoflush=False, autocommit=False)
    Base.metadata.create_all(engine)
    try:
        with Session() as db:
            monitor = Monitor(
                owner_id="owner", name="Claim race", url="https://example.com",
                is_active=True, check_interval_seconds=300, expected_status_code=200,
                timeout_seconds=5, current_status="unknown", consecutive_failures=0,
                consecutive_successes=0,
                next_check_at=datetime.now(timezone.utc) - timedelta(seconds=1),
            )
            db.add(monitor)
            db.commit()
            monitor_id = monitor.id

        with Session() as db:
            first = claim_monitor_check(db, monitor_id, scheduled=True)
        with Session() as db:
            second = claim_monitor_check(db, monitor_id, scheduled=False)
        assert first is not None
        assert second is None
        with Session() as db:
            persisted = db.scalar(select(Monitor).where(Monitor.id == monitor_id))
            assert persisted.check_claim_token == first.token
    finally:
        Base.metadata.drop_all(engine)
        engine.dispose()


def test_expired_claim_can_be_reclaimed_but_old_token_cannot_release_new_claim():
    engine = create_engine(
        "sqlite+pysqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Session = sessionmaker(bind=engine, autoflush=False, autocommit=False)
    Base.metadata.create_all(engine)
    try:
        now = datetime.now(timezone.utc)
        with Session() as db:
            monitor = Monitor(
                owner_id="owner", name="Expired claim", url="https://example.com",
                is_active=True, check_interval_seconds=300, expected_status_code=200,
                timeout_seconds=5, current_status="unknown", consecutive_failures=0,
                consecutive_successes=0, next_check_at=now - timedelta(seconds=1),
            )
            db.add(monitor)
            db.commit()
            monitor_id = monitor.id

        with Session() as db:
            old_claim = claim_monitor_check(
                db, monitor_id, scheduled=False, lease_seconds=1, now=now
            )
        assert old_claim is not None

        later = now + timedelta(seconds=2)
        with Session() as db:
            new_claim = claim_monitor_check(
                db, monitor_id, scheduled=False, lease_seconds=40, now=later
            )
        assert new_claim is not None
        assert new_claim.token != old_claim.token

        with Session() as db:
            assert release_monitor_claim(db, old_claim) is False
        with Session() as db:
            persisted = db.scalar(select(Monitor).where(Monitor.id == monitor_id))
            assert persisted.check_claim_token == new_claim.token
            assert release_monitor_claim(db, new_claim) is True
    finally:
        Base.metadata.drop_all(engine)
        engine.dispose()
