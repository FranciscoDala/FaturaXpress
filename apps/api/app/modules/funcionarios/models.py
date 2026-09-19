import uuid
from datetime import datetime, timezone
from sqlalchemy import String, Boolean, ForeignKey, DateTime, Table, Column
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

    nome: Mapped[str] = mapped_column(String(100), nullable=False)
    email: Mapped[str] = mapped_column(String(150), nullable=False, index=True)
    senha_hash: Mapped[str] = mapped_column(String(255), nullable=False)

    cargo: Mapped[str] = mapped_column(String(20), default="recepcao", nullable=False)
    ativo: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)

    # relationships
    areas = relationship("Area", secondary=funcionario_areas, lazy="selectin")
