"""add_soft_delete_to_applicants

Revision ID: c1a2b3d4e5f6
Revises: b50b8266ddb5
Create Date: 2026-04-27 18:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'c1a2b3d4e5f6'
down_revision: Union[str, None] = 'b50b8266ddb5'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('applicants', sa.Column('deleted_at', sa.DateTime(timezone=True), nullable=True))
    op.create_index('ix_applicants_deleted_at', 'applicants', ['deleted_at'], unique=False)


def downgrade() -> None:
    op.drop_index('ix_applicants_deleted_at', table_name='applicants')
    op.drop_column('applicants', 'deleted_at')
