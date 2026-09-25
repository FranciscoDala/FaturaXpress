import uuid
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from app.modules.documentos.models import ModeloDocumento, TipoModeloDocumento, CategoriaModelo

CONTRATO_EFETIVO_HTML = """<!DOCTYPE html>
<html lang="pt-AO"><head><meta charset="UTF-8">
<style>
  @page{size:A4;margin:15mm 20mm 20mm 20mm;@bottom-center{content:"Pag. " counter(page) " de " counter(pages) " | {{codigo_documento}}";font-size:7pt;color:#666;}}
  body{font-family:Arial,sans-serif;font-size:10.5pt;line-height:1.65;color:#111;-webkit-print-color-adjust:exact;}
 .watermark{position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);width:650px;height:650px;opacity:0.08;z-index:-1;}
 .watermark img{width:100%;height:100%;object-fit:contain;}
 .header{display:flex;gap:12px;border-bottom:1px solid #000;padding-bottom:10px;align-items:center;}
 .header .logo{width:85px;height:85px;object-fit:contain;}
 .titulo-principal{text-align:center;margin-top:18px;margin-bottom:18px;font-size:12pt;font-weight:bold;text-transform:uppercase;text-decoration:underline;}
 .texto-justificado{text-align:justify;margin-bottom:12px;}
 .clausula-titulo{text-align:center;font-weight:bold;margin-top:26px;margin-bottom:10px;text-transform:uppercase;line-height:1.3;}
</style></head><body>
<div class="watermark">{{logo_base64_img}}</div>
<div class="header"><img class="logo" src="{{logo_base64}}" alt="logo"/><div><b>{{nome_empresa}}</b><br/>NIF: {{nif_empresa}}<br/>{{endereco_empresa}}<br/>{{telefone_empresa}} | {{email_empresa}}</div></div>

<div class="titulo-principal">Contrato de Trabalho por Tempo Indeterminado</div>

<p class="texto-justificado"><b>Entre:</b> {{nome_empresa}}, existente de acordo com as Leis de Angola, com sede social em {{endereco_empresa}}, com NIF {{nif_empresa}}, matriculada na Conservatória do Registo Comercial da 2ª Secção do Guichê Único da Empresa sob o número {{numero_registo_comercial}}, neste acto representada pelo Engº {{representante_empresa}}, na qualidade de Director Geral, adiante designada por <b>PRIMEIRA OUTORGANTE</b>.</p>

<p class="texto-justificado"><b>E:</b> <b>{{nome_funcionario}}</b>, portador do Bilhete de Identidade nº {{bi}}, emitido aos {{data_emissao_bi}} pela Identificação de {{local_emissao_bi}}, filho de {{nome_pai}} e de {{nome_mae}}, natural de {{naturalidade}}, residente em {{endereco_completo}}, adiante designado por <b>SEGUNDA OUTORGANTE</b>.</p>

<p class="texto-justificado">É celebrado o presente contrato de trabalho por tempo indeterminado, nos termos da Lei Geral do Trabalho, Lei nº 12/23 de 27 de Dezembro, que se regerá pelas cláusulas seguintes:</p>

<div>{{clausulas_html}}</div>

<div style="margin-top:60px;display:flex;justify-content:space-between;text-align:center;">
<div style="width:45%;border-top:1px solid #000;padding-top:6px;font-size:9pt;">Pela Entidade Empregadora<br/><br/><b>{{nome_empresa}}</b><br/>{{representante_empresa}}</div>
<div style="width:45%;border-top:1px solid #000;padding-top:6px;font-size:9pt;">O Trabalhador<br/><br/><b>{{nome_funcionario}}</b></div>
</div>
<p style="text-align:center;margin-top:25px;">{{cidade_emissao}}, {{data_hoje_extenso}}</p>
</body></html>
"""

