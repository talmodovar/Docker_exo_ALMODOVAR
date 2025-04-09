'use client';

import React, { useState, useEffect } from 'react';
import { followUser, unfollowUser, checkFollowStatus } from '@/services/api';
import { useAuth } from '@/context/AppContext';

interface FollowButtonProps {
  username: string;
  onFollowChange?: (following: boolean) => void;
  isDarkMode?: boolean;
}

const FollowButton: React.FC<FollowButtonProps> = ({ username, onFollowChange, isDarkMode = true }) => {
  const { user } = useAuth();
  const [isFollowing, setIsFollowing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  // Vérifier le statut initial
  useEffect(() => {
    const checkFollowing = async () => {
      try {
        if (user && user.username !== username) {
          const status = await checkFollowStatus(username);
          setIsFollowing(status.following);
        }
      } catch (error) {
        console.error('Erreur lors de la vérification du statut de suivi:', error);
      }
    };

    checkFollowing();
  }, [username, user]);

  // Si c'est le profil de l'utilisateur connecté, ne pas afficher le bouton
  if (!user || user.username === username) {
    return null;
  }

  const handleFollowToggle = async () => {
    setIsLoading(true);
    try {
      if (isFollowing) {
        await unfollowUser(username);
      } else {
        await followUser(username);
      }
      setIsFollowing(!isFollowing);
      
      if (onFollowChange) {
        onFollowChange(!isFollowing);
      }
    } catch (error) {
      console.error('Erreur lors du changement de statut de suivi:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <button
      onClick={handleFollowToggle}
      disabled={isLoading}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`
        px-4 py-2 rounded-full font-medium transition-all
        ${isLoading ? 'cursor-not-allowed opacity-75' : ''}
        ${isFollowing
          ? isDarkMode
            ? `border ${isHovered 
              ? 'border-red-500 bg-red-500/10 text-red-500' 
              : 'border-gray-400 text-gray-400 hover:border-red-500'}`
            : `border ${isHovered
              ? 'border-red-500 bg-red-500/10 text-red-500'
              : 'border-gray-600 text-gray-600 hover:border-red-500'}`
          : isDarkMode
            ? 'bg-purple-500 text-white hover:bg-purple-600'
            : 'bg-purple-600 text-white hover:bg-purple-700'
        }
      `}
    >
      {isLoading ? (
        <span className="flex items-center justify-center">
          <svg 
            className="animate-spin h-4 w-4 mr-2" 
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
          <span>{isFollowing ? 'Désabonnement...' : 'Abonnement...'}</span>
        </span>
      ) : (
        <span>
          {isFollowing 
            ? (isHovered ? 'Se désabonner' : 'Abonné') 
            : 'S\'abonner'
          }
        </span>
      )}
    </button>
  );
};

export default FollowButton;