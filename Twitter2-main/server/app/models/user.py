from pydantic import BaseModel, EmailStr
from datetime import datetime
from typing import Optional

class UserCreate(BaseModel):
    username: str
    email: EmailStr
    password: str

class User(BaseModel):
    id: str
    username: str
    email: EmailStr
    profile_picture_id: Optional[str] = None  # ID GridFS pour la photo de profil
    banner_picture_id: Optional[str] = None   # ID GridFS pour la bannière
    bio: Optional[str] = None
    followers_count: int = 0
    following_count: int = 0
    created_at: datetime

class UserInDB(User):
    hashed_password: str