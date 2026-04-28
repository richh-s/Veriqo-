"""migrate clerks to admin

Revision ID: d2e3f4a5b6c7
Revises: c1a2b3d4e5f6
Create Date: 2026-04-28
"""
from alembic import op

revision = 'd2e3f4a5b6c7'
down_revision = 'c1a2b3d4e5f6'
branch_labels = None
depends_on = None


def upgrade():
    op.execute("UPDATE users SET role = 'admin' WHERE role = 'clerk'")


def downgrade():
    pass
