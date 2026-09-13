from pydantic import BaseModel, EmailStr
from datetime import datetime

class RegisterRequest(BaseModel):
    companyName: str
    nif: str
    emailCompany: EmailStr
    phone: str
    address: str
    city: str
    province: str
    password: str

class LoginRequest(BaseModel):
    email: str # pode ser email ou nif
    password: str

class CompanyResponse(BaseModel):
    id: str
    companyName: str
    nif: str
    email: str
    phone: str
    address: str
    city: str
    province: str
    is_active: bool
    createdAt: datetime

    class Config:
        from_attributes = True

class TokenResponse(BaseModel):
    message: str
    token: str
    company: CompanyResponse
