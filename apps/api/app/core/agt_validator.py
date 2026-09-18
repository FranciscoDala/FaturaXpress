import httpx
import re
from typing import Dict, Optional
from typing import Dict
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
        return len(re.sub(r'\D','', nif_clean)) >= 9
    return False
def parse_agt_html(html: str, nif_consultado: str) -> Optional[Dict]:
    if "taxPayerNidId" not in html or nif_consultado not in html:
        if "NIF inexistente" in html or "não encontrado" in html.lower() or "NaoEncontrado" in html:
            return None
        return None # antes estava {} aqui que dava o conflito

    def extract(label):
        pattern = rf"{label}:\s*</label>\s*<div[^>]*>\s*<label[^>]*>([^<]+)</label>"
        m = re.search(pattern, html, re.I)
        return m.group(1).strip() if m else None

    nome = extract("Nome")
    if not nome:
        m = re.findall(r'<label class="control-label text-left">([^<]+)</label>', html)
        if m:
            nome = m[0].strip()

    tipo = extract("Tipo") or ("SINGULAR" if "LA" in nif_consultado else "COLECTIVO")
    estado = extract("Estado") or "Activo"
    inadimplente = extract("Inadimplente")

    return {
        "nome": nome,
        "tipo": tipo,
        "estado": estado,
        "inadimplente": inadimplente
    }


async def validate_nif_agt(nif: str) -> Dict:
    nif_clean = clean_nif(nif)

    if not is_valid_format(nif_clean):
        return {
            "valid": False, "nif": nif_clean, "nome_agt": None,
            "estado": "FormatoInvalido", "tipo": None, "source": "format",
            "message": f"Formato inválido: {nif}. Use 50020633956 ou 003614847LA037"
        }

    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) FaturaXpress/1.0",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "pt-PT,pt;q=0.9",
    }

    async with httpx.AsyncClient(timeout=20.0, follow_redirects=True, verify=False, headers=headers) as client:
        try:
            # 1. GET inicial para pegar ViewState
            r_get = await client.get(URL_CONSULTA)
            if r_get.status_code!= 200:
                raise Exception(f"GET falhou {r_get.status_code}")

            html_get = r_get.text
            # pega último ViewState
            vs_matches = re.findall(r'name="javax\.faces\.ViewState"[^>]*value="([^"]+)"', html_get)
            if not vs_matches:
                vs_matches = re.findall(r'ViewState[^"]*value="([^"]+)"', html_get)
            view_state = vs_matches[-1] if vs_matches else ""

            if not view_state:
                logger.warning("ViewState não encontrado")
                raise Exception("ViewState não encontrado")

            # 2. POST JSF - simula clique Pesquisar
            form_data = {
                "j_id_2x": "j_id_2x",
                "j_id_2x:txtNIFNumber": nif_clean,
                "j_id_2x_SUBMIT": "1",
                "javax.faces.ViewState": view_state,
                "j_id_2x:j_id_34": "j_id_2x:j_id_34"
            }

            # Header que o PrimeFaces usa
            ajax_headers = {
                "Faces-Request": "partial/ajax",
                "X-Requested-With": "XMLHttpRequest",
                "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8"
            }

            r_post = await client.post(URL_CONSULTA, data=form_data, headers={**headers, **ajax_headers})

            # PrimeFaces retorna XML com <update id="showpanelNIF"><![CDATA[ HTML ]]>
            text = r_post.text

            # Tenta extrair CDATA
            cdata_match = re.search(r'<!\[CDATA\[(.*?)\]\]>', text, re.DOTALL)
            if cdata_match:
                html_result = cdata_match.group(1)
            else:
                html_result = text

            # Se ainda não tem taxPayerNidId, tenta POST normal (sem ajax) - fallback
            if "taxPayerNidId" not in html_result:
                r_post2 = await client.post(
                    "https://portaldocontribuinte.minfin.gov.ao/consultar-headNifId-do-contribuinte",
                    data={
                        "j_id_2x:txtNIFNumber": nif_clean,
                        "j_id_2x_SUBMIT": "1",
                        "javax.faces.ViewState": view_state
                    },
                    headers=headers
                )
                html_result = r_post2.text

            parsed = parse_agt_html(html_result, nif_clean)

            if parsed is None:
                return {
                    "valid": False, "nif": nif_clean, "nome_agt": None,
                    "estado": "NaoEncontrado", "tipo": None, "source": "agt",
                    "message": "NIF não encontrado na AGT"
                }

            if not parsed:
                # não encontrou bloco, mas também não deu erro -> trata como offline
                raise Exception("Bloco de resultado não encontrado")

            nome = parsed.get("nome")
            estado_raw = parsed.get("estado", "Activo")
            tipo = parsed.get("tipo")

            is_active = "activ" in estado_raw.lower()

            return {
                "valid": is_active,
                "nif": nif_clean,
                "nome_agt": nome.upper() if nome else None,
                "estado": "Activo" if is_active else "Inactivo",
                "tipo": tipo,
                "source": "agt",
                "message": "NIF validado na AGT" if nome else "NIF Activo mas sem nome"
            }

        except Exception as e:
            logger.warning(f"AGT falhou para {nif_clean}: {e}, usando fallback")
            return {
                "valid": True,
                "nif": nif_clean,
                "nome_agt": None,
                "estado": "AGT_Offline",
                "tipo": "Colectivo" if nif_clean.isdigit() else "Singular",
                "source": "fallback",
                "message": "AGT temporariamente indisponível, NIF aceite com verificação pendente"
            }
