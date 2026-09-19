import uuid
from sqlalchemy.orm import Session
from typing import List
from app.modules.areas.models import Area
from app.modules.areas.schemas import AreaCreate, AreaUpdate

DEFAULT_AREAS = [
    {"nome": "Atendimento", "cor": "#E6F0FF", "descricao": "Vendas e atendimento"},
    {"nome": "Financeiro", "cor": "#E6FFE6", "descricao": "Faturas e pagamentos"},
    {"nome": "RH", "cor": "#FFF4E6", "descricao": "Recursos humanos"},
]

def seed_areas(db: Session, company_id: uuid.UUID) -> List[Area]:
    exists = db.query(Area).filter(Area.company_id == company_id).first()
    if exists:
        return db.query(Area).filter(Area.company_id == company_id, Area.ativo == True).all()

    areas = []
    for a in DEFAULT_AREAS:
        area = Area(
            id=uuid.uuid4(),
            company_id=company_id,
            nome=a["nome"],
            cor=a["cor"],
            descricao=a["descricao"],
            ativo=True
        )
        db.add(area)
        areas.append(area)
    db.commit()
    for area in areas:
        db.refresh(area)
    return areas

def criar_area(db: Session, company_id: uuid.UUID, dados: AreaCreate):
    dup = db.query(Area).filter(
        Area.company_id == company_id,
        Area.nome.ilike(dados.nome.strip()),
        Area.ativo == True
    ).first()
    if dup:
        return dup

    area = Area(
        id=uuid.uuid4(),
        company_id=company_id,
        nome=dados.nome.strip(),
        descricao=dados.descricao,
        cor=dados.cor or "#E6F0FF",
        ativo=True
    )
    db.add(area)
    db.commit()
    db.refresh(area)
    return area

def listar_areas(db: Session, company_id: uuid.UUID):
    return db.query(Area).filter(
        Area.company_id == company_id,
        Area.ativo == True
    ).order_by(Area.nome).all()

def obter_area(db: Session, company_id: uuid.UUID, area_id: uuid.UUID):
    return db.query(Area).filter(
        Area.id == area_id,
        Area.company_id == company_id
    ).first()

def atualizar_area(db: Session, area: Area, dados: AreaUpdate):
    data = dados.model_dump(exclude_unset=True)
    if 'nome' in data and data['nome']:
        data['nome'] = data['nome'].strip()
    for k, v in data.items():
        setattr(area, k, v)
    db.commit()
    db.refresh(area)
    return area

def desativar_area(db: Session, area: Area):
    area.ativo = False
    db.commit()
    return area
