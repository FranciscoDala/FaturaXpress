import uuid
import re
import unicodedata
import base64
import os
from datetime import datetime, timezone, date
from sqlalchemy.orm import Session
from fastapi import HTTPException
from typing import Optional, Dict, Any, List, cast

from app.modules.documentos.models import ModeloDocumento, DocumentoGerado, TipoModeloDocumento, CategoriaModelo
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
        if raw.startswith("data:"): return raw
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
    except: return ""
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
    mapa: Dict[str, str] = {
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
        "tipo_contrato": str(extras.get("tipo_contrato", "Efetivo")),
        "data_admissao": funcionario.data_admissao.strftime("%d/%m/%Y") if funcionario.data_admissao else hoje.strftime("%d/%m/%Y"),
        "data_inicio_contrato": str(extras.get("data_inicio_contrato", hoje.strftime("%d/%m/%Y"))),
        "duracao_contrato": str(extras.get("duracao_contrato", "Indeterminado")),
        "periodo_experiencia": str(extras.get("periodo_experiencia", "60 dias")),
        "horario_entrada": str(extras.get("horario_entrada", "08:00")),
        "horario_saida": str(extras.get("horario_saida", "17:00")),
        "carga_horaria": str(extras.get("carga_horaria", "40h semanais")),
        "local_trabalho": str(extras.get("local_trabalho", endereco_empresa or "Luanda")),
        "salario_base": str(extras.get("salario_base", "0")),
        "salario_base_formatado": str(extras.get("salario_base_formatado", str(extras.get("salario_base", "0")) + " Kz")),
        "salario_extenso": str(extras.get("salario_extenso", str(extras.get("salario_base", "")))),
        "nome_empresa": nome_empresa,
        "nif_empresa": nif_empresa,
        "endereco_empresa": endereco_empresa,
        "telefone_empresa": telefone_empresa,
        "email_empresa": email_empresa,
        "representante_empresa": str(extras.get("representante_empresa", nome_empresa)),
        "cargo_representante": str(extras.get("cargo_representante", "Director Geral")),
        "data_hoje": hoje.strftime("%d/%m/%Y"),
        "data_hoje_extenso": _extenso_data(hoje),
        "ano_atual": str(hoje.year),
        "cidade_emissao": str(cidade_emissao),
        "codigo_documento": str(extras.get("codigo_documento", "")),
        "logo_base64": str(extras.get("logo_base64") or _empresa_to_base64(company)),
    }
    return mapa

def renderizar_html(template_html: str, variaveis: Dict[str, Any]) -> str:
    def replacer(match):
        key = match.group(1).strip()
        return str(variaveis.get(key, ""))
    return VAR_REGEX.sub(replacer, template_html)

def _extrair_variaveis_usadas(html: str) -> List[str]:
    return list(set(VAR_REGEX.findall(html or "")))

CATEGORIA_POR_TIPO = {
    "contrato_efetivo": "admissao", "contrato_estagio": "admissao", "contrato_temporario": "admissao",
    "contrato_experiencia": "admissao", "contrato_confidencialidade": "admissao",
    "aditivo_contratual": "gestao", "declaracao_trabalho": "gestao", "declaracao_vencimento": "gestao",
    "carta_recomendacao": "gestao", "carta_apresentacao": "gestao",
    "aviso_ferias": "ferias_ponto", "comunicacao_ferias": "ferias_ponto", "mapa_ferias": "ferias_ponto",
    "justificacao_falta": "ferias_ponto", "comunicacao_falta": "ferias_ponto", "horario_trabalho": "ferias_ponto",
    "advertencia_verbal": "disciplinar", "advertencia_escrita": "disciplinar", "processo_disciplinar": "disciplinar", "suspensao": "disciplinar",
    "aumento_salarial": "financeiro_carreira", "alteracao_cargo": "financeiro_carreira", "alteracao_salario": "financeiro_carreira", "comunicacao_bonus": "financeiro_carreira",
    "carta_demissao_funcionario": "saida", "carta_demissao_empresa": "saida", "declaracao_desvinculacao": "saida", "certificado_trabalho": "saida", "acordo_rescisao": "saida",
    "outro": "outros"
}

