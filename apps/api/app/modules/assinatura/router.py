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

# Import seguro do paypay - evita "paypay possivelmente não está associado"
try:
    from app.modules.assinatura import paypay as paypay_module
    HAS_PAYPAY = paypay_module.is_configured()
except Exception as e:
    paypay_module = None # type: ignore
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
ALLOWED_MIMES = {"image/jpeg", "image/png", "image/webp", "application/pdf"}
ADMIN_COMPANY_IDS = [s.strip() for s in os.getenv("ADMIN_COMPANY_IDS", "").split(",") if s.strip()]

# --- Segurança Admin - usa company_id que já tens ---
def is_admin(
    company_id: uuid.UUID = Depends(get_current_company_id),
    user_id: uuid.UUID = Depends(get_current_user_id)
):
    if ADMIN_COMPANY_IDS:
        if str(company_id) not in ADMIN_COMPANY_IDS:
            raise HTTPException(status_code=403, detail="Acesso admin negado")
    return {"company_id": company_id, "user_id": user_id}

# --- OCR leve para validar comprovativo - SEM pytesseract ---
def extract_text_from_file(content: bytes, mime: str, filename: str) -> str:
    text = filename.lower()
    if "pdf" in mime or filename.lower().endswith(".pdf"):
        try:
            import io as _io
            from PyPDF2 import PdfReader # type: ignore
            reader = PdfReader(_io.BytesIO(content))
            for page in reader.pages[:2]:
                t = page.extract_text()
                if t:
                    text += "\n" + t
        except Exception:
            pass
    return text.lower()

def validar_comprovativo_automatico(sub: Subscription, file_text: str) -> tuple[bool, str]:
    ref = str(sub.reference).lower()
    ref_curta = ref.split("-")[-1].lower() if "-" in ref else ref
    amount = int(sub.amount)
    valores = []
    for m in re.findall(r'(\d{1,3}(?:[.\s]\d{3})+|\d{4,6})', file_text):
        try:
            v = int(re.sub(r'[.\s]', '', m))
            if 1000 <= v <= 1000000:
                valores.append(v)
        except:
            pass
    tem_valor = any(v >= amount and v <= amount + 500 for v in valores)
    tem_ref = ref in file_text or ref_curta in file_text
    logger.info(f"Validando {ref} amount={amount} valores={valores} ref={tem_ref}")
    if tem_ref and (tem_valor or len(valores) == 0):
        return True, f"Auto-aprovado: ref {ref} + valor {amount} compatível"
    if tem_valor and amount <= 10000:
        return True, f"Auto-aprovado: valor {valores} compatível com {amount}"
    return False, f"Para revisão: valores={valores} ref={tem_ref}"

@router.get("/plans", response_model=list[PlanOut])
def list_plans(db: Session = Depends(get_db)):
    plans = db.query(Plan).filter_by(is_active=True).order_by(Plan.price).all()
    return [
        {
            "id": str(p.id),
            "name": str(p.name),
            "sub": str(p.sub or ""),
            "price": str(p.price_label),
            "price_raw": int(p.price),
            "popular": bool(p.popular),
            "features": list(p.features or [])
        } for p in plans
    ]

# ROTA TEMPORÁRIA PARA SEED NO NEON
# # ROTA TEMPORÁRIA PARA SEED NO NEON - COMENTADA APÓS USO
# @router.post("/seed")
# def seed_plans(db: Session = Depends(get_db)):
# plans_data = [
# {"id":"free","name":"FREE","sub":"Para testar grátis","price":0,"price_label":"0","popular":False,"features":["05 Faturas por mês","Biblioteca Básica","1 Empresa","Suporte por email","Acesso imediato"]},
# {"id":"plus","name":"PLUS","sub":"Para quem está começando","price":5000,"price_label":"5.000","popular":False,"features":["05 Faturas por mês","Biblioteca Básica","1 Empresa","Suporte por email","Acesso imediato"]},
# {"id":"premium","name":"PREMIUM","sub":"Para negócios profissionais","price":8500,"price_label":"8.500","popular":True,"features":["Faturas ilimitadas","Biblioteca Premium","Fatura AGT FT + SAFT","QR Code AGT","Suporte WhatsApp"]},
# {"id":"diamond","name":"DIAMOND","sub":"Para Agências e Equipes","price":18000,"price_label":"18.000","popular":False,"features":["Tudo do Premium","Multi-empresas","API e Webhooks","Suporte prioritário","Onboarding dedicado"]},
# ]
# created = 0
# for p in plans_data:
# if not db.query(Plan).filter_by(id=p["id"]).first():
# db.add(Plan(**p))
# created += 1
# db.commit()
# return {"ok": True, "created": created, "total": db.query(Plan).count()}

