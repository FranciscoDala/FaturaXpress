from fastapi import APIRouter, Depends, Query, HTTPException
from fastapi.responses import Response, StreamingResponse
from sqlalchemy.orm import Session
from sqlalchemy import or_, extract
from typing import Optional, List, Union
import uuid
import calendar
import logging
from datetime import datetime, timezone
import xml.etree.ElementTree as ET
from io import BytesIO

from app.db.session import get_db
from app.core.security import get_current_company_id
from app.modules.fatura.models import Fatura
from app.modules.fatura.schemas import FaturaCreate, FaturaResponse, FaturaUpdate, NotaCreditoCreate
from app.modules.fatura import service as fatura_service
from app.modules.auth.models import Company
from app.modules.clients.models import Cliente
from app.modules.realtime.manager import manager

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/faturas", tags=["Faturas"])

def _gerar_pdf_bytes(fatura: Fatura, empresa: Company, cliente: Optional[Cliente] = None):
    from reportlab.lib.pagesizes import A4
    from reportlab.lib.units import mm
    from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, Image
    from reportlab.lib.styles import ParagraphStyle
    from reportlab.lib import colors
    from reportlab.lib.enums import TA_RIGHT, TA_CENTER, TA_LEFT
    import io
    from datetime import datetime

    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4, leftMargin=10*mm, rightMargin=10*mm, topMargin=10*mm, bottomMargin=10*mm)

    s_normal = ParagraphStyle('n', fontName='Helvetica', fontSize=7.5, leading=9)
    s_bold = ParagraphStyle('b', fontName='Helvetica-Bold', fontSize=8, leading=10)
    s_bold9 = ParagraphStyle('b9', fontName='Helvetica-Bold', fontSize=9, leading=11)
    s_small = ParagraphStyle('s', fontName='Helvetica', fontSize=6.5, leading=8)
    s_title = ParagraphStyle('t', fontName='Helvetica-Bold', fontSize=12, leading=14)

    def fmt(n):
        try: return f"{float(n):,.2f}".replace(",", "X").replace(".", ",").replace("X", ".")
        except: return "0,00"
    def fmtData(d):
        try: return d.strftime("%d/%m/%Y") if d else "---"
        except: return "---"

    emp_nome = getattr(empresa, 'companyName', '') or getattr(empresa, 'nome', '---')
    emp_nif = getattr(empresa, 'nif', '---')
    emp_end = getattr(empresa, 'address', '') or getattr(empresa, 'endereco', '')
    emp_tel = getattr(empresa, 'phone', '') or getattr(empresa, 'telefone', '')
    emp_email = getattr(empresa, 'email', '')
    emp_cidade = getattr(empresa, 'city', '') or getattr(empresa, 'cidade', '')
    emp_iban = getattr(empresa, 'iban', '---') or '---'
    emp_iban2 = getattr(empresa, 'iban2', '')
    emp_banco1 = getattr(empresa, 'banco1', 'BAI')
    emp_banco2 = getattr(empresa, 'banco2', '')

    numero = fatura.numero_fatura or fatura.numero_nota_credito or fatura.numero_proforma or str(fatura.id)[:8]
    isNC = fatura.tipo_documento == 'nota_credito'
    isFT = fatura.tipo_documento == 'fatura'
    titulo = 'NOTA DE CREDITO' if isNC else 'FACTURA' if isFT else 'FACTURA PROFORMA'

    story = []

    # TOPO - LOGO + EMPRESA
    top_left = Paragraph(f"<b>{emp_nome}</b><br/>NIF: {emp_nif}<br/>Endereco: {emp_end}<br/>Contactos: {emp_tel}<br/>Email: {emp_email}<br/>{emp_cidade}", s_normal)
    top_right = Paragraph(f"<b>{titulo}</b><br/>{numero}<br/><br/>Emissao: {fmtData(fatura.data_emissao)}<br/>Venc: {fmtData(fatura.data_vencimento or fatura.validade_proforma)}<br/>Hash: {(fatura.hash_agt or '---')[:30]}...<br/>Comunicado AGT: {'Sim' if fatura.comunicado_agt else 'Nao'}", s_normal)
    t = Table([[top_left, top_right]], colWidths=[280, 220])
    t.setStyle(TableStyle([('VALIGN',(0,0),(-1,-1),'TOP'), ('BOX',(0,0),(-1,-1),0.3,colors.grey)]))
    story.append(t)
    story.append(Spacer(1, 10))

    # CLIENTE
    cli_nome = fatura.cliente_nome or (cliente.nome if cliente else 'Consumidor Final')
    cli_nif = fatura.cliente_nif or '999999999'
    cli_end = fatura.cliente_endereco or ''
    cli_cidade = getattr(cliente, 'cidade', '') if cliente else ''
    cli_tel = fatura.cliente_telefone or ''
    cli_email = fatura.cliente_email or ''

    story.append(Paragraph(f"<b>Cliente:</b> {cli_nome}<br/>NIF: {cli_nif}<br/>{cli_end} - {cli_cidade}<br/>{cli_tel} | {cli_email}", s_normal))
    story.append(Spacer(1, 8))

    # 6 QUADRADINHOS IGUAL SEU CODIGO
    boxes = [
        [Paragraph("<b>COD. CLIENTE</b><br/>"+ (str(fatura.cliente_id)[:8] if fatura.cliente_id else 'AVULSO'), s_small),
         Paragraph("<b>DATA EMISSAO</b><br/>"+fmtData(fatura.data_emissao), s_small),
         Paragraph("<b>DATA VENC.</b><br/>"+fmtData(fatura.data_vencimento), s_small),
         Paragraph("<b>NIF CLIENTE</b><br/>"+cli_nif, s_small),
         Paragraph("<b>VALIDADE PP</b><br/>"+fmtData(fatura.validade_proforma), s_small),
         Paragraph("<b>OPERADOR</b><br/>"+emp_nome[:10], s_small)],
    ]
    bt = Table(boxes, colWidths=[70,70,70,80,70,140])
    bt.setStyle(TableStyle([
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor("#bbbbbb")),
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor("#ffffff")),
        ('ALIGN', (0,0), (-1,-1), 'CENTER'),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('TOPPADDING', (0,0), (-1,-1), 4),
        ('BOTTOMPADDING', (0,0), (-1,-1), 4),
    ]))
    story.append(bt)
    story.append(Spacer(1, 6))

    # TABELA ITENS - SEU MODELO EXATO: REF | PRODUTO | QTD | UN | PRECO UNIT | DESCONTO | TAXA | VALOR
    header = [
        Paragraph("<b>REF</b>", ParagraphStyle('h', parent=s_small, alignment=TA_LEFT)),
        Paragraph("<b>PRODUTO / SERVICO</b>", ParagraphStyle('h', parent=s_small, alignment=TA_LEFT)),
        Paragraph("<b>QTD.</b>", ParagraphStyle('h', parent=s_small, alignment=TA_CENTER)),
        Paragraph("<b>UN.</b>", ParagraphStyle('h', parent=s_small, alignment=TA_CENTER)),
        Paragraph("<b>PRECO UNIT.</b>", ParagraphStyle('h', parent=s_small, alignment=TA_RIGHT)),
        Paragraph("<b>DESCONTO</b>", ParagraphStyle('h', parent=s_small, alignment=TA_RIGHT)),
        Paragraph("<b>TAXA</b>", ParagraphStyle('h', parent=s_small, alignment=TA_CENTER)),
        Paragraph("<b>VALOR (AKZ)</b>", ParagraphStyle('h', parent=s_small, alignment=TA_RIGHT)),
    ]
    data = [header]
    for it in fatura.itens:
        ref = (it.nome_snapshot[:10] if hasattr(it,'nome_snapshot') else '---')
        # NOME QUEBRA EMBAIXO - NAO CORTA
        prod_style = ParagraphStyle('prod', parent=s_normal, fontSize=7, leading=9, alignment=TA_LEFT)
        prod = Paragraph(it.nome_snapshot or '---', prod_style)
        qtd = Paragraph(f"{float(it.quantidade or 0):.0f}", ParagraphStyle('c', parent=s_small, alignment=TA_CENTER))
        un = Paragraph("UN", ParagraphStyle('c', parent=s_small, alignment=TA_CENTER))
        preco = Paragraph(f"<para alignment=right>{fmt(it.preco_unit_snapshot)}</para>", s_small)
        desc = Paragraph(f"<para alignment=right>{fmt(getattr(it,'desconto_valor',0) or 0) if float(getattr(it,'desconto_perc',0) or 0)>0 else '-'}</para>", s_small)
        taxa = Paragraph(f"<para alignment=center>{'Isento' if float(it.iva_percent or 0)==0 else f'{float(it.iva_percent):.0f}%'}</para>", s_small)
        valor = Paragraph(f"<para alignment=right><b>{fmt(it.subtotal_linha)}</b></para>", s_small)
        data.append([Paragraph(ref[:12], s_small), prod, qtd, un, preco, desc, taxa, valor])

    for _ in range(max(0, 8 - len(fatura.itens))):
        data.append([Paragraph("", s_small) for _ in range(8)])

    colW = [48, 175, 28, 22, 62, 48, 32, 85]
    it_table = Table(data, colWidths=colW, repeatRows=1)
    it_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor("#C2C2C2")),
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor("#999999")),
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('TOPPADDING', (0,0), (-1,-1), 5),
        ('BOTTOMPADDING', (0,0), (-1,-1), 5),
        ('LEFTPADDING', (0,0), (-1,-1), 3),
        ('RIGHTPADDING', (0,0), (-1,-1), 3),
    ]))
    story.append(it_table)
    story.append(Spacer(1, 6))

    # IMPOSTO + TOTAIS
    liquido = float(fatura.subtotal or 0)
    iva_val = float(fatura.total_iva or 0)
    pagar = float(fatura.total_geral or 0)
    desconto = 0

    imp_data = [
        [Paragraph("<b>IMPOSTO</b>", s_small), Paragraph("<b>TAXA</b>", s_small), Paragraph("<b>INCIDENCIA</b>", s_small), Paragraph("<b>VALOR</b>", s_small), Paragraph("", s_small), Paragraph("<para alignment=right>Total Liquido</para>", s_small), Paragraph(f"<para alignment=right>{fmt(liquido)}</para>", s_small)],
        [Paragraph("IVA 14%" if iva_val>0 else "*M04 Isento", s_small), Paragraph("14%" if iva_val>0 else "Isento", s_small), Paragraph(f"<para alignment=right>{fmt(liquido)}</para>", s_small), Paragraph(f"<para alignment=right>{fmt(iva_val)}</para>", s_small), Paragraph("", s_small), Paragraph("<para alignment=right>Total Desconto</para>", s_small), Paragraph(f"<para alignment=right>{fmt(desconto)}</para>", s_small)],
        [Paragraph("", s_small), Paragraph("", s_small), Paragraph("", s_small), Paragraph("", s_small), Paragraph("", s_small), Paragraph("<para alignment=right>Total IVA</para>", s_small), Paragraph(f"<para alignment=right>{fmt(iva_val)}</para>", s_small)],
        [Paragraph("", s_small), Paragraph("", s_small), Paragraph("", s_small), Paragraph("", s_small), Paragraph("", s_small), Paragraph("<para alignment=right><b>TOTAL A PAGAR (AKZ)</b></para>", s_bold), Paragraph(f"<para alignment=right><b>{fmt(pagar)}</b></para>", s_bold)],
    ]

    imp_table = Table(imp_data, colWidths=[90, 35, 70, 60, 5, 95, 85])
    imp_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (3,0), colors.HexColor("#C2C2C2")),
        ('BACKGROUND', (5,0), (5,2), colors.HexColor("#C2C2C2")),
        ('BACKGROUND', (5,3), (6,3), colors.HexColor("#C2C2C2")),
        ('GRID', (0,0), (3,1), 0.5, colors.HexColor("#999999")),
        ('GRID', (5,0), (6,3), 0.5, colors.HexColor("#999999")),
        ('BOX', (0,0), (3,1), 0.5, colors.HexColor("#999999")),
    ]))
    story.append(imp_table)
    story.append(Spacer(1, 10))

    # COORDENADAS BANCARIAS
    story.append(Paragraph(f"<b>Coordenadas Bancarias:</b><br/>IBAN - {emp_banco1}: {emp_iban}<br/>{f'IBAN - {emp_banco2}: {emp_iban2}' if emp_iban2 else ''}", s_normal))
    story.append(Spacer(1, 6))
    if fatura.observacoes:
        story.append(Paragraph(f"<b>Observacoes:</b> {fatura.observacoes}", s_normal))
        story.append(Spacer(1, 6))

    story.append(Paragraph(f"Licenciado a: {emp_nome} | NIF: {emp_nif} | {emp_end} | Hash AGT validado | Pag. 1 de 1", s_small))

    doc.build(story)
    buffer.seek(0)
    return buffer.getvalue()



