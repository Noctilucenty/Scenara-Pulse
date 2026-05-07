from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from jose import JWTError, jwt
from passlib.context import CryptContext
from pydantic import BaseModel

from app.config import settings
from app.db import get_db
from app.models.admin import PulseAdmin

router = APIRouter()
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/token")


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    admin_id: int
    email: str
    display_name: str | None
    role: str


def create_token(admin_id: int, email: str, role: str) -> str:
    expire = datetime.utcnow() + timedelta(hours=settings.access_token_expire_hours)
    return jwt.encode(
        {"sub": str(admin_id), "email": email, "role": role, "exp": expire},
        settings.jwt_secret_key,
        algorithm=settings.jwt_algorithm,
    )


def get_current_admin(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)) -> PulseAdmin:
    try:
        payload = jwt.decode(token, settings.jwt_secret_key, algorithms=[settings.jwt_algorithm])
        admin_id = int(payload["sub"])
    except (JWTError, KeyError, ValueError):
        raise HTTPException(status_code=401, detail="Invalid or expired credentials")

    admin = db.query(PulseAdmin).filter(PulseAdmin.id == admin_id, PulseAdmin.is_active == True).first()
    if not admin:
        raise HTTPException(status_code=401, detail="Admin account not found or disabled")
    return admin


@router.post("/token", response_model=TokenResponse)
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    admin = db.query(PulseAdmin).filter(PulseAdmin.email == form_data.username).first()
    if not admin or not pwd_context.verify(form_data.password, admin.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    if not admin.is_active:
        raise HTTPException(status_code=403, detail="Account disabled")

    admin.last_login = datetime.utcnow()
    db.commit()

    return TokenResponse(
        access_token=create_token(admin.id, admin.email, admin.role),
        admin_id=admin.id,
        email=admin.email,
        display_name=admin.display_name,
        role=admin.role,
    )


@router.get("/me")
def me(admin: PulseAdmin = Depends(get_current_admin)):
    return {
        "id": admin.id,
        "email": admin.email,
        "display_name": admin.display_name,
        "role": admin.role,
        "last_login": admin.last_login,
    }
