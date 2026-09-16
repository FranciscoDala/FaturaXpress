from fastapi import APIRouter, Depends, Query, HTTPException
from fastapi.responses import Response
from sqlalchemy.orm import Session
from sqlalchemy import or_
from typing import Optional, List
import uuid
from datetime import datetime, timezone
import xml.etree.ElementTree as ET
from app.db.session import get_db
from app.core.security import get_current_company_id
from app.modules.fatura.models import Fatura
from app.modules.fatura.schemas import FaturaCreate, FaturaResponse, FaturaUpdate, NotaCreditoCreate
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
    if cliente_id:
        q = q.filter(Fatura.cliente_id == cliente_id)
    if tipo_documento:
        q = q.filter(Fatura.tipo_documento == tipo_documento)
    if status and status!= 'todos':
        q = q.filter(Fatura.status == status)
    else:
        if not status:
            q = q.filter(Fatura.status!= 'apagada')
    if search:
        like = f"%{search}%"
        q = q.filter(or_(
            Fatura.numero_fatura.ilike(like),
            Fatura.numero_proforma.ilike(like),
            Fatura.numero_nota_credito.ilike(like),
            Fatura.hash_agt.ilike(like)
        ))
    return q.order_by(Fatura.created_at.desc()).offset((page-1)*limit).limit(limit).all()

@router.get("/stats/resumo")
def stats(cliente_id: Optional[uuid.UUID] = None, db: Session = Depends(get_db), company_id: uuid.UUID = Depends(get_current_company_id)):
    base = db.query(Fatura).filter(Fatura.company_id == company_id, Fatura.status!= 'apagada')
    if cliente_id: base = base.filter(Fatura.cliente_id == cliente_id)
    return {
        "em_curso": base.filter(Fatura.status == 'em_curso').count(),
        "proformas": base.filter(Fatura.tipo_documento == 'proforma', Fatura.status == 'em_curso').count(),
        "emitidas": base.filter(Fatura.tipo_documento == 'fatura', Fatura.status.in_(['emitida','concluida'])).count(),
        "notas_credito": base.filter(Fatura.tipo_documento == 'nota_credito').count(),
        "canceladas": base.filter(Fatura.status == 'cancelada').count(),
        "total": base.count(),
    }

@router.get("/saf-t")
def gerar_saft(
    mes: int = Query(..., ge=1, le=12),
    ano: int = Query(..., ge=2020),
    db: Session = Depends(get_db),
    company_id: uuid.UUID = Depends(get_current_company_id)
):
    faturas = db.query(Fatura).filter(
        Fatura.company_id==company_id,
        Fatura.tipo_documento.in_(['fatura','nota_credito']),
        Fatura.hash_agt.is_not(None)
    ).order_by(Fatura.created_at.asc()).all()

    root = ET.Element("AuditFile")
    header = ET.SubElement(root, "Header")
    ET.SubElement(header, "AuditFileVersion").text = "1.04_01"
    ET.SubElement(header, "CompanyID").text = str(company_id)
    ET.SubElement(header, "TaxRegistrationNumber").text = "999999999"
    ET.SubElement(header, "TaxAccountingBasis").text = "F"
    ET.SubElement(header, "CompanyName").text = "Empresa"
    ET.SubElement(header, "FiscalYear").text = str(ano)
    ET.SubElement(header, "StartDate").text = f"{ano}-{mes:02d}-01"
    ET.SubElement(header, "EndDate").text = f"{ano}-{mes:02d}-28"
    ET.SubElement(header, "CurrencyCode").text = "AKZ"
    ET.SubElement(header, "DateCreated").text = datetime.now().strftime("%Y-%m-%d")
    ET.SubElement(header, "ProductID").text = "FaturaXpress/83/AGT/2019"

    docs = ET.SubElement(root, "SourceDocuments")
    sales = ET.SubElement(docs, "SalesInvoices")
    ET.SubElement(sales, "NumberOfEntries").text = str(len(faturas))
    total_debit = sum(float(f.total_geral) for f in faturas if float(f.total_geral)>0)
    total_credit = abs(sum(float(f.total_geral) for f in faturas if float(f.total_geral)<0))
    ET.SubElement(sales, "TotalDebit").text = f"{total_debit:.2f}"
    ET.SubElement(sales, "TotalCredit").text = f"{total_credit:.2f}"

    for f in faturas:
        inv = ET.SubElement(sales, "Invoice")
        ET.SubElement(inv, "InvoiceNo").text = f.numero_fatura or f.numero_nota_credito or ""
        ET.SubElement(inv, "ATCUD").text = (f.hash_agt or "")[:30]
        doc_status = ET.SubElement(inv, "DocumentStatus")
        ET.SubElement(doc_status, "InvoiceStatus").text = "N" if f.status=='cancelada' else "N"
        ET.SubElement(doc_status, "InvoiceStatusDate").text = f.data_emissao.strftime("%Y-%m-%dT%H:%M:%S") if f.data_emissao else ""
        ET.SubElement(inv, "Hash").text = f.hash_agt or ""
        ET.SubElement(inv, "HashControl").text = "1"
        ET.SubElement(inv, "Period").text = str(f.data_emissao.month) if f.data_emissao else str(mes)
        ET.SubElement(inv, "InvoiceDate").text = f.data_emissao.strftime("%Y-%m-%d") if f.data_emissao else ""
        ET.SubElement(inv, "InvoiceType").text = "FT" if f.tipo_documento=='fatura' else "NC"

    xml_str = ET.tostring(root, encoding='utf-8', method='xml')
    return Response(content=xml_str, media_type="application/xml", headers={"Content-Disposition": f"attachment; filename=SAFT-AO-{ano}-{mes:02d}.xml"})

