"""add area_id faturas

Revision ID: 39d05229e980
Revises: 3def3da8c39b
Create Date: 2026-09-19 18:51:54
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '39d05229e980'
down_revision: Union[str, Sequence[str], None] = '3def3da8c39b'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

def upgrade() -> None:
    # 1. Cria tabela areas se não existir
    op.create_table(
        'areas',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('company_id', sa.UUID(), nullable=False),
        sa.Column('nome', sa.String(length=100), nullable=False),
        sa.Column('codigo', sa.String(length=20), nullable=True),
        sa.Column('descricao', sa.Text(), nullable=True),
        sa.Column('ativo', sa.Boolean(), server_default='true', nullable=False),
        sa.Column('created_at', postgresql.TIMESTAMP(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['company_id'], ['companies.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('company_id', 'nome', name='uq_area_company_nome')
    )
    op.create_index('ix_areas_company_id', 'areas', ['company_id'], unique=False)

    # 2. Cria funcionarios se não existir
    op.create_table(
        'funcionarios',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('company_id', sa.UUID(), nullable=False),
        sa.Column('user_id', sa.UUID(), nullable=True),
        sa.Column('nome', sa.String(length=255), nullable=False),
        sa.Column('email', sa.String(length=255), nullable=True),
        sa.Column('cargo', sa.String(length=100), nullable=True),
        sa.Column('ativo', sa.Boolean(), server_default='true', nullable=False),
        sa.Column('created_at', postgresql.TIMESTAMP(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['company_id'], ['companies.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_funcionarios_company_id', 'funcionarios', ['company_id'], unique=False)

    op.create_table(
        'funcionario_areas',
        sa.Column('funcionario_id', sa.UUID(), nullable=False),
        sa.Column('area_id', sa.UUID(), nullable=False),
        sa.ForeignKeyConstraint(['area_id'], ['areas.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['funcionario_id'], ['funcionarios.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('funcionario_id', 'area_id')
    )

    # 3. Adiciona area_id em faturas - ESSA É A PARTE QUE QUERES
    op.add_column('faturas', sa.Column('area_id', sa.UUID(), nullable=True))
    op.create_index('ix_faturas_area_id', 'faturas', ['area_id'], unique=False)
    op.create_foreign_key('fk_faturas_area_id', 'faturas', 'areas', ['area_id'], ['id'], ondelete='SET NULL')

def downgrade() -> None:
    op.drop_constraint('fk_faturas_area_id', 'faturas', type_='foreignkey')
    op.drop_index('ix_faturas_area_id', table_name='faturas')
    op.drop_column('faturas', 'area_id')
    op.drop_table('funcionario_areas')
    op.drop_index('ix_funcionarios_company_id', table_name='funcionarios')
    op.drop_table('funcionarios')
    op.drop_index('ix_areas_company_id', table_name='areas')
    op.drop_table('areas')
