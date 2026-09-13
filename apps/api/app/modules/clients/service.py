from sqlalchemy.orm import Session
from app.modules.clients.models import Cliente
from app.modules.clients.schemas import ClienteCreateRequest, ClienteUpdateRequest
from fastapi import HTTPException
import uuid

def get_cliente_by_id(db: Session, cliente_id: uuid.UUID, company_id: uuid.UUID):
    cliente = db.query(Cliente).filter(Cliente.id == cliente_id, Cliente.company_id == company_id).first()
    if not cliente:
        raise HTTPException(status_code=404, detail="Cliente não encontrado")
    return cliente

def get_clientes(db: Session, company_id: uuid.UUID, skip: int = 0, limit: int = 100):
    return db.query(Cliente).filter(Cliente.company_id == company_id).offset(skip).limit(limit).all()

def create_cliente(db: Session, cliente: ClienteCreateRequest, company_id: uuid.UUID):
    db_cliente = db.query(Cliente).filter(Cliente.nif == cliente.nif, Cliente.company_id == company_id).first()
    if db_cliente:
        raise HTTPException(status_code=400, detail="Já existe um cliente com este NIF")

    db_cliente = Cliente(**cliente.model_dump(), company_id=company_id)
    db.add(db_cliente)
    db.commit()
    db.refresh(db_cliente)
    return db_cliente

def update_cliente(db: Session, cliente_id: uuid.UUID, cliente_update: ClienteUpdateRequest, company_id: uuid.UUID):
    db_cliente = get_cliente_by_id(db, cliente_id, company_id)
    update_data = cliente_update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_cliente, key, value)
    db.commit()
    db.refresh(db_cliente)
    return db_cliente

def delete_cliente(db: Session, cliente_id: uuid.UUID, company_id: uuid.UUID):
    db_cliente = get_cliente_by_id(db, cliente_id, company_id)
    db.delete(db_cliente)
    db.commit()
    return {"message": "Cliente deletado com sucesso"}
