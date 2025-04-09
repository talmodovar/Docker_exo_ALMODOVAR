from pydantic import BaseModel
from datetime import datetime
from typing import Optional

# class Notification(BaseModel):
#     id: str
#     user_id: str
#     from_user_id: str
#     type: str  # 'like', 'retweet', 'comment', 'follow'
#     tweet_id: Optional[str] = None
#     is_read: bool
#     created_at: datetime


class Notification(BaseModel):
    id: str
    recipient_id: str
    sender_id: str
    sender_username: str
    type: str  # 'like', 'comment'
    tweet_id: Optional[str] = None  # Rendu optionnel
    tweet_content: Optional[str] = None  # Rendu optionnel
    comment_id: Optional[str] = None
    comment_content: Optional[str] = None
    read: bool = False
    created_at: datetime