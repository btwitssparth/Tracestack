"""Best-effort Web Push delivery; in-app notifications are authoritative."""
import json, logging, os
from sqlalchemy import select
from sqlalchemy.orm import Session
from app.models import Notification, PushSubscription
logger = logging.getLogger(__name__)

def dispatch_web_push(db: Session, notification: Notification) -> None:
    public_key = os.getenv("VAPID_PUBLIC_KEY", "").strip()
    private_key = os.getenv("VAPID_PRIVATE_KEY", "").strip()
    subject = os.getenv("VAPID_CLAIMS_SUBJECT", "").strip()
    if not (public_key and private_key and subject):
        return
    try:
        from pywebpush import WebPushException, webpush
    except ImportError:
        logger.warning("pywebpush is not installed; skipping browser notification delivery")
        return
    subscriptions = list(db.scalars(select(PushSubscription).where(
        PushSubscription.owner_id == notification.owner_id)).all())
    payload = json.dumps({"title": notification.title, "message": notification.message,
        "notification_id": notification.id, "tag": f"tracestack-{notification.incident_id}-{notification.type}",
        "url": "/dashboard"})
    stale_ids: list[int] = []
    for subscription in subscriptions:
        try:
            webpush(subscription_info={"endpoint": subscription.endpoint,
                "keys": {"p256dh": subscription.p256dh, "auth": subscription.auth}},
                data=payload, vapid_private_key=private_key, vapid_claims={"sub": subject}, ttl=60)
        except WebPushException as exc:
            response = getattr(exc, "response", None)
            if response is not None and getattr(response, "status_code", None) in {404, 410}:
                stale_ids.append(subscription.id)
            logger.warning("Web Push delivery failed for subscription_id=%s", subscription.id)
        except Exception:
            logger.exception("Unexpected Web Push failure for subscription_id=%s", subscription.id)
    if stale_ids:
        for stale in db.scalars(select(PushSubscription).where(PushSubscription.id.in_(stale_ids))).all():
            db.delete(stale)
        db.commit()
