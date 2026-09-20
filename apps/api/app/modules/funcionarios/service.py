import uuid
from sqlalchemy.orm import Session
from fastapi import HTTPException
from passlib.context import CryptContext
from typing import List, Optional
from datetime import date, datetime, timezone, timedelta
from app.modules.funcionarios.models import Funcionario, Ponto, ConfigPonto, PedidoRH
from app.modules.funcionarios.schemas import FuncionarioCreate, FuncionarioUpdate
from app.modules.areas.models import Area
from zoneinfo import ZoneInfo

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
CARGOS_VALIDOS = ["admin", "financeira", "recepcao", "rh"]
LIMITE_DIAS_RH = 6
LIMITE_DIAS_ADMIN = 30

def validar_janela_edicao(data_alvo: date, is_admin: bool = False):
    hoje = date.today()
    if data_alvo > hoje:
        raise HTTPException(400, "Não pode lançar ponto no futuro")
    diff = (hoje - data_alvo).days
    limite = LIMITE_DIAS_ADMIN if is_admin else LIMITE_DIAS_RH
    if diff > limite:
        raise HTTPException(403, f"Edição bloqueada: só até {limite+1} dias. Tentou {diff} dias atrás.")

def _get_nome_lancador(db: Session, lancado_por_id):
    if not lancado_por_id:
        return None
    f = db.query(Funcionario).filter(Funcionario.id == lancado_por_id).first()
    return f.nome if f else None

def _ponto_to_dict(db: Session, p: Ponto) -> dict:
    tipo_str = str(p.tipo) if p.tipo else ""
    if "." in tipo_str:
        tipo_str = tipo_str.split(".")[-1]
    return {
        "id": str(p.id),
        "company_id": str(p.company_id),
        "funcionario_id": str(p.funcionario_id),
        "data": p.data.isoformat() if p.data else None,
        "tipo": tipo_str,
        "timestamp": p.timestamp.isoformat() if p.timestamp else None,
        "dentro_raio": p.dentro_raio,
        "dispositivo": p.dispositivo,
        "atraso_min": p.atraso_min,
        "is_retroativo": bool(p.is_retroativo),
        "motivo_retroativo": p.motivo_retroativo,
        "lancado_por_id": str(p.lancado_por_id) if p.lancado_por_id else None,
        "lancado_por_nome": _get_nome_lancador(db, p.lancado_por_id),
        "lancado_em": p.lancado_em.isoformat() if p.lancado_em else None,
        "distancia_m": p.distancia_m,
        "ip": p.ip,
    }

def _falta_to_dict(db: Session, f: PedidoRH) -> dict:
    status_str = str(f.status)
    if "." in status_str:
        status_str = status_str.split(".")[-1]
    tipo_str = str(f.tipo)
    if "." in tipo_str:
        tipo_str = tipo_str.split(".")[-1]
    return {
        "id": str(f.id),
        "company_id": str(f.company_id),
        "funcionario_id": str(f.funcionario_id),
        "tipo": tipo_str,
        "data": f.data_inicio.isoformat() if f.data_inicio else None,
        "data_inicio": f.data_inicio.isoformat() if f.data_inicio else None,
        "data_fim": f.data_fim.isoformat() if f.data_fim else None,
        "motivo": f.motivo,
        "status": status_str,
        "is_retroativo": bool(f.is_retroativo),
        "motivo_retroativo": f.motivo_retroativo,
        "lancado_por_id": str(f.lancado_por_id) if f.lancado_por_id else None,
        "lancado_por_nome": _get_nome_lancador(db, f.lancado_por_id),
        "lancado_em": f.lancado_em.isoformat() if f.lancado_em else None,
    }

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
        id=uuid.uuid4(), company_id=company_id, nome=dados.nome.strip(), numero_bi=bi,
        data_nascimento=dados.data_nascimento, genero=dados.genero, nacionalidade=dados.nacionalidade,
        naturalidade=dados.naturalidade, nome_pai=dados.nome_pai.strip(), nome_mae=dados.nome_mae.strip(),
        data_emissao_bi=dados.data_emissao_bi, data_validade_bi=dados.data_validade_bi, local_emissao_bi=dados.local_emissao_bi,
        estado_civil=dados.estado_civil, telefone=dados.telefone, email=email_norm, endereco=dados.endereco,
        cidade=dados.cidade, provincia=dados.provincia, nif=dados.nif, banco1=dados.banco1, banco2=dados.banco2,
        iban=iban, iban2=iban2, contacto_emergencia=dados.contacto_emergencia, data_admissao=dados.data_admissao,
        tem_acesso=dados.tem_acesso, senha_hash=senha_hash, cargo=dados.cargo, area_principal_id=dados.area_principal_id, ativo=True
    )
    if dados.areas_ids:
        areas = db.query(Area).filter(Area.id.in_(dados.areas_ids), Area.company_id == company_id).all()
        func.areas = areas
    db.add(func); db.commit(); db.refresh(func)
    return func

