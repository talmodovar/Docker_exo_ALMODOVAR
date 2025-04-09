'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { registerUser, loginUser, getCurrentUser } from '@/services/api';
import { useAuth } from '@/context/AppContext';
import { motion } from 'framer-motion';
import { FiSun, FiMoon, FiUser, FiMail, FiLock } from 'react-icons/fi';

export default function RegisterPage() {
  // États
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isDarkMode, setIsDarkMode] = useState(false);

  // Hooks
  const router = useRouter();
  const { login, isAuthenticated, loading: authLoading } = useAuth();

  // Effet pour vérifier le thème et l'authentification
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    setIsDarkMode(savedTheme === 'dark');

    if (!authLoading && isAuthenticated) {
      router.push('/');
    }
  }, [isAuthenticated, authLoading, router]);

  // Gestionnaires d'événements
  const toggleTheme = () => {
    setIsDarkMode(!isDarkMode);
    localStorage.setItem('theme', !isDarkMode ? 'dark' : 'light');
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!formData.username || !formData.email || !formData.password) {
      setError('Tous les champs sont requis');
      return;
    }

    try {
      setLoading(true);
      await registerUser(formData.username, formData.email, formData.password);
      
      const tokenData = await loginUser(formData.username, formData.password);
      localStorage.setItem('token', tokenData.access_token);
      
      const user = await getCurrentUser();
      login(tokenData.access_token, user);
      router.push('/');
    } catch (error: any) {
      setError(error.response?.data?.detail || 'Erreur d\'inscription');
    } finally {
      setLoading(false);
    }
  };

  // Affichage du loader pendant la vérification de l'authentification
  if (authLoading) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${
        isDarkMode ? 'bg-gray-900' : 'bg-gray-50'
      }`}>
        <div className="w-10 h-10 border-4 border-purple-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className={`min-h-screen flex items-center justify-center transition-all duration-300 ${
      isDarkMode 
        ? 'bg-gray-900' 
        : 'bg-gradient-to-br from-purple-50 via-white to-pink-50'
    }`}>
      <motion.div 
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className={`w-[400px] rounded-2xl shadow-xl p-8 ${
          isDarkMode 
            ? 'bg-gray-800 shadow-gray-700/30' 
            : 'bg-white/80 backdrop-blur-sm'
        }`}
      >
        {/* Bouton thème */}
        <div className="flex justify-end mb-6">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={toggleTheme}
            className={`p-2.5 rounded-full transition-colors ${
              isDarkMode 
                ? 'bg-gray-700 text-yellow-400 hover:bg-gray-600' 
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {isDarkMode ? <FiSun size={20} /> : <FiMoon size={20} />}
          </motion.button>
        </div>

        {/* En-tête */}
        <motion.div 
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="text-center mb-8"
        >
          <h1 className={`text-2xl font-bold mb-2 ${
            isDarkMode ? 'text-white' : 'text-gray-800'
          }`}>
            Twitter Clone
          </h1>
          <p className={`text-sm ${
            isDarkMode ? 'text-gray-400' : 'text-gray-600'
          }`}>
            Créez votre compte
          </p>
        </motion.div>

        {/* Message d'erreur */}
        {error && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`mb-6 p-3 rounded-lg text-sm flex items-center justify-center ${
              isDarkMode 
                ? 'bg-red-900/50 text-red-200' 
                : 'bg-red-50 text-red-600'
            }`}
          >
            {error}
          </motion.div>
        )}

        {/* Formulaire */}
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="relative">
            <FiUser className={`absolute left-3 top-3 ${
              isDarkMode ? 'text-gray-400' : 'text-gray-500'
            }`} />
            <input
              type="text"
              name="username"
              value={formData.username}
              onChange={handleChange}
              placeholder="Nom d'utilisateur"
              className={`w-full pl-10 pr-4 py-2.5 text-sm rounded-lg border transition-colors ${
                isDarkMode 
                  ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:border-purple-500' 
                  : 'bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-500 focus:border-purple-500'
              }`}
              disabled={loading}
            />
          </div>

          <div className="relative">
            <FiMail className={`absolute left-3 top-3 ${
              isDarkMode ? 'text-gray-400' : 'text-gray-500'
            }`} />
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="Adresse email"
              className={`w-full pl-10 pr-4 py-2.5 text-sm rounded-lg border transition-colors ${
                isDarkMode 
                  ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:border-purple-500' 
                  : 'bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-500 focus:border-purple-500'
              }`}
              disabled={loading}
            />
          </div>

          <div className="relative">
            <FiLock className={`absolute left-3 top-3 ${
              isDarkMode ? 'text-gray-400' : 'text-gray-500'
            }`} />
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="Mot de passe"
              className={`w-full pl-10 pr-4 py-2.5 text-sm rounded-lg border transition-colors ${
                isDarkMode 
                  ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:border-purple-500' 
                  : 'bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-500 focus:border-purple-500'
              }`}
              disabled={loading}
            />
          </div>

          <motion.button
            type="submit"
            disabled={loading}
            className={`w-full py-2.5 rounded-lg text-sm font-medium transition-colors ${
              isDarkMode
                ? 'bg-purple-600 hover:bg-purple-700 text-white'
                : 'bg-purple-500 hover:bg-purple-600 text-white'
            }`}
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
          >
            {loading ? (
              <div className="flex items-center justify-center">
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                <span>Inscription...</span>
              </div>
            ) : 'S\'inscrire'}
          </motion.button>
        </form>

        {/* Lien de connexion */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="mt-6 text-center text-sm"
        >
          <p className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>
            Déjà un compte ?{' '}
            <Link 
              href="/login" 
              className={`font-medium transition-colors ${
                isDarkMode
                  ? 'text-purple-400 hover:text-purple-300'
                  : 'text-purple-500 hover:text-purple-600'
              }`}
            >
              Connectez-vous
            </Link>
          </p>
        </motion.div>
      </motion.div>
    </div>
  );
}