import uuid
import enum
from datetime import datetime, timezone, date
from sqlalchemy import String, Boolean, ForeignKey, DateTime, Table, Column, Date, Text, Enum as SAEnum, Float, Integer, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base import Base

funcionario_areas = Table(
    "funcionario_areas",
    Base.metadata,
    Column("funcionario_id", UUID(as_uuid=True), ForeignKey("funcionarios.id", ondelete="CASCADE"), primary_key=True),
    Column("area_id", UUID(as_uuid=True), ForeignKey("areas.id", ondelete="CASCADE"), primary_key=True),
)

class TipoPonto(str, enum.Enum):
    entrada = "entrada"
    pausa_inicio = "pausa_inicio"
    pausa_fim = "pausa_fim"
    saida = "saida"

class TipoPedido(str, enum.Enum):
    ferias = "ferias"
    falta_justificada = "falta_justificada"
    doenca = "doenca"
    licenca_maternidade = "licenca_maternidade"
    licenca_sem_vencimento = "licenca_sem_vencimento"

class StatusPedido(str, enum.Enum):
    pendente = "pendente"
    aprovado = "aprovado"
    rejeitado = "rejeitado"
    cancelado = "cancelado"

class TipoRecibo(str, enum.Enum):
    salario = "salario"
    bonus = "bonus"
    decimo_terceiro = "decimo_terceiro"

class StatusRecibo(str, enum.Enum):
    rascunho = "rascunho"
    publicado = "publicado"

class Funcionario(Base):
    __tablename__ = "funcionarios"
    __table_args__ = (
        UniqueConstraint('company_id', 'numero_bi', name='uq_funcionarios_company_bi'),
        {"sqlite_autoincrement": False},
    )
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    company_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("companies.id", ondelete="CASCADE"), nullable=False, index=True)
    area_principal_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("areas.id", ondelete="SET NULL"), nullable=True, index=True)
    nome: Mapped[str] = mapped_column(String(150), nullable=False)
    numero_bi: Mapped[str] = mapped_column(String(20), nullable=False, index=True)
    data_nascimento: Mapped[date] = mapped_column(Date, nullable=False)
    genero: Mapped[str] = mapped_column(String(10), nullable=False)
    nacionalidade: Mapped[str] = mapped_column(String(50), default="Angolana")
    naturalidade: Mapped[str] = mapped_column(String(100), nullable=True)
    nome_pai: Mapped[str] = mapped_column(String(150), nullable=False)
    nome_mae: Mapped[str] = mapped_column(String(150), nullable=False)
    data_emissao_bi: Mapped[date | None] = mapped_column(Date, nullable=True)
    data_validade_bi: Mapped[date | None] = mapped_column(Date, nullable=True)
    local_emissao_bi: Mapped[str | None] = mapped_column(String(100), nullable=True)
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
    data_admissao: Mapped[date | None] = mapped_column(Date, nullable=True, default=lambda: date.today())
    tem_acesso: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    senha_hash: Mapped[str | None] = mapped_column(String(255), nullable=True)
    cargo: Mapped[str] = mapped_column(String(20), default="rh", nullable=False)
    ativo: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)
    areas = relationship("Area", secondary=funcionario_areas, lazy="selectin")

# --- FASE 1 - RH ---
class Ponto(Base):
    __tablename__ = "pontos"
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    company_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("companies.id", ondelete="CASCADE"), index=True, nullable=False)
    funcionario_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("funcionarios.id", ondelete="CASCADE"), index=True, nullable=False)
    data: Mapped[date] = mapped_column(Date, index=True, nullable=False)
    tipo: Mapped[str] = mapped_column(SAEnum(TipoPonto), nullable=False)
    timestamp: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    latitude: Mapped[float | None] = mapped_column(Float, nullable=True)
    longitude: Mapped[float | None] = mapped_column(Float, nullable=True)
    distancia_m: Mapped[int | None] = mapped_column(Integer, nullable=True)
    dentro_raio: Mapped[bool] = mapped_column(Boolean, default=True)
    foto_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    dispositivo: Mapped[str | None] = mapped_column(String(100), nullable=True)
    ip: Mapped[str | None] = mapped_column(String(50), nullable=True)
    justificado: Mapped[bool] = mapped_column(Boolean, default=False)
    observacao_justificativa: Mapped[str | None] = mapped_column(Text, nullable=True)
    atraso_min: Mapped[int] = mapped_column(Integer, default=0) # NOVO
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

