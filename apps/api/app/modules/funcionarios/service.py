import uuid
from sqlalchemy.orm import Session
from fastapi import HTTPException
from passlib.context import CryptContext
from typing import List
from app.modules.funcionarios.models import Funcionario
from app.modules.funcionarios.schemas import FuncionarioCreate, FuncionarioUpdate
from app.modules.areas.models import Area

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
CARGOS_VALIDOS = ["admin", "financeira", "recepcao", "rh"]

def criar_funcionario(db: Session, company_id: uuid.UUID, dados: FuncionarioCreate):
    bi = (dados.numero_bi or dados.bi or "").strip().upper()
    if not bi:
        raise HTTPException(400, "Nº BI obrigatório")

    if db.query(Funcionario).filter(Funcionario.company_id == company_id, Funcionario.numero_bi == bi).first():
        raise HTTPException(400, f"BI {bi} já cadastrado nesta empresa")

    if dados.cargo not in CARGOS_VALIDOS:
        raise HTTPException(400, f"Cargo inválido. Use: {', '.join(CARGOS_VALIDOS)}")

    if dados.tem_acesso and not dados.senha:
        raise HTTPException(400, "Senha obrigatória para quem tem acesso")

    email_norm = dados.email.lower().strip() if dados.email else None

    if dados.tem_acesso and email_norm:
        if db.query(Funcionario).filter(Funcionario.company_id == company_id, Funcionario.email == email_norm).first():
            raise HTTPException(400, "Email já existe nessa empresa")

    senha_hash = pwd_context.hash(dados.senha) if dados.tem_acesso and dados.senha else None

    iban = dados.iban if dados.banco1 else None
    iban2 = dados.iban2 if dados.banco2 else None

    func = Funcionario(
        id=uuid.uuid4(),
        company_id=company_id,
        nome=dados.nome.strip(),
        numero_bi=bi,
        data_nascimento=dados.data_nascimento,
        genero=dados.genero,
        nacionalidade=dados.nacionalidade,
        naturalidade=dados.naturalidade,
        nome_pai=dados.nome_pai.strip(),
        nome_mae=dados.nome_mae.strip(),
        data_emissao_bi=dados.data_emissao_bi,
        data_validade_bi=dados.data_validade_bi,
        local_emissao_bi=dados.local_emissao_bi,
        estado_civil=dados.estado_civil,
        telefone=dados.telefone,
        email=email_norm,
        endereco=dados.endereco,
        cidade=dados.cidade,
        provincia=dados.provincia,
        nif=dados.nif,
        banco1=dados.banco1,
        banco2=dados.banco2,
        iban=iban,
        iban2=iban2,
        contacto_emergencia=dados.contacto_emergencia,
        data_admissao=dados.data_admissao,
        tem_acesso=dados.tem_acesso,
        senha_hash=senha_hash,
        cargo=dados.cargo,
        area_principal_id=dados.area_principal_id,
        ativo=True
    )

    if dados.areas_ids:
        areas = db.query(Area).filter(Area.id.in_(dados.areas_ids), Area.company_id == company_id).all()
        func.areas = areas

    db.add(func)
    db.commit()
    db.refresh(func)
    return func

def listar_funcionarios(db: Session, company_id: uuid.UUID) -> List[Funcionario]:
    return db.query(Funcionario).filter(
        Funcionario.company_id == company_id,
        Funcionario.ativo == True
    ).order_by(Funcionario.nome).all()

def obter_funcionario(db: Session, company_id: uuid.UUID, funcionario_id: uuid.UUID):
    return db.query(Funcionario).filter(
        Funcionario.id == funcionario_id,
        Funcionario.company_id == company_id
    ).first()

def atualizar_funcionario(db: Session, funcionario: Funcionario, dados: FuncionarioUpdate, company_id: uuid.UUID):
    data = dados.model_dump(exclude_unset=True, exclude={'areas_ids', 'senha'})

    if 'nome' in data and data['nome']:
        data['nome'] = data['nome'].strip()

    if 'cargo' in data and data['cargo'] and data['cargo'] not in CARGOS_VALIDOS:
        raise HTTPException(400, f"Cargo inválido. Use: {', '.join(CARGOS_VALIDOS)}")

    if 'email' in data:
        if data['email'] is None or data['email'] == "":
            data['email'] = None
        else:
            data['email'] = str(data['email']).lower().strip()

    if 'numero_bi' in data and data['numero_bi']:
        novo_bi = data['numero_bi'].strip().upper()
        if novo_bi!= funcionario.numero_bi:
            if db.query(Funcionario).filter(Funcionario.company_id == company_id, Funcionario.numero_bi == novo_bi, Funcionario.id!= funcionario.id).first():
                raise HTTPException(400, "BI já existe")
            data['numero_bi'] = novo_bi

    if 'banco1' in data and not data['banco1']:
        data['iban'] = None
        data['banco1'] = None
    if 'banco2' in data and not data['banco2']:
        data['iban2'] = None
        data['banco2'] = None

    if dados.senha:
        funcionario.senha_hash = pwd_context.hash(dados.senha)

    for k, v in data.items():
        setattr(funcionario, k, v)

    if dados.areas_ids is not None:
        if dados.areas_ids:
            areas = db.query(Area).filter(Area.id.in_(dados.areas_ids), Area.company_id == company_id).all()
            funcionario.areas = areas
        else:
            funcionario.areas = []

    db.commit()
    db.refresh(funcionario)
    return funcionario

def desativar_funcionario(db: Session, funcionario: Funcionario):
    funcionario.ativo = False
    db.commit()
    return funcionario

# --- PONTO - ADIÇÃO NECESSÁRIA PARA RH BATER POR OUTRO ---
from datetime import date, datetime, timezone
from app.modules.funcionarios.models import Ponto, ConfigPonto

def get_config_ponto(db: Session, company_id: uuid.UUID):
    cfg = db.query(ConfigPonto).filter(ConfigPonto.company_id==company_id).first()
    if not cfg:
        cfg = ConfigPonto(company_id=company_id)
        db.add(cfg); db.commit(); db.refresh(cfg)
    return cfg

def listar_ponto_hoje(db: Session, company_id: uuid.UUID):
    hoje = date.today()
    return db.query(Ponto).filter(Ponto.company_id==company_id, Ponto.data==hoje).order_by(Ponto.timestamp.desc()).all()

def bater_ponto_rh(db: Session, company_id: uuid.UUID, funcionario_alvo_id: uuid.UUID, tipo: str, ip: str | None = None):
    # RH bate - sem validar raio, sem foto, justificado True
    ponto = Ponto(
        id=uuid.uuid4(),
        company_id=company_id,
        funcionario_id=funcionario_alvo_id,
        data=date.today(),
        tipo=tipo,
        timestamp=datetime.now(timezone.utc),
        dentro_raio=True,
        distancia_m=0,
        dispositivo="rh:web",
        ip=ip,
        justificado=True
    )
    db.add(ponto); db.commit(); db.refresh(ponto)
    return ponto
