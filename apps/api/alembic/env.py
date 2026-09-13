import asyncio
import os
import sys
from logging.config import fileConfig

from sqlalchemy import pool
from sqlalchemy.engine import Connection
from sqlalchemy.ext.asyncio import async_engine_from_config

from alembic import context

# 1. ADICIONA A PASTA RAIZ NO PATH PRA ACHAR O "app"
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

# 2. IMPORTA O BASE E AS CONFIGS DO TEU PROJETO
from app.core.config import settings
from app.db.database import Base

# this is the Alembic Config object
config = context.config

# Setup logging
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# 3. COLOCA O METADATA DOS TEUS MODELS AQUI
target_metadata = Base.metadata

# 4. PEGA A URL DO .env / settings e não do .ini
config.set_main_option("sqlalchemy.url", settings.DATABASE_URL)

def run_migrations_offline() -> None:
    """Run migrations in 'offline' mode."""
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        compare_type=True, # <- pra detectar mudança de tipo de coluna
    )

    with context.begin_transaction():
        context.run_migrations()

def do_run_migrations(connection: Connection) -> None:
    context.configure(connection=connection, target_metadata=target_metadata, compare_type=True)

    with context.begin_transaction():
        context.run_migrations()

async def run_migrations_online() -> None:
    """Run migrations in 'online' mode com asyncpg"""
    connectable = async_engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    async with connectable.connect() as connection:
        await connection.run_sync(do_run_migrations)

    await connectable.dispose()

if context.is_offline_mode():
    run_migrations_offline()
else:
    asyncio.run(run_migrations_online())
