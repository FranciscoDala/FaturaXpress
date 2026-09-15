from typing import AsyncGenerator
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from urllib.parse import urlparse, parse_qs, urlunparse, urlencode
from pathlib import Path
from dotenv import load_dotenv
import os

from app.db.base import Base

ROOT_DIR = Path(__file__).resolve().parent.parent.parent
load_dotenv(dotenv_path=ROOT_DIR / '.env')

DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    raise ValueError("DATABASE_URL não está definida")

if DATABASE_URL.startswith("postgresql://"):
    DATABASE_URL = DATABASE_URL.replace("postgresql://", "postgresql+asyncpg://", 1)

parsed = urlparse(DATABASE_URL)
query = parse_qs(parsed.query)
query.pop("sslmode", None)
query.pop("ssl", None)
clean_url = urlunparse((
    parsed.scheme, parsed.netloc, parsed.path,
    parsed.params, urlencode(query, doseq=True), parsed.fragment
))

engine = create_async_engine(
    clean_url,
    echo=False,
    pool_pre_ping=True,
    connect_args={"ssl": True}
)

AsyncSessionLocal = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

# REMOVIDO: Base = declarative_base() <- era isso que tava quebrando

async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with AsyncSessionLocal() as session:
        try:
            yield session
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()
