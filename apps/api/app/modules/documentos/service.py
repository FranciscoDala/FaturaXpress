import uuid, re, unicodedata, base64, os
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
    return re.sub(r'[^a-zA-Z0-9]+', '-', sem_acento).strip('-').lower()[:60] or "doc"

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
                b64 = base64.b64encode(r.content).decode()
                return f"data:{r.headers.get('content-type','image/png')};base64,{b64}"
        if os.path.exists(raw):
            with open(raw, "rb") as f:
                b64 = base64.b64encode(f.read()).decode()
                return f"data:image/png;base64,{b64}"
    except: return ""
    return ""

def montar_mapa_variaveis(funcionario: Funcionario, company: Any, extras: Optional[Dict[str, Any]] = None) -> Dict[str, str]:
    if extras is None: extras = {}
    hoje = date.today()
    return {
        "nome_funcionario": funcionario.nome,
        "bi": funcionario.numero_bi or "",
        "cargo": funcionario.cargo or "",
        "data_admissao": funcionario.data_admissao.strftime("%d/%m/%Y") if funcionario.data_admissao else hoje.strftime("%d/%m/%Y"),
        "salario_base_formatado": str(extras.get("salario_base_formatado", "0 Kz")),
        "local_trabalho": str(extras.get("local_trabalho", "Luanda")),
        "nome_empresa": _get_empresa_val(company, ["nome_fantasia","razao_social","companyName","nome"], "Empresa"),
        "nif_empresa": _get_empresa_val(company, ["nif"], ""),
        "data_hoje": hoje.strftime("%d/%m/%Y"),
        "cidade_emissao": str(extras.get("cidade_emissao","Luanda")),
        "logo_base64": str(extras.get("logo_base64") or _empresa_to_base64(company)),
        "codigo_documento": str(extras.get("codigo_documento","")),
    }

def renderizar_html(template_html: str, variaveis: Dict[str, Any]) -> str:
    return VAR_REGEX.sub(lambda m: str(variaveis.get(m.group(1).strip(),"")), template_html)

def _extrair_variaveis_usadas(html: str) -> List[str]:
    return list(set(VAR_REGEX.findall(html or "")))

CATEGORIA_POR_TIPO = {
    "contrato_efetivo":"admissao","contrato_estagio":"admissao","contrato_temporario":"admissao","contrato_experiencia":"admissao","contrato_confidencialidade":"admissao",
    "aditivo_contratual":"gestao","declaracao_trabalho":"gestao","declaracao_vencimento":"gestao","carta_recomendacao":"gestao","carta_apresentacao":"gestao",
    "aviso_ferias":"ferias_ponto","comunicacao_ferias":"ferias_ponto","mapa_ferias":"ferias_ponto","justificacao_falta":"ferias_ponto","comunicacao_falta":"ferias_ponto","horario_trabalho":"ferias_ponto",
    "advertencia_verbal":"disciplinar","advertencia_escrita":"disciplinar","processo_disciplinar":"disciplinar","suspensao":"disciplinar",
    "aumento_salarial":"financeiro_carreira","alteracao_cargo":"financeiro_carreira","alteracao_salario":"financeiro_carreira","comunicacao_bonus":"financeiro_carreira",
    "carta_demissao_funcionario":"saida","carta_demissao_empresa":"saida","declaracao_desvinculacao":"saida","certificado_trabalho":"saida","acordo_rescisao":"saida","outro":"outros"
}
NOME_BONITO = {
    "contrato_efetivo":"Contrato Efetivo","contrato_estagio":"Contrato Estágio","contrato_temporario":"Contrato Temporário","contrato_experiencia":"Contrato Experiência","contrato_confidencialidade":"Contrato Confidencialidade",
    "aditivo_contratual":"Aditivo Contratual","declaracao_trabalho":"Declaração de Trabalho","declaracao_vencimento":"Declaração de Vencimento","carta_recomendacao":"Carta de Recomendação","carta_apresentacao":"Carta de Apresentação",
    "aviso_ferias":"Aviso de Férias","comunicacao_ferias":"Comunicação de Férias","mapa_ferias":"Mapa de Férias","justificacao_falta":"Justificação de Falta","comunicacao_falta":"Comunicação de Falta","horario_trabalho":"Horário de Trabalho",
    "advertencia_verbal":"Advertência Verbal","advertencia_escrita":"Advertência Escrita","processo_disciplinar":"Processo Disciplinar","suspensao":"Suspensão",
    "aumento_salarial":"Aumento Salarial","alteracao_cargo":"Alteração de Cargo","alteracao_salario":"Alteração de Salário","comunicacao_bonus":"Comunicação de Bónus",
    "carta_demissao_funcionario":"Carta Demissão Funcionário","carta_demissao_empresa":"Carta Demissão Empresa","declaracao_desvinculacao":"Declaração Desvinculação","certificado_trabalho":"Certificado de Trabalho","acordo_rescisao":"Acordo Rescisão","outro":"Outro"
}

