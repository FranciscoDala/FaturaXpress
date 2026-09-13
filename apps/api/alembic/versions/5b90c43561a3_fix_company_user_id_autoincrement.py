"""fix company user id to UUID

Revision ID: 5b90c43561a3
Revises:
Create Date: 2026-09-13 13:03:28.204401

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID
import uuid

revision: str = '5b90c43561a3'
down_revision: Union[str, Sequence[str], None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

def upgrade() -> None:
    """Upgrade schema to UUID."""
    # 1. Ativa extensão uuid
    op.execute('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"')

    # 2. Dropar só se existir - pra não quebrar no banco vazio
    op.drop_table('users', if_exists=True)
    op.drop_table('companies', if_exists=True)

    # 3. Recriar com UUID
    op.create_table('companies',
        sa.Column('id', UUID(as_uuid=True), primary_key=True, default=uuid.uuid4),
        sa.Column('companyName', sa.String(length=255), nullable=False),
        sa.Column('nif', sa.String(length=50), nullable=False, unique=True, index=True),
        sa.Column('email', sa.String(length=255), nullable=False, unique=True, index=True),
        sa.Column('phone', sa.String(length=50), nullable=True),
        sa.Column('address', sa.String(length=255), nullable=True),
        sa.Column('city', sa.String(length=100), nullable=True),
        sa.Column('province', sa.String(length=100), nullable=True),
        sa.Column('password_hash', sa.String(length=255), nullable=False),
        sa.Column('is_active', sa.Boolean(), nullable=False, default=True),
        sa.Column('createdAt', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
    )

    op.create_table('users',
        sa.Column('id', UUID(as_uuid=True), primary_key=True, default=uuid.uuid4),
        sa.Column('company_id', UUID(as_uuid=True), sa.ForeignKey('companies.id', ondelete='CASCADE'), nullable=False, index=True),
        sa.Column('name', sa.String(length=255), nullable=False),
        sa.Column('email', sa.String(length=255), nullable=False, unique=True, index=True),
        sa.Column('password_hash', sa.String(length=255), nullable=False),
        sa.Column('role', sa.String(length=50), nullable=False, default='admin'),
        sa.Column('is_active', sa.Boolean(), nullable=False, default=True),
        sa.Column('createdAt', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
    )

def downgrade() -> None:
    """Downgrade schema."""
    op.drop_table('users', if_exists=True)
    op.drop_table('companies', if_exists=True)
