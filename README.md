<div align="center">

# TraceStack

**Know when your services go down, before your users tell you.**

TraceStack is a web-based uptime monitoring app. It checks your public HTTP endpoints on a schedule, tracks availability and response times, and opens an incident when a service fails.

[**Live app**](https://tracestack-neon.vercel.app/) · [**API docs**](https://tracestack.onrender.com/docs) · [**Backend API**](https://tracestack.onrender.com)

![Next.js](https://img.shields.io/badge/Next.js-App_Router-000000?logo=nextdotjs&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=white)
![FastAPI](https://img.shields.io/badge/FastAPI-009688?logo=fastapi&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-4169E1?logo=postgresql&logoColor=white)
![Supabase](https://img.shields.io/badge/Supabase-Auth-3FCF8E?logo=supabase&logoColor=white)

</div>

<!-- Add a dashboard screenshot or short demo GIF here, e.g.:
![TraceStack dashboard](docs/dashboard.png)
-->

> **Note:** the backend runs on a free hosting tier, so the first request after a period of inactivity may take a few seconds while the service wakes up.

## Table of contents

- [Features](#features)
- [How it works](#how-it-works)
- [Tech stack](#tech-stack)
- [Getting started](#getting-started)
- [Environment variables](#environment-variables)
- [Database migrations](#database-migrations)
- [Notifications](#notifications)
- [API health endpoints](#api-health-endpoints)
- [Deployment](#deployment)
- [Known limitations](#known-limitations)
- [Development workflow](#development-workflow)
- [Security](#security)
- [License](#license)

## Features

- **HTTP endpoint monitoring:** add monitors for any publicly accessible endpoint.
- **Scheduled health checks:** a background worker checks enabled monitors automatically.
- **Manual checks:** trigger a check on demand.
- **Response history:** review past check results and response times.
- **Incident lifecycle:** an incident opens after **two consecutive failures** and resolves after **two consecutive successes**, which avoids alerts from one-off blips.
- **Authentication:** Supabase Auth, including configured OAuth providers.
- **In-app notifications:** stored in PostgreSQL and shown in the dashboard.
- **Browser push notifications:** Web Push using VAPID keys.
- **Safe check coordination:** claim-based leases coordinate scheduled and manual checks, and stop stale results from overwriting newer ones.

## How it works

```mermaid
flowchart LR
    User([User]) --> FE["Next.js frontend<br/>(Vercel)"]
    FE <-->|sign in| SB["Supabase Auth"]
    FE -->|access token| API

    subgraph BE["FastAPI backend (Render)"]
        API["REST API"]
        Worker["Monitoring worker"]
    end

    API --> DB[("PostgreSQL<br/>(Neon)")]
    Worker --> DB
    Worker -->|HTTPX checks| Targets["Monitored endpoints"]
    Worker -.->|Web Push| Browser["User's browser"]
```

1. A user signs in and manages monitors through the Next.js frontend.
2. Server-side API helpers in the frontend take the Supabase session and send its access token to the FastAPI backend.
3. The backend validates the token and reads or updates monitor data in PostgreSQL.
4. The monitoring worker periodically checks enabled monitors and stores the results.
5. Consecutive failures create incidents, and consecutive successes resolve them.
6. In-app notifications are saved in PostgreSQL. Browser push delivery can be turned on with VAPID configuration.

### Incident lifecycle

```mermaid
stateDiagram-v2
    [*] --> Healthy
    Healthy --> IncidentOpen: 2 consecutive failures
    IncidentOpen --> Healthy: 2 consecutive successes
```

## Tech stack

| Layer | Technologies |
| --- | --- |
| **Frontend** | Next.js (App Router), React, TypeScript, Tailwind CSS, Supabase SSR / Supabase Auth |
| **Backend** | Python, FastAPI, SQLAlchemy, Alembic, HTTPX, PyJWT, PyWebPush |
| **Database** | PostgreSQL (Neon) |
| **Auth** | Supabase Auth |
| **Hosting** | Vercel (frontend), Render (backend) |

## Getting started

### Prerequisites

- Node.js and npm
- Python 3.11+ (recommended)
- A PostgreSQL database (a [Neon](https://neon.tech) database works well)
- A [Supabase](https://supabase.com) project for authentication

### Repository structure

```text
TraceStack/
├── frontend/       # Next.js application
└── backend/        # FastAPI app, migrations, tests and worker
```

### 1. Clone the repository

```bash
git clone https://github.com/btwitssparth/Tracestack.git
cd Tracestack
```

### 2. Set up the backend

Create `backend/.env` with your own values (never commit secrets):

```env
DATABASE_URL=postgresql+psycopg://USER:PASSWORD@HOST:PORT/DATABASE?sslmode=require
SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
FRONTEND_ORIGINS=http://localhost:3000
```

> If your database provider gives you a different SQLAlchemy-compatible PostgreSQL URL, use that instead.

Create and activate a virtual environment:

```bash
cd backend
python -m venv .venv
```

```powershell
# Windows PowerShell
.\.venv\Scripts\Activate.ps1
```

```bash
# macOS / Linux
source .venv/bin/activate
```

Install dependencies, apply migrations and start the API:

```bash
pip install -r requirements.txt
alembic upgrade head
uvicorn app.main:app --reload
```

The API is now running at <http://127.0.0.1:8000>, with interactive docs at <http://127.0.0.1:8000/docs>.

### 3. Set up the frontend

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

Open <http://localhost:3000>.

> **Keep secrets on the backend.** Database credentials, Supabase secret or service-role keys, and VAPID private keys must never go in `NEXT_PUBLIC_*` variables or be committed to Git.

## Environment variables

### Backend

| Variable | Required | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | Yes | PostgreSQL connection string used by SQLAlchemy and Alembic. |
| `SUPABASE_URL` | Yes | Supabase project URL, used to validate Supabase access tokens. |
| `FRONTEND_ORIGINS` | Recommended | Allowed frontend origins for CORS. Use the local URL in development and the deployed origin in production. |
| `VAPID_PUBLIC_KEY` | Optional | Public key for browser push subscriptions. |
| `VAPID_PRIVATE_KEY` | Optional | Private PEM key for sending browser push notifications. **Keep secret.** |
| `VAPID_CLAIMS_SUBJECT` | Optional (needed for push) | Contact URI for Web Push, such as `mailto:admin@example.com`. This is protocol contact info, not an email delivery integration. |

To generate VAPID keys, run this from the `backend/` directory:

```bash
python scripts/generate_vapid_keys.py
```

For `VAPID_PRIVATE_KEY`, use the full PEM block the script prints, including the `BEGIN` and `END PRIVATE KEY` lines. Never commit or share the private key.

### Frontend

| Variable | Required | Purpose |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase project URL, used by the browser and server clients. |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Yes | Supabase publishable key. |
| `TRACESTACK_API_URL` | Yes | Base URL of the FastAPI backend. |

## Database migrations

Run migrations from the `backend/` directory:

```bash
alembic upgrade head   # apply all migrations
alembic current        # show the current revision
```

For production, double-check that `DATABASE_URL` points at the intended database before running migrations.

## Notifications

In-app notifications are stored in PostgreSQL and **do not need VAPID keys**.

Browser push notifications additionally require:

- HTTPS in production (`localhost` is allowed for development)
- A supported browser and permission from the user
- Correct `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` and `VAPID_CLAIMS_SUBJECT` backend settings

## API health endpoints

| Endpoint | Description |
| --- | --- |
| `/` | Basic API response |
| `/health` | Application health check |
| `/health/db` | Database connectivity check |
| `/docs` | Interactive API documentation |

## Deployment

TraceStack is deployed with the frontend on Vercel, the backend on Render and the database on Neon.

1. Deploy `frontend/` as a Next.js project on **Vercel**.
2. Deploy `backend/` as a Python service on **Render**.
3. In Render, set the backend's `DATABASE_URL` and `SUPABASE_URL`.
4. In Vercel, set the frontend's three environment variables.
5. Set `FRONTEND_ORIGINS` to the deployed frontend origin so browser requests pass CORS checks.
6. In Supabase Auth, configure the site URL and allowed redirect URLs for both local development and the deployed site.
7. Apply database migrations during deployment, before the API starts.

## Known limitations

- Email notifications are not implemented.
- On free hosting tiers, cold starts or service restarts can delay scheduled checks.
- Only publicly accessible HTTP endpoints can be monitored.

## Development workflow

Ongoing development happens on `feature/backend-mvp`. Reviewed changes are merged into `main` when they are ready to deploy.

## Security

- Never commit `.env` files, database URLs, OAuth client secrets, Supabase secret or service-role keys, or VAPID private keys.
- Use only the Supabase **publishable** key in the frontend.
- Restrict CORS to trusted frontend origins in production.
- Don't include real credentials in screenshots, issue reports or documentation.

## License

No license has been specified yet, so all rights remain with the repository owner unless one is added.
