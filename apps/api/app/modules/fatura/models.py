import uuid
from datetime import datetime
from sqlalchemy import String, Numeric, Boolean, ForeignKey, DateTime, Text, UniqueConstraint, Index
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base import Base

class Fatura(Base):
    __tablename__ = "faturas"
    __table_args__ = (
        UniqueConstraint('company_id', 'numero_fatura', name='uq_company_numero_fatura', deferrable=True),
        UniqueConstraint('company_id', 'numero_proforma', name='uq_company_numero_proforma', deferrable=True),
        Index('ix_faturas_company_tipo_ano', 'company_id', 'tipo_documento', 'created_at'),
        Index('ix_faturas_company_status', 'company_id', 'status'),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    company_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("companies.id", ondelete="CASCADE"), index=True, nullable=False)
    cliente_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("clientes.id", ondelete="RESTRICT"), index=True, nullable=False)

    # PP = Proforma / FT = Fatura / FR = Recibo (futuro)
    tipo_documento: Mapped[str] = mapped_column(String(20), default='proforma', nullable=False) # proforma | fatura
    status: Mapped[str] = mapped_column(String(20), default='rascunho', nullable=False) # rascunho | em_curso | emitida | concluida | cancelada | apagada

    numero_proforma: Mapped[str | None] = mapped_column(String(50), nullable=True, index=True) # PP 2025/00001
    numero_fatura: Mapped[str | None] = mapped_column(String(50), nullable=True, index=True) # FT 2025/00001
    proforma_origem_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("faturas.id", ondelete="SET NULL"), nullable=True)

    data_emissao: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)
    data_vencimento: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    validade_proforma: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    subtotal: Mapped[float] = mapped_column(Numeric(12,2), default=0, nullable=False)
    total_iva: Mapped[float] = mapped_column(Numeric(12,2), default=0, nullable=False)
    total_geral: Mapped[float] = mapped_column(Numeric(12,2), default=0, nullable=False)
    desconto_percent: Mapped[float] = mapped_column(Numeric(5,2), default=0, nullable=False)
    forma_pagamento: Mapped[str] = mapped_column(String(20), default='dinheiro', nullable=False)

    # AGT Angola
    hash_agt: Mapped[str | None] = mapped_column(String(500), nullable=True) # só para fatura real
    hash_agt_anterior: Mapped[str | None] = mapped_column(String(500), nullable=True) # cadeia de hash
    comunicado_agt: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    qr_code: Mapped[str | None] = mapped_column(Text, nullable=True)
    observacoes: Mapped[str | None] = mapped_column(Text, nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    itens: Mapped[list["FaturaItem"]] = relationship("FaturaItem", back_populates="fatura", cascade="all, delete-orphan", lazy="selectin")
    proforma_origem: Mapped["Fatura | None"] = relationship("Fatura", remote_side=[id], foreign_keys=[proforma_origem_id])

class FaturaItem(Base):
    __tablename__ = "fatura_itens"
    __table_args__ = (
        Index('ix_fatura_itens_fatura_id', 'fatura_id'),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    fatura_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("faturas.id", ondelete="CASCADE"), index=True, nullable=False)
    produto_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("produtos.id", ondelete="SET NULL"), nullable=True)

    nome_snapshot: Mapped[str] = mapped_column(String(255), nullable=False)
    quantidade: Mapped[float] = mapped_column(Numeric(10,2), nullable=False)
    preco_unit_snapshot: Mapped[float] = mapped_column(Numeric(12,2), nullable=False)
    iva_percent: Mapped[float] = mapped_column(Numeric(5,2), default=14, nullable=False)
    iva_valor: Mapped[float] = mapped_column(Numeric(12,2), default=0, nullable=False)
    subtotal_linha: Mapped[float] = mapped_column(Numeric(12,2), default=0, nullable=False)

    fatura: Mapped["Fatura"] = relationship("Fatura", back_populates="itens")
