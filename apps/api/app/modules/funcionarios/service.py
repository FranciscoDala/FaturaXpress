import uuid
from sqlalchemy.orm import Session
from fastapi import HTTPException
from passlib.context import CryptContext
from typing import List
from app.modules.funcionarios.models import Funcionario
from app.modules.funcionarios.schemas import FuncionarioCreate, FuncionarioUpdate
from app.modules.areas.models import Area

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
CARGOS_VALIDOS = ["admin", "financeira", "recepcao", "rh"]

def criar_funcionario(db: Session, company_id: uuid.UUID, dados: FuncionarioCreate):
    if db.query(Funcionario).filter(Funcionario.company_id == company_id, Funcionario.email == dados.email.lower()).first():
        raise HTTPException(400, "Email já existe nessa empresa")

    if dados.cargo not in CARGOS_VALIDOS:
        raise HTTPException(400, f"Cargo inválido. Use: {', '.join(CARGOS_VALIDOS)}")

    func = Funcionario(
        id=uuid.uuid4(),
        company_id=company_id,
        nome=dados.nome.strip(),
        email=dados.email.lower().strip(),
        senha_hash=pwd_context.hash(dados.senha),
        cargo=dados.cargo,
        area_principal_id=dados.area_principal_id,
        ativo=True
    )

    if dados.areas_ids:
        areas = db.query(Area).filter(Area.id.in_(dados.areas_ids), Area.company_id == company_id).all()
        if len(areas)!= len(dados.areas_ids):
            raise HTTPException(400, "Uma ou mais áreas não encontradas")
        func.areas = areas

    db.add(func)
    db.commit()
    db.refresh(func)
    return func

def listar_funcionarios(db: Session, company_id: uuid.UUID) -> List[Funcionario]:
    return db.query(Funcionario).filter(
        Funcionario.company_id == company_id,
        Funcionario.ativo == True
    ).order_by(Funcionario.nome).all()

def obter_funcionario(db: Session, company_id: uuid.UUID, funcionario_id: uuid.UUID):
    return db.query(Funcionario).filter(
        Funcionario.id == funcionario_id,
        Funcionario.company_id == company_id
    ).first()

def atualizar_funcionario(db: Session, funcionario: Funcionario, dados: FuncionarioUpdate, company_id: uuid.UUID):
    data = dados.model_dump(exclude_unset=True, exclude={'areas_ids'})

    if 'nome' in data and data['nome']:
        data['nome'] = data['nome'].strip()
    if 'cargo' in data and data['cargo'] not in CARGOS_VALIDOS:
        raise HTTPException(400, f"Cargo inválido. Use: {', '.join(CARGOS_VALIDOS)}")

    for k, v in data.items():
        setattr(funcionario, k, v)

    if dados.areas_ids is not None:
        if dados.areas_ids:
            areas = db.query(Area).filter(Area.id.in_(dados.areas_ids), Area.company_id == company_id).all()
            funcionario.areas = areas
        else:
            funcionario.areas = []

    db.commit()
    db.refresh(funcionario)
    return funcionario

def desativar_funcionario(db: Session, funcionario: Funcionario):
    funcionario.ativo = False
    db.commit()
    return funcionario
