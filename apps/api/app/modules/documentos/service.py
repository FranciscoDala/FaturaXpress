import uuid
import re
import unicodedata
import base64
import os
import io
from datetime import datetime, timezone, date
from sqlalchemy.orm import Session
from fastapi import HTTPException
from typing import Optional, Dict, Any, List

from app.modules.documentos.models import ModeloDocumento, DocumentoGerado, TipoModeloDocumento
from app.modules.funcionarios.models import Funcionario

VAR_REGEX = re.compile(r"\{\{\s*([a-zA-Z0-9_]+)\s*\}\}")

def _slugify(texto: str) -> str:
    nfkd = unicodedata.normalize('NFKD', texto)
    sem_acento = "".join([c for c in nfkd if not unicodedata.combining(c)])
    slug = re.sub(r'[^a-zA-Z0-9]+', '-', sem_acento).strip('-').lower()
    return slug[:60] or "doc"

def _extenso_data(d: Any) -> str:
    if not d: return ""
    try: return d.strftime("%d/%m/%Y")
    except: return str(d)

def _get_empresa_val(company: Any, keys: list, default: str = "") -> str:
    if not company: return default
    for k in keys:
        if hasattr(company, k):
            v = getattr(company, k)
            if v: return str(v)
    return default

def _empresa_to_base64(company: Any) -> str:
    if not company: return ""
    raw = _get_empresa_val(company, ["logo_url", "image_url", "logo", "image", "companyLogo"], "")
    if not raw: return ""
    try:
        if raw.startswith("data:"):
            return raw
        if raw.startswith("http"):
            import requests
            r = requests.get(raw, timeout=4)
            if r.status_code == 200:
                mime = r.headers.get("content-type", "image/png")
                b64 = base64.b64encode(r.content).decode()
                return f"data:{mime};base64,{b64}"
        if os.path.exists(raw):
            with open(raw, "rb") as f:
                b64 = base64.b64encode(f.read()).decode()
                ext = raw.split(".")[-1] if "." in raw else "png"
                return f"data:image/{ext};base64,{b64}"
    except:
        return ""
    return ""