def listar_funcionarios(db: Session, company_id: uuid.UUID) -> List[Funcionario]:
    return db.query(Funcionario).filter(Funcionario.company_id == company_id, Funcionario.ativo == True).order_by(Funcionario.nome).all()

def obter_funcionario(db: Session, company_id: uuid.UUID, funcionario_id: uuid.UUID):
    return db.query(Funcionario).filter(Funcionario.id == funcionario_id, Funcionario.company_id == company_id).first()

def atualizar_funcionario(db: Session, funcionario: Funcionario, dados: FuncionarioUpdate, company_id: uuid.UUID):
    data = dados.model_dump(exclude_unset=True, exclude={'areas_ids', 'senha'})
    if 'nome' in data and data['nome']: data['nome'] = data['nome'].strip()
    if 'cargo' in data and data['cargo'] and data['cargo'] not in CARGOS_VALIDOS:
        raise HTTPException(400, f"Cargo inválido. Use: {', '.join(CARGOS_VALIDOS)}")
    if 'email' in data:
        if data['email'] is None or data['email'] == "": data['email'] = None
        else: data['email'] = str(data['email']).lower().strip()
    if 'numero_bi' in data and data['numero_bi']:
        novo_bi = data['numero_bi'].strip().upper()
        if novo_bi!= funcionario.numero_bi:
            if db.query(Funcionario).filter(Funcionario.company_id == company_id, Funcionario.numero_bi == novo_bi, Funcionario.id!= funcionario.id).first():
                raise HTTPException(400, "BI já existe")
            data['numero_bi'] = novo_bi
    if 'banco1' in data and not data['banco1']: data['iban'] = None; data['banco1'] = None
    if 'banco2' in data and not data['banco2']: data['iban2'] = None; data['banco2'] = None
    if dados.senha: funcionario.senha_hash = pwd_context.hash(dados.senha)
    for k, v in data.items(): setattr(funcionario, k, v)
    if dados.areas_ids is not None:
        if dados.areas_ids:
            areas = db.query(Area).filter(Area.id.in_(dados.areas_ids), Area.company_id == company_id).all()
            funcionario.areas = areas
        else: funcionario.areas = []
    db.commit(); db.refresh(funcionario)
    return funcionario

def desativar_funcionario(db: Session, funcionario: Funcionario):
    funcionario.ativo = False; db.commit(); return funcionario

def get_config_ponto(db: Session, company_id: uuid.UUID):
    cfg = db.query(ConfigPonto).filter(ConfigPonto.company_id==company_id).first()
    if not cfg:
        cfg = ConfigPonto(company_id=company_id)
        db.add(cfg); db.commit(); db.refresh(cfg)
    return cfg

def parse_data(data_str: Optional[str]) -> date:
    if not data_str:
        return date.today()
    try:
        return date.fromisoformat(data_str)
    except:
        raise HTTPException(400, "Data inválida, use YYYY-MM-DD")