@router.post("", response_model=FaturaResponse, status_code=201)
async def criar(dados: FaturaCreate, db: Session = Depends(get_db), company_id: uuid.UUID = Depends(get_current_company_id)):
    result = fatura_service.criar_fatura(db, company_id, dados)
    try:
        await manager.broadcast(company_id, {"event": "faturas:changed", "action": "created", "tipo": result.tipo_documento, "id": str(result.id)})
    except Exception as e:
        logger.warning(f"Falha broadcast faturas:changed: {e}")
    return result

@router.get("", response_model=List[FaturaResponse])
def listar(
    cliente_id: Optional[uuid.UUID] = None,
    tipo_documento: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    area_id: Optional[uuid.UUID] = Query(None, description="Filtrar por área"),
    search: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=500),
    db: Session = Depends(get_db),
    company_id: uuid.UUID = Depends(get_current_company_id)
):
    q = db.query(Fatura).filter(Fatura.company_id == company_id)
    if cliente_id:
        q = q.filter(Fatura.cliente_id == cliente_id)
    if area_id:
        q = q.filter(Fatura.area_id == area_id)
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
            Fatura.hash_agt.ilike(like),
            Fatura.cliente_nome.ilike(like),
            Fatura.cliente_nif.ilike(like)
        ))
    return q.order_by(Fatura.created_at.desc()).offset((page-1)*limit).limit(limit).all()