def montar_mapa_variaveis(funcionario: Funcionario, company: Any, extras: Optional[Dict[str, Any]] = None) -> Dict[str, str]:
    if extras is None: extras = {}
    hoje = date.today()
    nome_empresa = _get_empresa_val(company, ["nome_fantasia", "razao_social", "companyName", "nome"], "Empresa")
    nif_empresa = _get_empresa_val(company, ["nif", "nif_empresa"], "")
    endereco_empresa = _get_empresa_val(company, ["endereco", "endereco_empresa", "address"], "")
    telefone_empresa = _get_empresa_val(company, ["telefone", "telefone_empresa", "phone"], "")
    email_empresa = _get_empresa_val(company, ["email", "email_empresa"], "")
    cidade_emissao = extras.get("cidade_emissao") or _get_empresa_val(company, ["cidade", "city"], "Luanda")

    mapa = {
        "nome_funcionario": funcionario.nome,
        "primeiro_nome": funcionario.nome.split()[0] if funcionario.nome else "",
        "bi": funcionario.numero_bi or "",
        "nif_funcionario": funcionario.nif or "",
        "data_nascimento": funcionario.data_nascimento.strftime("%d/%m/%Y") if funcionario.data_nascimento else "",
        "nacionalidade": funcionario.nacionalidade or "Angolana",
        "estado_civil": funcionario.estado_civil or "",
        "telefone": funcionario.telefone or "",
        "email": funcionario.email or "",
        "endereco_completo": funcionario.endereco or "",
        "cidade": funcionario.cidade or "",
        "provincia": funcionario.provincia or "",
        "nome_pai": funcionario.nome_pai or "",
        "nome_mae": funcionario.nome_mae or "",
        "iban": funcionario.iban or "",
        "banco1": funcionario.banco1 or "",
        "cargo": funcionario.cargo or "",
        "area": str(funcionario.area_principal_id) if funcionario.area_principal_id else "",
        "tipo_contrato": extras.get("tipo_contrato", "Efetivo"),
        "data_admissao": funcionario.data_admissao.strftime("%d/%m/%Y") if funcionario.data_admissao else hoje.strftime("%d/%m/%Y"),
        "data_inicio_contrato": extras.get("data_inicio_contrato", hoje.strftime("%d/%m/%Y")),
        "duracao_contrato": extras.get("duracao_contrato", "Indeterminado"),
        "periodo_experiencia": extras.get("periodo_experiencia", "60 dias"),
        "horario_entrada": extras.get("horario_entrada", "08:00"),
        "horario_saida": extras.get("horario_saida", "17:00"),
        "carga_horaria": extras.get("carga_horaria", "40h semanais"),
        "local_trabalho": extras.get("local_trabalho", endereco_empresa or "Luanda"),
        "salario_base": str(extras.get("salario_base", "0")),
        "salario_base_formatado": extras.get("salario_base_formatado", str(extras.get("salario_base", "0")) + " Kz"),
        "salario_extenso": extras.get("salario_extenso", str(extras.get("salario_base", ""))),
        "nome_empresa": nome_empresa,
        "nif_empresa": nif_empresa,
        "endereco_empresa": endereco_empresa,
        "telefone_empresa": telefone_empresa,
        "email_empresa": email_empresa,
        "representante_empresa": extras.get("representante_empresa", nome_empresa),
        "cargo_representante": extras.get("cargo_representante", "Director Geral"),
        "data_hoje": hoje.strftime("%d/%m/%Y"),
        "data_hoje_extenso": _extenso_data(hoje),
        "ano_atual": str(hoje.year),
        "cidade_emissao": cidade_emissao,
        "codigo_documento": extras.get("codigo_documento", ""),
        "logo_base64": extras.get("logo_base64") or _empresa_to_base64(company),
    }
    mapa.update(extras)
    if not mapa.get("logo_base64"):
        mapa["logo_base64"] = _empresa_to_base64(company)
    return mapa

def renderizar_html(template_html: str, variaveis: Dict[str, Any]) -> str:
    def replacer(match):
        key = match.group(1).strip()
        return str(variaveis.get(key, ""))
    return VAR_REGEX.sub(replacer, template_html)

def _extrair_variaveis_usadas(html: str) -> List[str]:
    return list(set(VAR_REGEX.findall(html)))

def _get_clausulas_do_modelo(modelo: ModeloDocumento) -> List[Dict[str, Any]]:
    """Pega clausulas do conteudo_json, com fallback para clausulas default"""
    cj = modelo.conteudo_json or {}
    clausulas = cj.get("clausulas")
    if clausulas and isinstance(clausulas, list) and len(clausulas) > 0:
        return clausulas
    # fallback - 6 clausulas padrão se empresa nunca editou
    return [
        {"id": "1", "titulo": "Cláusula 1ª - Objecto", "texto": "O trabalhador é admitido para exercer as funções de {{cargo}}, na área {{area}}, com início em {{data_admissao}}."},
        {"id": "2", "titulo": "Cláusula 2ª - Local", "texto": "O local de trabalho habitual será em {{local_trabalho}}."},
        {"id": "3", "titulo": "Cláusula 3ª - Horário", "texto": "Das {{horario_entrada}} às {{horario_saida}}, com carga horária de {{carga_horaria}}."},
        {"id": "4", "titulo": "Cláusula 4ª - Remuneração", "texto": "{{salario_base_formatado}} ({{salario_extenso}})."},
        {"id": "5", "titulo": "Cláusula 5ª - Período Experimental", "texto": "{{periodo_experiencia}}."},
        {"id": "6", "titulo": "Cláusula 6ª - Duração", "texto": "Por tempo {{duracao_contrato}}."},
    ]

