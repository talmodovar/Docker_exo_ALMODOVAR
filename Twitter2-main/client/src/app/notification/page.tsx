'use client';

import React, { useEffect } from 'react';
import { NotificationsPage } from '@/components/NotificationComponents';
import { useAuth } from '@/context/AppContext';
import { redirect } from 'next/navigation';

export default function Notifications() {
  const { isAuthenticated, loading: authLoading, isDarkMode } = useAuth();

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      redirect('/login');
    }
  }, [isAuthenticated, authLoading]);

  if (authLoading) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${
        isDarkMode ? 'bg-gray-900' : 'bg-gray-50'
      }`}>
        <div className="text-center">
          <div className="spinner w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className={`mt-4 ${
            isDarkMode ? 'text-gray-400' : 'text-gray-500'
          }`}>
            Chargement...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen p-4 ${
      isDarkMode ? 'bg-gray-900' : 'bg-gray-50'
    }`}>
      <NotificationsPage isDarkMode={isDarkMode} />
    </div>
  );
}