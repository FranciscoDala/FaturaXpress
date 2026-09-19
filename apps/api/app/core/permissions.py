CARGOS_PERMISSOES = {
    "admin": ["*"],
    "financeira": ["emitir_ft", "emitir_pp", "emitir_nc", "cancelar", "ver_relatorios", "imprimir", "gerir_clientes"],
    "recepcao": ["emitir_ft", "emitir_pp", "imprimir", "ver_clientes"],
    "rh": ["gerir_clientes", "gerir_funcionarios", "gerir_areas", "ver_documentos_rh"]
}

def tem_permissao(cargo: str, permissao: str) -> bool:
    if cargo == "admin":
        return True
    return permissao in CARGOS_PERMISSOES.get(cargo, [])