def gerar_documento(db: Session, company_id: uuid.UUID, funcionario_id: uuid.UUID, modelo_id: uuid.UUID, extras: Optional[Dict[str, Any]] = None, gerado_por_id: Optional[uuid.UUID] = None):
    modelo = db.query(ModeloDocumento).filter(ModeloDocumento.id == modelo_id, ModeloDocumento.company_id == company_id, ModeloDocumento.is_ativo == True).first()
    if not modelo: raise HTTPException(404, "Modelo não encontrado")
    funcionario = db.query(Funcionario).filter(Funcionario.id == funcionario_id, Funcionario.company_id == company_id).first()
    if not funcionario: raise HTTPException(404, "Funcionário não encontrado")
    from app.modules.auth.models import Company
    company = db.query(Company).filter(Company.id == company_id).first()

    codigo = "DOC-" + str(datetime.now().year) + "-" + uuid.uuid4().hex[:6].upper()
    if extras is None: extras = {}
    extras["codigo_documento"] = codigo
    extras["logo_base64"] = _empresa_to_base64(company)

    # 1 - mapa base
    variaveis = montar_mapa_variaveis(funcionario, company, extras)

    # 2 - NOVO: renderiza cláusulas da empresa
    clausulas_raw = _get_clausulas_do_modelo(modelo)
    # permite override por extras (se frontend mandar clausulas na hora de gerar)
    if extras.get("clausulas") and isinstance(extras["clausulas"], list):
        clausulas_raw = extras["clausulas"]

    clausulas_render = []
    for c in clausulas_raw:
        titulo_raw = c.get("titulo", "")
        texto_raw = c.get("texto", "")
        titulo = renderizar_html(titulo_raw, variaveis)
        texto = renderizar_html(texto_raw, variaveis)
        clausulas_render.append({
            "id": c.get("id", str(uuid.uuid4())),
            "titulo": titulo,
            "texto": texto,
            "titulo_raw": titulo_raw,
            "texto_raw": texto_raw
        })

    # HTML das clausulas para o template antigo
    clausulas_html = "".join([f"<p><b>{cr['titulo']}:</b> {cr['texto']}</p>" for cr in clausulas_render])
    logo_img_tag = f"<img src=\"{variaveis['logo_base64']}\" style=\"width:100%;height:100%;object-fit:contain;\"/>" if variaveis.get("logo_base64") else ""

    variaveis["clausulas_render"] = clausulas_render
    variaveis["clausulas_html"] = clausulas_html
    variaveis["logo_base64_img"] = logo_img_tag
    # para template antigo que usa {{hash_verificacao}}
    variaveis["hash_verificacao"] = codigo

    # 3 - renderiza HTML final (agora já com clausulas_html disponível)
    html_final = renderizar_html(modelo.conteudo_html, variaveis)

    doc = DocumentoGerado(
        id=uuid.uuid4(),
        company_id=company_id,
        funcionario_id=funcionario_id,
        modelo_id=modelo.id,
        modelo_versao=modelo.versao,
        tipo=modelo.tipo,
        nome_arquivo=f"{modelo.codigo}-{_slugify(funcionario.nome)}.pdf",
        codigo_verificacao=codigo,
        conteudo_html_final=html_final,
        dados_snapshot={
            "funcionario": {"id": str(funcionario.id), "nome": funcionario.nome, "bi": funcionario.numero_bi},
            "extras": extras,
            "empresa": {"nome": variaveis["nome_empresa"], "nif": variaveis["nif_empresa"]},
            "clausulas_raw": clausulas_raw,
            "clausulas_render": clausulas_render
        },
        variaveis_preenchidas=variaveis,
        gerado_por_id=gerado_por_id,
        status="gerado"
    )
    db.add(doc)
    db.commit()
    db.refresh(doc)
    return doc

def gerar_contrato_automatico_ao_criar(db: Session, company_id: uuid.UUID, funcionario: Funcionario, extras_contrato: Optional[Dict[str, Any]] = None):
    modelo_padrao = db.query(ModeloDocumento).filter(ModeloDocumento.company_id == company_id, ModeloDocumento.is_padrao == True, ModeloDocumento.is_ativo == True, ModeloDocumento.tipo == TipoModeloDocumento.contrato_efetivo.value).first()
    if not modelo_padrao:
        modelo_padrao = db.query(ModeloDocumento).filter(ModeloDocumento.company_id == company_id, ModeloDocumento.is_padrao == True, ModeloDocumento.is_ativo == True).first()
    if not modelo_padrao: return None
    return gerar_documento(db, company_id, funcionario.id, modelo_padrao.id, extras=extras_contrato, gerado_por_id=None)

