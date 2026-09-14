from fastapi import APIRouter, Depends, Query, HTTPException, Path, Form, File, UploadFile
from sqlalchemy.orm import Session
import uuid
from typing import List, Optional
from app.db.session import get_db
from app.modules.products.schemas import ProdutoCreateRequest, ProdutoResponse, ProdutoUpdateRequest, BaixaStockRequest, TipoProdutoEnum
from app.modules.products import service as produto_service
from app.core.security import get_current_company_id
from app.core.upload_Imagem import upload_image

router = APIRouter(prefix="/api/produtos", tags=["Produtos"])

@router.get("/", response_model=dict)
def listar_produtos(
    search: str = Query("", description="Busca por nome, codigo ou categoria"),
    categoria: Optional[str] = Query(None),
    tipo: Optional[str] = Query(None, description="produto, servico, kit"),
    ativo: bool = Query(True),
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
    company_id: uuid.UUID = Depends(get_current_company_id)
):
    skip = (page - 1) * limit
    items = produto_service.get_produtos(db, company_id, search, categoria or "", tipo or "", ativo, skip, limit)
    total = produto_service.count_produtos(db, company_id, search, categoria or "", tipo or "", ativo)
    return {"items": items, "total": total, "page": page, "limit": limit}

@router.get("/{produto_id}", response_model=ProdutoResponse)
def buscar_por_id(produto_id: uuid.UUID = Path(...), db: Session = Depends(get_db), company_id: uuid.UUID = Depends(get_current_company_id)):
    db_produto = produto_service.get_produto_by_id(db, produto_id, company_id)
    if not db_produto: raise HTTPException(status_code=404, detail="Produto não encontrado")
    return db_produto

@router.get("/codigo/{codigo}", response_model=ProdutoResponse)
def buscar_por_codigo(codigo: str = Path(...), db: Session = Depends(get_db), company_id: uuid.UUID = Depends(get_current_company_id)):
    db_produto = produto_service.get_produto_by_codigo(db, codigo, company_id)
    if not db_produto: raise HTTPException(status_code=404, detail="Produto não encontrado")
    return db_produto

@router.post("/", response_model=ProdutoResponse, status_code=201)
async def criar_produto(
    nome: str = Form(...),
    codigo: str = Form(...),
    preco_venda: float = Form(...),
    tipo: TipoProdutoEnum = Form(TipoProdutoEnum.produto),
    unidade: str = Form("UN"),
    ativo: bool = Form(True),
    controlar_stock: bool = Form(True),
    stock_atual: float = Form(0.0),
    stock_minimo: float = Form(0.0),
    preco_custo: float = Form(0.0),
    # Opcionais
    codigo_barras: Optional[str] = Form(None),
    codigo_qr: Optional[str] = Form(None),
    descricao: Optional[str] = Form(None),
    categoria: Optional[str] = Form(None),
    peso: Optional[float] = Form(None),
    iva: float = Form(14.0),
    tem_iva: bool = Form(True),
    imagem: Optional[UploadFile] = File(None), # <- ARQUIVO
    db: Session = Depends(get_db),
    company_id: uuid.UUID = Depends(get_current_company_id)
):
    imagem_url = None
    if imagem:
        imagem_url = await upload_image(imagem, folder=f"produtos/{company_id}") # <- Faz upload

    produto_data = ProdutoCreateRequest(
        nome=nome, codigo=codigo, preco_venda=preco_venda, tipo=tipo, unidade=unidade,
        ativo=ativo, controlar_stock=controlar_stock, stock_atual=stock_atual,
        stock_minimo=stock_minimo, preco_custo=preco_custo, codigo_barras=codigo_barras,
        codigo_qr=codigo_qr, descricao=descricao, categoria=categoria, peso=peso,
        iva=iva, tem_iva=tem_iva, imagem_url=imagem_url
    )
    return produto_service.create_produto(db, produto_data, company_id)

@router.put("/{produto_id}", response_model=ProdutoResponse)
async def atualizar_produto(
    produto_id: uuid.UUID,
    nome: Optional[str] = Form(None),
    codigo: Optional[str] = Form(None),
    preco_venda: Optional[float] = Form(None),
    imagem: Optional[UploadFile] = File(None), # <- ARQUIVO
    #... repete os outros campos como Optional[Form(None)]
    db: Session = Depends(get_db),
    company_id: uuid.UUID = Depends(get_current_company_id)
):
    update_data = {}
    # Pega só os campos enviados
    for k, v in locals().items():
        if k not in ['produto_id', 'imagem', 'db', 'company_id'] and v is not None:
            update_data[k] = v

    if imagem:
        update_data['imagem_url'] = await upload_image(imagem, folder=f"produtos/{company_id}")

    produto_update = ProdutoUpdateRequest(**update_data)
    db_produto = produto_service.update_produto(db, produto_id, produto_update, company_id)
    if not db_produto: raise HTTPException(status_code=404, detail="Produto não encontrado")
    return db_produto

@router.patch("/{produto_id}/ativar", response_model=ProdutoResponse)
def ativar_produto(produto_id: uuid.UUID, db: Session = Depends(get_db), company_id: uuid.UUID = Depends(get_current_company_id)):
    return produto_service.set_status_produto(db, produto_id, company_id, True)

@router.patch("/{produto_id}/desativar", response_model=ProdutoResponse)
def desativar_produto(produto_id: uuid.UUID, db: Session = Depends(get_db), company_id: uuid.UUID = Depends(get_current_company_id)):
    return produto_service.set_status_produto(db, produto_id, company_id, False)

@router.post("/{produto_id}/baixa-stock")
def dar_baixa_stock(produto_id: uuid.UUID, dados: BaixaStockRequest, db: Session = Depends(get_db), company_id: uuid.UUID = Depends(get_current_company_id)):
    try:
        produto_service.baixar_stock(db, produto_id, dados.quantidade, company_id)
        return {"detail": "Stock atualizado com sucesso"}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/categorias/lista", response_model=List[str])
def listar_categorias(db: Session = Depends(get_db), company_id: uuid.UUID = Depends(get_current_company_id)):
    return produto_service.get_categorias(db, company_id)

@router.get("/alerta/stock-baixo", response_model=List[ProdutoResponse])
def produtos_stock_baixo(db: Session = Depends(get_db), company_id: uuid.UUID = Depends(get_current_company_id)):
    return produto_service.get_produtos_stock_baixo(db, company_id)
