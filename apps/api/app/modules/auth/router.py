from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_
from sqlalchemy.orm import selectinload
import uuid

from app.db.database import get_db
from app.modules.auth.models import Company, User
from app.modules.auth import schemas
from app.core.jwt import create_access_token
from app.core.security import hash_password, verify_password, get_current_company_id

router = APIRouter(prefix="/auth", tags=["Auth"])

@router.post("/register", status_code=201, response_model=schemas.RegisterResponse)
async def register_company(data: schemas.RegisterRequest, db: AsyncSession = Depends(get_db)):
    try:
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
        await db.commit()
        await db.refresh(company)

        admin_user = User(
            company_id=company.id,
            name=data.companyName,
            email=data.emailCompany,
            password_hash=password_hash,
            role="admin"
        )
        db.add(admin_user)
        await db.commit()

        return {"message": "Empresa e usuário admin cadastrados com sucesso"}

    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=500, detail=f"Erro ao registrar: {str(e)}")

@router.post("/login", response_model=schemas.TokenResponse)
async def login(data: schemas.LoginRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Company).where(Company.nif == data.nif)
    )
    company = result.scalar_one_or_none()

    if not company:
        raise HTTPException(status_code=401, detail="NIF ou Senha inválidos")

    if not verify_password(data.password, company.password_hash):
        raise HTTPException(status_code=401, detail="NIF ou Senha inválidos")

    if not company.is_active:
        raise HTTPException(status_code=400, detail="Empresa inativa")

    token = create_access_token(
        data={"sub": str(company.id), "company_id": str(company.id)}
    )
    return {
        "message": "Login realizado",
        "access_token": token,
        "company_id": company.id,
        "company_name": company.companyName
    }

@router.get("/me")
async def get_me(
    db: AsyncSession = Depends(get_db),
    company_id: uuid.UUID = Depends(get_current_company_id)
):
    result = await db.execute(
        select(Company).where(Company.id == company_id)
    )
    company = result.scalar_one_or_none()
    if not company:
        raise HTTPException(status_code=404, detail="Empresa não encontrada")

    return {
        "company": {
            "id": str(company.id),
            "nome": company.companyName,
            "nif": company.nif,
            "email": company.email,
            "telefone": company.phone,
            "endereco": company.address,
            "cidade": company.city,
            "provincia": company.province
        },
        "id": str(company.id),
        "companyName": company.companyName
    }
