import uuid
from sqlalchemy.orm import Session
from fastapi import HTTPException
from passlib.context import CryptContext
from typing import List, Optional
from datetime import date, datetime, timezone, timedelta
from app.modules.funcionarios.models import Funcionario, Ponto, ConfigPonto, PedidoRH, StatusPedido, Notificacao, TipoPonto
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
    if not p:
        return {}
    tipo_str = str(p.tipo) if getattr(p, "tipo", None) else ""
    if "." in tipo_str:
        tipo_str = tipo_str.split(".")[-1]
    lancado_por_id = getattr(p, "lancado_por_id", None)
    lancado_em = getattr(p, "lancado_em", None)
    data_val = getattr(p, "data", None)
    timestamp_val = getattr(p, "timestamp", None)
    return {
        "id": str(p.id),
        "company_id": str(p.company_id),
        "funcionario_id": str(p.funcionario_id),
        "data": data_val.isoformat() if data_val else None,
        "tipo": tipo_str,
        "timestamp": timestamp_val.isoformat() if timestamp_val else None,
        "dentro_raio": getattr(p, "dentro_raio", True),
        "dispositivo": getattr(p, "dispositivo", None),
        "atraso_min": getattr(p, "atraso_min", 0),
        "is_retroativo": bool(getattr(p, "is_retroativo", False)),
        "motivo_retroativo": getattr(p, "motivo_retroativo", None),
        "lancado_por_id": str(lancado_por_id) if lancado_por_id else None,
        "lancado_por_nome": _get_nome_lancador(db, lancado_por_id),
        "lancado_em": lancado_em.isoformat() if lancado_em else None,
        "distancia_m": getattr(p, "distancia_m", None),
        "ip": getattr(p, "ip", None),
    }