@router.get("/stats/resumo")
def stats(
    cliente_id: Optional[uuid.UUID] = None,
    area_id: Optional[uuid.UUID] = Query(None, description="Filtrar por área"),
    db: Session = Depends(get_db),
    company_id: uuid.UUID = Depends(get_current_company_id)
):
    base = db.query(Fatura).filter(Fatura.company_id == company_id, Fatura.status!= 'apagada')
    if cliente_id:
        base = base.filter(Fatura.cliente_id == cliente_id)
    if area_id:
        base = base.filter(Fatura.area_id == area_id)
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
    mes: Union[str, int, None] = Query(None),
    ano: Optional[int] = Query(None, ge=2020),
    mes_str: Optional[str] = Query(None, alias="mes"),
    db: Session = Depends(get_db),
    company_id: uuid.UUID = Depends(get_current_company_id),
):
    raw = mes_str or mes
    mes_int: Optional[int] = None
    ano_int: Optional[int] = ano

    if isinstance(raw, str) and "-" in raw:
        try:
            y, m = raw.split("-")
            ano_int = int(y)
            mes_int = int(m)
        except ValueError:
            raise HTTPException(400, "Formato inválido, use YYYY-MM")
    elif raw is not None:
        try:
            mes_int = int(raw) # type: ignore
        except ValueError:
            raise HTTPException(400, "Mês inválido")

    if not mes_int or not ano_int:
        now = datetime.now(timezone.utc)
        mes_int = mes_int or now.month
        ano_int = ano_int or now.year

    company = db.query(Company).filter(Company.id == company_id).first()
    if not company:
        raise HTTPException(404, "Empresa não encontrada")

    assert company is not None
    comp_name: str = company.companyName
    comp_nif: str = str(company.nif).zfill(10)
    comp_address_detail: str = company.address or "Luanda"
    comp_city: str = company.city or "Luanda"

    faturas = db.query(Fatura).filter(
        Fatura.company_id == company_id,
        Fatura.tipo_documento.in_(["fatura", "nota_credito"]),
        Fatura.hash_agt.is_not(None),
        extract("year", Fatura.data_emissao) == ano_int,
        extract("month", Fatura.data_emissao) == mes_int,
    ).order_by(Fatura.data_emissao.asc()).all()

    if not faturas:
        raise HTTPException(404, f"Sem FT/NC com hash em {ano_int}-{mes_int:02d}")

    last_day = calendar.monthrange(ano_int, mes_int)[1]

    root = ET.Element("AuditFile", xmlns="urn:OECD:StandardAuditFile-Tax:AO_1.04_01")
    header = ET.SubElement(root, "Header")
    ET.SubElement(header, "AuditFileVersion").text = "1.04_01"
    ET.SubElement(header, "CompanyID").text = comp_name[:50]
    ET.SubElement(header, "TaxRegistrationNumber").text = comp_nif
    ET.SubElement(header, "TaxAccountingBasis").text = "F"
    ET.SubElement(header, "CompanyName").text = comp_name
    ET.SubElement(header, "BusinessName").text = comp_name

    addr = ET.SubElement(header, "CompanyAddress")
    ET.SubElement(addr, "AddressDetail").text = comp_address_detail
    ET.SubElement(addr, "City").text = comp_city
    ET.SubElement(addr, "PostalCode").text = "0000"
    ET.SubElement(addr, "Country").text = "AO"

    ET.SubElement(header, "FiscalYear").text = str(ano_int)
    ET.SubElement(header, "StartDate").text = f"{ano_int}-{mes_int:02d}-01"
    ET.SubElement(header, "EndDate").text = f"{ano_int}-{mes_int:02d}-{last_day:02d}"
    ET.SubElement(header, "CurrencyCode").text = "AKZ"
    ET.SubElement(header, "DateCreated").text = datetime.now().strftime("%Y-%m-%d")
    ET.SubElement(header, "TaxEntity").text = "Global"
    ET.SubElement(header, "ProductCompanyTaxID").text = comp_nif
    ET.SubElement(header, "SoftwareValidationNumber").text = "83/AGT/2019"
    ET.SubElement(header, "ProductID").text = "FaturaXpress/1.0"
    ET.SubElement(header, "ProductVersion").text = "1.0"

    mf = ET.SubElement(root, "MasterFiles")

    clientes_ids = list({f.cliente_id for f in faturas if f.cliente_id})
    clientes_map: dict[uuid.UUID, Cliente] = {}
    if clientes_ids:
        clientes_db = db.query(Cliente).filter(Cliente.id.in_(clientes_ids)).all()
        clientes_map = {c.id: c for c in clientes_db} # type: ignore

    for cid in clientes_ids:
        cli = clientes_map.get(cid) # type: ignore
        cust = ET.SubElement(mf, "Customer")
        ET.SubElement(cust, "CustomerID").text = str(cid)
        ET.SubElement(cust, "AccountID").text = "Desconhecido"

        if cli is not None:
            c_nif = getattr(cli, "nif", "999999999") or "999999999"
            c_nome = getattr(cli, "nome", None) or getattr(cli, "name", "Consumidor Final")
            c_addr_det = getattr(cli, "address", None) or getattr(cli, "endereco", "Luanda") or "Luanda"
            ET.SubElement(cust, "CustomerTaxID").text = str(c_nif)
            ET.SubElement(cust, "CompanyName").text = str(c_nome)[:60]
            baddr = ET.SubElement(cust, "BillingAddress")
            ET.SubElement(baddr, "AddressDetail").text = str(c_addr_det)
            ET.SubElement(baddr, "City").text = "Luanda"
            ET.SubElement(baddr, "PostalCode").text = "0000"
            ET.SubElement(baddr, "Country").text = "AO"
        else:
            ET.SubElement(cust, "CustomerTaxID").text = "999999999"
            ET.SubElement(cust, "CompanyName").text = "Consumidor Final"
            baddr = ET.SubElement(cust, "BillingAddress")
            ET.SubElement(baddr, "AddressDetail").text = "Luanda"
            ET.SubElement(baddr, "City").text = "Luanda"
            ET.SubElement(baddr, "PostalCode").text = "0000"
            ET.SubElement(baddr, "Country").text = "AO"

        ET.SubElement(cust, "SelfBillingIndicator").text = "0"

    for f in faturas:
        if not f.cliente_id:
            cust = ET.SubElement(mf, "Customer")
            ET.SubElement(cust, "CustomerID").text = f"AVULSO-{str(f.id)[:8]}"
            ET.SubElement(cust, "AccountID").text = "Desconhecido"
            ET.SubElement(cust, "CustomerTaxID").text = (f.cliente_nif or "999999999")
            ET.SubElement(cust, "CompanyName").text = (f.cliente_nome or "Consumidor Final")[:60]
            baddr = ET.SubElement(cust, "BillingAddress")
            ET.SubElement(baddr, "AddressDetail").text = (f.cliente_endereco or "Luanda")
            ET.SubElement(baddr, "City").text = "Luanda"
            ET.SubElement(baddr, "PostalCode").text = "0000"
            ET.SubElement(baddr, "Country").text = "AO"
            ET.SubElement(cust, "SelfBillingIndicator").text = "0"

    produtos_seen = {}
    for f in faturas:
        for it in f.itens:
            if it.nome_snapshot not in produtos_seen:
                produtos_seen[it.nome_snapshot] = it

    for nome, it in produtos_seen.items():
        prod = ET.SubElement(mf, "Product")
        ET.SubElement(prod, "ProductType").text = "P"
        ET.SubElement(prod, "ProductCode").text = str(it.produto_id) if it.produto_id else nome[:60]
        ET.SubElement(prod, "ProductGroup").text = "Produtos"
        ET.SubElement(prod, "ProductDescription").text = nome[:60]
        ET.SubElement(prod, "ProductNumberCode").text = nome[:60]

    tax_table = ET.SubElement(mf, "TaxTable")
    for code, perc, desc in [("NOR", "14", "IVA Normal"), ("ISE", "0", "Isento")]:
        e = ET.SubElement(tax_table, "TaxTableEntry")
        ET.SubElement(e, "TaxType").text = "IVA"
        ET.SubElement(e, "TaxCountryRegion").text = "AO"
        ET.SubElement(e, "TaxCode").text = code
        ET.SubElement(e, "Description").text = desc
        ET.SubElement(e, "TaxPercentage").text = perc

    docs = ET.SubElement(root, "SourceDocuments")
    sales = ET.SubElement(docs, "SalesInvoices")
    ET.SubElement(sales, "NumberOfEntries").text = str(len(faturas))
    ET.SubElement(sales, "TotalDebit").text = f"{sum(float(f.total_geral) for f in faturas if float(f.total_geral) > 0):.2f}"
    ET.SubElement(sales, "TotalCredit").text = f"{abs(sum(float(f.total_geral) for f in faturas if float(f.total_geral) < 0)):.2f}"

    for f in faturas:
        inv = ET.SubElement(sales, "Invoice")
        ET.SubElement(inv, "InvoiceNo").text = f.numero_fatura or f.numero_nota_credito or ""
        ds = ET.SubElement(inv, "DocumentStatus")
        ET.SubElement(ds, "InvoiceStatus").text = "N"
        ET.SubElement(ds, "InvoiceStatusDate").text = f.data_emissao.strftime("%Y-%m-%dT%H:%M:%S")
        ET.SubElement(ds, "SourceID").text = str(f.cliente_id) if f.cliente_id else f"AVULSO-{str(f.id)[:8]}"
        ET.SubElement(ds, "SourceBilling").text = "P"
        ET.SubElement(inv, "Hash").text = f.hash_agt or ""
        ET.SubElement(inv, "HashControl").text = "1"
        ET.SubElement(inv, "Period").text = str(mes_int)
        ET.SubElement(inv, "InvoiceDate").text = f.data_emissao.strftime("%Y-%m-%d")
        ET.SubElement(inv, "InvoiceType").text = "FT" if f.tipo_documento == "fatura" else "NC"
        ET.SubElement(inv, "SelfBillingIndicator").text = "0"
        ET.SubElement(inv, "SystemEntryDate").text = f.created_at.strftime("%Y-%m-%dT%H:%M:%S") if f.created_at else f.data_emissao.strftime("%Y-%m-%dT%H:%M:%S")
        ET.SubElement(inv, "CustomerID").text = str(f.cliente_id) if f.cliente_id else f"AVULSO-{str(f.id)[:8]}"

        for idx, item in enumerate(f.itens, 1):
            line = ET.SubElement(inv, "Line")
            ET.SubElement(line, "LineNumber").text = str(idx)
            ET.SubElement(line, "ProductCode").text = str(item.produto_id) if item.produto_id else item.nome_snapshot[:60]
            ET.SubElement(line, "ProductDescription").text = item.nome_snapshot
            ET.SubElement(line, "Quantity").text = f"{float(item.quantidade):.2f}"
            ET.SubElement(line, "UnitOfMeasure").text = "UN"
            ET.SubElement(line, "UnitPrice").text = f"{float(item.preco_unit_snapshot):.2f}"
            ET.SubElement(line, "TaxBase").text = f"{float(item.subtotal_linha):.2f}"
            ET.SubElement(line, "TaxPointDate").text = f.data_emissao.strftime("%Y-%m-%d")
            ET.SubElement(line, "Description").text = item.nome_snapshot
            if float(item.subtotal_linha) >= 0:
                ET.SubElement(line, "DebitAmount").text = f"{float(item.subtotal_linha):.2f}"
            else:
                ET.SubElement(line, "CreditAmount").text = f"{abs(float(item.subtotal_linha)):.2f}"
            tax = ET.SubElement(line, "Tax")
            ET.SubElement(tax, "TaxType").text = "IVA"
            ET.SubElement(tax, "TaxCountryRegion").text = "AO"
            ET.SubElement(tax, "TaxCode").text = "NOR" if float(item.iva_percent or 0) > 0 else "ISE"
            ET.SubElement(tax, "TaxPercentage").text = f"{float(item.iva_percent or 0):.2f}"
            if item.motivo_isencao:
                ET.SubElement(line, "TaxExemptionReason").text = item.motivo_isencao
            ET.SubElement(line, "SettlementAmount").text = "0.00"

        dt = ET.SubElement(inv, "DocumentTotals")
        ET.SubElement(dt, "TaxPayable").text = f"{float(f.total_iva or 0):.2f}"
        ET.SubElement(dt, "NetTotal").text = f"{float(f.subtotal or 0):.2f}"
        ET.SubElement(dt, "GrossTotal").text = f"{float(f.total_geral or 0):.2f}"

    xml_str = ET.tostring(root, encoding="utf-8", xml_declaration=True)
    for f in faturas:
        f.comunicado_agt = True
    db.commit()
    return Response(
        content=xml_str,
        media_type="application/xml",
        headers={"Content-Disposition": f"attachment; filename=SAFT-AO-{ano_int}-{mes_int:02d}.xml"},
    )

