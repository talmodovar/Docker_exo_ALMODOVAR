'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { User } from '@/types';
import { getCurrentUser } from '@/services/api';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isDarkMode: boolean;
  loading: boolean;
  login: (token: string, user: User) => void;
  logout: () => void;
  toggleTheme: () => void;
  updateUserInContext: (updatedUser: User) => void;
  refreshUserData: () => Promise<void>;
}

const defaultAuthState: AuthContextType = {
  user: null,
  token: null,
  isAuthenticated: false,
  isDarkMode: true,
  loading: true,
  login: () => {},
  logout: () => {},
  toggleTheme: () => {},
  updateUserInContext: () => {},
  refreshUserData: async () => {},
};

const AuthContext = createContext<AuthContextType>(defaultAuthState);

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isDarkMode, setIsDarkMode] = useState(true);

  // Initialisation du thème
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    setIsDarkMode(savedTheme ? savedTheme === 'dark' : true);
  }, []);

  // Gestion du thème
  const toggleTheme = () => {
    const newTheme = !isDarkMode;
    setIsDarkMode(newTheme);
    localStorage.setItem('theme', newTheme ? 'dark' : 'light');
  };

  // Mise à jour des données utilisateur
  const updateUserInContext = (updatedUser: User) => {
    setUser(updatedUser);
  };

  // Rafraîchissement des données utilisateur
  const refreshUserData = async () => {
    if (!isAuthenticated) return;

    try {
      const userData = await getCurrentUser();
      setUser(userData);
    } catch (error) {
      console.error('Erreur lors du rafraîchissement des données utilisateur:', error);
    }
  };

  // Initialisation de l'authentification
  useEffect(() => {
    const initAuth = async () => {
      try {
        const storedToken = localStorage.getItem('token');
        
        if (storedToken) {
          try {
            const userData = await getCurrentUser();
            
            if (userData) {
              setUser(userData);
              setToken(storedToken);
              setIsAuthenticated(true);
            }
          } catch (error) {
            console.error('Erreur lors de la récupération des informations utilisateur:', error);
            localStorage.removeItem('token');
          }
        }
      } catch (error) {
        console.error('Erreur d\'initialisation de l\'authentification:', error);
        localStorage.removeItem('token');
      } finally {
        setLoading(false);
      }
    };

    initAuth();
  }, []);

  // Fonctions d'authentification
  const login = (newToken: string, userData: User) => {
    localStorage.setItem('token', newToken);
    setUser(userData);
    setToken(newToken);
    setIsAuthenticated(true);
  };

  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
    setToken(null);
    setIsAuthenticated(false);
  };

  const contextValue: AuthContextType = {
    user,
    token,
    isAuthenticated,
    isDarkMode,
    loading,
    login,
    logout,
    toggleTheme,
    updateUserInContext,
    refreshUserData,
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};