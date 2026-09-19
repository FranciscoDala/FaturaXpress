import os
import sys
from logging.config import fileConfig
from sqlalchemy import engine_from_config, pool
from alembic import context

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from app.core.config import settings
from app.db.base import Base

# IMPORTA TODOS OS MODELS - ORDEM IMPORTA
from app.modules.auth.models import Company, User
from app.modules.areas.models import Area  # <- áreas ANTES de funcionários e fatura
from app.modules.clients.models import Cliente
from app.modules.products.models import Produto
from app.modules.funcionarios.models import Funcionario, funcionario_areas
from app.modules.fatura.models import Fatura, FaturaItem
from app.modules.assinatura.models import Plan, Subscription
from app.modules.auditoria.models import AtividadeLog  # <- FALTAVA ESSE

config = context.config

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

target_metadata = Base.metadata

DATABASE_URL = settings.DATABASE_URL.replace("+asyncpg", "")
if "sslmode=" not in DATABASE_URL:
    DATABASE_URL += "&sslmode=require" if "?" in DATABASE_URL else "?sslmode=require"

config.set_main_option("sqlalchemy.url", DATABASE_URL)

def run_migrations_offline() -> None:
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        compare_type=True,
        compare_server_default=True
    )
    with context.begin_transaction():
        context.run_migrations()

def run_migrations_online() -> None:
    connectable = engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )
    with connectable.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
            compare_type=True,
            compare_server_default=True
        )
        with context.begin_transaction():
            context.run_migrations()

if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