NOME_BONITO = {
    "contrato_efetivo": "Contrato Efetivo", "contrato_estagio": "Contrato Estágio", "contrato_temporario": "Contrato Temporário",
    "contrato_experiencia": "Contrato Experiência", "contrato_confidencialidade": "Contrato Confidencialidade",
    "aditivo_contratual": "Aditivo Contratual", "declaracao_trabalho": "Declaração de Trabalho", "declaracao_vencimento": "Declaração de Vencimento",
    "carta_recomendacao": "Carta de Recomendação", "carta_apresentacao": "Carta de Apresentação",
    "aviso_ferias": "Aviso de Férias", "comunicacao_ferias": "Comunicação de Férias", "mapa_ferias": "Mapa de Férias",
    "justificacao_falta": "Justificação de Falta", "comunicacao_falta": "Comunicação de Falta", "horario_trabalho": "Horário de Trabalho",
    "advertencia_verbal": "Advertência Verbal", "advertencia_escrita": "Advertência Escrita", "processo_disciplinar": "Processo Disciplinar", "suspensao": "Suspensão",
    "aumento_salarial": "Aumento Salarial", "alteracao_cargo": "Alteração de Cargo", "alteracao_salario": "Alteração de Salário", "comunicacao_bonus": "Comunicação de Bónus",
    "carta_demissao_funcionario": "Carta Demissão Funcionário", "carta_demissao_empresa": "Carta Demissão Empresa",
    "declaracao_desvinculacao": "Declaração Desvinculação", "certificado_trabalho": "Certificado de Trabalho", "acordo_rescisao": "Acordo Rescisão", "outro": "Outro"
}

def _default_clausulas_para_tipo(tipo: str) -> List[Dict[str, str]]:
    if tipo.startswith("contrato_"):
        return [
            {"id": "1", "titulo": "Cláusula 1ª - Objecto", "texto": "O trabalhador {{nome_funcionario}} é admitido para exercer as funções de {{cargo}}, na área {{area}}, com início em {{data_admissao}}."},
            {"id": "2", "titulo": "Cláusula 2ª - Local", "texto": "O local de trabalho habitual será em {{local_trabalho}}."},
            {"id": "3", "titulo": "Cláusula 3ª - Horário", "texto": "Das {{horario_entrada}} às {{horario_saida}}, carga de {{carga_horaria}}."},
            {"id": "4", "titulo": "Cláusula 4ª - Remuneração", "texto": "{{salario_base_formatado}}."},
            {"id": "5", "titulo": "Cláusula 5ª - Período Experimental", "texto": "{{periodo_experiencia}}."},
            {"id": "6", "titulo": "Cláusula 6ª - Duração", "texto": "Por tempo {{duracao_contrato}}."},
        ]
    if tipo == "aviso_ferias":
        return [{"id":"1","titulo":"Aviso","texto":"Comunicamos que {{nome_funcionario}} gozará férias de {{data_inicio_ferias}} a {{data_fim_ferias}}, total de {{dias_ferias}} dias."}]
    if tipo == "advertencia_verbal":
        return [{"id":"1","titulo":"Facto","texto":"O funcionário {{nome_funcionario}}, cargo {{cargo}}, no dia {{data_advertencia}}, {{motivo_advertencia}}."}]
    if tipo == "advertencia_escrita":
        return [{"id":"1","titulo":"Advertência","texto":"Serve a presente para advertir {{nome_funcionario}} por {{motivo_advertencia}} ocorrido em {{data_advertencia}}."}]
    if tipo == "aumento_salarial":
        return [{"id":"1","titulo":"Aumento","texto":"Comunicamos que {{nome_funcionario}} passa a auferir {{novo_salario}} a partir de {{data_hoje}}."}]
    if tipo == "declaracao_trabalho":
        return [{"id":"1","titulo":"Declaração","texto":"Declaramos que {{nome_funcionario}}, BI {{bi}}, trabalha nesta empresa como {{cargo}} desde {{data_admissao}}."}]
    nome = NOME_BONITO.get(tipo, tipo)
    return [{"id":"1","titulo":nome,"texto":f"Documento de {nome} referente a {{{{nome_funcionario}}}}, cargo {{{{cargo}}}}, emitido em {{{{data_hoje}}}} em {{{{cidade_emissao}}}}."}]

def _get_clausulas_do_modelo(modelo: ModeloDocumento) -> List[Dict[str, Any]]:
    cj = modelo.conteudo_json or {}
    clausulas = cj.get("clausulas")
    if clausulas and isinstance(clausulas, list) and len(clausulas) > 0:
        return clausulas
    tipo_val = modelo.tipo.value if hasattr(modelo.tipo, 'value') else str(modelo.tipo)
    return _default_clausulas_para_tipo(tipo_val)

