from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from pydantic import BaseModel
from typing import List, Optional, Dict
from bson import ObjectId
from app.database import db, fs
from app.models.tweet import TweetCreate, Tweet
from app.models.comment import Comment, CommentCreate
from app.models.like import Like
from app.models.user import User
from app.models.notification import Notification
from app.services.auth import get_current_user
from datetime import datetime, timedelta
import base64
import cv2
import numpy as np
from fer import FER
import uuid
import shutil
from pathlib import Path
import re

from app.services.hashtag import create_or_get_hashtag, attach_hashtag_to_tweet, get_tweet_hashtags

router = APIRouter()

# Configurer un dossier pour les médias uploadés
MEDIA_DIR = Path("media")
MEDIA_DIR.mkdir(exist_ok=True)

# Sous-dossiers pour les différents types de médias
IMAGES_DIR = MEDIA_DIR / "images"
VIDEOS_DIR = MEDIA_DIR / "videos"
IMAGES_DIR.mkdir(exist_ok=True)
VIDEOS_DIR.mkdir(exist_ok=True)


async def save_media_file(file: UploadFile) -> Optional[str]:
    if not file:
        return None

    # Get file extension and determine media type
    file_ext = file.filename.split(".")[-1].lower()

    # Define allowed extensions
    allowed_image_extensions = {"jpg", "jpeg", "png", "gif", "webp"}
    allowed_video_extensions = {"mp4", "webm", "mov", "avi"}

    if file_ext in allowed_image_extensions:
        media_type = "images"
    elif file_ext in allowed_video_extensions:
        media_type = "videos"
    else:
        raise HTTPException(
            status_code=400,
            detail=f"Format de fichier non supporté. Extensions autorisées: {allowed_image_extensions.union(allowed_video_extensions)}"
        )

    # Create a unique filename
    filename = f"{uuid.uuid4()}.{file_ext}"
    file_path = MEDIA_DIR / media_type / filename

    # Save the file
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    # Return the relative URL path
    return f"/media/{media_type}/{filename}"


def extract_mentions(content: str) -> list:
    """
    Extrait les mentions (@username) du contenu d'un tweet
    """
    # Pattern pour capturer les mentions: un @ suivi d'un nom d'utilisateur (lettres, chiffres, underscore)
    mentions_pattern = r'@(\w+)'
    return re.findall(mentions_pattern, content)


@router.post("/tweets", response_model=Tweet)
async def create_tweet(tweet: TweetCreate, current_user=Depends(get_current_user), hashtags=None):
    print(f"📥 Tags reçus dans le backend : {tweet.tags}")
    tweet_data = {
        "author_id": current_user.id,
        "author_username": current_user.username,
        "content": tweet.content,
        "created_at": datetime.utcnow(),
        "like_count": 0,
        "comment_count": 0,
        "retweet_count": 0,
        "is_retweet": False,
        "tags": tweet.tags
    }
    result = db.tweets.insert_one(tweet_data)
    tweet_id = str(result.inserted_id)
    saved_hashtags = []
    hashtags = hashtags or []
    for tag in hashtags:
        hashtag = create_or_get_hashtag(tag)
        attach_hashtag_to_tweet(tweet_id, hashtag.id)
        saved_hashtags.append(hashtag.tag)
    tweet_data["tags"] = saved_hashtags
    print(f"[LOG] Tweet créé avec ID {tweet_id} et tags: {saved_hashtags}")

    tweet_data["id"] = tweet_id

    # Extraire et traiter les mentions
    mentions = extract_mentions(tweet.content)
    for username in mentions:
        # Vérifier si l'utilisateur mentionné existe
        mentioned_user = db.users.find_one({"username": username})
        if mentioned_user and str(mentioned_user["_id"]) != current_user.id:  # Ne pas notifier l'auteur du tweet
            # Créer une notification pour l'utilisateur mentionné
            notification_data = {
                "recipient_id": str(mentioned_user["_id"]),
                "sender_id": current_user.id,
                "sender_username": current_user.username,
                "type": "mention",
                "tweet_id": tweet_id,
                "tweet_content": tweet.content[:50] + ("..." if len(tweet.content) > 50 else ""),
                "read": False,
                "created_at": datetime.utcnow()
            }
            db.notifications.insert_one(notification_data)

    return Tweet(**tweet_data)