@router.post("/checkout", response_model=CheckoutOut)
def create_checkout(
    body: CheckoutIn,
    db: Session = Depends(get_db),
    company_id: uuid.UUID = Depends(get_current_company_id)
):
    db.query(Subscription).filter(
        Subscription.company_id == company_id,
        Subscription.status == "pending",
        Subscription.expires_at!= None,
        Subscription.expires_at < datetime.now(timezone.utc)
    ).update({"status": "expired"}, synchronize_session=False)
    db.commit()

    existing = db.query(Subscription).filter(
        Subscription.company_id == company_id,
        Subscription.plan_id == body.plan_id,
        Subscription.status.in_(["pending", "awaiting_review"])
    ).order_by(Subscription.created_at.desc()).first()

    if existing:
        if existing.expires_at and existing.expires_at > datetime.now(timezone.utc):
            return CheckoutOut(
                subscription_id=existing.id,
                reference=str(existing.reference),
                amount=int(existing.amount),
                payment_url=existing.payment_url,
                status=str(existing.status)
            )
        if existing.status == "pending":
            existing.status = "expired" # type: ignore
            db.commit()

    plan = db.query(Plan).filter_by(id=body.plan_id, is_active=True).first()
    if not plan:
        raise HTTPException(status_code=404, detail="Plano não encontrado")
    if plan.price == 0:
        raise HTTPException(status_code=400, detail="Plano FREE não pode ser comprado")

    ref = f"FX-{plan.id.upper()}-{str(uuid.uuid4())[:8].upper()}"
    sub = Subscription(
        company_id=company_id,
        plan_id=str(plan.id),
        amount=int(plan.price),
        reference=ref,
        status="pending",
        provider="manual",
        expires_at=datetime.now(timezone.utc) + timedelta(hours=24)
    )
    db.add(sub)
    db.commit()
    db.refresh(sub)

    return CheckoutOut(
        subscription_id=sub.id,
        reference=str(sub.reference),
        amount=int(sub.amount),
        payment_url=sub.payment_url,
        status=str(sub.status)
    )

@router.get("/checkout/{subscription_id}")
def get_checkout_info(
    subscription_id: uuid.UUID,
    db: Session = Depends(get_db),
    company_id: uuid.UUID = Depends(get_current_company_id)
):
    sub = db.query(Subscription).filter(Subscription.id == subscription_id, Subscription.company_id == company_id).first()
    if not sub:
        raise HTTPException(status_code=404, detail="Assinatura não encontrada")

    return {
        "subscription": {
            "id": str(sub.id),
            "reference": sub.reference,
            "amount": sub.amount,
            "status": sub.status,
            "plan_id": sub.plan_id,
            "provider": sub.provider,
            "created_at": sub.created_at
        },
        "pagamento_manual": DADOS_PAGAMENTO_MANUAL,
        "paypay_disponivel": HAS_PAYPAY
    }

@router.post("/comprovativo/{subscription_id}")
def enviar_comprovativo(
    subscription_id: uuid.UUID,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    company_id: uuid.UUID = Depends(get_current_company_id)
):
    sub = db.query(Subscription).filter(Subscription.id == subscription_id, Subscription.company_id == company_id).first()
    if not sub:
        raise HTTPException(status_code=404, detail="Assinatura não encontrada")
    if sub.status not in ("pending", "awaiting_review"):
        raise HTTPException(status_code=400, detail=f"Assinatura já está {sub.status}")

    content = file.file.read()
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(status_code=400, detail="Arquivo muito grande (max 5MB)")
    if len(content) == 0:
        raise HTTPException(status_code=400, detail="Arquivo vazio")

    mime = file.content_type or mimetypes.guess_type(file.filename or "")[0] or ""
    if mime not in ALLOWED_MIMES:
        raise HTTPException(status_code=400, detail=f"Tipo não permitido: {mime}. Use JPG, PNG ou PDF")

    file_hash = hashlib.sha256(content).hexdigest()

    dup = db.query(Subscription).filter(Subscription.comprovativo_hash == file_hash).first()
    if dup and str(dup.id)!= str(sub.id):
        raise HTTPException(status_code=400, detail="Este comprovativo já foi usado")

    os.makedirs("/tmp/comprovativos", exist_ok=True)
    original = file.filename or "comprovativo.jpg"
    ext = original.split(".")[-1].lower()[:5] if "." in original else "jpg"
    if ext not in ("jpg","jpeg","png","webp","pdf"):
        ext = "jpg"
    safe_name = f"{subscription_id}_{int(datetime.now(timezone.utc).timestamp())}_{file_hash[:8]}.{ext}"
    path = f"/tmp/comprovativos/{safe_name}"

    with open(path, "wb") as f:
        f.write(content)

    file_text = extract_text_from_file(content, mime, original)
    aprovado, motivo = validar_comprovativo_automatico(sub, file_text)

    sub.comprovativo_url = path # type: ignore
    sub.comprovativo_hash = file_hash # type: ignore
    sub.payment_phone = DADOS_PAGAMENTO_MANUAL["paypay"] # type: ignore

    if aprovado:
        sub.status = "paid" # type: ignore
        sub.paid_at = datetime.now(timezone.utc) # type: ignore
        company = db.query(Company).filter(Company.id == sub.company_id).first()
        if company:
            company.subscription_plan = sub.plan_id # type: ignore
            company.subscription_status = "active" # type: ignore
        db.commit()
        logger.info(f"AUTO-APROVADO {sub.reference} empresa {sub.company_id}: {motivo}")
        return {"ok": True, "status": "paid", "msg": f"Pagamento validado! Plano {sub.plan_id.upper()} liberado automaticamente. {motivo}"}
    else:
        sub.status = "awaiting_review" # type: ignore
        db.commit()
        logger.info(f"AWAITING_REVIEW {sub.reference}: {motivo}")
        return {"ok": True, "status": "awaiting_review", "msg": "Comprovativo recebido, validação em até 30min"}

