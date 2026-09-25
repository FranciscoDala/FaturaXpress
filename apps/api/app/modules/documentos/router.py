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

def _gerar_pdf_reportlab(doc: DocumentoGerado, empresa, funcionario=None):
    #... mantém igual ao teu anterior...
    import io, base64, os, requests, tempfile
    from reportlab.lib.pagesizes import A4
    from reportlab.lib.units import mm
    from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, Image as RLImage
    from reportlab.lib.styles import ParagraphStyle
    from reportlab.lib import colors
    from reportlab.lib.utils import ImageReader
    def get_val(keys, default=""):
        for k in keys:
            if hasattr(empresa, k):
                v = getattr(empresa, k)
                if v: return str(v)
        return default
    emp_nome = get_val(["companyName","nome","razao_social","nome_fantasia"], "Empresa")
    emp_nif = get_val(["nif"], ""); emp_end = get_val(["address","endereco"], "")
    emp_tel = get_val(["phone","telefone"], ""); emp_email = get_val(["email"], ""); emp_cidade = get_val(["city","cidade"], "Luanda")
    raw_logo = get_val(["logo_url","image_url","logo","companyLogo"], "")
    logo_bytes = None; logo_temp_path = None
    if raw_logo:
        try:
            if raw_logo.startswith("http"):
                r = requests.get(raw_logo, timeout=4)
                if r.status_code==200: logo_bytes = r.content
            elif raw_logo.startswith("data:"):
                _, b64 = raw_logo.split(",",1); logo_bytes = base64.b64decode(b64)
            elif os.path.exists(raw_logo):
                with open(raw_logo, "rb") as f: logo_bytes = f.read()
            if logo_bytes:
                fd, logo_temp_path = tempfile.mkstemp(suffix=".png")
                os.write(fd, logo_bytes); os.close(fd)
        except: logo_bytes = None
    buffer = io.BytesIO()
    pdf = SimpleDocTemplate(buffer, pagesize=A4, leftMargin=18*mm, rightMargin=18*mm, topMargin=12*mm, bottomMargin=18*mm)
    s_normal = ParagraphStyle('n', fontName='Helvetica', fontSize=9.5, leading=13)
    s_small = ParagraphStyle('s', fontName='Helvetica', fontSize=7.5, leading=9)
    s_bold = ParagraphStyle('b', fontName='Helvetica-Bold', fontSize=10, leading=12)
    def background(canvas, doc_obj):
        canvas.saveState()
        if logo_bytes:
            try:
                canvas.setFillAlpha(0.10)
                img_reader = ImageReader(io.BytesIO(logo_bytes))
                canvas.drawImage(img_reader, A4[0]/2-150, A4[1]/2-100, width=300, height=300, mask='auto', preserveAspectRatio=True)
            except: pass
        canvas.setFillAlpha(1); canvas.setFont("Helvetica", 7)
        canvas.drawString(18*mm, 10*mm, f"{emp_end} - Código: {doc.codigo_verificacao} | Pág. {doc_obj.page}")
        canvas.restoreState()
    story=[]
    emp_info = Paragraph(f"<b>{emp_nome}</b><br/>NIF: {emp_nif}<br/>Endereço: {emp_end}<br/>Contactos: {emp_tel}<br/>Email: {emp_email}<br/>{emp_cidade}", s_normal)
    if logo_temp_path: logo_img = RLImage(logo_temp_path, width=110, height=90, kind='proportional'); t = Table([[logo_img, emp_info]], colWidths=[110, 380])
    else: t = Table([[Paragraph(f"<b>{emp_nome[0] if emp_nome else 'E'}</b>", s_bold), emp_info]], colWidths=[110,380])
    t.setStyle(TableStyle([('VALIGN',(0,0),(-1,-1),'TOP')])); story.append(t); story.append(Spacer(1,8))
    vars_p = doc.variaveis_preenchidas or {}
    titulo = Paragraph(f"<b>CONTRATO DE TRABALHO POR TEMPO INDETERMINADO</b>", s_normal)
    codigo = Paragraph(f"<b>{doc.codigo_verificacao}</b>", s_small)
    t2 = Table([[titulo, codigo]], colWidths=[350,140])
    t2.setStyle(TableStyle([('BOX',(0,0),(-1,-1),0.5,colors.grey),('BACKGROUND',(0,0),(-1,-1),colors.HexColor("#E9E9E9"))]))
    story.append(t2); story.append(Spacer(1,8))
    boxes = [[Paragraph(f"<b>FUNCIONARIO</b><br/>{vars_p.get('nome_funcionario','---')}", s_small), Paragraph(f"<b>BI</b><br/>{vars_p.get('bi','---')}", s_small), Paragraph(f"<b>CARGO</b><br/>{vars_p.get('cargo','---')}", s_small), Paragraph(f"<b>ADMISSÃO</b><br/>{vars_p.get('data_admissao','---')}", s_small), Paragraph(f"<b>SALÁRIO</b><br/>{vars_p.get('salario_base_formatado','---')}", s_small)]]
    bt = Table(boxes, colWidths=[110,90,80,90,120]); bt.setStyle(TableStyle([('GRID',(0,0),(-1,-1),0.5,colors.HexColor("#bbb")),('ALIGN',(0,0),(-1,-1),'CENTER')])); story.append(bt); story.append(Spacer(1,10))
    import re; html = doc.conteudo_html_final or ""; ps = re.findall(r'<p[^>]*>(.*?)</p>', html, re.IGNORECASE|re.DOTALL)
    for p in ps:
        clean = re.sub(r'<[^>]+>', '', p).strip()
        if clean: story.append(Paragraph(clean, s_normal)); story.append(Spacer(1,5))
    story.append(Spacer(1,30))
    ass = [[Paragraph("_________________________<br/>Entidade Empregadora", s_small), Paragraph(f"_________________________<br/>Trabalhador<br/>{vars_p.get('nome_funcionario','')}", s_small)]]
    t_ass = Table(ass, colWidths=[245,245]); t_ass.setStyle(TableStyle([('ALIGN',(0,0),(-1,-1),'CENTER')])); story.append(t_ass)
    pdf.build(story, onFirstPage=background, onLaterPages=background)
    if logo_temp_path and os.path.exists(logo_temp_path):
        try: os.unlink(logo_temp_path)
        except: pass
    buffer.seek(0); return buffer.getvalue()

@router.post("/seed-modelos")
def seed_endpoint(db: Session = Depends(get_db), company_id: uuid.UUID = Depends(get_current_company_id)):
    seed_modelos(db, company_id)
    return {"ok": True}

# ===== NOVO ENDPOINT - TEM QUE VIR ANTES DO {modelo_id} =====
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
    try:
        pdf_bytes = _gerar_pdf_reportlab(doc, empresa)
        filename = (doc.nome_arquivo or f"contrato-{doc.codigo_verificacao}").replace(" ", "_") + ".pdf"
        return Response(content=pdf_bytes, media_type="application/pdf", headers={"Content-Disposition": f"inline; filename=\"{filename}\"", "Content-Length": str(len(pdf_bytes))})
    except Exception as e:
        print(f"[PDF ReportLab falhou] {e}")
        from weasyprint import HTML
        html_final = ensure_utf8_html(doc.conteudo_html_final)
        pdf_bytes = HTML(string=html_final, base_url=str(request.base_url)).write_pdf(presentational_hints=True)
        filename = (doc.nome_arquivo or f"contrato-{doc.codigo_verificacao}").replace(" ", "_") + ".pdf"
        return Response(content=pdf_bytes, media_type="application/pdf", headers={"Content-Disposition": f"inline; filename=\"{filename}\""})
