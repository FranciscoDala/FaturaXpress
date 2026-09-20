import logging
import traceback
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from app.db.base import Base
from app.db.database import engine
from app.modules.auth.router import router as auth_router
from app.modules.clients.router import router as cliente_router
from app.modules.products.router import router as produto_router
from app.modules.fatura.router import router as fatura_router
from app.modules.realtime.router import router as realtime_router
from app.modules.assinatura.router import router as assinatura_router
from app.modules.areas.router import router as areas_router
from app.modules.funcionarios.router import router as funcionarios_router
from app.modules.funcionarios.router import rh_router as rh_ponto_router

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)

def import_all_models():
    try:
        import app.modules.auth.models
        import app.modules.clients.models
        import app.modules.products.models
        import app.modules.fatura.models
        import app.modules.assinatura.models
        import app.modules.areas.models
        import app.modules.funcionarios.models
        logger.info(f"Models: {list(Base.metadata.tables.keys())}")
    except Exception as e:
        logger.error(f"Erro import models: {e}\n{traceback.format_exc()}")

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("FaturaXpress API a iniciar...")
    import_all_models()
    yield
    try:
        await engine.dispose()
    except Exception:
        pass
    logger.info("API encerrada")

app = FastAPI(title="FaturaXpress API", version="1.0.0", lifespan=lifespan, docs_url="/docs", redoc_url=None)

# BLINDAGEM: CORS fechado + headers de segurança
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://faturaxpress.onrender.com",
        "http://localhost:5173",
        "http://localhost:3000",
    ],
    allow_origin_regex=r"https://.*\.onrender\.com",
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type"],
)

@app.middleware("http")
async def security_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    return response

# Todas as rotas com /api
app.include_router(auth_router, prefix="/api")
app.include_router(cliente_router, prefix="/api")
app.include_router(produto_router, prefix="/api")
app.include_router(fatura_router, prefix="/api")
app.include_router(realtime_router, prefix="/api")
app.include_router(assinatura_router, prefix="/api")
app.include_router(areas_router, prefix="/api")
app.include_router(funcionarios_router, prefix="/api")
app.include_router(rh_ponto_router, prefix="/api")

@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception):
    logger.error(f"Erro 500 em {request.url}: {exc}\n{traceback.format_exc()}")
    # BLINDAGEM: não vaza stack trace
    return JSONResponse(status_code=500, content={"detail": "Erro interno, tente novamente"})

@app.get("/")
async def root():
    return {"status": "ok", "docs": "/docs"}

@app.get("/health")
@app.get("/api/health")
async def health():
    return {"status": "ok"}