def listar_ponto_por_data(db: Session, company_id: uuid.UUID, data_alvo: date):
    pontos = db.query(Ponto).filter(Ponto.company_id==company_id, Ponto.data==data_alvo).order_by(Ponto.timestamp.desc()).all()
    return [_ponto_to_dict(db, p) for p in pontos]

def listar_faltas_por_data(db: Session, company_id: uuid.UUID, data_alvo: date):
    faltas = db.query(PedidoRH).filter(
        PedidoRH.company_id==company_id,
        PedidoRH.data_inicio==data_alvo,
        PedidoRH.tipo=="falta_justificada",
    ).all()
    return [_falta_to_dict(db, f) for f in faltas]

def listar_ponto_hoje(db: Session, company_id: uuid.UUID):
    return listar_ponto_por_data(db, company_id, date.today())

def listar_ponto_semana(db: Session, company_id: uuid.UUID):
    hoje = date.today()
    inicio = hoje - timedelta(days=hoje.weekday())
    pontos = db.query(Ponto).filter(Ponto.company_id==company_id, Ponto.data>=inicio).order_by(Ponto.data.desc()).all()
    return [_ponto_to_dict(db, p) for p in pontos]

def listar_ponto_periodo(db: Session, company_id: uuid.UUID, periodo: str):
    hoje = date.today()
    if periodo == "mes":
        inicio = hoje.replace(day=1)
    else:
        inicio = hoje - timedelta(days=hoje.weekday())
    pontos = db.query(Ponto).filter(Ponto.company_id==company_id, Ponto.data>=inicio).order_by(Ponto.data.desc()).all()
    return [_ponto_to_dict(db, p) for p in pontos]

def listar_faltas_hoje(db: Session, company_id: uuid.UUID):
    return listar_faltas_por_data(db, company_id, date.today())

