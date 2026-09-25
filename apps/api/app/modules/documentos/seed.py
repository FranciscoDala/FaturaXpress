import uuid
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from app.modules.documentos.models import ModeloDocumento, TipoModeloDocumento, CategoriaModelo

CONTRATO_EFETIVO_HTML = """<!DOCTYPE html>
<html lang="pt-AO">
<head><meta charset="UTF-8">
<style>
  @page{size:A4;margin:12mm 18mm 18mm 18mm;@bottom-center{content:"Pág. " counter(page) " de " counter(pages) " | Código: {{codigo_documento}}";font-size:7.5pt;color:#666;}}
  body{margin:0;padding:0;font-family:Arial,sans-serif;font-size:10.5pt;line-height:1.55;color:#111;-webkit-print-color-adjust:exact;}
 .watermark{position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);width:650px;height:650px;opacity:0.10;z-index:-1;}
 .watermark img{width:100%;height:100%;object-fit:contain;}
 .header{display:flex;gap:12px;border-bottom:1px dotted #bbb;padding-bottom:10px;}
 .header.logo{width:110px;height:90px;object-fit:contain;}
 .emp-info{font-size:8.5pt;line-height:13px;}.emp-info.nome{font-weight:bold;font-size:11pt;}
 .titulo-box{margin-top:14px;display:flex;justify-content:space-between;border:1px solid #bbb;padding:8px 10px;background:rgba(194,194,194,0.25);}
 .grid-info{display:flex;gap:5px;margin-top:12px;}
 .grid-info.box{border:1px solid #bbb;padding:5px 6px;flex:1;background:rgba(255,255,255,0.4);text-align:center;}
 .grid-info.k{font-weight:bold;font-size:7.5pt;text-transform:uppercase;}.grid-info.v{font-size:9pt;margin-top:2px;}
 .clausulas{margin-top:18px;}.clausulas p{text-align:justify;margin:0 0 10px 0;}
</style>
</head>
<body>
<div class="watermark">{{logo_base64_img}}</div>
<div class="header">
  <img class="logo" src="{{logo_base64}}" alt="logo"/>
  <div class="emp-info"><div class="nome">{{nome_empresa}}</div><div>NIF: {{nif_empresa}}</div><div>{{endereco_empresa}}</div><div>{{telefone_empresa}} | {{email_empresa}}</div><div>{{cidade_emissao}}</div></div>
</div>
<div class="titulo-box"><div><h3 style="margin:0;font-size:11pt;">CONTRATO DE TRABALHO POR TEMPO INDETERMINADO</h3><div style="font-size:8pt;color:#555;">Regime Geral - LGT Angola</div></div><div style="font-size:9pt;text-align:right;"><b>{{codigo_documento}}</b><br/><span style="color:#777;">ORIGINAL</span></div></div>
<div class="grid-info"><div class="box"><div class="k">Funcionário</div><div class="v">{{nome_funcionario}}</div></div><div class="box"><div class="k">BI</div><div class="v">{{bi}}</div></div><div class="box"><div class="k">Cargo</div><div class="v">{{cargo}}</div></div><div class="box"><div class="k">Admissão</div><div class="v">{{data_admissao}}</div></div><div class="box"><div class="k">Salário</div><div class="v">{{salario_base_formatado}}</div></div></div>
<div class="clausulas">
<p><b>PRIMEIRA OUTORGANTE:</b> {{nome_empresa}}, NIF {{nif_empresa}}, sede {{endereco_empresa}}, representada por {{representante_empresa}}.</p>
<p><b>SEGUNDA OUTORGANTE:</b> {{nome_funcionario}}, BI {{bi}}, NIF {{nif_funcionario}}, filho de {{nome_pai}} e {{nome_mae}}, residente {{endereco_completo}}.</p>
<p><b>Cláusula 1ª:</b> Função de {{cargo}}, área {{area}}, início {{data_admissao}}.</p>
<p><b>Cláusula 2ª:</b> Local {{local_trabalho}}.</p>
<p><b>Cláusula 3ª:</b> Horário {{horario_entrada}} às {{horario_saida}}, {{carga_horaria}}.</p>
<p><b>Cláusula 4ª:</b> Remuneração {{salario_base_formatado}}.</p>
<p><b>Cláusula 5ª:</b> Período experimental {{periodo_experiencia}}.</p>
<p><b>Cláusula 6ª:</b> Duração {{duracao_contrato}}.</p>
</div>
<div style="margin-top:45px;display:flex;justify-content:space-between;text-align:center;"><div style="width:45%;border-top:1px solid #000;margin-top:60px;padding-top:5px;">Entidade Empregadora<br/>{{nome_empresa}}</div><div style="width:45%;border-top:1px solid #000;margin-top:60px;padding-top:5px;">Trabalhador<br/>{{nome_funcionario}}</div></div>
<p style="text-align:center;margin-top:25px;">{{cidade_emissao}}, {{data_hoje_extenso}}</p>
</body>
</html>
"""

