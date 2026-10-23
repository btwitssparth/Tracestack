from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import Boolean, CheckConstraint, DateTime, Index, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.session import Base

if TYPE_CHECKING:
    from app.models.check_result import CheckResult
    from app.models.incident import Incident


class Monitor(Base):
    """An HTTP endpoint TraceStack checks on a recurring schedule."""

    __tablename__ = "monitors"
    __table_args__ = (
        CheckConstraint("check_interval_seconds >= 300", name="ck_monitors_interval_min"),
        CheckConstraint("expected_status_code BETWEEN 100 AND 599", name="ck_monitors_expected_status"),
        CheckConstraint("timeout_seconds BETWEEN 1 AND 30", name="ck_monitors_timeout"),
        Index("ix_monitors_next_check_at", "next_check_at"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    url: Mapped[str] = mapped_column(String(2048), nullable=False)
    check_interval_seconds: Mapped[int] = mapped_column(Integer, nullable=False, default=300, server_default="300")
    expected_status_code: Mapped[int] = mapped_column(Integer, nullable=False, default=200, server_default="200")
    timeout_seconds: Mapped[int] = mapped_column(Integer, nullable=False, default=10, server_default="10")
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True, server_default="true")
    current_status: Mapped[str] = mapped_column(String(20), nullable=False, default="unknown", server_default="unknown")
    consecutive_failures: Mapped[int] = mapped_column(Integer, nullable=False, default=0, server_default="0")
    consecutive_successes: Mapped[int] = mapped_column(Integer, nullable=False, default=0, server_default="0")
    last_checked_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    next_check_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True, server_default=func.now())
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now())

    check_results: Mapped[list["CheckResult"]] = relationship(
        back_populates="monitor", cascade="all, delete-orphan", passive_deletes=True
    )
    incidents: Mapped[list["Incident"]] = relationship(
        back_populates="monitor", cascade="all, delete-orphan", passive_deletes=True
    )