def bater_ponto_rh(db: Session, company_id: uuid.UUID, funcionario_alvo_id: uuid.UUID, tipo: str, ip: str | None = None, data_str: str | None = None, motivo_retroativo: str | None = None, lancado_por_id: uuid.UUID | None = None, is_admin: bool = False):
    cfg = get_config_ponto(db, company_id)
    data_alvo = parse_data(data_str)
    hoje = date.today()
    is_retro = data_alvo!= hoje
    validar_janela_edicao(data_alvo, is_admin=is_admin)
    if is_retro and not motivo_retroativo:
        raise HTTPException(400, "Para ponto retroativo, informe o motivo")
    agora_utc = datetime.now(timezone.utc)
    agora_luanda = agora_utc.astimezone(ZoneInfo("Africa/Luanda"))
    atraso = 0
    qtd_atrasos = 0
    falta_gerada = None
    if tipo == "entrada":
        try:
            h, m = map(int, cfg.hora_entrada.split(":"))
            entrada_min = h*60 + m
            if not is_retro:
                agora_min = agora_luanda.hour*60 + agora_luanda.minute
                atraso = agora_min - entrada_min - cfg.tolerancia_min
                if atraso < 0: atraso = 0
        except:
            atraso = 0
    timestamp_final = agora_utc
    if is_retro:
        dt_luanda = datetime(data_alvo.year, data_alvo.month, data_alvo.day, 12, 0, 0, tzinfo=ZoneInfo("Africa/Luanda"))
        timestamp_final = dt_luanda.astimezone(timezone.utc)
    ponto = Ponto(
        id=uuid.uuid4(), company_id=company_id, funcionario_id=funcionario_alvo_id,
        data=data_alvo, tipo=tipo, timestamp=timestamp_final, dentro_raio=True, distancia_m=0,
        dispositivo="rh:web", ip=ip, justificado=True, atraso_min=atraso,
        is_retroativo=is_retro, motivo_retroativo=motivo_retroativo,
        lancado_por_id=lancado_por_id, lancado_em=agora_utc if is_retro else None
    )
    db.add(ponto); db.commit(); db.refresh(ponto)
    if tipo=="entrada" and atraso>0 and cfg.regra_atraso_ativa and not is_retro:
        if cfg.periodo_regra == "mes":
            inicio_periodo = data_alvo.replace(day=1)
        else:
            inicio_periodo = data_alvo - timedelta(days=data_alvo.weekday())
        pontos_periodo = db.query(Ponto).filter(
            Ponto.company_id==company_id,
            Ponto.funcionario_id==funcionario_alvo_id,
            Ponto.data>=inicio_periodo,
            Ponto.data<=data_alvo,
            Ponto.tipo=="entrada",
            Ponto.atraso_min>0
        ).all()
        qtd_atrasos = len(pontos_periodo)
        if qtd_atrasos >= cfg.qtd_atrasos_para_falta:
            ja_tem = db.query(PedidoRH).filter(
                PedidoRH.company_id==company_id,
                PedidoRH.funcionario_id==funcionario_alvo_id,
                PedidoRH.data_inicio==data_alvo,
            ).first()
            if not ja_tem:
                falta_obj = PedidoRH(
                    id=uuid.uuid4(), company_id=company_id, funcionario_id=funcionario_alvo_id,
                    tipo="falta_justificada", data_inicio=data_alvo, data_fim=data_alvo,
                    dias_uteis=1, motivo=f"Regra automática: {cfg.qtd_atrasos_para_falta} atrasos no {cfg.periodo_regra} = 1 falta.",
                    status="aprovado", is_retroativo=is_retro, motivo_retroativo="Gerado por regra",
                    lancado_por_id=lancado_por_id, lancado_em=agora_utc if is_retro else None
                )
                db.add(falta_obj); db.commit(); db.refresh(falta_obj)
                falta_gerada = _falta_to_dict(db, falta_obj)
    ponto_dict = _ponto_to_dict(db, ponto)
    return {"ponto": ponto_dict, "atraso_min": atraso, "falta_gerada": falta_gerada, "total_atrasos_periodo": qtd_atrasos, "is_retroativo": is_retro}

def marcar_falta_manual(db: Session, company_id: uuid.UUID, funcionario_id: uuid.UUID, motivo: str, categoria: str = "outros", observacao: str | None = None, data_str: str | None = None, motivo_retroativo: str | None = None, lancado_por_id: uuid.UUID | None = None, is_admin: bool = False):
    data_alvo = parse_data(data_str)
    is_retro = data_alvo!= date.today()
    validar_janela_edicao(data_alvo, is_admin=is_admin)
    if is_retro and not motivo_retroativo:
        raise HTTPException(400, "Para falta retroativa, informe motivo_retroativo")
    existe = db.query(PedidoRH).filter(
        PedidoRH.company_id==company_id,
        PedidoRH.funcionario_id==funcionario_id,
        PedidoRH.data_inicio==data_alvo,
        PedidoRH.tipo=="falta_justificada",
    ).first()
    if existe:
        raise HTTPException(400, f"Já existe falta em {data_alvo}")
    if categoria == "nao_apareceu":
        texto = f"NAO_APARECEU | {observacao or motivo}"
    elif categoria == "doente":
        texto = f"DOENTE | {observacao or motivo}"
    else:
        texto = f"OUTROS | {observacao or motivo}"
    agora_utc = datetime.now(timezone.utc)
    falta = PedidoRH(
        id=uuid.uuid4(), company_id=company_id, funcionario_id=funcionario_id,
        tipo="falta_justificada", data_inicio=data_alvo, data_fim=data_alvo,
        dias_uteis=1, motivo=texto, status="pendente",
        is_retroativo=is_retro, motivo_retroativo=motivo_retroativo,
        lancado_por_id=lancado_por_id, lancado_em=agora_utc if is_retro else None
    )
    db.add(falta); db.commit(); db.refresh(falta)
    return _falta_to_dict(db, falta)
