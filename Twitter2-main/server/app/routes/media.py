from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form, Response
from fastapi.responses import StreamingResponse
from bson import ObjectId
from app.database import db, fs
from app.models.tweet import TweetCreate, Tweet
from app.models.user import User
from app.services.auth import get_current_user
from datetime import datetime
import io
import mimetypes
import uuid

# Création d'une route séparée pour les médias
router = APIRouter()

@router.post("/upload", response_model=dict)
async def upload_media(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user)
):
    # Vérifier le type de fichier
    content_type = file.content_type
    if not content_type:
        raise HTTPException(status_code=400, detail="Type de fichier non détecté")
    
    # Déterminer le type de média
    media_type = None
    if content_type.startswith("image/"):
        media_type = "image"
    elif content_type.startswith("video/"):
        media_type = "video"
    else:
        raise HTTPException(status_code=400, detail="Format de média non supporté")
    
    # Lire le contenu du fichier
    contents = await file.read()
    
    # Vérifier la taille du fichier (limite à 10 Mo)
    file_size = len(contents)
    if file_size > 10 * 1024 * 1024:  # 10 Mo
        raise HTTPException(status_code=400, detail="Fichier trop volumineux (max 10 Mo)")
    
    # Générer un ID unique pour le fichier
    file_id = str(uuid.uuid4())
    
    # Stocker le fichier dans GridFS avec des métadonnées
    metadata = {
        "filename": file.filename,
        "content_type": content_type,
        "media_type": media_type,
        "user_id": current_user.id,
        "upload_date": datetime.utcnow()
    }
    
    stored_id = fs.put(contents, filename=file_id, metadata=metadata)
    
    # Retourner l'ID du fichier stocké et les métadonnées
    return {
        "media_id": str(stored_id),
        "media_type": media_type
    }

@router.get("/{media_id}")
async def get_media(media_id: str):
    try:
        # Chercher le fichier dans GridFS
        file_obj = fs.get(ObjectId(media_id))
        
        # Définir le type de contenu
        content_type = file_obj.metadata.get("content_type", "application/octet-stream")
        
        # Créer un générateur pour les données du fichier
        def file_iterator():
            chunk_size = 1024 * 1024  # 1 MB chunks
            while True:
                chunk = file_obj.read(chunk_size)
                if not chunk:
                    break
                yield chunk
        
        # Retourner une réponse streaming avec le bon Content-Type
        return StreamingResponse(
            file_iterator(),
            media_type=content_type,
            headers={"Content-Disposition": f"inline; filename={file_obj.filename}"}
        )
        
    except Exception as e:
        raise HTTPException(status_code=404, detail=f"Média non trouvé: {str(e)}")