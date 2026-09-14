from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
import uuid
from typing import List

from app.db.session import get_db
from app.modules.clients.schemas import ClienteCreateRequest, ClienteResponse, ClienteUpdateRequest
from app.modules.clients import service as cliente_service
from app.core.security import get_current_company_id

router = APIRouter(prefix="/clientes", tags=["Clientes"]) # <- MUDEI AQUI: tirei /api

@router.post("/", response_model=ClienteResponse, status_code=201)
def create_cliente(
    cliente: ClienteCreateRequest,
    db: Session = Depends(get_db),
    company_id: uuid.UUID = Depends(get_current_company_id)
):
    return cliente_service.create_cliente(db=db, cliente=cliente, company_id=company_id)

@router.get("/")
def read_clientes(
    skip: int = Query(0, ge=0),
    limit: int = Query(10, ge=1, le=100),
    search: str = Query("", description="Buscar por nome ou NIF"),
    db: Session = Depends(get_db),
    company_id: uuid.UUID = Depends(get_current_company_id)
):
    items, total = cliente_service.get_clientes(db, company_id=company_id, skip=skip, limit=limit, search=search)
    return {"items": items, "total": total}

@router.get("/{cliente_id}", response_model=ClienteResponse)
def read_cliente(
    cliente_id: uuid.UUID,
    db: Session = Depends(get_db),
    company_id: uuid.UUID = Depends(get_current_company_id)
):
    return cliente_service.get_cliente_by_id(db=db, cliente_id=cliente_id, company_id=company_id)

@router.put("/{cliente_id}", response_model=ClienteResponse)
def update_cliente(
    cliente_id: uuid.UUID,
    cliente: ClienteUpdateRequest,
    db: Session = Depends(get_db),
    company_id: uuid.UUID = Depends(get_current_company_id)
):
    return cliente_service.update_cliente(db=db, cliente_id=cliente_id, cliente_update=cliente, company_id=company_id)

@router.delete("/{cliente_id}")
def delete_cliente(
    cliente_id: uuid.UUID,
    db: Session = Depends(get_db),
    company_id: uuid.UUID = Depends(get_current_company_id)
):
    return cliente_service.delete_cliente(db=db, cliente_id=cliente_id, company_id=company_id)
