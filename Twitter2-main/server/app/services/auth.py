from fastapi.security import OAuth2PasswordBearer
from datetime import datetime, timedelta
import jwt
import bcrypt
from bson import ObjectId
from app.config import SECRET_KEY, ALGORITHM
from app.database import db
from app.models import UserInDB
from typing import Optional
from fastapi import HTTPException, Depends, status

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/token")

def get_password_hash(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return bcrypt.checkpw(plain_password.encode(), hashed_password.encode())


def get_user(username: str):
    user = db.users.find_one({"username": username})

    if user:

        user.setdefault("profile_picture_url", None)
        user.setdefault("banner_picture_url", None)
        user.setdefault("bio", None)

        return UserInDB(
            id=str(user["_id"]),
            username=user["username"],
            email=user["email"],
            profile_picture_url=user["profile_picture_url"],
            banner_picture_url=user["banner_picture_url"],
            bio=user["bio"],
            hashed_password=user["hashed_password"],
            created_at=user["created_at"]
        )

    return None


def authenticate_user(username: str, password: str) -> Optional[UserInDB]:
    user = get_user(username)
    if not user or not verify_password(password, user.hashed_password):
        return False
    return user

def create_access_token(data: dict, expires_delta: timedelta) -> str:
    to_encode = data.copy()
    to_encode.update({"exp": datetime.utcnow() + expires_delta})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

async def get_current_user(token: str = Depends(oauth2_scheme)) -> UserInDB:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid authentication credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise credentials_exception
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token expired")
    except jwt.InvalidTokenError:
        raise credentials_exception

    user = get_user(username)
    if user is None:
        raise credentials_exception
    return user