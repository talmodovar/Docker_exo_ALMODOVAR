'use client';

import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiCamera, FiX, FiSave } from 'react-icons/fi';
import { User } from '@/types';
import { uploadProfilePhoto, uploadBannerPhoto, updateUserProfile, getUserMediaUrl } from '@/services/api';
import { useAuth } from '@/context/AppContext';

interface ProfileEditorProps {
  user: User;
  isVisible: boolean;
  onClose: () => void;
  onProfileUpdated: (updatedUser: User) => void;
  isDarkMode: boolean;
}

const ProfileEditor: React.FC<ProfileEditorProps> = ({ 
  user, 
  isVisible, 
  onClose, 
  onProfileUpdated,
  isDarkMode 
}) => {
  const [bio, setBio] = useState(user.bio || '');
  const [profilePhotoFile, setProfilePhotoFile] = useState<File | null>(null);
  const [profilePhotoPreview, setProfilePhotoPreview] = useState<string | null>(
    user.profile_picture_id ? getUserMediaUrl(user.profile_picture_id) : null
  );
  const [bannerPhotoFile, setBannerPhotoFile] = useState<File | null>(null);
  const [bannerPhotoPreview, setBannerPhotoPreview] = useState<string | null>(
    user.banner_picture_id ? getUserMediaUrl(user.banner_picture_id) : null
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const profilePhotoInputRef = useRef<HTMLInputElement>(null);
  const bannerPhotoInputRef = useRef<HTMLInputElement>(null);
  const { updateUserInContext, refreshUserData } = useAuth();

  const handleProfilePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      
      if (file.type.split('/')[0] !== 'image') {
        setError('Seules les images sont acceptées pour la photo de profil');
        return;
      }
      
      if (file.size > 5 * 1024 * 1024) {
        setError('La photo de profil est trop volumineuse (max 5 MB)');
        return;
      }
      
      setProfilePhotoFile(file);
      const reader = new FileReader();
      reader.onload = (e) => setProfilePhotoPreview(e.target?.result as string);
      reader.readAsDataURL(file);
    }
  };
  
  const handleBannerPhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      
      if (file.type.split('/')[0] !== 'image') {
        setError('Seules les images sont acceptées pour la bannière');
        return;
      }
      
      if (file.size > 5 * 1024 * 1024) {
        setError('La bannière est trop volumineuse (max 5 MB)');
        return;
      }
      
      setBannerPhotoFile(file);
      const reader = new FileReader();
      reader.onload = (e) => setBannerPhotoPreview(e.target?.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async () => {
    setIsSubmitting(true);
    setError(null);
    
    try {
      let updatedProfilePictureId = user.profile_picture_id;
      let updatedBannerPictureId = user.banner_picture_id;
      
      if (profilePhotoFile) {
        const profileResponse = await uploadProfilePhoto(profilePhotoFile);
        updatedProfilePictureId = profileResponse.profile_picture_id;
      }
      
      if (bannerPhotoFile) {
        const bannerResponse = await uploadBannerPhoto(bannerPhotoFile);
        updatedBannerPictureId = bannerResponse.banner_picture_id;
      }
      
      await updateUserProfile(bio);
      await refreshUserData();
      
      onClose();
    } catch (error) {
      console.error('Error updating profile:', error);
      setError('Une erreur est survenue lors de la mise à jour du profil.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className={`rounded-xl shadow-xl w-full max-w-xl max-h-[90vh] overflow-y-auto ${
          isDarkMode ? 'bg-gray-900' : 'bg-white'
        }`}
      >
        <div className={`p-4 border-b flex justify-between items-center ${
          isDarkMode ? 'border-gray-800' : 'border-gray-200'
        }`}>
          <h2 className={`text-xl font-bold ${
            isDarkMode ? 'text-white' : 'text-gray-900'
          }`}>
            Modifier votre profil
          </h2>
          <button 
            onClick={onClose}
            className={`p-2 rounded-full transition-colors ${
              isDarkMode 
                ? 'text-gray-400 hover:text-white hover:bg-gray-700'
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
            }`}
          >
            <FiX className="w-5 h-5" />
          </button>
        </div>
        
        <div className="p-4">
          {/* Bannière */}
          <div className="relative mb-12">
            <div className={`w-full h-32 rounded-lg overflow-hidden ${
              !bannerPhotoPreview 
                ? isDarkMode ? 'bg-gray-800' : 'bg-gray-100'
                : ''
            }`}>
              {bannerPhotoPreview && (
                <img 
                  src={bannerPhotoPreview} 
                  alt="Bannière" 
                  className="w-full h-full object-cover"
                />
              )}
              
              <input
                type="file"
                ref={bannerPhotoInputRef}
                onChange={handleBannerPhotoChange}
                accept="image/*"
                className="hidden"
              />
              
              <button
                type="button"
                onClick={() => bannerPhotoInputRef.current?.click()}
                className="absolute inset-0 w-full h-full flex items-center justify-center bg-black/40 opacity-0 hover:opacity-100 transition-opacity"
              >
                <div className="flex flex-col items-center">
                  <FiCamera className="w-8 h-8 text-white mb-2" />
                  <span className="text-white text-sm font-medium">
                    Changer la bannière
                  </span>
                </div>
              </button>
            </div>
            
            {/* Photo de profil */}
            <div className="absolute -bottom-10 left-4">
              <div className={`w-24 h-24 rounded-full ${
                !profilePhotoPreview ? 'bg-purple-500' : ''
              } border-4 ${
                isDarkMode ? 'border-gray-900' : 'border-white'
              } overflow-hidden flex items-center justify-center`}>
                {profilePhotoPreview ? (
                  <img 
                    src={profilePhotoPreview} 
                    alt="Photo de profil" 
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-white font-bold text-4xl">
                    {user.username.charAt(0).toUpperCase()}
                  </span>
                )}
                
                <input
                  type="file"
                  ref={profilePhotoInputRef}
                  onChange={handleProfilePhotoChange}
                  accept="image/*"
                  className="hidden"
                />
                
                <button
                  type="button"
                  onClick={() => profilePhotoInputRef.current?.click()}
                  className="absolute inset-0 w-full h-full flex items-center justify-center bg-black/40 opacity-0 hover:opacity-100 transition-opacity"
                >
                  <FiCamera className="w-6 h-6 text-white" />
                </button>
              </div>
            </div>
          </div>
          
          {/* Formulaire bio */}
          <div className="mt-6">
            <label htmlFor="bio" className={`block text-sm font-medium mb-1 ${
              isDarkMode ? 'text-gray-300' : 'text-gray-700'
            }`}>
              Biographie
            </label>
            <textarea
              id="bio"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              maxLength={160}
              placeholder="Parlez-nous de vous..."
              className={`w-full border rounded-lg p-3 transition-all resize-none focus:outline-none focus:ring-2 focus:ring-purple-500 ${
                isDarkMode 
                  ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-400'
                  : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
              }`}
              rows={4}
            />
            <div className={`text-right text-sm mt-1 ${
              isDarkMode ? 'text-gray-400' : 'text-gray-500'
            }`}>
              {bio.length}/160 caractères
            </div>
          </div>
          
          {/* Messages d'erreur */}
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className={`p-3 rounded-lg mt-4 ${
                  isDarkMode 
                    ? 'bg-red-500/20 text-red-400'
                    : 'bg-red-100 text-red-600'
                }`}
              >
                {error}
              </motion.div>
            )}
          </AnimatePresence>
          
          {/* Bouton de sauvegarde */}
          <div className="mt-6 flex justify-end">
            <button
              type="button"
              onClick={handleSave}
              disabled={isSubmitting}
              className={`px-6 py-2 rounded-full font-medium transition-all flex items-center ${
                isSubmitting
                  ? 'bg-purple-500/50 text-white/50 cursor-not-allowed'
                  : 'bg-purple-500 hover:bg-purple-600 text-white'
              }`}
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                  <span>Enregistrement...</span>
                </>
              ) : (
                <>
                  <FiSave className="w-4 h-4 mr-2" />
                  <span>Enregistrer</span>
                </>
              )}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default ProfileEditor;