@router.post("/tweets/with-media", response_model=Tweet)
async def create_tweet_with_media(
        content: str = Form(...),
        media_id: str = Form(None),
        media_type: str = Form(None),
        hashtags: Optional[str] = Form(None),
        current_user: User = Depends(get_current_user)
):
    extracted_tags = hashtags.split(",") if hashtags else []
    # Vérifier si le média existe si un media_id est fourni
    if media_id:
        try:
            file_exists = fs.exists(ObjectId(media_id))
            if not file_exists:
                raise HTTPException(status_code=404, detail="Média non trouvé")
        except:
            raise HTTPException(status_code=400, detail="ID de média invalide")

    # Créer le tweet avec la référence au média
    tweet_data = {
        "author_id": current_user.id,
        "author_username": current_user.username,
        "content": content,
        "media_id": media_id,
        "media_type": media_type,
        "created_at": datetime.utcnow(),
        "like_count": 0,
        "comment_count": 0,
        "retweet_count": 0,
        "is_retweet": False,
    }

    result = db.tweets.insert_one(tweet_data)
    tweet_id = str(result.inserted_id)
    tweet_data["id"] = tweet_id

    # Extraire les Hashtag
    saved_hashtags = []
    for tag in extracted_tags:
        hashtag = create_or_get_hashtag(tag.strip())  # Supprimer espaces potentiels
        attach_hashtag_to_tweet(tweet_id, hashtag.id)
        saved_hashtags.append(hashtag.tag)

    db.tweets.update_one({"_id": result.inserted_id}, {"$set": {"tags": saved_hashtags}})
    tweet_data["tags"] = saved_hashtags
    print(f"[LOG] Tweet avec média créé avec ID {tweet_id} et tags: {saved_hashtags}")

    # Extraire et traiter les mentions
    mentions = extract_mentions(content)
    for username in mentions:
        # Vérifier si l'utilisateur mentionné existe
        mentioned_user = db.users.find_one({"username": username})
        if mentioned_user and str(mentioned_user["_id"]) != current_user.id:  # Ne pas notifier l'auteur du tweet
            # Créer une notification pour l'utilisateur mentionné
            notification_data = {
                "recipient_id": str(mentioned_user["_id"]),
                "sender_id": current_user.id,
                "sender_username": current_user.username,
                "type": "mention",
                "tweet_id": tweet_id,
                "tweet_content": content[:50] + ("..." if len(content) > 50 else ""),
                "read": False,
                "created_at": datetime.utcnow()
            }
            db.notifications.insert_one(notification_data)

    return Tweet(**tweet_data)


@router.get("/tweets", response_model=List[Tweet])
async def read_tweets():
    tweets = []
    for tweet in db.tweets.find().sort("created_at", -1).limit(50):
        tweet["id"] = str(tweet["_id"])
        tweet["tags"] = tweet.get("tags", [])  # Ajoute les tags si absents
        del tweet["_id"]
        tweets.append(Tweet(**tweet))

    return tweets


@router.get("/tweets/{searchword}/search", response_model=List[Tweet])
async def search_tweets(searchword: str, skip: int = 0, limit: int = 10):
    # Create a case-insensitive regex pattern for the search word
    regex_pattern = f".*{searchword}.*"
    regex_options = "i"  # Case-insensitive

    # Query to search across content, author_username, and tags
    query = {
        "$or": [
            {"content": {"$regex": regex_pattern, "$options": regex_options}},
            {"author_username": {"$regex": regex_pattern, "$options": regex_options}},
            {"tags": {"$regex": regex_pattern, "$options": regex_options}}
        ]
    }

    # Fetch tweets matching the query
    tweets = []
    for tweet in db.tweets.find(query).sort("created_at", -1).skip(skip).limit(limit):
        # Convert MongoDB ObjectId to string and add it as "id"
        tweet["id"] = str(tweet["_id"])
        # Ensure the "tags" field exists, defaulting to an empty list if absent
        tweet["tags"] = tweet.get("tags", [])
        # Remove the MongoDB "_id" field
        del tweet["_id"]
        # Append the tweet to the list after validating it with the Tweet model
        tweets.append(Tweet(**tweet))

    if not tweets:
        return []

    return tweets


@router.get("/tweets/{tweet_id}/like_status")
async def check_like_status(tweet_id: str, current_user: User = Depends(get_current_user)):
    like = db.likes.find_one({
        "tweet_id": tweet_id,
        "user_id": current_user.id
    })
    return {"liked": like is not None}


@router.post("/comments", response_model=Comment)
async def create_comment(comment: CommentCreate, current_user: User = Depends(get_current_user)):
    # Vérifier si le tweet existe
    tweet = db.tweets.find_one({"_id": ObjectId(comment.tweet_id)})
    if not tweet:
        raise HTTPException(status_code=404, detail="Tweet not found")

    comment_data = {
        "content": comment.content,
        "tweet_id": comment.tweet_id,
        "author_id": current_user.id,
        "author_username": current_user.username,
        "created_at": datetime.utcnow()
    }

    result = db.comments.insert_one(comment_data)
    comment_id = str(result.inserted_id)
    comment_data["id"] = comment_id

    # Mettre à jour le compteur de commentaires dans le tweet
    db.tweets.update_one(
        {"_id": ObjectId(comment.tweet_id)},
        {"$inc": {"comment_count": 1}}
    )

    # Créer une notification (sauf si l'utilisateur commente son propre tweet)
    if tweet["author_id"] != current_user.id:
        notification_data = {
            "recipient_id": tweet["author_id"],
            "sender_id": current_user.id,
            "sender_username": current_user.username,
            "type": "comment",
            "tweet_id": comment.tweet_id,
            "tweet_content": tweet["content"][:50] + ("..." if len(tweet["content"]) > 50 else ""),
            "comment_id": comment_id,
            "comment_content": comment.content[:50] + ("..." if len(comment.content) > 50 else ""),
            "read": False,
            "created_at": datetime.utcnow()
        }
        db.notifications.insert_one(notification_data)

    return Comment(**comment_data)


