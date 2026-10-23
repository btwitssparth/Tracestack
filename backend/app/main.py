import os
from contextlib import asynccontextmanager
from collections.abc import AsyncIterator

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError

from app.core.worker import MonitoringWorker
from app.db.session import engine
from app.routers.incidents import router as incidents_router
from app.routers.monitors import router as monitors_router

monitoring_worker = MonitoringWorker()


@asynccontextmanager
async def lifespan(_: FastAPI) -> AsyncIterator[None]:
    """Start the monitoring worker with the API and stop it during shutdown."""
    monitoring_worker.start()
    try:
        yield
    finally:
        monitoring_worker.stop()


app = FastAPI(
    title="TraceStack API",
    description="API monitoring, check history, and incident management platform",
    version="0.3.0",
    lifespan=lifespan,
)

origins = [
    origin.strip()
    for origin in os.getenv("FRONTEND_ORIGINS", "http://localhost:3000").split(",")
    if origin.strip()
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type"],
)


@app.get("/", tags=["system"])
def root() -> dict[str, str]:
    return {"message": "TraceStack API is running!", "docs": "/docs"}


@app.get("/health", tags=["system"])
def health_check() -> dict[str, str]:
    return {"status": "healthy"}


@app.get("/health/db", tags=["system"])
def database_health_check() -> dict[str, str]:
    try:
        with engine.connect() as connection:
            connection.execute(text("SELECT 1"))
    except SQLAlchemyError as exc:
        # Do not return credentials or raw database details to clients.
        raise HTTPException(status_code=503, detail="Database is unavailable") from exc
    return {"status": "healthy", "database": "connected"}


app.include_router(monitors_router, prefix="/api/v1")
app.include_router(incidents_router, prefix="/api/v1")
