"""create produtos table

Revision ID: 5d05d1fff1fd
Revises: 514cda68bc8a
Create Date: 2026-09-14 09:47:19.342754

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
import uuid

revision: str = '5d05d1fff1fd'
down_revision: Union[str, Sequence[str], None] = '514cda68bc8a'

def upgrade() -> None:
    # usa o enum que já existe no DB
    tipoprodutoenum = sa.Enum('produto', 'servico', 'kit', name='tipoprodutoenum')

    op.create_table('produtos',
    sa.Column('id', sa.UUID(), nullable=False, default=uuid.uuid4),
    sa.Column('company_id', sa.UUID(), nullable=False),
    sa.Column('codigo', sa.String(), nullable=False),
    sa.Column('codigo_barras', sa.String(), nullable=True),
    sa.Column('codigo_qr', sa.String(), nullable=True),
    sa.Column('nome', sa.String(), nullable=False),
    sa.Column('descricao', sa.Text(), nullable=True),
    sa.Column('categoria', sa.String(), nullable=True),
    sa.Column('preco_custo', sa.Float(), nullable=False, server_default='0.0'),
    sa.Column('preco_venda', sa.Float(), nullable=False),
    sa.Column('iva', sa.Float(), nullable=False, server_default='14.0'),
    sa.Column('tem_iva', sa.Boolean(), nullable=False, server_default='true'),
    sa.Column('tipo', tipoprodutoenum, nullable=False, server_default='produto'),
    sa.Column('stock_atual', sa.Float(), nullable=False, server_default='0.0'),
    sa.Column('stock_minimo', sa.Float(), nullable=False, server_default='0.0'),
    sa.Column('controlar_stock', sa.Boolean(), nullable=False, server_default='true'),
    sa.Column('unidade', sa.String(), nullable=False, server_default='UN'),
    sa.Column('peso', sa.Float(), nullable=True),
    sa.Column('ativo', sa.Boolean(), nullable=False, server_default='true'),
    sa.ForeignKeyConstraint(['company_id'], ['companies.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id'),
    sa.UniqueConstraint('company_id', 'codigo', name='uq_produtos_company_codigo')
    )
    op.create_index('ix_produtos_company_id', 'produtos', ['company_id'])
    op.create_index('ix_produtos_codigo', 'produtos', ['codigo'])
    op.create_index('ix_produtos_codigo_barras', 'produtos', ['codigo_barras'])
    op.create_index('ix_produtos_codigo_qr', 'produtos', ['codigo_qr'])
    op.create_index('ix_produtos_nome', 'produtos', ['nome'])
    op.create_index('ix_produtos_categoria', 'produtos', ['categoria'])

def downgrade() -> None:
    op.drop_table('produtos')
