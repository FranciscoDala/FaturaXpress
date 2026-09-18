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
    if not nif_clean:
        return False
    if len(set(nif_clean)) == 1:
        return False
    if nif_clean.isdigit():
        return 9 <= len(nif_clean) <= 14
    if re.match(r'^\d{9}[A-Z]{2}\d{3}$', nif_clean):
        return True
    if 12 <= len(nif_clean) <= 14 and any(c.isalpha() for c in nif_clean):
        digits_only = re.sub(r'\D', '', nif_clean)
        return len(digits_only) >= 9
    return False

def parse_agt_html(html: str, nif_consultado: str) -> Optional[Dict]:
    html_lower = html.lower()

    if "nif inexistente" in html_lower or "contribuinte não encontrado" in html_lower:
        return None
    if "nif não existe" in html_lower:
        return None

    if "taxpayer" not in html_lower and "resultado da consulta" not in html_lower:
        logger.warning(f"AGT HTML sem resultado: {html[:500]}")
        return {}

    def extract(label: str) -> Optional[str]:
        pattern = rf"{label}:\s*</label>\s*<div[^>]*>\s*<label[^>]*>([^<]+)</label>"
        m = re.search(pattern, html, re.I)
        if m:
            val = m.group(1).strip()
            return val if val else None
        return None

    nome: Optional[str] = extract("Nome")
    if not nome:
        matches = re.findall(r'<label class="control-label text-left">([^<]+)</label>', html)
        if matches:
            for val in matches:
                v = val.strip()
                if v and v.upper()!= nif_consultado and len(v) > 3:
                    if v.lower() not in ["activo", "inactivo", "singular", "colectivo"]:
                        nome = v
                        break

    tipo: Optional[str] = extract("Tipo")
    if not tipo:
        tipo = "SINGULAR" if "LA" in nif_consultado else "COLECTIVO"

    estado: Optional[str] = extract("Estado")
    if not estado:
        estado = "Activo"

    if not nome and "taxpayer" not in html_lower:
        return {}

    return {
        "nome": nome,
        "tipo": tipo,
        "estado": estado,
    }

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
            "message": f"Formato inválido: {nif}"
        }

    headers = {
        "User-Agent": "Mozilla/5.0 FaturaXpress",
        "Accept": "text/html, */*",
    }

    async with httpx.AsyncClient(timeout=25.0, follow_redirects=True, verify=False, headers=headers) as client:
        try:
            r_get = await client.get(URL_CONSULTA)
            vs_matches = re.findall(r'name="javax\.faces\.ViewState"[^>]*value="([^"]+)"', r_get.text)
            view_state = vs_matches[len(vs_matches)-1] if len(vs_matches) > 0 else ""

            if not view_state:
                raise Exception("ViewState não encontrado")

            form_data = {
                "j_id_2x": "j_id_2x",
                "j_id_2x:txtNIFNumber": nif_clean,
                "j_id_2x_SUBMIT": "1",
                "javax.faces.ViewState": view_state,
            }

            r_post = await client.post(
                URL_CONSULTA,
                data=form_data,
                headers={
                    "Faces-Request": "partial/ajax",
                    "X-Requested-With": "XMLHttpRequest",
                    "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
                    "User-Agent": "Mozilla/5.0 FaturaXpress"
                }
            )

            text = r_post.text
            cdata_list = re.findall(r'<!\[CDATA\[(.*?)\]\]>', text, re.DOTALL)
            html_result = "".join(cdata_list) if len(cdata_list) > 0 else text

            logger.info(f"AGT HTML snippet: {html_result[:800]}")

            parsed = parse_agt_html(html_result, nif_clean)

            if parsed is None:
                return {
                    "valid": False,
                    "nif": nif_clean,
                    "nome_agt": None,
                    "estado": "NaoEncontrado",
                    "tipo": None,
                    "source": "agt",
                    "message": "NIF não encontrado na AGT"
                }

            if not parsed or parsed.get("nome") is None:
                m_nome = re.search(r'Nome:\s*</label>.*?>([^<]{5,})<', html_result, re.I | re.DOTALL)
                if m_nome:
                    nome_fb_raw = m_nome.group(1).strip()
                    if isinstance(nome_fb_raw, str) and len(nome_fb_raw) > 3:
                        return {
                            "valid": True,
                            "nif": nif_clean,
                            "nome_agt": nome_fb_raw.upper(),
                            "estado": "Activo",
                            "tipo": "SINGULAR" if "LA" in nif_clean else "COLECTIVO",
                            "source": "agt",
                            "message": "NIF validado na AGT"
                        }
                raise Exception("Parse vazio -> fallback")

            nome_val = parsed.get("nome")
            nome_final: Optional[str] = None
            if isinstance(nome_val, str):
                nome_final = nome_val.upper()

            estado_raw = parsed.get("estado")
            estado_str = estado_raw if isinstance(estado_raw, str) else "Activo"
            is_active = "activ" in estado_str.lower()

            tipo_val = parsed.get("tipo")
            tipo_str = tipo_val if isinstance(tipo_val, str) else ("SINGULAR" if "LA" in nif_clean else "COLECTIVO")

            return {
                "valid": True if is_active else False,
                "nif": nif_clean,
                "nome_agt": nome_final,
                "estado": "Activo" if is_active else "Inactivo",
                "tipo": tipo_str,
                "source": "agt",
                "message": "NIF validado na AGT"
            }

        except Exception as e:
            logger.warning(f"AGT fallback para {nif_clean}: {e}")
            return {
                "valid": True,
                "nif": nif_clean,
                "nome_agt": None,
                "estado": "AGT_Offline",
                "tipo": "Colectivo" if nif_clean.isdigit() else "Singular",
                "source": "fallback",
                "message": "AGT offline, NIF aceite com verificação pendente"
            }
