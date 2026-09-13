from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from app.db.base import Base # <- usa o teu base.py
from app.core.config import settings

engine = create_engine(
    settings.DATABASE_URL, # <- Agora já vem certa do .env
    pool_pre_ping=True,
    connect_args={"sslmode": "require"}
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