def obter_ou_criar_por_tipo(db: Session, company_id: uuid.UUID, tipo_str: str) -> ModeloDocumento:
    try:
        tipo_enum = TipoModeloDocumento(tipo_str)
    except ValueError:
        raise HTTPException(400, f"Tipo {tipo_str} inválido")

    # >>> ALTERAÇÃO NECESSÁRIA: só retorna o que já existe da empresa, sem criar duplicado
    existente = db.query(ModeloDocumento).filter(
        ModeloDocumento.company_id == company_id,
        ModeloDocumento.tipo == tipo_enum,
        ModeloDocumento.is_ativo == True,
        ModeloDocumento.is_sistema == False
    ).first()
    if existente:
        return existente

    # se não existe, cria 1 vez só
    categoria_str = CATEGORIA_POR_TIPO.get(tipo_str, "outros")
    nome = NOME_BONITO.get(tipo_str, tipo_str)
    codigo = f"{tipo_str.upper()[:20]}-001"
    clausulas_default = _default_clausulas_para_tipo(tipo_str)
    novo = ModeloDocumento(
        id=uuid.uuid4(),
        company_id=company_id,
        codigo=codigo,
        nome=nome,
        tipo=tipo_enum,
        categoria=CategoriaModelo(categoria_str),
        descricao=f"Modelo padrão {nome}",
        conteudo_html="<div>{{clausulas_html}}</div>",
        conteudo_json={"clausulas": clausulas_default},
        conteudo_texto="",
        variaveis_usadas=cast(Any, ["nome_funcionario","cargo","data_hoje","cidade_emissao"]),
        versao=1,
        is_ativo=True,
        is_padrao=True,
        is_sistema=False
    )
    db.add(novo)
    try:
        db.commit()
    except:
        db.rollback()
        ja = db.query(ModeloDocumento).filter(ModeloDocumento.company_id == company_id, ModeloDocumento.tipo == tipo_enum, ModeloDocumento.is_ativo == True).first()
        if ja:
            return ja
        raise
    db.refresh(novo)
    return novo

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
    variaveis = montar_mapa_variaveis(funcionario, company, extras)
    clausulas_raw = _get_clausulas_do_modelo(modelo)
    if extras.get("clausulas") and isinstance(extras["clausulas"], list):
        clausulas_raw = extras["clausulas"]
    clausulas_render: List[Dict[str, str]] = []
    for c in clausulas_raw:
        titulo_raw = str(c.get("titulo", ""))
        texto_raw = str(c.get("texto", ""))
        titulo = renderizar_html(titulo_raw, variaveis)
        texto = renderizar_html(texto_raw, variaveis)
        clausulas_render.append({"id": str(c.get("id", str(uuid.uuid4()))), "titulo": titulo, "texto": texto, "titulo_raw": titulo_raw, "texto_raw": texto_raw})
    clausulas_html = "".join([f"<p><b>{cr['titulo']}:</b> {cr['texto']}</p>" for cr in clausulas_render])
    logo_img_tag = f"<img src=\"{variaveis['logo_base64']}\" style=\"width:100%;height:100%;object-fit:contain;\"/>" if variaveis.get("logo_base64") else ""
    variaveis["clausulas_render"] = cast(Any, clausulas_render)
    variaveis["clausulas_html"] = clausulas_html
    variaveis["logo_base64_img"] = logo_img_tag
    variaveis["hash_verificacao"] = codigo
    html_final = renderizar_html(modelo.conteudo_html, variaveis)
    doc = DocumentoGerado(
        id=uuid.uuid4(), company_id=company_id, funcionario_id=funcionario_id,
        modelo_id=modelo.id, modelo_versao=modelo.versao, tipo=modelo.tipo,
        nome_arquivo=f"{modelo.codigo}-{_slugify(funcionario.nome)}.pdf",
        codigo_verificacao=codigo, conteudo_html_final=html_final,
        dados_snapshot={"funcionario": {"id": str(funcionario.id), "nome": funcionario.nome, "bi": funcionario.numero_bi}, "extras": extras, "empresa": {"nome": variaveis["nome_empresa"], "nif": variaveis["nif_empresa"]}, "clausulas_raw": clausulas_raw, "clausulas_render": clausulas_render},
        variaveis_preenchidas=cast(Any, variaveis), gerado_por_id=gerado_por_id, status="gerado"
    )
    db.add(doc); db.commit(); db.refresh(doc)
    return doc

