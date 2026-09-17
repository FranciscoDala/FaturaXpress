import base64
import json
import time
import uuid
import os
import logging
import hashlib
from typing import Optional, Dict, Any

try:
    import requests # type: ignore
except ImportError:
    requests = None # type: ignore

try:
    from Crypto.PublicKey import RSA # type: ignore
    from Crypto.Signature import PKCS1_v1_5 # type: ignore
    from Crypto.Hash import SHA256 # type: ignore
    HAS_CRYPTO = True
except ImportError:
    RSA = None # type: ignore
    PKCS1_v1_5 = None # type: ignore
    SHA256 = None # type: ignore
    HAS_CRYPTO = False

logger = logging.getLogger(__name__)

PAYPAY_API = os.getenv("PAYPAY_API_URL", "https://api.paypayafrica.com").rstrip("/")
PARTNER_ID = os.getenv("PAYPAY_PARTNER_ID")
SALE_PRODUCT_CODE = os.getenv("PAYPAY_PRODUCT_CODE", "PAYPAY_PAY")
PRIVATE_KEY_PEM = os.getenv("PAYPAY_PRIVATE_KEY")
PAYPAY_PUBLIC_KEY_PEM = os.getenv("PAYPAY_PUBLIC_KEY")
NOTIFY_URL = os.getenv("PAYPAY_NOTIFY_URL", "https://faturaxpress-backend.onrender.com/assinatura/webhook/paypay")
RETURN_URL = os.getenv("PAYPAY_RETURN_URL", "https://faturaxpress.onrender.com/app/assinatura/sucesso")

def _format_private_key(pem: Optional[str]) -> str:
    if not pem:
        return ""
    return pem.replace("\\n", "\n").strip()

def is_configured() -> bool:
    return bool(PARTNER_ID and PRIVATE_KEY_PEM and HAS_CRYPTO and requests)

def _sha256_file(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()

def sign(content: str) -> str:
    if not HAS_CRYPTO:
        raise RuntimeError("pycryptodome não instalado")
    key_str = _format_private_key(PRIVATE_KEY_PEM)
    if not key_str:
        raise ValueError("PAYPAY_PRIVATE_KEY vazia")
    key = RSA.import_key(key_str) # type: ignore
    h = SHA256.new(content.encode('utf-8')) # type: ignore
    signer = PKCS1_v1_5.new(key) # type: ignore
    return base64.b64encode(signer.sign(h)).decode()

def verify_paypay_signature(content: str, signature_b64: str) -> bool:
    """Verifica webhook vindo do PayPay - CRÍTICO pra segurança"""
    try:
        if not PAYPAY_PUBLIC_KEY_PEM or not HAS_CRYPTO:
            logger.warning("PAYPAY_PUBLIC_KEY não configurada - webhook não verificado!")
            return False # Em produção deve retornar False
        key_str = _format_private_key(PAYPAY_PUBLIC_KEY_PEM)
        key = RSA.import_key(key_str) # type: ignore
        h = SHA256.new(content.encode('utf-8')) # type: ignore
        verifier = PKCS1_v1_5.new(key) # type: ignore
        return verifier.verify(h, base64.b64decode(signature_b64))
    except Exception as e:
        logger.error(f"Falha ao verificar assinatura PayPay: {e}")
        return False

def build_request(biz_content: dict) -> dict:
    if not is_configured():
        raise RuntimeError("PayPay não configurado")
    request_no = f"FX{int(time.time())}{uuid.uuid4().hex[:6].upper()}"
    timestamp = str(int(time.time() * 1000))
    biz_str = json.dumps(biz_content, separators=(',', ':'), ensure_ascii=False)
    to_sign = f"{PARTNER_ID}{timestamp}{request_no}{biz_str}"
    return {
        "partner_id": PARTNER_ID,
        "timestamp": timestamp,
        "request_no": request_no,
        "biz_content": biz_str,
        "sign": sign(to_sign),
        "sign_type": "RSA"
    }

def _post(endpoint: str, biz_content: dict) -> Dict[str, Any]:
    if not is_configured():
        return {"success": False, "msg": "PayPay não configurado"}
    payload = build_request(biz_content)
    url = f"{PAYPAY_API}{endpoint}"
    try:
        r = requests.post(url, json=payload, timeout=25) # type: ignore
        r.raise_for_status()
        data = r.json()
        # Nunca loga sign completo
        logger.info(f"PayPay {endpoint} code={data.get('code')}")
        return data
    except Exception as e:
        logger.error(f"Erro PayPay {endpoint}: {e}")
        return {"code": "ERROR", "msg": "Falha de comunicação com gateway", "success": False}

def create_reference(amount: int, plan_id: str, company_id: str) -> Dict[str, Any]:
    biz = {
        "out_trade_no": f"{str(company_id)[:8]}-{plan_id}-{int(time.time())}",
        "subject": f"FaturaXpress {plan_id.upper()}",
        "total_amount": str(int(amount)), # força inteiro, evita 8500.00 manipulation
        "currency": "AOA",
        "sale_product_code": SALE_PRODUCT_CODE,
        "timeout_express": "24h",
        "notify_url": NOTIFY_URL,
        "return_url": RETURN_URL,
    }
    return _post("/payment/reference", biz)

def query_status(out_trade_no: str) -> Dict[str, Any]:
    return _post("/query/status", {"out_trade_no": out_trade_no})
