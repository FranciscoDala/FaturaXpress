import uuid
from sqlalchemy.orm import Session
from fastapi import HTTPException
from passlib.context import CryptContext
from app.modules.funcionarios.models import Funcionario
from app.modules.funcionarios.schemas import FuncionarioCreate
from app.modules.areas.models import Area

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def criar_funcionario(db: Session, company_id: uuid.UUID, dados: FuncionarioCreate):
    if db.query(Funcionario).filter(Funcionario.email == dados.email).first():
        raise HTTPException(400, "Email já existe")

    if dados.cargo not in ["admin", "financeira", "recepcao", "rh"]:
        raise HTTPException(400, "Cargo inválido")

    func = Funcionario(
        id=uuid.uuid4(),
        company_id=company_id,
        nome=dados.nome,
        email=dados.email.lower(),
        senha_hash=pwd_context.hash(dados.senha),
        cargo=dados.cargo,
        area_principal_id=dados.area_principal_id,
        ativo=True
    )

    # vincula áreas N:N
    if dados.areas_ids:
        areas = db.query(Area).filter(Area.id.in_(dados.areas_ids), Area.company_id == company_id).all()
        func.areas = areas

    db.add(func)
    db.commit()
    db.refresh(func)
    return func

def listar_funcionarios(db: Session, company_id: uuid.UUID):
    return db.query(Funcionario).filter(Funcionario.company_id == company_id).order_by(Funcionario.nome).all()
