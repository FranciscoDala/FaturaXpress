import logging
import traceback
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from app.db.base import Base
from app.db.database import engine
from app.db.session import SessionLocal
from app.modules.auth.router import router as auth_router
from app.modules.clients.router import router as cliente_router
from app.modules.products.router import router as produto_router
from app.modules.fatura.router import router as fatura_router
from app.modules.realtime.router import router as realtime_router
from app.modules.assinatura.router import router as assinatura_router
from app.modules.areas.router import router as areas_router
from app.modules.funcionarios.router import router as funcionarios_router
from app.modules.funcionarios.router import rh_router as rh_ponto_router
from app.modules.funcionarios.router import upload_router as upload_falta_router

# IMPORTA DOCUMENTOS
try:
    from app.modules.documentos.router import router as documentos_router
    HAS_DOCS = True
except ImportError as e:
    documentos_router = None
    HAS_DOCS = False
    logging.warning(f"Router documentos não encontrado: {e}")

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
        import app.modules.documentos.models
        logger.info(f"Models: {list(Base.metadata.tables.keys())}")
    except Exception as e:
        logger.error(f"Erro import models: {e}\n{traceback.format_exc()}")

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("FaturaXpress API a iniciar...")
    import_all_models()

    # SEED AUTOMATICO DOS MODELOS DE CONTRATO
    try:
        from app.modules.documentos.seed import seed_modelos
        from app.modules.auth.models import Company
        db = SessionLocal()
        try:
            empresas = db.query(Company).all()
            for emp in empresas:
                try:
                    seed_modelos(db, emp.id)
                except Exception as se:
                    logger.error(f"Erro seed empresa {emp.id}: {se}")
            logger.info(f"Seed de modelos executado para {len(empresas)} empresas")
        finally:
            db.close()
    except Exception as e:
        logger.error(f"Falha no seed de modelos: {e}\n{traceback.format_exc()}")

    yield
    try:
        if hasattr(engine, 'dispose'):
            await engine.dispose()
    except Exception:
        pass
    logger.info("API encerrada")

app = FastAPI(title="FaturaXpress API", version="1.0.0", lifespan=lifespan, docs_url="/docs", redoc_url=None)

# 1. SECURITY HEADERS - FICA POR DENTRO
@app.middleware("http")
async def security_headers(request: Request, call_next):
    try:
        response = await call_next(request)
    except Exception as e:
        # Deixa o exception_handler tratar, não esconde o erro
        raise e

    # Não bloqueia iframe só no anexo
    if "/anexo" in request.url.path or "/preview" in request.url.path:
        response.headers["X-Frame-Options"] = "ALLOWALL"
        response.headers["Content-Security-Policy"] = "frame-ancestors *"
    else:
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
    return response

# 2. CORS - TEM QUE SER O ULTIMO add_middleware (fica por FORA)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://faturaxpress.onrender.com",
        "http://localhost:5173",
        "http://localhost:3000",
    ],
    allow_origin_regex=r"https://.*\.onrender\.com",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
)

# 3. ROUTERS
app.include_router(auth_router, prefix="/api")
app.include_router(cliente_router, prefix="/api")
app.include_router(produto_router, prefix="/api")
app.include_router(fatura_router, prefix="/api")
app.include_router(realtime_router, prefix="/api")
app.include_router(assinatura_router, prefix="/api")
app.include_router(areas_router, prefix="/api")
app.include_router(funcionarios_router, prefix="/api")
app.include_router(rh_ponto_router, prefix="/api")
app.include_router(upload_falta_router, prefix="/api")

if HAS_DOCS and documentos_router:
    app.include_router(documentos_router, prefix="/api")
    logger.info("Router documentos incluido")
else:
    logger.warning("Router documentos NAO incluido")

@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception):
    logger.error(f"Erro 500 em {request.url}: {exc}\n{traceback.format_exc()}")
    origin = request.headers.get("origin", "https://faturaxpress.onrender.com")
    return JSONResponse(
        status_code=500,
        content={"detail": "Erro interno, tente novamente", "error": str(exc)[:500]},
        headers={
            "Access-Control-Allow-Origin": origin,
            "Access-Control-Allow-Credentials": "true",
            "Access-Control-Allow-Methods": "*",
            "Access-Control-Allow-Headers": "*",
        }
    )

@app.get("/")
async def root():
    return {"status": "ok", "docs": "/docs", "health": "/api/health", "has_docs": HAS_DOCS}

@app.get("/health")
@app.get("/api/health")
async def health():
    return {"status": "ok", "has_docs": HAS_DOCS}
