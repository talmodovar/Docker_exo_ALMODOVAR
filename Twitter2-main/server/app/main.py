# from fastapi import FastAPI, HTTPException, Depends, status
# from fastapi.middleware.cors import CORSMiddleware
# from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
# from pymongo import MongoClient
# from pydantic import BaseModel, Field
# from typing import List, Optional
# from datetime import datetime, timedelta
# from bson import ObjectId
# import jwt
# import bcrypt
# import os
# from dotenv import load_dotenv

# # Charger les variables d'environnement
# load_dotenv()

# # Configuration
# SECRET_KEY = os.getenv("SECRET_KEY", "your-secret-key")
# ALGORITHM = "HS256"
# ACCESS_TOKEN_EXPIRE_MINUTES = 30

# # Connexion à MongoDB
# client = MongoClient("mongodb+srv://user:1234@cluster0.hsa1yir.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0")
# db = client["twitter_clone"]

# app = FastAPI(title="Twitter Clone API")

# # Configuration CORS
# app.add_middleware(
#     CORSMiddleware,
#     allow_origins=["http://localhost:3000"],
#     allow_credentials=True,
#     allow_methods=["*"],
#     allow_headers=["*"],
# )

# # Schémas
# class UserCreate(BaseModel):
#     username: str
#     email: str
#     password: str

# class User(BaseModel):
#     id: str
#     username: str
#     email: str
#     created_at: datetime

# class UserInDB(User):
#     hashed_password: str

# class Token(BaseModel):
#     access_token: str
#     token_type: str

# class TokenData(BaseModel):
#     username: Optional[str] = None

# class TweetCreate(BaseModel):
#     content: str

# class Tweet(BaseModel):
#     id: str
#     content: str
#     author_id: str
#     author_username: str
#     created_at: datetime
#     like_count: int = 0
#     comment_count: int = 0

# # Utilitaires
# oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

# def verify_password(plain_password, hashed_password):
#     if isinstance(hashed_password, str):
#         hashed_password = hashed_password.encode()
#     return bcrypt.checkpw(plain_password.encode(), hashed_password)

# def get_password_hash(password):
#     return bcrypt.hashpw(password.encode(), bcrypt.gensalt())

# def get_user(username: str):
#     user = db.users.find_one({"username": username})
#     if user:
#         user["id"] = str(user["_id"])
#         return UserInDB(**user)
#     return None

# def authenticate_user(username: str, password: str):
#     user = get_user(username)
#     if not user:
#         return False
#     if not verify_password(password, user.hashed_password):
#         return False
#     return user

# def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
#     to_encode = data.copy()
#     if expires_delta:
#         expire = datetime.utcnow() + expires_delta
#     else:
#         expire = datetime.utcnow() + timedelta(minutes=15)
#     to_encode.update({"exp": expire})
#     encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
#     return encoded_jwt

# async def get_current_user(token: str = Depends(oauth2_scheme)):
#     credentials_exception = HTTPException(
#         status_code=status.HTTP_401_UNAUTHORIZED,
#         detail="Could not validate credentials",
#         headers={"WWW-Authenticate": "Bearer"},
#     )
#     try:
#         # Débogage: afficher le token reçu
#         print(f"Token reçu: {token}")
        
#         payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
#         username: str = payload.get("sub")
#         if username is None:
#             raise credentials_exception
#         token_data = TokenData(username=username)
        
#         # Débogage: afficher le username extrait
#         print(f"Username extrait: {token_data.username}")
#     except Exception as e:
#         # Débogage: capturer et afficher toute erreur
#         print(f"Erreur de décodage du token: {str(e)}")
#         raise credentials_exception
        
#     user = get_user(username=token_data.username)
#     if user is None:
#         print(f"Utilisateur {token_data.username} non trouvé")
#         raise credentials_exception
        
#     # Débogage: confirmer que l'utilisateur a été trouvé
#     print(f"Utilisateur trouvé: {user.username}")
#     return user

