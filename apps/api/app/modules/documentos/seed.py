import uuid
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from app.modules.documentos.models import ModeloDocumento, TipoModeloDocumento, CategoriaModelo

CONTRATO_EFETIVO_HTML = """
<div style="font-family: Arial; padding: 40px; line-height: 1.6; color: #000;">
    <div style="text-align: center; margin-bottom: 30px;">
        <h2 style="margin:0;">{{nome_empresa}}</h2>
        <p style="margin:0;">NIF: {{nif_empresa}} | Tel: {{telefone_empresa}}</p>
        <p style="margin:0;">{{endereco_empresa}}</p>
        <hr style="margin-top: 15px;">
        <h3 style="margin-top:20px;">CONTRATO DE TRABALHO POR TEMPO INDETERMINADO</h3>
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
        <div style="text-align: center;"><p>_________________________</p><p>Entidade Empregadora</p></div>
        <div style="text-align: center;"><p>_________________________</p><p>Trabalhador</p></div>
    </div>
    <p style="margin-top:40px; text-align: center;">{{cidade_emissao}}, {{data_hoje_extenso}}</p>
    <p style="text-align: center; font-size: 11px; color: #666;">Código de Verificação: {{codigo_documento}}</p>
</div>
"""

DECLARACAO_HTML = """
<div style="font-family: Arial; padding: 40px; line-height: 1.8;">
    <div style="text-align: center;"><h2>{{nome_empresa}}</h2><h3>DECLARAÇÃO DE TRABALHO</h3></div>
    <p style="margin-top: 30px;">Para os devidos efeitos, declara-se que <b>{{nome_funcionario}}</b>, portador do BI nº <b>{{bi}}</b>, é nosso funcionário desde <b>{{data_admissao}}</b>, exercendo a função de <b>{{cargo}}</b> com vínculo de <b>{{tipo_contrato}}</b>.</p>
    <p>Auferindo vencimento mensal de {{salario_base_formatado}}.</p>
    <p>Por ser verdade e nos ter sido solicitado, emitimos a presente declaração.</p>
    <p style="margin-top: 40px;">{{cidade_emissao}}, {{data_hoje_extenso}}</p>
    <p style="margin-top: 60px; text-align: center;">_________________________________<br>Direcção de Recursos Humanos</p>
    <p style="font-size: 10px; text-align: center; margin-top:30px;">Verificação: {{codigo_documento}}</p>
</div>
"""

def seed_modelos(db: Session, company_id: uuid.UUID):
    modelos_def = [
        {
            "codigo": "CONT-EFETIVO-001",
            "nome": "Contrato Efetivo Padrão",
            "tipo": TipoModeloDocumento.contrato_efetivo,
            "categoria": CategoriaModelo.admissao,
            "descricao": "Contrato por tempo indeterminado - LGT Angola",
            "conteudo_html": CONTRATO_EFETIVO_HTML,
            "is_padrao": True,
            "is_sistema": True,
        },
        {
            "codigo": "DECL-TRAB-001",
            "nome": "Declaração de Trabalho",
            "tipo": TipoModeloDocumento.declaracao_trabalho,
            "categoria": CategoriaModelo.gestao,
            "descricao": "Declaração para fins diversos",
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
            if m["is_padrao"]:
                # Desativa outros padrões do mesmo tipo
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
            print(f"♻️ Já existe {m['codigo']} - garantido como padrão")
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
        print(f"✅ Criado {m['codigo']}")

    print("✅ Seed finalizado")
