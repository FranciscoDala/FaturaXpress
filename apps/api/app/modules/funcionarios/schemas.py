from pydantic import BaseModel, Field, EmailStr, field_validator
from typing import List, Optional
from datetime import datetime, date
from uuid import UUID

# BANCOS - mesma lista frontend
BANCOS_ANGOLA = [
    "BAI - Banco Angolano de Investimentos",
    "BFA - Banco de Fomento Angola",
    "BIC - Banco BIC",
    "BPC - Banco de Poupança e Crédito",
    "BCI - Banco de Comércio e Indústria",
    "BNI - Banco de Negócios Internacional",
    "BMA - Banco Millennium Atlântico",
    "BCA - Banco Caixa Geral Angola",
    "SOL - Banco Sol",
    "SBA - Standard Bank Angola",
    "BE - Banco Económico",
    "BVB - Banco Valor",
    "BCS - Banco de Crédito do Sul",
    "BCH - Banco Comercial do Huambo",
    "BPG - Banco Prestígio",
    "BMF - Banco BAI Micro Finanças",
    "BIR - Banco de Investimento Rural",
    "FNB - First National Bank Angola",
]

class FuncionarioCreate(BaseModel):
    # OBRIGATORIOS BI
    nome: str = Field(..., max_length=150)
    numero_bi: str = Field(..., max_length=20, description="Nº BI - login")
    bi: Optional[str] = None # alias compat
    data_nascimento: date
    genero: str = Field(..., description="M ou F")
    nacionalidade: str = Field(default="Angolana", max_length=50)
    naturalidade: Optional[str] = Field(None, max_length=100)
    nome_pai: str = Field(..., max_length=150)
    nome_mae: str = Field(..., max_length=150)
    data_emissao_bi: Optional[date] = None
    data_validade_bi: Optional[date] = None
    local_emissao_bi: Optional[str] = Field(None, max_length=100)

    # OPCIONAIS
    estado_civil: str = Field(default="solteiro")
    telefone: Optional[str] = None
    email: Optional[EmailStr] = None
    endereco: Optional[str] = None
    cidade: Optional[str] = None
    provincia: Optional[str] = None
    nif: Optional[str] = None

    banco1: Optional[str] = None
    banco2: Optional[str] = None
    iban: Optional[str] = None
    iban2: Optional[str] = None

    contacto_emergencia: Optional[str] = None

    # ACESSO
    tem_acesso: bool = Field(default=False)
    senha: Optional[str] = Field(None, min_length=6, description="Obrigatória se tem_acesso=True")
    cargo: str = Field(default="rh", description="admin, financeira, recepcao, rh")
    area_principal_id: Optional[UUID] = None
    areas_ids: List[UUID] = Field(default_factory=list)

    @field_validator('email', mode='before')
    @classmethod
    def normalize_email_create(cls, v):
        if v is None or v == "":
            return None
        return str(v).lower().strip()

    @field_validator('numero_bi', 'bi', mode='before')
    @classmethod
    def normalize_bi(cls, v):
        if v is None:
            return v
        return str(v).upper().strip()

class FuncionarioUpdate(BaseModel):
    nome: Optional[str] = Field(None, max_length=150)
    numero_bi: Optional[str] = None
    data_nascimento: Optional[date] = None
    genero: Optional[str] = None
    nacionalidade: Optional[str] = None
    naturalidade: Optional[str] = None
    nome_pai: Optional[str] = None
    nome_mae: Optional[str] = None
    data_emissao_bi: Optional[date] = None
    data_validade_bi: Optional[date] = None
    local_emissao_bi: Optional[str] = None

    estado_civil: Optional[str] = None
    telefone: Optional[str] = None
    email: Optional[str] = None # FIX: str ao invés de EmailStr pra permitir limpar e não dar 422
    endereco: Optional[str] = None
    cidade: Optional[str] = None
    provincia: Optional[str] = None
    nif: Optional[str] = None

    banco1: Optional[str] = None
    banco2: Optional[str] = None
    iban: Optional[str] = None
    iban2: Optional[str] = None

    contacto_emergencia: Optional[str] = None

    tem_acesso: Optional[bool] = None
    senha: Optional[str] = Field(None, min_length=6)
    cargo: Optional[str] = None
    area_principal_id: Optional[UUID] = None
    areas_ids: Optional[List[UUID]] = None
    ativo: Optional[bool] = None

    @field_validator('email', mode='before')
    @classmethod
    def normalize_email_update(cls, v):
        if v is None or v == "":
            return None
        v = str(v).lower().strip()
        return v if v else None

    @field_validator('numero_bi', mode='before')
    @classmethod
    def normalize_bi_update(cls, v):
        if v is None:
            return v
        return str(v).upper().strip()

    class Config:
        extra = "allow"

class FuncionarioResponse(BaseModel):
    id: UUID
    company_id: UUID
    nome: str
    numero_bi: str
    data_nascimento: date
    genero: str
    nacionalidade: Optional[str] = None
    naturalidade: Optional[str] = None
    nome_pai: str
    nome_mae: str
    data_emissao_bi: Optional[date] = None
    data_validade_bi: Optional[date] = None
    local_emissao_bi: Optional[str] = None

    estado_civil: Optional[str] = None
    telefone: Optional[str] = None
    email: Optional[str] = None
    endereco: Optional[str] = None
    cidade: Optional[str] = None
    provincia: Optional[str] = None
    nif: Optional[str] = None

    banco1: Optional[str] = None
    banco2: Optional[str] = None
    iban: Optional[str] = None
    iban2: Optional[str] = None
    contacto_emergencia: Optional[str] = None

    tem_acesso: bool
    cargo: str
    area_principal_id: Optional[UUID] = None
    ativo: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