# # Routes d'authentification
# @app.post("/token", response_model=Token)
# async def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends()):
#     user = authenticate_user(form_data.username, form_data.password)
#     if not user:
#         raise HTTPException(
#             status_code=status.HTTP_401_UNAUTHORIZED,
#             detail="Incorrect username or password",
#             headers={"WWW-Authenticate": "Bearer"},
#         )
#     access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
#     access_token = create_access_token(
#         data={"sub": user.username}, expires_delta=access_token_expires
#     )
#     return {"access_token": access_token, "token_type": "bearer"}

# @app.post("/users", response_model=User)
# async def create_user(user: UserCreate):
#     db_user = db.users.find_one({"username": user.username})
#     if db_user:
#         raise HTTPException(status_code=400, detail="Username already registered")
    
#     db_user = db.users.find_one({"email": user.email})
#     if db_user:
#         raise HTTPException(status_code=400, detail="Email already registered")
    
#     hashed_password = get_password_hash(user.password)
#     user_data = {
#         "username": user.username,
#         "email": user.email,
#         "hashed_password": hashed_password,
#         "created_at": datetime.utcnow()
#     }
    
#     result = db.users.insert_one(user_data)
#     user_data["id"] = str(result.inserted_id)
#     del user_data["hashed_password"]
    
#     return User(**user_data)

# @app.get("/users/me", response_model=User)
# async def read_users_me(current_user: User = Depends(get_current_user)):
#     user_data = {
#         "id": current_user.id,
#         "username": current_user.username,
#         "email": current_user.email,
#         "created_at": current_user.created_at
#     }
#     return user_data

# # Routes des tweets
# @app.post("/tweets", response_model=Tweet)
# async def create_tweet(tweet: TweetCreate, current_user: User = Depends(get_current_user)):
#     tweet_data = {
#         "content": tweet.content,
#         "author_id": current_user.id,
#         "author_username": current_user.username,
#         "created_at": datetime.utcnow()
#     }
    
#     result = db.tweets.insert_one(tweet_data)
#     tweet_data["id"] = str(result.inserted_id)
    
#     return Tweet(**tweet_data)

# @app.get("/tweets", response_model=List[Tweet])
# async def read_tweets():
#     tweets = []
#     for tweet in db.tweets.find().sort("created_at", -1).limit(50):
#         tweet["id"] = str(tweet["_id"])
#         del tweet["_id"]
#         tweets.append(Tweet(**tweet))
#     return tweets

# @app.get("/users/{username}/tweets", response_model=List[Tweet])
# async def read_user_tweets(username: str):
#     tweets = []
#     for tweet in db.tweets.find({"author_username": username}).sort("created_at", -1):
#         tweet["id"] = str(tweet["_id"])
#         del tweet["_id"]
#         tweets.append(Tweet(**tweet))
#     return tweets


# class CommentCreate(BaseModel):
#     content: str
#     tweet_id: str

# class Comment(BaseModel):
#     id: str
#     content: str
#     tweet_id: str
#     author_id: str
#     author_username: str
#     created_at: datetime

# class LikeCreate(BaseModel):
#     tweet_id: str

# class Like(BaseModel):
#     id: str
#     tweet_id: str
#     user_id: str
#     username: str
#     created_at: datetime

# # Ajoutez ces routes à la fin de votre fichier, avant le bloc if __name__ == "__main__"

# # Routes des commentaires
# @app.post("/comments", response_model=Comment)
# async def create_comment(comment: CommentCreate, current_user: User = Depends(get_current_user)):
#     # Vérifier si le tweet existe
#     tweet = db.tweets.find_one({"_id": ObjectId(comment.tweet_id)})
#     if not tweet:
#         raise HTTPException(status_code=404, detail="Tweet not found")
    
#     comment_data = {
#         "content": comment.content,
#         "tweet_id": comment.tweet_id,
#         "author_id": current_user.id,
#         "author_username": current_user.username,
#         "created_at": datetime.utcnow()
#     }
    
#     result = db.comments.insert_one(comment_data)
#     comment_id = str(result.inserted_id)
#     comment_data["id"] = comment_id
    
#     # Mettre à jour le compteur de commentaires dans le tweet
#     db.tweets.update_one(
#         {"_id": ObjectId(comment.tweet_id)},
#         {"$inc": {"comment_count": 1}}
#     )
    
