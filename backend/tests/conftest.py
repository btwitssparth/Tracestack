import os

# Importing app.db.session requires DATABASE_URL at module import time.
# Tests use an isolated SQLite database and never contact the configured production DB.
os.environ.setdefault("DATABASE_URL", "sqlite+pysqlite:///:memory:")

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.db.session import Base
from app.models import CheckResult, Incident, Monitor  # noqa: F401


@pytest.fixture()
def db_session(monkeypatch):
    engine = create_engine(
        "sqlite+pysqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    TestingSessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)
    Base.metadata.create_all(engine)
    with TestingSessionLocal() as session:
        yield session
    Base.metadata.drop_all(engine)
    engine.dispose()


@pytest.fixture()
def monitor(db_session):
    from datetime import datetime, timedelta, timezone

    item = Monitor(
        owner_id="test-owner",
        name="Example API",
        url="https://example.com/health",
        check_interval_seconds=300,
        expected_status_code=200,
        timeout_seconds=5,
        is_active=True,
        current_status="unknown",
        consecutive_failures=0,
        consecutive_successes=0,
        next_check_at=datetime.now(timezone.utc) - timedelta(seconds=1),
    )
    db_session.add(item)
    db_session.commit()
    db_session.refresh(item)
    return item
