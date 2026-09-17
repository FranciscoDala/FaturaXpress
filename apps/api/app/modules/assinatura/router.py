from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Header, Request
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.core.security import get_current_company_id, get_current_user_id
from app.modules.auth.models import Company
from.models import Plan, Subscription
from.schemas import PlanOut, CheckoutIn, CheckoutOut
import uuid, os, hashlib, mimetypes, re
from datetime import datetime, timezone, timedelta
from typing import Optional
import logging

logger = logging.getLogger(__name__)

MODO_TESTE = True
PRECOS_TESTE = {"plus": 1, "premium": 2, "diamond": 3, "free": 0}
PRECOS_TESTE_POR_VALOR = {5000: 1, 8500: 2, 18000: 3}

try:
    from app.modules.assinatura import paypay as paypay_module
    HAS_PAYPAY = paypay_module.is_configured()
except Exception as e:
    paypay_module = None
    HAS_PAYPAY = False
    logger.warning(f"PayPay desabilitado: {e}")

router = APIRouter(prefix="/assinatura", tags=["Assinatura"])

DADOS_PAGAMENTO_MANUAL = {
    "nome": "Francisco Joaquim Miguel Dala",
    "paypay": "958462694",
    "kwik": "958462694",
    "iban": "AO06 0420 0000 0000 0423 1532 6",
    "banco": "BIR"
}

MAX_FILE_SIZE = 5 * 1024 * 1024
ALLOWED_MIMES = {"application/pdf"}
ADMIN_COMPANY_IDS = [s.strip() for s in os.getenv("ADMIN_COMPANY_IDS", "").split(",") if s.strip()]

MSG_INVALIDO = "Comprovativo inválido"
MSG_INVALIDO_DETALHE = "Este comprovativo não é válido."

def is_admin(company_id: uuid.UUID = Depends(get_current_company_id), user_id: uuid.UUID = Depends(get_current_user_id)):
    if ADMIN_COMPANY_IDS:
        if str(company_id) not in ADMIN_COMPANY_IDS:
            raise HTTPException(status_code=403, detail="Acesso admin negado")
    return {"company_id": company_id, "user_id": user_id}

def extract_text_from_file(content: bytes, mime: str, filename: str) -> str:
    text = (filename or "").lower() + "\n"
    try:
        import io as _io
        try:
            from pypdf import PdfReader
            reader = PdfReader(_io.BytesIO(content))
            for page in reader.pages[:2]:
                t = page.extract_text()
                if t: text += t + "\n"
        except ImportError:
            try:
                from PyPDF2 import PdfReader
                reader = PdfReader(_io.BytesIO(content))
                for page in reader.pages[:2]:
                    t = page.extract_text()
                    if t: text += t + "\n"
            except ImportError:
                raw = content.decode('latin-1', errors='ignore')
                text += raw[:20000]
    except Exception as e:
        logger.warning(f"Falha extrair PDF, usando raw: {e}")
        try: text += content.decode('latin-1', errors='ignore')[:20000]
        except: pass
    return text.lower()

def validar_comprovativo_automatico(sub: Subscription, file_text: str) -> tuple[bool, str]:
    low = file_text.lower()
    ref = str(sub.reference).lower()
    ref_curta = ref.split("-")[-1].lower() if "-" in ref else ref
    amount = int(sub.amount)
    if MODO_TESTE and amount <= 10:
        tem_ref = ref in low or (len(ref_curta) >= 4 and ref_curta in low)
        logger.info(f"[TESTE] Validando {ref} amount={amount} tem_ref={tem_ref} -> LIBERADO")
        if tem_ref: return True, "validado em modo teste"
        return True, "validado em modo teste sem ref"
    if "cawissa" in low or "factura proforma" in low or "proforma" in low:
        logger.info(f"BLOQUEADO {ref} é fatura/proforma")
        return False, MSG_INVALIDO
    valores = []
    for m in re.findall(r'(\d{1,3}(?:[.\s]\d{3})+|\d{4,6})', low):
        try:
            v = int(re.sub(r'[.\s]', '', m))
            if 1000 <= v <= 1000000: valores.append(v)
        except: pass
    tem_valor = any(abs(v - amount) <= 500 for v in valores) or str(amount) in low
    tem_ref = ref in low or (len(ref_curta) >= 6 and ref_curta in low)
    tem_benef = any(x in low for x in ["0420", "0423", "1532", "dala", "francisco", "958462694", "925 886 593"])
    logger.info(f"Validando {ref} amount={amount} valores={valores} ref={tem_ref} valor={tem_valor} benef={tem_benef}")
    if tem_ref and tem_valor and tem_benef: return True, "validado"
    if tem_ref and tem_valor: return True, "validado"
    return False, MSG_INVALIDO

