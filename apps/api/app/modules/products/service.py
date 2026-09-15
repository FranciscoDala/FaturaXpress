from sqlalchemy.orm import Session
from sqlalchemy import or_, func
from fastapi import HTTPException
from app.modules.products.models import Produto
from app.modules.products.schemas import ProdutoCreateRequest, ProdutoUpdateRequest
import uuid

def get_produto_by_id(db: Session, produto_id: uuid.UUID, company_id: uuid.UUID):
    produto = db.query(Produto).filter(Produto.id == produto_id, Produto.company_id == company_id).first()
    if not produto:
        raise HTTPException(status_code=404, detail="Produto não encontrado")
    return produto

def get_produto_by_codigo(db: Session, codigo: str, company_id: uuid.UUID):
    return db.query(Produto).filter(
        Produto.company_id == company_id,
        or_(Produto.codigo == codigo, Produto.codigo_barras == codigo, Produto.codigo_qr == codigo)
    ).first()

def get_produtos(db: Session, company_id: uuid.UUID, search: str = "", categoria: str = "", tipo: str = "", ativo: bool | None = None, skip: int = 0, limit: int = 10):
    query = db.query(Produto).filter(Produto.company_id == company_id)

    if ativo is not None:
        query = query.filter(Produto.ativo == ativo)
    if search:
        query = query.filter(or_(
            Produto.nome.ilike(f"%{search}%"),
            Produto.codigo.ilike(f"%{search}%"),
            Produto.categoria.ilike(f"%{search}%")
        ))
    if categoria:
        query = query.filter(Produto.categoria == categoria)
    if tipo:
        query = query.filter(Produto.tipo == tipo)

    total = query.count()
    items = query.offset(skip).limit(limit).all()
    return items, total

def create_produto(db: Session, produto: ProdutoCreateRequest, company_id: uuid.UUID):
    exists = get_produto_by_codigo(db, produto.codigo, company_id)
    if exists:
        raise HTTPException(status_code=400, detail="Já existe um produto com este código")
    db_produto = Produto(**produto.model_dump(), company_id=company_id)
    db.add(db_produto)
    db.commit()
    db.refresh(db_produto)
    return db_produto

def update_produto(db: Session, produto_id: uuid.UUID, produto_update: ProdutoUpdateRequest, company_id: uuid.UUID):
    db_produto = get_produto_by_id(db, produto_id, company_id)
    for key, value in produto_update.model_dump(exclude_unset=True).items():
        setattr(db_produto, key, value)
    db.commit()
    db.refresh(db_produto)
    return db_produto

def delete_produto(db: Session, produto_id: uuid.UUID, company_id: uuid.UUID):
    db_produto = get_produto_by_id(db, produto_id, company_id)
    db.delete(db_produto)
    db.commit()
    return {"message": "Produto apagado"}

def baixar_stock(db: Session, produto_id: uuid.UUID, quantidade: float, company_id: uuid.UUID):
    db_produto = get_produto_by_id(db, produto_id, company_id)
    if db_produto.controlar_stock and db_produto.stock_atual < quantidade:
        raise ValueError(f"Stock insuficiente. Disponível: {db_produto.stock_atual}")
    if db_produto.controlar_stock:
        db_produto.stock_atual -= quantidade
        db.commit()
    return db_produto

def get_categorias(db: Session, company_id: uuid.UUID) -> list[str]:
    rows = db.query(Produto.categoria).filter(Produto.company_id == company_id, Produto.categoria.isnot(None)).distinct().all()
    return [r[0] for r in rows if r[0]]

def get_produtos_stock_baixo(db: Session, company_id: uuid.UUID):
    return db.query(Produto).filter(
        Produto.company_id == company_id, Produto.ativo == True,
        Produto.controlar_stock == True, Produto.stock_atual <= Produto.stock_minimo
    ).all()

def set_status_produto(db: Session, produto_id: uuid.UUID, company_id: uuid.UUID, status: bool):
    db_produto = get_produto_by_id(db, produto_id, company_id)
    db_produto.ativo = status
    db.commit()
    db.refresh(db_produto)
    return db_produto
