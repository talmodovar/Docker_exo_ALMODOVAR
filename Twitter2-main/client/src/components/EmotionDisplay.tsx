'use client';
import React from 'react';

interface Emotion {
  angry: number;
  disgust: number;
  fear: number;
  happy: number;
  sad: number;
  surprise: number;
  neutral: number;
}

interface FaceResult {
  box: number[];
  emotions: Emotion;
  dominant_emotion: string;
  confidence: number;
}

interface EmotionDisplayProps {
  emotionData: {
    success: boolean;
    message: string;
    emotions: FaceResult[];
  } | null;
}

const emotionColors = {
  angry: 'bg-red-500',
  disgust: 'bg-purple-500',
  fear: 'bg-yellow-500',
  happy: 'bg-green-500',
  sad: 'bg-blue-500',
  surprise: 'bg-pink-500',
  neutral: 'bg-gray-500'
};

const emotionEmojis = {
  angry: '😠',
  disgust: '🤢',
  fear: '😨',
  happy: '😄',
  sad: '😢',
  surprise: '😮',
  neutral: '😐'
};

const EmotionDisplay = ({ emotionData }: EmotionDisplayProps) => {
  if (!emotionData) return null;
  
  if (!emotionData.success) {
    return (
      <div className="w-full p-4 bg-red-100 border border-red-400 text-red-700 rounded">
        Erreur: {emotionData.message}
      </div>
    );
  }
  
  if (emotionData.emotions.length === 0) {
    return (
      <div className="w-full p-4 bg-yellow-100 border border-yellow-400 text-yellow-700 rounded">
        {emotionData.message || "Aucun visage détecté"}
      </div>
    );
  }
  
  return (
    <div className="w-full">
      <h3 className="text-lg font-semibold mb-3">Analyse d'émotions</h3>
      
      {emotionData.emotions.map((face, index) => (
        <div key={index} className="mb-4 p-4 border rounded shadow-sm">
          <div className="flex items-center mb-3">
            <div className={`w-8 h-8 rounded-full mr-2 flex items-center justify-center text-xl ${emotionColors[face.dominant_emotion as keyof typeof emotionColors] || 'bg-gray-500'}`}>
              {emotionEmojis[face.dominant_emotion as keyof typeof emotionEmojis] || '?'}
            </div>
            <h4 className="text-lg font-medium capitalize">
              {face.dominant_emotion} ({(face.confidence * 100).toFixed(1)}%)
            </h4>
          </div>
          
          <div className="space-y-2">
            {Object.entries(face.emotions).map(([emotion, value]) => (
              <div key={emotion} className="relative pt-1">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-medium capitalize flex items-center">
                    {emotionEmojis[emotion as keyof typeof emotionEmojis] || '?'} {emotion}
                  </div>
                  <div className="text-sm font-medium">{(value * 100).toFixed(1)}%</div>
                </div>
                <div className="overflow-hidden h-2 text-xs flex rounded bg-gray-200">
                  <div 
                    style={{ width: `${value * 100}%` }} 
                    className={`shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center ${emotionColors[emotion as keyof typeof emotionColors] || 'bg-gray-500'}`}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

export default EmotionDisplay;