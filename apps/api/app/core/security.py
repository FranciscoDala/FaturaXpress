import uuid
import re
from passlib.context import CryptContext
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from app.core.jwt import decode_access_token

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto", bcrypt__rounds=12)
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")

def validate_password_strength(password: str) -> bool:
    if len(password) < 8 or len(password) > 128:
        return False
    if not re.search(r"[A-Za-z]", password):
        return False
    if not re.search(r"\d", password):
        return False
    return True

def hash_password(password: str) -> str:
    if not validate_password_strength(password):
        raise HTTPException(status_code=400, detail="Senha fraca: mínimo 8 chars com letra e número")
    return pwd_context.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    try:
        return pwd_context.verify(plain_password, hashed_password)
    except Exception:
        return False

def generate_id() -> str:
    return str(uuid.uuid4())

async def get_current_user_id(token: str = Depends(oauth2_scheme)) -> uuid.UUID:
    payload = decode_access_token(token)
    user_id = payload.get("sub")
    if user_id is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token inválido", headers={"WWW-Authenticate": "Bearer"})
    try:
        return uuid.UUID(user_id)
    except ValueError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token inválido")

async def get_current_company_id(token: str = Depends(oauth2_scheme)) -> uuid.UUID:
    payload = decode_access_token(token)
    company_id = payload.get("company_id")
    if company_id is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token sem empresa", headers={"WWW-Authenticate": "Bearer"})
    try:
        return uuid.UUID(company_id)
    except ValueError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token inválido")

# NOVO - SEM APAGAR OS DE CIMA
async def get_current_payload(token: str = Depends(oauth2_scheme)) -> dict:
    return decode_access_token(token)

async def get_current_company_and_funcionario(token: str = Depends(oauth2_scheme)):
    payload = decode_access_token(token)
    company_id = uuid.UUID(payload.get("company_id"))
    funcionario_id = None
    if payload.get("tipo") == "funcionario":
        try:
            funcionario_id = uuid.UUID(payload.get("sub"))
        except:
            pass
    return {
        "company_id": company_id,
        "funcionario_id": funcionario_id,
        "cargo": payload.get("cargo", "admin"),
        "tipo": payload.get("tipo", "company"),
        "payload": payload
    }

async def get_current_user_role(token: str = Depends(oauth2_scheme)) -> str:
    payload = decode_access_token(token)
    return payload.get("cargo") or payload.get("role") or "admin"
