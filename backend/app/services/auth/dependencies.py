import jwt
from fastapi import Depends, HTTPException, Request
from sqlalchemy.orm import Session

from app.models.database import get_db
from app.models.orm_models import User
from app.services.auth.redis_session import is_token_blacklisted
from app.services.auth.security import decode_access_token

COOKIE_NAME = "access_token"


def get_current_user(request: Request, db: Session = Depends(get_db)) -> User:
    token = request.cookies.get(COOKIE_NAME)
    auth_header = request.headers.get("Authorization")
    if not token and auth_header and auth_header.startswith("Bearer "):
        token = auth_header[7:]

    if not token:
        raise HTTPException(status_code=401, detail="not authenticated")

    try:
        payload = decode_access_token(token)
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="invalid or expired token")

    if is_token_blacklisted(payload["jti"]):
        raise HTTPException(status_code=401, detail="token revoked")

    user = db.get(User, payload["sub"])
    if user is None:
        raise HTTPException(status_code=401, detail="user not found")
    return user