"""create funcionarios BI fields - ajustado

Revision ID: 0c546fe70766
Revises: a3fdf50f8759
Create Date: 2026-09-20 00:30:47.279069
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = '0c546fe70766'
down_revision: Union[str, Sequence[str], None] = 'a3fdf50f8759'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

def upgrade() -> None:
    """Upgrade schema."""
    # --- ADD COLUMNS NULLABLE PRIMEIRO PARA NÃO QUEBRAR SE JÁ TEM DADOS ---
    op.add_column('funcionarios', sa.Column('numero_bi', sa.String(length=20), nullable=True))
    op.add_column('funcionarios', sa.Column('data_nascimento', sa.Date(), nullable=True))
    op.add_column('funcionarios', sa.Column('genero', sa.String(length=10), nullable=True))
    op.add_column('funcionarios', sa.Column('nacionalidade', sa.String(length=50), nullable=True, server_default='Angolana'))
    op.add_column('funcionarios', sa.Column('naturalidade', sa.String(length=100), nullable=True))
    op.add_column('funcionarios', sa.Column('nome_pai', sa.String(length=150), nullable=True))
    op.add_column('funcionarios', sa.Column('nome_mae', sa.String(length=150), nullable=True))
    op.add_column('funcionarios', sa.Column('data_emissao_bi', sa.Date(), nullable=True))
    op.add_column('funcionarios', sa.Column('data_validade_bi', sa.Date(), nullable=True))
    op.add_column('funcionarios', sa.Column('local_emissao_bi', sa.String(length=100), nullable=True))
    op.add_column('funcionarios', sa.Column('estado_civil', sa.String(length=20), nullable=True, server_default='solteiro'))
    op.add_column('funcionarios', sa.Column('telefone', sa.String(length=20), nullable=True))
    op.add_column('funcionarios', sa.Column('endereco', sa.Text(), nullable=True))
    op.add_column('funcionarios', sa.Column('cidade', sa.String(length=100), nullable=True))
    op.add_column('funcionarios', sa.Column('provincia', sa.String(length=50), nullable=True))
    op.add_column('funcionarios', sa.Column('nif', sa.String(length=20), nullable=True))
    op.add_column('funcionarios', sa.Column('banco1', sa.String(length=100), nullable=True))
    op.add_column('funcionarios', sa.Column('banco2', sa.String(length=100), nullable=True))
    op.add_column('funcionarios', sa.Column('iban', sa.String(length=50), nullable=True))
    op.add_column('funcionarios', sa.Column('iban2', sa.String(length=50), nullable=True))
    op.add_column('funcionarios', sa.Column('contacto_emergencia', sa.String(length=20), nullable=True))
    op.add_column('funcionarios', sa.Column('tem_acesso', sa.Boolean(), nullable=True, server_default=sa.text('false')))

    # email e senha_hash passam a ser opcionais - sem acesso é só RH
    op.alter_column('funcionarios', 'email', existing_type=sa.VARCHAR(length=255), nullable=True)
    op.alter_column('funcionarios', 'senha_hash', existing_type=sa.VARCHAR(length=255), nullable=True)

    # --- BACKFILL SE JÁ EXISTIR DADOS ANTIGOS (evita falhar no NOT NULL) ---
    # Descomenta se já tens funcionarios antigos:
    # op.execute("""
    # UPDATE funcionarios
    # SET numero_bi = COALESCE(numero_bi, 'PENDENTE-' || LEFT(id::text, 8)),
    # data_nascimento = COALESCE(data_nascimento, '1990-01-01'::date),
    # genero = COALESCE(genero, 'M'),
    # nome_pai = COALESCE(nome_pai, 'Não informado'),
    # nome_mae = COALESCE(nome_mae, 'Não informado')
    # WHERE numero_bi IS NULL
    # """)

    # --- TORNA OBRIGATÓRIO O QUE O FRONT EXIGE ---
    op.alter_column('funcionarios', 'numero_bi', nullable=False)
    op.alter_column('funcionarios', 'data_nascimento', nullable=False)
    op.alter_column('funcionarios', 'genero', nullable=False)
    op.alter_column('funcionarios', 'nacionalidade', nullable=False, server_default='Angolana')
    op.alter_column('funcionarios', 'nome_pai', nullable=False)
    op.alter_column('funcionarios', 'nome_mae', nullable=False)
    op.alter_column('funcionarios', 'estado_civil', nullable=False, server_default='solteiro')
    op.alter_column('funcionarios', 'tem_acesso', nullable=False, server_default=sa.text('false'))

    # --- INDEX + UNIQUE DO LOGIN BI ---
    op.create_index(op.f('ix_funcionarios_numero_bi'), 'funcionarios', ['numero_bi'], unique=False)
    op.create_unique_constraint('uq_funcionarios_company_bi', 'funcionarios', ['company_id', 'numero_bi'])

def downgrade() -> None:
    """Downgrade schema."""
    op.drop_constraint('uq_funcionarios_company_bi', 'funcionarios', type_='unique')
    op.drop_index(op.f('ix_funcionarios_numero_bi'), table_name='funcionarios')
    op.alter_column('funcionarios', 'senha_hash', existing_type=sa.VARCHAR(length=255), nullable=False)
    op.alter_column('funcionarios', 'email', existing_type=sa.VARCHAR(length=255), nullable=False)
    op.drop_column('funcionarios', 'tem_acesso')
    op.drop_column('funcionarios', 'contacto_emergencia')
    op.drop_column('funcionarios', 'iban2')
    op.drop_column('funcionarios', 'iban')
    op.drop_column('funcionarios', 'banco2')
    op.drop_column('funcionarios', 'banco1')
    op.drop_column('funcionarios', 'nif')
    op.drop_column('funcionarios', 'provincia')
    op.drop_column('funcionarios', 'cidade')
    op.drop_column('funcionarios', 'endereco')
    op.drop_column('funcionarios', 'telefone')
    op.drop_column('funcionarios', 'estado_civil')
    op.drop_column('funcionarios', 'local_emissao_bi')
    op.drop_column('funcionarios', 'data_validade_bi')
    op.drop_column('funcionarios', 'data_emissao_bi')
    op.drop_column('funcionarios', 'nome_mae')
    op.drop_column('funcionarios', 'nome_pai')
    op.drop_column('funcionarios', 'naturalidade')
    op.drop_column('funcionarios', 'nacionalidade')
    op.drop_column('funcionarios', 'genero')
    op.drop_column('funcionarios', 'data_nascimento')
    op.drop_column('funcionarios', 'numero_bi')
