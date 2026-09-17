from pydantic import BaseModel, Field, field_validator
from typing import List, Optional
from uuid import UUID
from datetime import datetime

class PlanOut(BaseModel):
    id: str
    name: str
    sub: str
    price: str
    price_raw: int
    popular: bool
    features: List[str]
    model_config = {"from_attributes": True}

class CheckoutIn(BaseModel):
    plan_id: str = Field(..., pattern="^(plus|premium|diamond)$", description="free não pode ser comprado")

    @field_validator("plan_id")
    def lower_plan(cls, v: str) -> str:
        return v.lower().strip()

class CheckoutOut(BaseModel):
    subscription_id: UUID
    reference: str
    amount: int
    payment_url: Optional[str] = None
    status: str
    model_config = {"from_attributes": True}

class PagamentoManualOut(BaseModel):
    nome: str
    paypay: str
    kwik: str
    iban: str
    banco: str

class SubscriptionOut(BaseModel):
    id: str
    reference: str
    amount: int
    status: str
    plan_id: str
    provider: str
    created_at: datetime
    model_config = {"from_attributes": True}

class CheckoutInfoOut(BaseModel):
    subscription: SubscriptionOut
    pagamento_manual: PagamentoManualOut
    paypay_disponivel: bool

class ComprovativoOut(BaseModel):
    ok: bool
    status: str
    msg: str

class AdminPendenteOut(BaseModel):
    id: str
    company_id: str
    plan_id: str
    amount: int
    reference: str
    status: str
    comprovativo: Optional[str] = None
    hash: Optional[str] = None
    created_at: datetime
    model_config = {"from_attributes": True}
