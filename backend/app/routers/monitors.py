from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.auth import require_api_key
from app.core.monitoring import perform_check
from app.core.url_security import UnsafeTargetError, validate_public_http_url
from app.dependencies import get_db
from app.models import CheckResult, Monitor
from app.schemas import CheckResultRead, MonitorCreate, MonitorRead, MonitorUpdate

router = APIRouter(
    prefix="/monitors",
    tags=["monitors"],
    dependencies=[Depends(require_api_key)],
)


@router.post("", response_model=MonitorRead, status_code=status.HTTP_201_CREATED)
def create_monitor(payload: MonitorCreate, db: Session = Depends(get_db)) -> Monitor:
    try:
        validate_public_http_url(payload.url)
    except UnsafeTargetError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc

    monitor = Monitor(**payload.model_dump(), next_check_at=datetime.now(timezone.utc))
    db.add(monitor)
    db.commit()
    db.refresh(monitor)
    return monitor


@router.get("", response_model=list[MonitorRead])
def list_monitors(
    limit: int = Query(default=50, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    db: Session = Depends(get_db),
) -> list[Monitor]:
    statement = select(Monitor).order_by(Monitor.created_at.desc()).limit(limit).offset(offset)
    return list(db.scalars(statement).all())


@router.get("/{monitor_id}", response_model=MonitorRead)
def get_monitor(monitor_id: int, db: Session = Depends(get_db)) -> Monitor:
    monitor = db.get(Monitor, monitor_id)
    if monitor is None:
        raise HTTPException(status_code=404, detail="Monitor not found")
    return monitor


@router.patch("/{monitor_id}", response_model=MonitorRead)
def update_monitor(
    monitor_id: int,
    payload: MonitorUpdate,
    db: Session = Depends(get_db),
) -> Monitor:
    monitor = db.get(Monitor, monitor_id)
    if monitor is None:
        raise HTTPException(status_code=404, detail="Monitor not found")

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
def delete_monitor(monitor_id: int, db: Session = Depends(get_db)) -> None:
    monitor = db.get(Monitor, monitor_id)
    if monitor is None:
        raise HTTPException(status_code=404, detail="Monitor not found")
    db.delete(monitor)
    db.commit()


@router.post("/{monitor_id}/checks", response_model=CheckResultRead, status_code=status.HTTP_201_CREATED)
def run_manual_check(monitor_id: int, db: Session = Depends(get_db)) -> CheckResult:
    # Locking the row prevents simultaneous manual checks for one monitor on PostgreSQL.
    monitor = db.scalar(select(Monitor).where(Monitor.id == monitor_id).with_for_update())
    if monitor is None:
        raise HTTPException(status_code=404, detail="Monitor not found")
    if not monitor.is_active:
        raise HTTPException(status_code=409, detail="Monitor is paused")
    return perform_check(db, monitor)


@router.get("/{monitor_id}/checks", response_model=list[CheckResultRead])
def list_check_results(
    monitor_id: int,
    limit: int = Query(default=50, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    db: Session = Depends(get_db),
) -> list[CheckResult]:
    if db.get(Monitor, monitor_id) is None:
        raise HTTPException(status_code=404, detail="Monitor not found")
    statement = (
        select(CheckResult)
        .where(CheckResult.monitor_id == monitor_id)
        .order_by(CheckResult.checked_at.desc())
        .limit(limit)
        .offset(offset)
    )
    return list(db.scalars(statement).all())
