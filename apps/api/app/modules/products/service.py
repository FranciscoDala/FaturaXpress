from sqlalchemy.orm import Session
from sqlalchemy import or_
from fastapi import HTTPException
from app.modules.products.models import Produto, TipoProdutoEnum
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
    exists = db.query(Produto).filter(Produto.company_id == company_id, Produto.codigo == produto.codigo).first()
    if exists:
        raise HTTPException(status_code=400, detail="Já existe um produto com este código")

    # SEGURANCA IVA POR TIPO
    data = produto.model_dump()
    if data.get("tipo") in [TipoProdutoEnum.servico, TipoProdutoEnum.kit]:
        data["tem_iva"] = False
        data["iva"] = 0.0
        data["controlar_stock"] = False
        data["stock_atual"] = 0.0
    else:
        data["tem_iva"] = True
        if data.get("iva", 0) == 0:
            data["iva"] = 14.0

    db_produto = Produto(**data, company_id=company_id)
    db.add(db_produto)
    db.commit()
    db.refresh(db_produto)
    return db_produto

def update_produto(db: Session, produto_id: uuid.UUID, produto_update: ProdutoUpdateRequest, company_id: uuid.UUID):
    db_produto = get_produto_by_id(db, produto_id, company_id)
    update_dict = produto_update.model_dump(exclude_unset=True)

    # SEGURANCA IVA POR TIPO NO UPDATE
    if "tipo" in update_dict:
        if update_dict["tipo"] in [TipoProdutoEnum.servico, TipoProdutoEnum.kit]:
            update_dict["tem_iva"] = False
            update_dict["iva"] = 0.0
            update_dict["controlar_stock"] = False
            update_dict["stock_atual"] = 0.0
        else:
            update_dict["tem_iva"] = True
            if update_dict.get("iva", 0) == 0:
                update_dict["iva"] = 14.0

    for key, value in update_dict.items():
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
    # NAO DESCONTA SE FOR ILIMITADO / SERVICO / KIT
    if not db_produto.controlar_stock:
        return db_produto
    if db_produto.stock_atual < quantidade:
        raise ValueError(f"Stock insuficiente. Disponível: {db_produto.stock_atual}")
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
