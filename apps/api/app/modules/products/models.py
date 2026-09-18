from sqlalchemy import Column, String, Float, Boolean, Text, ForeignKey, Enum as SAEnum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column
import uuid
import enum
from app.db.base import Base

class TipoProdutoEnum(str, enum.Enum):
    produto = "produto"
    servico = "servico"
    kit = "kit"

class Produto(Base):
    __tablename__ = "produtos"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    company_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("companies.id"), nullable=False, index=True)

    codigo: Mapped[str] = mapped_column(String, nullable=False, index=True)
    codigo_barras: Mapped[str | None] = mapped_column(String, nullable=True, index=True)
    codigo_qr: Mapped[str | None] = mapped_column(String, nullable=True, index=True)
    nome: Mapped[str] = mapped_column(String, nullable=False, index=True)
    descricao: Mapped[str | None] = mapped_column(Text, nullable=True)
    categoria: Mapped[str | None] = mapped_column(String, nullable=True, index=True)
    imagem_url: Mapped[str | None] = mapped_column(String, nullable=True)

    preco_custo: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    preco_venda: Mapped[float] = mapped_column(Float, nullable=False)
    iva: Mapped[float] = mapped_column(Float, default=14.0, nullable=False)
    tem_iva: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    tipo: Mapped[TipoProdutoEnum] = mapped_column(SAEnum(TipoProdutoEnum), default=TipoProdutoEnum.produto, nullable=False)
    stock_atual: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    stock_minimo: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    controlar_stock: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    unidade: Mapped[str] = mapped_column(String, default="UN", nullable=False)
    peso: Mapped[float | None] = mapped_column(Float, nullable=True)

    ativo: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
