"""Atomic claims shared by scheduled and manual monitor checks."""
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from uuid import uuid4

from sqlalchemy import update
from sqlalchemy.orm import Session

from app.models import Monitor

DEFAULT_CLAIM_LEASE_SECONDS = 40


@dataclass(frozen=True)
class CheckClaim:
    monitor_id: int
    token: str
    expires_at: datetime


def claim_monitor_check(
    db: Session,
    monitor_id: int,
    *,
    scheduled: bool,
    lease_seconds: int = DEFAULT_CLAIM_LEASE_SECONDS,
    now: datetime | None = None,
) -> CheckClaim | None:
    """Claim an active monitor atomically; scheduled claims additionally require it to be due."""
    claim_time = now or datetime.now(timezone.utc)
    token = str(uuid4())
    expires_at = claim_time + timedelta(seconds=lease_seconds)
    conditions = [
        Monitor.id == monitor_id,
        Monitor.is_active.is_(True),
        (
            (Monitor.check_claim_expires_at.is_(None))
            | (Monitor.check_claim_expires_at <= claim_time)
        ),
    ]
    if scheduled:
        conditions.append(Monitor.next_check_at <= claim_time)

    try:
        result = db.execute(
            update(Monitor)
            .where(*conditions)
            .values(check_claim_token=token, check_claim_expires_at=expires_at)
        )
        if result.rowcount != 1:
            db.rollback()
            return None
        db.commit()
        return CheckClaim(monitor_id=monitor_id, token=token, expires_at=expires_at)
    except Exception:
        db.rollback()
        raise


def release_monitor_claim(db: Session, claim: CheckClaim) -> bool:
    """Release only the exact claim token; never clear a newer owner's lease."""
    try:
        result = db.execute(
            update(Monitor)
            .where(
                Monitor.id == claim.monitor_id,
                Monitor.check_claim_token == claim.token,
            )
            .values(check_claim_token=None, check_claim_expires_at=None)
        )
        db.commit()
        return result.rowcount == 1
    except Exception:
        db.rollback()
        raise
