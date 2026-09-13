from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from apps.api.app.core.config import settings # <-- pega do teu config

engine = create_engine(settings.DATABASE_URL) # <-- usa o settings

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
