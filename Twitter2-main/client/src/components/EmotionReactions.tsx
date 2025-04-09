'use client';
import React, { useState, useEffect } from 'react';

interface ReactionSummary {
  tweet_id: string;
  reaction_count: number;
  reactions: {
    [key: string]: number;
  };
}

interface EmotionReactionsProps {
  tweetId: string;
  userReaction?: string;
  reactionData?: {
    reaction_count: number;
    reactions: {
      [key: string]: number;
    };
    user_reaction: string | null;
  };
}

// Mapping des émotions vers les émojis
const emotionEmojis: { [key: string]: string } = {
  angry: '😠',
  disgust: '🤢',
  fear: '😨',
  happy: '😄',
  sad: '😢',
  surprise: '😮',
  neutral: '😐'
};

const EmotionReactions: React.FC<EmotionReactionsProps> = ({ tweetId, userReaction, reactionData }) => {
  const [reactionSummary, setReactionSummary] = useState<ReactionSummary | null>(
    reactionData ? {
      tweet_id: tweetId,
      reaction_count: reactionData.reaction_count,
      reactions: reactionData.reactions
    } : null
  );
  const [loading, setLoading] = useState(!reactionData);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if(!reactionData) {
      fetchReactionSummary();
    }
  }, [tweetId, userReaction, reactionData]);

  const fetchReactionSummary = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(`http://localhost:8000/api/tweets/${tweetId}/reactions/summary`);
      
      if (!response.ok) {
        throw new Error(`Erreur HTTP: ${response.status}`);
      }
      
      const data = await response.json();
      setReactionSummary(data);
    } catch (error: any) {
      console.error('Erreur lors de la récupération des réactions:', error);
      setError(error.message || 'Erreur lors de la récupération des réactions');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="mt-2 text-sm text-gray-500">Chargement des réactions...</div>;
  }

  if (error) {
    return <div className="mt-2 text-sm text-red-500">{error}</div>;
  }

  if (!reactionSummary || reactionSummary.reaction_count === 0) {
    return <div className="mt-2 text-sm text-gray-500">Aucune réaction</div>;
  }

  return (
    <div className="mt-3">
      <div className="text-sm text-gray-600 mb-1">Réactions:</div>
      <div className="flex items-center space-x-2">
        {Object.entries(reactionSummary.reactions).map(([emotion, count]) => (
          <div 
            key={emotion} 
            className={`flex items-center bg-gray-100 rounded-full px-3 py-1 
              ${userReaction === emotion ? 'ring-2 ring-blue-400' : ''}`}
          >
            <span className="text-xl mr-1">{emotionEmojis[emotion] || '😶'}</span>
            <span className="text-sm font-medium">{count}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default EmotionReactions;