def listar_modelos(db: Session, company_id: uuid.UUID):
    return db.query(ModeloDocumento).filter(ModeloDocumento.company_id == company_id).order_by(ModeloDocumento.is_padrao.desc(), ModeloDocumento.nome).all()

def obter_modelo(db: Session, company_id: uuid.UUID, modelo_id: uuid.UUID):
    return db.query(ModeloDocumento).filter(ModeloDocumento.id == modelo_id, ModeloDocumento.company_id == company_id).first()

def criar_modelo(db: Session, company_id: uuid.UUID, dados: Dict[str, Any], criado_por_id: Optional[uuid.UUID] = None):
    if db.query(ModeloDocumento).filter(ModeloDocumento.company_id == company_id, ModeloDocumento.codigo == dados['codigo']).first():
        raise HTTPException(400, f"Código {dados['codigo']} já existe")
    variaveis = _extrair_variaveis_usadas(dados['conteudo_html'])
    # garante clausulas no json mesmo ao criar
    cj = dados.get('conteudo_json') or {}
    if 'clausulas' not in cj:
        cj['clausulas'] = _get_clausulas_do_modelo(ModeloDocumento(conteudo_json=cj, tipo=dados['tipo'], codigo=dados['codigo']))
    modelo = ModeloDocumento(
        id=uuid.uuid4(),
        company_id=company_id,
        codigo=dados['codigo'],
        nome=dados['nome'],
        tipo=dados['tipo'],
        categoria=dados['categoria'],
        descricao=dados.get('descricao'),
        conteudo_html=dados['conteudo_html'],
        conteudo_json=cj,
        variaveis_usadas=variaveis,
        is_padrao=dados.get('is_padrao', False),
        tags=dados.get('tags', []),
        criado_por_id=criado_por_id
    )
    if modelo.is_padrao:
        db.query(ModeloDocumento).filter(ModeloDocumento.company_id == company_id, ModeloDocumento.tipo == modelo.tipo, ModeloDocumento.is_padrao == True).update({"is_padrao": False})
    db.add(modelo); db.commit(); db.refresh(modelo); return modelo

def atualizar_modelo(db: Session, company_id: uuid.UUID, modelo_id: uuid.UUID, dados: Dict[str, Any], atualizado_por_id: Optional[uuid.UUID] = None):
    modelo = obter_modelo(db, company_id, modelo_id)
    if not modelo: raise HTTPException(404, "Modelo não encontrado")
    if 'conteudo_html' in dados and dados['conteudo_html']:
        dados['variaveis_usadas'] = _extrair_variaveis_usadas(dados['conteudo_html'])
        dados['versao'] = modelo.versao + 1
    # se vier conteudo_json com clausulas, mantém
    if 'conteudo_json' in dados and dados['conteudo_json']:
        cj = dados['conteudo_json']
        # extrai variaveis também das clausulas para preview
        claus = cj.get('clausulas') or []
        vars_claus = []
        for c in claus:
            vars_claus.extend(_extrair_variaveis_usadas(c.get('titulo','') + ' ' + c.get('texto','')))
        dados['variaveis_usadas'] = list(set((dados.get('variaveis_usadas') or []) + vars_claus))
        if 'versao' not in dados:
            dados['versao'] = modelo.versao + 1

    if dados.get('is_padrao') == True:
        db.query(ModeloDocumento).filter(ModeloDocumento.company_id == company_id, ModeloDocumento.tipo == modelo.tipo, ModeloDocumento.id!= modelo_id, ModeloDocumento.is_padrao == True).update({"is_padrao": False})
    for k, v in dados.items():
        if v is not None and hasattr(modelo, k): setattr(modelo, k, v)
    modelo.atualizado_por_id = atualizado_por_id; db.commit(); db.refresh(modelo); return modelo
