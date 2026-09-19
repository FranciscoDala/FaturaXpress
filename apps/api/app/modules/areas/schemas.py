from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime
from uuid import UUID

class AreaCreate(BaseModel):
    nome: str = Field(..., max_length=100)
    descricao: Optional[str] = Field(None, max_length=255)
    cor: Optional[str] = "#E6F0FF"

class AreaUpdate(BaseModel):
    nome: Optional[str] = Field(None, max_length=100)
    descricao: Optional[str] = None
    cor: Optional[str] = None
    ativo: Optional[bool] = None

class AreaResponse(BaseModel):
    id: UUID
    company_id: UUID
    nome: str
    descricao: Optional[str] = None
    cor: str
    ativo: bool
    created_at: datetime
    updated_at: datetime
    class Config:
        from_attributes = True
