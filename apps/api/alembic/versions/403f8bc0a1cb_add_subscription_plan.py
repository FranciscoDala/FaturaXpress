"""add subscription plan

Revision ID: 403f8bc0a1cb
Revises: 7caa227e639a
Create Date: 2026-09-18 10:54:23.963406

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = '403f8bc0a1cb'
down_revision: Union[str, Sequence[str], None] = '7caa227e639a'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

def upgrade() -> None:
    """Upgrade schema."""
    op.add_column('companies',
        sa.Column('subscription_plan', sa.String(length=20), server_default='free', nullable=False)
    )
    op.add_column('companies',
        sa.Column('subscription_status', sa.String(length=20), server_default='active', nullable=False)
    )
    op.execute("UPDATE companies SET subscription_plan='free' WHERE subscription_plan IS NULL")
    op.execute("UPDATE companies SET subscription_status='active' WHERE subscription_status IS NULL")
    op.create_index('ix_companies_subscription_plan', 'companies', ['subscription_plan'], if_not_exists=True)

def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index('ix_companies_subscription_plan', table_name='companies', if_exists=True)
    op.drop_column('companies', 'subscription_status')
    op.drop_column('companies', 'subscription_plan')
