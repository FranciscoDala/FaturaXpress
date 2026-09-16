"""avulso cliente snapshot

Revision ID: 3a1e90f13a63
Revises: 13bc80f10688
Create Date: 2026-09-16 13:19:51.009441

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '3a1e90f13a63'
down_revision: Union[str, Sequence[str], None] = '13bc80f10688'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

def upgrade() -> None:
    """Upgrade schema."""
    # torna cliente_id opcional para permitir avulso
    op.alter_column('faturas', 'cliente_id',
                    existing_type=postgresql.UUID(as_uuid=True),
                    nullable=True)

    op.add_column('faturas', sa.Column('cliente_nome', sa.String(length=255), nullable=True))
    op.add_column('faturas', sa.Column('cliente_nif', sa.String(length=20), nullable=True, server_default='999999999'))
    op.add_column('faturas', sa.Column('cliente_email', sa.String(length=255), nullable=True))
    op.add_column('faturas', sa.Column('cliente_telefone', sa.String(length=50), nullable=True))
    op.add_column('faturas', sa.Column('cliente_endereco', sa.String(length=500), nullable=True))

    op.create_index('ix_faturas_cliente_nome', 'faturas', ['cliente_nome'], unique=False)

def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index('ix_faturas_cliente_nome', table_name='faturas')
    op.drop_column('faturas', 'cliente_endereco')
    op.drop_column('faturas', 'cliente_telefone')
    op.drop_column('faturas', 'cliente_email')
    op.drop_column('faturas', 'cliente_nif')
    op.drop_column('faturas', 'cliente_nome')
    op.alter_column('faturas', 'cliente_id',
                    existing_type=postgresql.UUID(as_uuid=True),
                    nullable=False)
