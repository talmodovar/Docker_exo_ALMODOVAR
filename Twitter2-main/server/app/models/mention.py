from pydantic import BaseModel

class Mention(BaseModel):
    id: str
    tweet_id: str
    mentioned_user_id: str