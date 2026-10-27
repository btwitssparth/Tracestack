# TraceStack

**TraceStack** is a web-based uptime monitoring application that checks public HTTP endpoints, tracks availability and response times, and records incidents when monitored services fail.

- **Live app:** https://tracestack-neon.vercel.app/
- **Backend API:** https://tracestack.onrender.com
- **API documentation:** https://tracestack.onrender.com/docs

## Features

- **HTTP endpoint monitoring** — create monitors for publicly accessible endpoints.
- **Scheduled health checks** — a background worker checks monitors automatically.
- **Manual checks** — trigger a check on demand.
- **Response history** — review check results and response times.
- **Incident lifecycle** — an incident is created after two consecutive failures and resolves after two consecutive successes.
- **Authentication** — Supabase Auth, including configured OAuth providers.
- **In-app notifications** — notifications are stored in PostgreSQL and shown in the dashboard.
- **Browser push notifications** — Web Push support using VAPID keys.
- **Claim-based check coordination** — leases help coordinate scheduled and manual checks and prevent stale check results from overwriting newer results.

## Tech stack

### Frontend
- Next.js (App Router)
- React
- TypeScript
- Tailwind CSS
- Supabase SSR / Supabase Auth

### Backend
- Python
- FastAPI
- SQLAlchemy
- Alembic
- HTTPX
- PostgreSQL
- PyJWT
- PyWebPush

### Infrastructure
- Vercel — frontend hosting
- Render — backend hosting
- Neon — PostgreSQL database
- Supabase — authentication

## Architecture overview

1. A user signs in and manages monitors through the Next.js frontend.
2. Frontend server-side API helpers obtain the Supabase session and send its access token to the FastAPI backend.
3. The backend validates the token and reads or updates monitor data in PostgreSQL.
4. The monitoring worker periodically checks enabled monitors and stores check results.
5. Consecutive failures create incidents; consecutive successes resolve them.
6. In-app notifications are persisted in PostgreSQL. Browser push delivery can be enabled with VAPID configuration.

## Repository structure

```text
TraceStack/
├── frontend/       # Next.js application
└── backend/        # FastAPI application, migrations, tests and worker
```

## Run locally

### Requirements

- Node.js and npm
- Python 3.11+ recommended
- PostgreSQL database (a Neon database can be used)
- Supabase project for authentication

### 1. Clone the repository

```bash
git clone https://github.com/btwitssparth/Tracestack.git
cd Tracestack
```

### 2. Configure the backend

Create a `.env` file in the `backend/` directory. Use your own values; never commit secrets.

```env
DATABASE_URL=postgresql+psycopg://USER:PASSWORD@HOST:PORT/DATABASE?sslmode=require
SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
FRONTEND_ORIGINS=http://localhost:3000
```

Use the connection string format supported by your database provider. If your provider supplies a different SQLAlchemy-compatible PostgreSQL URL, use that value.

Install dependencies and apply migrations:

```bash
cd backend
python -m venv .venv
```

Activate the virtual environment:

**Windows PowerShell**
```powershell
.\.venv\Scripts\Activate.ps1
```

**macOS / Linux**
```bash
source .venv/bin/activate
```

Then run:

```bash
pip install -r requirements.txt
alembic upgrade head
uvicorn app.main:app --reload
```

The backend should be available at `http://127.0.0.1:8000`. API documentation is available at `http://127.0.0.1:8000/docs`.

### 3. Configure the frontend

Create `frontend/.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=YOUR_SUPABASE_PUBLISHABLE_KEY
TRACESTACK_API_URL=http://127.0.0.1:8000
```

Install dependencies and start Next.js:

```bash
cd frontend
npm install
npm run dev
```

Open `http://localhost:3000`.

> Keep database credentials, Supabase secret/service-role keys, and VAPID private keys on the backend only. Do not expose them through `NEXT_PUBLIC_*` variables or commit them to Git.

## Environment variables

### Backend

| Variable | Required | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | Yes | PostgreSQL connection string used by SQLAlchemy and Alembic. |
| `SUPABASE_URL` | Yes | Supabase project URL used to validate Supabase access tokens. |
| `FRONTEND_ORIGINS` | Recommended | Allowed frontend origins for CORS; use the local frontend URL during development and the deployed frontend origin in production. |
| `VAPID_PUBLIC_KEY` | Optional | Public key used for browser push subscriptions. |
| `VAPID_PRIVATE_KEY` | Optional | Private PEM key used to send browser push notifications. Keep secret. |
| `VAPID_CLAIMS_SUBJECT` | Optional for push | Contact URI for Web Push, such as `mailto:admin@example.com`. This is protocol contact information, not an email delivery integration. |

Generate VAPID keys from the backend directory:

```bash
python scripts/generate_vapid_keys.py
```

For `VAPID_PRIVATE_KEY`, use the PEM block printed by the script, including the `BEGIN/END PRIVATE KEY` lines. Never commit or share the private key.

### Frontend

| Variable | Required | Purpose |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase project URL used by the browser and server clients. |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Yes | Supabase publishable key. |
| `TRACESTACK_API_URL` | Yes | Base URL for the FastAPI backend. |

## Database migrations

Apply migrations from the `backend/` directory:

```bash
alembic upgrade head
```

To inspect the current migration revision:

```bash
alembic current
```

For a production deployment, make sure the `DATABASE_URL` points to the intended database before running migrations.

## Deployment notes

- Deploy the `frontend/` directory as a Next.js project on Vercel.
- Deploy the `backend/` directory as a Python service on Render.
- Configure the backend's `DATABASE_URL` and `SUPABASE_URL` in Render's environment settings.
- Configure the frontend's three environment variables in Vercel.
- Set `FRONTEND_ORIGINS` to the deployed frontend origin so browser requests pass CORS checks.
- Configure the Supabase Auth site URL and allowed redirect URLs for both local development and the deployed site.
- Apply database migrations during deployment before starting the API.
- On free hosting tiers, cold starts or service restarts may delay scheduled checks.

## Notifications

In-app notifications are stored in PostgreSQL and do not require VAPID keys. Browser push notifications require:

- HTTPS in production (localhost is permitted for development)
- A supported browser and permission from the user
- Correct `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, and `VAPID_CLAIMS_SUBJECT` backend settings

**Email notifications are not implemented.**

## Health endpoints

The backend exposes these endpoints:

- `/` — basic API response
- `/health` — application health check
- `/health/db` — database connectivity check
- `/docs` — interactive API documentation

## Development workflow

Use `feature/backend-mvp` for ongoing development. Merge reviewed changes into `main` when they are ready for deployment.

## Security notes

- Never commit `.env` files, database URLs, OAuth client secrets, Supabase secret/service-role keys, or VAPID private keys.
- Only use the Supabase publishable key in the frontend.
- Restrict CORS to trusted frontend origins in production.
- Do not use real credentials in screenshots, issue reports, or documentation.

## License

No license has been specified yet. All rights remain with the repository owner unless a license is added.
