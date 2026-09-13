from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_
from sqlalchemy.orm import selectinload
from datetime import timedelta

from app.db.database import get_db
from app.modules.auth.models import Company, User
from. import schemas
from.jwt import create_access_token
from app.core.security import hash_password, verify_password # vamos usar só aqui

router = APIRouter(prefix="/auth", tags=["Auth"])

@router.post("/register", status_code=201, response_model=schemas.RegisterResponse)
async def register_company(data: schemas.RegisterRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Company).where(
            or_(Company.nif == data.nif, Company.email == data.emailCompany)
        )
    )
    exists = result.scalar_one_or_none()
    if exists:
        raise HTTPException(status_code=400, detail="NIF ou Email já cadastrado")

    password_hash = hash_password(data.password)

    company = Company(
        companyName=data.companyName,
        nif=data.nif,
        email=data.emailCompany,
        phone=data.phone,
        address=data.address,
        city=data.city,
        province=data.province,
        password_hash=password_hash
    )
    db.add(company)
    await db.flush()

    admin_user = User(
        company_id=company.id, # UUID
        name=data.companyName,
        email=data.emailCompany,
        password_hash=password_hash,
        role="admin"
    )
    db.add(admin_user)
    await db.commit()

    return {"message": "Empresa e usuário admin cadastrados com sucesso"}

@router.post("/login", response_model=schemas.TokenResponse)
async def login(data: schemas.LoginRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(User).options(selectinload(User.company)).where(User.email == data.email)
    )
    user = result.scalar_one_or_none()

    if user and verify_password(data.password, user.password_hash):
        if not user.is_active:
            raise HTTPException(status_code=400, detail="Usuário inativo")
        company = user.company
        token = create_access_token(
            data={"sub": str(user.id), "company_id": str(user.company_id)}
        )
        return {
            "message": "Login realizado",
            "access_token": token,
            "company_id": user.company_id,
            "user_id": user.id
        }

    raise HTTPException(status_code=401, detail="Credenciais inválidas")
