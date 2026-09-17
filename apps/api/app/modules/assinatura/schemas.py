from pydantic import BaseModel
from typing import List, Optional
from uuid import UUID

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
    plan_id: str

class CheckoutOut(BaseModel):
    subscription_id: UUID
    reference: str
    amount: int
    payment_url: Optional[str] = None
    status: str

    model_config = {"from_attributes": True}
