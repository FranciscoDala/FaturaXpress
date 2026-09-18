from fastapi import APIRouter, Depends, HTTPException, File, UploadFile, Form
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_
import uuid
import logging
from typing import Optional
from datetime import datetime, timezone

from app.db.database import get_db
from app.modules.auth.models import Company, User
from app.modules.auth import schemas
from app.core.security import hash_password, verify_password, get_current_company_id
from app.core.jwt import create_access_token
from app.modules.realtime.manager import manager
from app.core.plans import get_plan_limit
from app.core.agt_validator import validate_nif_agt, clean_nif

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/auth", tags=["Auth"])

# NOVO ENDPOINT - VALIDA NIF ANTES DE CADASTRAR
@router.post("/validar-nif", response_model=schemas.ValidateNifResponse)
async def validar_nif_endpoint(data: schemas.ValidateNifRequest):
    result = await validate_nif_agt(data.nif)

    if result["estado"] == "FormatoInvalido":
        raise HTTPException(status_code=400, detail=result["message"])

    if result["estado"] == "NaoEncontrado":
        raise HTTPException(status_code=404, detail="NIF não encontrado na AGT. Verifique o número.")

    if result["estado"] == "Inactivo":
        raise HTTPException(status_code=400, detail="Este NIF está Inactivo na AGT. Não pode ser usado.")

    # Se for AGT_Offline deixa passar mas avisa
    return {
        "valid": result["valid"],
        "nif": result["nif"],
        "nome_agt": result["nome_agt"],
        "estado": result["estado"],
        "message": result["message"]
    }

@router.post("/register", status_code=201, response_model=schemas.RegisterResponse)
async def register_company(data: schemas.RegisterRequest, db: AsyncSession = Depends(get_db)):
    try:
        # 1. Verifica duplicado
        result = await db.execute(select(Company).where(or_(Company.nif == clean_nif(data.nif), Company.email == data.emailCompany)))
        exists = result.scalar_one_or_none()
        if exists:
            raise HTTPException(status_code=400, detail="NIF ou Email já cadastrado")

        # 2. NOVO - VALIDA NIF NA AGT ANTES DE CADASTRAR
        agt_result = await validate_nif_agt(data.nif)

        if agt_result["estado"] == "FormatoInvalido":
            raise HTTPException(status_code=400, detail=agt_result["message"])
        if agt_result["estado"] == "NaoEncontrado":
            raise HTTPException(status_code=404, detail="NIF não existe na base da AGT")
        if agt_result["estado"] == "Inactivo":
            raise HTTPException(status_code=400, detail="NIF Inactivo na AGT, não pode cadastrar")
        if not agt_result["valid"] and agt_result["estado"]!= "AGT_Offline":
            raise HTTPException(status_code=400, detail="NIF inválido ou não verificado na AGT")

        password_hash = hash_password(data.password)

        company = Company(
            companyName=data.companyName if not agt_result.get("nome_agt") else agt_result["nome_agt"] if agt_result["nome_agt"] else data.companyName,
            nif=clean_nif(data.nif),
            email=data.emailCompany,
            phone=data.phone,
            address=data.address,
            city=data.city,
            province=data.province,
            iban=data.iban,
            iban2=data.iban2,
            banco1=data.banco1,
            banco2=data.banco2,
            logo_url=data.logo_url or data.image_url,
            image_url=data.image_url or data.logo_url,
            password_hash=password_hash,
            subscription_plan="free",
            subscription_status="active",
            nif_verified=agt_result["estado"] == "Activo",
            nif_agt_name=agt_result.get("nome_agt"),
            nif_verified_at=datetime.now(timezone.utc) if agt_result["estado"] == "Activo" else None
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
        logger.error(f"Erro register: {e}")
        raise HTTPException(status_code=500, detail=f"Erro ao registrar: {str(e)}")

@router.post("/login", response_model=schemas.TokenResponse)
async def login(data: schemas.LoginRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Company).where(Company.nif == clean_nif(data.nif)))
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
            "banco1": getattr(company, 'banco1', None),
            "banco2": getattr(company, 'banco2', None),
            "logo_url": company.logo_url,
            "image_url": company.image_url or company.logo_url,
            "is_active": company.is_active,
            "subscription_plan": getattr(company, 'subscription_plan', 'free'),
            "subscription_status": getattr(company, 'subscription_status', 'active'),
            "nif_verified": getattr(company, 'nif_verified', False),
            "nif_agt_name": getattr(company, 'nif_agt_name', None),
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
    if data.banco1 is not None: company.banco1 = data.banco1
    if data.banco2 is not None: company.banco2 = data.banco2
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
    banco1: Optional[str] = Form(None),
    banco2: Optional[str] = Form(None),
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
    if banco1 is not None: company.banco1 = banco1
    if banco2 is not None: company.banco2 = banco2

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