@router.get("/numero/{numero}", response_model=FaturaResponse)
def por_numero(numero: str, db: Session = Depends(get_db), company_id: uuid.UUID = Depends(get_current_company_id)):
    f = db.query(Fatura).filter(Fatura.company_id == company_id, or_(Fatura.numero_fatura == numero, Fatura.numero_proforma == numero, Fatura.numero_nota_credito == numero)).first()
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
    if fatura.tipo_documento in ['fatura','nota_credito'] and fatura.hash_agt and fatura.status in ['emitida','concluida']:
        raise HTTPException(400, "Documento AGT oficial não pode ser editado - emita Nota de Crédito")
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
    if f.tipo_documento == 'fatura' and f.hash_agt:
        # AGT: só pode cancelar no mesmo dia
        if (datetime.now(timezone.utc) - f.created_at).days >= 1:
            raise HTTPException(400, "FT com mais de 24h não pode ser cancelada - tem que emitir Nota de Crédito (regra AGT)")
    f.status = 'cancelada'
    if motivo: f.observacoes = f"{f.observacoes or ''} | Cancelada: {motivo}"
    db.commit()
    db.refresh(f)
    return {"ok": True, "fatura": f}

@router.post("/{fatura_id}/nota-credito", response_model=FaturaResponse)
def criar_nota_credito(fatura_id: uuid.UUID, dados: NotaCreditoCreate, db: Session = Depends(get_db), company_id: uuid.UUID = Depends(get_current_company_id)):
    return fatura_service.criar_nota_credito(db, company_id, fatura_id, dados.motivo, dados.observacoes)

@router.delete("/{fatura_id}")
def apagar(fatura_id: uuid.UUID, db: Session = Depends(get_db), company_id: uuid.UUID = Depends(get_current_company_id)):
    f = db.query(Fatura).filter(Fatura.id == fatura_id, Fatura.company_id == company_id).first()
    if not f: raise HTTPException(404, "Não encontrada")
    if f.tipo_documento in ['fatura','nota_credito'] and f.hash_agt:
        raise HTTPException(400, "PROIBIDO AGT: FT/NC oficial não pode ser apagada. Use Cancelar (24h) ou Nota de Crédito.")
    f.status = 'apagada'
    db.commit()
    return {"ok": True}
