"""add RH workflow values to statuspedido enum

Revision ID: 8f3c1d2a7b90
Revises: 265a4f156395
Create Date: 2026-09-23 16:25:00.000000
"""

from typing import Sequence, Union
from alembic import op

revision: str = "8f3c1d2a7b90"
down_revision: Union[str, Sequence[str], None] = "265a4f156395"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

def upgrade() -> None:
    op.execute("COMMIT")
    op.execute("ALTER TYPE statuspedido ADD VALUE IF NOT EXISTS 'pendente_justificacao'")
    op.execute("ALTER TYPE statuspedido ADD VALUE IF NOT EXISTS 'aguardando_admin'")
    op.execute("ALTER TYPE statuspedido ADD VALUE IF NOT EXISTS 'encaminhado_admin'")
    op.execute("ALTER TYPE statuspedido ADD VALUE IF NOT EXISTS 'justificado'")
    op.execute("ALTER TYPE statuspedido ADD VALUE IF NOT EXISTS 'aprovada'")
    op.execute("ALTER TYPE statuspedido ADD VALUE IF NOT EXISTS 'rejeitada'")

def downgrade() -> None:
    pass
