"""Add persistent expiring claims for manual and scheduled monitor checks.

Revision ID: 20261027_0004
Revises: 20261027_0003
Create Date: 2026-10-27
"""
from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa

revision: str = "20261027_0004"
down_revision: str | None = "20261027_0003"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # Nullable columns keep all existing monitor rows and schedules intact.
    op.add_column("monitors", sa.Column("check_claim_token", sa.String(length=36), nullable=True))
    op.add_column("monitors", sa.Column("check_claim_expires_at", sa.DateTime(timezone=True), nullable=True))
    op.create_index("ix_monitors_check_claim_expires_at", "monitors", ["check_claim_expires_at"])


def downgrade() -> None:
    op.drop_index("ix_monitors_check_claim_expires_at", table_name="monitors")
    op.drop_column("monitors", "check_claim_expires_at")
    op.drop_column("monitors", "check_claim_token")