# --- NOVA ROTA DOWNLOAD PDF ---
@router.get("/{fatura_id}/pdf")
def baixar_pdf_fatura(
    fatura_id: uuid.UUID,
    db: Session = Depends(get_db),
    company_id: uuid.UUID = Depends(get_current_company_id)
):
    fatura = db.query(Fatura).filter(Fatura.id == fatura_id, Fatura.company_id == company_id).first()
    if not fatura:
        raise HTTPException(404, "Fatura não encontrada")

    empresa = db.query(Company).filter(Company.id == company_id).first()
    if not empresa:
        raise HTTPException(404, "Empresa não encontrada")

    cliente = None
    if fatura.cliente_id:
        cliente = db.query(Cliente).filter(Cliente.id == fatura.cliente_id).first()

    pdf_bytes = _gerar_pdf_bytes(fatura, empresa, cliente)
    filename = fatura.numero_fatura or fatura.numero_nota_credito or fatura.numero_proforma or str(fatura.id)[:8]

    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f"attachment; filename={filename}.pdf",
            "Cache-Control": "no-cache"
        }
    )

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
async def atualizar(fatura_id: uuid.UUID, dados: FaturaUpdate, db: Session = Depends(get_db), company_id: uuid.UUID = Depends(get_current_company_id)):
    fatura = db.query(Fatura).filter(Fatura.id == fatura_id, Fatura.company_id == company_id).first()
    if not fatura: raise HTTPException(404, "Não encontrada")
    if fatura.tipo_documento in ['fatura','nota_credito'] and fatura.hash_agt and fatura.status in ['emitida','concluida']:
        raise HTTPException(400, "Documento AGT oficial não pode ser editado - emita Nota de Crédito")
    result = fatura_service.atualizar_fatura(db, fatura, company_id, dados)
    try:
        await manager.broadcast(company_id, {"event": "faturas:changed", "action": "updated", "id": str(fatura_id)})
    except Exception as e:
        logger.warning(f"Falha broadcast: {e}")
    return result

