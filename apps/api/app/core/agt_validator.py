import httpx
import re
from typing import Optional, Dict
import logging

logger = logging.getLogger(__name__)

# URL real da consulta da AGT - o portal muda as vezes, deixei com fallback
AGT_URLS = [
    "https://www.agt.minfin.gov.ao/PortalAGT/ConsultaNIF/Consultar",
    "https://www.agt.minfin.gov.ao/PortalAGT/api/consultaNif",
]

def clean_nif(nif: str) -> str:
    return re.sub(r'\D', '', nif.strip())

def is_valid_format(nif: str) -> bool:
    nif_clean = clean_nif(nif)
    # Empresa Angola: 9 ou 10 dígitos, começa com 5 normalmente
    if not (9 <= len(nif_clean) <= 10):
        return False
    if not nif_clean.isdigit():
        return False
    # Bloqueia sequências fakes tipo 0000000000, 1111111111
    if len(set(nif_clean)) == 1:
        return False
    return True

async def validate_nif_agt(nif: str) -> Dict:
    """
    Consulta NIF na AGT. Retorna dict com:
    {
      "valid": bool,
      "nif": str,
      "nome_agt": str | None,
      "estado": "Activo" | "Inactivo" | "NaoEncontrado",
      "tipo": "Colectivo" | "Singular" | None,
      "source": "agt" | "cache" | "format"
    }
    """
    nif_clean = clean_nif(nif)

    if not is_valid_format(nif_clean):
        return {
            "valid": False,
            "nif": nif_clean,
            "nome_agt": None,
            "estado": "FormatoInvalido",
            "tipo": None,
            "source": "format",
            "message": "Formato de NIF inválido. Deve ter 9 ou 10 dígitos."
        }

    # Tenta consultar AGT real
    async with httpx.AsyncClient(timeout=15.0, follow_redirects=True, verify=False) as client:
        for url in AGT_URLS:
            try:
                # AGT espera form-data: nif=XXXX
                resp = await client.post(url, data={"nif": nif_clean, "NIF": nif_clean}, headers={
                    "User-Agent": "FaturaXpress/1.0",
                    "Accept": "application/json, text/html"
                })
                if resp.status_code == 200:
                    text = resp.text
                    # Tenta parsear se for JSON
                    try:
                        data = resp.json()
                        # Estrutura varia, mas geralmente vem Nome e Estado
                        nome = data.get("Nome") or data.get("nome") or data.get("Contribuinte")
                        estado = data.get("Estado") or data.get("estado") or "Activo"
                        if nome:
                            is_active = "activ" in str(estado).lower() or "ativo" in str(estado).lower()
                            return {
                                "valid": is_active,
                                "nif": nif_clean,
                                "nome_agt": nome.strip().upper(),
                                "estado": "Activo" if is_active else "Inactivo",
                                "tipo": "Colectivo",
                                "source": "agt",
                                "message": "NIF validado na AGT"
                            }
                    except:
                        pass
                    # Se for HTML (página Consultar NIF)
                    if "LA0" in text or "Activo" in text or "Contribuinte" in text:
                        # Extrai nome simples via regex
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
                                "tipo": "Colectivo",
                                "source": "agt",
                                "message": "NIF validado na AGT"
                            }
            except Exception as e:
                logger.warning(f"Tentativa AGT falhou em {url}: {e}")
                continue

        # Fallback: se AGT fora do ar, deixa passar mas marca como não verificado
        # Pra não quebrar teu cadastro quando AGT cai
        # Em produção tu pode trocar pra valid=False pra ser mais rigoroso
        logger.warning(f"AGT offline para NIF {nif_clean}, usando fallback")
        return {
            "valid": True,
            "nif": nif_clean,
            "nome_agt": None,
            "estado": "AGT_Offline",
            "tipo": None,
            "source": "fallback",
            "message": "AGT temporariamente indisponível, NIF aceite com verificação pendente"
        }
