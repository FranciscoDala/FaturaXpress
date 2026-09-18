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

def parse_agt_real(html_cdata: str, nif_consultado: str) -> Optional[Dict]:
    lower = html_cdata.lower()
    if len(html_cdata.strip()) < 100:
        return {"bloqueio_ip": True}

    if "nif inexistente" in lower or "contribuinte não encontrado" in lower or "nif não existe" in lower:
        return None

    if "taxpayer" not in lower and "resultado da consulta" not in lower and "taxPayerNidId" not in html_cdata:
        return None

    def extract(label: str) -> Optional[str]:
        pattern = rf"{label}:\s*</label>\s*<div[^>]*>\s*<label[^>]*>([^<]+)</label>"
        m = re.search(pattern, html_cdata, re.I)
        return m.group(1).strip() if m else None

    nif_val = extract("NIF")
    if not nif_val:
        m = re.search(r'id="taxPayerNidId"[^>]*>([^<]+)</label>', html_cdata)
        nif_val = m.group(1).strip() if m else nif_consultado

    nome = extract("Nome")
    if not nome:
        matches = re.findall(r'<label class="control-label text-left">([^<]+)</label>', html_cdata)
        for val in matches:
            v = val.strip()
            if v and v.upper()!= nif_consultado and len(v) > 4:
                if v.lower() not in ["activo", "inactivo", "singular", "colectivo", "não", "sim"]:
                    nome = v
                    break

    if not nome:
        return None

    return {
        "nif": nif_val,
        "nome": nome,
        "tipo": extract("Tipo") or ("SINGULAR" if "LA" in nif_consultado else "COLECTIVO"),
        "estado": extract("Estado") or "Activo"
    }

async def validate_nif_agt(nif: str) -> Dict:
    nif_clean = clean_nif(nif)
    if not is_valid_format(nif_clean):
        return {"valid": False, "nif": nif_clean, "nome_agt": None, "estado": "FormatoInvalido", "tipo": None, "source": "format", "message": "Formato de NIF inválido"}

    async with httpx.AsyncClient(timeout=25.0, follow_redirects=True, verify=False, headers={"User-Agent": "Mozilla/5.0 FaturaXpress"}) as client:
        try:
            r_get = await client.get(URL_CONSULTA)
            vs_matches = re.findall(r'name="javax\.faces\.ViewState"[^>]*value="([^"]+)"', r_get.text)
            view_state = vs_matches[len(vs_matches)-1] if len(vs_matches) > 0 else ""
            if not view_state:
                raise Exception("ViewState falhou - AGT offline")

            data = {
                "javax.faces.partial.ajax": "true",
                "javax.faces.source": "j_id_2x:j_id_34",
                "javax.faces.partial.execute": "j_id_2x",
                "javax.faces.partial.render": "showpanelNIF",
                "j_id_2x:j_id_34": "j_id_2x:j_id_34",
                "j_id_2x": "j_id_2x",
                "j_id_2x:txtNIFNumber": nif_clean,
                "j_id_2x_SUBMIT": "1",
                "javax.faces.ViewState": view_state
            }

            r_post = await client.post(
                URL_CONSULTA,
                data=data,
                headers={
                    "Faces-Request": "partial/ajax",
                    "X-Requested-With": "XMLHttpRequest",
                    "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8"
                }
            )

            cdata_list = re.findall(r'<update id="showpanelNIF"><!\[CDATA\[(.*?)\]\]></update>', r_post.text, re.DOTALL)
            html_result = cdata_list[0] if len(cdata_list) > 0 else r_post.text

            logger.info(f"AGT CDATA {nif_clean}: {html_result[:800]}")

            parsed = parse_agt_real(html_result, nif_clean)

            if parsed is None:
                return {"valid": False, "nif": nif_clean, "nome_agt": None, "estado": "NaoEncontrado", "tipo": None, "source": "agt", "message": "NIF não existe na AGT"}

            if parsed.get("bloqueio_ip"):
                raise Exception("AGT bloqueou IP estrangeiro - CDATA vazio")

            # CORREÇÃO AQUI - evita erro "upper não é atributo de None"
            nome_raw = parsed.get("nome")
            if isinstance(nome_raw, str):
                nome_final: Optional[str] = nome_raw.strip().upper()
            else:
                nome_final = None

            nif_ret = parsed.get("nif")
            nif_final = nif_ret if isinstance(nif_ret, str) else nif_clean

            estado_raw = parsed.get("estado")
            estado_final = estado_raw if isinstance(estado_raw, str) else "Activo"

            tipo_raw = parsed.get("tipo")
            tipo_final = tipo_raw if isinstance(tipo_raw, str) else None

            if not nome_final:
                return {"valid": False, "nif": nif_clean, "nome_agt": None, "estado": "NaoEncontrado", "tipo": None, "source": "agt", "message": "NIF não existe na AGT"}

            return {
                "valid": True,
                "nif": nif_final,
                "nome_agt": nome_final,
                "estado": estado_final,
                "tipo": tipo_final,
                "source": "agt",
                "message": f"NIF validado: {nome_final}"
            }

        except Exception as e:
            logger.warning(f"AGT erro/offline para {nif_clean}: {e}")
            return {
                "valid": False,
                "nif": nif_clean,
                "nome_agt": None,
                "estado": "AGT_Offline",
                "tipo": None,
                "source": "offline",
                "message": "AGT temporariamente offline ou bloqueada para IP estrangeiro. Tente validação no navegador."
            }
