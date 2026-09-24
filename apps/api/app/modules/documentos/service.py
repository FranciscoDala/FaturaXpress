import uuid
import re
import unicodedata
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
    if not d:
        return ""
    try:
        return d.strftime("%d/%m/%Y")
    except:
        return str(d)

def _get_empresa_val(company: Any, keys: list, default: str = "") -> str:
    if not company:
        return default
    for k in keys:
        if hasattr(company, k):
            v = getattr(company, k)
            if v:
                return str(v)
    return default

def montar_mapa_variaveis(funcionario: Funcionario, company: Any, extras: Optional[Dict[str, Any]] = None) -> Dict[str, str]:
    if extras is None:
        extras = {}
    hoje = date.today()
    mapa = {
        "nome_funcionario": funcionario.nome,
        "primeiro_nome": funcionario.nome.split()[0] if funcionario.nome else "",
        "bi": funcionario.numero_bi,
        "nif_funcionario": funcionario.nif or "",
        "data_nascimento": funcionario.data_nascimento.strftime("%d/%m/%Y") if funcionario.data_nascimento else "",
        "data_nascimento_extenso": _extenso_data(funcionario.data_nascimento),
        "nacionalidade": funcionario.nacionalidade or "Angolana",
        "estado_civil": funcionario.estado_civil or "",
        "genero": funcionario.genero or "",
        "telefone": funcionario.telefone or "",
        "email": funcionario.email or "",
        "endereco_completo": funcionario.endereco or "",
        "cidade": funcionario.cidade or "",
        "provincia": funcionario.provincia or "",
        "nome_pai": funcionario.nome_pai,
        "nome_mae": funcionario.nome_mae,
        "iban": funcionario.iban or "",
        "banco1": funcionario.banco1 or "",
        "cargo": funcionario.cargo,
        "area": str(funcionario.area_principal_id) if funcionario.area_principal_id else "",
        "tipo_contrato": extras.get("tipo_contrato", "Efetivo"),
        "data_admissao": funcionario.data_admissao.strftime("%d/%m/%Y") if funcionario.data_admissao else hoje.strftime("%d/%m/%Y"),
        "data_admissao_extenso": _extenso_data(funcionario.data_admissao) if funcionario.data_admissao else _extenso_data(hoje),
        "data_inicio_contrato": extras.get("data_inicio_contrato", hoje.strftime("%d/%m/%Y")),
        "data_fim_contrato": extras.get("data_fim_contrato", ""),
        "duracao_contrato": extras.get("duracao_contrato", "Indeterminado"),
        "periodo_experiencia": extras.get("periodo_experiencia", "60 dias"),
        "horario_entrada": extras.get("horario_entrada", "08:00"),
        "horario_saida": extras.get("horario_saida", "17:00"),
        "carga_horaria": extras.get("carga_horaria", "40h semanais"),
        "local_trabalho": extras.get("local_trabalho", "Luanda"),
        "salario_base": str(extras.get("salario_base", "0")),
        "salario_base_formatado": extras.get("salario_base_formatado", str(extras.get("salario_base", "0")) + " Kz"),
        "salario_extenso": extras.get("salario_extenso", str(extras.get("salario_base", ""))),
        "subsidio_alimentacao": extras.get("subsidio_alimentacao", ""),
        "subsidio_transporte": extras.get("subsidio_transporte", ""),
        "total_vencimento": extras.get("total_vencimento", extras.get("salario_base", "")),
        "nome_empresa": _get_empresa_val(company, ["nome_fantasia", "razao_social", "nome"], "Empresa"),
        "nif_empresa": _get_empresa_val(company, ["nif", "nif_empresa"], ""),
        "endereco_empresa": _get_empresa_val(company, ["endereco", "endereco_empresa"], ""),
        "telefone_empresa": _get_empresa_val(company, ["telefone", "telefone_empresa"], ""),
        "email_empresa": _get_empresa_val(company, ["email", "email_empresa"], ""),
        "representante_empresa": extras.get("representante_empresa", ""),
        "cargo_representante": extras.get("cargo_representante", "Director Geral"),
        "data_hoje": hoje.strftime("%d/%m/%Y"),
        "data_hoje_extenso": _extenso_data(hoje),
        "ano_atual": str(hoje.year),
        "mes_atual": hoje.strftime("%B"),
        "cidade_emissao": extras.get("cidade_emissao", "Luanda"),
        "codigo_documento": extras.get("codigo_documento", ""),
        "data_inicio_ferias": extras.get("data_inicio_ferias", ""),
        "data_fim_ferias": extras.get("data_fim_ferias", ""),
        "dias_ferias": extras.get("dias_ferias", ""),
        "data_falta": extras.get("data_falta", ""),
        "motivo_advertencia": extras.get("motivo_advertencia", ""),
        "data_advertencia": extras.get("data_advertencia", ""),
        "novo_cargo": extras.get("novo_cargo", ""),
        "novo_salario": extras.get("novo_salario", ""),
        "data_demissao": extras.get("data_demissao", ""),
        "motivo_demissao": extras.get("motivo_demissao", ""),
    }
    mapa.update(extras)
    return mapa

def renderizar_html(template_html: str, variaveis: Dict[str, str]) -> str:
    def replacer(match):
        key = match.group(1).strip()
        return str(variaveis.get(key, ""))
    return VAR_REGEX.sub(replacer, template_html)

def _extrair_variaveis_usadas(html: str) -> List[str]:
    return list(set(VAR_REGEX.findall(html)))

