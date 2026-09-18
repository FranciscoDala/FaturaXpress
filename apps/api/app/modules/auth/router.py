from fastapi import APIRouter, Depends, HTTPException, File, UploadFile, Form
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_
import uuid
import logging
from typing import Optional

from app.db.database import get_db
from app.modules.auth.models import Company, User
from app.modules.auth import schemas
from app.core.security import hash_password, verify_password, get_current_company_id
from app.core.jwt import create_access_token
from app.modules.realtime.manager import manager
from app.core.plans import get_plan_limit

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/auth", tags=["Auth"])

@router.post("/register", status_code=201, response_model=schemas.RegisterResponse)
async def register_company(data: schemas.RegisterRequest, db: AsyncSession = Depends(get_db)):
    try:
        result = await db.execute(select(Company).where(or_(Company.nif == data.nif, Company.email == data.emailCompany)))
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
            iban=data.iban,
            iban2=data.iban2,
            logo_url=data.logo_url or data.image_url,
            image_url=data.image_url or data.logo_url,
            password_hash=password_hash,
            # AQUI GARANTE FREE AO CRIAR
            subscription_plan="free",
            subscription_status="active"
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
    result = await db.execute(select(Company).where(Company.nif == data.nif))
    company = result.scalar_one_or_none()
    if not company:
        raise HTTPException(status_code=401, detail="NIF ou Senha inválidos")
    if not verify_password(data.password, company.password_hash):
        raise HTTPException(status_code=401, detail="NIF ou Senha inválidos")
    if not company.is_active:
        raise HTTPException(status_code=400, detail="Empresa inativa")

    token = create_access_token(data={"sub": str(company.id), "company_id": str(company.id)})
    return {"message": "Login realizado", "access_token": token, "company_id": company.id, "company_name": company.companyName}

@router.get("/me")
async def get_me(db: AsyncSession = Depends(get_db), company_id: uuid.UUID = Depends(get_current_company_id)):
    result = await db.execute(select(Company).where(Company.id == company_id))
    company = result.scalar_one_or_none()
    if not company:
        raise HTTPException(status_code=404, detail="Empresa não encontrada")

    limits = get_plan_limit(getattr(company, 'subscription_plan', 'free'))

    return {
        "company": {
            "id": str(company.id),
            "nome": company.companyName,
            "nif": company.nif,
            "email": company.email,
            "telefone": company.phone,
            "endereco": company.address,
            "cidade": company.city,
            "provincia": company.province,
            "iban": company.iban,
            "iban2": company.iban2,
            "logo_url": company.logo_url,
            "image_url": company.image_url or company.logo_url,
            "is_active": company.is_active,
            "subscription_plan": getattr(company, 'subscription_plan', 'free'),
            "subscription_status": getattr(company, 'subscription_status', 'active'),
            "limits": limits
        },
        "id": str(company.id),
        "companyName": company.companyName,
        "subscription_plan": getattr(company, 'subscription_plan', 'free'),
        "limits": limits
    }

@router.put("/company")
async def update_company(data: schemas.UpdateCompanyRequest, db: AsyncSession = Depends(get_db), company_id: uuid.UUID = Depends(get_current_company_id)):
    result = await db.execute(select(Company).where(Company.id == company_id))
    company = result.scalar_one_or_none()
    if not company:
        raise HTTPException(status_code=404, detail="Empresa não encontrada")

    if data.companyName is not None: company.companyName = data.companyName
    if data.nif is not None: company.nif = data.nif
    if data.email is not None: company.email = data.email
    if data.phone is not None: company.phone = data.phone
    if data.address is not None: company.address = data.address
    if data.city is not None: company.city = data.city
    if data.province is not None: company.province = data.province
    if data.iban is not None: company.iban = data.iban
    if data.iban2 is not None: company.iban2 = data.iban2
    if data.logo_url is not None:
        company.logo_url = data.logo_url
        company.image_url = data.logo_url
    if data.image_url is not None:
        company.image_url = data.image_url
        company.logo_url = data.image_url

    await db.commit()
    await db.refresh(company)
    try:
        await manager.broadcast(company_id, {"event": "company:changed"})
    except Exception:
        pass
    return {"message": "Empresa atualizada com sucesso"}

@router.put("/company/logo")
async def upload_company_logo(
    logo: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    company_id: uuid.UUID = Depends(get_current_company_id)
):
    result = await db.execute(select(Company).where(Company.id == company_id))
    company = result.scalar_one_or_none()
    if not company:
        raise HTTPException(status_code=404, detail="Empresa não encontrada")

    try:
        from app.core.upload_Imagem import upload_image
        logo_url = await upload_image(logo, folder=f"empresas/{company_id}/logo")
    except Exception as e:
        logger.error(f"Falha upload logo: {e}")
        raise HTTPException(status_code=500, detail=f"Erro ao fazer upload da logo: {str(e)}")

    company.logo_url = logo_url
    company.image_url = logo_url
    await db.commit()
    await db.refresh(company)

    try:
        await manager.broadcast(company_id, {"event": "company:changed"})
    except Exception:
        pass

    return {
        "message": "Logo atualizada com sucesso",
        "logo_url": logo_url,
        "image_url": logo_url
    }

@router.put("/company/full")
async def update_company_with_logo(
    companyName: Optional[str] = Form(None),
    nif: Optional[str] = Form(None),
    email: Optional[str] = Form(None),
    phone: Optional[str] = Form(None),
    address: Optional[str] = Form(None),
    city: Optional[str] = Form(None),
    province: Optional[str] = Form(None),
    iban: Optional[str] = Form(None),
    iban2: Optional[str] = Form(None),
    logo: Optional[UploadFile] = File(None),
    db: AsyncSession = Depends(get_db),
    company_id: uuid.UUID = Depends(get_current_company_id)
):
    result = await db.execute(select(Company).where(Company.id == company_id))
    company = result.scalar_one_or_none()
    if not company:
        raise HTTPException(status_code=404, detail="Empresa não encontrada")

    if companyName is not None: company.companyName = companyName
    if nif is not None: company.nif = nif
    if email is not None: company.email = email
    if phone is not None: company.phone = phone
    if address is not None: company.address = address
    if city is not None: company.city = city
    if province is not None: company.province = province
    if iban is not None: company.iban = iban
    if iban2 is not None: company.iban2 = iban2

    if logo:
        try:
            from app.core.upload_Imagem import upload_image
            logo_url = await upload_image(logo, folder=f"empresas/{company_id}/logo")
            company.logo_url = logo_url
            company.image_url = logo_url
        except Exception as e:
            logger.warning(f"Falha upload logo full: {e}")

    await db.commit()
    await db.refresh(company)
    try:
        await manager.broadcast(company_id, {"event": "company:changed"})
    except Exception:
        pass
    return {"message": "Empresa atualizada com sucesso", "logo_url": company.logo_url}
