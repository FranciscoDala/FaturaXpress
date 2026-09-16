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
    iban: Optional[str] = None
    iban2: Optional[str] = None
    logo_url: Optional[str] = None
    image_url: Optional[str] = None

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
    iban: Optional[str] = None
    iban2: Optional[str] = None
    logo_url: Optional[str] = None
    image_url: Optional[str] = None

class LoginRequest(BaseModel):
    nif: str
    password: str

class TokenResponse(BaseModel):
    message: str
    access_token: str
    token_type: str = "bearer"
    company_id: uuid.UUID
    company_name: str

class UpdateCompanyRequest(BaseModel):
    companyName: Optional[str] = None
    nif: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    province: Optional[str] = None
    iban: Optional[str] = None
    iban2: Optional[str] = None
    logo_url: Optional[str] = None
    image_url: Optional[str] = None
