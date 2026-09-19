from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
import uuid
from typing import List
from app.db.session import get_db
from app.core.security import get_current_company_id
from app.modules.areas.schemas import AreaCreate, AreaResponse, AreaUpdate
from app.modules.areas import service as area_service
from app.modules.areas.models import Area

router = APIRouter(prefix="/areas", tags=["Áreas"])

@router.post("", response_model=AreaResponse, status_code=201)
def criar(dados: AreaCreate, db: Session = Depends(get_db), company_id: uuid.UUID = Depends(get_current_company_id)):
    return area_service.criar_area(db, company_id, dados)

@router.get("", response_model=List[AreaResponse])
def listar(db: Session = Depends(get_db), company_id: uuid.UUID = Depends(get_current_company_id)):
    return area_service.listar_areas(db, company_id)

@router.patch("/{area_id}", response_model=AreaResponse)
def atualizar(area_id: uuid.UUID, dados: AreaUpdate, db: Session = Depends(get_db), company_id: uuid.UUID = Depends(get_current_company_id)):
    area = db.query(Area).filter(Area.id == area_id, Area.company_id == company_id).first()
    if not area:
        from fastapi import HTTPException
        raise HTTPException(404, "Área não encontrada")
    return area_service.atualizar_area(db, area, dados)
