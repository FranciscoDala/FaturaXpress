from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
import uuid
from typing import List
from app.db.session import get_db
from app.core.security import get_current_company_id
from app.modules.documentos.schemas import ModeloDocumentoCreate, ModeloDocumentoUpdate, GerarDocumentoRequest, ModeloDocumentoResponse, DocumentoGeradoResponse
from app.modules.documentos import service as doc_service
from app.modules.documentos.models import DocumentoGerado

router = APIRouter(prefix="/documentos", tags=["Documentos"])

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
def listar_do_funcionario(funcionario_id: uuid.UUID, db: Session = Depends(get_db), company_id: uuid.UUID = Depends(get_current_company_id)):
    return db.query(DocumentoGerado).filter(DocumentoGerado.company_id == company_id, DocumentoGerado.funcionario_id == funcionario_id).order_by(DocumentoGerado.created_at.desc()).all()

@router.get("/{documento_id}")
def obter_documento(documento_id: uuid.UUID, db: Session = Depends(get_db), company_id: uuid.UUID = Depends(get_current_company_id)):
    doc = db.query(DocumentoGerado).filter(DocumentoGerado.id == documento_id, DocumentoGerado.company_id == company_id).first()
    if not doc:
        raise HTTPException(404, "Documento não encontrado")
    return {"id": str(doc.id), "html_final": doc.conteudo_html_final, "codigo": doc.codigo_verificacao, "nome_arquivo": doc.nome_arquivo}
