# app/core/agt_validator.py
import httpx
import re
from typing import Dict, Optional
import logging

logger = logging.getLogger(__name__)

URL_CONSULTA = "https://portaldocontribuinte.minfin.gov.ao/consultar-nif-do-contribuinte"

def clean_nif(nif: str) -> str:
    return re.sub(r'[^A-Za-z0-9]', '', nif.strip()).upper()

def is_valid_format(nif: str) -> bool:
    nif_clean = clean_nif(nif)
    if not nif_clean or len(set(nif_clean)) == 1:
        return False
    if nif_clean.isdigit():
        return 9 <= len(nif_clean) <= 14
    if re.match(r'^\d{9}[A-Z]{2}\d{3}$', nif_clean):
        return True
    if 12 <= len(nif_clean) <= 14 and any(c.isalpha() for c in nif_clean):
        return len(re.sub(r'\D', '', nif_clean)) >= 9
    return False

def parse_agt_html(html: str, nif_consultado: str) -> Optional[Dict]:
    html_lower = html.lower()
    # Mensagens oficiais de não encontrado
    if "nif inexistente" in html_lower or "contribuinte não encontrado" in html_lower or "nif não existe" in html_lower:
        return None
    # Se não tem bloco de resultado, é NIF inválido, não fallback
    if "taxpayer" not in html_lower and "resultado da consulta" not in html_lower:
        return None

    def extract(label: str) -> Optional[str]:
        pattern = rf"{label}:\s*</label>\s*<div[^>]*>\s*<label[^>]*>([^<]+)</label>"
        m = re.search(pattern, html, re.I)
        return m.group(1).strip() if m else None

    nome = extract("Nome")
    if not nome:
        matches = re.findall(r'<label class="control-label text-left">([^<]+)</label>', html)
        for val in matches:
            v = val.strip()
            if v and v.upper()!= nif_consultado and len(v) > 4:
                if v.lower() not in ["activo", "inactivo", "singular", "colectivo"]:
                    nome = v
                    break

    if not nome:
        return None # NIF existe no HTML mas sem nome = considera não encontrado

    tipo = extract("Tipo") or ("SINGULAR" if "LA" in nif_consultado else "COLECTIVO")
    estado = extract("Estado") or "Activo"

    return {"nome": nome, "tipo": tipo, "estado": estado}

async def validate_nif_agt(nif: str) -> Dict:
    nif_clean = clean_nif(nif)
    if not is_valid_format(nif_clean):
        return {"valid": False, "nif": nif_clean, "nome_agt": None, "estado": "FormatoInvalido", "tipo": None, "source": "format", "message": "Formato inválido"}

    headers = {"User-Agent": "Mozilla/5.0 FaturaXpress"}

    async with httpx.AsyncClient(timeout=20.0, follow_redirects=True, verify=False, headers=headers) as client:
        try:
            r_get = await client.get(URL_CONSULTA)
            vs_matches = re.findall(r'name="javax\.faces\.ViewState"[^>]*value="([^"]+)"', r_get.text)
            view_state = vs_matches[len(vs_matches)-1] if len(vs_matches) > 0 else ""
            if not view_state:
                raise Exception("ViewState falhou - AGT offline")

            r_post = await client.post(
                URL_CONSULTA,
                data={"j_id_2x": "j_id_2x", "j_id_2x:txtNIFNumber": nif_clean, "j_id_2x_SUBMIT": "1", "javax.faces.ViewState": view_state},
                headers={"Faces-Request": "partial/ajax", "X-Requested-With": "XMLHttpRequest", "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8"}
            )

            text = r_post.text
            cdata_list = re.findall(r'<!\[CDATA\[(.*?)\]\]>', text, re.DOTALL)
            html_result = "".join(cdata_list) if len(cdata_list) > 0 else text

            parsed = parse_agt_html(html_result, nif_clean)

            if parsed is None:
                return {"valid": False, "nif": nif_clean, "nome_agt": None, "estado": "NaoEncontrado", "tipo": None, "source": "agt", "message": "NIF não existe na AGT"}

            nome_val = parsed.get("nome")
            nome_final = nome_val.upper() if isinstance(nome_val, str) else None

            return {
                "valid": True,
                "nif": nif_clean,
                "nome_agt": nome_final,
                "estado": "Activo",
                "tipo": parsed.get("tipo"),
                "source": "agt",
                "message": f"NIF validado: {nome_final}"
            }

        except Exception as e:
            logger.error(f"AGT erro para {nif_clean}: {e}")
            # AGORA NÃO ACEITA QUALQUER NUMERO - BLOQUEIA
            return {
                "valid": False,
                "nif": nif_clean,
                "nome_agt": None,
                "estado": "AGT_Offline",
                "tipo": None,
                "source": "error",
                "message": "AGT temporariamente offline, tente novamente em 1 min. NIF não validado."
            }
