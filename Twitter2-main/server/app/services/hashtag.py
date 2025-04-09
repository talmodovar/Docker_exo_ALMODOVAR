from bson import ObjectId
from app.database import db
from app.models.hashtag import Hashtag

def create_or_get_hashtag(tag: str) -> Hashtag:
    """Créer un hashtag s'il n'existe pas, sinon le récupérer"""
    existing_hashtag = db.hashtags.find_one({"tag": tag.lower()})

    if existing_hashtag:
        return Hashtag(id=str(existing_hashtag["_id"]), tag=existing_hashtag["tag"])

    result = db.hashtags.insert_one({"tag": tag.lower()})
    return Hashtag(id=str(result.inserted_id), tag=tag.lower())

def attach_hashtag_to_tweet(tweet_id: str, hashtag_id: str):
    """Associer un hashtag à un tweet"""
    db.tweet_hashtags.insert_one({
        "tweet_id": tweet_id,
        "hashtag_id": hashtag_id
    })

def get_tweet_hashtags(tweet_id: str):
    """Récupérer les hashtags associés à un tweet"""
    hashtag_links = db.tweet_hashtags.find({"tweet_id": tweet_id})
    hashtag_ids = [link["hashtag_id"] for link in hashtag_links]

    hashtags = [h["tag"] for h in db.hashtags.find({"_id": {"$in": [ObjectId(hid) for hid in hashtag_ids]}})]
    return hashtags
