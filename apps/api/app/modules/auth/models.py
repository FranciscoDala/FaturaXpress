import uuid
from sqlalchemy import String, DateTime, ForeignKey, Boolean, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from datetime import datetime
from app.db.base import Base

class Company(Base):
    __tablename__ = "companies"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    companyName: Mapped[str] = mapped_column(String(255), nullable=False)
    nif: Mapped[str] = mapped_column(String(50), unique=True, index=True, nullable=False)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    phone: Mapped[str | None] = mapped_column(String(50), nullable=True)
    address: Mapped[str | None] = mapped_column(String(255), nullable=True)
    city: Mapped[str | None] = mapped_column(String(100), nullable=True)
    province: Mapped[str | None] = mapped_column(String(100), nullable=True)
    iban: Mapped[str | None] = mapped_column(String(100), nullable=True)
    iban2: Mapped[str | None] = mapped_column(String(100), nullable=True)
    banco1: Mapped[str | None] = mapped_column(String(100), nullable=True)
    banco2: Mapped[str | None] = mapped_column(String(100), nullable=True)
    logo_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    image_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)

    # CONTROLE DE PLANOS
    subscription_plan: Mapped[str] = mapped_column(String(20), default="free", nullable=False, index=True)
    subscription_status: Mapped[str] = mapped_column(String(20), default="active", nullable=False)

    # NOVO - VALIDACAO AGT
    nif_verified: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    nif_agt_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    nif_verified_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    createdAt: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    users: Mapped[list["User"]] = relationship("User", back_populates="company", lazy="selectin", cascade="all, delete-orphan")

class User(Base):
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    company_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("companies.id", ondelete="CASCADE"), nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[str] = mapped_column(String(50), default="admin")
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    createdAt: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    company: Mapped["Company"] = relationship("Company", back_populates="users", lazy="selectin")
