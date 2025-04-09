'use client';
import { useRef, useState, useEffect } from 'react';

interface WebcamCaptureProps {
  onImageCaptured?: (imageData: string) => void;
  autoSendToBackend?: boolean;
  compact?: boolean; // Nouveau mode compact pour l'intégration dans TweetCard
}

const WebcamCapture = ({ 
  onImageCaptured, 
  autoSendToBackend = true,
  compact = false
}: WebcamCaptureProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hasPermission, setHasPermission] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isVideoReady, setIsVideoReady] = useState<boolean>(false);

  // Démarrer automatiquement la webcam en mode compact
  useEffect(() => {
    if (compact) {
      requestWebcamAccess();
    }
  }, [compact]);

  // Démarrer la vidéo lorsque le stream est prêt et attaché à la vidéo
  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
      console.log('Stream connecté au lecteur vidéo');
    }
  }, [stream, videoRef]);

  // Nettoyer le flux média lors du démontage du composant
  useEffect(() => {
    return () => {
      if (stream) {
        console.log('Nettoyage du stream lors du démontage');
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [stream]);

  const requestWebcamAccess = async () => {
    try {
      setIsLoading(true);
      setError(null);
      setIsVideoReady(false);
      
      console.log('Demande d\'accès à la webcam...');
      const mediaStream = await navigator.mediaDevices.getUserMedia({ 
        video: {
          width: { ideal: compact ? 320 : 400 },
          height: { ideal: compact ? 240 : 400 },
          facingMode: "user"
        }
      });
      
      console.log('Accès à la webcam autorisé, tracks:', mediaStream.getTracks().length);
      setStream(mediaStream);
      setHasPermission(true);
      
    } catch (err: any) {
      console.error("Erreur d'accès à la webcam:", err);
      
      if (err.name === 'NotAllowedError') {
        setError("Accès à la webcam refusé. Veuillez autoriser l'accès dans les paramètres de votre navigateur.");
      } else if (err.name === 'NotFoundError') {
        setError("Aucune webcam détectée sur votre appareil.");
      } else {
        setError(`Impossible d'accéder à la webcam: ${err.message || 'Erreur inconnue'}`);
      }
      
      setHasPermission(false);
    } finally {
      setIsLoading(false);
    }
  };

  const stopWebcam = () => {
    if (stream) {
      console.log('Arrêt de la webcam');
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
      setHasPermission(false);
      setCapturedImage(null);
      setIsVideoReady(false);
      
      // S'assurer que la vidéo est bien arrêtée
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
    }
  };

  const handleVideoReady = () => {
    console.log('Vidéo prête à être affichée');
    setIsVideoReady(true);
  };

  const captureImage = () => {
    if (!videoRef.current || !canvasRef.current) {
      console.error('Références vidéo ou canvas non disponibles');
      return;
    }

    try {
      console.log('Capture d\'image en cours...');
      const video = videoRef.current;
      const canvas = canvasRef.current;
      
      // Utiliser les dimensions réelles de la vidéo
      const videoWidth = video.videoWidth;
      const videoHeight = video.videoHeight;
      
      if (videoWidth === 0 || videoHeight === 0) {
        console.error('Dimensions vidéo invalides');
        setError("La vidéo n'est pas correctement initialisée");
        return;
      }
      
      console.log(`Dimensions vidéo: ${videoWidth}x${videoHeight}`);
      
      // Ajuster les dimensions du canvas
      canvas.width = videoWidth;
      canvas.height = videoHeight;

      const context = canvas.getContext('2d');
      if (!context) {
        console.error('Impossible d\'obtenir le contexte 2D');
        return;
      }

      context.drawImage(video, 0, 0, canvas.width, canvas.height);

      const imageData = canvas.toDataURL('image/jpeg', 0.8);
      setCapturedImage(imageData);
      console.log('Image capturée avec succès');
      
      if (onImageCaptured) {
        onImageCaptured(imageData);
      }

      if (autoSendToBackend) {
        sendImageToBackend(imageData);
      }
    } catch (err) {
      console.error("Erreur lors de la capture:", err);
      setError("Erreur lors de la capture de l'image");
    }
  };

  const sendImageToBackend = async (imageData: string) => {
    try {
      setIsLoading(true);
      setError(null);

      console.log('Envoi de l\'image au backend pour analyse...');
      const response = await fetch('http://localhost:8000/api/emotion', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ image: imageData }),
      });

      if (!response.ok) {
        throw new Error(`Erreur HTTP: ${response.status}`);
      }

      const data = await response.json();
      console.log('Réponse du backend:', data);
      return data;
    } catch (error: any) {
      console.error('Erreur lors de l\'envoi de l\'image:', error);
      setError(`Erreur lors de l'analyse: ${error.message || 'Erreur inconnue'}`);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const retakePhoto = () => {
    setCapturedImage(null);
    setError(null);
  };

  // Classes CSS conditionnelles basées sur le mode compact
  const containerClasses = compact 
    ? "flex flex-col items-center gap-2" 
    : "flex flex-col items-center gap-4 p-4 max-w-xl mx-auto";
    
  const videoDimensions = compact
    ? "w-full max-w-sm aspect-video" // 16:9 pour compact
    : "w-full aspect-square max-w-md"; // Carré pour normal

  return (
    <div className={containerClasses}>
      {/* Messages d'erreur */}
      {error && (
        <div className="w-full bg-red-100 border border-red-400 text-red-700 px-3 py-2 rounded text-sm">
          <span>{error}</span>
        </div>
      )}

      {/* Bouton d'activation webcam */}
      {!hasPermission && !isLoading && !compact && (
        <button
          onClick={requestWebcamAccess}
          className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded-lg font-medium"
        >
          Activer la webcam
        </button>
      )}

      {/* Loader */}
      {isLoading && (
        <div className="flex justify-center p-2">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
        </div>
      )}

      {/* Affichage webcam/image */}
      {hasPermission && (
        <div className={`relative ${videoDimensions} border border-gray-300 rounded-lg overflow-hidden`}>
          {!capturedImage ? (
            <>
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                onCanPlay={handleVideoReady}
                className="w-full h-full object-cover"
              />
              {!isVideoReady && (
                <div className="absolute inset-0 flex items-center justify-center bg-gray-100 bg-opacity-70">
                  <div className="animate-pulse text-gray-600 text-sm">Chargement...</div>
                </div>
              )}
            </>
          ) : (
            <img 
              src={capturedImage}
              alt="Captured"
              className="w-full h-full object-cover"
            />
          )}
        </div>
      )}

      {/* Canvas caché - rendu uniquement lorsque nécessaire */}
      <canvas
        ref={canvasRef}
        className="hidden" // Le canvas est caché visuellement
      />

      {/* Boutons d'action */}
      {hasPermission && !isLoading && (
        <div className="flex gap-2">
          {!capturedImage ? (
            <button
              onClick={captureImage}
              className={`px-4 py-1 rounded-lg font-medium bg-blue-500 hover:bg-blue-600 text-white text-sm`}
              disabled={!isVideoReady}
            >
              {compact ? "Capturer ma réaction" : "Analyser mon expression"}
            </button>
          ) : (
            <>
              <button
                onClick={retakePhoto}
                className="px-4 py-1 rounded-lg font-medium bg-gray-500 hover:bg-gray-600 text-white text-sm"
              >
                Reprendre
              </button>
              
              {!autoSendToBackend && (
                <button
                  onClick={() => onImageCaptured && onImageCaptured(capturedImage)}
                  className="px-4 py-1 rounded-lg font-medium bg-green-500 hover:bg-green-600 text-white text-sm"
                >
                  Utiliser
                </button>
              )}
            </>
          )}
          
          {!compact && (
            <button
              onClick={stopWebcam}
              className="px-4 py-1 rounded-lg font-medium bg-red-500 hover:bg-red-600 text-white text-sm"
            >
              Arrêter
            </button>
          )}
        </div>
      )}

      {/* État de la webcam (seulement en mode non-compact) */}
      {!compact && hasPermission && (
        <div className="text-xs text-gray-600">
          <div>Webcam : {isVideoReady ? '✅ Prête' : '⏳ En chargement'}</div>
        </div>
      )}
    </div>
  );
};

export default WebcamCapture;