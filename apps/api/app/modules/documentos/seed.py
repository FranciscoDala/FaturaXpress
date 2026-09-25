import uuid
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from app.modules.documentos.models import ModeloDocumento, TipoModeloDocumento, CategoriaModelo

CONTRATO_EFETIVO_HTML = """<!DOCTYPE html>
<html lang="pt-AO">
<head>
<meta charset="UTF-8">
<style>
  @page {
    size: A4;
    margin: 12mm 18mm 18mm 18mm;
    @bottom-center {
      content: "Pág. " counter(page) " de " counter(pages) " | Código: {{codigo_documento}} | Gerado por FaturaXpress - Validado";
      font-size: 7.5pt;
      color: #666;
      font-family: Arial, Helvetica, sans-serif;
    }
  }
  body {
    margin: 0; padding: 0;
    font-family: Arial, Helvetica, sans-serif;
    font-size: 10.5pt;
    line-height: 1.55;
    color: #111;
    -webkit-print-color-adjust: exact;
  }
  /* MARCA D'AGUA IGUAL DA FATURA - 0.10 opacity */
 .watermark {
    position: fixed;
    top: 50%; left: 50%;
    transform: translate(-50%, -50%);
    width: 650px; height: 650px;
    opacity: 0.10;
    z-index: -1;
  }
 .watermark img { width: 100%; height: 100%; object-fit: contain; }
 .watermark-fallback {
    width: 550px; height: 550px;
    background: #1a5ca8;
    border-radius: 50%;
    display: flex; align-items: center; justify-content: center;
    color: white; font-weight: 900; font-size: 200px;
  }
  /* HEADER IGUAL FATURA */
 .header {
    display: flex; gap: 12px;
    border-bottom: 1px dotted #bbb;
    padding-bottom: 10px;
  }
 .header.logo { width: 110px; height: 90px; object-fit: contain; flex-shrink: 0; }
 .header.logo-default {
    width: 70px; height: 70px; background: #1a5ca8; border-radius: 50%;
    color: white; font-weight: 900; font-size: 36px;
    display: flex; align-items: center; justify-content: center;
  }
 .emp-info { font-size: 8.5pt; line-height: 13px; }
 .emp-info.nome { font-weight: bold; font-size: 11pt; }

 .titulo-box {
    margin-top: 14px;
    display: flex; justify-content: space-between; align-items: flex-start;
    border: 1px solid #bbb; padding: 8px 10px;
    background: rgba(194,194,194,0.25);
  }
 .titulo-box h3 { margin: 0; font-size: 11pt; letter-spacing: 0.5px; }
 .codigo { font-size: 9pt; text-align: right; }

 .clausulas { margin-top: 18px; }
 .clausulas p { text-align: justify; margin: 0 0 10px 0; font-size: 10.5pt; }
 .clausulas b { font-size: 10.5pt; }

 .grid-info {
    display: flex; gap: 5px; margin-top: 12px;
  }
 .grid-info.box {
    border: 1px solid #bbb; padding: 5px 6px; flex: 1;
    background: rgba(255,255,255,0.4);
  }
 .grid-info.k { font-weight: bold; font-size: 7.5pt; text-transform: uppercase; }
 .grid-info.v { font-size: 9pt; margin-top: 2px; text-align: center; }

 .assinaturas {
    margin-top: 45px; display: flex; justify-content: space-between;
  }
 .ass { text-align: center; width: 45%; }
 .ass.linha { border-top: 1px solid #000; margin-top: 60px; padding-top: 5px; font-size: 9pt; }

 .footer-banco {
    margin-top: 15px; border: 1px dashed #bbb; padding: 8px;
    font-size: 8.5pt; background: rgba(255,255,255,0.4);
  }
</style>
</head>
<body>

  <!-- WATERMARK -->
  <div class="watermark">
    {% if logo_base64 %}
      <img src="{{logo_base64}}" />
    {% else %}
      <div class="watermark-fallback">{{nome_empresa[0] if nome_empresa else 'E'}}</div>
    {% endif %}
  </div>

  <div class="folha-a4">
    <!-- HEADER IGUAL FATURA -->
    <div class="header">
      {% if logo_base64 %}
        <img class="logo" src="{{logo_base64}}" />
      {% else %}
        <div class="logo-default">{{nome_empresa[0] if nome_empresa else 'E'}}</div>
      {% endif %}
      <div class="emp-info">
        <div class="nome">{{nome_empresa}}</div>
        <div>NIF: {{nif_empresa}}</div>
        <div>Endereço: {{endereco_empresa}}</div>
        <div>Contactos: {{telefone_empresa}} | {{email_empresa}}</div>
        <div>{{cidade_emissao}}</div>
      </div>
    </div>

    <div class="titulo-box">
      <div>
        <h3>CONTRATO DE TRABALHO POR TEMPO INDETERMINADO</h3>
        <div style="font-size:8pt; color:#555; margin-top:2px;">Regime Geral - LGT Angola</div>
      </div>
      <div class="codigo">
        <b>{{codigo_documento}}</b><br/>
        <span style="color:#777;">ORIGINAL</span><br/>
        <span style="font-size:7.5pt;">Emissão: {{data_hoje_extenso}}</span>
      </div>
    </div>

    <div class="grid-info">
      <div class="box"><div class="k">Funcionário</div><div class="v">{{nome_funcionario}}</div></div>
      <div class="box"><div class="k">BI / NIF</div><div class="v">{{bi}} / {{nif_funcionario}}</div></div>
      <div class="box"><div class="k">Cargo</div><div class="v">{{cargo}}</div></div>
      <div class="box"><div class="k">Admissão</div><div class="v">{{data_admissao}}</div></div>
      <div class="box"><div class="k">Salário</div><div class="v">{{salario_base_formatado}}</div></div>
    </div>

    <div class="clausulas">
      <p><b>Entre:</b></p>
      <p><b>PRIMEIRA OUTORGANTE:</b> {{nome_empresa}}, com sede em {{endereco_empresa}}, NIF {{nif_empresa}}, neste acto representada por {{representante_empresa}}, na qualidade de {{cargo_representante}}, adiante designada por Entidade Empregadora.</p>
      <p><b>SEGUNDA OUTORGANTE:</b> {{nome_funcionario}}, portador do BI nº {{bi}}, NIF {{nif_funcionario}}, nascido em {{data_nascimento}}, filho de {{nome_pai}} e de {{nome_mae}}, residente em {{endereco_completo}}, adiante designado por Trabalhador.</p>

      <p style="margin-top:12px;"><b>Cláusula 1ª (Objecto):</b> O trabalhador é admitido para exercer as funções de {{cargo}}, na área {{area}}, com início em {{data_admissao}}.</p>
      <p><b>Cláusula 2ª (Local):</b> O local de trabalho habitual será em {{local_trabalho}}.</p>
      <p><b>Cláusula 3ª (Horário):</b> Das {{horario_entrada}} às {{horario_saida}}, carga de {{carga_horaria}}.</p>
      <p><b>Cláusula 4ª (Remuneração):</b> {{salario_base_formatado}} ({{salario_extenso}}).</p>
      <p><b>Cláusula 5ª (Período Experimental):</b> {{periodo_experiencia}}.</p>
      <p><b>Cláusula 6ª (Duração):</b> Por tempo {{duracao_contrato}}.</p>
    </div>

    <div class="assinaturas">
      <div class="ass"><div class="linha">Entidade Empregadora<br/>{{nome_empresa}}<br/>Carimbo</div></div>
      <div class="ass"><div class="linha">Trabalhador<br/>{{nome_funcionario}}<br/>BI: {{bi}}</div></div>
    </div>

    <div style="text-align:center; margin-top:25px; font-size:9pt;">{{cidade_emissao}}, {{data_hoje_extenso}}</div>

    <div class="footer-banco">
      <b>Validação:</b> Código {{codigo_documento}} | Hash: {{hash_verificacao if hash_verificacao else codigo_documento}} | Processado por FaturaXpress 83/AGT/2019
    </div>
  </div>
</body>
</html>
"""

