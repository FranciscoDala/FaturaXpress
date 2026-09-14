from sqlalchemy.orm import Session
from sqlalchemy import or_, func
from fastapi import HTTPException
from app.modules.products.models import Produto
from app.modules.products.schemas import ProdutoCreateRequest, ProdutoUpdateRequest
import uuid

def get_produtos(db: Session, company_id: uuid.UUID, search: str, categoria: str, tipo: str, ativo: bool, skip: int, limit: int):
    query = db.query(Produto).filter(Produto.company_id == company_id)
    if ativo is not None:
        query = query.filter(Produto.ativo == ativo)

    if search:
        query = query.filter(or_(
            Produto.nome.ilike(f"%{search}%"),
            Produto.codigo.ilike(f"%{search}%"),
            Produto.codigo_barras.ilike(f"%{search}%"),
            Produto.codigo_qr.ilike(f"%{search}%"),
            Produto.categoria.ilike(f"%{search}%")
        ))
    if categoria:
        query = query.filter(Produto.categoria == categoria)
    if tipo: # <- blindagem pra não quebrar com ""
        query = query.filter(Produto.tipo == tipo)
    return query.offset(skip).limit(limit).all()

def count_produtos(db: Session, company_id: uuid.UUID, search: str, categoria: str, tipo: str, ativo: bool):
    query = db.query(func.count(Produto.id)).filter(Produto.company_id == company_id)
    if ativo is not None:
        query = query.filter(Produto.ativo == ativo)

    if search:
        query = query.filter(or_(
            Produto.nome.ilike(f"%{search}%"),
            Produto.codigo.ilike(f"%{search}%"),
            Produto.codigo_barras.ilike(f"%{search}%"),
            Produto.codigo_qr.ilike(f"%{search}%"),
            Produto.categoria.ilike(f"%{search}%")
        ))
    if categoria:
        query = query.filter(Produto.categoria == categoria)
    if tipo: # <- blindagem
        query = query.filter(Produto.tipo == tipo)
    return query.scalar() or 0

def get_produto_by_id(db: Session, produto_id: uuid.UUID, company_id: uuid.UUID) -> Produto | None:
    return db.query(Produto).filter(Produto.id == produto_id, Produto.company_id == company_id).first()

def get_produto_by_codigo(db: Session, codigo: str, company_id: uuid.UUID) -> Produto | None:
    return db.query(Produto).filter(
        Produto.company_id == company_id,
        or_(Produto.codigo == codigo, Produto.codigo_barras == codigo, Produto.codigo_qr == codigo)
    ).first()

def create_produto(db: Session, produto: ProdutoCreateRequest, company_id: uuid.UUID) -> Produto:
    db_produto = get_produto_by_codigo(db, produto.codigo, company_id)
    if db_produto:
        raise HTTPException(status_code=400, detail="Já existe um produto com este código")
    db_produto = Produto(**produto.model_dump(), company_id=company_id)
    db.add(db_produto)
    db.commit()
    db.refresh(db_produto)
    return db_produto

def update_produto(db: Session, produto_id: uuid.UUID, produto: ProdutoUpdateRequest, company_id: uuid.UUID) -> Produto | None:
    db_produto = get_produto_by_id(db, produto_id, company_id)
    if not db_produto: return None
    update_data = produto.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_produto, key, value) # type: ignore
    db.commit()
    db.refresh(db_produto)
    return db_produto

def set_status_produto(db: Session, produto_id: uuid.UUID, company_id: uuid.UUID, status: bool) -> Produto:
    db_produto = get_produto_by_id(db, produto_id, company_id)
    if not db_produto: raise HTTPException(status_code=404, detail="Produto não encontrado")
    db_produto.ativo = status # type: ignore
    db.commit()
    db.refresh(db_produto)
    return db_produto

def baixar_stock(db: Session, produto_id: uuid.UUID, quantidade: float, company_id: uuid.UUID) -> Produto:
    db_produto = get_produto_by_id(db, produto_id, company_id)
    if not db_produto: raise HTTPException(status_code=404, detail="Produto não encontrado")

    if db_produto.controlar_stock and db_produto.stock_atual < quantidade:
        raise ValueError(f"Stock insuficiente. Disponível: {db_produto.stock_atual}")
    if db_produto.controlar_stock:
        db_produto.stock_atual = db_produto.stock_atual - quantidade # type: ignore
        db.commit()
    return db_produto

def get_categorias(db: Session, company_id: uuid.UUID) -> list[str]:
    categorias = db.query(Produto.categoria).filter(Produto.company_id == company_id, Produto.categoria.isnot(None)).distinct().all()
    return [c[0] for c in categorias if c[0]]

def get_produtos_stock_baixo(db: Session, company_id: uuid.UUID) -> list[Produto]:
    return db.query(Produto).filter(
        Produto.company_id == company_id,
        Produto.ativo == True,
        Produto.controlar_stock == True,
        Produto.stock_atual <= Produto.stock_minimo
    ).all()
