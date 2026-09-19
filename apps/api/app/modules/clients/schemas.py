from pydantic import BaseModel, EmailStr, ConfigDict
from typing import Optional
import uuid
from datetime import datetime

# REQUEST
class ClienteCreateRequest(BaseModel):
    nome: str
    nif: str
    email: Optional[EmailStr] = None
    telefone: Optional[str] = None
    endereco: Optional[str] = None
    cidade: Optional[str] = None
    provincia: Optional[str] = None

class ClienteUpdateRequest(BaseModel):
    nome: Optional[str] = None
    nif: Optional[str] = None
    email: Optional[EmailStr] = None
    telefone: Optional[str] = None
    endereco: Optional[str] = None
    cidade: Optional[str] = None
    provincia: Optional[str] = None

# NOVO - PARA CONSULTAR NIF ANTES
class ClienteValidarNifRequest(BaseModel):
    nif: str

class ClienteValidarNifResponse(BaseModel):
    exists: bool
    nif: str
    message: str
    cliente: Optional["ClienteResponse"] = None

# RESPONSE - Bate com a tabela do frontend
class ClienteResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    company_id: uuid.UUID
    nome: str
    nif: str
    email: Optional[str] = None
    telefone: Optional[str] = None
    endereco: Optional[str] = None
    cidade: Optional[str] = None
    provincia: Optional[str] = None
    created_at: datetime
