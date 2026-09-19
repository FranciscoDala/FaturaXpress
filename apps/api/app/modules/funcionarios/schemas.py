from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional
from datetime import datetime
from uuid import UUID

class FuncionarioCreate(BaseModel):
    nome: str = Field(..., max_length=100)
    email: EmailStr
    senha: str = Field(..., min_length=6)
    cargo: str = Field(..., description="admin, financeira, recepcao, rh")
    area_principal_id: Optional[UUID] = None
    areas_ids: List[UUID] = Field(default_factory=list)

class FuncionarioUpdate(BaseModel):
    nome: Optional[str] = Field(None, max_length=100)
    cargo: Optional[str] = None
    area_principal_id: Optional[UUID] = None
    areas_ids: Optional[List[UUID]] = None
    ativo: Optional[bool] = None

class FuncionarioResponse(BaseModel):
    id: UUID
    company_id: UUID
    nome: str
    email: str
    cargo: str
    area_principal_id: Optional[UUID] = None
    ativo: bool
    created_at: datetime
    updated_at: datetime
    class Config:
        from_attributes = True
