from pydantic import BaseModel, EmailStr, ConfigDict
from typing import Optional
import uuid

class RegisterRequest(BaseModel):
    companyName: str
    nif: str
    emailCompany: EmailStr
    phone: str
    address: str
    city: str
    province: str
    password: str

class RegisterResponse(BaseModel):
    message: str

class CompanyResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    companyName: str
    nif: str
    email: str
    phone: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    province: Optional[str] = None

class LoginRequest(BaseModel):
    nif: str
    password: str

class TokenResponse(BaseModel):
    message: str
    access_token: str
    token_type: str = "bearer"
    company_id: uuid.UUID
    company_name: str # <- ADICIONEI. Bate com o router
    # user_id: uuid.UUID <- REMOVI pq login não usa mais user