DECLARACAO_HTML = """<!DOCTYPE html>
<html lang="pt-AO">
<head>
<meta charset="UTF-8">
<style>
  @page { size: A4; margin: 12mm 18mm; @bottom-center { content: "Pág. " counter(page) " de " counter(pages) " | {{codigo_documento}}"; font-size: 7.5pt; color: #666; } }
  body { margin:0; padding:0; font-family: Arial, sans-serif; font-size: 11pt; line-height: 1.7; -webkit-print-color-adjust: exact; }
 .watermark { position: fixed; top: 50%; left: 50%; transform: translate(-50%,-50%); width: 650px; height: 650px; opacity: 0.10; z-index: -1; }
 .watermark img { width:100%; height:100%; object-fit:contain; }
 .header { display:flex; gap:12px; border-bottom:1px dotted #bbb; padding-bottom:10px; }
 .header.logo { width:110px; height:90px; object-fit:contain; }
 .emp-info { font-size:8.5pt; line-height:13px; }
 .titulo { text-align:center; margin-top:20px; border:1px solid #bbb; padding:10px; background:rgba(194,194,194,0.25); }
</style>
</head>
<body>
  <div class="watermark">{% if logo_base64 %}<img src="{{logo_base64}}"/>{% endif %}</div>
  <div class="header">
    {% if logo_base64 %}<img class="logo" src="{{logo_base64}}"/>{% endif %}
    <div class="emp-info"><b style="font-size:11pt;">{{nome_empresa}}</b><br/>NIF: {{nif_empresa}}<br/>{{endereco_empresa}}<br/>{{telefone_empresa}} | {{email_empresa}}</div>
  </div>
  <div class="titulo"><h3 style="margin:0;">DECLARAÇÃO DE TRABALHO</h3><div style="font-size:8pt; color:#555;">{{codigo_documento}} - ORIGINAL</div></div>
  <p style="margin-top:30px; text-align:justify;">Para os devidos efeitos, declara-se que <b>{{nome_funcionario}}</b>, BI nº <b>{{bi}}</b>, é nosso funcionário desde <b>{{data_admissao}}</b>, exercendo <b>{{cargo}}</b> com vínculo de <b>{{tipo_contrato}}</b>, auferindo {{salario_base_formatado}}.</p>
  <p>Por ser verdade, emitimos a presente.</p>
  <p style="text-align:center; margin-top:40px;">{{cidade_emissao}}, {{data_hoje_extenso}}</p>
  <div style="display:flex; justify-content:center; margin-top:60px;"><div style="text-align:center; border-top:1px solid #000; width:300px; padding-top:5px; font-size:9pt;">Direcção de Recursos Humanos<br/>{{nome_empresa}}</div></div>
</body>
</html>
"""

