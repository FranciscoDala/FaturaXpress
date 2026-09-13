import uuid
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from.jwt import decode_access_token

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")

async def get_current_user_id(token: str = Depends(oauth2_scheme)) -> uuid.UUID:
    payload = decode_access_token(token)
    user_id = payload.get("sub") # <- sem :str
    if user_id is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token inválido")
    return uuid.UUID(user_id)

async def get_current_company_id(token: str = Depends(oauth2_scheme)) -> uuid.UUID:
    payload = decode_access_token(token)
    company_id = payload.get("company_id") # <- sem :str
    if company_id is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token sem empresa")
    return uuid.UUID(company_id)
