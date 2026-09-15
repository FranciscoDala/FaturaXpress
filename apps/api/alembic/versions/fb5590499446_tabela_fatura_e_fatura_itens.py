"""tabela fatura e fatura_itens"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = 'fb5590499446'
down_revision = '52f9d0dbce22'
branch_labels = None
depends_on = None

def upgrade():
    op.create_table('faturas',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('company_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('cliente_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('tipo_documento', sa.String(20), nullable=False),
        sa.Column('status', sa.String(20), nullable=False),
        sa.Column('numero_proforma', sa.String(50), nullable=True),
        sa.Column('numero_fatura', sa.String(50), nullable=True),
        sa.Column('proforma_origem_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('data_emissao', sa.DateTime(timezone=True), nullable=False),
        sa.Column('data_vencimento', sa.DateTime(timezone=True), nullable=True),
        sa.Column('validade_proforma', sa.DateTime(timezone=True), nullable=True),
        sa.Column('subtotal', sa.Numeric(12,2), nullable=False),
        sa.Column('total_iva', sa.Numeric(12,2), nullable=False),
        sa.Column('total_geral', sa.Numeric(12,2), nullable=False),
        sa.Column('desconto_percent', sa.Numeric(5,2), nullable=False),
        sa.Column('forma_pagamento', sa.String(20), nullable=False),
        sa.Column('hash_agt', sa.String(500), nullable=True),
        sa.Column('comunicado_agt', sa.Boolean(), nullable=False),
        sa.Column('qr_code', sa.Text(), nullable=True),
        sa.Column('observacoes', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['cliente_id'], ['clientes.id']),
        sa.ForeignKeyConstraint(['company_id'], ['companies.id']),
        sa.ForeignKeyConstraint(['proforma_origem_id'], ['faturas.id']),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('numero_fatura')
    )
    op.create_index('ix_faturas_company_id', 'faturas', ['company_id'])
    op.create_index('ix_faturas_cliente_id', 'faturas', ['cliente_id'])

    op.create_table('fatura_itens',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('fatura_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('produto_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('nome_snapshot', sa.String(255), nullable=False),
        sa.Column('quantidade', sa.Numeric(10,2), nullable=False),
        sa.Column('preco_unit_snapshot', sa.Numeric(12,2), nullable=False),
        sa.Column('iva_percent', sa.Numeric(5,2), nullable=False),
        sa.Column('iva_valor', sa.Numeric(12,2), nullable=False),
        sa.Column('subtotal_linha', sa.Numeric(12,2), nullable=False),
        sa.ForeignKeyConstraint(['fatura_id'], ['faturas.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['produto_id'], ['produtos.id']),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_fatura_itens_fatura_id', 'fatura_itens', ['fatura_id'])

def downgrade():
    op.drop_table('fatura_itens')
    op.drop_table('faturas')
