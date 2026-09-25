from fastapi import APIRouter, Depends, HTTPException, Query, Request
from fastapi.responses import HTMLResponse, Response
from sqlalchemy.orm import Session
from sqlalchemy import select
import uuid
from typing import List, Optional
from app.db.session import get_db
from app.core.security import get_current_company_and_funcionario, get_current_company_id
from app.core.jwt import decode_access_token
from app.modules.documentos.schemas import ModeloDocumentoCreate, ModeloDocumentoUpdate, GerarDocumentoRequest, ModeloDocumentoResponse, DocumentoGeradoResponse
from app.modules.documentos import service as doc_service
from app.modules.documentos.models import DocumentoGerado
from app.modules.documentos.seed import seed_modelos

router = APIRouter(prefix="/documentos", tags=["Documentos"])

def get_company_from_request(request: Request, token_qs: Optional[str] = Query(None, alias="token"), auth = Depends(get_current_company_and_funcionario)):
    if token_qs:
        try:
            payload = decode_access_token(token_qs)
            company_id = uuid.UUID(payload.get("company_id"))
            return {"company_id": company_id, "payload": payload}
        except Exception:
            raise HTTPException(401, "Token inválido")
    return auth

def ensure_utf8_html(html: str) -> str:
    if not html: return html
    if "<meta charset" not in html.lower():
        if "<head>" in html.lower():
            html = html.replace("<head>", '<head><meta charset="UTF-8">', 1)
        else:
            html = f'<!DOCTYPE html><html><head><meta charset="UTF-8"></head><body>{html}</body></html>'
    return html

@router.post("/seed-modelos")
def seed_endpoint(db: Session = Depends(get_db), company_id: uuid.UUID = Depends(get_current_company_id)):
    seed_modelos(db, company_id)
    return {"ok": True}

@router.get("/modelos/by-tipo/{tipo}", response_model=ModeloDocumentoResponse)
def route_obter_por_tipo(tipo: str, db: Session = Depends(get_db), company_id: uuid.UUID = Depends(get_current_company_id)):
    return doc_service.obter_ou_criar_por_tipo(db, company_id, tipo)

@router.get("/modelos", response_model=List[ModeloDocumentoResponse])
def route_listar_modelos(db: Session = Depends(get_db), company_id: uuid.UUID = Depends(get_current_company_id)):
    return doc_service.listar_todos_modelos(db, company_id)

@router.post("/modelos", response_model=ModeloDocumentoResponse, status_code=201)
def route_criar_modelo(dados: ModeloDocumentoCreate, db: Session = Depends(get_db), company_id: uuid.UUID = Depends(get_current_company_id)):
    return doc_service.criar_modelo(db, company_id, dados.model_dump())

@router.get("/modelos/{modelo_id}", response_model=ModeloDocumentoResponse)
def route_obter_modelo(modelo_id: uuid.UUID, db: Session = Depends(get_db), company_id: uuid.UUID = Depends(get_current_company_id)):
    m = doc_service.obter_modelo(db, company_id, modelo_id)
    if not m: raise HTTPException(404, "Modelo não encontrado")
    return m

@router.put("/modelos/{modelo_id}", response_model=ModeloDocumentoResponse)
def route_atualizar_modelo(modelo_id: uuid.UUID, dados: ModeloDocumentoUpdate, db: Session = Depends(get_db), company_id: uuid.UUID = Depends(get_current_company_id)):
    return doc_service.atualizar_modelo(db, company_id, modelo_id, dados.model_dump(exclude_unset=True))

@router.post("/gerar", response_model=DocumentoGeradoResponse)
def route_gerar_documento(req: GerarDocumentoRequest, db: Session = Depends(get_db), company_id: uuid.UUID = Depends(get_current_company_id)):
    return doc_service.gerar_documento(db, company_id, req.funcionario_id, req.modelo_id, extras=req.variaveis_extras)

@router.get("/funcionario/{funcionario_id}", response_model=List[DocumentoGeradoResponse])
def route_listar_do_funcionario(funcionario_id: uuid.UUID, db: Session = Depends(get_db), auth = Depends(get_current_company_and_funcionario)):
    company_id = auth["company_id"]
    result = db.execute(select(DocumentoGerado).where(DocumentoGerado.company_id == company_id, DocumentoGerado.funcionario_id == funcionario_id).order_by(DocumentoGerado.created_at.desc()))
    return result.scalars().all()

@router.get("/{documento_id}/preview", response_class=HTMLResponse)
def route_preview_documento(documento_id: uuid.UUID, request: Request, token: Optional[str] = Query(None), db: Session = Depends(get_db), auth = Depends(get_company_from_request)):
    company_id = auth["company_id"]
    result = db.execute(select(DocumentoGerado).where(DocumentoGerado.id == documento_id, DocumentoGerado.company_id == company_id))
    doc = result.scalar_one_or_none()
    if not doc: raise HTTPException(404, "Documento não encontrado")
    return HTMLResponse(content=ensure_utf8_html(doc.conteudo_html_final), headers={"Content-Type": "text/html; charset=utf-8"})

@router.get("/{documento_id}/pdf")
def route_pdf_documento(documento_id: uuid.UUID, request: Request, token: Optional[str] = Query(None), db: Session = Depends(get_db), auth = Depends(get_company_from_request)):
    from app.modules.auth.models import Company
    company_id = auth["company_id"]
    result = db.execute(select(DocumentoGerado).where(DocumentoGerado.id == documento_id, DocumentoGerado.company_id == company_id))
    doc = result.scalar_one_or_none()
    if not doc: raise HTTPException(404, "Documento não encontrado")
    empresa = db.query(Company).filter(Company.id == company_id).first()
    from app.modules.documentos.service import _gerar_pdf_reportlab
    pdf_bytes = _gerar_pdf_reportlab(doc, empresa)
    filename = (doc.nome_arquivo or f"contrato-{doc.codigo_verificacao}").replace(" ", "_") + ".pdf"
    return Response(content=pdf_bytes, media_type="application/pdf", headers={"Content-Disposition": f"inline; filename=\"{filename}\""})
