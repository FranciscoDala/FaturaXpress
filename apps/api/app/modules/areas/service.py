import uuid
from sqlalchemy.orm import Session
from app.modules.areas.models import Area
from app.modules.areas.schemas import AreaCreate, AreaUpdate

def criar_area(db: Session, company_id: uuid.UUID, dados: AreaCreate):
    area = Area(
        id=uuid.uuid4(),
        company_id=company_id,
        nome=dados.nome,
        descricao=dados.descricao,
        cor=dados.cor or "#E6F0FF",
        ativo=True
    )
    db.add(area)
    db.commit()
    db.refresh(area)
    return area

def listar_areas(db: Session, company_id: uuid.UUID):
    return db.query(Area).filter(Area.company_id == company_id, Area.ativo == True).order_by(Area.nome).all()

def atualizar_area(db: Session, area: Area, dados: AreaUpdate):
    for k, v in dados.model_dump(exclude_unset=True).items():
        setattr(area, k, v)
    db.commit()
    db.refresh(area)
    return area
