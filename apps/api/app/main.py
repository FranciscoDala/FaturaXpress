import logging
import traceback
import os
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy import text

from app.core.config import settings
from app.cloudinary_service import upload_to_cloudinary # <- CORRIGIDO AQUI
from app.db.database import Base, engine

# IMPORTA O ROUTER CORRETO DA NOVA ESTRUTURA
from app.modules.auth.router import router as auth_router

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)

def import_all_models():
    logger.info("Forçando import de todos os models...")
    from app.modules.auth import models # <- importa pra registrar Company e User
    tabelas = sorted(list(Base.metadata.tables.keys()))
    logger.info(f"Models registrados: {', '.join(tabelas)}")
    logger.info(f"Total: {len(tabelas)} tabelas mapeadas.")

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("SIGE API a iniciar...")
    logger.info(f"Cloudinary configurado: {settings.CLOUDINARY_CLOUD_NAME}")
    import_all_models() # <- só registra os models no Base.metadata

    # TESTE DE CONEXÃO COM NEON. ALEMBIC QUE CRIA AS TABELAS
    async with engine.begin() as conn:
        await conn.execute(text("SELECT 1"))
        logger.info("Conexão com Neon OK ✅. Use 'alembic upgrade head' para criar as tabelas.")

    yield

    await engine.dispose()
    logger.info("API a desligar...")

app = FastAPI(
    title="SIGE API",
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

# CORS
allowed_origins = [
    "https://sige-ao.onrender.com",
    "http://localhost:5173",
    "http://localhost:3000",
]

extra_origins = getattr(settings, "ALLOWED_ORIGINS_LIST", [])
if isinstance(extra_origins, list):
    allowed_origins.extend(extra_origins)

allowed_origins = list(dict.fromkeys(allowed_origins))

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_origin_regex=r"https://.*\.onrender\.com",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
)

logger.info(f"CORS liberado para: {allowed_origins}")

# REGISTRAR O ROUTER
app.include_router(auth_router, prefix="/api")

@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception):
    logger.error(
        f"Erro 500 não tratado na rota {request.url}: {exc}\n{traceback.format_exc()}"
    )
    return JSONResponse(
        status_code=500,
        content={"detail": "Erro interno do servidor"},
    )

@app.get("/health")
async def health():
    return {
        "status": "ok",
        "env": os.getenv("ENV", "dev"),
        "cloudinary": settings.CLOUDINARY_CLOUD_NAME
    }
