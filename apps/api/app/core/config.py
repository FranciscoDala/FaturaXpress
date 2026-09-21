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
    PORT: int = 10000
    BASE_URL: str = "https://faturaxpress-backend.onrender.com"
    ALLOWED_ORIGINS: str = "http://localhost:3000,http://127.0.0.1:3000,https://faturaxpress.onrender.com"

    @property
    def ALLOWED_ORIGINS_LIST(self) -> List[str]:
        return parse_cors(self.ALLOWED_ORIGINS)

    DATABASE_URL: str = ""
    SECRET_KEY: str = "troca-essa-chave-super-secreta-em-prod-min-32-chars"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60

    CLOUDINARY_CLOUD_NAME: str = ""
    CLOUDINARY_API_KEY: str = ""
    CLOUDINARY_API_SECRET: str = ""

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore", case_sensitive=False)

    def model_post_init(self, __context):
        if len(self.SECRET_KEY) < 32:
            raise ValueError("SECRET_KEY muito curta, mínimo 32 chars")

settings = Settings()