def get_preco_teste(plan_id: str, preco_original: int) -> int:
    if not MODO_TESTE: return preco_original
    if plan_id in PRECOS_TESTE: return PRECOS_TESTE[plan_id]
    if preco_original in PRECOS_TESTE_POR_VALOR: return PRECOS_TESTE_POR_VALOR[preco_original]
    return preco_original

# ===== ROTA QUE VOCÊ USA PARA INSERIR PLANOS - NÃO APAGUEI MAIS =====
@router.post("/admin/seed-planos")
def seed_planos(db: Session = Depends(get_db), _admin=Depends(is_admin)):
    """Insere/atualiza planos no DB. Chama 1x para criar os 4 planos com valores de TESTE 1,2,3 Kz"""
    planos_teste = [
        {"id": "free", "name": "FREE", "sub": "Para começar", "price": 0, "price_label": "0", "popular": False, "features": ["1 empresa", "5 faturas/mês", "Suporte por email"], "is_active": True},
        {"id": "plus", "name": "PLUS", "sub": "Mais popular", "price": 1, "price_label": "1,00", "popular": False, "features": ["3 empresas", "100 faturas/mês", "Suporte prioritário"], "is_active": True},
        {"id": "premium", "name": "PREMIUM", "sub": "Para crescer", "price": 2, "price_label": "2,00", "popular": True, "features": ["10 empresas", "500 faturas/mês", "Suporte 24h", "API liberada"], "is_active": True},
        {"id": "diamond", "name": "DIAMOND", "sub": "Ilimitado", "price": 3, "price_label": "3,00", "popular": False, "features": ["Empresas ilimitadas", "Faturas ilimitadas", "Suporte VIP", "White label"], "is_active": True},
    ]

    for p_data in planos_teste:
        existing = db.query(Plan).filter(Plan.id == p_data["id"]).first()
        if existing:
            for k, v in p_data.items():
                setattr(existing, k, v)
        else:
            db.add(Plan(**p_data))
    db.commit()
    return {"ok": True, "msg": "Planos de teste 1,00 / 2,00 / 3,00 Kz inseridos", "planos": planos_teste}

@router.post("/admin/seed-planos-producao")
def seed_planos_producao(db: Session = Depends(get_db), _admin=Depends(is_admin)):
    """Volta para os preços reais 5000 / 8500 / 18000"""
    planos_prod = [
        {"id": "free", "name": "FREE", "sub": "Para começar", "price": 0, "price_label": "0", "popular": False, "features": ["1 empresa", "5 faturas/mês"], "is_active": True},
        {"id": "plus", "name": "PLUS", "sub": "Mais popular", "price": 5000, "price_label": "5.000", "popular": False, "features": ["3 empresas", "100 faturas/mês"], "is_active": True},
        {"id": "premium", "name": "PREMIUM", "sub": "Para crescer", "price": 8500, "price_label": "8.500", "popular": True, "features": ["10 empresas", "500 faturas/mês"], "is_active": True},
        {"id": "diamond", "name": "DIAMOND", "sub": "Ilimitado", "price": 18000, "price_label": "18.000", "popular": False, "features": ["Empresas ilimitadas", "Faturas ilimitadas"], "is_active": True},
    ]
    for p_data in planos_prod:
        existing = db.query(Plan).filter(Plan.id == p_data["id"]).first()
        if existing:
            for k, v in p_data.items(): setattr(existing, k, v)
        else:
            db.add(Plan(**p_data))
    db.commit()
    return {"ok": True, "msg": "Planos de produção restaurados", "planos": planos_prod}

@router.get("/plans", response_model=list[PlanOut])
def list_plans(db: Session = Depends(get_db)):
    plans = db.query(Plan).filter_by(is_active=True).order_by(Plan.price).all()
    result = []
    for p in plans:
        preco_real = int(p.price)
        preco = get_preco_teste(str(p.id), preco_real)
        label = f"{preco:.2f}".replace('.', ',') if MODO_TESTE and preco <= 10 else str(p.price_label)
        if MODO_TESTE:
            if preco == 1: label = "1,00"
            elif preco == 2: label = "2,00"
            elif preco == 3: label = "3,00"
            elif preco == 0: label = "0"
        result.append({"id": str(p.id),"name": str(p.name),"sub": str(p.sub or ""),"price": label,"price_raw": preco,"popular": bool(p.popular),"features": list(p.features or [])})
    return result

