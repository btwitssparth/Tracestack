import os
from typing import Any
from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy import select, update, func
from sqlalchemy.orm import Session
from app.core.auth import require_authenticated_user
from app.dependencies import get_db
from app.models import Notification, PushSubscription
from app.schemas import NotificationRead, PushSubscriptionCreate, PushSubscriptionDelete

router = APIRouter(tags=["notifications"])

@router.get("/notifications", response_model=list[NotificationRead])
def list_notifications(limit: int = Query(default=30, ge=1, le=100), offset: int = Query(default=0, ge=0),
    user: dict[str, Any] = Depends(require_authenticated_user), db: Session = Depends(get_db)) -> list[Notification]:
    statement = select(Notification).where(Notification.owner_id == user["sub"]).order_by(
        Notification.created_at.desc(), Notification.id.desc()).limit(limit).offset(offset)
    return list(db.scalars(statement).all())

@router.get("/notifications/unread-count")
def unread_count(user: dict[str, Any] = Depends(require_authenticated_user),
    db: Session = Depends(get_db)) -> dict[str, int]:
    count = db.scalar(select(func.count(Notification.id)).where(
        Notification.owner_id == user["sub"], Notification.is_read.is_(False)))
    return {"count": int(count or 0)}

@router.patch("/notifications/{notification_id}/read", response_model=NotificationRead)
def mark_notification_read(notification_id: int, user: dict[str, Any] = Depends(require_authenticated_user),
    db: Session = Depends(get_db)) -> Notification:
    notification = db.scalar(select(Notification).where(
        Notification.id == notification_id, Notification.owner_id == user["sub"]))
    if notification is None:
        raise HTTPException(status_code=404, detail="Notification not found")
    notification.is_read = True
    db.commit()
    db.refresh(notification)
    return notification

@router.post("/notifications/read-all", status_code=status.HTTP_204_NO_CONTENT)
def mark_all_notifications_read(user: dict[str, Any] = Depends(require_authenticated_user),
    db: Session = Depends(get_db)) -> Response:
    db.execute(update(Notification).where(
        Notification.owner_id == user["sub"], Notification.is_read.is_(False)).values(is_read=True))
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)

@router.get("/notifications/push-config")
def push_config(user: dict[str, Any] = Depends(require_authenticated_user)) -> dict[str, Any]:
    public_key = os.getenv("VAPID_PUBLIC_KEY", "").strip()
    private_key = os.getenv("VAPID_PRIVATE_KEY", "").strip()
    subject = os.getenv("VAPID_CLAIMS_SUBJECT", "").strip()
    configured = bool(public_key and private_key and subject)
    return {"configured": configured, "public_key": public_key if configured else None}

@router.post("/notifications/push-subscriptions", status_code=status.HTTP_201_CREATED)
def save_push_subscription(payload: PushSubscriptionCreate, user: dict[str, Any] = Depends(require_authenticated_user),
    db: Session = Depends(get_db)) -> dict[str, bool]:
    existing = db.scalar(select(PushSubscription).where(PushSubscription.endpoint == payload.endpoint))
    if existing is not None:
        if existing.owner_id != user["sub"]:
            raise HTTPException(status_code=409, detail="This browser subscription is already registered")
        existing.p256dh = payload.keys.p256dh
        existing.auth = payload.keys.auth
    else:
        db.add(PushSubscription(owner_id=user["sub"], endpoint=payload.endpoint,
            p256dh=payload.keys.p256dh, auth=payload.keys.auth))
    db.commit()
    return {"saved": True}

@router.delete("/notifications/push-subscriptions", status_code=status.HTTP_204_NO_CONTENT)
def delete_push_subscription(payload: PushSubscriptionDelete, user: dict[str, Any] = Depends(require_authenticated_user),
    db: Session = Depends(get_db)) -> Response:
    subscription = db.scalar(select(PushSubscription).where(
        PushSubscription.endpoint == payload.endpoint, PushSubscription.owner_id == user["sub"]))
    if subscription is not None:
        db.delete(subscription)
        db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