def gerar_documento(db: Session, company_id: uuid.UUID, funcionario_id: uuid.UUID, modelo_id: uuid.UUID, extras: Optional[Dict[str, Any]] = None, gerado_por_id: Optional[uuid.UUID] = None):
    modelo = db.query(ModeloDocumento).filter(ModeloDocumento.id == modelo_id, ModeloDocumento.company_id == company_id, ModeloDocumento.is_ativo == True).first()
    if not modelo:
        raise HTTPException(status_code=404, detail="Modelo não encontrado ou inativo")
    funcionario = db.query(Funcionario).filter(Funcionario.id == funcionario_id, Funcionario.company_id == company_id).first()
    if not funcionario:
        raise HTTPException(status_code=404, detail="Funcionário não encontrado")

    from app.modules.auth.models import Company
    company = db.query(Company).filter(Company.id == company_id).first()

    codigo = "DOC-" + str(datetime.now().year) + "-" + uuid.uuid4().hex[:6].upper()
    if extras is None:
        extras = {}
    extras["codigo_documento"] = codigo

    variaveis = montar_mapa_variaveis(funcionario, company, extras)
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
        dados_snapshot={"funcionario": {"id": str(funcionario.id), "nome": funcionario.nome, "bi": funcionario.numero_bi}, "extras": extras},
        variaveis_preenchidas=variaveis,
        gerado_por_id=gerado_por_id,
        status="gerado"
    )
    db.add(doc)
    db.commit()
    db.refresh(doc)
    return doc

def gerar_contrato_automatico_ao_criar(db: Session, company_id: uuid.UUID, funcionario: Funcionario, extras_contrato: Optional[Dict[str, Any]] = None):
    """Chamado dentro do criar_funcionario. Se não achar padrão, não faz nada."""
    modelo_padrao = db.query(ModeloDocumento).filter(
        ModeloDocumento.company_id == company_id,
        ModeloDocumento.is_padrao == True,
        ModeloDocumento.is_ativo == True,
        ModeloDocumento.tipo == TipoModeloDocumento.contrato_efetivo.value
    ).first()
    # fallback: qualquer contrato padrão
    if not modelo_padrao:
        modelo_padrao = db.query(ModeloDocumento).filter(
            ModeloDocumento.company_id == company_id,
            ModeloDocumento.is_padrao == True,
            ModeloDocumento.is_ativo == True,
            ModeloDocumento.tipo.in_([TipoModeloDocumento.contrato_efetivo.value, TipoModeloDocumento.contrato_experiencia.value, TipoModeloDocumento.contrato_temporario.value])
        ).first()
    if not modelo_padrao:
        return None
    return gerar_documento(db, company_id, funcionario.id, modelo_padrao.id, extras=extras_contrato, gerado_por_id=None)

# CRUD MODELOS
def listar_modelos(db: Session, company_id: uuid.UUID):
    return db.query(ModeloDocumento).filter(ModeloDocumento.company_id == company_id).order_by(ModeloDocumento.is_padrao.desc(), ModeloDocumento.nome).all()

def obter_modelo(db: Session, company_id: uuid.UUID, modelo_id: uuid.UUID):
    return db.query(ModeloDocumento).filter(ModeloDocumento.id == modelo_id, ModeloDocumento.company_id == company_id).first()

def criar_modelo(db: Session, company_id: uuid.UUID, dados: Dict[str, Any], criado_por_id: Optional[uuid.UUID] = None):
    if db.query(ModeloDocumento).filter(ModeloDocumento.company_id == company_id, ModeloDocumento.codigo == dados['codigo']).first():
        raise HTTPException(400, f"Código {dados['codigo']} já existe")
    variaveis = _extrair_variaveis_usadas(dados['conteudo_html'])
    modelo = ModeloDocumento(
        id=uuid.uuid4(),
        company_id=company_id,
        codigo=dados['codigo'],
        nome=dados['nome'],
        tipo=dados['tipo'],
        categoria=dados['categoria'],
        descricao=dados.get('descricao'),
        conteudo_html=dados['conteudo_html'],
        conteudo_json=dados.get('conteudo_json'),
        variaveis_usadas=variaveis,
        is_padrao=dados.get('is_padrao', False),
        header_config=dados.get('header_config'),
        footer_config=dados.get('footer_config'),
        tags=dados.get('tags', []),
        criado_por_id=criado_por_id
    )
    if modelo.is_padrao:
        db.query(ModeloDocumento).filter(ModeloDocumento.company_id == company_id, ModeloDocumento.tipo == modelo.tipo, ModeloDocumento.is_padrao == True).update({"is_padrao": False})
    db.add(modelo)
    db.commit()
    db.refresh(modelo)
    return modelo

def atualizar_modelo(db: Session, company_id: uuid.UUID, modelo_id: uuid.UUID, dados: Dict[str, Any], atualizado_por_id: Optional[uuid.UUID] = None):
    modelo = obter_modelo(db, company_id, modelo_id)
    if not modelo:
        raise HTTPException(404, "Modelo não encontrado")
    if 'conteudo_html' in dados and dados['conteudo_html']:
        dados['variaveis_usadas'] = _extrair_variaveis_usadas(dados['conteudo_html'])
        dados['versao'] = modelo.versao + 1
    if dados.get('is_padrao') == True:
        db.query(ModeloDocumento).filter(ModeloDocumento.company_id == company_id, ModeloDocumento.tipo == modelo.tipo, ModeloDocumento.id!= modelo_id, ModeloDocumento.is_padrao == True).update({"is_padrao": False})
    for k, v in dados.items():
        if v is not None and hasattr(modelo, k):
            setattr(modelo, k, v)
    modelo.atualizado_por_id = atualizado_por_id
    db.commit()
    db.refresh(modelo)
    return modelo