@router.post("/checkout", response_model=CheckoutOut)
def create_checkout(body: CheckoutIn, db: Session = Depends(get_db), company_id: uuid.UUID = Depends(get_current_company_id)):
    db.query(Subscription).filter(Subscription.company_id == company_id, Subscription.status == "pending", Subscription.expires_at!= None, Subscription.expires_at < datetime.now(timezone.utc)).update({"status": "expired"}, synchronize_session=False)
    db.commit()
    existing = db.query(Subscription).filter(Subscription.company_id == company_id, Subscription.plan_id == body.plan_id, Subscription.status.in_(["pending", "awaiting_review"])).order_by(Subscription.created_at.desc()).first()
    if existing:
        if existing.expires_at and existing.expires_at > datetime.now(timezone.utc):
            return CheckoutOut(subscription_id=existing.id, reference=str(existing.reference), amount=int(existing.amount), payment_url=existing.payment_url, status=str(existing.status))
        if existing.status == "pending":
            existing.status = "expired"
            db.commit()
    plan = db.query(Plan).filter_by(id=body.plan_id, is_active=True).first()
    if not plan: raise HTTPException(status_code=404, detail="Plano não encontrado")
    if plan.price == 0: raise HTTPException(status_code=400, detail="Plano FREE não pode ser comprado")
    preco_final = get_preco_teste(str(plan.id), int(plan.price))
    ref = f"FX-{plan.id.upper()}-{str(uuid.uuid4())[:8].upper()}"
    sub = Subscription(company_id=company_id, plan_id=str(plan.id), amount=preco_final, reference=ref, status="pending", provider="manual", expires_at=datetime.now(timezone.utc) + timedelta(hours=24))
    db.add(sub); db.commit(); db.refresh(sub)
    return CheckoutOut(subscription_id=sub.id, reference=str(sub.reference), amount=int(sub.amount), payment_url=sub.payment_url, status=str(sub.status))

@router.get("/checkout/{subscription_id}")
def get_checkout_info(subscription_id: uuid.UUID, db: Session = Depends(get_db), company_id: uuid.UUID = Depends(get_current_company_id)):
    sub = db.query(Subscription).filter(Subscription.id == subscription_id, Subscription.company_id == company_id).first()
    if not sub: raise HTTPException(status_code=404, detail="Assinatura não encontrada")
    return {"subscription": {"id": str(sub.id),"reference": sub.reference,"amount": sub.amount,"status": sub.status,"plan_id": sub.plan_id,"provider": sub.provider,"created_at": sub.created_at},"pagamento_manual": DADOS_PAGAMENTO_MANUAL,"paypay_disponivel": HAS_PAYPAY}

@router.post("/comprovativo/{subscription_id}")
def enviar_comprovativo(subscription_id: uuid.UUID, file: UploadFile = File(...), db: Session = Depends(get_db), company_id: uuid.UUID = Depends(get_current_company_id)):
    sub = db.query(Subscription).filter(Subscription.id == subscription_id, Subscription.company_id == company_id).first()
    if not sub: raise HTTPException(status_code=404, detail="Assinatura não encontrada")
    if sub.status not in ("pending", "awaiting_review"): raise HTTPException(status_code=400, detail=f"Assinatura já está {sub.status}")
    content = file.file.read()
    if len(content) > MAX_FILE_SIZE: raise HTTPException(status_code=400, detail=MSG_INVALIDO)
    if len(content) < 5 * 1024: raise HTTPException(status_code=400, detail=MSG_INVALIDO)
    if len(content) == 0: raise HTTPException(status_code=400, detail=MSG_INVALIDO)
    mime = file.content_type or mimetypes.guess_type(file.filename or "")[0] or ""
    if mime not in ALLOWED_MIMES and not (file.filename or "").lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail=MSG_INVALIDO)
    file_hash = hashlib.sha256(content).hexdigest()
    dup = db.query(Subscription).filter(Subscription.comprovativo_hash == file_hash).first()
    if dup and str(dup.id)!= str(sub.id): raise HTTPException(status_code=400, detail="Este comprovativo já foi usado")
    os.makedirs("/tmp/comprovativos", exist_ok=True)
    safe_name = f"{subscription_id}_{int(datetime.now(timezone.utc).timestamp())}_{file_hash[:8]}.pdf"
    path = f"/tmp/comprovativos/{safe_name}"
    with open(path, "wb") as f: f.write(content)
    file_text = extract_text_from_file(content, mime, file.filename or "")
    aprovado, motivo = validar_comprovativo_automatico(sub, file_text)
    sub.comprovativo_url = path
    sub.comprovativo_hash = file_hash
    sub.payment_phone = DADOS_PAGAMENTO_MANUAL["paypay"]
    if aprovado:
        sub.status = "paid"
        sub.paid_at = datetime.now(timezone.utc)
        company = db.query(Company).filter(Company.id == sub.company_id).first()
        if company:
            company.subscription_plan = sub.plan_id
            company.subscription_status = "active"
        db.commit()
        logger.info(f"AUTO-APROVADO {sub.reference}")
        return {"ok": True, "status": "paid", "msg": "Pagamento validado! Plano liberado."}
    else:
        sub.status = "awaiting_review"
        db.commit()
        logger.info(f"AWAITING_REVIEW {sub.reference} motivo interno: {motivo}")
        return {"ok": True, "status": "awaiting_review", "msg": MSG_INVALIDO_DETALHE}

