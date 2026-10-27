"""Add persistent notifications and browser push subscriptions.
Revision ID: 20261027_0003
Revises: 20261023_0002
Create Date: 2026-10-27
"""
from collections.abc import Sequence
from alembic import op
import sqlalchemy as sa
revision: str = "20261027_0003"
down_revision: str | None = "20261023_0002"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

def upgrade() -> None:
    op.create_table("notifications",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("owner_id", sa.String(length=36), nullable=False),
        sa.Column("monitor_id", sa.Integer(), sa.ForeignKey("monitors.id", ondelete="CASCADE"), nullable=False),
        sa.Column("incident_id", sa.Integer(), sa.ForeignKey("incidents.id", ondelete="CASCADE"), nullable=True),
        sa.Column("type", sa.String(length=40), nullable=False),
        sa.Column("title", sa.String(length=200), nullable=False),
        sa.Column("message", sa.Text(), nullable=False),
        sa.Column("is_read", sa.Boolean(), server_default=sa.false(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.UniqueConstraint("incident_id", "type", name="uq_notifications_incident_type"))
    for column in ("owner_id", "monitor_id", "incident_id", "is_read"):
        op.create_index(f"ix_notifications_{column}", "notifications", [column])
    op.create_table("push_subscriptions",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("owner_id", sa.String(length=36), nullable=False),
        sa.Column("endpoint", sa.Text(), nullable=False),
        sa.Column("p256dh", sa.String(length=512), nullable=False),
        sa.Column("auth", sa.String(length=512), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.UniqueConstraint("endpoint", name="uq_push_subscriptions_endpoint"))
    op.create_index("ix_push_subscriptions_owner_id", "push_subscriptions", ["owner_id"])

def downgrade() -> None:
    op.drop_index("ix_push_subscriptions_owner_id", table_name="push_subscriptions")
    op.drop_table("push_subscriptions")
    for column in ("is_read", "incident_id", "monitor_id", "owner_id"):
        op.drop_index(f"ix_notifications_{column}", table_name="notifications")
    op.drop_table("notifications")