@router.post("/{fatura_id}/converter", response_model=FaturaResponse)
async def converter(fatura_id: uuid.UUID, db: Session = Depends(get_db), company_id: uuid.UUID = Depends(get_current_company_id)):
    result = fatura_service.converter_proforma_para_fatura(db, fatura_id, company_id)
    try:
        await manager.broadcast(company_id, {"event": "faturas:changed", "action": "converted", "id": str(fatura_id), "nova_id": str(result.id)})
    except Exception as e:
        logger.warning(f"Falha broadcast: {e}")
    return result

@router.post("/{fatura_id}/duplicar", response_model=FaturaResponse)
async def duplicar(fatura_id: uuid.UUID, db: Session = Depends(get_db), company_id: uuid.UUID = Depends(get_current_company_id)):
    result = fatura_service.duplicar_fatura(db, fatura_id, company_id)
    try:
        await manager.broadcast(company_id, {"event": "faturas:changed", "action": "duplicated", "id": str(result.id)})
    except Exception as e:
        logger.warning(f"Falha broadcast: {e}")
    return result

@router.post("/{fatura_id}/cancelar")
async def cancelar(fatura_id: uuid.UUID, motivo: str = "", db: Session = Depends(get_db), company_id: uuid.UUID = Depends(get_current_company_id)):
    f = db.query(Fatura).filter(Fatura.id == fatura_id, Fatura.company_id == company_id).first()
    if not f: raise HTTPException(404, "Não encontrada")
    if f.status == 'cancelada': raise HTTPException(400, "Já cancelada")
    if f.tipo_documento == 'fatura' and f.hash_agt:
        if (datetime.now(timezone.utc) - f.created_at).days >= 1:
            raise HTTPException(400, "FT com mais de 24h não pode ser cancelada - tem que emitir Nota de Crédito (regra AGT)")
    f.status = 'cancelada'
    if motivo: f.observacoes = f"{f.observacoes or ''} | Cancelada: {motivo}"
    db.commit()
    db.refresh(f)
    try:
        await manager.broadcast(company_id, {"event": "faturas:changed", "action": "cancelled", "id": str(fatura_id)})
    except Exception as e:
        logger.warning(f"Falha broadcast: {e}")
    return {"ok": True, "fatura": f}