@router.get("/me")
def my_subscription(db: Session = Depends(get_db), company_id: uuid.UUID = Depends(get_current_company_id)):
    company = db.query(Company).filter(Company.id == company_id).first()
    last = db.query(Subscription).filter(Subscription.company_id == company_id).order_by(Subscription.created_at.desc()).first()
    return {"current_plan": getattr(company, 'subscription_plan', 'free') if company else 'free',"status": getattr(company, 'subscription_status', 'active') if company else 'active',"last_subscription": {"id": str(last.id),"plan_id": str(last.plan_id),"status": str(last.status),"reference": str(last.reference)} if last else None}

@router.get("/admin/pendentes")
def listar_pendentes(db: Session = Depends(get_db), _admin=Depends(is_admin)):
    pendentes = db.query(Subscription).filter(Subscription.status == "awaiting_review").order_by(Subscription.created_at.asc()).all()
    return [{"id": str(s.id),"company_id": str(s.company_id),"plan_id": s.plan_id,"amount": s.amount,"reference": s.reference,"status": s.status,"comprovativo": getattr(s, 'comprovativo_url', None),"hash": getattr(s, 'comprovativo_hash', None),"created_at": s.created_at} for s in pendentes]

@router.post("/admin/aprovar/{subscription_id}")
def aprovar_pagamento(subscription_id: uuid.UUID, db: Session = Depends(get_db), _admin=Depends(is_admin)):
    sub = db.query(Subscription).filter(Subscription.id == subscription_id).first()
    if not sub: raise HTTPException(status_code=404, detail="Não encontrado")
    if sub.status == "paid": raise HTTPException(status_code=400, detail="Já está pago")
    sub.status = "paid"
    sub.paid_at = datetime.now(timezone.utc)
    company = db.query(Company).filter(Company.id == sub.company_id).first()
    if company:
        company.subscription_plan = sub.plan_id
        company.subscription_status = "active"
    db.commit()
    return {"ok": True, "plano_ativado": sub.plan_id, "company_id": str(sub.company_id)}

@router.post("/admin/rejeitar/{subscription_id}")
def rejeitar_pagamento(subscription_id: uuid.UUID, motivo: str = "Comprovativo inválido", db: Session = Depends(get_db), _admin=Depends(is_admin)):
    sub = db.query(Subscription).filter(Subscription.id == subscription_id).first()
    if not sub: raise HTTPException(status_code=404, detail="Não encontrado")
    sub.status = "rejected"
    db.commit()
    return {"ok": True, "motivo": motivo}

@router.post("/webhook/paypay")
async def webhook_paypay(request: Request, db: Session = Depends(get_db), x_signature: Optional[str] = Header(None)):
    body = await request.body()
    body_str = body.decode()
    if HAS_PAYPAY and x_signature and paypay_module:
        if not paypay_module.verify_paypay_signature(body_str, x_signature):
            raise HTTPException(status_code=401, detail="Assinatura inválida")
    try: payload = await request.json()
    except: payload = {}
    out_trade_no = payload.get("out_trade_no") or payload.get("reference") or ""
    status_paypay = payload.get("status") or payload.get("trade_status") or ""
    if not out_trade_no: return {"ok": False, "msg": "sem out_trade_no"}
    if str(status_paypay).upper() not in ("SUCCESS", "PAID", "COMPLETED", "TRADE_SUCCESS"): return {"ok": True, "msg": f"ignorado status {status_paypay}"}
    sub = db.query(Subscription).filter(Subscription.reference == out_trade_no).first()
    if not sub:
        try: sub = db.query(Subscription).filter(Subscription.reference.ilike(f"%{out_trade_no.split('-')[0]}%")).first()
        except: sub = None
    if sub and sub.status!= "paid":
        try: amount_paypay = int(float(payload.get("total_amount", sub.amount)))
        except: amount_paypay = int(sub.amount)
        if not MODO_TESTE and amount_paypay < int(sub.amount): raise HTTPException(status_code=400, detail=MSG_INVALIDO)
        sub.status = "paid"
        sub.paid_at = datetime.now(timezone.utc)
        company = db.query(Company).filter(Company.id == sub.company_id).first()
        if company:
            company.subscription_plan = sub.plan_id
            company.subscription_status = "active"
        db.commit()
    return {"ok": True}
