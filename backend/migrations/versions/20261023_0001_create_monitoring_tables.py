"""Create monitor, check result, and incident tables.

Revision ID: 20261023_0001
Revises:
Create Date: 2026-10-23
"""
from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa

revision: str = "20261023_0001"
down_revision: str | None = None
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "monitors",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("name", sa.String(length=100), nullable=False),
        sa.Column("url", sa.String(length=2048), nullable=False),
        sa.Column("check_interval_seconds", sa.Integer(), server_default="300", nullable=False),
        sa.Column("expected_status_code", sa.Integer(), server_default="200", nullable=False),
        sa.Column("timeout_seconds", sa.Integer(), server_default="10", nullable=False),
        sa.Column("is_active", sa.Boolean(), server_default=sa.true(), nullable=False),
        sa.Column("current_status", sa.String(length=20), server_default="unknown", nullable=False),
        sa.Column("consecutive_failures", sa.Integer(), server_default="0", nullable=False),
        sa.Column("consecutive_successes", sa.Integer(), server_default="0", nullable=False),
        sa.Column("last_checked_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("next_check_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.CheckConstraint("check_interval_seconds >= 300", name="ck_monitors_interval_min"),
        sa.CheckConstraint("expected_status_code BETWEEN 100 AND 599", name="ck_monitors_expected_status"),
        sa.CheckConstraint("timeout_seconds BETWEEN 1 AND 30", name="ck_monitors_timeout"),
    )
    op.create_index("ix_monitors_next_check_at", "monitors", ["next_check_at"])

    op.create_table(
        "check_results",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("monitor_id", sa.Integer(), sa.ForeignKey("monitors.id", ondelete="CASCADE"), nullable=False),
        sa.Column("checked_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("success", sa.Boolean(), nullable=False),
        sa.Column("status_code", sa.Integer(), nullable=True),
        sa.Column("response_time_ms", sa.Float(), nullable=True),
        sa.Column("error_type", sa.String(length=50), nullable=True),
        sa.Column("error_message", sa.Text(), nullable=True),
    )
    op.create_index("ix_check_results_monitor_id", "check_results", ["monitor_id"])
    op.create_index("ix_check_results_checked_at", "check_results", ["checked_at"])

    op.create_table(
        "incidents",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("monitor_id", sa.Integer(), sa.ForeignKey("monitors.id", ondelete="CASCADE"), nullable=False),
        sa.Column("title", sa.String(length=200), nullable=False),
        sa.Column("status", sa.String(length=20), server_default="open", nullable=False),
        sa.Column("started_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("resolved_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("failure_count_at_open", sa.Integer(), server_default="2", nullable=False),
        sa.Column("summary", sa.Text(), nullable=True),
    )
    op.create_index("ix_incidents_monitor_id", "incidents", ["monitor_id"])
    op.create_index("ix_incidents_status", "incidents", ["status"])


def downgrade() -> None:
    op.drop_index("ix_incidents_status", table_name="incidents")
    op.drop_index("ix_incidents_monitor_id", table_name="incidents")
    op.drop_table("incidents")
    op.drop_index("ix_check_results_checked_at", table_name="check_results")
    op.drop_index("ix_check_results_monitor_id", table_name="check_results")
    op.drop_table("check_results")
    op.drop_index("ix_monitors_next_check_at", table_name="monitors")
    op.drop_table("monitors")