#     # Créer une notification (sauf si l'utilisateur commente son propre tweet)
#     if tweet["author_id"] != current_user.id:
#         notification_data = {
#             "recipient_id": tweet["author_id"],
#             "sender_id": current_user.id,
#             "sender_username": current_user.username,
#             "type": "comment",
#             "tweet_id": comment.tweet_id,
#             "tweet_content": tweet["content"][:50] + ("..." if len(tweet["content"]) > 50 else ""),
#             "comment_id": comment_id,
#             "comment_content": comment.content[:50] + ("..." if len(comment.content) > 50 else ""),
#             "read": False,
#             "created_at": datetime.utcnow()
#         }
#         db.notifications.insert_one(notification_data)
    
#     return Comment(**comment_data)

# @app.get("/tweets/{tweet_id}/comments", response_model=List[Comment])
# async def get_tweet_comments(tweet_id: str):
#     comments = []
#     for comment in db.comments.find({"tweet_id": tweet_id}).sort("created_at", -1):
#         comment["id"] = str(comment["_id"])
#         del comment["_id"]
#         comments.append(Comment(**comment))
#     return comments

# # Routes des likes
# @app.post("/tweets/{tweet_id}/like", response_model=Like)
# async def like_tweet(tweet_id: str, current_user: User = Depends(get_current_user)):
#     # Vérifier si le tweet existe
#     tweet = db.tweets.find_one({"_id": ObjectId(tweet_id)})
#     if not tweet:
#         raise HTTPException(status_code=404, detail="Tweet not found")
    
#     # Vérifier si l'utilisateur a déjà liké ce tweet
#     existing_like = db.likes.find_one({
#         "tweet_id": tweet_id,
#         "user_id": current_user.id
#     })
    
#     if existing_like:
#         raise HTTPException(status_code=400, detail="Tweet already liked")
    
#     like_data = {
#         "tweet_id": tweet_id,
#         "user_id": current_user.id,
#         "username": current_user.username,
#         "created_at": datetime.utcnow()
#     }
    
#     result = db.likes.insert_one(like_data)
#     like_data["id"] = str(result.inserted_id)
    
#     # Mettre à jour le compteur de likes dans le tweet
#     db.tweets.update_one(
#         {"_id": ObjectId(tweet_id)},
#         {"$inc": {"like_count": 1}}
#     )
    
#     # Créer une notification (sauf si l'utilisateur like son propre tweet)
#     if tweet["author_id"] != current_user.id:
#         notification_data = {
#             "recipient_id": tweet["author_id"],
#             "sender_id": current_user.id,
#             "sender_username": current_user.username,
#             "type": "like",
#             "tweet_id": tweet_id,
#             "tweet_content": tweet["content"][:50] + ("..." if len(tweet["content"]) > 50 else ""),
#             "read": False,
#             "created_at": datetime.utcnow()
#         }
#         db.notifications.insert_one(notification_data)
    
#     return Like(**like_data)

# @app.delete("/tweets/{tweet_id}/unlike", status_code=status.HTTP_204_NO_CONTENT)
# async def unlike_tweet(tweet_id: str, current_user: User = Depends(get_current_user)):
#     # Vérifier si le tweet existe
#     tweet = db.tweets.find_one({"_id": ObjectId(tweet_id)})
#     if not tweet:
#         raise HTTPException(status_code=404, detail="Tweet not found")
    
#     # Vérifier si l'utilisateur a liké ce tweet
#     like = db.likes.find_one({
#         "tweet_id": tweet_id,
#         "user_id": current_user.id
#     })
    
#     if not like:
#         raise HTTPException(status_code=404, detail="Like not found")
    
#     # Supprimer le like
#     db.likes.delete_one({"_id": like["_id"]})
    
#     # Mettre à jour le compteur de likes dans le tweet
#     db.tweets.update_one(
#         {"_id": ObjectId(tweet_id)},
#         {"$inc": {"like_count": -1}}
#     )
    
#     return None

