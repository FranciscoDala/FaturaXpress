VARIAVEIS_POR_GRUPO = {
    "funcionario": [
        "nome_funcionario", "primeiro_nome", "bi", "nif_funcionario",
        "data_nascimento", "data_nascimento_extenso", "nacionalidade",
        "estado_civil", "genero", "telefone", "email", "endereco_completo",
        "cidade", "provincia", "nome_pai", "nome_mae", "iban", "banco1"
    ],
    "vinculo": [
        "cargo", "area", "tipo_contrato", "data_admissao", "data_admissao_extenso",
        "data_inicio_contrato", "data_fim_contrato", "duracao_contrato",
        "periodo_experiencia", "horario_entrada", "horario_saida",
        "carga_horaria", "local_trabalho"
    ],
    "financeiro": [
        "salario_base", "salario_base_formatado", "salario_extenso",
        "subsidio_alimentacao", "subsidio_transporte", "total_vencimento"
    ],
    "empresa": [
        "nome_empresa", "nif_empresa", "endereco_empresa", "telefone_empresa",
        "email_empresa", "representante_empresa", "cargo_representante"
    ],
    "sistema": [
        "data_hoje", "data_hoje_extenso", "ano_atual", "mes_atual",
        "codigo_documento", "cidade_emissao"
    ],
    "evento": [
        "data_inicio_ferias", "data_fim_ferias", "dias_ferias",
        "data_falta", "motivo_advertencia", "data_advertencia",
        "novo_cargo", "novo_salario", "data_demissao", "motivo_demissao"
    ]
}
TODAS_VARIAVEIS = [v for grupo in VARIAVEIS_POR_GRUPO.values() for v in grupo]
