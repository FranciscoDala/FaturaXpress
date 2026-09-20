"""add retroativo audit

Revision ID: fad26f7dc855
Revises: fc1ed3cb2c9a
Create Date: 2026-09-20 14:39:56.191964
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = 'fad26f7dc855'
down_revision: Union[str, Sequence[str], None] = 'fc1ed3cb2c9a'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

def upgrade() -> None:
    # ### com default para não quebrar dados existentes ###
    op.add_column('pedidos_rh', sa.Column('is_retroativo', sa.Boolean(), nullable=False, server_default=sa.text('false')))
    op.add_column('pedidos_rh', sa.Column('motivo_retroativo', sa.Text(), nullable=True))
    op.add_column('pedidos_rh', sa.Column('lancado_por_id', sa.UUID(), nullable=True))
    op.create_foreign_key('fk_pedidos_rh_lancado_por', 'pedidos_rh', 'funcionarios', ['lancado_por_id'], ['id'], ondelete='SET NULL')

    op.add_column('pontos', sa.Column('is_retroativo', sa.Boolean(), nullable=False, server_default=sa.text('false')))
    op.add_column('pontos', sa.Column('motivo_retroativo', sa.Text(), nullable=True))
    op.add_column('pontos', sa.Column('lancado_por_id', sa.UUID(), nullable=True))
    op.create_foreign_key('fk_pontos_lancado_por', 'pontos', 'funcionarios', ['lancado_por_id'], ['id'], ondelete='SET NULL')

    # remove server_default depois, deixa só o default do model
    op.alter_column('pedidos_rh', 'is_retroativo', server_default=None)
    op.alter_column('pontos', 'is_retroativo', server_default=None)

def downgrade() -> None:
    op.drop_constraint('fk_pontos_lancado_por', 'pontos', type_='foreignkey')
    op.drop_column('pontos', 'lancado_por_id')
    op.drop_column('pontos', 'motivo_retroativo')
    op.drop_column('pontos', 'is_retroativo')

    op.drop_constraint('fk_pedidos_rh_lancado_por', 'pedidos_rh', type_='foreignkey')
    op.drop_column('pedidos_rh', 'lancado_por_id')
    op.drop_column('pedidos_rh', 'motivo_retroativo')
    op.drop_column('pedidos_rh', 'is_retroativo')
