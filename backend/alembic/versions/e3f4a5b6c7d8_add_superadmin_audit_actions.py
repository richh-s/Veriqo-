"""add superadmin audit actions

Revision ID: e3f4a5b6c7d8
Revises: d2e3f4a5b6c7
Create Date: 2025-01-01 00:00:00.000000

"""
from alembic import op

revision = 'e3f4a5b6c7d8'
down_revision = 'd2e3f4a5b6c7'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("ALTER TYPE auditaction ADD VALUE IF NOT EXISTS 'tenant_created'")
    op.execute("ALTER TYPE auditaction ADD VALUE IF NOT EXISTS 'superadmin_login'")


def downgrade() -> None:
    pass
