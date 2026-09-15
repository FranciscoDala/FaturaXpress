from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import or_
from typing import Optional, List
import uuid
from app.db.session import get_db
from app.core.security import get_current_company_id
from app.modules.fatura.models import Fatura
from app.modules.fatura.schemas import FaturaCreate, FaturaResponse, FaturaUpdate
from app.modules.fatura import service as fatura_service

router = APIRouter(prefix="/faturas", tags=["Faturas"])

@router.post("", response_model=FaturaResponse, status_code=201)
def criar(dados: FaturaCreate, db: Session = Depends(get_db), company_id: uuid.UUID = Depends(get_current_company_id)):
    return fatura_service.criar_fatura(db, company_id, dados)

@router.get("", response_model=List[FaturaResponse])
def listar(
    cliente_id: Optional[uuid.UUID] = None,
    tipo_documento: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=100),
    db: Session = Depends(get_db),
    company_id: uuid.UUID = Depends(get_current_company_id)
):
    q = db.query(Fatura).filter(Fatura.company_id == company_id)
    if cliente_id: q = q.filter(Fatura.cliente_id == cliente_id)
    if tipo_documento: q = q.filter(Fatura.tipo_documento == tipo_documento)
    if status: q = q.filter(Fatura.status == status)
    else: q = q.filter(Fatura.status!= 'apagada')
    if search:
        q = q.filter(or_(Fatura.numero_fatura.ilike(f"%{search}%"), Fatura.numero_proforma.ilike(f"%{search}%")))
    return q.order_by(Fatura.created_at.desc()).offset((page-1)*limit).limit(limit).all()

@router.get("/stats/resumo")
def stats(cliente_id: Optional[uuid.UUID] = None, db: Session = Depends(get_db), company_id: uuid.UUID = Depends(get_current_company_id)):
    base = db.query(Fatura).filter(Fatura.company_id == company_id)
    if cliente_id: base = base.filter(Fatura.cliente_id == cliente_id)
    return {
        "em_curso": base.filter(Fatura.status == 'em_curso').count(),
        "proformas": base.filter(Fatura.tipo_documento == 'proforma', Fatura.status == 'em_curso').count(),
        "emitidas": base.filter(Fatura.tipo_documento == 'fatura').count(),
        "canceladas": base.filter(Fatura.status == 'cancelada').count(),
    }

@router.get("/numero/{numero}", response_model=FaturaResponse)
def por_numero(numero: str, db: Session = Depends(get_db), company_id: uuid.UUID = Depends(get_current_company_id)):
    f = db.query(Fatura).filter(Fatura.company_id == company_id, or_(Fatura.numero_fatura == numero, Fatura.numero_proforma == numero)).first()
    if not f: raise HTTPException(404, "Fatura não encontrada")
    return f

@router.get("/{fatura_id}", response_model=FaturaResponse)
def por_id(fatura_id: uuid.UUID, db: Session = Depends(get_db), company_id: uuid.UUID = Depends(get_current_company_id)):
    f = db.query(Fatura).filter(Fatura.id == fatura_id, Fatura.company_id == company_id).first()
    if not f: raise HTTPException(404, "Não encontrada")
    return f

@router.put("/{fatura_id}", response_model=FaturaResponse)
def atualizar(fatura_id: uuid.UUID, dados: FaturaUpdate, db: Session = Depends(get_db), company_id: uuid.UUID = Depends(get_current_company_id)):
    fatura = db.query(Fatura).filter(Fatura.id == fatura_id, Fatura.company_id == company_id).first()
    if not fatura: raise HTTPException(404, "Não encontrada")
    if fatura.tipo_documento == 'fatura' and fatura.status in ['emitida','concluida']:
        raise HTTPException(400, "Fatura oficial não pode ser editada - faça Nota de Crédito")
    return fatura_service.atualizar_fatura(db, fatura, company_id, dados)

@router.post("/{fatura_id}/converter", response_model=FaturaResponse)
def converter(fatura_id: uuid.UUID, db: Session = Depends(get_db), company_id: uuid.UUID = Depends(get_current_company_id)):
    return fatura_service.converter_proforma_para_fatura(db, fatura_id, company_id)

@router.post("/{fatura_id}/duplicar", response_model=FaturaResponse)
def duplicar(fatura_id: uuid.UUID, db: Session = Depends(get_db), company_id: uuid.UUID = Depends(get_current_company_id)):
    return fatura_service.duplicar_fatura(db, fatura_id, company_id)

@router.post("/{fatura_id}/cancelar")
def cancelar(fatura_id: uuid.UUID, motivo: str = "", db: Session = Depends(get_db), company_id: uuid.UUID = Depends(get_current_company_id)):
    f = db.query(Fatura).filter(Fatura.id == fatura_id, Fatura.company_id == company_id).first()
    if not f: raise HTTPException(404, "Não encontrada")
    if f.status == 'cancelada': raise HTTPException(400, "Já cancelada")
    f.status = 'cancelada'
    db.commit()
    return {"ok": True}

@router.delete("/{fatura_id}")
def apagar(fatura_id: uuid.UUID, db: Session = Depends(get_db), company_id: uuid.UUID = Depends(get_current_company_id)):
    f = db.query(Fatura).filter(Fatura.id == fatura_id, Fatura.company_id == company_id).first()
    if not f: raise HTTPException(404, "Não encontrada")
    if f.tipo_documento == 'fatura' and f.status in ['emitida','concluida']:
        raise HTTPException(400, "Fatura oficial não pode ser apagada, apenas cancelada - regra AGT")
    f.status = 'apagada'
    db.commit()
    return {"ok": True}
