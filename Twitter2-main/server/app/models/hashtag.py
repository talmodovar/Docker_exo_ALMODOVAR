from pydantic import BaseModel
from typing import List, Optional

class HashtagCreate(BaseModel):
    tag: str

class Hashtag(BaseModel):
    id: str
    tag: str

class TweetWithHashtags(BaseModel):
    id: str
    author_id: str
    author_username: str
    content: str
    media_url: Optional[str] = None
    created_at: str
    like_count: int
    comment_count: int
    retweet_count: int
    is_retweet: bool
    hashtags: List[str]
