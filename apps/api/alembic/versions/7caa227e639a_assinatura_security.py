"""assinatura_security - blindado

Revision ID: 7caa227e639a
Revises: 87f82c323b10
Create Date: 2026-09-17 13:31:41.184519

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect

revision: str = '7caa227e639a'
down_revision: Union[str, Sequence[str], None] = '87f82c323b10'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

def _safe_add_column(table, column):
    try:
        op.add_column(table, column)
    except Exception:
        pass

def _safe_create_index(name, table, cols, **kw):
    try:
        op.create_index(name, table, cols, **kw)
    except Exception:
        pass

def _safe_drop_constraint(name, table, type_='unique'):
    try:
        if name:
            op.drop_constraint(name, table, type_=type_)
    except Exception:
        pass

def _safe_drop_index(name, table):
    try:
        op.drop_index(name, table_name=table)
    except Exception:
        pass

def _drop_fk_to_companies():
    # dropa qualquer FK de subscriptions.company_id -> companies.id, independente do nome
    try:
        conn = op.get_bind()
        insp = inspect(conn)
        for fk in insp.get_foreign_keys('subscriptions'):
            if fk.get('referred_table') == 'companies' and 'company_id' in fk.get('constrained_columns', []):
                fk_name = fk.get('name')
                if fk_name:
                    try:
                        op.drop_constraint(fk_name, 'subscriptions', type_='foreignkey')
                    except Exception:
                        pass
    except Exception:
        pass

def upgrade() -> None:
    try:
        op.alter_column('plans', 'name', existing_type=sa.VARCHAR(length=20), type_=sa.String(length=50), existing_nullable=False)
    except Exception:
        pass

    _safe_create_index('ix_plans_is_active', 'plans', ['is_active'], unique=False)

    _safe_add_column('subscriptions', sa.Column('comprovativo_url', sa.String(length=500), nullable=True))
    _safe_add_column('subscriptions', sa.Column('comprovativo_hash', sa.String(length=128), nullable=True))
    _safe_add_column('subscriptions', sa.Column('payment_phone', sa.String(length=20), nullable=True))
    _safe_add_column('subscriptions', sa.Column('expires_at', sa.DateTime(timezone=True), nullable=True))

    _safe_drop_constraint('subscriptions_reference_key', 'subscriptions', type_='unique')

    _safe_create_index('ix_sub_company_status', 'subscriptions', ['company_id', 'status'], unique=False)
    _safe_create_index('ix_subscriptions_created_at', 'subscriptions', ['created_at'], unique=False)
    _safe_create_index('ix_subscriptions_plan_id', 'subscriptions', ['plan_id'], unique=False)
    _safe_create_index('ix_subscriptions_provider', 'subscriptions', ['provider'], unique=False)
    _safe_create_index('ix_subscriptions_reference', 'subscriptions', ['reference'], unique=True)
    _safe_create_index('ix_subscriptions_status', 'subscriptions', ['status'], unique=False)
    _safe_create_index('ix_sub_hash', 'subscriptions', ['comprovativo_hash'], unique=False)

    _drop_fk_to_companies()
    try:
        op.create_foreign_key('subscriptions_company_id_fkey_cascade', 'subscriptions', 'companies', ['company_id'], ['id'], ondelete='CASCADE')
    except Exception:
        pass

def downgrade() -> None:
    # dropa FK cascade e recria simples
    _drop_fk_to_companies()
    try:
        op.create_foreign_key('subscriptions_company_id_fkey', 'subscriptions', 'companies', ['company_id'], ['id'])
    except Exception:
        pass

    _safe_drop_index('ix_subscriptions_status', 'subscriptions')
    _safe_drop_index('ix_subscriptions_reference', 'subscriptions')
    _safe_drop_index('ix_subscriptions_provider', 'subscriptions')
    _safe_drop_index('ix_subscriptions_plan_id', 'subscriptions')
    _safe_drop_index('ix_subscriptions_created_at', 'subscriptions')
    _safe_drop_index('ix_sub_company_status', 'subscriptions')
    _safe_drop_index('ix_sub_hash', 'subscriptions')

    try:
        op.create_unique_constraint('subscriptions_reference_key', 'subscriptions', ['reference'])
    except Exception:
        pass

    for col in ['expires_at','payment_phone','comprovativo_hash','comprovativo_url']:
        try:
            op.drop_column('subscriptions', col)
        except Exception:
            pass

    _safe_drop_index('ix_plans_is_active', 'plans')
    try:
        op.alter_column('plans', 'name', existing_type=sa.String(length=50), type_=sa.VARCHAR(length=20), existing_nullable=False)
    except Exception:
        pass
