from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from app.core.config import settings

# Se sua DATABASE_URL tiver +asyncpg, tira. Ex: postgresql://user:pass@host/db
DATABASE_URL = settings.DATABASE_URL.replace("+asyncpg", "")

engine = create_engine(DATABASE_URL, pool_pre_ping=True)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
