from pydantic import BaseModel
from datetime import datetime
from typing import Optional

class RetweetCreate(BaseModel):
    tweet_id: str
    comment: Optional[str] = None

class Retweet(BaseModel):
    id: str
    user_id: str
    tweet_id: str
    comment: Optional[str] = None
    created_at: datetime