from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import List
import json

def parse_cors(v: str) -> List[str]:
    if not v:
        return []
    v = v.strip()
    if v.startswith("["):
        return json.loads(v)
    return [i.strip() for i in v.split(",") if i.strip()]

class Settings(BaseSettings):
    # SERVER
    PORT: int = 10000
    BASE_URL: str = "https://faturaxpress-backend.onrender.com" # <- tirei o https:// duplicado
    ALLOWED_ORIGINS: str = "http://localhost:3000,http://127.0.0.1:3000,https://faturaxpress.onrender.com" # <- tirei o https:// duplicado

    @property
    def ALLOWED_ORIGINS_LIST(self) -> List[str]:
        return parse_cors(self.ALLOWED_ORIGINS)

    # DATABASE - Neon FATURAEXPRESS
    DATABASE_URL: str = "" # <- agora vem do.env

    # AUTH - bate com teu.env
    SECRET_KEY: str = "" # <- era JWT_SECRET
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 10080

    # CLOUDINARY
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

print(f"DEBUG CONFIG LOADED: DB={settings.DATABASE_URL[:40]}...")
print(f"DEBUG CORS: {settings.ALLOWED_ORIGINS_LIST}")
print(f"DEBUG BASE_URL: {settings.BASE_URL}")
print(f"DEBUG CLOUDINARY: {settings.CLOUDINARY_CLOUD_NAME}")
