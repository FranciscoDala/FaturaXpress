from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime
from uuid import UUID

class ItemCreate(BaseModel):
    produto_id: UUID
    quantidade: float
    preco_unit: Optional[float] = None

class FaturaCreate(BaseModel):
    cliente_id: UUID
    tipo_documento: str = 'proforma'
    itens: List[ItemCreate]
    forma_pagamento: str = 'dinheiro'
    desconto_percent: float = 0
    observacoes: Optional[str] = None
    validade_dias: int = 15

class FaturaUpdate(BaseModel):
    cliente_id: Optional[UUID] = None
    forma_pagamento: Optional[str] = None
    observacoes: Optional[str] = None
    desconto_percent: Optional[float] = None
    itens: Optional[List[ItemCreate]] = None

class ItemResponse(BaseModel):
    id: UUID
    nome_snapshot: str
    quantidade: float
    preco_unit_snapshot: float
    subtotal_linha: float
    iva_percent: float
    class Config:
        from_attributes = True

class FaturaResponse(BaseModel):
    id: UUID
    tipo_documento: str
    status: str
    numero_proforma: Optional[str]
    numero_fatura: Optional[str]
    subtotal: float
    total_iva: float
    total_geral: float
    cliente_id: UUID
    created_at: datetime
    itens: List[ItemResponse] = []
    class Config:
        from_attributes = True