def gerar_contrato_automatico_ao_criar(db: Session, company_id: uuid.UUID, funcionario: Funcionario, extras_contrato: Optional[Dict[str, Any]] = None):
    modelo_padrao = db.query(ModeloDocumento).filter(ModeloDocumento.company_id == company_id, ModeloDocumento.is_padrao == True, ModeloDocumento.is_ativo == True, ModeloDocumento.tipo == TipoModeloDocumento.contrato_efetivo.value).first()
    if not modelo_padrao:
        modelo_padrao = db.query(ModeloDocumento).filter(ModeloDocumento.company_id == company_id, ModeloDocumento.is_padrao == True, ModeloDocumento.is_ativo == True).first()
    if not modelo_padrao: return None
    return gerar_documento(db, company_id, funcionario.id, modelo_padrao.id, extras=extras_contrato, gerado_por_id=None)

def listar_todos_modelos(db: Session, company_id: uuid.UUID):
    return db.query(ModeloDocumento).filter(ModeloDocumento.company_id == company_id).order_by(ModeloDocumento.is_padrao.desc(), ModeloDocumento.nome).all()

def obter_modelo(db: Session, company_id: uuid.UUID, modelo_id: uuid.UUID):
    return db.query(ModeloDocumento).filter(ModeloDocumento.id == modelo_id, ModeloDocumento.company_id == company_id).first()

def criar_modelo(db: Session, company_id: uuid.UUID, dados: Dict[str, Any], criado_por_id: Optional[uuid.UUID] = None):
    if db.query(ModeloDocumento).filter(ModeloDocumento.company_id == company_id, ModeloDocumento.codigo == dados['codigo']).first():
        raise HTTPException(400, f"Código {dados['codigo']} já existe")
    variaveis = _extrair_variaveis_usadas(dados.get('conteudo_html',''))
    cj = dados.get('conteudo_json') or {}
    if 'clausulas' not in cj:
        cj['clausulas'] = _default_clausulas_para_tipo(str(dados['tipo']))
    modelo = ModeloDocumento(
        id=uuid.uuid4(), company_id=company_id, codigo=dados['codigo'], nome=dados['nome'],
        tipo=dados['tipo'], categoria=dados['categoria'], descricao=dados.get('descricao'),
        conteudo_html=dados['conteudo_html'], conteudo_json=cj,
        variaveis_usadas=cast(Any, variaveis), is_padrao=dados.get('is_padrao', False),
        tags=cast(Any, dados.get('tags', [])), criado_por_id=criado_por_id
    )
    if modelo.is_padrao:
        db.query(ModeloDocumento).filter(ModeloDocumento.company_id == company_id, ModeloDocumento.tipo == modelo.tipo, ModeloDocumento.is_padrao == True).update({"is_padrao": False})
    db.add(modelo); db.commit(); db.refresh(modelo); return modelo

def atualizar_modelo(db: Session, company_id: uuid.UUID, modelo_id: uuid.UUID, dados: Dict[str, Any], atualizado_por_id: Optional[uuid.UUID] = None):
    modelo = obter_modelo(db, company_id, modelo_id)
    if not modelo: raise HTTPException(404, "Modelo não encontrado")
    novas_vars: List[str] = []
    if 'conteudo_html' in dados and dados['conteudo_html']:
        novas_vars = _extrair_variaveis_usadas(dados['conteudo_html'])
        dados['versao'] = modelo.versao + 1
    if 'conteudo_json' in dados and dados['conteudo_json']:
        cj = dados['conteudo_json']
        claus = cj.get('clausulas') or []
        vars_claus: List[str] = []
        for c in claus:
            vars_claus.extend(_extrair_variaveis_usadas(str(c.get('titulo','')) + ' ' + str(c.get('texto',''))))
        novas_vars = list(set(novas_vars + vars_claus))
        if 'versao' not in dados:
            dados['versao'] = modelo.versao + 1
    if dados.get('is_padrao') == True:
        db.query(ModeloDocumento).filter(ModeloDocumento.company_id == company_id, ModeloDocumento.tipo == modelo.tipo, ModeloDocumento.id!= modelo_id, ModeloDocumento.is_padrao == True).update({"is_padrao": False})
    for k, v in dados.items():
        if v is not None and hasattr(modelo, k):
            setattr(modelo, k, v)
    if novas_vars:
        setattr(modelo, 'variaveis_usadas', cast(Any, novas_vars))
    modelo.atualizado_por_id = atualizado_por_id
    db.commit(); db.refresh(modelo); return modelo
