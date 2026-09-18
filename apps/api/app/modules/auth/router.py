from fastapi import APIRouter, Depends, HTTPException, File, UploadFile, Form, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_
import uuid
import logging
import time
import re
from typing import Optional, Dict
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

# BLINDAGEM: rate limit simples em memória
LOGIN_ATTEMPTS: Dict[str, list[float]] = {}
REGISTER_ATTEMPTS: Dict[str, list[float]] = {}

def check_rate_limit(store: Dict, key: str, max_req: int, window: int) -> bool:
    now = time.time()
    if key not in store:
        store[key] = []
    store[key] = [t for t in store[key] if now - t < window]
    if len(store[key]) >= max_req:
        return False
    store[key].append(now)
    return True

def sanitize_string(s: Optional[str], max_len: int = 255) -> Optional[str]:
    if s is None:
        return None
    s = s.strip()[:max_len]
    # BLINDAGEM: remove tags e scripts
    s = re.sub(r'<[^>]*>', '', s)
    return s

@router.post("/validar-nif", response_model=schemas.ValidateNifResponse)
async def validar_nif_endpoint(data: schemas.ValidateNifRequest, request: Request):
    # BLINDAGEM: rate limit por IP 20/min
    ip = request.client.host if request.client else "unknown"
    if not check_rate_limit(REGISTER_ATTEMPTS, f"validar_{ip}", 20, 60):
        raise HTTPException(status_code=429, detail="Muitas validações, aguarde 1 minuto")

    result = await validate_nif_agt(data.nif)
    if result["estado"] == "FormatoInvalido":
        raise HTTPException(status_code=400, detail=result["message"])
    if result["estado"] == "NaoEncontrado":
        raise HTTPException(status_code=404, detail="NIF não encontrado na AGT. Verifique o número.")
    if result["estado"] == "Inactivo":
        raise HTTPException(status_code=400, detail="Este NIF está Inactivo na AGT. Não pode ser usado.")

    return {
        "valid": result["valid"],
        "nif": result["nif"],
        "nome_agt": result["nome_agt"],
        "estado": result["estado"],
        "source": result.get("source"),
        "message": result["message"]
    }