@router.post("/{fatura_id}/nota-credito", response_model=FaturaResponse)
async def criar_nota_credito(fatura_id: uuid.UUID, dados: NotaCreditoCreate, db: Session = Depends(get_db), company_id: uuid.UUID = Depends(get_current_company_id)):
    origem = db.query(Fatura).filter(Fatura.id == fatura_id, Fatura.company_id == company_id).first()
    if not origem:
        raise HTTPException(404, "FT origem não encontrada")
    if origem.tipo_documento == 'nota_credito':
        raise HTTPException(400, "Não pode emitir NC sobre outra NC")
    if origem.status == 'cancelada':
        raise HTTPException(400, f"FT já cancelada/anulada - verifique NC existente")

    ja_tem_nc = db.query(Fatura).filter(
        Fatura.company_id == company_id,
        Fatura.fatura_origem_id == fatura_id,
        Fatura.tipo_documento == 'nota_credito',
        Fatura.status!= 'apagada'
    ).first()
    if ja_tem_nc:
        raise HTTPException(400, f"Esta FT já possui NC {ja_tem_nc.numero_nota_credito} - {ja_tem_nc.motivo_credito}")

    result = fatura_service.criar_nota_credito(db, company_id, fatura_id, dados.motivo, dados.observacoes)

    try:
        origem.status = 'cancelada'
        motivo_formatado = dados.motivo
        if motivo_formatado not in ['01','02','03','04','05']:
            if 'Devolução' in motivo_formatado:
                motivo_formatado = '01 - Devolução de mercadoria'
            elif 'Desconto' in motivo_formatado:
                motivo_formatado = '02 - Desconto comercial'
            elif 'Erro' in motivo_formatado:
                motivo_formatado = '03 - Erro de facturação'
            elif 'Anulação' in motivo_formatado:
                motivo_formatado = '04 - Anulação total'
            else:
                motivo_formatado = f"05 - Outros - {dados.motivo}"

        origem.observacoes = f"{origem.observacoes or ''} | ANULADA POR NC {result.numero_nota_credito} - {motivo_formatado}".strip()
        db.commit()
        db.refresh(origem)
        db.refresh(result)
    except Exception as e:
        logger.warning(f"Falha ao marcar FT origem como cancelada: {e}")
        db.rollback()

    try:
        await manager.broadcast(company_id, {"event": "faturas:changed", "action": "nota_credito", "id": str(result.id), "origem": str(fatura_id), "motivo": dados.motivo})
    except Exception as e:
        logger.warning(f"Falha broadcast: {e}")
    return result

@router.delete("/{fatura_id}")
async def apagar(fatura_id: uuid.UUID, db: Session = Depends(get_db), company_id: uuid.UUID = Depends(get_current_company_id)):
    f = db.query(Fatura).filter(Fatura.id == fatura_id, Fatura.company_id == company_id).first()
    if not f: raise HTTPException(404, "Não encontrada")
    if f.tipo_documento in ['fatura','nota_credito'] and f.hash_agt:
        raise HTTPException(400, "PROIBIDO AGT: FT/NC oficial não pode ser apagada. Use Cancelar (24h) ou Nota de Crédito.")
    f.status = 'apagada'
    db.commit()
    try:
        await manager.broadcast(company_id, {"event": "faturas:changed", "action": "deleted", "id": str(fatura_id)})
    except Exception as e:
        logger.warning(f"Falha broadcast: {e}")
    return {"ok": True}
