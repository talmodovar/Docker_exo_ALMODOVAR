from pydantic import BaseModel
from datetime import datetime

class LikeCreate(BaseModel):
    tweet_id: str

class Like(BaseModel):
    id: str
    user_id: str
    tweet_id: str
    created_at: datetime