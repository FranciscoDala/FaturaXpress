"""add fatura constraints hash

Revision ID: 60e2ac469d09
Revises: 9d72540890e4
Create Date: 2026-09-16 00:22:26.274734

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = '60e2ac469d09'
down_revision: Union[str, Sequence[str], None] = '9d72540890e4'
branch_labels = None
depends_on = None

def upgrade() -> None:
    # fatura_itens
    op.execute("ALTER TABLE fatura_itens DROP CONSTRAINT IF EXISTS fatura_itens_produto_id_fkey")
    op.execute("ALTER TABLE fatura_itens DROP CONSTRAINT IF EXISTS fk_fatura_itens_produto_set_null")
    op.execute("ALTER TABLE fatura_itens ADD CONSTRAINT fk_fatura_itens_produto_set_null FOREIGN KEY (produto_id) REFERENCES produtos(id) ON DELETE SET NULL")

    # faturas colunas
    op.execute("ALTER TABLE faturas ADD COLUMN IF NOT EXISTS hash_agt_anterior VARCHAR(500)")
    op.execute("ALTER TABLE faturas ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now()")

    op.execute("ALTER TABLE faturas DROP CONSTRAINT IF EXISTS faturas_numero_fatura_key")
    op.execute("CREATE INDEX IF NOT EXISTS ix_faturas_company_status ON faturas (company_id, status)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_faturas_company_tipo_ano ON faturas (company_id, tipo_documento, created_at)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_faturas_numero_fatura ON faturas (numero_fatura)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_faturas_numero_proforma ON faturas (numero_proforma)")

    op.execute("ALTER TABLE faturas DROP CONSTRAINT IF EXISTS uq_company_numero_fatura")
    op.execute("ALTER TABLE faturas DROP CONSTRAINT IF EXISTS uq_company_numero_proforma")
    op.execute("ALTER TABLE faturas ADD CONSTRAINT uq_company_numero_fatura UNIQUE (company_id, numero_fatura) DEFERRABLE INITIALLY DEFERRED")
    op.execute("ALTER TABLE faturas ADD CONSTRAINT uq_company_numero_proforma UNIQUE (company_id, numero_proforma) DEFERRABLE INITIALLY DEFERRED")

    op.execute("ALTER TABLE faturas DROP CONSTRAINT IF EXISTS faturas_company_id_fkey")
    op.execute("ALTER TABLE faturas DROP CONSTRAINT IF EXISTS faturas_proforma_origem_id_fkey")
    op.execute("ALTER TABLE faturas DROP CONSTRAINT IF EXISTS faturas_cliente_id_fkey")
    op.execute("ALTER TABLE faturas DROP CONSTRAINT IF EXISTS fk_faturas_cliente_restrict")
    op.execute("ALTER TABLE faturas DROP CONSTRAINT IF EXISTS fk_faturas_company_cascade")
    op.execute("ALTER TABLE faturas DROP CONSTRAINT IF EXISTS fk_faturas_proforma_set_null")

    op.execute("ALTER TABLE faturas ADD CONSTRAINT fk_faturas_cliente_restrict FOREIGN KEY (cliente_id) REFERENCES clientes(id) ON DELETE RESTRICT")
    op.execute("ALTER TABLE faturas ADD CONSTRAINT fk_faturas_company_cascade FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE")
    op.execute("ALTER TABLE faturas ADD CONSTRAINT fk_faturas_proforma_set_null FOREIGN KEY (proforma_origem_id) REFERENCES faturas(id) ON DELETE SET NULL")

def downgrade() -> None:
    op.execute("ALTER TABLE faturas DROP CONSTRAINT IF EXISTS fk_faturas_proforma_set_null")
    op.execute("ALTER TABLE faturas DROP CONSTRAINT IF EXISTS fk_faturas_company_cascade")
    op.execute("ALTER TABLE faturas DROP CONSTRAINT IF EXISTS fk_faturas_cliente_restrict")
    op.execute("ALTER TABLE faturas ADD CONSTRAINT faturas_cliente_id_fkey FOREIGN KEY (cliente_id) REFERENCES clientes(id)")
    op.execute("ALTER TABLE faturas ADD CONSTRAINT faturas_proforma_origem_id_fkey FOREIGN KEY (proforma_origem_id) REFERENCES faturas(id)")
    op.execute("ALTER TABLE faturas ADD CONSTRAINT faturas_company_id_fkey FOREIGN KEY (company_id) REFERENCES companies(id)")
    op.execute("ALTER TABLE faturas DROP CONSTRAINT IF EXISTS uq_company_numero_proforma")
    op.execute("ALTER TABLE faturas DROP CONSTRAINT IF EXISTS uq_company_numero_fatura")
    op.execute("DROP INDEX IF EXISTS ix_faturas_numero_proforma")
    op.execute("DROP INDEX IF EXISTS ix_faturas_numero_fatura")
    op.execute("DROP INDEX IF EXISTS ix_faturas_company_tipo_ano")
    op.execute("DROP INDEX IF EXISTS ix_faturas_company_status")
    op.execute("ALTER TABLE faturas ADD CONSTRAINT faturas_numero_fatura_key UNIQUE (numero_fatura)")
    op.execute("ALTER TABLE faturas DROP COLUMN IF EXISTS updated_at")
    op.execute("ALTER TABLE faturas DROP COLUMN IF EXISTS hash_agt_anterior")
    op.execute("ALTER TABLE fatura_itens DROP CONSTRAINT IF EXISTS fk_fatura_itens_produto_set_null")
    op.execute("ALTER TABLE fatura_itens ADD CONSTRAINT fatura_itens_produto_id_fkey FOREIGN KEY (produto_id) REFERENCES produtos(id)")
