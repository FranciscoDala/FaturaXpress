from typing import AsyncGenerator
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.orm import declarative_base
from urllib.parse import urlparse, parse_qs, urlunparse, urlencode
from pathlib import Path
from dotenv import load_dotenv
import os

# Carrega .env da raiz do projeto
ROOT_DIR = Path(__file__).resolve().parent.parent
load_dotenv(dotenv_path=ROOT_DIR / '.env')

DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    raise ValueError("DATABASE_URL não está definida nas variáveis de ambiente")

# 1. Garante que é asyncpg
if DATABASE_URL.startswith("postgresql://"):
    DATABASE_URL = DATABASE_URL.replace("postgresql://", "postgresql+asyncpg://", 1)

# 2. Limpa ssl/sslmode da URL porque vamos passar no connect_args
parsed = urlparse(DATABASE_URL)
query = parse_qs(parsed.query)
query.pop("sslmode", None)
query.pop("ssl", None)
clean_url = urlunparse((
    parsed.scheme, parsed.netloc, parsed.path,
    parsed.params, urlencode(query, doseq=True), parsed.fragment
))

# 3. Config de SSL: só ativa em produção/Render
connect_args = {}
if os.getenv("ENV") == "prod" or "render.com" in os.getenv("DATABASE_URL", ""):
    connect_args["ssl"] = "require" 

engine = create_async_engine(
    clean_url,
    echo=False,
    pool_pre_ping=True,
    connect_args=connect_args
)

AsyncSessionLocal = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
Base = declarative_base()

async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with AsyncSessionLocal() as session:
        try:
            yield session
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()
