import uuid
from datetime import datetime
from sqlalchemy import String, Numeric, Boolean, ForeignKey, DateTime, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base import Base

class Fatura(Base):
    __tablename__ = "faturas"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    company_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("companies.id"), index=True)
    cliente_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("clientes.id"), index=True)

    tipo_documento: Mapped[str] = mapped_column(String(20), default='proforma')
    status: Mapped[str] = mapped_column(String(20), default='rascunho')

    numero_proforma: Mapped[str | None] = mapped_column(String(50), nullable=True)
    numero_fatura: Mapped[str | None] = mapped_column(String(50), nullable=True)
    proforma_origem_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("faturas.id"), nullable=True)

    data_emissao: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)
    data_vencimento: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    validade_proforma: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    subtotal: Mapped[float] = mapped_column(Numeric(12,2), default=0)
    total_iva: Mapped[float] = mapped_column(Numeric(12,2), default=0)
    total_geral: Mapped[float] = mapped_column(Numeric(12,2), default=0)
    desconto_percent: Mapped[float] = mapped_column(Numeric(5,2), default=0)
    forma_pagamento: Mapped[str] = mapped_column(String(20), default='dinheiro')

    hash_agt: Mapped[str | None] = mapped_column(String(500), nullable=True)
    comunicado_agt: Mapped[bool] = mapped_column(Boolean, default=False)
    qr_code: Mapped[str | None] = mapped_column(Text, nullable=True)
    observacoes: Mapped[str | None] = mapped_column(Text, nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)

    itens: Mapped[list["FaturaItem"]] = relationship("FaturaItem", back_populates="fatura", cascade="all, delete-orphan")

class FaturaItem(Base):
    __tablename__ = "fatura_itens"
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    fatura_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("faturas.id", ondelete="CASCADE"), index=True)
    produto_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("produtos.id"), nullable=True)

    nome_snapshot: Mapped[str] = mapped_column(String(255))
    quantidade: Mapped[float] = mapped_column(Numeric(10,2))
    preco_unit_snapshot: Mapped[float] = mapped_column(Numeric(12,2))
    iva_percent: Mapped[float] = mapped_column(Numeric(5,2), default=14)
    iva_valor: Mapped[float] = mapped_column(Numeric(12,2), default=0)
    subtotal_linha: Mapped[float] = mapped_column(Numeric(12,2), default=0)

    fatura: Mapped["Fatura"] = relationship("Fatura", back_populates="itens")