DECLARACAO_HTML = """<!DOCTYPE html><html lang="pt-AO"><head><meta charset="UTF-8"><style>@page{size:A4;margin:18mm;}body{font-family:Arial;font-size:11pt;}.watermark{position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);opacity:0.10;width:650px;height:650px;}.header{display:flex;gap:12px;border-bottom:1px dotted #bbb;padding-bottom:10px;}</style></head>
<body><div class="watermark"><img src="{{logo_base64}}"/></div><div class="header"><img src="{{logo_base64}}" style="width:110px;height:90px;object-fit:contain;"/><div><b>{{nome_empresa}}</b><br/>NIF: {{nif_empresa}}<br/>{{endereco_empresa}}<br/>{{telefone_empresa}}</div></div>
<h3 style="text-align:center;border:1px solid #bbb;padding:10px;background:#eee;">DECLARAÇÃO DE TRABALHO - {{codigo_documento}}</h3>
<p style="margin-top:30px;text-align:justify;">Declara-se que <b>{{nome_funcionario}}</b>, BI {{bi}}, é funcionário desde {{data_admissao}}, cargo {{cargo}}, vínculo {{tipo_contrato}}, vencimento {{salario_base_formatado}}.</p>
<p style="text-align:center;margin-top:40px;">{{cidade_emissao}}, {{data_hoje_extenso}}</p>
<div style="text-align:center;margin-top:60px;border-top:1px solid #000;width:300px;margin-left:auto;margin-right:auto;padding-top:5px;">Direcção RH - {{nome_empresa}}</div>
</body></html>
"""

def seed_modelos(db: Session, company_id: uuid.UUID):
    modelos_def = [
        {"codigo": "CONT-EFETIVO-001","nome": "Contrato Efetivo Padrão A4","tipo": TipoModeloDocumento.contrato_efetivo,"categoria": CategoriaModelo.admissao,"descricao": "Contrato tempo indeterminado - LGT","conteudo_html": CONTRATO_EFETIVO_HTML,"is_padrao": True,"is_sistema": True,},
        {"codigo": "DECL-TRAB-001","nome": "Declaração de Trabalho A4","tipo": TipoModeloDocumento.declaracao_trabalho,"categoria": CategoriaModelo.gestao,"descricao": "Declaração A4","conteudo_html": DECLARACAO_HTML,"is_padrao": True,"is_sistema": True,}
    ]
    for m in modelos_def:
        existente = db.query(ModeloDocumento).filter(ModeloDocumento.company_id == company_id, ModeloDocumento.codigo == m["codigo"]).first()
        if existente:
            db.query(ModeloDocumento).filter(ModeloDocumento.company_id == company_id, ModeloDocumento.tipo == m["tipo"], ModeloDocumento.id!= existente.id).update({"is_padrao": False})
            existente.is_padrao = True; existente.is_ativo = True; existente.conteudo_html = m["conteudo_html"]; existente.updated_at = datetime.now(timezone.utc); db.commit(); continue
        if m["is_padrao"]:
            db.query(ModeloDocumento).filter(ModeloDocumento.company_id == company_id, ModeloDocumento.tipo == m["tipo"], ModeloDocumento.is_padrao == True).update({"is_padrao": False})
        doc = ModeloDocumento(id=uuid.uuid4(), company_id=company_id, codigo=m["codigo"], nome=m["nome"], tipo=m["tipo"], categoria=m["categoria"], descricao=m["descricao"], conteudo_html=m["conteudo_html"], variaveis_usadas=["nome_funcionario","bi","nome_empresa","salario_base_formatado","data_admissao","logo_base64"], variaveis_obrigatorias=["nome_funcionario","bi"], versao=1, is_ativo=True, is_padrao=m["is_padrao"], is_sistema=m["is_sistema"], created_at=datetime.now(timezone.utc), updated_at=datetime.now(timezone.utc),)
        db.add(doc); db.commit()