def _falta_to_dict(db: Session, f: PedidoRH) -> dict:
    if not f:
        return {}
    status_raw = getattr(f, "status", "")
    status_str = str(status_raw)
    if "." in status_str:
        status_str = status_str.split(".")[-1]
    tipo_raw = getattr(f, "tipo", "")
    tipo_str = str(tipo_raw)
    if "." in tipo_str:
        tipo_str = tipo_str.split(".")[-1]
    data_inicio = getattr(f, "data_inicio", None)
    data_fim = getattr(f, "data_fim", None)
    lancado_por_id = getattr(f, "lancado_por_id", None)
    lancado_em = getattr(f, "lancado_em", None)
    justificado_em = getattr(f, "justificado_em", None)
    justificado_por_id = getattr(f, "justificado_por_id", None)
    aprovado_por_id = getattr(f, "aprovado_por_id", None)
    aprovado_em = getattr(f, "aprovado_em", None)
    encaminhado_em = getattr(f, "encaminhado_em", None)
    encaminhado_por_id = getattr(f, "encaminhado_por_id", None)
    return {
        "id": str(f.id),
        "company_id": str(f.company_id),
        "funcionario_id": str(f.funcionario_id),
        "tipo": tipo_str,
        "data": data_inicio.isoformat() if data_inicio else None,
        "data_inicio": data_inicio.isoformat() if data_inicio else None,
        "data_fim": data_fim.isoformat() if data_fim else None,
        "motivo": getattr(f, "motivo", None),
        "status": status_str,
        "is_retroativo": bool(getattr(f, "is_retroativo", False)),
        "motivo_retroativo": getattr(f, "motivo_retroativo", None),
        "lancado_por_id": str(lancado_por_id) if lancado_por_id else None,
        "lancado_por_nome": _get_nome_lancador(db, lancado_por_id),
        "lancado_em": lancado_em.isoformat() if lancado_em else None,
        "justificativa_tipo": getattr(f, "justificativa_tipo", None),
        "justificativa_obs": getattr(f, "justificativa_obs", None),
        "justificativa_anexo_url": getattr(f, "justificativa_anexo_url", None),
        "justificado_em": justificado_em.isoformat() if justificado_em else None,
        "justificado_por_id": str(justificado_por_id) if justificado_por_id else None,
        "justificado_por_nome": _get_nome_lancador(db, justificado_por_id),
        "aprovado_por_id": str(aprovado_por_id) if aprovado_por_id else None,
        "aprovado_por_nome": _get_nome_lancador(db, aprovado_por_id),
        "aprovado_em": aprovado_em.isoformat() if aprovado_em else None,
        "abonada": bool(getattr(f, "abonada", False)),
        "dono_atual": getattr(f, "dono_atual", "rh") or "rh",
        "area_origem": getattr(f, "area_origem", None),
        "encaminhado_para_admin": bool(getattr(f, "encaminhado_para_admin", False)),
        "encaminhado_em": encaminhado_em.isoformat() if encaminhado_em else None,
        "encaminhado_por_id": str(encaminhado_por_id) if encaminhado_por_id else None,
        "pode_editar_rh": (getattr(f, "dono_atual", "rh") == "rh") and not bool(getattr(f, "encaminhado_para_admin", False)),
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
    faltas = db.query(PedidoRH).filter(PedidoRH.company_id==company_id, PedidoRH.data_inicio==data_alvo, PedidoRH.tipo=="falta_justificada").all()
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

    # --- NOVA LOGICA DE ATRASOS ---
    notificacao_gerada = None
    qtd_atrasos = 0
    if tipo=="entrada" and atraso>0 and cfg.regra_atraso_ativa and not is_retro:
        func_alvo = db.query(Funcionario).filter(Funcionario.id==funcionario_alvo_id).first()
        ultimo_reset = getattr(func_alvo, "ultimo_reset_atrasos", None)
        if cfg.periodo_regra == "mes":
            inicio_config = data_alvo.replace(day=1)
        else:
            inicio_config = data_alvo - timedelta(days=data_alvo.weekday())
        # FIX 1: evita TypeError no max() quando ultimo_reset é None e compara datas com segurança
        inicio_periodo = inicio_config
        if ultimo_reset and ultimo_reset > inicio_config:
            inicio_periodo = ultimo_reset

        pontos_atraso = db.query(Ponto).filter(
            Ponto.company_id==company_id,
            Ponto.funcionario_id==funcionario_alvo_id,
            Ponto.data>=inicio_periodo,
            Ponto.tipo==TipoPonto.entrada,
            Ponto.atraso_min>0
        ).order_by(Ponto.data.asc()).all()
        qtd_atrasos = len(pontos_atraso)

        if qtd_atrasos >= cfg.qtd_atrasos_para_falta:
            ja_notif = db.query(Notificacao).filter(
                Notificacao.company_id==company_id,
                Notificacao.referencia_id==funcionario_alvo_id,
                Notificacao.tipo=="atraso_excedido",
                Notificacao.status=="pendente"
            ).first()
            if not ja_notif:
                notif = Notificacao(
                    id=uuid.uuid4(),
                    company_id=company_id,
                    tipo="atraso_excedido",
                    referencia_id=funcionario_alvo_id,
                    area_origem="sistema",
                    area_destino="rh",
                    dono_atual="rh",
                    status="pendente"
                )
                db.add(notif); db.commit(); db.refresh(notif)
                notificacao_gerada = notif

    ponto_dict = _ponto_to_dict(db, ponto)
    return {
        "ponto": ponto_dict,
        "atraso_min": atraso,
        "total_atrasos_periodo": qtd_atrasos,
        "notificacao_atraso_gerada": bool(notificacao_gerada),
        "notificacao_id": str(notificacao_gerada.id) if notificacao_gerada else None,
        "is_retroativo": is_retro
    }

def marcar_falta_manual(db: Session, company_id: uuid.UUID, funcionario_id: uuid.UUID, motivo: str, categoria: str = "outros", observacao: str | None = None, data_str: str | None = None, motivo_retroativo: str | None = None, lancado_por_id: uuid.UUID | None = None, is_admin: bool = False):
    data_alvo = parse_data(data_str)
    is_retro = data_alvo!= date.today()
    validar_janela_edicao(data_alvo, is_admin=is_admin)
    if is_retro and not motivo_retroativo:
        raise HTTPException(400, "Para falta retroativa, informe motivo_retroativo")
    existe = db.query(PedidoRH).filter(PedidoRH.company_id==company_id, PedidoRH.funcionario_id==funcionario_id, PedidoRH.data_inicio==data_alvo, PedidoRH.tipo=="falta_justificada").first()
    if existe:
        raise HTTPException(400, f"Já existe falta em {data_alvo}")
    texto = f"{categoria.upper()} | {observacao or motivo}"
    agora_utc = datetime.now(timezone.utc)
    falta = PedidoRH(
        id=uuid.uuid4(), company_id=company_id, funcionario_id=funcionario_id,
        tipo="falta_justificada", data_inicio=data_alvo, data_fim=data_alvo,
        dias_uteis=1, motivo=texto, status=StatusPedido.pendente.value,
        is_retroativo=is_retro, motivo_retroativo=motivo_retroativo,
        lancado_por_id=lancado_por_id, lancado_em=agora_utc if is_retro else None,
        dono_atual="rh", area_origem="rh"
    )
    db.add(falta); db.commit(); db.refresh(falta)
    return _falta_to_dict(db, falta)


def justificar_falta(db: Session, company_id: uuid.UUID, falta_id: uuid.UUID, tipo: str, obs: str | None, anexo_url: str | None, justificado_por_id: uuid.UUID | None):
    falta = db.query(PedidoRH).filter(PedidoRH.id == falta_id, PedidoRH.company_id == company_id).first()
    if not falta:
        raise HTTPException(404, "Falta não encontrada")

    # TRAVA 1: se essa mesma falta já está em análise
    if falta.status in [StatusPedido.pendente_justificacao.value, StatusPedido.aguardando_admin.value, StatusPedido.encaminhado_admin.value]:
        raise HTTPException(400, "Essa justificação já está em análise. Aguarde resposta do RH/Admin.")

    # TRAVA 2: se já tem anexo e não foi rejeitada, não deixa reenviar
    if falta.justificativa_anexo_url and falta.status != StatusPedido.rejeitado.value:
        raise HTTPException(400, "Falta já justificada. Aguarde aprovação do RH/Admin.")

    # TRAVA 3: bloqueio global - se ele já tem OUTRA falta pendente, bloqueia tudo
    tem_pendente = db.query(PedidoRH).filter(
        PedidoRH.company_id == company_id,
        PedidoRH.funcionario_id == falta.funcionario_id,
        PedidoRH.status.in_([StatusPedido.pendente_justificacao.value, StatusPedido.aguardando_admin.value, StatusPedido.encaminhado_admin.value]),
        PedidoRH.id != falta.id
    ).first()
    if tem_pendente:
        raise HTTPException(400, "Você já tem uma justificação em análise. Aguarde a resposta antes de enviar outra.")

    falta.justificativa_tipo = tipo
    falta.justificativa_obs = obs
    falta.justificativa_anexo_url = anexo_url
    falta.justificado_por_id = justificado_por_id
    falta.justificado_em = datetime.now(timezone.utc)
    falta.status = StatusPedido.pendente_justificacao.value
    falta.dono_atual = "rh"
    falta.area_origem = "rh"
    db.commit()
    db.refresh(falta)

    # cria notificação tipo falta para cair na tab
    existe = db.query(Notificacao).filter(
        Notificacao.company_id==company_id,
        Notificacao.referencia_id==falta.id,
        Notificacao.tipo=="falta",
        Notificacao.status=="pendente"
    ).first()
    if not existe:
        notif = Notificacao(
            id=uuid.uuid4(),
            company_id=company_id,
            tipo="falta",
            referencia_id=falta.id,
            area_origem="rh",
            area_destino="rh",
            dono_atual="rh",
            status="pendente"
        )
        db.add(notif)
        db.commit()

    return _falta_to_dict(db, falta)




def aprovar_falta(db: Session, company_id: uuid.UUID, falta_id: uuid.UUID, aprovado_por_id: uuid.UUID | None, observacao: str | None = None):
    falta = db.query(PedidoRH).filter(PedidoRH.id == falta_id, PedidoRH.company_id == company_id).first()
    if not falta:
        raise HTTPException(404, "Falta não encontrada")
    falta.status = StatusPedido.justificado.value
    falta.abonada = True
    falta.aprovado_por_id = aprovado_por_id
    falta.aprovado_em = datetime.now(timezone.utc)
    if observacao:
        falta.observacao_gestor = observacao
    # ATUALIZA NOTIFICAÇÃO PARA OS 30MIN FUNCIONAREM
    db.query(Notificacao).filter(Notificacao.company_id==company_id, Notificacao.referencia_id==falta_id, Notificacao.tipo=="falta", Notificacao.status=="pendente").update({"status":"aprovada", "lida":True, "updated_at": datetime.now(timezone.utc)})
    db.commit(); db.refresh(falta)
    return _falta_to_dict(db, falta)

def rejeitar_falta(db: Session, company_id: uuid.UUID, falta_id: uuid.UUID, aprovado_por_id: uuid.UUID | None, observacao: str | None = None):
    falta = db.query(PedidoRH).filter(PedidoRH.id == falta_id, PedidoRH.company_id == company_id).first()
    if not falta:
        raise HTTPException(404, "Falta não encontrada")
    falta.status = StatusPedido.rejeitado.value
    falta.abonada = False
    falta.aprovado_por_id = aprovado_por_id
    falta.aprovado_em = datetime.now(timezone.utc)
    if observacao:
        falta.observacao_gestor = observacao
    db.query(Notificacao).filter(Notificacao.company_id==company_id, Notificacao.referencia_id==falta_id, Notificacao.tipo=="falta", Notificacao.status=="pendente").update({"status":"rejeitada", "lida":True, "updated_at": datetime.now(timezone.utc)})
    db.commit(); db.refresh(falta)
    return _falta_to_dict(db, falta)

def remover_falta(db: Session, company_id: uuid.UUID, falta_id: uuid.UUID):
    falta = db.query(PedidoRH).filter(PedidoRH.id == falta_id, PedidoRH.company_id == company_id).first()
    if not falta:
        raise HTTPException(404, "Falta não encontrada")
    if not falta.abonada and falta.status not in [StatusPedido.justificado.value, "justificado", StatusPedido.aprovado.value, "aprovado"]:
        raise HTTPException(400, "Só é permitido remover falta justificada/abonada. Use aprovar antes.")
    db.delete(falta); db.commit()
    return {"ok": True, "id": str(falta_id)}

def encaminhar_falta_para_admin(db: Session, company_id: uuid.UUID, falta_id: uuid.UUID, encaminhado_por_id: uuid.UUID | None):
    falta = db.query(PedidoRH).filter(PedidoRH.id == falta_id, PedidoRH.company_id == company_id).first()
    if not falta:
        raise HTTPException(404, "Falta não encontrada")
    if getattr(falta, "dono_atual", "rh") == "admin":
        raise HTTPException(400, "Já encaminhado para admin")
    if falta.status!= StatusPedido.pendente_justificacao.value:
        raise HTTPException(400, "Só pode encaminhar falta com justificativa pendente")
    falta.dono_atual = "admin"
    falta.encaminhado_para_admin = True
    falta.encaminhado_em = datetime.now(timezone.utc)
    falta.encaminhado_por_id = encaminhado_por_id
    falta.status = StatusPedido.aguardando_admin.value
    # fecha a notificação do RH e abre pro admin - ISSO GARANTE O UPDATED_AT
    db.query(Notificacao).filter(Notificacao.company_id==company_id, Notificacao.referencia_id==falta_id, Notificacao.tipo=="falta", Notificacao.status=="pendente", Notificacao.area_destino=="rh").update({"status":"encaminhada", "lida":True, "updated_at": datetime.now(timezone.utc)})
    notif = Notificacao(id=uuid.uuid4(), company_id=company_id, tipo="falta", referencia_id=falta.id, area_origem="rh", area_destino="admin", dono_atual="admin", status="pendente")
    db.add(notif); db.commit(); db.refresh(falta)
    return _falta_to_dict(db, falta)



def _funcionario_full_dict(f: Funcionario | None) -> dict | None:
    if not f:
        return None
    return {
        "id": str(f.id),
        "company_id": str(f.company_id),
        "nome": f.nome,
        "nome_completo": f.nome,
        "numero_bi": f.numero_bi,
        "cargo": f.cargo,
        "telefone": f.telefone,
        "email": f.email,
        "genero": f.genero,
        "nacionalidade": f.nacionalidade,
        "estado_civil": f.estado_civil,
        "cidade": f.cidade,
        "provincia": f.provincia,
        "data_admissao": f.data_admissao.isoformat() if f.data_admissao else None,
        "area_principal_id": str(f.area_principal_id) if f.area_principal_id else None,
        "ativo": f.ativo,
        "tem_acesso": f.tem_acesso,
        "ultimo_reset_atrasos": f.ultimo_reset_atrasos.isoformat() if f.ultimo_reset_atrasos else None,
    }
def listar_notificacoes(db: Session, company_id: uuid.UUID, area: str, status: str | None = None):
    q = db.query(Notificacao).filter(Notificacao.company_id == company_id, Notificacao.area_destino == area)
    if status:
        q = q.filter(Notificacao.status == status)
    notifs = q.order_by(Notificacao.created_at.desc()).all()
    result = []
    for n in notifs:
        item = {
            "notificacao_id": str(n.id),
            "tipo": n.tipo,
            "area_origem": n.area_origem,
            "area_destino": n.area_destino,
            "dono_atual": n.dono_atual,
            "status_notificacao": n.status,
            "lida": n.lida,
            "created_at": n.created_at.isoformat() if n.created_at else None,
            "updated_at": n.updated_at.isoformat() if n.updated_at else None,
        }
        if n.tipo == "falta":
            falta = db.query(PedidoRH).filter(PedidoRH.id == n.referencia_id).first()
            func = falta.funcionario if falta and hasattr(falta, 'funcionario') and falta.funcionario else (db.query(Funcionario).filter(Funcionario.id == falta.funcionario_id).first() if falta else None)
            item["falta"] = _falta_to_dict(db, falta) if falta else None
            item["funcionario"] = _funcionario_full_dict(func)
            item["funcionario_id"] = str(func.id) if func else None
            item["funcionario_nome"] = func.nome if func else None
            # já coloca o funcionario completo dentro da falta também
            if item["falta"]:
                item["falta"]["funcionario"] = _funcionario_full_dict(func)
                item["falta"]["funcionario_nome"] = func.nome if func else None
        elif n.tipo == "atraso_excedido":
            func = db.query(Funcionario).filter(Funcionario.id == n.referencia_id).first()
            cfg = get_config_ponto(db, company_id)
            inicio = getattr(func, "ultimo_reset_atrasos", None) if func else None
            if not inicio:
                if cfg.periodo_regra == "mes":
                    inicio = date.today().replace(day=1)
                else:
                    inicio = date.today() - timedelta(days=date.today().weekday())
            pontos = db.query(Ponto).filter(Ponto.company_id==company_id, Ponto.funcionario_id==n.referencia_id, Ponto.data>=inicio, Ponto.tipo==TipoPonto.entrada, Ponto.atraso_min>0).order_by(Ponto.data.desc()).all()
            item["funcionario"] = _funcionario_full_dict(func)
            item["funcionario_id"] = str(func.id) if func else None
            item["funcionario_nome"] = func.nome if func else None
            item["qtd_atrasos"] = len(pontos)
            item["atrasos"] = [_ponto_to_dict(db, p) for p in pontos]
            item["periodo"] = cfg.periodo_regra
            item["qtd_para_falta"] = cfg.qtd_atrasos_para_falta
        result.append(item)
    return result




# --- NOVAS FUNCOES ATRASO ---
def aplicar_falta_por_atraso(db: Session, company_id: uuid.UUID, funcionario_id: uuid.UUID, aplicado_por_id: uuid.UUID | None):
    func = db.query(Funcionario).filter(Funcionario.id==funcionario_id, Funcionario.company_id==company_id).first()
    if not func:
        raise HTTPException(404, "Funcionário não encontrado")
    cfg = get_config_ponto(db, company_id)
    falta = PedidoRH(
        id=uuid.uuid4(), company_id=company_id, funcionario_id=funcionario_id,
        tipo="falta_justificada", data_inicio=date.today(), data_fim=date.today(),
        dias_uteis=1, motivo=f"Regra: {cfg.qtd_atrasos_para_falta} atrasos no {cfg.periodo_regra} = 1 falta. Func: {func.nome}",
        status=StatusPedido.aprovado.value, abonada=False,
        dono_atual="rh", area_origem="sistema",
        lancado_por_id=aplicado_por_id, lancado_em=datetime.now(timezone.utc)
    )
    func.ultimo_reset_atrasos = date.today()
    db.add(falta)
    db.query(Notificacao).filter(Notificacao.company_id==company_id, Notificacao.referencia_id==funcionario_id, Notificacao.tipo=="atraso_excedido", Notificacao.status=="pendente").update({"status":"resolvido", "lida":True, "updated_at": datetime.now(timezone.utc)})
    db.commit(); db.refresh(falta)
    return _falta_to_dict(db, falta)

def ignorar_atrasos(db: Session, company_id: uuid.UUID, funcionario_id: uuid.UUID):
    func = db.query(Funcionario).filter(Funcionario.id==funcionario_id, Funcionario.company_id==company_id).first()
    if not func:
        raise HTTPException(404, "Funcionário não encontrado")
    func.ultimo_reset_atrasos = date.today()
    db.query(Notificacao).filter(Notificacao.company_id==company_id, Notificacao.referencia_id==funcionario_id, Notificacao.tipo=="atraso_excedido", Notificacao.status=="pendente").update({"status":"ignorado", "lida":True, "updated_at": datetime.now(timezone.utc)})
    db.commit()
    return {"ok": True, "msg": "Atrasos zerados, contador reiniciado"}

def encaminhar_atraso_para_admin(db: Session, company_id: uuid.UUID, funcionario_id: uuid.UUID, encaminhado_por_id: uuid.UUID | None):
    notif = db.query(Notificacao).filter(Notificacao.company_id==company_id, Notificacao.referencia_id==funcionario_id, Notificacao.tipo=="atraso_excedido", Notificacao.status=="pendente", Notificacao.area_destino=="rh").first()
    if not notif:
        raise HTTPException(404, "Notificação de atraso não encontrada")
    notif.area_origem = "rh"
    notif.area_destino = "admin"
    notif.dono_atual = "admin"
    notif.status = "pendente"
    notif.updated_at = datetime.now(timezone.utc)
    db.commit(); db.refresh(notif)
    return {"ok": True, "msg": "Encaminhado para admin"}



def ignorar_falta(db: Session, company_id: uuid.UUID, falta_id: uuid.UUID, ignorado_por_id: uuid.UUID | None = None):
    falta = db.query(PedidoRH).filter(PedidoRH.id == falta_id, PedidoRH.company_id == company_id).first()
    if not falta:
        raise HTTPException(404, "Falta não encontrada")
    # não muda a falta, só a notificação - continua pendente mas vai pro histórico como ignorada depois dos 30min
    # se quiser mudar a falta também, descomenta:
    # falta.status = StatusPedido.rejeitado.value
    agora = datetime.now(timezone.utc)
    db.query(Notificacao).filter(
        Notificacao.company_id==company_id,
        Notificacao.referencia_id==falta_id,
        Notificacao.tipo=="falta",
        Notificacao.status=="pendente"
    ).update({"status":"ignorada", "lida":True, "updated_at": agora})
    db.commit()
    return {"ok": True, "msg": "Ignorada"}
