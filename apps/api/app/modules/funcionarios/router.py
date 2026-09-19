from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
import uuid
from typing import List
from app.db.session import get_db
from app.core.security import get_current_company_id
from app.modules.funcionarios.schemas import FuncionarioCreate, FuncionarioResponse, FuncionarioUpdate
from app.modules.funcionarios import service as func_service
from app.modules.funcionarios.models import Funcionario

router = APIRouter(prefix="/funcionarios", tags=["Funcionários"])

@router.post("", response_model=FuncionarioResponse, status_code=201)
def criar(dados: FuncionarioCreate, db: Session = Depends(get_db), company_id: uuid.UUID = Depends(get_current_company_id)):
    return func_service.criar_funcionario(db, company_id, dados)

@router.get("", response_model=List[FuncionarioResponse])
def listar(db: Session = Depends(get_db), company_id: uuid.UUID = Depends(get_current_company_id)):
    return func_service.listar_funcionarios(db, company_id)
