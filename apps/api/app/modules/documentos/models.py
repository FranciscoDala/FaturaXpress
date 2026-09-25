import uuid
import enum
from datetime import datetime, timezone
from sqlalchemy import String, Boolean, ForeignKey, DateTime, Text, Enum as SAEnum, Integer, JSON, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column
from typing import Optional, List, Dict, Any
from app.db.base import Base

class TipoModeloDocumento(str, enum.Enum):
    contrato_efetivo = "contrato_efetivo"
    contrato_estagio = "contrato_estagio"
    contrato_temporario = "contrato_temporario"
    contrato_experiencia = "contrato_experiencia"
    contrato_confidencialidade = "contrato_confidencialidade"
    aditivo_contratual = "aditivo_contratual"
    declaracao_trabalho = "declaracao_trabalho"
    declaracao_vencimento = "declaracao_vencimento"
    carta_recomendacao = "carta_recomendacao"
    carta_apresentacao = "carta_apresentacao"
    aviso_ferias = "aviso_ferias"
    comunicacao_ferias = "comunicacao_ferias"
    mapa_ferias = "mapa_ferias"
    justificacao_falta = "justificacao_falta"
    comunicacao_falta = "comunicacao_falta"
    horario_trabalho = "horario_trabalho"
    advertencia_verbal = "advertencia_verbal"
    advertencia_escrita = "advertencia_escrita"
    processo_disciplinar = "processo_disciplinar"
    suspensao = "suspensao"
    aumento_salarial = "aumento_salarial"
    alteracao_cargo = "alteracao_cargo"
    alteracao_salario = "alteracao_salario"
    comunicacao_bonus = "comunicacao_bonus"
    carta_demissao_funcionario = "carta_demissao_funcionario"
    carta_demissao_empresa = "carta_demissao_empresa"
    declaracao_desvinculacao = "declaracao_desvinculacao"
    certificado_trabalho = "certificado_trabalho"
    acordo_rescisao = "acordo_rescisao"
    outro = "outro"

class CategoriaModelo(str, enum.Enum):
    admissao = "admissao"
    gestao = "gestao"
    ferias_ponto = "ferias_ponto"
    disciplinar = "disciplinar"
    financeiro_carreira = "financeiro_carreira"
    saida = "saida"
    outros = "outros"

class StatusDocumentoGerado(str, enum.Enum):
    gerado = "gerado"
    assinado = "assinado"
    cancelado = "cancelado"
    expirado = "expirado"
    rascunho = "rascunho"

class ModeloDocumento(Base):
    __tablename__ = "modelos_documentos"
    __table_args__ = (
        UniqueConstraint('company_id', 'tipo', name='uq_company_tipo_unico_ativo'),
    )
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    company_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("companies.id", ondelete="CASCADE"), nullable=False, index=True)
    codigo: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    nome: Mapped[str] = mapped_column(String(200), nullable=False)
    tipo: Mapped[str] = mapped_column(SAEnum(TipoModeloDocumento), nullable=False, index=True)
    categoria: Mapped[str] = mapped_column(SAEnum(CategoriaModelo), nullable=False, index=True)
    descricao: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    conteudo_html: Mapped[str] = mapped_column(Text, nullable=False)
    conteudo_json: Mapped[Optional[Dict[str, Any]]] = mapped_column(JSON, nullable=True)
    conteudo_texto: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    variaveis_usadas: Mapped[Optional[List[str]]] = mapped_column(JSON, nullable=True, default=list)
    variaveis_obrigatorias: Mapped[Optional[List[str]]] = mapped_column(JSON, nullable=True, default=list)
    versao: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    is_ativo: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False, index=True)
    is_padrao: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False, index=True)
    is_sistema: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    header_config: Mapped[Optional[Dict[str, Any]]] = mapped_column(JSON, nullable=True)
    footer_config: Mapped[Optional[Dict[str, Any]]] = mapped_column(JSON, nullable=True)
    margens_config: Mapped[Optional[Dict[str, Any]]] = mapped_column(JSON, nullable=True)
    fonte_config: Mapped[Optional[Dict[str, Any]]] = mapped_column(JSON, nullable=True)
    tags: Mapped[Optional[List[str]]] = mapped_column(JSON, nullable=True, default=list)
    criado_por_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), nullable=True)
    atualizado_por_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)

class DocumentoGerado(Base):
    __tablename__ = "documentos_gerados"
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    company_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("companies.id", ondelete="CASCADE"), nullable=False, index=True)
    funcionario_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("funcionarios.id", ondelete="CASCADE"), nullable=False, index=True)
    modelo_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("modelos_documentos.id", ondelete="SET NULL"), nullable=True, index=True)
    modelo_versao: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    tipo: Mapped[str] = mapped_column(SAEnum(TipoModeloDocumento), nullable=False, index=True)
    nome_arquivo: Mapped[str] = mapped_column(String(300), nullable=False)
    codigo_verificacao: Mapped[str] = mapped_column(String(50), nullable=False, unique=True, index=True)
    conteudo_html_final: Mapped[str] = mapped_column(Text, nullable=False)
    dados_snapshot: Mapped[Dict[str, Any]] = mapped_column(JSON, nullable=False)
    variaveis_preenchidas: Mapped[Optional[Dict[str, Any]]] = mapped_column(JSON, nullable=True)
    url_pdf: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    url_docx: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    tamanho_bytes: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    status: Mapped[str] = mapped_column(SAEnum(StatusDocumentoGerado), default=StatusDocumentoGerado.gerado.value, nullable=False, index=True)
    data_emissao: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    data_validade: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    data_assinatura: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    assinado_por: Mapped[Optional[List[str]]] = mapped_column(JSON, nullable=True, default=list)
    gerado_por_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), nullable=True, index=True)
    motivo_cancelamento: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)
