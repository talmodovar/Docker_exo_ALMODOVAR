from pydantic import BaseModel
from datetime import datetime
from typing import Optional, Literal, List


class TweetCreate(BaseModel):
    content: str
    media_id: Optional[str] = None  # ID du média dans GridFS
    media_type: Optional[Literal['image', 'video']] = None
    original_tweet_id: Optional[str] = None
    tags: Optional[List[str]] = None

class Tweet(BaseModel):
    id: str
    content: str
    author_id: str
    author_username: str
    created_at: datetime
    media_id: Optional[str] = None  # ID du média dans GridFS
    media_type: Optional[Literal['image', 'video']] = None
    like_count: int = 0
    comment_count: int = 0
    retweet_count: int = 0
    is_retweet: bool = False
    original_tweet_id: Optional[str] = None
    original_author_username: Optional[str] = None
    tags: Optional[List[str]] = []