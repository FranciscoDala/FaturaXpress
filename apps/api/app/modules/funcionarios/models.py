import uuid
from datetime import datetime, timezone, date
from sqlalchemy import String, Boolean, ForeignKey, DateTime, Table, Column, Date, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base import Base

funcionario_areas = Table(
    "funcionario_areas",
    Base.metadata,
    Column("funcionario_id", UUID(as_uuid=True), ForeignKey("funcionarios.id", ondelete="CASCADE"), primary_key=True),
    Column("area_id", UUID(as_uuid=True), ForeignKey("areas.id", ondelete="CASCADE"), primary_key=True),
)

class Funcionario(Base):
    __tablename__ = "funcionarios"
    __table_args__ = (
        {"sqlite_autoincrement": False},
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    company_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("companies.id", ondelete="CASCADE"), nullable=False, index=True)
    area_principal_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("areas.id", ondelete="SET NULL"), nullable=True, index=True)

    # --- OBRIGATORIOS BI ---
    nome: Mapped[str] = mapped_column(String(150), nullable=False)
    numero_bi: Mapped[str] = mapped_column(String(20), nullable=False, index=True)
    data_nascimento: Mapped[date] = mapped_column(Date, nullable=False)
    genero: Mapped[str] = mapped_column(String(10), nullable=False) # M / F
    nacionalidade: Mapped[str] = mapped_column(String(50), default="Angolana")
    naturalidade: Mapped[str] = mapped_column(String(100), nullable=True)
    nome_pai: Mapped[str] = mapped_column(String(150), nullable=False)
    nome_mae: Mapped[str] = mapped_column(String(150), nullable=False)
    data_emissao_bi: Mapped[date | None] = mapped_column(Date, nullable=True)
    data_validade_bi: Mapped[date | None] = mapped_column(Date, nullable=True)
    local_emissao_bi: Mapped[str | None] = mapped_column(String(100), nullable=True)

    # --- OPCIONAIS ---
    estado_civil: Mapped[str] = mapped_column(String(20), default="solteiro")
    telefone: Mapped[str | None] = mapped_column(String(20), nullable=True)
    email: Mapped[str | None] = mapped_column(String(150), nullable=True, index=True)
    endereco: Mapped[str | None] = mapped_column(Text, nullable=True)
    cidade: Mapped[str | None] = mapped_column(String(100), nullable=True)
    provincia: Mapped[str | None] = mapped_column(String(50), nullable=True)
    nif: Mapped[str | None] = mapped_column(String(20), nullable=True)

    banco1: Mapped[str | None] = mapped_column(String(100), nullable=True)
    banco2: Mapped[str | None] = mapped_column(String(100), nullable=True)
    iban: Mapped[str | None] = mapped_column(String(50), nullable=True)
    iban2: Mapped[str | None] = mapped_column(String(50), nullable=True)

    contacto_emergencia: Mapped[str | None] = mapped_column(String(20), nullable=True)

    # --- ACESSO ---
    tem_acesso: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    senha_hash: Mapped[str | None] = mapped_column(String(255), nullable=True)
    cargo: Mapped[str] = mapped_column(String(20), default="rh", nullable=False) # admin, financeira, recepcao, rh
    ativo: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)

    # relationships
    areas = relationship("Area", secondary=funcionario_areas, lazy="selectin")
