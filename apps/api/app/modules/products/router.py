from fastapi import APIRouter, Depends, Query, HTTPException, Form, File, UploadFile
from sqlalchemy.orm import Session
import uuid
from typing import List, Optional
import logging

from app.db.session import get_db
from app.modules.products.schemas import ProdutoCreateRequest, ProdutoResponse, ProdutoUpdateRequest, BaixaStockRequest, TipoProdutoEnum
from app.modules.products import service as produto_service
from app.core.security import get_current_company_id
from app.modules.realtime.manager import manager

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/produtos", tags=["Produtos"])

@router.get("/categorias/lista", response_model=List[str])
def listar_categorias(db: Session = Depends(get_db), company_id: uuid.UUID = Depends(get_current_company_id)):
    return produto_service.get_categorias(db, company_id)

@router.get("/alerta/stock-baixo", response_model=List[ProdutoResponse])
def produtos_stock_baixo(db: Session = Depends(get_db), company_id: uuid.UUID = Depends(get_current_company_id)):
    return produto_service.get_produtos_stock_baixo(db, company_id)

@router.get("/")
def listar_produtos(
    skip: int = Query(0, ge=0),
    limit: int = Query(10, ge=1, le=100),
    search: str = Query("", description="Buscar por nome ou codigo"),
    categoria: Optional[str] = Query(None),
    tipo: Optional[str] = Query(None),
    ativo: Optional[bool] = Query(None),
    db: Session = Depends(get_db),
    company_id: uuid.UUID = Depends(get_current_company_id)
):
    try:
        items, total = produto_service.get_produtos(db, company_id, search, categoria or "", tipo or "", ativo, skip, limit)
        return {"items": items, "total": total}
    except Exception as e:
        logger.exception(f"[PRODUTOS] ERRO: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/codigo/{codigo}", response_model=ProdutoResponse)
def buscar_por_codigo(codigo: str, db: Session = Depends(get_db), company_id: uuid.UUID = Depends(get_current_company_id)):
    produto = produto_service.get_produto_by_codigo(db, codigo, company_id)
    if not produto:
        raise HTTPException(status_code=404, detail="Produto não encontrado")
    return produto

@router.get("/{produto_id}", response_model=ProdutoResponse)
def buscar_por_id(produto_id: uuid.UUID, db: Session = Depends(get_db), company_id: uuid.UUID = Depends(get_current_company_id)):
    return produto_service.get_produto_by_id(db, produto_id, company_id)

@router.post("/", response_model=ProdutoResponse, status_code=201)
async def criar_produto(
    nome: str = Form(...), codigo: str = Form(...), preco_venda: float = Form(...),
    tipo: str = Form("produto"), unidade: str = Form("UN"), ativo: bool = Form(True),
    controlar_stock: bool = Form(True), stock_atual: float = Form(0.0), stock_minimo: float = Form(0.0),
    preco_custo: float = Form(0.0),
    codigo_barras: Optional[str] = Form(None), codigo_qr: Optional[str] = Form(None),
    descricao: Optional[str] = Form(None), categoria: Optional[str] = Form(None),
    iva: float = Form(14.0), tem_iva: bool = Form(True), peso: Optional[float] = Form(None),
    imagem: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db), company_id: uuid.UUID = Depends(get_current_company_id)
):
    imagem_url = None
    if imagem:
        try:
            from app.core.upload_Imagem import upload_image
            imagem_url = await upload_image(imagem, folder=f"produtos/{company_id}")
        except Exception as e:
            logger.warning(f"Falha upload: {e}")

    tipo_enum = TipoProdutoEnum(tipo) if tipo in ["produto","servico","kit"] else TipoProdutoEnum.produto

    # REGRA IVA AUTOMATICA POR TIPO
    if tipo_enum in [TipoProdutoEnum.servico, TipoProdutoEnum.kit]:
        tem_iva = False
        iva = 0.0
        controlar_stock = False
        stock_atual = 0.0
    else:
        tem_iva = True
        if iva == 0:
            iva = 14.0

    produto_data = ProdutoCreateRequest(
        nome=nome, codigo=codigo, preco_venda=preco_venda, tipo=tipo_enum, unidade=unidade,
        ativo=ativo, controlar_stock=controlar_stock, stock_atual=stock_atual,
        stock_minimo=stock_minimo, preco_custo=preco_custo, codigo_barras=codigo_barras, codigo_qr=codigo_qr,
        descricao=descricao, categoria=categoria, iva=iva, tem_iva=tem_iva, peso=peso, imagem_url=imagem_url
    )
    result = produto_service.create_produto(db, produto_data, company_id)
    try:
        await manager.broadcast(company_id, {"event": "produtos:changed", "action": "created", "id": str(result.id) if hasattr(result, 'id') else None})
    except Exception as e:
        logger.warning(f"Falha broadcast produtos:changed: {e}")
    return result