# TITULOS JA VAO SAIR NEGRITADOS E CENTRALIZADOS PELO service.py
CONTRATO_EFETIVO_CLAUSULAS = [
  {"id":"1","titulo":"Primeira Cláusula\n(objecto do contrato)","texto":"A Primeira Outorgante admite ao seu serviço a Segunda Outorgante para exercer as funções de {{cargo}}, na área de {{area}}, com início em {{data_admissao}}, no local de trabalho sito em {{local_trabalho}}, província do Zaire."},
  {"id":"2","titulo":"Segunda Cláusula\n(vínculo contratual)","texto":"O presente contrato é celebrado por tempo indeterminado, nos termos da Lei Geral do Trabalho. O local de trabalho habitual será em {{local_trabalho}}."},
  {"id":"3","titulo":"Terceira Cláusula\n(horário de trabalho)","texto":"O período normal de trabalho é de {{horario_entrada}} às {{horario_saida}}, perfazendo um total de {{carga_horaria}} semanais, com intervalo para almoço de 1 hora. O trabalhador obriga-se a prestar trabalho extraordinário sempre que necessário, nos termos da Lei."},
  {"id":"4","titulo":"Quarta Cláusula\n(remuneração)","texto":"Como contrapartida do trabalho prestado, o trabalhador auferirá uma remuneração mensal ilíquida de {{salario_base_formatado}} ({{salario_extenso}}). Sobre a remuneração incidem os descontos legais de Segurança Social (INSS) e IRT. Tem direito a subsídio de Natal (13º mês), subsídio de férias de 100% do salário base e subsídio de alimentação quando aplicável, a ser paga por transferência para o IBAN {{iban}}."},
  {"id":"5","titulo":"Quinta Cláusula\n(início e duração)","texto":"O presente contrato entra em vigor em {{data_admissao}} e vigorará por tempo indeterminado, com período experimental de {{periodo_experiencia}}, nos termos da LGT."},
  {"id":"6","titulo":"Sexta Cláusula\n(deveres e obrigações)","texto":"O trabalhador obriga-se a cumprir com zelo e assiduidade as funções confiadas, respeitar o regulamento interno, as normas de higiene e segurança e o dever de confidencialidade."},
]

DECLARACAO_HTML = """<!DOCTYPE html><html><head><meta charset="UTF-8"><style>@page{size:A4;margin:18mm;}body{font-family:Arial;font-size:11pt;}</style></head><body><h3 style="text-align:center">DECLARAÇÃO - {{codigo_documento}}</h3><p style="text-align:justify">Declara-se que <b>{{nome_funcionario}}</b>, BI {{bi}}, é funcionária desta empresa como {{cargo}} desde {{data_admissao}}, com vencimento {{salario_base_formatado}}.</p><p style="text-align:center;margin-top:30px;">{{cidade_emissao}}, {{data_hoje_extenso}}</p></body></html>"""

def seed_modelos(db: Session, company_id: uuid.UUID):
    modelos_def = [
        {"codigo":"CONT-EFETIVO-001","nome":"Contrato Efetivo CSTQ A4","tipo":TipoModeloDocumento.contrato_efetivo,"categoria":CategoriaModelo.admissao,"descricao":"Contrato tempo indeterminado CSTQ - Entre/E + clausulas centralizadas","conteudo_html":CONTRATO_EFETIVO_HTML,"conteudo_json":{"clausulas":CONTRATO_EFETIVO_CLAUSULAS},"is_padrao":True,"is_sistema":False},
        {"codigo":"DECL-TRAB-001","nome":"Declaração de Trabalho","tipo":TipoModeloDocumento.declaracao_trabalho,"categoria":CategoriaModelo.gestao,"descricao":"Declaração A4","conteudo_html":DECLARACAO_HTML,"conteudo_json":{"clausulas":[{"id":"1","titulo":"Declaração","texto":"{{nome_funcionario}} BI {{bi}} trabalha como {{cargo}}"}]},"is_padrao":True,"is_sistema":False},
    ]
    for m in modelos_def:
        existente = db.query(ModeloDocumento).filter(ModeloDocumento.company_id==company_id, ModeloDocumento.codigo==m["codigo"]).first()
        if existente:
            existente.conteudo_html=m["conteudo_html"]
            existente.conteudo_json=m["conteudo_json"]
            existente.is_padrao=True
            existente.is_ativo=True
            existente.updated_at=datetime.now(timezone.utc)
            db.commit()
            continue
        db.query(ModeloDocumento).filter(ModeloDocumento.company_id==company_id, ModeloDocumento.tipo==m["tipo"], ModeloDocumento.is_padrao==True).update({"is_padrao":False})
        doc=ModeloDocumento(
            id=uuid.uuid4(), company_id=company_id, codigo=m["codigo"], nome=m["nome"], tipo=m["tipo"], categoria=m["categoria"],
            descricao=m["descricao"], conteudo_html=m["conteudo_html"], conteudo_json=m["conteudo_json"],
            variaveis_usadas=["nome_funcionario","bi","cargo","salario_base_formatado","data_emissao_bi","local_emissao_bi","nome_pai","nome_mae","iban"], versao=1, is_ativo=True, is_padrao=m["is_padrao"], is_sistema=False,
            created_at=datetime.now(timezone.utc), updated_at=datetime.now(timezone.utc)
        )
        db.add(doc); db.commit()
