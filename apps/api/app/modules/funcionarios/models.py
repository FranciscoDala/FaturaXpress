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
    falta = "falta"
    doenca = "doenca"
    licenca_maternidade = "licenca_maternidade"
    licenca_sem_vencimento = "licenca_sem_vencimento"

class StatusPedido(str, enum.Enum):
    pendente = "pendente"
    pendente_justificacao = "pendente_justificacao"
    aguardando_admin = "aguardando_admin"
    encaminhado_admin = "encaminhado_admin"
    aprovado = "aprovado"
    justificado = "justificado"
    rejeitado = "rejeitado"
    cancelado = "cancelado"

class TipoRecibo(str, enum.Enum):
    salario = "salario"
    bonus = "bonus"
    decimo_terceiro = "decimo_terceiro"

class StatusRecibo(str, enum.Enum):
    rascunho = "rascunho"
    publicado = "publicado"

class DonoAtual(str, enum.Enum):
    rh = "rh"
    admin = "admin"
    financeira = "financeira"
    recepcao = "recepcao"

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
    naturalidade: Mapped[str | None] = mapped_column(String(100), nullable=True)
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
    ultimo_reset_atrasos: Mapped[date | None] = mapped_column(Date, nullable=True, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)
    areas = relationship("Area", secondary=funcionario_areas, lazy="selectin")

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
    atraso_min: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    is_retroativo: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False, index=True)
    motivo_retroativo: Mapped[str | None] = mapped_column(Text, nullable=True)
    # CORRIGIDO: Sem FK - aceita ID da Company (dono principal) e de Funcionarios
    lancado_por_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), nullable=True, index=True)
    lancado_em: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

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
    regra_atraso_ativa: Mapped[bool] = mapped_column(Boolean, default=False)
    qtd_atrasos_para_falta: Mapped[int] = mapped_column(Integer, default=3)
    periodo_regra: Mapped[str] = mapped_column(String(10), default="semana")

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
    tipo: Mapped[str] = mapped_column(String(50), nullable=False)
    data_inicio: Mapped[date] = mapped_column(Date, nullable=False)
    data_fim: Mapped[date] = mapped_column(Date, nullable=False)
    dias_uteis: Mapped[int] = mapped_column(Integer, default=1)
    motivo: Mapped[str | None] = mapped_column(Text, nullable=True)
    documento_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(String(50), default=StatusPedido.pendente.value, index=True)
    # CORRIGIDO: Todos sem FK para aceitar Company ID (admin principal)
    aprovado_por_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), nullable=True, index=True)
    aprovado_em: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    observacao_gestor: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
    is_retroativo: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False, index=True)
    motivo_retroativo: Mapped[str | None] = mapped_column(Text, nullable=True)
    lancado_por_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), nullable=True, index=True)
    lancado_em: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    justificativa_tipo: Mapped[str | None] = mapped_column(String(50), nullable=True)
    justificativa_obs: Mapped[str | None] = mapped_column(Text, nullable=True)
    justificativa_anexo_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    justificado_em: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    justificado_por_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), nullable=True, index=True)
    abonada: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    dono_atual: Mapped[str] = mapped_column(String(20), default=DonoAtual.rh.value, nullable=False, index=True)
    area_origem: Mapped[str | None] = mapped_column(String(20), nullable=True)
    encaminhado_para_admin: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    encaminhado_em: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    encaminhado_por_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), nullable=True, index=True)

    funcionario = relationship("Funcionario", foreign_keys=[funcionario_id], lazy="joined")

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

class Notificacao(Base):
    __tablename__ = "notificacoes"
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    company_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("companies.id", ondelete="CASCADE"), index=True, nullable=False)
    tipo: Mapped[str] = mapped_column(String(30), nullable=False)
    referencia_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False, index=True)
    area_origem: Mapped[str] = mapped_column(String(20), nullable=False)
    area_destino: Mapped[str] = mapped_column(String(20), nullable=False, index=True)
    dono_atual: Mapped[str] = mapped_column(String(20), default="rh", nullable=False, index=True)
    status: Mapped[str] = mapped_column(String(20), default="pendente", nullable=False, index=True)
    lida: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)
