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
    # Se veio por?token= (window.open) decodifica manual
    if token_qs:
        try:
            payload = decode_access_token(token_qs)
            company_id = uuid.UUID(payload.get("company_id"))
            return {"company_id": company_id, "payload": payload}
        except Exception:
            raise HTTPException(401, "Token inválido na URL")
    return auth

def get_company_id_only(auth = Depends(get_company_from_request)):
    return auth["company_id"]

# ===== SEED MANUAL =====
@router.post("/seed-modelos")
def seed_endpoint(
    db: Session = Depends(get_db),
    company_id: uuid.UUID = Depends(get_current_company_id)
):
    try:
        seed_modelos(db, company_id)
    except Exception as e:
        raise HTTPException(500, f"Erro no seed: {e}")
    return {"ok": True, "msg": "Modelos padrão garantidos"}

@router.get("/modelos", response_model=List[ModeloDocumentoResponse])
def listar_modelos(db: Session = Depends(get_db), company_id: uuid.UUID = Depends(get_current_company_id)):
    return doc_service.listar_modelos(db, company_id)

@router.post("/modelos", response_model=ModeloDocumentoResponse, status_code=201)
def criar_modelo(dados: ModeloDocumentoCreate, db: Session = Depends(get_db), company_id: uuid.UUID = Depends(get_current_company_id)):
    return doc_service.criar_modelo(db, company_id, dados.model_dump())

@router.get("/modelos/{modelo_id}", response_model=ModeloDocumentoResponse)
def obter_modelo(modelo_id: uuid.UUID, db: Session = Depends(get_db), company_id: uuid.UUID = Depends(get_current_company_id)):
    m = doc_service.obter_modelo(db, company_id, modelo_id)
    if not m:
        raise HTTPException(404, "Modelo não encontrado")
    return m

@router.put("/modelos/{modelo_id}", response_model=ModeloDocumentoResponse)
def atualizar_modelo(modelo_id: uuid.UUID, dados: ModeloDocumentoUpdate, db: Session = Depends(get_db), company_id: uuid.UUID = Depends(get_current_company_id)):
    return doc_service.atualizar_modelo(db, company_id, modelo_id, dados.model_dump(exclude_unset=True))

@router.post("/gerar", response_model=DocumentoGeradoResponse)
def gerar_documento(req: GerarDocumentoRequest, db: Session = Depends(get_db), company_id: uuid.UUID = Depends(get_current_company_id)):
    doc = doc_service.gerar_documento(db, company_id, req.funcionario_id, req.modelo_id, extras=req.variaveis_extras)
    return doc

@router.get("/funcionario/{funcionario_id}", response_model=List[DocumentoGeradoResponse])
def listar_do_funcionario(funcionario_id: uuid.UUID, db: Session = Depends(get_db), auth = Depends(get_current_company_and_funcionario)):
    company_id = auth["company_id"]
    result = db.execute(
        select(DocumentoGerado).where(
            DocumentoGerado.company_id == company_id,
            DocumentoGerado.funcionario_id == funcionario_id
        ).order_by(DocumentoGerado.created_at.desc())
    )
    return result.scalars().all()

# ===== ROTAS DE VISUALIZAÇÃO =====
@router.get("/codigo/{codigo_verificacao}")
def obter_por_codigo(codigo_verificacao: str, db: Session = Depends(get_db), auth = Depends(get_current_company_and_funcionario)):
    company_id = auth["company_id"]
    result = db.execute(
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
def preview_documento(documento_id: uuid.UUID, request: Request, token: Optional[str] = Query(None), db: Session = Depends(get_db), auth = Depends(get_company_from_request)):
    company_id = auth["company_id"]
    result = db.execute(
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
def pdf_documento(documento_id: uuid.UUID, request: Request, token: Optional[str] = Query(None), db: Session = Depends(get_db), auth = Depends(get_company_from_request)):
    company_id = auth["company_id"]
    result = db.execute(
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
        return Response(content=pdf_bytes, media_type="application/pdf", headers={"Content-Disposition": f"inline; filename={doc.nome_arquivo}"})
    except Exception as e:
        print(f"[PDF] Erro weasyprint: {e}")
        return HTMLResponse(content=doc.conteudo_html_final)

@router.get("/{documento_id}")
def obter_documento(documento_id: uuid.UUID, db: Session = Depends(get_db), auth = Depends(get_current_company_and_funcionario)):
    company_id = auth["company_id"]
    result = db.execute(
        select(DocumentoGerado).where(
            DocumentoGerado.id == documento_id,
            DocumentoGerado.company_id == company_id
        )
    )
    doc = result.scalar_one_or_none()
    if not doc:
        raise HTTPException(404, "Documento não encontrado")
    return {"id": str(doc.id), "html_final": doc.conteudo_html_final, "codigo": doc.codigo_verificacao, "nome_arquivo": doc.nome_arquivo}
