from typing import List
from fastapi import HTTPException

# permissões base por cargo
CARGOS_PERMISSOES = {
    "admin": ["*"],
    "financeira": ["emitir_ft", "emitir_pp", "emitir_nc", "cancelar", "ver_relatorios", "imprimir", "gerir_clientes", "ver_faturas", "gerir_faturas"],
    "recepcao": ["emitir_ft", "emitir_pp", "imprimir", "ver_clientes", "ver_faturas"],
    "rh": ["gerir_clientes", "gerir_funcionarios", "gerir_areas", "ver_documentos_rh", "ver_funcionarios"]
}

# o que cada ação de fatura precisa
ACAO_PERMISSAO = {
    "criar_ft": "emitir_ft",
    "criar_pp": "emitir_pp",
    "criar_nc": "emitir_nc",
    "cancelar": "cancelar",
    "ver": "ver_faturas",
    "relatorio": "ver_relatorios"
}

def tem_permissao(cargo: str, permissao: str) -> bool:
    if not cargo:
        return False
    if cargo == "admin":
        return True
    perms = CARGOS_PERMISSOES.get(cargo.lower(), [])
    return permissao in perms or "*" in perms

def exigir_permissao(cargo: str, permissao: str):
    if not tem_permissao(cargo, permissao):
        raise HTTPException(status_code=403, detail=f"Sem permissão: {permissao}")

def pode_acessar_area(usuario, area_id) -> bool:
    """admin vê tudo, outros só se estiver vinculado à área"""
    if not usuario:
        return False
    if getattr(usuario, 'cargo', None) == 'admin':
        return True
    # se não tem área vinculada, pode ver tudo (compatibilidade)
    areas = getattr(usuario, 'areas', None) or []
    if not areas:
        return True
    return any(str(a.id) == str(area_id) or str(getattr(a, 'id', '')) == str(area_id) for a in areas)

def verificar_permissao_area(usuario, area_id, permissao: str):
    exigir_permissao(getattr(usuario, 'cargo', 'recepcao'), permissao)
    if area_id and not pode_acessar_area(usuario, area_id):
        raise HTTPException(status_code=403, detail="Sem acesso a esta área")
