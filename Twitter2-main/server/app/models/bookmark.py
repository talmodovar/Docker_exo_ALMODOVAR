from pydantic import BaseModel
from datetime import datetime

class BookmarkCreate(BaseModel):
    tweet_id: str

class Bookmark(BaseModel):
    id: str
    user_id: str
    tweet_id: str
    created_at: datetime