def _default_clausulas_para_tipo(tipo: str):
    if tipo.startswith("contrato_"):
        return [
            {"id":"1","titulo":"Cláusula 1ª - Objecto","texto":"O trabalhador {{nome_funcionario}} é admitido para {{cargo}} com início em {{data_admissao}}."},
            {"id":"2","titulo":"Cláusula 2ª - Local","texto":"Local {{local_trabalho}}."},
            {"id":"3","titulo":"Cláusula 3ª - Remuneração","texto":"{{salario_base_formatado}}."},
        ]
    return [{"id":"1","titulo":NOME_BONITO.get(tipo,tipo),"texto":f"Documento {NOME_BONITO.get(tipo,tipo)} de {{{{nome_funcionario}}}} em {{{{data_hoje}}}}."}]

def _get_clausulas_do_modelo(modelo: ModeloDocumento):
    cj = modelo.conteudo_json or {}
    claus = cj.get("clausulas")
    if claus and isinstance(claus, list) and len(claus)>0: return claus
    tipo_val = modelo.tipo.value if hasattr(modelo.tipo,'value') else str(modelo.tipo)
    return _default_clausulas_para_tipo(tipo_val)

# >>> CORE DA TUA PERGUNTA - 1 DOC POR TIPO <<<
def obter_ou_criar_por_tipo(db: Session, company_id: uuid.UUID, tipo_str: str) -> ModeloDocumento:
    try:
        tipo_enum = TipoModeloDocumento(tipo_str)
    except ValueError:
        raise HTTPException(400, f"Tipo {tipo_str} inválido")

    # 1. já existe da empresa? retorna mesmo
    existente = db.query(ModeloDocumento).filter(
        ModeloDocumento.company_id == company_id,
        ModeloDocumento.tipo == tipo_enum,
        ModeloDocumento.is_ativo == True,
        ModeloDocumento.is_sistema == False
    ).first()
    if existente:
        return existente

    # 2. não existe - cria 1 vez só a partir do default
    categoria_str = CATEGORIA_POR_TIPO.get(tipo_str, "outros")
    novo = ModeloDocumento(
        id=uuid.uuid4(),
        company_id=company_id,
        codigo=f"{tipo_str.upper()[:20]}-001",
        nome=NOME_BONITO.get(tipo_str, tipo_str),
        tipo=tipo_enum,
        categoria=CategoriaModelo(categoria_str),
        descricao=f"Modelo padrão {NOME_BONITO.get(tipo_str)}",
        conteudo_html="<div>{{clausulas_html}}</div>",
        conteudo_json={"clausulas": _default_clausulas_para_tipo(tipo_str)},
        variaveis_usadas=cast(Any, ["nome_funcionario","cargo","data_hoje"]),
        versao=1,
        is_ativo=True,
        is_padrao=True,
        is_sistema=False
    )
    db.add(novo)
    try:
        db.commit()
    except Exception:
        db.rollback()
        # race condition - outra requisição criou ao mesmo tempo
        return db.query(ModeloDocumento).filter(ModeloDocumento.company_id==company_id, ModeloDocumento.tipo==tipo_enum, ModeloDocumento.is_ativo==True).first()
    db.refresh(novo)
    return novo

def listar_todos_modelos(db: Session, company_id: uuid.UUID):
    return db.query(ModeloDocumento).filter(ModeloDocumento.company_id==company_id, ModeloDocumento.is_ativo==True, ModeloDocumento.is_sistema==False).order_by(ModeloDocumento.nome).all()

def obter_modelo(db: Session, company_id: uuid.UUID, modelo_id: uuid.UUID):
    return db.query(ModeloDocumento).filter(ModeloDocumento.id==modelo_id, ModeloDocumento.company_id==company_id).first()

