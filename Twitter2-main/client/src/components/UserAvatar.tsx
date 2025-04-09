'use client';

import React, { useState, useEffect } from 'react';
import { getUserByUsername, getUserMediaUrl } from '@/services/api';
import { User } from '@/types';

interface UserAvatarProps {
  username: string;
  size?: 'small' | 'medium' | 'large';
  className?: string;
  userInfo?: {
    id: string;
    username: string;
    profile_picture_id?: string;
    bio?: string;
  };
}

const UserAvatar: React.FC<UserAvatarProps> = ({ 
  username, 
  size = 'medium', 
  className = '',
  userInfo
}) => {
  const [user, setUser] = useState(userInfo || null);
  const [loading, setLoading] = useState(!userInfo);
  const [error, setError] = useState(false);

  // Dimensions basées sur la taille
  const dimensions = {
    small: 'w-8 h-8',
    medium: 'w-12 h-12',
    large: 'w-24 h-24'
  };

  // Taille de la police basée sur la taille de l'avatar
  const fontSizes = {
    small: 'text-lg',
    medium: 'text-xl',
    large: 'text-4xl'
  };

  useEffect(() => {
    if(!userInfo){
      const fetchUser = async () => {
        try {
          setLoading(true);
          const userData = await getUserByUsername(username);
          if (userData) {
            setUser(userData);
          } else {
            setError(true);
          }
        } catch (error) {
          console.error(`Erreur lors de la récupération de l'utilisateur ${username}:`, error);
          setError(true);
        } finally {
          setLoading(false);
        }
      };

      fetchUser();
    }

  }, [username, userInfo]);

  // Si l'utilisateur a une photo de profil
  if (!loading && user?.profile_picture_id) {
    return (
      <div className={`${dimensions[size]} rounded-full overflow-hidden ${className}`}>
        <img 
          src={getUserMediaUrl(user.profile_picture_id) || ''} 
          alt={`${username} profile`} 
          className="w-full h-full object-cover"
          onError={() => setError(true)} // En cas d'erreur de chargement, afficher l'initiale
        />
      </div>
    );
  }

  // Avatar par défaut (initiale)
  return (
    <div 
      className={`${dimensions[size]} rounded-full bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center text-white shadow-lg ${className}`}
    >
      <span className={`font-bold ${fontSizes[size]}`}>
        {username.charAt(0).toUpperCase()}
      </span>
    </div>
  );
};

export default UserAvatar;