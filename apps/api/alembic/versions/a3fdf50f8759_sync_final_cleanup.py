"""sync final cleanup

Revision ID: a3fdf50f8759
Revises: 60e2ac469d09
Create Date: 2026-09-19 21:13:42.445376
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = 'a3fdf50f8759'
down_revision: Union[str, Sequence[str], None] = '60e2ac469d09'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

def upgrade() -> None:
    op.execute("ALTER TABLE areas DROP COLUMN IF EXISTS codigo")

    op.execute("CREATE INDEX IF NOT EXISTS ix_atividades_log_acao ON atividades_log (acao)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_atividades_log_area_id ON atividades_log (area_id)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_atividades_log_company_id ON atividades_log (company_id)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_atividades_log_created_at ON atividades_log (created_at)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_atividades_log_entidade ON atividades_log (entidade)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_atividades_log_entidade_id ON atividades_log (entidade_id)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_atividades_log_usuario_id ON atividades_log (usuario_id)")

    op.execute("ALTER TABLE clientes DROP CONSTRAINT IF EXISTS uq_cliente_nif_company")
    op.execute("CREATE INDEX IF NOT EXISTS ix_clientes_company_nif ON clientes (company_id, nif)")

    op.execute("CREATE INDEX IF NOT EXISTS ix_faturas_area ON faturas (company_id, area_id)")

    # Limpa nulos antes de colocar NOT NULL pra não quebrar
    op.execute("UPDATE funcionarios SET email = 'sem_email@faturaxpress.ao' WHERE email IS NULL")
    op.execute("UPDATE funcionarios SET senha_hash = 'TEMP_HASH' WHERE senha_hash IS NULL")
    op.execute("UPDATE funcionarios SET cargo = 'vendedor' WHERE cargo IS NULL")

    op.execute("ALTER TABLE funcionarios ALTER COLUMN email SET NOT NULL")
    op.execute("ALTER TABLE funcionarios ALTER COLUMN senha_hash SET NOT NULL")
    op.execute("ALTER TABLE funcionarios ALTER COLUMN cargo SET NOT NULL")

    op.execute("CREATE INDEX IF NOT EXISTS ix_funcionarios_area_principal_id ON funcionarios (area_principal_id)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_funcionarios_email ON funcionarios (email)")
    op.execute("ALTER TABLE funcionarios DROP COLUMN IF EXISTS user_id")

def downgrade() -> None:
    op.execute("ALTER TABLE funcionarios ADD COLUMN IF NOT EXISTS user_id UUID")
    op.execute("DROP INDEX IF EXISTS ix_funcionarios_email")
    op.execute("DROP INDEX IF EXISTS ix_funcionarios_area_principal_id")
    op.execute("ALTER TABLE funcionarios ALTER COLUMN cargo DROP NOT NULL")
    op.execute("ALTER TABLE funcionarios ALTER COLUMN senha_hash DROP NOT NULL")
    op.execute("ALTER TABLE funcionarios ALTER COLUMN email DROP NOT NULL")
    op.execute("DROP INDEX IF EXISTS ix_faturas_area")
    op.execute("DROP INDEX IF EXISTS ix_clientes_company_nif")
    op.execute("ALTER TABLE clientes ADD CONSTRAINT uq_cliente_nif_company UNIQUE (company_id, nif)")
    op.execute("DROP INDEX IF EXISTS ix_atividades_log_usuario_id")
    op.execute("DROP INDEX IF EXISTS ix_atividades_log_entidade_id")
    op.execute("DROP INDEX IF EXISTS ix_atividades_log_entidade")
    op.execute("DROP INDEX IF EXISTS ix_atividades_log_created_at")
    op.execute("DROP INDEX IF EXISTS ix_atividades_log_company_id")
    op.execute("DROP INDEX IF EXISTS ix_atividades_log_area_id")
    op.execute("DROP INDEX IF EXISTS ix_atividades_log_acao")
    op.execute("ALTER TABLE areas ADD COLUMN IF NOT EXISTS codigo VARCHAR(20)")
