from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import HTMLResponse, Response
from sqlalchemy.orm import Session
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
import uuid
from typing import List
from app.db.session import get_db
from app.core.security import get_current_company_id
from app.modules.documentos.schemas import ModeloDocumentoCreate, ModeloDocumentoUpdate, GerarDocumentoRequest, ModeloDocumentoResponse, DocumentoGeradoResponse
from app.modules.documentos import service as doc_service
from app.modules.documentos.models import DocumentoGerado
from app.modules.documentos.seed import seed_modelos

router = APIRouter(prefix="/documentos", tags=["Documentos"])

# ===== SEED MANUAL (chama uma vez se precisar) =====
@router.post("/seed-modelos")
async def seed_endpoint(
    db: AsyncSession = Depends(get_db),
    company_id: uuid.UUID = Depends(get_current_company_id)
):
    # seed_modelos é sync, então fazemos wrapper
    # pega session sync temporária
    from app.db.session import SessionLocal
    sync_db = SessionLocal()
    try:
        seed_modelos(sync_db, company_id)
    finally:
        sync_db.close()
    return {"ok": True, "msg": "Modelos padrão garantidos"}

@router.get("/modelos", response_model=List[ModeloDocumentoResponse])
async def listar_modelos(db: AsyncSession = Depends(get_db), company_id: uuid.UUID = Depends(get_current_company_id)):
    # mantém teu service sync se ele ainda for sync
    # se for async, troca
    from app.db.session import SessionLocal
    sync_db = SessionLocal()
    try:
        result = doc_service.listar_modelos(sync_db, company_id)
    finally:
        sync_db.close()
    return result

@router.post("/modelos", response_model=ModeloDocumentoResponse, status_code=201)
async def criar_modelo(dados: ModeloDocumentoCreate, db: AsyncSession = Depends(get_db), company_id: uuid.UUID = Depends(get_current_company_id)):
    from app.db.session import SessionLocal
    sync_db = SessionLocal()
    try:
        result = doc_service.criar_modelo(sync_db, company_id, dados.model_dump())
    finally:
        sync_db.close()
    return result

@router.get("/modelos/{modelo_id}", response_model=ModeloDocumentoResponse)
async def obter_modelo(modelo_id: uuid.UUID, db: AsyncSession = Depends(get_db), company_id: uuid.UUID = Depends(get_current_company_id)):
    from app.db.session import SessionLocal
    sync_db = SessionLocal()
    try:
        m = doc_service.obter_modelo(sync_db, company_id, modelo_id)
    finally:
        sync_db.close()
    if not m:
        raise HTTPException(404, "Modelo não encontrado")
    return m

@router.put("/modelos/{modelo_id}", response_model=ModeloDocumentoResponse)
async def atualizar_modelo(modelo_id: uuid.UUID, dados: ModeloDocumentoUpdate, db: AsyncSession = Depends(get_db), company_id: uuid.UUID = Depends(get_current_company_id)):
    from app.db.session import SessionLocal
    sync_db = SessionLocal()
    try:
        result = doc_service.atualizar_modelo(sync_db, company_id, modelo_id, dados.model_dump(exclude_unset=True))
    finally:
        sync_db.close()
    return result

@router.post("/gerar", response_model=DocumentoGeradoResponse)
async def gerar_documento(req: GerarDocumentoRequest, db: AsyncSession = Depends(get_db), company_id: uuid.UUID = Depends(get_current_company_id)):
    from app.db.session import SessionLocal
    sync_db = SessionLocal()
    try:
        doc = doc_service.gerar_documento(sync_db, company_id, req.funcionario_id, req.modelo_id, extras=req.variaveis_extras)
    finally:
        sync_db.close()
    return doc

@router.get("/funcionario/{funcionario_id}", response_model=List[DocumentoGeradoResponse])
async def listar_do_funcionario(funcionario_id: uuid.UUID, db: AsyncSession = Depends(get_db), company_id: uuid.UUID = Depends(get_current_company_id)):
    result = await db.execute(
        select(DocumentoGerado).where(
            DocumentoGerado.company_id == company_id,
            DocumentoGerado.funcionario_id == funcionario_id
        ).order_by(DocumentoGerado.created_at.desc())
    )
    return result.scalars().all()

# ===== NOVAS ROTAS DE VISUALIZAÇÃO =====
@router.get("/codigo/{codigo_verificacao}")
async def obter_por_codigo(codigo_verificacao: str, db: AsyncSession = Depends(get_db), company_id: uuid.UUID = Depends(get_current_company_id)):
    result = await db.execute(
        select(DocumentoGerado).where(
            DocumentoGerado.codigo_verificacao == codigo_verificacao,
            DocumentoGerado.company_id == company_id
        )
    )
    doc = result.scalar_one_or_none()
    if not doc:
        raise HTTPException(404, "Documento não encontrado")
    return {"id": str(doc.id), "html_final": doc.conteudo_html_final, "codigo": doc.codigo_verificacao, "nome_arquivo": doc.nome_arquivo}

@router.get("/{documento_id}/preview", response_class=HTMLResponse)
async def preview_documento(documento_id: uuid.UUID, db: AsyncSession = Depends(get_db), company_id: uuid.UUID = Depends(get_current_company_id)):
    result = await db.execute(
        select(DocumentoGerado).where(
            DocumentoGerado.id == documento_id,
            DocumentoGerado.company_id == company_id
        )
    )
    doc = result.scalar_one_or_none()
    if not doc:
        raise HTTPException(404, "Documento não encontrado")
    return HTMLResponse(content=doc.conteudo_html_final)

@router.get("/{documento_id}/pdf")
async def pdf_documento(documento_id: uuid.UUID, db: AsyncSession = Depends(get_db), company_id: uuid.UUID = Depends(get_current_company_id)):
    result = await db.execute(
        select(DocumentoGerado).where(
            DocumentoGerado.id == documento_id,
            DocumentoGerado.company_id == company_id
        )
    )
    doc = result.scalar_one_or_none()
    if not doc:
        raise HTTPException(404, "Documento não encontrado")

    try:
        from weasyprint import HTML
        pdf_bytes = HTML(string=doc.conteudo_html_final).write_pdf()
        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={"Content-Disposition": f"inline; filename={doc.nome_arquivo}"}
        )
    except Exception as e:
        # fallback se weasyprint não estiver instalado - retorna HTML pra imprimir
        print(f"[PDF] Erro weasyprint: {e} - retornando HTML")
        return HTMLResponse(content=doc.conteudo_html_final)

@router.get("/{documento_id}")
async def obter_documento(documento_id: uuid.UUID, db: AsyncSession = Depends(get_db), company_id: uuid.UUID = Depends(get_current_company_id)):
    result = await db.execute(
        select(DocumentoGerado).where(
            DocumentoGerado.id == documento_id,
            DocumentoGerado.company_id == company_id
        )
    )
    doc = result.scalar_one_or_none()
    if not doc:
        raise HTTPException(404, "Documento não encontrado")
    return {"id": str(doc.id), "html_final": doc.conteudo_html_final, "codigo": doc.codigo_verificacao, "nome_arquivo": doc.nome_arquivo}