@router.get("/tweets/{tweet_id}/comments", response_model=List[Comment])
async def get_tweet_comments(tweet_id: str):
    comments = []
    for comment in db.comments.find({"tweet_id": tweet_id}).sort("created_at", -1):
        comment["id"] = str(comment["_id"])
        del comment["_id"]
        comments.append(Comment(**comment))
    return comments


@router.post("/tweets/{tweet_id}/like", response_model=Like)
async def like_tweet(tweet_id: str, current_user: User = Depends(get_current_user)):
    # Vérifier si le tweet existe
    tweet = db.tweets.find_one({"_id": ObjectId(tweet_id)})
    if not tweet:
        raise HTTPException(status_code=404, detail="Tweet not found")

    # Vérifier si l'utilisateur a déjà liké ce tweet
    existing_like = db.likes.find_one({
        "tweet_id": tweet_id,
        "user_id": current_user.id
    })

    if existing_like:
        raise HTTPException(status_code=400, detail="Tweet already liked")

    like_data = {
        "tweet_id": tweet_id,
        "user_id": current_user.id,
        "username": current_user.username,
        "created_at": datetime.utcnow()
    }

    result = db.likes.insert_one(like_data)
    like_data["id"] = str(result.inserted_id)

    # Mettre à jour le compteur de likes dans le tweet
    db.tweets.update_one(
        {"_id": ObjectId(tweet_id)},
        {"$inc": {"like_count": 1}}
    )

    # Créer une notification (sauf si l'utilisateur like son propre tweet)
    if tweet["author_id"] != current_user.id:
        notification_data = {
            "recipient_id": tweet["author_id"],
            "sender_id": current_user.id,
            "sender_username": current_user.username,
            "type": "like",
            "tweet_id": tweet_id,
            "tweet_content": tweet["content"][:50] + ("..." if len(tweet["content"]) > 50 else ""),
            "read": False,
            "created_at": datetime.utcnow()
        }
        db.notifications.insert_one(notification_data)

    return Like(**like_data)


@router.get("/notifications", response_model=List[Notification])
async def get_notifications(current_user: User = Depends(get_current_user)):
    notifications = []
    for notification in db.notifications.find({"recipient_id": current_user.id}).sort("created_at", -1).limit(50):
        notification["id"] = str(notification["_id"])
        del notification["_id"]

        # S'assurer que tous les champs optionnels sont présents pour éviter les erreurs de validation
        # Pour les notifications de type "follow", les champs liés aux tweets ne sont pas nécessaires
        if notification["type"] == "follow":
            # Supprimer les champs tweet_id et tweet_content s'ils existent car ils sont None
            notification.pop("tweet_id", None)
            notification.pop("tweet_content", None)
            notification.pop("comment_id", None)
            notification.pop("comment_content", None)
        else:
            # Pour les autres types, s'assurer que tous les champs ont des valeurs par défaut
            if "tweet_id" not in notification:
                notification["tweet_id"] = None
            if "tweet_content" not in notification:
                notification["tweet_content"] = None
            if "comment_id" not in notification and "type" != "comment":
                notification["comment_id"] = None
            if "comment_content" not in notification and "type" != "comment":
                notification["comment_content"] = None

        notifications.append(Notification(**notification))

    return notifications


@router.get("/notifications/count", response_model=dict)
async def get_unread_notifications_count(current_user: User = Depends(get_current_user)):
    count = db.notifications.count_documents({
        "recipient_id": current_user.id,
        "read": False
    })
    return {"count": count}


@router.put("/notifications/read-all")
async def mark_all_notifications_as_read(current_user: User = Depends(get_current_user)):
    db.notifications.update_many(
        {"recipient_id": current_user.id, "read": False},
        {"$set": {"read": True}}
    )

    return {"success": True}


@router.put("/notifications/{notification_id}/read")
async def mark_notification_as_read(notification_id: str, current_user: User = Depends(get_current_user)):
    # Vérifier si la notification existe et appartient à l'utilisateur actuel
    notification = db.notifications.find_one({
        "_id": ObjectId(notification_id),
        "recipient_id": current_user.id
    })

    if not notification:
        raise HTTPException(status_code=404, detail="Notification not found")

    # Marquer comme lu
    db.notifications.update_one(
        {"_id": ObjectId(notification_id)},
        {"$set": {"read": True}}
    )

    return {"success": True}


