from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Header, Request
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.core.security import get_current_company_id, get_current_user_id
from app.modules.auth.models import Company
from.models import Plan, Subscription
from.schemas import PlanOut, CheckoutIn, CheckoutOut
import uuid, os, hashlib, mimetypes
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
ADMIN_COMPANY_IDS = os.getenv("ADMIN_COMPANY_IDS", "").split(",") # coloca teu company_id no.env

# --- Segurança Admin - usa company_id que já tens ---
def is_admin(
    company_id: uuid.UUID = Depends(get_current_company_id),
    user_id: uuid.UUID = Depends(get_current_user_id)
):
    # Se tiver ADMIN_COMPANY_IDS no env, verifica
    if ADMIN_COMPANY_IDS and ADMIN_COMPANY_IDS[0]!= "":
        if str(company_id) not in [s.strip() for s in ADMIN_COMPANY_IDS]:
            raise HTTPException(status_code=403, detail="Acesso admin negado")
    # Se não tiver lista, por enquanto libera mas loga - depois tu tranca
    # Quando tiver role no Company, descomenta:
    # if getattr(company, 'role', 'user')!= 'admin':
    # raise HTTPException(403)
    return {"company_id": company_id, "user_id": user_id}

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
    recent = db.query(Subscription).filter(
        Subscription.company_id == company_id,
        Subscription.status.in_(["pending", "awaiting_review"]),
        Subscription.created_at > datetime.now(timezone.utc) - timedelta(minutes=10)
    ).first()
    if recent:
        raise HTTPException(status_code=429, detail=f"Já existe pagamento pendente {recent.reference}. Aguarde 10min.")

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

    sub.comprovativo_url = path # type: ignore
    sub.comprovativo_hash = file_hash # type: ignore
    sub.payment_phone = DADOS_PAGAMENTO_MANUAL["paypay"] # type: ignore
    sub.status = "awaiting_review" # type: ignore
    db.commit()

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
        sub = db.query(Subscription).filter(Subscription.reference.contains(out_trade_no.split("-")[0])).first()

    if sub and sub.status!= "paid":
        amount_paypay = int(payload.get("total_amount", sub.amount))
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
