from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.modules.auth import models, schemas, service

router = APIRouter(prefix="/auth", tags=["Auth"])

@router.post("/register", status_code=201)
def register_company(data: schemas.RegisterRequest, db: Session = Depends(get_db)):
    exists = db.query(models.Company).filter(
        (models.Company.nif == data.nif) | (models.Company.email == data.emailCompany)
    ).first()
    if exists:
        raise HTTPException(status_code=400, detail="NIF ou Email já cadastrado")

    password_hash = service.hash_password(data.password)

    company = models.Company(
        id=service.generate_id(),
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
    db.commit()
    db.refresh(company)

    admin_user = models.User(
        id=service.generate_id(),
        company_id=company.id,
        name=data.companyName,
        email=data.emailCompany,
        password_hash=password_hash,
        role="admin"
    )
    db.add(admin_user)
    db.commit()

    return {"message": "Empresa e usuário admin cadastrados com sucesso"}

@router.post("/login", response_model=schemas.TokenResponse)
def login(data: schemas.LoginRequest, db: Session = Depends(get_db)):
    company_response = None
    target_id: str = ""
    target_nif: str = ""

    user = db.query(models.User).filter(models.User.email == data.email).first()

    if user and service.verify_password(data.password, user.password_hash):
        target_id = user.id
        target_nif = user.company.nif
        company_response = user.company

    else:
        company = db.query(models.Company).filter(
            (models.Company.email == data.email) | (models.Company.nif == data.email)
        ).first()
        if not company or not service.verify_password(data.password, company.password_hash):
            raise HTTPException(status_code=401, detail="Credenciais inválidas")
        target_id = company.id
        target_nif = company.nif
        company_response = company

    token = service.create_access_token({"sub": target_id, "nif": target_nif})

    return {
        "message": "Login realizado",
        "token": token,
        "company": company_response
    }
