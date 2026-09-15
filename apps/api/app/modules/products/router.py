from fastapi import APIRouter, Depends, Query, HTTPException, Path, Form, File, UploadFile
from sqlalchemy.orm import Session
import uuid
from typing import List, Optional
import logging

from app.db.session import get_db
from app.modules.products.schemas import ProdutoCreateRequest, ProdutoResponse, ProdutoUpdateRequest, BaixaStockRequest, TipoProdutoEnum
from app.modules.products import service as produto_service
from app.core.security import get_current_company_id

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/produtos", tags=["Produtos"])

# FIXAS PRIMEIRO
@router.get("/categorias/lista", response_model=List[str])
def listar_categorias(db: Session = Depends(get_db), company_id: uuid.UUID = Depends(get_current_company_id)):
    return produto_service.get_categorias(db, company_id)

@router.get("/alerta/stock-baixo", response_model=List[ProdutoResponse])
def produtos_stock_baixo(db: Session = Depends(get_db), company_id: uuid.UUID = Depends(get_current_company_id)):
    return produto_service.get_produtos_stock_baixo(db, company_id)

# LISTAR - IGUAL AO CLIENTE
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
        logger.info(f"[PRODUTOS] company={company_id} skip={skip} search={search}")
        items, total = produto_service.get_produtos(db, company_id, search, categoria or "", tipo or "", ativo, skip, limit)
        return {"items": items, "total": total}
    except Exception as e:
        logger.exception(f"[PRODUTOS] ERRO: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# DINAMICAS DEPOIS
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
    preco_custo: float = Form(0.0), codigo_barras: Optional[str] = Form(None),
    descricao: Optional[str] = Form(None), categoria: Optional[str] = Form(None),
    iva: float = Form(14.0), tem_iva: bool = Form(True),
    imagem: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db), company_id: uuid.UUID = Depends(get_current_company_id)
):
    imagem_url = None
    if imagem:
        try:
            from app.core.upload_Imagem import upload_image # minusculo!
            imagem_url = await upload_image(imagem, folder=f"produtos/{company_id}")
        except Exception as e:
            logger.warning(f"Falha upload: {e}")

    # Converte tipo str para Enum
    tipo_enum = TipoProdutoEnum.produto
    if tipo in ["produto", "servico", "kit"]:
        tipo_enum = TipoProdutoEnum(tipo)

    produto_data = ProdutoCreateRequest(
        nome=nome, codigo=codigo, preco_venda=preco_venda, tipo=tipo_enum, unidade=unidade,
        ativo=ativo, controlar_stock=controlar_stock, stock_atual=stock_atual,
        stock_minimo=stock_minimo, preco_custo=preco_custo, codigo_barras=codigo_barras,
        descricao=descricao, categoria=categoria, iva=iva, tem_iva=tem_iva, imagem_url=imagem_url
    )
    return produto_service.create_produto(db, produto_data, company_id)

@router.put("/{produto_id}", response_model=ProdutoResponse)
def atualizar_produto(
    produto_id: uuid.UUID,
    produto: ProdutoUpdateRequest,
    db: Session = Depends(get_db),
    company_id: uuid.UUID = Depends(get_current_company_id)
):
    # JSON simples, igual ao cliente - sem Form pra não quebrar
    return produto_service.update_produto(db, produto_id, produto, company_id)

@router.delete("/{produto_id}")
def delete_produto(produto_id: uuid.UUID, db: Session = Depends(get_db), company_id: uuid.UUID = Depends(get_current_company_id)):
    return produto_service.delete_produto(db, produto_id, company_id)

@router.post("/{produto_id}/baixa-stock")
def dar_baixa_stock(produto_id: uuid.UUID, dados: BaixaStockRequest, db: Session = Depends(get_db), company_id: uuid.UUID = Depends(get_current_company_id)):
    try:
        produto_service.baixar_stock(db, produto_id, dados.quantidade, company_id)
        return {"detail": "Stock atualizado"}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
