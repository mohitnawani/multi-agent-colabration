from datetime import datetime, timezone

import jwt
from fastapi import APIRouter, Depends, HTTPException, Request, Response
from sqlalchemy.orm import Session

from app.config import settings
from app.models.database import get_db
from app.models.orm_models import User
from app.models.schemas import UserLogin, UserOut, UserRegister
from app.services.auth.dependencies import COOKIE_NAME, get_current_user
from app.services.auth.redis_session import blacklist_token
from app.services.auth.security import create_access_token, hash_password, verify_password

router = APIRouter()


def _set_auth_cookie(response: Response, token: str) -> None:
    response.set_cookie(
        key=COOKIE_NAME,
        value=token,
        httponly=True,
        samesite="lax",
        secure=settings.cookie_secure,
        max_age=60 * 60 * 24 * 7,
        path="/",
    )


@router.post("/auth/register", status_code=201)
def register(payload: UserRegister, response: Response, db: Session = Depends(get_db)):
    existing = db.query(User).filter(User.email == payload.email).first()
    if existing:
        raise HTTPException(status_code=409, detail="email already registered")

    user = User(
        name=payload.name,
        email=payload.email,
        password_hash=hash_password(payload.password),
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    token, _, _ = create_access_token(user.id)
    _set_auth_cookie(response, token)
    return {"message": "registered", "user": UserOut.model_validate(user)}


@router.post("/auth/login")
def login(payload: UserLogin, response: Response, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == payload.email).first()
    if user is None or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=401, detail="invalid email or password")

    token, _, _ = create_access_token(user.id)
    _set_auth_cookie(response, token)
    return {"message": "logged in", "user": UserOut.model_validate(user)}


@router.post("/auth/logout")
def logout(request: Request, response: Response):
    token = request.cookies.get(COOKIE_NAME)
    auth_header = request.headers.get("Authorization")
    if not token and auth_header and auth_header.startswith("Bearer "):
        token = auth_header[7:]

    if token:
        try:
            payload = jwt.decode(
                token,
                "unused",
                algorithms=[],
                options={"verify_signature": False, "verify_exp": False},
            )
            ttl = max(1, int(payload.get("exp", 0)) - int(datetime.now(timezone.utc).timestamp()))
            blacklist_token(payload["jti"], ttl)
        except Exception:
            pass

    response.delete_cookie(COOKIE_NAME, path="/")
    return {"message": "logged out"}


@router.get("/auth/me")
def me(user: User = Depends(get_current_user)):
    return UserOut.model_validate(user)