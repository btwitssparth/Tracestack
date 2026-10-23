"""Add owner IDs to monitors for Supabase user isolation.

Revision ID: 20261023_0002
Revises: 20261023_0001
Create Date: 2026-10-23
"""
from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa

revision: str = "20261023_0002"
down_revision: str | None = "20261023_0001"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # Nullable for a safe, non-destructive migration: legacy monitors remain
    # unassigned and are excluded from every user-facing query until explicitly
    # assigned to the correct Supabase user.
    op.add_column("monitors", sa.Column("owner_id", sa.String(length=36), nullable=True))
    op.create_index("ix_monitors_owner_id", "monitors", ["owner_id"])


def downgrade() -> None:
    op.drop_index("ix_monitors_owner_id", table_name="monitors")
    op.drop_column("monitors", "owner_id")
