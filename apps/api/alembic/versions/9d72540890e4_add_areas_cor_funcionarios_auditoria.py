"""add_areas_cor_funcionarios_auditoria

Revision ID: 9d72540890e4
Revises: 39d05229e980
Create Date: 2026-09-19
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect

revision = '9d72540890e4'
down_revision = '39d05229e980'
branch_labels = None
depends_on = None

def upgrade():
    conn = op.get_bind()
    insp = inspect(conn)
    cols_areas = [c['name'] for c in insp.get_columns('areas')]
    if 'cor' not in cols_areas:
        op.add_column('areas', sa.Column('cor', sa.String(length=20), server_default='#E6F0FF', nullable=False))
    if 'updated_at' not in cols_areas:
        op.add_column('areas', sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False))
    cols_func = [c['name'] for c in insp.get_columns('funcionarios')]
    if 'area_principal_id' not in cols_func:
        op.add_column('funcionarios', sa.Column('area_principal_id', sa.UUID(), nullable=True))
    if 'senha_hash' not in cols_func:
        op.add_column('funcionarios', sa.Column('senha_hash', sa.String(length=255), nullable=True))
    if 'updated_at' not in cols_func:
        op.add_column('funcionarios', sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False))
    fks = [fk['name'] for fk in insp.get_foreign_keys('funcionarios')]
    if 'fk_func_area_principal' not in fks:
        op.create_foreign_key('fk_func_area_principal', 'funcionarios', 'areas', ['area_principal_id'], ['id'], ondelete='SET NULL')
    tables = insp.get_table_names()
    if 'funcionario_areas' not in tables:
        op.create_table('funcionario_areas',
            sa.Column('funcionario_id', sa.UUID(), nullable=False),
            sa.Column('area_id', sa.UUID(), nullable=False),
            sa.ForeignKeyConstraint(['funcionario_id'], ['funcionarios.id'], ondelete='CASCADE'),
            sa.ForeignKeyConstraint(['area_id'], ['areas.id'], ondelete='CASCADE'),
            sa.PrimaryKeyConstraint('funcionario_id', 'area_id')
        )
    if 'atividades_log' not in tables:
        op.create_table('atividades_log',
            sa.Column('id', sa.UUID(), nullable=False),
            sa.Column('company_id', sa.UUID(), nullable=False),
            sa.Column('usuario_id', sa.UUID(), nullable=True),
            sa.Column('usuario_nome', sa.String(length=100), nullable=True),
            sa.Column('usuario_cargo', sa.String(length=20), nullable=True),
            sa.Column('area_id', sa.UUID(), nullable=True),
            sa.Column('acao', sa.String(length=50), nullable=False),
            sa.Column('entidade', sa.String(length=50), nullable=False),
            sa.Column('entidade_id', sa.UUID(), nullable=True),
            sa.Column('detalhe', sa.JSON(), nullable=True),
            sa.Column('ip', sa.String(length=45), nullable=True),
            sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
            sa.ForeignKeyConstraint(['area_id'], ['areas.id'], ondelete='SET NULL'),
            sa.ForeignKeyConstraint(['company_id'], ['companies.id'], ondelete='CASCADE'),
            sa.ForeignKeyConstraint(['usuario_id'], ['funcionarios.id'], ondelete='SET NULL'),
            sa.PrimaryKeyConstraint('id')
        )
        op.create_index('ix_atividades_company_created', 'atividades_log', ['company_id', 'created_at'])
        op.create_index('ix_atividades_acao', 'atividades_log', ['acao'])
        op.create_index('ix_atividades_entidade_id', 'atividades_log', ['entidade_id'])

def downgrade():
    op.drop_table('atividades_log')
    op.drop_table('funcionario_areas')
    op.drop_constraint('fk_func_area_principal', 'funcionarios', type_='foreignkey')
    op.drop_column('funcionarios', 'updated_at')
    op.drop_column('funcionarios', 'senha_hash')
    op.drop_column('funcionarios', 'area_principal_id')
    op.drop_column('areas', 'updated_at')
    op.drop_column('areas', 'cor')
