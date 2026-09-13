import uuid
from datetime import datetime, timedelta, timezone
from passlib.context import CryptContext
from jose import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer

from app.core.config import settings # <- pega do config
from app.core.jwt import decode_access_token

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")

def hash_password(password: str) -> str:
    """Gera o hash da senha com bcrypt"""
    return pwd_context.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verifica se a senha bate com o hash"""
    return pwd_context.verify(plain_password, hashed_password)

def create_access_token(data: dict) -> str:
    """Cria o JWT com company_id dentro"""
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.JWT_ALGORITHM) # <- usa settings
    return encoded_jwt

def generate_id() -> str:
    return str(uuid.uuid4())

async def get_current_user_id(token: str = Depends(oauth2_scheme)) -> uuid.UUID:
    """Pega o user_id do token"""
    payload = decode_access_token(token)
    user_id = payload.get("sub")
    if user_id is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token inválido",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return uuid.UUID(user_id)

async def get_current_company_id(token: str = Depends(oauth2_scheme)) -> uuid.UUID:
    """Pega o company_id do token. É esse que vamos usar em tudo"""
    payload = decode_access_token(token)
    company_id = payload.get("company_id")
    if company_id is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token sem empresa",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return uuid.UUID(company_id)
