import httpx
import re
import time
from typing import Dict, Optional
import logging
from collections import defaultdict

logger = logging.getLogger(__name__)

URL_CONSULTA = "https://portaldocontribuinte.minfin.gov.ao/consultar-nif-do-contribuinte"

_CACHE: Dict[str, tuple[float, Dict]] = {}
_CACHE_TTL = 86400
_RATE_LIMIT: Dict[str, list[float]] = defaultdict(list)
_RATE_LIMIT_MAX = 10
_RATE_WINDOW = 60

def _is_rate_limited(nif: str) -> bool:
    now = time.time()
    _RATE_LIMIT[nif] = [t for t in _RATE_LIMIT[nif] if now - t < _RATE_WINDOW]
    if len(_RATE_LIMIT[nif]) >= _RATE_LIMIT_MAX:
        return True
    _RATE_LIMIT[nif].append(now)
    return False

def clean_nif(nif: str) -> str:
    if not nif or not isinstance(nif, str):
        return ""
    nif = nif.strip()[:20]
    return re.sub(r'[^A-Za-z0-9]', '', nif).upper()

def is_valid_format(nif: str) -> bool:
    nif_clean = clean_nif(nif)
    if not nif_clean or len(set(nif_clean)) == 1:
        return False
    if re.match(r'^(0{9,}|1{9,}|2{9,}|3{9,}|4{9,}|5{9,}|6{9,}|7{9,}|8{9,}|9{9,}|123456789)$', nif_clean):
        return False
    if nif_clean.isdigit():
        return 9 <= len(nif_clean) <= 14
    if re.match(r'^\d{9}[A-Z]{2}\d{3}$', nif_clean):
        return True
    if 12 <= len(nif_clean) <= 14 and any(c.isalpha() for c in nif_clean):
        return len(re.sub(r'\D', '', nif_clean)) >= 9
    return False

def parse_agt_real(html_cdata: str, nif_consultado: str) -> Optional[Dict]:
    if not html_cdata or len(html_cdata.strip()) < 50:
        return {"bloqueio_ip": True}
    lower = html_cdata.lower()
    if "nif inexistente" in lower or "contribuinte não encontrado" in lower or "nif não existe" in lower:
        return None
    if "taxpayer" not in lower and "resultado da consulta" not in lower and "taxPayerNidId" not in html_cdata:
        return None

    def extract(label: str) -> Optional[str]:
        # Tenta pegar <label>Tipo:</label><div><label>VALOR</label>
        pattern = rf"{label}:\s*</label>\s*<div[^>]*>\s*<label[^>]*>([^<]+)</label>"
        m = re.search(pattern, html_cdata, re.I)
        if m:
            return m.group(1).strip()[:255]
        # Fallback para casos com espaço
        pattern2 = rf"{label}\s*:\s*</label>.*?>([^<]+)</label>"
        m2 = re.search(pattern2, html_cdata, re.I | re.DOTALL)
        return m2.group(1).strip()[:255] if m2 else None

    nif_val = extract("NIF")
    if not nif_val:
        m = re.search(r'id="taxPayerNidId"[^>]*>([^<]+)</label>', html_cdata)
        nif_val = m.group(1).strip()[:50] if m else nif_consultado

    nome = extract("Nome")
    if not nome:
        matches = re.findall(r'<label class="control-label text-left">([^<]+)</label>', html_cdata)
        for val in matches:
            v = val.strip()
            if v and v.upper()!= nif_consultado and 4 < len(v) < 255:
                if v.lower() not in ["activo", "inactivo", "singular", "colectivo", "não", "sim"]:
                    nome = v
                    break
    if not nome:
        return None

    # NOVO: pega os campos que você pediu
    tipo = extract("Tipo")
    estado = extract("Estado")
    inadimplente = extract("Inadimplente")
    regime_iva = extract("Regime de IVA")
    residente = None
    if "residente fiscal" in lower:
        # Residente Fiscal vem sem valor, só como label presente
        residente = "Sim" if "residente" in lower else None
        # tenta pegar valor depois
        m_res = re.search(r"Residente Fiscal:\s*</label>\s*<div[^>]*>\s*<label[^>]*>([^<]+)</label>", html_cdata, re.I)
        if m_res:
            residente = m_res.group(1).strip()[:20]
        else:
            residente = "Sim" # se a seção existe, é residente

    return {
        "nif": nif_val,
        "nome": nome,
        "tipo": tipo or ("SINGULAR" if "LA" in nif_consultado else "COLECTIVO"),
        "estado": estado or "Activo",
        "inadimplente": inadimplente,
        "regime_iva": regime_iva,
        "residente_fiscal": residente
    }

