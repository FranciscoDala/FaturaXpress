import logging
import traceback
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy import text

from app.core.config import settings
from app.db.base import Base
from app.db.database import engine

# IMPORTA OS ROUTERS
from app.modules.auth.router import router as auth_router
from app.modules.clients.router import router as cliente_router
from app.modules.products.router import router as produto_router
from apps.api.app.modules.fatura.router import router as fatura_router

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)

def import_all_models():
    logger.info("Forçando import de todos os models...")
    import app.modules.auth.models
    import app.modules.clients.models
    import app.modules.products.models
    import app.modules.fatura.models  # <--- NOVO: importante pro Base.metadata
    tabelas = sorted(list(Base.metadata.tables.keys()))
    logger.info(f"Models registrados: {', '.join(tabelas)}")

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("FaturaXpress API a iniciar...")
    import_all_models()
    async with engine.begin() as conn:
        await conn.execute(text("SELECT 1"))
        logger.info("Conexão Neon OK")
    yield
    await engine.dispose()

app = FastAPI(title="FaturaXpress API", version="1.0.0", lifespan=lifespan)

allowed_origins = ["https://faturaxpress.onrender.com", "http://localhost:5173", "http://localhost:3000"]
app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_origin_regex=r"https://.*\.onrender\.com",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"]
)

app.include_router(auth_router, prefix="/api")
app.include_router(cliente_router, prefix="/api")
app.include_router(produto_router, prefix="/api")
app.include_router(fatura_router, prefix="/api")  # <--- NOVO

@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception):
    logger.error(f"Erro 500 em {request.url}: {exc}\n{traceback.format_exc()}")
    return JSONResponse(status_code=500, content={"detail": "Erro interno"})

@app.get("/health")
async def health():
    return {"status": "ok"}
