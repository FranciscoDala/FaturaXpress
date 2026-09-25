CONTRATO_EFETIVO_HTML = """<!DOCTYPE html>
<html lang="pt-AO">
<head><meta charset="UTF-8">
<style>
  @page{size:A4;margin:15mm 20mm 20mm 20mm;@bottom-center{content:"Pág. " counter(page) " de " counter(pages) " | {{codigo_documento}} - {{nome_empresa}}";font-size:7pt;color:#666;}}
  body{margin:0;padding:0;font-family:Arial,sans-serif;font-size:10.5pt;line-height:1.6;color:#111;-webkit-print-color-adjust:exact;}
 .watermark{position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);width:650px;height:650px;opacity:0.08;z-index:-1;}
 .watermark img{width:100%;height:100%;object-fit:contain;}
 .header{display:flex;gap:12px;border-bottom:1px solid #000;padding-bottom:10px;align-items:center;}
 .header .logo{width:90px;height:90px;object-fit:contain;}
 .emp-top{font-size:9pt;line-height:14px;}
 .titulo-principal{text-align:center;margin-top:18px;margin-bottom:18px;font-size:12pt;font-weight:bold;text-transform:uppercase;text-decoration:underline;}
 .texto-justificado{text-align:justify;margin-bottom:12px;}
 .clausula-titulo{text-align:center;font-weight:bold;margin-top:22px;margin-bottom:10px;text-transform:uppercase;font-size:11pt;}
 .assinaturas{margin-top:60px;display:flex;justify-content:space-between;text-align:center;}
 .assinaturas div{width:45%;border-top:1px solid #000;padding-top:6px;font-size:9pt;}
</style>
</head>
<body>
<div class="watermark">{{logo_base64_img}}</div>
<div class="header">
  <img class="logo" src="{{logo_base64}}" alt="logo"/>
  <div class="emp-top"><b>{{nome_empresa}}</b><br/>NIF: {{nif_empresa}}<br/>{{endereco_empresa}}<br/>{{telefone_empresa}} | {{email_empresa}}</div>
</div>

<div class="titulo-principal">Contrato de Trabalho por Tempo Indeterminado</div>

<p class="texto-justificado"><b>Entre:</b> {{nome_empresa}}, com NIF {{nif_empresa}}, com sede social em {{endereco_empresa}}, matriculada na Conservatória de Registo Comercial de {{cidade_emissao}} sob o nº {{numero_registo_comercial}}, neste acto representada pelo seu sócio-gerente {{representante_empresa}}, adiante designada por <b>Primeira Outorgante</b> ou <b>Entidade Empregadora</b>.</p>

<p class="texto-justificado"><b>E:</b> {{nome_funcionario}}, portador do Bilhete de Identidade nº {{bi}}, emitido aos {{data_emissao_bi}} pelos Serviços de Identificação de {{local_emissao_bi}}, filho de {{nome_pai}} e de {{nome_mae}}, natural de {{naturalidade}}, residente no {{endereco_completo}}, adiante designado por <b>Segunda Outorgante</b> ou <b>Trabalhador</b>.</p>

<p class="texto-justificado">É celebrado o presente contrato de trabalho por tempo indeterminado, nos termos da Lei Geral do Trabalho, Lei nº 12/23 de 27 de Dezembro, que se regerá pelas cláusulas seguintes:</p>

<div style="margin-top:15px;">{{clausulas_html}}</div>

<div class="assinaturas">
  <div>Pela Entidade Empregadora<br/><br/>{{nome_empresa}}<br/>{{representante_empresa}}</div>
  <div>O Trabalhador<br/><br/>{{nome_funcionario}}</div>
</div>
<p style="text-align:center;margin-top:30px;">{{cidade_emissao}}, {{data_hoje_extenso}}</p>
</body>
</html>
"""

CONTRATO_EFETIVO_CLAUSULAS = [
  {"id":"1","titulo":"Primeira Cláusula\n(objecto do contrato)","texto":"A Entidade Empregadora admite ao seu serviço o Segundo Outorgante para exercer as funções de {{cargo}}, na área de {{area}}, com início em {{data_admissao}}, no local de trabalho sito em {{local_trabalho}}."},
  {"id":"2","titulo":"Segunda Cláusula\n(vínculo contratual)","texto":"O presente contrato é celebrado por tempo indeterminado, nos termos da Lei Geral do Trabalho."},
  {"id":"3","titulo":"Terceira Cláusula\n(horário de trabalho)","texto":"O período normal de trabalho é de {{horario_entrada}} às {{horario_saida}}, perfazendo um total de {{carga_horaria}} semanais, com intervalo para almoço de 1 (uma) hora. O trabalhador obriga-se a prestar trabalho extraordinário sempre que necessário e dentro dos limites legais."},
  {"id":"4","titulo":"Quarta Cláusula\n(remuneração)","texto":"Como contrapartida do trabalho prestado, o trabalhador auferirá uma remuneração mensal ilíquida de {{salario_base_formatado}} ({{salario_extenso}}), a ser paga por transferência bancária para o IBAN {{iban}}. Sobre a remuneração incidem os descontos legais de Segurança Social (INSS) e IRT. O trabalhador tem direito a subsídio de Natal (13º mês), subsídio de férias correspondente a 100% do salário base e subsídio de alimentação quando aplicável."},
  {"id":"5","titulo":"Quinta Cláusula\n(início e duração de vigência)","texto":"O presente contrato entra em vigor em {{data_admissao}} e vigorará por tempo indeterminado, com período experimental de {{periodo_experiencia}}, nos termos da LGT."},
  {"id":"6","titulo":"Sexta Cláusula\n(deveres e obrigações)","texto":"O trabalhador obriga-se a cumprir com zelo e assiduidade as funções que lhe forem confiadas, a respeitar o regulamento interno e as normas de higiene e segurança no trabalho."},
]
