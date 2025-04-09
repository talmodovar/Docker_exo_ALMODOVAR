from pymongo import MongoClient
import os
from dotenv import load_dotenv
import gridfs

# Charger les variables d'environnement
load_dotenv()

# Connexion MongoDB
MONGO_URI = "mongodb+srv://user:1234@cluster0.hsa1yir.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0"
client = MongoClient(MONGO_URI)
db = client["twitter_clone"]

fs = gridfs.GridFS(db, collection="media")