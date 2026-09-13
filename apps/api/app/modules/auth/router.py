from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_
from sqlalchemy.orm import selectinload

from app.db.database import get_db
from app.modules.auth import models, schemas, utils

router = APIRouter(prefix="/auth", tags=["Auth"])

@router.post("/register", status_code=201, response_model=schemas.RegisterResponse)
async def register_company(data: schemas.RegisterRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(models.Company).where(
            or_(models.Company.nif == data.nif, models.Company.email == data.emailCompany)
        )
    )
    exists = result.scalar_one_or_none()
    if exists:
        raise HTTPException(status_code=400, detail="NIF ou Email já cadastrado")

    password_hash = utils.get_password_hash(data.password)

    company = models.Company(
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

    admin_user = models.User(
        company_id=company.id, # agora é int
        name=data.companyName,
        email=data.emailCompany,
        password_hash=password_hash,
        role="admin"
    )
    db.add(admin_user)
    await db.commit()
    await db.refresh(company)

    return {"message": "Empresa e usuário admin cadastrados com sucesso"}

@router.post("/login", response_model=schemas.TokenResponse)
async def login(data: schemas.LoginRequest, db: AsyncSession = Depends(get_db)):
    target_id: int = 0 # <- era str
    target_nif: str = ""
    company_response = None

    result = await db.execute(
        select(models.User).options(selectinload(models.User.company)).where(models.User.email == data.email)
    )
    user = result.scalar_one_or_none()

    if user and utils.verify_password(data.password, user.password_hash):
        target_id = user.id # <- sem str()
        company_response = user.company
        target_nif = company_response.nif if company_response else ""
    else:
        result = await db.execute(
            select(models.Company).where(or_(models.Company.email == data.email, models.Company.nif == data.email))
        )
        company = result.scalar_one_or_none()
        if not company or not utils.verify_password(data.password, company.password_hash):
            raise HTTPException(status_code=401, detail="Credenciais inválidas")
        target_id = company.id # <- sem str()
        target_nif = company.nif
        company_response = company

    token = utils.create_access_token({"sub": str(target_id), "nif": target_nif}) # sub tem que ser str no JWT

    return {
        "message": "Login realizado",
        "access_token": token,
        "token_type": "bearer",
        "company": company_response
    }
