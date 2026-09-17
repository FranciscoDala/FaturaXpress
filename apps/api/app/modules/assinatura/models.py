from sqlalchemy import String, Integer, Boolean, DateTime, JSON, ForeignKey, Index
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
import uuid
from app.db.base import Base
from datetime import datetime

class Plan(Base):
    __tablename__ = "plans"
    id: Mapped[str] = mapped_column(String(20), primary_key=True) # free, plus, premium, diamond
    name: Mapped[str] = mapped_column(String(50), nullable=False)
    sub: Mapped[str | None] = mapped_column(String(100), nullable=True)
    price: Mapped[int] = mapped_column(Integer, nullable=False) # em Kz, sempre inteiro
    price_label: Mapped[str] = mapped_column(String(20), nullable=False)
    popular: Mapped[bool] = mapped_column(Boolean, default=False)
    features: Mapped[list] = mapped_column(JSON, default=list)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

class Subscription(Base):
    __tablename__ = "subscriptions"
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    company_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("companies.id", ondelete="CASCADE"), nullable=False, index=True)
    plan_id: Mapped[str] = mapped_column(String(20), ForeignKey("plans.id"), nullable=False, index=True)

    # status controlado: pending -> awaiting_review -> paid | expired | rejected
    status: Mapped[str] = mapped_column(String(20), default="pending", index=True)
    amount: Mapped[int] = mapped_column(Integer, nullable=False) # congela o preço no momento da compra
    reference: Mapped[str] = mapped_column(String(100), unique=True, index=True)

    payment_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    provider: Mapped[str] = mapped_column(String(20), default="manual", index=True) # manual, paypay

    comprovativo_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    comprovativo_hash: Mapped[str | None] = mapped_column(String(128), nullable=True) # sha256 pra evitar duplicado
    payment_phone: Mapped[str | None] = mapped_column(String(20), nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), index=True)
    paid_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    expires_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    __table_args__ = (
        Index("ix_sub_company_status", "company_id", "status"),
    )