class ConfigPonto(Base):
    __tablename__ = "config_ponto"
    company_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("companies.id", ondelete="CASCADE"), primary_key=True)
    lat_sede: Mapped[float | None] = mapped_column(Float, nullable=True)
    lng_sede: Mapped[float | None] = mapped_column(Float, nullable=True)
    raio_permitido_m: Mapped[int] = mapped_column(Integer, default=200)
    hora_entrada: Mapped[str] = mapped_column(String(5), default="08:00")
    tolerancia_min: Mapped[int] = mapped_column(Integer, default=15)
    exige_foto: Mapped[bool] = mapped_column(Boolean, default=False)
    exige_localizacao: Mapped[bool] = mapped_column(Boolean, default=True)
    # --- REGRA OPCIONAL ATRASOS -> FALTA ---
    regra_atraso_ativa: Mapped[bool] = mapped_column(Boolean, default=False) # desligada por padrão
    qtd_atrasos_para_falta: Mapped[int] = mapped_column(Integer, default=3) # 2,3,4,5,6...
    periodo_regra: Mapped[str] = mapped_column(String(10), default="semana") # semana ou mes

class SaldoFerias(Base):
    __tablename__ = "saldo_ferias"
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    company_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("companies.id", ondelete="CASCADE"), index=True)
    funcionario_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("funcionarios.id", ondelete="CASCADE"), index=True)
    ano_referencia: Mapped[int] = mapped_column(Integer, default=lambda: datetime.now().year)
    dias_direito: Mapped[int] = mapped_column(Integer, default=22)
    dias_gozados: Mapped[int] = mapped_column(Integer, default=0)
    data_admissao: Mapped[date | None] = mapped_column(Date, nullable=True)

class PedidoRH(Base):
    __tablename__ = "pedidos_rh"
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    company_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("companies.id", ondelete="CASCADE"), index=True)
    funcionario_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("funcionarios.id", ondelete="CASCADE"), index=True)
    tipo: Mapped[str] = mapped_column(SAEnum(TipoPedido), nullable=False)
    data_inicio: Mapped[date] = mapped_column(Date, nullable=False)
    data_fim: Mapped[date] = mapped_column(Date, nullable=False)
    dias_uteis: Mapped[int] = mapped_column(Integer, default=1)
    motivo: Mapped[str | None] = mapped_column(Text, nullable=True)
    documento_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(SAEnum(StatusPedido), default=StatusPedido.pendente.value, index=True)
    aprovado_por_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("funcionarios.id"), nullable=True)
    aprovado_em: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    observacao_gestor: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

class Recibo(Base):
    __tablename__ = "recibos"
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    company_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("companies.id", ondelete="CASCADE"), index=True)
    funcionario_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("funcionarios.id", ondelete="CASCADE"), index=True)
    ano: Mapped[int] = mapped_column(Integer, nullable=False)
    mes: Mapped[int] = mapped_column(Integer, nullable=False)
    tipo: Mapped[str] = mapped_column(SAEnum(TipoRecibo), default=TipoRecibo.salario.value)
    valor_bruto: Mapped[float | None] = mapped_column(Float, nullable=True)
    valor_descontos: Mapped[float | None] = mapped_column(Float, nullable=True)
    valor_liquido: Mapped[float | None] = mapped_column(Float, nullable=True)
    arquivo_pdf_url: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[str] = mapped_column(SAEnum(StatusRecibo), default=StatusRecibo.rascunho.value)
    publicado_em: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
