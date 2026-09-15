"""add fatura constraints hash

Revision ID: 60e2ac469d09
Revises: fb5590499446
Create Date: 2026-09-16 00:22:26.274734

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = '60e2ac469d09'
down_revision: Union[str, Sequence[str], None] = 'fb5590499446'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

def upgrade() -> None:
    op.drop_constraint('fatura_itens_produto_id_fkey', 'fatura_itens', type_='foreignkey')
    op.create_foreign_key('fk_fatura_itens_produto_set_null', 'fatura_itens', 'produtos', ['produto_id'], ['id'], ondelete='SET NULL')

    op.add_column('faturas', sa.Column('hash_agt_anterior', sa.String(length=500), nullable=True))
    op.add_column('faturas', sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True))

    op.drop_constraint('faturas_numero_fatura_key', 'faturas', type_='unique')
    op.create_index('ix_faturas_company_status', 'faturas', ['company_id', 'status'], unique=False)
    op.create_index('ix_faturas_company_tipo_ano', 'faturas', ['company_id', 'tipo_documento', 'created_at'], unique=False)
    op.create_index(op.f('ix_faturas_numero_fatura'), 'faturas', ['numero_fatura'], unique=False)
    op.create_index(op.f('ix_faturas_numero_proforma'), 'faturas', ['numero_proforma'], unique=False)
    op.create_unique_constraint('uq_company_numero_fatura', 'faturas', ['company_id', 'numero_fatura'], deferrable=True, initially='DEFERRED')
    op.create_unique_constraint('uq_company_numero_proforma', 'faturas', ['company_id', 'numero_proforma'], deferrable=True, initially='DEFERRED')

    op.drop_constraint('faturas_company_id_fkey', 'faturas', type_='foreignkey')
    op.drop_constraint('faturas_proforma_origem_id_fkey', 'faturas', type_='foreignkey')
    op.drop_constraint('faturas_cliente_id_fkey', 'faturas', type_='foreignkey')
    op.create_foreign_key('fk_faturas_cliente_restrict', 'faturas', 'clientes', ['cliente_id'], ['id'], ondelete='RESTRICT')
    op.create_foreign_key('fk_faturas_company_cascade', 'faturas', 'companies', ['company_id'], ['id'], ondelete='CASCADE')
    op.create_foreign_key('fk_faturas_proforma_set_null', 'faturas', 'faturas', ['proforma_origem_id'], ['id'], ondelete='SET NULL')

def downgrade() -> None:
    op.drop_constraint('fk_faturas_proforma_set_null', 'faturas', type_='foreignkey')
    op.drop_constraint('fk_faturas_company_cascade', 'faturas', type_='foreignkey')
    op.drop_constraint('fk_faturas_cliente_restrict', 'faturas', type_='foreignkey')
    op.create_foreign_key('faturas_cliente_id_fkey', 'faturas', 'clientes', ['cliente_id'], ['id'])
    op.create_foreign_key('faturas_proforma_origem_id_fkey', 'faturas', 'faturas', ['proforma_origem_id'], ['id'])
    op.create_foreign_key('faturas_company_id_fkey', 'faturas', 'companies', ['company_id'], ['id'])

    op.drop_constraint('uq_company_numero_proforma', 'faturas', type_='unique')
    op.drop_constraint('uq_company_numero_fatura', 'faturas', type_='unique')
    op.drop_index(op.f('ix_faturas_numero_proforma'), table_name='faturas')
    op.drop_index(op.f('ix_faturas_numero_fatura'), table_name='faturas')
    op.drop_index('ix_faturas_company_tipo_ano', table_name='faturas')
    op.drop_index('ix_faturas_company_status', table_name='faturas')
    op.create_unique_constraint('faturas_numero_fatura_key', 'faturas', ['numero_fatura'])

    op.drop_column('faturas', 'updated_at')
    op.drop_column('faturas', 'hash_agt_anterior')

    op.drop_constraint('fk_fatura_itens_produto_set_null', 'fatura_itens', type_='foreignkey')
    op.create_foreign_key('fatura_itens_produto_id_fkey', 'fatura_itens', 'produtos', ['produto_id'], ['id'])
