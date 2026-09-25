import uuid
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from app.modules.documentos.models import ModeloDocumento, TipoModeloDocumento, CategoriaModelo

CONTRATO_EFETIVO_HTML = """<!DOCTYPE html>
<html lang="pt-AO"><head><meta charset="UTF-8">
<style>
  @page{size:A4;margin:15mm 20mm 20mm 20mm;@bottom-center{content:"Pag. " counter(page) " de " counter(pages) " | {{codigo_documento}}";font-size:7pt;color:#666;}}
  body{font-family:Arial,sans-serif;font-size:10.5pt;line-height:1.6;color:#111;}
 .watermark{position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);width:650px;height:650px;opacity:0.08;z-index:-1;}
 .watermark img{width:100%;height:100%;object-fit:contain;}
 .header{display:flex;gap:12px;border-bottom:1px solid #000;padding-bottom:10px;}
 .header .logo{width:90px;height:90px;object-fit:contain;}
 .titulo-principal{text-align:center;margin-top:18px;margin-bottom:18px;font-size:12pt;font-weight:bold;text-transform:uppercase;text-decoration:underline;}
 .texto-justificado{text-align:justify;margin-bottom:12px;}
 .clausula-titulo{text-align:center;font-weight:bold;margin-top:22px;margin-bottom:10px;text-transform:uppercase;}
</style></head><body>
<div class="watermark">{{logo_base64_img}}</div>
<div class="header"><img class="logo" src="{{logo_base64}}" alt="logo"/><div><b>{{nome_empresa}}</b><br/>NIF: {{nif_empresa}}<br/>{{endereco_empresa}}<br/>{{telefone_empresa}}</div></div>
<div class="titulo-principal">Contrato de Trabalho por Tempo Indeterminado</div>
<p style="text-align:justify"><b>Entre:</b> {{nome_empresa}}, NIF {{nif_empresa}}, sede {{endereco_empresa}}, representada por {{representante_empresa}}, adiante <b>Primeira Outorgante</b>.</p>
<p style="text-align:justify"><b>E:</b> {{nome_funcionario}}, BI {{bi}}, emitido aos {{data_emissao_bi}} em {{local_emissao_bi}}, filho de {{nome_pai}} e {{nome_mae}}, residente {{endereco_completo}}, adiante <b>Segunda Outorgante</b>.</p>
<p style="text-align:justify">É celebrado nos termos da Lei Geral do Trabalho, Lei nº 12/23 de 27 de Dezembro:</p>
<div>{{clausulas_html}}</div>
<div style="margin-top:60px;display:flex;justify-content:space-between;text-align:center;"><div style="width:45%;border-top:1px solid #000;padding-top:5px;">{{nome_empresa}}<br/>{{representante_empresa}}</div><div style="width:45%;border-top:1px solid #000;padding-top:5px;">{{nome_funcionario}}</div></div>
<p style="text-align:center;margin-top:20px;">{{cidade_emissao}}, {{data_hoje_extenso}}</p>
</body></html>
"""

CONTRATO_EFETIVO_CLAUSULAS = [
  {"id":"1","titulo":"Primeira Clausula\n(objecto do contrato)","texto":"A entidade empregadora admite ao seu servico {{nome_funcionario}} para exercer funcoes de {{cargo}}, area {{area}}, inicio {{data_admissao}}, local {{local_trabalho}}."},
  {"id":"2","titulo":"Segunda Clausula\n(vinculo contratual)","texto":"Contrato por tempo {{duracao_contrato}} nos termos da LGT."},
  {"id":"3","titulo":"Terceira Clausula\n(horario de trabalho)","texto":"Periodo normal de {{horario_entrada}} as {{horario_saida}}, total {{carga_horaria}} semanais, intervalo 1h almoco. Obriga-se a trabalho extraordinario quando necessario."},
  {"id":"4","titulo":"Quarta Clausula\n(remuneracao)","texto":"Remuneracao mensal iliquida de {{salario_base_formatado}} ({{salario_extenso}}). Descontos INSS e IRT. Direito a subsidio Natal, ferias 100% e alimentacao."},
  {"id":"5","titulo":"Quinta Clausula\n(inicio e duracao de vigencia)","texto":"Entra em vigor em {{data_admissao}}, por tempo indeterminado, periodo experimental {{periodo_experiencia}}."},
  {"id":"6","titulo":"Sexta Clausula\n(deveres)","texto":"Cumprir com zelo as funcoes, regulamento interno e seguranca no trabalho."},
]

DECLARACAO_HTML = """<!DOCTYPE html><html><head><meta charset="UTF-8"><style>@page{size:A4;margin:18mm;}body{font-family:Arial;font-size:11pt;}</style></head><body><h3 style="text-align:center">DECLARACAO - {{codigo_documento}}</h3><p>Declaramos que {{nome_funcionario}}, BI {{bi}}, trabalha como {{cargo}} desde {{data_admissao}}, vencimento {{salario_base_formatado}}.</p><p style="text-align:center">{{cidade_emissao}}, {{data_hoje_extenso}}</p></body></html>"""

def seed_modelos(db: Session, company_id: uuid.UUID):
    modelos_def = [
        {"codigo":"CONT-EFETIVO-001","nome":"Contrato Efetivo CSTQ A4","tipo":TipoModeloDocumento.contrato_efetivo,"categoria":CategoriaModelo.admissao,"descricao":"Contrato tempo indeterminado CSTQ","conteudo_html":CONTRATO_EFETIVO_HTML,"conteudo_json":{"clausulas":CONTRATO_EFETIVO_CLAUSULAS},"is_padrao":True,"is_sistema":False},
        {"codigo":"DECL-TRAB-001","nome":"Declaracao de Trabalho","tipo":TipoModeloDocumento.declaracao_trabalho,"categoria":CategoriaModelo.gestao,"descricao":"Declaracao A4","conteudo_html":DECLARACAO_HTML,"conteudo_json":{"clausulas":[{"id":"1","titulo":"Declaracao","texto":"{{nome_funcionario}} BI {{bi}} trabalha como {{cargo}}"}]},"is_padrao":True,"is_sistema":False},
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
        # desativa padrao antigo mesmo tipo
        db.query(ModeloDocumento).filter(ModeloDocumento.company_id==company_id, ModeloDocumento.tipo==m["tipo"], ModeloDocumento.is_padrao==True).update({"is_padrao":False})
        doc=ModeloDocumento(
            id=uuid.uuid4(), company_id=company_id, codigo=m["codigo"], nome=m["nome"], tipo=m["tipo"], categoria=m["categoria"],
            descricao=m["descricao"], conteudo_html=m["conteudo_html"], conteudo_json=m["conteudo_json"],
            variaveis_usadas=["nome_funcionario","bi","cargo","salario_base_formatado"], versao=1, is_ativo=True, is_padrao=m["is_padrao"], is_sistema=False,
            created_at=datetime.now(timezone.utc), updated_at=datetime.now(timezone.utc)
        )
        db.add(doc); db.commit()