@router.post("/register", status_code=201, response_model=schemas.RegisterResponse)
async def register_company(data: schemas.RegisterRequest, request: Request, db: AsyncSession = Depends(get_db)):
    try:
        ip = request.client.host if request.client else "unknown"
        if not check_rate_limit(REGISTER_ATTEMPTS, f"register_{ip}", 5, 300):
            raise HTTPException(status_code=429, detail="Muitas tentativas de registro, aguarde 5 minutos")

        nif_limpo = clean_nif(data.nif)
        if not nif_limpo or len(nif_limpo) < 9:
            raise HTTPException(status_code=400, detail="NIF inválido")

        # BLINDAGEM: sanitiza todos os inputs
        company_name_sanitized = sanitize_string(data.companyName, 255) or ""
        if len(company_name_sanitized) < 2:
            raise HTTPException(status_code=400, detail="Nome da empresa inválido")

        # BLINDAGEM: valida nome_agt_validado vindo do frontend - não pode ser injetado com 500 chars ou script
        nome_agt_front = None
        if data.nome_agt_validado:
            nome_agt_front = sanitize_string(data.nome_agt_validado, 255)
            if nome_agt_front and len(nome_agt_front) < 3:
                nome_agt_front = None

        result = await db.execute(select(Company).where(or_(Company.nif == nif_limpo, Company.email == data.emailCompany)))
        exists = result.scalar_one_or_none()
        if exists:
            # BLINDAGEM: mensagem genérica para não enumerar NIFs
            raise HTTPException(status_code=400, detail="NIF ou Email já cadastrado")

        agt_result = await validate_nif_agt(data.nif)
        if agt_result["estado"] == "FormatoInvalido":
            raise HTTPException(status_code=400, detail=agt_result["message"])
        if agt_result["estado"] == "NaoEncontrado":
            raise HTTPException(status_code=404, detail="NIF não existe na base da AGT")
        if agt_result["estado"] == "Inactivo":
            raise HTTPException(status_code=400, detail="NIF Inactivo na AGT, não pode cadastrar")

        nome_final = company_name_sanitized
        nif_verified = False
        nif_agt_name = None

        if agt_result.get("valid") and agt_result.get("nome_agt"):
            nome_final = sanitize_string(agt_result["nome_agt"], 255) or company_name_sanitized
            nif_verified = True
            nif_agt_name = nome_final
        elif nome_agt_front:
            # BLINDAGEM: aceita frontend só se backend estava offline, não se NaoEncontrado
            if agt_result["estado"] == "AGT_Offline":
                nome_final = nome_agt_front
                nif_verified = True
                nif_agt_name = nome_agt_front

        password_hash = hash_password(data.password)

        company = Company(
            companyName=nome_final,
            nif=nif_limpo,
            email=data.emailCompany.lower().strip()[:255],
            phone=sanitize_string(data.phone, 50),
            address=sanitize_string(data.address, 255),
            city=sanitize_string(data.city, 100),
            province=sanitize_string(data.province, 100),
            iban=sanitize_string(data.iban, 100),
            iban2=sanitize_string(data.iban2, 100),
            banco1=sanitize_string(data.banco1, 100),
            banco2=sanitize_string(data.banco2, 100),
            logo_url=data.logo_url or data.image_url,
            image_url=data.image_url or data.logo_url,
            password_hash=password_hash,
            subscription_plan="free",
            subscription_status="active",
            nif_verified=nif_verified,
            nif_agt_name=nif_agt_name,
            nif_verified_at=datetime.now(timezone.utc) if nif_verified else None
        )
        db.add(company)
        await db.commit()
        await db.refresh(company)

        admin_user = User(
            company_id=company.id,
            name=nome_final,
            email=data.emailCompany.lower().strip()[:255],
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
        raise HTTPException(status_code=500, detail="Erro ao registrar")

@router.post("/login", response_model=schemas.TokenResponse)
async def login(data: schemas.LoginRequest, request: Request, db: AsyncSession = Depends(get_db)):
    ip = request.client.host if request.client else "unknown"
    nif_key = clean_nif(data.nif)
    # BLINDAGEM: 5 tentativas por NIF por 15 min
    if not check_rate_limit(LOGIN_ATTEMPTS, f"login_{ip}_{nif_key}", 5, 900):
        raise HTTPException(status_code=429, detail="Muitas tentativas, aguarde 15 minutos")

    result = await db.execute(select(Company).where(Company.nif == nif_key))
    company = result.scalar_one_or_none()
    if not company or not verify_password(data.password, company.password_hash):
        # BLINDAGEM: mesma mensagem para não enumerar
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

    if data.companyName is not None: company.companyName = sanitize_string(data.companyName, 255) or company.companyName
    if data.nif is not None: company.nif = clean_nif(data.nif)
    if data.email is not None: company.email = data.email.lower().strip()[:255]
    if data.phone is not None: company.phone = sanitize_string(data.phone, 50)
    if data.address is not None: company.address = sanitize_string(data.address, 255)
    if data.city is not None: company.city = sanitize_string(data.city, 100)
    if data.province is not None: company.province = sanitize_string(data.province, 100)
    if data.iban is not None: company.iban = sanitize_string(data.iban, 100)
    if data.iban2 is not None: company.iban2 = sanitize_string(data.iban2, 100)
    if data.banco1 is not None: company.banco1 = sanitize_string(data.banco1, 100)
    if data.banco2 is not None: company.banco2 = sanitize_string(data.banco2, 100)
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
async def upload_company_logo(logo: UploadFile = File(...), db: AsyncSession = Depends(get_db), company_id: uuid.UUID = Depends(get_current_company_id)):
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
    return {"message": "Logo atualizada com sucesso", "logo_url": logo_url, "image_url": logo_url}

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

    if companyName is not None: company.companyName = sanitize_string(companyName, 255) or company.companyName
    if nif is not None: company.nif = clean_nif(nif)
    if email is not None: company.email = email.lower().strip()[:255]
    if phone is not None: company.phone = sanitize_string(phone, 50)
    if address is not None: company.address = sanitize_string(address, 255)
    if city is not None: company.city = sanitize_string(city, 100)
    if province is not None: company.province = sanitize_string(province, 100)
    if iban is not None: company.iban = sanitize_string(iban, 100)
    if iban2 is not None: company.iban2 = sanitize_string(iban2, 100)
    if banco1 is not None: company.banco1 = sanitize_string(banco1, 100)
    if banco2 is not None: company.banco2 = sanitize_string(banco2, 100)

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