def criar_modelo(db: Session, company_id: uuid.UUID, dados: Dict[str, Any], criado_por_id: Optional[uuid.UUID]=None):
    # evita duplicar se já existe do mesmo tipo
    if 'tipo' in dados:
        try:
            tipo_enum = TipoModeloDocumento(dados['tipo'])
            ja = db.query(ModeloDocumento).filter(ModeloDocumento.company_id==company_id, ModeloDocumento.tipo==tipo_enum, ModeloDocumento.is_ativo==True).first()
            if ja: raise HTTPException(400, f"Já existe modelo {dados['tipo']} para esta empresa, use PUT para editar")
        except ValueError: pass
    variaveis = _extrair_variaveis_usadas(dados.get('conteudo_html',''))
    cj = dados.get('conteudo_json') or {"clausulas": _default_clausulas_para_tipo(str(dados['tipo']))}
    modelo = ModeloDocumento(id=uuid.uuid4(), company_id=company_id, codigo=dados['codigo'], nome=dados['nome'], tipo=dados['tipo'], categoria=dados['categoria'], conteudo_html=dados['conteudo_html'], conteudo_json=cj, variaveis_usadas=cast(Any, variaveis), is_padrao=dados.get('is_padrao',False), tags=cast(Any, dados.get('tags',[])), criado_por_id=criado_por_id)
    db.add(modelo); db.commit(); db.refresh(modelo); return modelo

def atualizar_modelo(db: Session, company_id: uuid.UUID, modelo_id: uuid.UUID, dados: Dict[str, Any], atualizado_por_id: Optional[uuid.UUID]=None):
    modelo = obter_modelo(db, company_id, modelo_id)
    if not modelo: raise HTTPException(404, "Modelo não encontrado")
    # só atualiza mesmo registro, incrementa versão
    if 'conteudo_json' in dados or 'conteudo_html' in dados:
        dados['versao'] = modelo.versao + 1
    for k,v in dados.items():
        if v is not None and hasattr(modelo,k):
            setattr(modelo,k,v)
    modelo.atualizado_por_id = atualizado_por_id
    db.commit(); db.refresh(modelo); return modelo

def _gerar_pdf_reportlab(doc, empresa):
    # mantém tua função anterior - omitida aqui para não duplicar
    import io
    from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer
    from reportlab.lib.pagesizes import A4
    from reportlab.lib.styles import getSampleStyleSheet
    buffer = io.BytesIO()
    pdf = SimpleDocTemplate(buffer, pagesize=A4)
    styles = getSampleStyleSheet()
    story = [Paragraph(doc.conteudo_html_final[:2000], styles['Normal'])]
    pdf.build(story)
    buffer.seek(0)
    return buffer.getvalue()

def gerar_documento(db: Session, company_id: uuid.UUID, funcionario_id: uuid.UUID, modelo_id: uuid.UUID, extras: Optional[Dict[str, Any]]=None, gerado_por_id: Optional[uuid.UUID]=None):
    modelo = db.query(ModeloDocumento).filter(ModeloDocumento.id==modelo_id, ModeloDocumento.company_id==company_id, ModeloDocumento.is_ativo==True).first()
    if not modelo: raise HTTPException(404, "Modelo não encontrado")
    funcionario = db.query(Funcionario).filter(Funcionario.id==funcionario_id, Funcionario.company_id==company_id).first()
    if not funcionario: raise HTTPException(404, "Funcionário não encontrado")
    from app.modules.auth.models import Company
    company = db.query(Company).filter(Company.id==company_id).first()
    codigo = "DOC-" + str(datetime.now().year) + "-" + uuid.uuid4().hex[:6].upper()
    if extras is None: extras = {}
    extras["codigo_documento"]=codigo
    variaveis = montar_mapa_variaveis(funcionario, company, extras)
    clausulas_raw = _get_clausulas_do_modelo(modelo)
    clausulas_html = "".join([f"<p><b>{renderizar_html(c.get('titulo',''),variaveis)}:</b> {renderizar_html(c.get('texto',''),variaveis)}</p>" for c in clausulas_raw])
    variaveis["clausulas_html"]=clausulas_html
    html_final = renderizar_html(modelo.conteudo_html, variaveis)
    doc = DocumentoGerado(id=uuid.uuid4(), company_id=company_id, funcionario_id=funcionario_id, modelo_id=modelo.id, modelo_versao=modelo.versao, tipo=modelo.tipo, nome_arquivo=f"{modelo.codigo}-{_slugify(funcionario.nome)}.pdf", codigo_verificacao=codigo, conteudo_html_final=html_final, dados_snapshot={"clausulas_raw": clausulas_raw}, variaveis_preenchidas=cast(Any, variaveis), status="gerado")
    db.add(doc); db.commit(); db.refresh(doc); return doc
