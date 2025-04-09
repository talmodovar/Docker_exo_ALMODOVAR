from pydantic import BaseModel
from datetime import datetime

# class FollowCreate(BaseModel):
#     following_id: str

class Follow(BaseModel):
    id: str
    follower_id: str  # ID de l'utilisateur qui suit
    follower_username: str  # Username de l'utilisateur qui suit
    followed_id: str  # ID de l'utilisateur suivi
    followed_username: str  # Username de l'utilisateur suivi
    created_at: datetime