from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
import uuid
from typing import List
import logging

from app.db.session import get_db
from app.modules.clients.schemas import ClienteCreateRequest, ClienteResponse, ClienteUpdateRequest, ClienteValidarNifRequest, ClienteValidarNifResponse
from app.modules.clients import service as cliente_service
from app.core.security import get_current_company_id
from app.modules.realtime.manager import manager

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/clientes", tags=["Clientes"])

# NOVO - CONSULTA NIF ANTES DE ABRIR O FORM
@router.post("/validar-nif", response_model=ClienteValidarNifResponse)
def validar_nif_cliente(
    payload: ClienteValidarNifRequest,
    db: Session = Depends(get_db),
    company_id: uuid.UUID = Depends(get_current_company_id)
):
    result = cliente_service.validar_nif_local(db=db, nif=payload.nif, company_id=company_id)
    if result["exists"]:
        return {
            "exists": True,
            "nif": result["nif"],
            "message": "Cliente já cadastrado",
            "cliente": result["cliente"]
        }
    return {
        "exists": False,
        "nif": result["nif"],
        "message": "NIF novo, pode cadastrar",
        "cliente": None
    }

@router.post("/", response_model=ClienteResponse, status_code=201)
async def create_cliente(
    cliente: ClienteCreateRequest,
    db: Session = Depends(get_db),
    company_id: uuid.UUID = Depends(get_current_company_id)
):
    result = cliente_service.create_cliente(db=db, cliente=cliente, company_id=company_id)
    try:
        await manager.broadcast(company_id, {"event": "clientes:changed", "action": "created", "id": str(result.id) if hasattr(result, 'id') else None})
    except Exception as e:
        logger.warning(f"Falha broadcast clientes:changed: {e}")
    return result

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
async def update_cliente(
    cliente_id: uuid.UUID,
    cliente: ClienteUpdateRequest,
    db: Session = Depends(get_db),
    company_id: uuid.UUID = Depends(get_current_company_id)
):
    result = cliente_service.update_cliente(db=db, cliente_id=cliente_id, cliente_update=cliente, company_id=company_id)
    try:
        await manager.broadcast(company_id, {"event": "clientes:changed", "action": "updated", "id": str(cliente_id)})
    except Exception as e:
        logger.warning(f"Falha broadcast clientes:changed: {e}")
    return result

@router.delete("/{cliente_id}")
async def delete_cliente(
    cliente_id: uuid.UUID,
    db: Session = Depends(get_db),
    company_id: uuid.UUID = Depends(get_current_company_id)
):
    result = cliente_service.delete_cliente(db=db, cliente_id=cliente_id, company_id=company_id)
    try:
        await manager.broadcast(company_id, {"event": "clientes:changed", "action": "deleted", "id": str(cliente_id)})
    except Exception as e:
        logger.warning(f"Falha broadcast clientes:changed: {e}")
    return result