@router.put("/{produto_id}", response_model=ProdutoResponse)
async def atualizar_produto(
    produto_id: uuid.UUID,
    nome: Optional[str] = Form(None), codigo: Optional[str] = Form(None), preco_venda: Optional[float] = Form(None),
    tipo: Optional[str] = Form(None), unidade: Optional[str] = Form(None), ativo: Optional[bool] = Form(None),
    controlar_stock: Optional[bool] = Form(None), stock_atual: Optional[float] = Form(None), stock_minimo: Optional[float] = Form(None),
    preco_custo: Optional[float] = Form(None), codigo_barras: Optional[str] = Form(None), codigo_qr: Optional[str] = Form(None),
    descricao: Optional[str] = Form(None), categoria: Optional[str] = Form(None),
    iva: Optional[float] = Form(None), tem_iva: Optional[bool] = Form(None), peso: Optional[float] = Form(None),
    imagem: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db), company_id: uuid.UUID = Depends(get_current_company_id)
):
    update_data = {}
    if nome is not None: update_data["nome"] = nome
    if codigo is not None: update_data["codigo"] = codigo
    if preco_venda is not None: update_data["preco_venda"] = preco_venda
    if tipo is not None and tipo in ["produto","servico","kit"]:
        tipo_enum = TipoProdutoEnum(tipo)
        update_data["tipo"] = tipo_enum
        # REGRA IVA AUTOMATICA AO EDITAR
        if tipo_enum in [TipoProdutoEnum.servico, TipoProdutoEnum.kit]:
            update_data["tem_iva"] = False
            update_data["iva"] = 0.0
            update_data["controlar_stock"] = False
            update_data["stock_atual"] = 0.0
        else:
            update_data["tem_iva"] = True
            update_data["iva"] = iva if (iva is not None and iva!= 0) else 14.0
    if unidade is not None: update_data["unidade"] = unidade
    if ativo is not None: update_data["ativo"] = ativo
    if controlar_stock is not None and "controlar_stock" not in update_data: update_data["controlar_stock"] = controlar_stock
    if stock_atual is not None and "stock_atual" not in update_data: update_data["stock_atual"] = stock_atual
    if stock_minimo is not None: update_data["stock_minimo"] = stock_minimo
    if preco_custo is not None: update_data["preco_custo"] = preco_custo
    if codigo_barras is not None: update_data["codigo_barras"] = codigo_barras
    if codigo_qr is not None: update_data["codigo_qr"] = codigo_qr
    if descricao is not None: update_data["descricao"] = descricao
    if categoria is not None: update_data["categoria"] = categoria
    # So atualiza IVA se nao foi definido pela regra de tipo acima
    if iva is not None and "iva" not in update_data: update_data["iva"] = iva
    if tem_iva is not None and "tem_iva" not in update_data: update_data["tem_iva"] = tem_iva
    if peso is not None: update_data["peso"] = peso

    if imagem:
        try:
            from app.core.upload_Imagem import upload_image
            imagem_url = await upload_image(imagem, folder=f"produtos/{company_id}")
            update_data["imagem_url"] = imagem_url
        except Exception as e:
            logger.warning(f"Falha upload edição: {e}")

    produto_update = ProdutoUpdateRequest(**update_data)
    result = produto_service.update_produto(db, produto_id, produto_update, company_id)
    try:
        await manager.broadcast(company_id, {"event": "produtos:changed", "action": "updated", "id": str(produto_id)})
    except Exception as e:
        logger.warning(f"Falha broadcast produtos:changed: {e}")
    return result

@router.delete("/{produto_id}")
async def delete_produto(produto_id: uuid.UUID, db: Session = Depends(get_db), company_id: uuid.UUID = Depends(get_current_company_id)):
    result = produto_service.delete_produto(db, produto_id, company_id)
    try:
        await manager.broadcast(company_id, {"event": "produtos:changed", "action": "deleted", "id": str(produto_id)})
    except Exception as e:
        logger.warning(f"Falha broadcast produtos:changed: {e}")
    return result

@router.post("/{produto_id}/baixa-stock")
async def dar_baixa_stock(produto_id: uuid.UUID, dados: BaixaStockRequest, db: Session = Depends(get_db), company_id: uuid.UUID = Depends(get_current_company_id)):
    try:
        produto_service.baixar_stock(db, produto_id, dados.quantidade, company_id)
        try:
            await manager.broadcast(company_id, {"event": "produtos:changed", "action": "stock", "id": str(produto_id)})
        except Exception as e:
            logger.warning(f"Falha broadcast produtos:changed: {e}")
        return {"detail": "Stock atualizado"}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