@router.delete("/tweets/{tweet_id}/unlike", status_code=status.HTTP_204_NO_CONTENT)
async def unlike_tweet(tweet_id: str, current_user: User = Depends(get_current_user)):
    # Vérifier si le tweet existe
    tweet = db.tweets.find_one({"_id": ObjectId(tweet_id)})
    if not tweet:
        raise HTTPException(status_code=404, detail="Tweet not found")

    # Vérifier si l'utilisateur a liké ce tweet
    like = db.likes.find_one({
        "tweet_id": tweet_id,
        "user_id": current_user.id
    })

    if not like:
        raise HTTPException(status_code=404, detail="Like not found")

    # Supprimer le like
    db.likes.delete_one({"_id": like["_id"]})

    # Mettre à jour le compteur de likes dans le tweet
    db.tweets.update_one(
        {"_id": ObjectId(tweet_id)},
        {"$inc": {"like_count": -1}}
    )

    return None


class ImageData(BaseModel):
    image: str  # Base64 encoded image


# Initialiser le détecteur d'émotions
emotion_detector = FER(mtcnn=True)  # MTCNN pour une détection plus précise


@router.post("/api/emotion")
async def detect_emotion(data: ImageData):
    try:
        # Décoder l'image base64
        image_data = data.image.split(',')[1]  # Enlever le préfixe "data:image/jpeg;base64,"
        image_bytes = base64.b64decode(image_data)

        # Convertir en format OpenCV
        image_array = np.frombuffer(image_bytes, np.uint8)
        image = cv2.imdecode(image_array, cv2.IMREAD_COLOR)

        # Détecter les émotions
        emotions = emotion_detector.detect_emotions(image)

        # Si aucun visage n'est détecté
        if not emotions:
            return {"success": True, "message": "Aucun visage détecté", "emotions": []}

        # Extraire le résultat principal
        result = []
        for face in emotions:
            top_emotion = max(face['emotions'].items(), key=lambda x: x[1])
            face_result = {
                "box": face['box'],  # Position du visage
                "emotions": face['emotions'],  # Toutes les émotions détectées
                "dominant_emotion": top_emotion[0],  # Émotion dominante
                "confidence": top_emotion[1]  # Niveau de confiance
            }
            result.append(face_result)

        return {
            "success": True,
            "message": "Analyse réussie",
            "emotions": result
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur lors de l'analyse: {str(e)}")


class EmotionReactionCreate(BaseModel):
    tweet_id: str
    user_id: str
    image: str  # Base64 encoded image


class EmotionReaction(BaseModel):
    id: str
    tweet_id: str
    user_id: str
    emotion: str
    confidence: float
    created_at: datetime


# Pour stocker les réactions (remplacez par votre base de données réelle)
emotion_reactions = []

# Initialiser le détecteur d'émotions
emotion_detector = FER(mtcnn=True)


@router.post("/api/tweets/{tweet_id}/reactions", response_model=EmotionReaction)
async def create_emotion_reaction(tweet_id: str, data: EmotionReactionCreate):
    try:
        # Décoder l'image base64
        image_data = data.image.split(',')[1]  # Enlever le préfixe
        image_bytes = base64.b64decode(image_data)

        # Convertir en format OpenCV
        image_array = np.frombuffer(image_bytes, np.uint8)
        image = cv2.imdecode(image_array, cv2.IMREAD_COLOR)

        # Détecter les émotions
        emotions = emotion_detector.detect_emotions(image)

        # Si aucun visage n'est détecté
        if not emotions:
            raise HTTPException(status_code=400, detail="Aucun visage détecté dans l'image")

        # Utiliser la première détection (généralement il n'y a qu'un visage)
        face_emotions = emotions[0]['emotions']

        # Trouver l'émotion dominante
        dominant_emotion = max(face_emotions.items(), key=lambda x: x[1])
        emotion_name = dominant_emotion[0]
        confidence = dominant_emotion[1]

        # Créer la réaction
        # reaction = EmotionReaction(
        #     id=str(uuid.uuid4()),
        #     tweet_id=tweet_id,
        #     user_id=data.user_id,
        #     emotion=emotion_name,
        #     confidence=confidence,
        #     created_at=datetime.now()
        # )

        # # Stocker la réaction (ou remplacer si l'utilisateur a déjà réagi)
        # # Supprimer les réactions existantes de l'utilisateur pour ce tweet
        # global emotion_reactions
        # emotion_reactions = [r for r in emotion_reactions 
        #                     if not (r.tweet_id == tweet_id and r.user_id == data.user_id)]

        reaction_id = str(uuid.uuid4())
        reaction_data = {
            "_id": ObjectId(),  # MongoDB utilise _id comme identifiant
            "tweet_id": ObjectId(tweet_id),  # Convertir en ObjectId pour MongoDB
            "user_id": data.user_id,
            "emotion": emotion_name,
            "confidence": confidence,
            "created_at": datetime.now()
        }

        # Supprimer toute réaction existante de cet utilisateur pour ce tweet
        db.emotion_reactions.delete_many({
            "tweet_id": ObjectId(tweet_id),
            "user_id": data.user_id
        })

        # Insérer la nouvelle réaction en base de données
        db.emotion_reactions.insert_one(reaction_data)

        response_data = {
            "id": str(reaction_data["_id"]),
            "tweet_id": tweet_id,  # Retourner la valeur string originale
            "user_id": reaction_data["user_id"],
            "emotion": reaction_data["emotion"],
            "confidence": reaction_data["confidence"],
            "created_at": reaction_data["created_at"]
        }

        return EmotionReaction(**response_data)

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur lors de l'analyse: {str(e)}")


@router.get("/api/tweets/{tweet_id}/reactions", response_model=List[EmotionReaction])
async def get_tweet_reactions(tweet_id: str):
    try:
        # Récupérer les réactions depuis la base de données
        reactions = list(db.emotion_reactions.find({"tweet_id": ObjectId(tweet_id)}))

        # Convertir les objets MongoDB en format compatible avec Pydantic
        result = []
        for reaction in reactions:
            result.append({
                "id": str(reaction["_id"]),
                "tweet_id": tweet_id,
                "user_id": reaction["user_id"],
                "emotion": reaction["emotion"],
                "confidence": reaction["confidence"],
                "created_at": reaction["created_at"]
            })

        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur lors de la récupération des réactions: {str(e)}")


@router.get("/api/tweets/{tweet_id}/reactions/summary")
async def get_tweet_reactions_summary(tweet_id: str):
    try:
        # Récupérer les réactions depuis la base de données
        reactions = list(db.emotion_reactions.find({"tweet_id": ObjectId(tweet_id)}))

        # Compter le nombre de chaque émotion
        summary = {}
        for reaction in reactions:
            emotion = reaction["emotion"]
            if emotion in summary:
                summary[emotion] += 1
            else:
                summary[emotion] = 1

        return {
            "tweet_id": tweet_id,
            "reaction_count": len(reactions),
            "reactions": summary
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur lors de la récupération du résumé des réactions: {str(e)}")


@router.delete("/api/tweets/{tweet_id}/reactions/{user_id}", status_code=204)
async def delete_emotion_reaction(tweet_id: str):
    try:
        result = db.emotion_reactions.delete_one({
            "tweet_id": ObjectId(tweet_id)
        })

        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Réaction non trouvée")

        return None
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur lors de la suppression: {str(e)}")


@router.post("/tweets/{tweet_id}/retweet", response_model=Tweet)
async def retweet_tweet(tweet_id: str, current_user: User = Depends(get_current_user)):
    # Vérifier si le tweet existe
    original_tweet = db.tweets.find_one({"_id": ObjectId(tweet_id)})
    if not original_tweet:
        raise HTTPException(status_code=404, detail="Tweet not found")

    # Vérifier si l'utilisateur a déjà retweeté ce tweet
    existing_retweet = db.tweets.find_one({
        "original_tweet_id": tweet_id,
        "author_id": current_user.id,
        "is_retweet": True
    })

    if existing_retweet:
        raise HTTPException(status_code=400, detail="Tweet already retweeted")

    # Créer un retweet
    retweet_data = {
        "author_id": current_user.id,
        "author_username": current_user.username,
        "content": original_tweet["content"],
        "media_url": original_tweet.get("media_url"),
        "is_retweet": True,
        "original_tweet_id": tweet_id,
        "original_author_username": original_tweet["author_username"],
        "created_at": datetime.utcnow(),
        "like_count": 0,
        "comment_count": 0,
        "retweet_count": 0
    }

    result = db.tweets.insert_one(retweet_data)

    # Mettre à jour le compteur de retweets du tweet original
    db.tweets.update_one(
        {"_id": ObjectId(tweet_id)},
        {"$inc": {"retweet_count": 1}}
    )

    # Créer une notification (sauf si l'utilisateur retweete son propre tweet)
    if original_tweet["author_id"] != current_user.id:
        notification_data = {
            "recipient_id": original_tweet["author_id"],
            "sender_id": current_user.id,
            "sender_username": current_user.username,
            "type": "retweet",
            "tweet_id": tweet_id,
            "tweet_content": original_tweet["content"][:50] + ("..." if len(original_tweet["content"]) > 50 else ""),
            "read": False,
            "created_at": datetime.utcnow()
        }
        db.notifications.insert_one(notification_data)

    # Préparer les données pour le retour avec l'ID
    response_data = {**retweet_data, "id": str(result.inserted_id)}
    return Tweet(**response_data)


@router.delete("/tweets/{tweet_id}/unretweet", status_code=status.HTTP_204_NO_CONTENT)
async def unretweet_tweet(tweet_id: str, current_user: User = Depends(get_current_user)):
    # Trouver le retweet de l'utilisateur pour ce tweet
    retweet = db.tweets.find_one({
        "original_tweet_id": tweet_id,
        "author_id": current_user.id,
        "is_retweet": True
    })

    if not retweet:
        raise HTTPException(status_code=404, detail="Retweet not found")

    # Supprimer le retweet
    db.tweets.delete_one({"_id": retweet["_id"]})

    # Mettre à jour le compteur de retweets du tweet original
    db.tweets.update_one(
        {"_id": ObjectId(tweet_id)},
        {"$inc": {"retweet_count": -1}}
    )

    return None


@router.get("/tweets/{tweet_id}/retweet_status")
async def check_retweet_status(tweet_id: str, current_user: User = Depends(get_current_user)):
    retweet = db.tweets.find_one({
        "original_tweet_id": tweet_id,
        "author_id": current_user.id,
        "is_retweet": True
    })

    return {"retweeted": retweet is not None}


@router.get("/tweets/feed", response_model=List[Dict])
async def get_feed(current_user: User = Depends(get_current_user)):
    """
    Récupère le fil d'actualité avec toutes les informations nécessaires en une seule requête
    """
    # Récupérer les tweets
    tweets = list(db.tweets.find().sort("created_at", -1).limit(50))
    
    # Préparer les IDs pour les opérations en batch
    tweet_ids = [ObjectId(tweet["_id"]) for tweet in tweets]
    tweet_ids_str = [str(tweet["_id"]) for tweet in tweets]
    
    # Récupérer tous les statuts de like en une seule requête
    likes = {}
    user_likes = list(db.likes.find({
        "tweet_id": {"$in": tweet_ids_str},
        "user_id": current_user.id
    }))
    for like in user_likes:
        likes[like["tweet_id"]] = True
    
    # Récupérer tous les statuts de retweet en une seule requête
    retweets = {}
    user_retweets = list(db.tweets.find({
        "original_tweet_id": {"$in": tweet_ids_str},
        "author_id": current_user.id,
        "is_retweet": True
    }))
    for retweet in user_retweets:
        retweets[retweet["original_tweet_id"]] = True
    
    # Récupérer tous les résumés de réactions en une seule requête
    reactions_summary = {}
    all_reactions = list(db.emotion_reactions.aggregate([
        {"$match": {"tweet_id": {"$in": tweet_ids}}},
        {"$group": {
            "_id": "$tweet_id",
            "reaction_count": {"$sum": 1},
            "reactions": {
                "$push": {
                    "emotion": "$emotion",
                    "user_id": "$user_id"
                }
            }
        }}
    ]))
    
    for summary in all_reactions:
        tweet_id = str(summary["_id"])
        emotion_counts = {}
        user_reaction = None
        
        for reaction in summary["reactions"]:
            emotion = reaction["emotion"]
            if emotion not in emotion_counts:
                emotion_counts[emotion] = 0
            emotion_counts[emotion] += 1
            
            if reaction["user_id"] == current_user.id:
                user_reaction = emotion
        
        reactions_summary[tweet_id] = {
            "reaction_count": summary["reaction_count"],
            "reactions": emotion_counts,
            "user_reaction": user_reaction
        }
    
    # Récupérer les informations des utilisateurs
    usernames = set()
    for tweet in tweets:
        usernames.add(tweet["author_username"])
        if "original_author_username" in tweet:
            usernames.add(tweet["original_author_username"])
    
    users_info = {}
    for username in usernames:
        user_data = db.users.find_one({"username": username})
        if user_data:
            users_info[username] = {
                "id": str(user_data["_id"]),
                "username": user_data["username"],
                "profile_picture_id": user_data.get("profile_picture_id"),
                "bio": user_data.get("bio")
            }
    
    # Construire la réponse enrichie
    result = []
    for tweet in tweets:
        tweet_id = str(tweet["_id"])
        tweet_data = {
            "id": tweet_id,
            "content": tweet["content"],
            "author_id": tweet["author_id"],
            "author_username": tweet["author_username"],
            "created_at": tweet["created_at"],
            # Utiliser .get() avec valeur par défaut pour gérer les champs manquants
            "like_count": tweet.get("like_count", 0),
            "comment_count": tweet.get("comment_count", 0),
            "retweet_count": tweet.get("retweet_count", 0),
            "is_retweet": tweet.get("is_retweet", False),
            "original_tweet_id": tweet.get("original_tweet_id"),
            "original_author_username": tweet.get("original_author_username"),
            "media_id": tweet.get("media_id"),
            "media_type": tweet.get("media_type"),
            "tags": tweet.get("tags", []),
            # Informations ajoutées
            "user_liked": likes.get(tweet_id, False),
            "user_retweeted": retweets.get(tweet_id, False),
            "reactions": reactions_summary.get(tweet_id, {"reaction_count": 0, "reactions": {}, "user_reaction": None}),
            "author_info": users_info.get(tweet["author_username"])
        }
        
        if tweet.get("original_author_username") and tweet["original_author_username"] in users_info:
            tweet_data["original_author_info"] = users_info[tweet["original_author_username"]]
        
        result.append(tweet_data)
    
    return result


@router.get("/trends", response_model=List[Dict])
async def get_trending_hashtags(limit: int = 10):
    """
    Récupère les hashtags en tendance (les plus utilisés dans les dernières 24h)
    """
    # Calculer la date d'il y a 24 heures
    one_day_ago = datetime.utcnow() - timedelta(days=1)
    
    # Agréger les tags à partir des tweets des dernières 24 heures
    pipeline = [
        # Filtrer les tweets des dernières 24h qui ont des tags
        {"$match": {
            "created_at": {"$gte": one_day_ago},
            "tags": {"$exists": True, "$ne": []}
        }},
        # Déconstruire le tableau tags pour traiter chaque tag individuellement
        {"$unwind": "$tags"},
        # Grouper par tag et compter
        {"$group": {
            "_id": "$tags",
            "count": {"$sum": 1},
            "tweets": {"$push": {"id": "$_id", "content": "$content"}}
        }},
        # Trier par nombre d'occurrences décroissant
        {"$sort": {"count": -1}},
        # Limiter le nombre de résultats
        {"$limit": limit},
        # Reformater pour la sortie
        {"$project": {
            "_id": 0,
            "tag": "$_id",
            "count": 1,
            "sample_tweets": {"$slice": ["$tweets", 3]}  # Inclure quelques tweets d'exemple
        }}
    ]
    
    trends = list(db.tweets.aggregate(pipeline))
    
    # Transformer les ObjectId en strings pour la sérialisation JSON
    for trend in trends:
        for tweet in trend.get("sample_tweets", []):
            tweet["id"] = str(tweet["id"])
    
    return trends

@router.get("/recommendations", response_model=List[Dict])
async def get_tweet_recommendations(limit: int = 10, current_user: User = Depends(get_current_user)):
    """
    Obtient des recommandations de tweets pour l'utilisateur en fonction de ses likes
    """
    # 1. Récupérer les tweets que l'utilisateur a aimés
    user_likes = list(db.likes.find({"user_id": current_user.id}))
    liked_tweet_ids = [ObjectId(like["tweet_id"]) for like in user_likes]

    if not liked_tweet_ids:
        # Si l'utilisateur n'a pas de likes, retourner les tweets les plus populaires
        popular_tweets = list(db.tweets.find().sort("like_count", -1).limit(limit))
        return _format_tweets_for_response(popular_tweets, current_user.id)

    # 2. Récupérer ces tweets aimés pour analyser les tags et auteurs
    liked_tweets = list(db.tweets.find({"_id": {"$in": liked_tweet_ids}}))

    # 3. Extraire les tags préférés
    user_preferred_tags = []
    for tweet in liked_tweets:
        if "tags" in tweet and tweet["tags"]:
            user_preferred_tags.extend(tweet["tags"])

    # Compter la fréquence des tags
    tag_counter = {}
    for tag in user_preferred_tags:
        if tag:  # S'assurer que le tag n'est pas None ou vide
            tag_counter[tag] = tag_counter.get(tag, 0) + 1

    # Prendre les 5 tags les plus fréquents
    top_tags = sorted(tag_counter.items(), key=lambda x: x[1], reverse=True)[:5]
    top_tag_names = [tag[0] for tag in top_tags]

    # 4. Extraire les auteurs préférés
    user_preferred_authors = []
    for tweet in liked_tweets:
        user_preferred_authors.append(tweet["author_id"])

    # Compter la fréquence des auteurs
    author_counter = {}
    for author_id in user_preferred_authors:
        author_counter[author_id] = author_counter.get(author_id, 0) + 1

    # Prendre les 3 auteurs les plus fréquents
    top_authors = sorted(author_counter.items(), key=lambda x: x[1], reverse=True)[:3]
    top_author_ids = [author[0] for author in top_authors]

    # 5. Trouver des tweets similaires (par tags ou auteurs)
    # Exclure les tweets que l'utilisateur a déjà likés
    query = {
        "_id": {"$nin": liked_tweet_ids},  # Ne pas recommander des tweets déjà aimés
        "author_id": {"$ne": current_user.id},  # Ne pas recommander ses propres tweets
        "$or": [
            {"tags": {"$in": top_tag_names}},  # Tweets avec des tags similaires
            {"author_id": {"$in": top_author_ids}}  # Tweets des auteurs préférés
        ]
    }

    # 6. Ajouter un champ calculé pour le score de recommandation
    pipeline = [
        {"$match": query},
        # S'assurer que le champ tags existe et est un tableau
        {"$addFields": {
            "tags": {"$ifNull": ["$tags", []]}
        }},
        {"$addFields": {
            "tag_match_count": {
                "$size": {
                    "$ifNull": [
                        {"$setIntersection": ["$tags", top_tag_names]},
                        []
                    ]
                }
            },
            "author_preferred": {
                "$cond": [
                    {"$in": ["$author_id", top_author_ids]},
                    1,
                    0
                ]
            }
        }},
        {"$addFields": {
            "recommendation_score": {
                "$sum": [
                    {"$multiply": ["$tag_match_count", 3]},  # 3 points par tag correspondant
                    {"$multiply": ["$author_preferred", 5]}, # 5 points si l'auteur est préféré
                    {"$ifNull": [{"$divide": ["$like_count", 10]}, 0]},        # 0.1 point par like
                    {"$ifNull": [{"$divide": ["$retweet_count", 20]}, 0]},     # 0.05 point par retweet
                    {"$ifNull": [{"$divide": ["$comment_count", 30]}, 0]}      # 0.033 point par commentaire
                ]
            }
        }},
        {"$sort": {"recommendation_score": -1}},
        {"$limit": limit}
    ]

    recommended_tweets = list(db.tweets.aggregate(pipeline))

    # 7. Formater les tweets pour la réponse
    return _format_tweets_for_response(recommended_tweets, current_user.id)

def _format_tweets_for_response(tweets, user_id):
    """Formatage des tweets pour la réponse API avec infos supplémentaires"""
    result = []

    # Récupérer les ids de tweets pour des opérations en batch
    tweet_ids = [tweet["_id"] for tweet in tweets]
    tweet_ids_str = [str(tweet["_id"]) for tweet in tweets]

    # Vérifier les likes de l'utilisateur en une requête
    user_likes = list(db.likes.find({
        "tweet_id": {"$in": tweet_ids_str},
        "user_id": user_id
    }))
    liked_tweet_ids = [like["tweet_id"] for like in user_likes]

    # Vérifier les retweets de l'utilisateur en une requête
    user_retweets = list(db.tweets.find({
        "original_tweet_id": {"$in": tweet_ids_str},
        "author_id": user_id,
        "is_retweet": True
    }))
    retweeted_tweet_ids = [retweet["original_tweet_id"] for retweet in user_retweets]

    # Récupérer les infos utilisateurs pour tous les auteurs en une requête
    author_ids = set()
    for tweet in tweets:
        author_ids.add(tweet["author_id"])

    authors = {}
    for author in db.users.find({"_id": {"$in": list(author_ids)}}):
        authors[str(author["_id"])] = {
            "id": str(author["_id"]),
            "username": author["username"],
            "profile_picture_id": author.get("profile_picture_id"),
            "bio": author.get("bio")
        }

    # Formater chaque tweet
    for tweet in tweets:
        tweet_id = str(tweet["_id"])

        # Construire l'objet tweet pour la réponse
        formatted_tweet = {
            "id": tweet_id,
            "content": tweet["content"],
            "author_id": tweet["author_id"],
            "author_username": tweet["author_username"],
            "created_at": tweet["created_at"],
            "like_count": tweet.get("like_count", 0),
            "comment_count": tweet.get("comment_count", 0),
            "retweet_count": tweet.get("retweet_count", 0),
            "is_retweet": tweet.get("is_retweet", False),
            "media_id": tweet.get("media_id"),
            "media_type": tweet.get("media_type"),
            "tags": tweet.get("tags", []),
            # Statuts spécifiques à l'utilisateur
            "user_liked": tweet_id in liked_tweet_ids,
            "user_retweeted": tweet_id in retweeted_tweet_ids,
            # Infos auteur
            "author_info": authors.get(tweet["author_id"])
        }

        # Ajouter des métadonnées de recommandation si disponibles
        if "recommendation_score" in tweet:
            recommendation_reasons = []

            if "tag_match_count" in tweet and tweet["tag_match_count"] > 0:
                tag_matches = ", ".join([f"#{tag}" for tag in tweet.get("tags", [])[:2]])
                recommendation_reasons.append(f"Tags similaires: {tag_matches}")

            if "author_preferred" in tweet and tweet["author_preferred"] > 0:
                recommendation_reasons.append(f"Auteur que vous aimez: @{tweet['author_username']}")

            formatted_tweet["recommendation_info"] = {
                "score": tweet["recommendation_score"],
                "reasons": recommendation_reasons
            }

        result.append(formatted_tweet)

    return result

@router.post("/tweets/{tweet_id}/bookmark")
async def toggle_bookmark(tweet_id: str, current_user: User = Depends(get_current_user)):
    """
    Ajoute ou retire un tweet des favoris de l'utilisateur.
    """
    tweet = db.tweets.find_one({"_id": ObjectId(tweet_id)})
    if not tweet:
        raise HTTPException(status_code=404, detail="Tweet non trouvé")

    existing_bookmark = db.bookmarks.find_one({"user_id": current_user.id, "tweet_id": tweet_id})

    if existing_bookmark:
        db.bookmarks.delete_one({"_id": existing_bookmark["_id"]})
        return {"message": "Tweet retiré des favoris"}
    else:
        # Ajouter aux favoris
        bookmark_data = {
            "user_id": current_user.id,
            "tweet_id": tweet_id,
            "created_at": datetime.utcnow()
        }
        db.bookmarks.insert_one(bookmark_data)
        return {"message": "Tweet ajouté aux favoris"}

@router.get("/users/me/bookmarks")
async def get_user_bookmarks(current_user: User = Depends(get_current_user)):
    """
    Récupère tous les tweets enregistrés en favoris par l'utilisateur.
    """
    bookmarks = list(db.bookmarks.find({"user_id": current_user.id}))
    tweet_ids = [ObjectId(bm["tweet_id"]) for bm in bookmarks]

    # Récupérer les tweets correspondants
    tweets = list(db.tweets.find({"_id": {"$in": tweet_ids}}))
    for tweet in tweets:
        tweet["id"] = str(tweet["_id"])
        del tweet["_id"]

    return tweets
