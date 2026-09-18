import httpx
import re
from typing import Dict
import logging

logger = logging.getLogger(__name__)

AGT_URLS = [
    "https://www.agt.minfin.gov.ao/PortalAGT/ConsultaNIF/Consultar",
    "https://www.agt.minfin.gov.ao/PortalAGT/api/consultaNif",
]

def clean_nif(nif: str) -> str:
    # Mantém letras e números, só tira espaço e traço, e deixa maiúsculo
    # Ex: 003614847LA037 -> 003614847LA037
    # Ex: 500 206 33956 -> 50020633956
    return re.sub(r'[^A-Za-z0-9]', '', nif.strip()).upper()

def is_valid_format(nif: str) -> bool:
    nif_clean = clean_nif(nif)

    if not nif_clean:
        return False

    # Bloqueia sequências fake 0000000000
    if len(set(nif_clean)) == 1:
        return False

    # FORMATO 1: COLECTIVO (empresa) - 9 a 14 só números
    # Ex: 50020633956, 5417196053
    if nif_clean.isdigit():
        if 9 <= len(nif_clean) <= 14:
            return True
        return False

    # FORMATO 2: SINGULAR (pessoa) - 9 digitos + 2 letras + 3 digitos
    # Ex: 003614847LA037
    pattern_singular = r'^\d{9}[A-Z]{2}\d{3}$'
    if re.match(pattern_singular, nif_clean):
        return True

    # FORMATO 3: Alguns NIF antigos com 9 digitos + LA + 3 digitos já coberto acima,
    # mas deixa passar qualquer com letras no meio desde que tenha 12-14 chars
    if 12 <= len(nif_clean) <= 14 and any(c.isalpha() for c in nif_clean):
        # tem que ter pelo menos 9 números
        digits = re.sub(r'\D', '', nif_clean)
        if len(digits) >= 9:
            return True

    return False

async def validate_nif_agt(nif: str) -> Dict:
    nif_clean = clean_nif(nif)

    if not is_valid_format(nif_clean):
        return {
            "valid": False,
            "nif": nif_clean,
            "nome_agt": None,
            "estado": "FormatoInvalido",
            "tipo": None,
            "source": "format",
            "message": f"Formato de NIF inválido: {nif}. Use 50020633956 ou 003614847LA037"
        }

    async with httpx.AsyncClient(timeout=15.0, follow_redirects=True, verify=False) as client:
        for url in AGT_URLS:
            try:
                resp = await client.post(url, data={"nif": nif_clean, "NIF": nif_clean}, headers={
                    "User-Agent": "FaturaXpress/1.0",
                    "Accept": "application/json, text/html"
                })
                if resp.status_code == 200:
                    text = resp.text
                    try:
                        data = resp.json()
                        nome = data.get("Nome") or data.get("nome") or data.get("Contribuinte")
                        estado = data.get("Estado") or data.get("estado") or "Activo"
                        if nome:
                            is_active = "activ" in str(estado).lower() or "ativo" in str(estado).lower()
                            return {
                                "valid": is_active,
                                "nif": nif_clean,
                                "nome_agt": nome.strip().upper(),
                                "estado": "Activo" if is_active else "Inactivo",
                                "tipo": "Colectivo" if nif_clean.isdigit() else "Singular",
                                "source": "agt",
                                "message": "NIF validado na AGT"
                            }
                    except:
                        pass
                    if "LA0" in text or "Activo" in text or "Contribuinte" in text:
                        m_nome = re.search(r"Nome:\s*</strong>\s*([^<]+)", text, re.I)
                        m_estado = re.search(r"Activo:\s*([A-Za-z]+)", text, re.I)
                        nome = m_nome.group(1).strip() if m_nome else None
                        estado_raw = m_estado.group(1).strip() if m_estado else "Activo"
                        is_active = "ativ" in estado_raw.lower()
                        if nome or is_active:
                            return {
                                "valid": is_active,
                                "nif": nif_clean,
                                "nome_agt": nome.upper() if nome else None,
                                "estado": "Activo" if is_active else "Inactivo",
                                "tipo": "Colectivo" if nif_clean.isdigit() else "Singular",
                                "source": "agt",
                                "message": "NIF validado na AGT"
                            }
            except Exception as e:
                logger.warning(f"Tentativa AGT falhou em {url}: {e}")
                continue

        logger.warning(f"AGT offline para NIF {nif_clean}, usando fallback")
        return {
            "valid": True,
            "nif": nif_clean,
            "nome_agt": None,
            "estado": "AGT_Offline",
            "tipo": "Colectivo" if nif_clean.isdigit() else "Singular",
            "source": "fallback",
            "message": "AGT temporariamente indisponível, NIF aceite com verificação pendente"
        }
