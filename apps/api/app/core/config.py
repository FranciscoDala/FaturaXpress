from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import List
import os

def parse_cors(v: str) -> List[str]:
    if not v:
        return []
    v = v.strip()
    if v.startswith("["):
        import json
        return json.loads(v)
    return [i.strip() for i in v.split(",") if i.strip()]

class Settings(BaseSettings):
    # SERVER
    PORT: int = 10000
    BASE_URL: str = "https://faturaxpress-backend.onrender.com"
    ALLOWED_ORIGINS: str = "http://localhost:3000,http://127.0.0.1:3000,https://faturaxpress.onrender.com"

    @property
    def ALLOWED_ORIGINS_LIST(self) -> List[str]:
        return parse_cors(self.ALLOWED_ORIGINS)

    # DATABASE - Neon SIGE
    DATABASE_URL: str = "postgresql+psycopg2://neondb_owner:npg_Oky0paVe1RuJ@ep-raspy-field-awxovdt0-pooler.c-12.us-east-1.aws.neon.tech/faturaxpress-db?ssl=true"


    # AUTH
    JWT_SECRET: str = "faturaxpress-secret-2026" # 👈 muda pra não conflitar com stockbot
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 10080

    # CLOUDINARY - MESMAS DO STOCKBOT
    CLOUDINARY_CLOUD_NAME: str = ""
    CLOUDINARY_API_KEY: str = ""
    CLOUDINARY_API_SECRET: str = ""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
        case_sensitive=False
    )

settings = Settings()

print(f"DEBUG CONFIG LOADED: DB={settings.DATABASE_URL[:30]}...")
print(f"DEBUG CORS: {settings.ALLOWED_ORIGINS_LIST}")
print(f"DEBUG BASE_URL: {settings.BASE_URL}")
print(f"DEBUG CLOUDINARY: {settings.CLOUDINARY_CLOUD_NAME}") # 👈 pra debugar