def seed_modelos(db: Session, company_id: uuid.UUID):
    modelos_def = [
        {
            "codigo": "CONT-EFETIVO-001",
            "nome": "Contrato Efetivo Padrão A4",
            "tipo": TipoModeloDocumento.contrato_efetivo,
            "categoria": CategoriaModelo.admissao,
            "descricao": "Contrato por tempo indeterminado - LGT Angola - A4 justificado",
            "conteudo_html": CONTRATO_EFETIVO_HTML,
            "is_padrao": True,
            "is_sistema": True,
        },
        {
            "codigo": "DECL-TRAB-001",
            "nome": "Declaração de Trabalho A4",
            "tipo": TipoModeloDocumento.declaracao_trabalho,
            "categoria": CategoriaModelo.gestao,
            "descricao": "Declaração A4",
            "conteudo_html": DECLARACAO_HTML,
            "is_padrao": True,
            "is_sistema": True,
        }
    ]

    for m in modelos_def:
        existente = db.query(ModeloDocumento).filter(
            ModeloDocumento.company_id == company_id,
            ModeloDocumento.codigo == m["codigo"]
        ).first()

        if existente:
            db.query(ModeloDocumento).filter(
                ModeloDocumento.company_id == company_id,
                ModeloDocumento.tipo == m["tipo"],
                ModeloDocumento.id!= existente.id
            ).update({"is_padrao": False})
            existente.is_padrao = True
            existente.is_ativo = True
            existente.conteudo_html = m["conteudo_html"]
            existente.updated_at = datetime.now(timezone.utc)
            db.commit()
            print(f"♻️ Atualizado A4 {m['codigo']}")
            continue

        if m["is_padrao"]:
            db.query(ModeloDocumento).filter(
                ModeloDocumento.company_id == company_id,
                ModeloDocumento.tipo == m["tipo"],
                ModeloDocumento.is_padrao == True
            ).update({"is_padrao": False})

        doc = ModeloDocumento(
            id=uuid.uuid4(),
            company_id=company_id,
            codigo=m["codigo"],
            nome=m["nome"],
            tipo=m["tipo"],
            categoria=m["categoria"],
            descricao=m["descricao"],
            conteudo_html=m["conteudo_html"],
            variaveis_usadas=["nome_funcionario", "bi", "nome_empresa", "salario_base_formatado", "data_admissao", "logo_base64"],
            variaveis_obrigatorias=["nome_funcionario", "bi"],
            versao=1,
            is_ativo=True,
            is_padrao=m["is_padrao"],
            is_sistema=m["is_sistema"],
            created_at=datetime.now(timezone.utc),
            updated_at=datetime.now(timezone.utc),
        )
        db.add(doc)
        db.commit()
        print(f"✅ Criado A4 {m['codigo']}")

    print("✅ Seed A4 finalizado")
