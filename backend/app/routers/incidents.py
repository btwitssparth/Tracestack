from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.auth import require_authenticated_user
from app.dependencies import get_db
from app.models import Incident, Monitor
from app.schemas import IncidentRead

router = APIRouter(prefix="/incidents", tags=["incidents"])


@router.get("", response_model=list[IncidentRead])
def list_incidents(
    status_filter: str | None = Query(default=None, alias="status", pattern="^(open|resolved)$"),
    limit: int = Query(default=50, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    user: dict[str, Any] = Depends(require_authenticated_user),
    db: Session = Depends(get_db),
) -> list[Incident]:
    statement = (
        select(Incident)
        .join(Monitor, Incident.monitor_id == Monitor.id)
        .where(Monitor.owner_id == user["sub"])
        .order_by(Incident.started_at.desc())
        .limit(limit)
        .offset(offset)
    )
    if status_filter is not None:
        statement = statement.where(Incident.status == status_filter)
    return list(db.scalars(statement).all())


@router.get("/{incident_id}", response_model=IncidentRead)
def get_incident(
    incident_id: int,
    user: dict[str, Any] = Depends(require_authenticated_user),
    db: Session = Depends(get_db),
) -> Incident:
    statement = (
        select(Incident)
        .join(Monitor, Incident.monitor_id == Monitor.id)
        .where(Incident.id == incident_id, Monitor.owner_id == user["sub"])
    )
    incident = db.scalar(statement)
    if incident is None:
        raise HTTPException(status_code=404, detail="Incident not found")
    return incident
