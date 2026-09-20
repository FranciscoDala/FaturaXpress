from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
import uuid
from typing import List
from app.db.session import get_db
from app.core.security import get_current_company_id
from app.modules.funcionarios.schemas import FuncionarioCreate, FuncionarioResponse, FuncionarioUpdate
from app.modules.funcionarios import service as func_service

router = APIRouter(prefix="/funcionarios", tags=["Funcionários"])

@router.post("", response_model=FuncionarioResponse, status_code=201)
def criar(dados: FuncionarioCreate, db: Session = Depends(get_db), company_id: uuid.UUID = Depends(get_current_company_id)):
    return func_service.criar_funcionario(db, company_id, dados)

@router.get("", response_model=List[FuncionarioResponse])
def listar(db: Session = Depends(get_db), company_id: uuid.UUID = Depends(get_current_company_id)):
    return func_service.listar_funcionarios(db, company_id)

@router.get("/{funcionario_id}", response_model=FuncionarioResponse)
def obter(funcionario_id: uuid.UUID, db: Session = Depends(get_db), company_id: uuid.UUID = Depends(get_current_company_id)):
    func = func_service.obter_funcionario(db, company_id, funcionario_id)
    if not func:
        raise HTTPException(404, "Funcionário não encontrado")
    return func

@router.put("/{funcionario_id}", response_model=FuncionarioResponse)
@router.patch("/{funcionario_id}", response_model=FuncionarioResponse)
def atualizar(funcionario_id: uuid.UUID, dados: FuncionarioUpdate, db: Session = Depends(get_db), company_id: uuid.UUID = Depends(get_current_company_id)):
    func = func_service.obter_funcionario(db, company_id, funcionario_id)
    if not func:
        raise HTTPException(404, "Funcionário não encontrado")
    return func_service.atualizar_funcionario(db, func, dados, company_id)

@router.delete("/{funcionario_id}", status_code=204)
def desativar(funcionario_id: uuid.UUID, db: Session = Depends(get_db), company_id: uuid.UUID = Depends(get_current_company_id)):
    func = func_service.obter_funcionario(db, company_id, funcionario_id)
    if not func:
        raise HTTPException(404, "Funcionário não encontrado")
    func_service.desativar_funcionario(db, func)
    return None

@router.post("/login-bi")
def login_bi(numero_bi: str, senha: str, db: Session = Depends(get_db)):
    from app.modules.funcionarios.models import Funcionario
    from app.modules.funcionarios.service import pwd_context
    bi = numero_bi.strip().upper()
    func = db.query(Funcionario).filter(Funcionario.numero_bi == bi, Funcionario.tem_acesso == True, Funcionario.ativo == True).first()
    if not func or not func.senha_hash or not pwd_context.verify(senha, func.senha_hash):
        raise HTTPException(401, "BI ou senha inválidos")
    return {"id": func.id, "nome": func.nome, "cargo": func.cargo, "company_id": func.company_id}