@router.get("/me")
def my_subscription(
    db: Session = Depends(get_db),
    company_id: uuid.UUID = Depends(get_current_company_id)
):
    company = db.query(Company).filter(Company.id == company_id).first()
    last = db.query(Subscription).filter(Subscription.company_id == company_id).order_by(Subscription.created_at.desc()).first()
    return {
        "current_plan": getattr(company, 'subscription_plan', 'free') if company else 'free',
        "status": getattr(company, 'subscription_status', 'active') if company else 'active',
        "last_subscription": {
            "id": str(last.id),
            "plan_id": str(last.plan_id),
            "status": str(last.status),
            "reference": str(last.reference)
        } if last else None
    }

@router.get("/admin/pendentes")
def listar_pendentes(db: Session = Depends(get_db), _admin=Depends(is_admin)):
    pendentes = db.query(Subscription).filter(Subscription.status == "awaiting_review").order_by(Subscription.created_at.asc()).all()
    return [
        {
            "id": str(s.id),
            "company_id": str(s.company_id),
            "plan_id": s.plan_id,
            "amount": s.amount,
            "reference": s.reference,
            "status": s.status,
            "comprovativo": getattr(s, 'comprovativo_url', None),
            "hash": getattr(s, 'comprovativo_hash', None),
            "created_at": s.created_at
        } for s in pendentes
    ]

@router.post("/admin/aprovar/{subscription_id}")
def aprovar_pagamento(subscription_id: uuid.UUID, db: Session = Depends(get_db), _admin=Depends(is_admin)):
    sub = db.query(Subscription).filter(Subscription.id == subscription_id).first()
    if not sub:
        raise HTTPException(status_code=404, detail="Não encontrado")
    if sub.status == "paid":
        raise HTTPException(status_code=400, detail="Já está pago")

    sub.status = "paid" # type: ignore
    sub.paid_at = datetime.now(timezone.utc) # type: ignore

    company = db.query(Company).filter(Company.id == sub.company_id).first()
    if company:
        company.subscription_plan = sub.plan_id # type: ignore
        company.subscription_status = "active" # type: ignore

    db.commit()
    logger.info(f"Plano {sub.plan_id} ativado para empresa {sub.company_id} ref {sub.reference}")
    return {"ok": True, "plano_ativado": sub.plan_id, "company_id": str(sub.company_id)}

@router.post("/admin/rejeitar/{subscription_id}")
def rejeitar_pagamento(subscription_id: uuid.UUID, motivo: str = "Comprovativo inválido", db: Session = Depends(get_db), _admin=Depends(is_admin)):
    sub = db.query(Subscription).filter(Subscription.id == subscription_id).first()
    if not sub:
        raise HTTPException(status_code=404, detail="Não encontrado")
    sub.status = "rejected" # type: ignore
    db.commit()
    return {"ok": True, "motivo": motivo}

@router.post("/webhook/paypay")
async def webhook_paypay(request: Request, db: Session = Depends(get_db), x_signature: Optional[str] = Header(None)):
    body = await request.body()
    body_str = body.decode()

    if HAS_PAYPAY and x_signature and paypay_module:
        if not paypay_module.verify_paypay_signature(body_str, x_signature):
            raise HTTPException(status_code=401, detail="Assinatura inválida")

    try:
        payload = await request.json()
    except:
        payload = {}

    out_trade_no = payload.get("out_trade_no") or payload.get("reference") or ""
    status_paypay = payload.get("status") or payload.get("trade_status") or ""

    if not out_trade_no:
        return {"ok": False, "msg": "sem out_trade_no"}

    if str(status_paypay).upper() not in ("SUCCESS", "PAID", "COMPLETED", "TRADE_SUCCESS"):
        return {"ok": True, "msg": f"ignorado status {status_paypay}"}

    sub = db.query(Subscription).filter(Subscription.reference == out_trade_no).first()
    if not sub:
        try:
            sub = db.query(Subscription).filter(Subscription.reference.ilike(f"%{out_trade_no.split('-')[0]}%")).first()
        except Exception:
            sub = None

    if sub and sub.status!= "paid":
        try:
            amount_paypay = int(float(payload.get("total_amount", sub.amount)))
        except Exception:
            amount_paypay = int(sub.amount)

        if amount_paypay < int(sub.amount):
            raise HTTPException(status_code=400, detail="Valor pago menor que o plano")

        sub.status = "paid" # type: ignore
        sub.paid_at = datetime.now(timezone.utc) # type: ignore
        company = db.query(Company).filter(Company.id == sub.company_id).first()
        if company:
            company.subscription_plan = sub.plan_id # type: ignore
            company.subscription_status = "active" # type: ignore
        db.commit()

    return {"ok": True}
