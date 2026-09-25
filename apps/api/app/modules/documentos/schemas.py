from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime
from uuid import UUID

class ModeloDocumentoCreate(BaseModel):
    codigo: str = Field(..., max_length=100)
    nome: str = Field(..., max_length=200)
    tipo: str
    categoria: str
    descricao: Optional[str] = None
    conteudo_html: str
    conteudo_json: Optional[Dict[str, Any]] = None
    conteudo_texto: Optional[str] = None
    is_padrao: bool = False
    header_config: Optional[Dict[str, Any]] = None
    footer_config: Optional[Dict[str, Any]] = None
    tags: Optional[List[str]] = []

class ModeloDocumentoUpdate(BaseModel):
    nome: Optional[str] = None
    codigo: Optional[str] = None
    tipo: Optional[str] = None
    categoria: Optional[str] = None
    descricao: Optional[str] = None
    conteudo_html: Optional[str] = None
    conteudo_json: Optional[Dict[str, Any]] = None
    conteudo_texto: Optional[str] = None
    is_ativo: Optional[bool] = None
    is_padrao: Optional[bool] = None
    header_config: Optional[Dict[str, Any]] = None
    footer_config: Optional[Dict[str, Any]] = None
    tags: Optional[List[str]] = None

class GerarDocumentoRequest(BaseModel):
    modelo_id: UUID
    funcionario_id: UUID
    variaveis_extras: Optional[Dict[str, Any]] = {}
    cidade_emissao: Optional[str] = "Luanda"

class ModeloDocumentoResponse(BaseModel):
    id: UUID
    company_id: UUID
    codigo: str
    nome: str
    tipo: str
    categoria: str
    descricao: Optional[str] = None
    conteudo_html: Optional[str] = None
    conteudo_json: Optional[Dict[str, Any]] = None
    conteudo_texto: Optional[str] = None
    variaveis_usadas: Optional[List[str]] = []
    versao: int
    is_ativo: bool
    is_padrao: bool
    is_sistema: Optional[bool] = False
    created_at: datetime
    updated_at: datetime
    class Config:
        from_attributes = True

class DocumentoGeradoResponse(BaseModel):
    id: UUID
    company_id: Optional[UUID] = None
    funcionario_id: UUID
    modelo_id: Optional[UUID] = None
    tipo: str
    nome_arquivo: str
    codigo_verificacao: str
    status: str
    data_emissao: datetime
    url_pdf: Optional[str] = None
    class Config:
        from_attributes = True