async def validate_nif_agt(nif: str) -> Dict:
    nif_clean = clean_nif(nif)
    if not is_valid_format(nif_clean):
        return {"valid": False, "nif": nif_clean, "nome_agt": None, "estado": "FormatoInvalido", "tipo": None, "source": "format", "message": "Formato de NIF inválido", "inadimplente": None, "regime_iva": None, "residente_fiscal": None}

    if nif_clean in _CACHE:
        ts, data = _CACHE[nif_clean]
        if time.time() - ts < _CACHE_TTL:
            logger.info(f"AGT cache hit {nif_clean}")
            return data

    if _is_rate_limited(nif_clean):
        return {"valid": False, "nif": nif_clean, "nome_agt": None, "estado": "AGT_Offline", "tipo": None, "source": "ratelimit", "message": "Muitas tentativas para este NIF, aguarde 1 minuto", "inadimplente": None, "regime_iva": None, "residente_fiscal": None}

    async with httpx.AsyncClient(timeout=15.0, follow_redirects=True, verify=False, headers={"User-Agent": "Mozilla/5.0 FaturaXpress"}) as client:
        try:
            r_get = await client.get(URL_CONSULTA)
            vs_matches = re.findall(r'name="javax\.faces\.ViewState"[^>]*value="([^"]+)"', r_get.text)
            view_state = vs_matches[len(vs_matches)-1] if len(vs_matches) > 0 else ""
            if not view_state:
                raise Exception("ViewState falhou")

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
            r_post = await client.post(URL_CONSULTA, data=data, headers={"Faces-Request": "partial/ajax", "X-Requested-With": "XMLHttpRequest", "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8"})
            cdata_list = re.findall(r'<update id="showpanelNIF"><!\[CDATA\[(.*?)\]\]></update>', r_post.text, re.DOTALL)
            html_result = cdata_list[0] if len(cdata_list) > 0 else r_post.text

            parsed = parse_agt_real(html_result, nif_clean)
            if parsed is None:
                res = {"valid": False, "nif": nif_clean, "nome_agt": None, "estado": "NaoEncontrado", "tipo": None, "source": "agt", "message": "NIF não existe na AGT", "inadimplente": None, "regime_iva": None, "residente_fiscal": None}
                _CACHE[nif_clean] = (time.time(), res)
                return res
            if parsed.get("bloqueio_ip"):
                raise Exception("AGT bloqueou IP")

            nome_raw = parsed.get("nome")
            nome_final: Optional[str] = nome_raw.strip().upper()[:255] if isinstance(nome_raw, str) else None
            nif_ret = parsed.get("nif")
            nif_final = nif_ret[:50] if isinstance(nif_ret, str) else nif_clean
            estado_raw = parsed.get("estado")
            estado_final = estado_raw[:20] if isinstance(estado_raw, str) else "Activo"
            tipo_raw = parsed.get("tipo")
            tipo_final = tipo_raw[:100] if isinstance(tipo_raw, str) else None

            inadimplente_raw = parsed.get("inadimplente")
            regime_raw = parsed.get("regime_iva")
            residente_raw = parsed.get("residente_fiscal")

            if not nome_final:
                res = {"valid": False, "nif": nif_clean, "nome_agt": None, "estado": "NaoEncontrado", "tipo": None, "source": "agt", "message": "NIF não existe na AGT", "inadimplente": None, "regime_iva": None, "residente_fiscal": None}
                _CACHE[nif_clean] = (time.time(), res)
                return res

            final = {
                "valid": True,
                "nif": nif_final,
                "nome_agt": nome_final,
                "estado": estado_final,
                "tipo": tipo_final,
                "inadimplente": inadimplente_raw[:10] if isinstance(inadimplente_raw, str) else None,
                "regime_iva": regime_raw[:150] if isinstance(regime_raw, str) else None,
                "residente_fiscal": residente_raw[:20] if isinstance(residente_raw, str) else None,
                "source": "agt",
                "message": f"NIF validado: {nome_final}"
            }
            _CACHE[nif_clean] = (time.time(), final)
            return final

        except Exception as e:
            logger.warning(f"AGT erro/offline para {nif_clean}: {e}")
            return {"valid": False, "nif": nif_clean, "nome_agt": None, "estado": "AGT_Offline", "tipo": None, "source": "offline", "message": "AGT temporariamente offline", "inadimplente": None, "regime_iva": None, "residente_fiscal": None}
