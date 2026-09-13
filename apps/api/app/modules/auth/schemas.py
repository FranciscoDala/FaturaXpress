from pydantic import BaseModel, EmailStr
from typing import Optional

# 1. Para /register
class RegisterRequest(BaseModel):
    companyName: str
    nif: str
    emailCompany: EmailStr
    phone: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    province: Optional[str] = None
    password: str

# 2. Resposta do /register - era essa que faltava
class RegisterResponse(BaseModel):
    message: str

# 3. Para /login
class LoginRequest(BaseModel):
    email: str # pode ser email ou nif
    password: str

# 4. Para resposta do /login
class CompanyOut(BaseModel):
    id: int
    companyName: str
    nif: str
    email: EmailStr
    phone: Optional[str] = None

    class Config:
        from_attributes = True # <- pra converter do SQLAlchemy

class TokenResponse(BaseModel):
    message: str
    access_token: str
    token_type: str = "bearer"
    company: CompanyOut
