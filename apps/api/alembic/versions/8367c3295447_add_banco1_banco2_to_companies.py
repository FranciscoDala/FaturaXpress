"""add banco1 banco2 to companies

Revision ID: 8367c3295447
Revises: 403f8bc0a1cb
Create Date: 2026-09-18 13:19:38.798001

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = '8367c3295447'
down_revision: Union[str, Sequence[str], None] = '403f8bc0a1cb'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

def upgrade() -> None:
    op.add_column('companies', sa.Column('banco1', sa.String(length=100), nullable=True))
    op.add_column('companies', sa.Column('banco2', sa.String(length=100), nullable=True))

def downgrade() -> None:
    op.drop_column('companies', 'banco2')
    op.drop_column('companies', 'banco1')
