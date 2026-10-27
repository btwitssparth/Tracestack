# TraceStack

TraceStack monitors public HTTP endpoints and records incidents.

## Browser notifications (no email provider)

In-app notifications are stored in PostgreSQL and appear in the dashboard. Browser push notifications use the Web Push protocol and require VAPID keys on the backend.

Generate a VAPID key pair locally (the script prints the keys; do not commit or share the private key):

```bash
cd backend
python scripts/generate_vapid_keys.py
```

Configure these backend environment variables:
- `VAPID_PUBLIC_KEY`: URL-safe base64 public key for the browser Push API.
- `VAPID_PRIVATE_KEY`: paste only the PEM block printed between `VAPID_PRIVATE_KEY_PEM_BEGIN` and `VAPID_PRIVATE_KEY_PEM_END`, including the `BEGIN/END PRIVATE KEY` lines; keep it secret.
- `VAPID_CLAIMS_SUBJECT`: a contact URI such as `mailto:admin@example.com` (protocol contact only; TraceStack does not send email).

Install backend dependencies and apply the new migration:

```bash
cd backend
pip install -r requirements.txt
alembic upgrade head
```

Browser push requires HTTPS in production (localhost is permitted for local development), user permission, a supported browser, and valid VAPID configuration. In-app notifications work without VAPID keys. No email notifications are implemented.
