from pydantic import BaseModel, Field, field_validator, model_validator
from typing import List, Optional, Literal
from datetime import datetime
from uuid import UUID

class ItemCreate(BaseModel):
    produto_id: UUID
    quantidade: float = Field(..., gt=0, description="Tem que ser > 0")
    preco_unit: Optional[float] = Field(None, ge=0)

class FaturaCreate(BaseModel):
    cliente_id: Optional[UUID] = None
    cliente_nome: Optional[str] = Field(None, max_length=255)
    cliente_nif: Optional[str] = Field(None, max_length=20)
    cliente_email: Optional[str] = None
    cliente_telefone: Optional[str] = None
    cliente_endereco: Optional[str] = None
    salvar_como_cliente: bool = False
    tipo_documento: Literal['proforma', 'fatura'] = 'proforma'
    itens: List[ItemCreate] = Field(..., min_length=1, description="Mínimo 1 item")
    forma_pagamento: Literal['dinheiro', 'transferencia', 'multicaixa', 'credito'] = 'dinheiro'
    desconto_percent: float = Field(0, ge=0, le=100)
    observacoes: Optional[str] = Field(None, max_length=1000)
    validade_dias: int = Field(15, ge=1, le=90)
    motivo_isencao: Optional[str] = None

    @field_validator('tipo_documento')
    @classmethod
    def valida_tipo(cls, v):
        if v not in ['proforma', 'fatura']:
            raise ValueError("tipo_documento deve ser 'proforma' ou 'fatura'")
        return v

    @model_validator(mode='after')
    def valida_cliente(self):
        if not self.cliente_id and not self.cliente_nome:
            raise ValueError("Informe cliente_id ou cliente_nome para cliente avulso")
        return self

class FaturaUpdate(BaseModel):
    cliente_id: Optional[UUID] = None
    forma_pagamento: Optional[Literal['dinheiro', 'transferencia', 'multicaixa', 'credito']] = None
    observacoes: Optional[str] = Field(None, max_length=1000)
    desconto_percent: Optional[float] = Field(None, ge=0, le=100)
    itens: Optional[List[ItemCreate]] = None

class NotaCreditoCreate(BaseModel):
    motivo: str = Field(..., description="01-Devolução, 02-Desconto, 03-Erro, 04-Anulação, 05-Outros")
    observacoes: Optional[str] = None

class ItemResponse(BaseModel):
    id: UUID
    produto_id: Optional[UUID] = None
    nome_snapshot: str
    quantidade: float
    preco_unit_snapshot: float
    subtotal_linha: float
    iva_percent: float
    iva_valor: float = 0
    motivo_isencao: Optional[str] = None
    class Config:
        from_attributes = True

class FaturaResponse(BaseModel):
    id: UUID
    tipo_documento: str
    status: str
    numero_proforma: Optional[str] = None
    numero_fatura: Optional[str] = None
    numero_nota_credito: Optional[str] = None
    numero: Optional[str] = None

    subtotal: float
    total_iva: float
    total_geral: float
    desconto_percent: float = 0
    forma_pagamento: str

    # AGT
    hash_agt: Optional[str] = None
    hash_agt_anterior: Optional[str] = None
    qr_code: Optional[str] = None
    comunicado_agt: bool = False
    motivo_credito: Optional[str] = None
    motivo_isencao: Optional[str] = None

    cliente_id: Optional[UUID] = None
    cliente_nome: Optional[str] = None
    cliente_nif: Optional[str] = None
    cliente_telefone: Optional[str] = None
    cliente_email: Optional[str] = None
    cliente_endereco: Optional[str] = None
    proforma_origem_id: Optional[UUID] = None
    fatura_origem_id: Optional[UUID] = None
    data_emissao: datetime
    data_vencimento: Optional[datetime] = None
    validade_proforma: Optional[datetime] = None
    observacoes: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

    itens: List[ItemResponse] = []

    @field_validator('numero', mode='before')
    @classmethod
    def set_numero(cls, v, info):
        values = info.data if hasattr(info, 'data') else {}
        if isinstance(values, dict):
            return v or values.get('numero_fatura') or values.get('numero_nota_credito') or values.get('numero_proforma')
        return v

    class Config:
        from_attributes = True
        populate_by_name = True

class FaturaListResponse(BaseModel):
    id: UUID
    tipo_documento: str
    status: str
    numero: str
    cliente_id: Optional[UUID] = None
    cliente_nome: Optional[str] = None
    total_geral: float
    created_at: datetime
    class Config:
        from_attributes = True