# @app.get("/tweets/{tweet_id}/likes", response_model=List[Like])
# async def get_tweet_likes(tweet_id: str):
#     likes = []
#     for like in db.likes.find({"tweet_id": tweet_id}):
#         like["id"] = str(like["_id"])
#         del like["_id"]
#         likes.append(Like(**like))
#     return likes

# @app.get("/tweets/{tweet_id}/like_status")
# async def check_like_status(tweet_id: str, current_user: User = Depends(get_current_user)):
#     like = db.likes.find_one({
#         "tweet_id": tweet_id,
#         "user_id": current_user.id
#     })
#     return {"liked": like is not None}

# # Modification de la route de création de tweet pour inclure les compteurs
# @app.post("/tweets", response_model=Tweet)
# async def create_tweet(tweet: TweetCreate, current_user: User = Depends(get_current_user)):
#     tweet_data = {
#         "content": tweet.content,
#         "author_id": current_user.id,
#         "author_username": current_user.username,
#         "created_at": datetime.utcnow(),
#         "like_count": 0,
#         "comment_count": 0
#     }
    
#     result = db.tweets.insert_one(tweet_data)
#     tweet_data["id"] = str(result.inserted_id)
    
#     return Tweet(**tweet_data)


# class Notification(BaseModel):
#     id: str
#     recipient_id: str
#     sender_id: str
#     sender_username: str
#     type: str  # 'like', 'comment'
#     tweet_id: str
#     tweet_content: str
#     comment_id: Optional[str] = None
#     comment_content: Optional[str] = None
#     read: bool = False
#     created_at: datetime

# # Ajoutez ces routes pour les notifications

# @app.get("/notifications", response_model=List[Notification])
# async def get_notifications(current_user: User = Depends(get_current_user)):
#     notifications = []
#     for notification in db.notifications.find({"recipient_id": current_user.id}).sort("created_at", -1).limit(50):
#         notification["id"] = str(notification["_id"])
#         del notification["_id"]
#         notifications.append(Notification(**notification))
#     return notifications

# @app.get("/notifications/count", response_model=dict)
# async def get_unread_notifications_count(current_user: User = Depends(get_current_user)):
#     count = db.notifications.count_documents({
#         "recipient_id": current_user.id,
#         "read": False
#     })
#     return {"count": count}

# @app.put("/notifications/{notification_id}/read")
# async def mark_notification_as_read(notification_id: str, current_user: User = Depends(get_current_user)):
#     notification = db.notifications.find_one({"_id": ObjectId(notification_id)})
    
#     if not notification:
#         raise HTTPException(status_code=404, detail="Notification not found")
    
#     if str(notification["recipient_id"]) != current_user.id:
#         raise HTTPException(status_code=403, detail="Not authorized to update this notification")
    
#     db.notifications.update_one(
#         {"_id": ObjectId(notification_id)},
#         {"$set": {"read": True}}
#     )
    
#     return {"success": True}

# @app.put("/notifications/read-all")
# async def mark_all_notifications_as_read(current_user: User = Depends(get_current_user)):
#     db.notifications.update_many(
#         {"recipient_id": current_user.id, "read": False},
#         {"$set": {"read": True}}
#     )
    
#     return {"success": True}

# @app.get("/tweets/{tweet_id}", response_model=Tweet)
# async def get_tweet_by_id(tweet_id: str):
#     tweet = db.tweets.find_one({"_id": ObjectId(tweet_id)})
#     if not tweet:
#         raise HTTPException(status_code=404, detail="Tweet not found")
    
#     tweet["id"] = str(tweet["_id"])
#     del tweet["_id"]
    
#     return Tweet(**tweet)


# if __name__ == "__main__":
#     import uvicorn
#     uvicorn.run(app, host="0.0.0.0", port=8000)


from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routes import auth, tweet, media

app = FastAPI()

app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_credentials=True, allow_methods=["*"], allow_headers=["*"])

app.include_router(auth.router, prefix="")
app.include_router(tweet.router, prefix="")
app.include_router(media.router, prefix="/media", tags=["media"])

@app.get("/")
async def root():
    return {"message": "API Twitter Clone"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)