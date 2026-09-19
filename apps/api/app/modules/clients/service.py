from sqlalchemy.orm import Session
from sqlalchemy import or_
from app.modules.clients.models import Cliente
from app.modules.clients.schemas import ClienteCreateRequest, ClienteUpdateRequest
from fastapi import HTTPException
import uuid
import re

def clean_nif(nif: str) -> str:
    if not nif:
        return ""
    return re.sub(r'[^A-Za-z0-9]', '', nif).upper()

def validar_nif_local(db: Session, nif: str, company_id: uuid.UUID):
    nif_clean = clean_nif(nif)
    if not nif_clean or len(nif_clean) < 9:
        raise HTTPException(status_code=400, detail="NIF inválido, deve ter no mínimo 9 dígitos")

    # 999999999 é consumidor final genérico - permite sempre
    if nif_clean == "999999999":
        return {"exists": False, "nif": nif_clean, "cliente": None}

    cliente = db.query(Cliente).filter(Cliente.nif == nif_clean, Cliente.company_id == company_id).first()
    if cliente:
        return {"exists": True, "nif": nif_clean, "cliente": cliente}
    return {"exists": False, "nif": nif_clean, "cliente": None}

def get_cliente_by_id(db: Session, cliente_id: uuid.UUID, company_id: uuid.UUID):
    cliente = db.query(Cliente).filter(Cliente.id == cliente_id, Cliente.company_id == company_id).first()
    if not cliente:
        raise HTTPException(status_code=404, detail="Cliente não encontrado")
    return cliente

def get_clientes(db: Session, company_id: uuid.UUID, skip: int = 0, limit: int = 10, search: str = ""):
    query = db.query(Cliente).filter(Cliente.company_id == company_id)

    if search:
        query = query.filter(
            or_(
                Cliente.nome.ilike(f"%{search}%"),
                Cliente.nif.ilike(f"%{search}%")
            )
        )

    total = query.count()
    items = query.offset(skip).limit(limit).all()
    return items, total # <- retorna tupla

def create_cliente(db: Session, cliente: ClienteCreateRequest, company_id: uuid.UUID):
    nif_clean = clean_nif(cliente.nif)
    cliente.nif = nif_clean

    db_cliente = db.query(Cliente).filter(Cliente.nif == nif_clean, Cliente.company_id == company_id).first()
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

    # TRAVA NOME E NIF - NAO DEIXA EDITAR DEPOIS DE CRIADO (PROTEGE SAFT)
    # Se tentar mandar nome ou nif, ignora
    if "nome" in update_data:
        del update_data["nome"]
    if "nif" in update_data:
        del update_data["nif"]

    # 2. Atualiza os campos permitidos (email, telefone, endereco, cidade, provincia)
    for key, value in update_data.items():
        setattr(db_cliente, key, value)

    db.commit()
    db.refresh(db_cliente)
    return db_cliente

def delete_cliente(db: Session, cliente_id: uuid.UUID, company_id: uuid.UUID):
    db_cliente = get_cliente_by_id(db, cliente_id, company_id)
    db.delete(db_cliente)
    db.commit()
    return {"message": "Cliente apagado com sucesso"}
