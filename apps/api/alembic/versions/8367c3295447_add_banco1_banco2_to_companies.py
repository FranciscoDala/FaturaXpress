"""add banco1 banco2 and subscription plan

Revision ID: 8367c3295447
Revises: 403f8bc0a1cb
Create Date: 2026-09-18 13:19:38.798001

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = '8367c3295447'
down_revision: Union[str, Sequence[str], None] = '403f8bc0a1cb'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

def upgrade() -> None:
    # banco1 / banco2
    op.execute("ALTER TABLE companies ADD COLUMN IF NOT EXISTS banco1 VARCHAR(100)")
    op.execute("ALTER TABLE companies ADD COLUMN IF NOT EXISTS banco2 VARCHAR(100)")

    # plano - ESSA PARTE FALTAVA E QUEBRAVA O DEPLOY
    op.execute("ALTER TABLE companies ADD COLUMN IF NOT EXISTS subscription_plan VARCHAR(20) DEFAULT 'free'")
    op.execute("ALTER TABLE companies ADD COLUMN IF NOT EXISTS subscription_status VARCHAR(20) DEFAULT 'active'")

    # garante que quem já existe vira free
    op.execute("UPDATE companies SET subscription_plan='free' WHERE subscription_plan IS NULL")
    op.execute("UPDATE companies SET subscription_status='active' WHERE subscription_status IS NULL")

def downgrade() -> None:
    op.execute("ALTER TABLE companies DROP COLUMN IF EXISTS banco2")
    op.execute("ALTER TABLE companies DROP COLUMN IF EXISTS banco1")
    op.execute("ALTER TABLE companies DROP COLUMN IF EXISTS subscription_plan")
    op.execute("ALTER TABLE companies DROP COLUMN IF EXISTS subscription_status")
