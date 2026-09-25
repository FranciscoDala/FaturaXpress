import uuid
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from app.modules.documentos.models import ModeloDocumento, TipoModeloDocumento, CategoriaModelo

CONTRATO_EFETIVO_HTML = """<!DOCTYPE html>
<html lang="pt-AO">
<head>
<meta charset="UTF-8">
<meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
<style>
  @page {
    size: A4;
    margin: 20mm 25mm 20mm 25mm;
  }
  body {
    margin: 0;
    padding: 0;
    font-family: Arial, Helvetica, sans-serif;
    font-size: 12pt;
    line-height: 1.6;
    color: #000;
    background: #fff;
  }
  .folha-a4 {
    width: 210mm;
    min-height: 297mm;
    margin: 0 auto;
    padding: 20mm 25mm;
    box-sizing: border-box;
    background: white;
  }
  h2, h3 { text-align: center; margin: 0; }
  p { text-align: justify; text-justify: inter-word; margin: 0 0 12px 0; }
  .cabecalho p { text-align: center; }
  @media print {
    body { -webkit-print-color-adjust: exact; }
    .folha-a4 { width: auto; min-height: auto; margin: 0; padding: 0; }
  }
</style>
</head>
<body>
<div class="folha-a4">
    <div class="cabecalho" style="text-align: center; margin-bottom: 30px;">
        <h2>{{nome_empresa}}</h2>
        <p>NIF: {{nif_empresa}} | Tel: {{telefone_empresa}}</p>
        <p>{{endereco_empresa}}</p>
        <hr style="margin-top: 15px;">
        <h3 style="margin-top:20px; text-transform: uppercase;">CONTRATO DE TRABALHO POR TEMPO INDETERMINADO</h3>
    </div>
    <p>Entre:</p>
    <p><b>PRIMEIRA OUTORGANTE:</b> {{nome_empresa}}, com sede em {{endereco_empresa}}, NIF {{nif_empresa}}, neste acto representada por {{representante_empresa}}, na qualidade de {{cargo_representante}}, adiante designada por Entidade Empregadora.</p>
    <p><b>SEGUNDA OUTORGANTE:</b> {{nome_funcionario}}, portador do BI nº {{bi}}, NIF {{nif_funcionario}}, nascido em {{data_nascimento}}, filho de {{nome_pai}} e de {{nome_mae}}, residente em {{endereco_completo}}, adiante designado por Trabalhador.</p>
    <p style="margin-top:20px;">É celebrado o presente contrato que se rege pelas cláusulas seguintes:</p>
    <p><b>Cláusula 1ª (Objecto):</b> O trabalhador é admitido para exercer as funções de {{cargo}}, na área {{area}}, com início em {{data_admissao}}.</p>
    <p><b>Cláusula 2ª (Local de Trabalho):</b> O local de trabalho habitual será em {{local_trabalho}}.</p>
    <p><b>Cláusula 3ª (Horário):</b> O horário será das {{horario_entrada}} às {{horario_saida}}, com carga horária de {{carga_horaria}}.</p>
    <p><b>Cláusula 4ª (Remuneração):</b> A remuneração base mensal é de {{salario_base_formatado}} ({{salario_extenso}}).</p>
    <p><b>Cláusula 5ª (Período Experimental):</b> Fica acordado um período experimental de {{periodo_experiencia}}.</p>
    <p><b>Cláusula 6ª (Duração):</b> O presente contrato é celebrado por tempo {{duracao_contrato}}.</p>
    <div style="margin-top:50px; display: flex; justify-content: space-between;">
        <div style="text-align: center;"><p style="text-align:center;">_________________________</p><p style="text-align:center;">Entidade Empregadora</p></div>
        <div style="text-align: center;"><p style="text-align:center;">_________________________</p><p style="text-align:center;">Trabalhador</p></div>
    </div>
    <p style="margin-top:40px; text-align: center;">{{cidade_emissao}}, {{data_hoje_extenso}}</p>
    <p style="text-align: center; font-size: 9pt; color: #666;">Código de Verificação: {{codigo_documento}}</p>
</div>
</body>
</html>
"""

DECLARACAO_HTML = """<!DOCTYPE html>
<html lang="pt-AO">
<head>
<meta charset="UTF-8">
<meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
<style>
  @page { size: A4; margin: 20mm 25mm; }
  body { margin:0; padding:0; font-family: Arial, Helvetica, sans-serif; font-size: 12pt; line-height: 1.8; color:#000; background:#fff; }
  .folha-a4 { width:210mm; min-height:297mm; margin:0 auto; padding:20mm 25mm; box-sizing:border-box; background:white; }
  p { text-align: justify; margin: 0 0 12px 0; }
  h2, h3 { text-align: center; }
  @media print { .folha-a4 { width:auto; min-height:auto; margin:0; padding:0; } }
</style>
</head>
<body>
<div class="folha-a4">
    <div style="text-align: center;"><h2>{{nome_empresa}}</h2><h3>DECLARAÇÃO DE TRABALHO</h3></div>
    <p style="margin-top: 30px;">Para os devidos efeitos, declara-se que <b>{{nome_funcionario}}</b>, portador do BI nº <b>{{bi}}</b>, é nosso funcionário desde <b>{{data_admissao}}</b>, exercendo a função de <b>{{cargo}}</b> com vínculo de <b>{{tipo_contrato}}</b>.</p>
    <p>Auferindo vencimento mensal de {{salario_base_formatado}}.</p>
    <p>Por ser verdade e nos ter sido solicitado, emitimos a presente declaração.</p>
    <p style="margin-top: 40px; text-align: center;">{{cidade_emissao}}, {{data_hoje_extenso}}</p>
    <p style="margin-top: 60px; text-align: center;">_________________________________<br>Direcção de Recursos Humanos</p>
    <p style="font-size: 9pt; text-align: center; margin-top:30px;">Verificação: {{codigo_documento}}</p>
</div>
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
                ModeloDocumento.id != existente.id
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
            variaveis_usadas=["nome_funcionario", "bi", "nome_empresa", "salario_base_formatado", "data_admissao"],
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
