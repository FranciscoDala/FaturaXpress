import uuid
from datetime import datetime, timezone
from sqlalchemy import String, ForeignKey, DateTime, JSON, Index
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column
from app.db.base import Base

class AtividadeLog(Base):
    __tablename__ = "atividades_log"
    __table_args__ = (
        Index('ix_atividades_company_created', 'company_id', 'created_at'),
        Index('ix_atividades_acao', 'acao'),
        Index('ix_atividades_entidade_id', 'entidade_id'),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    company_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("companies.id", ondelete="CASCADE"), nullable=False, index=True)

    usuario_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("funcionarios.id", ondelete="SET NULL"), nullable=True, index=True)
    usuario_nome: Mapped[str | None] = mapped_column(String(100), nullable=True)
    usuario_cargo: Mapped[str | None] = mapped_column(String(20), nullable=True)
    area_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("areas.id", ondelete="SET NULL"), nullable=True, index=True)

    acao: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    entidade: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    entidade_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), nullable=True, index=True)
    detalhe: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    ip: Mapped[str | None] = mapped_column(String(45), nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False, index=True)
