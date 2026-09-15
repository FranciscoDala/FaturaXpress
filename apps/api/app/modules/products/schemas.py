from pydantic import BaseModel, ConfigDict
from typing import Optional
import uuid
from enum import Enum

class TipoProdutoEnum(str, Enum):
    produto = "produto"
    servico = "servico"
    kit = "kit"

class ProdutoCreateRequest(BaseModel):
    codigo: str
    codigo_barras: Optional[str] = None
    codigo_qr: Optional[str] = None
    nome: str
    descricao: Optional[str] = None
    categoria: Optional[str] = None
    imagem_url: Optional[str] = None
    preco_custo: float = 0.0
    preco_venda: float
    iva: float = 14.0
    tem_iva: bool = True
    tipo: TipoProdutoEnum = TipoProdutoEnum.produto
    stock_atual: float = 0.0
    stock_minimo: float = 0.0
    controlar_stock: bool = True
    unidade: str = "UN"
    peso: Optional[float] = None
    ativo: bool = True

class ProdutoUpdateRequest(BaseModel):
    codigo: Optional[str] = None
    codigo_barras: Optional[str] = None
    codigo_qr: Optional[str] = None
    nome: Optional[str] = None
    descricao: Optional[str] = None
    categoria: Optional[str] = None
    imagem_url: Optional[str] = None
    preco_custo: Optional[float] = None
    preco_venda: Optional[float] = None
    iva: Optional[float] = None
    tem_iva: Optional[bool] = None
    tipo: Optional[TipoProdutoEnum] = None
    stock_atual: Optional[float] = None
    stock_minimo: Optional[float] = None
    controlar_stock: Optional[bool] = None
    unidade: Optional[str] = None
    peso: Optional[float] = None
    ativo: Optional[bool] = None

class BaixaStockRequest(BaseModel):
    quantidade: float

class ProdutoResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    company_id: uuid.UUID
    codigo: str
    codigo_barras: Optional[str] = None
    codigo_qr: Optional[str] = None
    nome: str
    descricao: Optional[str] = None
    categoria: Optional[str] = None
    imagem_url: Optional[str] = None
    preco_custo: float
    preco_venda: float
    iva: float
    tem_iva: bool
    tipo: TipoProdutoEnum
    stock_atual: float
    stock_minimo: float
    controlar_stock: bool
    unidade: str
    peso: Optional[float] = None
    ativo: bool
