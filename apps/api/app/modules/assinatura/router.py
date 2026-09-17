from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.core.security import get_current_company_id
from app.modules.auth.models import Company
from.models import Plan, Subscription
from.schemas import PlanOut, CheckoutIn, CheckoutOut
import uuid

router = APIRouter(prefix="/assinatura", tags=["Assinatura"])

@router.get("/plans", response_model=list[PlanOut])
def list_plans(db: Session = Depends(get_db)):
    plans = db.query(Plan).filter(Plan.is_active == True).order_by(Plan.price).all()
    result = []
    for p in plans:
        result.append({
            "id": str(p.id),
            "name": str(p.name),
            "sub": str(p.sub or ""),
            "price": str(p.price_label),
            "price_raw": int(p.price),
            "popular": bool(p.popular),
            "features": list(p.features or [])
        })
    return result

# ROTA TEMPORÁRIA PARA SEED NO NEON
# # ROTA TEMPORÁRIA PARA SEED NO NEON - COMENTADA APÓS USO
# @router.post("/seed")
# def seed_plans(db: Session = Depends(get_db)):
#     plans_data = [
#       {"id":"free","name":"FREE","sub":"Para testar grátis","price":0,"price_label":"0","popular":False,"features":["05 Faturas por mês","Biblioteca Básica","1 Empresa","Suporte por email","Acesso imediato"]},
#       {"id":"plus","name":"PLUS","sub":"Para quem está começando","price":5000,"price_label":"5.000","popular":False,"features":["05 Faturas por mês","Biblioteca Básica","1 Empresa","Suporte por email","Acesso imediato"]},
#       {"id":"premium","name":"PREMIUM","sub":"Para negócios profissionais","price":8500,"price_label":"8.500","popular":True,"features":["Faturas ilimitadas","Biblioteca Premium","Fatura AGT FT + SAFT","QR Code AGT","Suporte WhatsApp"]},
#       {"id":"diamond","name":"DIAMOND","sub":"Para Agências e Equipes","price":18000,"price_label":"18.000","popular":False,"features":["Tudo do Premium","Multi-empresas","API e Webhooks","Suporte prioritário","Onboarding dedicado"]},
#     ]
#     created = 0
#     for p in plans_data:
#         if not db.query(Plan).filter_by(id=p["id"]).first():
#             db.add(Plan(**p))
#             created += 1
#     db.commit()
#     return {"ok": True, "created": created, "total": db.query(Plan).count()}


@router.post("/checkout", response_model=CheckoutOut)
def create_checkout(
    body: CheckoutIn,
    db: Session = Depends(get_db),
    company_id: uuid.UUID = Depends(get_current_company_id)
):
    plan = db.query(Plan).filter(Plan.id == body.plan_id, Plan.is_active == True).first()
    if not plan:
        raise HTTPException(status_code=404, detail="Plano não encontrado")

    company = db.query(Company).filter(Company.id == company_id).first()
    if not company:
        raise HTTPException(status_code=404, detail="Empresa não encontrada")

    if plan.price == 0:
        raise HTTPException(status_code=400, detail="Plano FREE já é gratuito")

    ref = f"FX-{plan.id.upper()}-{str(uuid.uuid4())[:8].upper()}"
    sub = Subscription(
        company_id=company_id,
        plan_id=str(plan.id),
        amount=int(plan.price),
        reference=ref,
        status="pending",
        provider="xpress"
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

@router.get("/me")
def my_subscription(
    db: Session = Depends(get_db),
    company_id: uuid.UUID = Depends(get_current_company_id)
):
    company = db.query(Company).filter(Company.id == company_id).first()
    last = db.query(Subscription).filter(
        Subscription.company_id == company_id
    ).order_by(Subscription.created_at.desc()).first()

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
