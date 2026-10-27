from datetime import datetime, timezone
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.auth import require_authenticated_user
from app.core.check_claims import claim_monitor_check, release_monitor_claim
from app.core.monitoring import CheckClaimLost, perform_check
from app.core.url_security import UnsafeTargetError, validate_public_http_url
from app.dependencies import get_db
from app.models import CheckResult, Monitor
from app.schemas import CheckResultRead, MonitorCreate, MonitorRead, MonitorUpdate

router = APIRouter(prefix="/monitors", tags=["monitors"])


def _owned_monitor(db: Session, monitor_id: int, owner_id: str, *, lock: bool = False) -> Monitor:
    statement = select(Monitor).where(
        Monitor.id == monitor_id,
        Monitor.owner_id == owner_id,
    )
    if lock:
        statement = statement.with_for_update()
    monitor = db.scalar(statement)
    if monitor is None:
        # Use the same response for absent and foreign-owned IDs to avoid disclosure.
        raise HTTPException(status_code=404, detail="Monitor not found")
    return monitor


@router.post("", response_model=MonitorRead, status_code=status.HTTP_201_CREATED)
def create_monitor(
    payload: MonitorCreate,
    user: dict[str, Any] = Depends(require_authenticated_user),
    db: Session = Depends(get_db),
) -> Monitor:
    try:
        validate_public_http_url(payload.url)
    except UnsafeTargetError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc

    monitor = Monitor(
        **payload.model_dump(),
        owner_id=user["sub"],
        next_check_at=datetime.now(timezone.utc),
    )
    db.add(monitor)
    db.commit()
    db.refresh(monitor)
    return monitor


@router.get("", response_model=list[MonitorRead])
def list_monitors(
    limit: int = Query(default=50, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    user: dict[str, Any] = Depends(require_authenticated_user),
    db: Session = Depends(get_db),
) -> list[Monitor]:
    statement = (
        select(Monitor)
        .where(Monitor.owner_id == user["sub"])
        .order_by(Monitor.created_at.desc())
        .limit(limit)
        .offset(offset)
    )
    return list(db.scalars(statement).all())


@router.get("/{monitor_id}", response_model=MonitorRead)
def get_monitor(
    monitor_id: int,
    user: dict[str, Any] = Depends(require_authenticated_user),
    db: Session = Depends(get_db),
) -> Monitor:
    return _owned_monitor(db, monitor_id, user["sub"])


@router.patch("/{monitor_id}", response_model=MonitorRead)
def update_monitor(
    monitor_id: int,
    payload: MonitorUpdate,
    user: dict[str, Any] = Depends(require_authenticated_user),
    db: Session = Depends(get_db),
) -> Monitor:
    monitor = _owned_monitor(db, monitor_id, user["sub"])
    changes = payload.model_dump(exclude_unset=True)
    if any(value is None for value in changes.values()):
        raise HTTPException(status_code=422, detail="Fields cannot be set to null")

    if "url" in changes:
        try:
            validate_public_http_url(changes["url"])
        except UnsafeTargetError as exc:
            raise HTTPException(status_code=422, detail=str(exc)) from exc

    for key, value in changes.items():
        setattr(monitor, key, value)

    db.add(monitor)
    db.commit()
    db.refresh(monitor)
    return monitor


@router.delete("/{monitor_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_monitor(
    monitor_id: int,
    user: dict[str, Any] = Depends(require_authenticated_user),
    db: Session = Depends(get_db),
) -> None:
    monitor = _owned_monitor(db, monitor_id, user["sub"])
    db.delete(monitor)
    db.commit()


@router.post("/{monitor_id}/checks", response_model=CheckResultRead, status_code=status.HTTP_201_CREATED)
def run_manual_check(
    monitor_id: int,
    user: dict[str, Any] = Depends(require_authenticated_user),
    db: Session = Depends(get_db),
) -> CheckResult:
    monitor = _owned_monitor(db, monitor_id, user["sub"])
    if not monitor.is_active:
        raise HTTPException(status_code=409, detail="Monitor is paused")

    try:
        claim = claim_monitor_check(db, monitor_id, scheduled=False)
    except Exception:
        db.rollback()
        raise
    if claim is None:
        # Distinguish a pause from another check already owning the lease.
        db.refresh(monitor)
        if not monitor.is_active:
            raise HTTPException(status_code=409, detail="Monitor is paused")
        raise HTTPException(status_code=409, detail="A check is already in progress")

    try:
        monitor = db.scalar(select(Monitor).where(Monitor.id == monitor_id))
        if monitor is None:
            raise HTTPException(status_code=404, detail="Monitor not found")
        return perform_check(db, monitor, claim_token=claim.token)
    except CheckClaimLost as exc:
        raise HTTPException(status_code=409, detail="The check claim expired; please retry") from exc
    finally:
        release_monitor_claim(db, claim)


@router.get("/{monitor_id}/checks", response_model=list[CheckResultRead])
def list_check_results(
    monitor_id: int,
    limit: int = Query(default=50, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    user: dict[str, Any] = Depends(require_authenticated_user),
    db: Session = Depends(get_db),
) -> list[CheckResult]:
    _owned_monitor(db, monitor_id, user["sub"])
    statement = (
        select(CheckResult)
        .join(Monitor, CheckResult.monitor_id == Monitor.id)
        .where(Monitor.id == monitor_id, Monitor.owner_id == user["sub"])
        .order_by(CheckResult.checked_at.desc())
        .limit(limit)
        .offset(offset)
    )
    return list(db.scalars(statement).all())
