import asyncio
from logging.config import fileConfig

from sqlalchemy import pool
from sqlalchemy.engine import Connection
from sqlalchemy.ext.asyncio import AsyncEngine, create_async_engine

from alembic import context

# NOSSOS IMPORTS - importante importar os models pra autogenerate ver
from app.core.config import settings
from app.db.database import Base
from app.modules.auth import models  # <- força importar Company e User

# this is the Alembic Config object
config = context.config

# Interpret the config file for Python logging.
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# add your model's MetaData object here for 'autogenerate' support
target_metadata = Base.metadata

# pega a URL direto do settings
config.set_main_option("sqlalchemy.url", settings.DATABASE_URL)

def do_run_migrations(connection: Connection):
    context.configure(
        connection=connection,
        target_metadata=target_metadata,
        compare_type=True,  # detecta mudança de tipo de coluna
        compare_server_default=True,  # detecta default do banco
        render_as_batch=True # <- importante pro SQLite, não atrapalha Postgres
    )

    with context.begin_transaction():
        context.run_migrations()

async def run_migrations_online():
    """Run migrations in 'online' mode com async"""
    connectable = create_async_engine(
        settings.DATABASE_URL,
        poolclass=pool.NullPool,
    )

    async with connectable.connect() as connection:
        await connection.run_sync(do_run_migrations)

    await connectable.dispose()

def run_migrations_offline() -> None:
    """Run migrations in 'offline' mode."""
    url = settings.DATABASE_URL
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        compare_type=True,
    )

    with context.begin_transaction():
        context.run_migrations()

def main():
    if context.is_offline_mode():
        run_migrations_offline()
    else:
        # <- FIX pro Windows: evita "Event loop is closed"
        asyncio.run(run_migrations_online())

main()
