"""fluxo rh admin notificacoes

Revision ID: 554633d9841b
Revises: dbfcbaff7991
Create Date: 2026-09-21 18:18:15.532327

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = '554633d9841b'
down_revision: Union[str, Sequence[str], None] = 'dbfcbaff7991'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

def upgrade() -> None:
    """Upgrade schema."""
    op.create_table('notificacoes',
    sa.Column('id', sa.UUID(), nullable=False),
    sa.Column('company_id', sa.UUID(), nullable=False),
    sa.Column('tipo', sa.String(length=30), nullable=False),
    sa.Column('referencia_id', sa.UUID(), nullable=False),
    sa.Column('area_origem', sa.String(length=20), nullable=False),
    sa.Column('area_destino', sa.String(length=20), nullable=False),
    sa.Column('dono_atual', sa.String(length=20), nullable=False),
    sa.Column('status', sa.String(length=20), nullable=False),
    sa.Column('lida', sa.Boolean(), nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
    sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
    sa.ForeignKeyConstraint(['company_id'], ['companies.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_notificacoes_area_destino'), 'notificacoes', ['area_destino'], unique=False)
    op.create_index(op.f('ix_notificacoes_company_id'), 'notificacoes', ['company_id'], unique=False)
    op.create_index(op.f('ix_notificacoes_dono_atual'), 'notificacoes', ['dono_atual'], unique=False)
    op.create_index(op.f('ix_notificacoes_referencia_id'), 'notificacoes', ['referencia_id'], unique=False)
    op.create_index(op.f('ix_notificacoes_status'), 'notificacoes', ['status'], unique=False)
    op.add_column('pedidos_rh', sa.Column('dono_atual', sa.String(length=20), nullable=False, server_default='rh'))
    op.add_column('pedidos_rh', sa.Column('area_origem', sa.String(length=20), nullable=True))
    op.add_column('pedidos_rh', sa.Column('encaminhado_para_admin', sa.Boolean(), nullable=False, server_default='false'))
    op.add_column('pedidos_rh', sa.Column('encaminhado_em', sa.DateTime(timezone=True), nullable=True))
    op.add_column('pedidos_rh', sa.Column('encaminhado_por_id', sa.UUID(), nullable=True))
    op.create_index(op.f('ix_pedidos_rh_dono_atual'), 'pedidos_rh', ['dono_atual'], unique=False)
    op.create_foreign_key(None, 'pedidos_rh', 'funcionarios', ['encaminhado_por_id'], ['id'], ondelete='SET NULL')

def downgrade() -> None:
    """Downgrade schema."""
    op.drop_constraint(None, 'pedidos_rh', type_='foreignkey')
    op.drop_index(op.f('ix_pedidos_rh_dono_atual'), table_name='pedidos_rh')
    op.drop_column('pedidos_rh', 'encaminhado_por_id')
    op.drop_column('pedidos_rh', 'encaminhado_em')
    op.drop_column('pedidos_rh', 'encaminhado_para_admin')
    op.drop_column('pedidos_rh', 'area_origem')
    op.drop_column('pedidos_rh', 'dono_atual')
    op.drop_index(op.f('ix_notificacoes_status'), table_name='notificacoes')
    op.drop_index(op.f('ix_notificacoes_referencia_id'), table_name='notificacoes')
    op.drop_index(op.f('ix_notificacoes_dono_atual'), table_name='notificacoes')
    op.drop_index(op.f('ix_notificacoes_company_id'), table_name='notificacoes')
    op.drop_index(op.f('ix_notificacoes_area_destino'), table_name='notificacoes')
    op.drop_table('notificacoes')
