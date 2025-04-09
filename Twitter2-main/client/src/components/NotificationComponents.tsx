'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Notification } from '@/types';
import { getNotifications, getUnreadNotificationsCount, markNotificationAsRead, markAllNotificationsAsRead } from '@/services/api';
import Link from 'next/link';
import { FiHeart, FiMessageCircle, FiRepeat, FiUserPlus, FiBell } from 'react-icons/fi';
import { motion, AnimatePresence } from 'framer-motion';

interface NotificationComponentsProps {
  isDarkMode: boolean;
}

interface NotificationItemProps {
  notification: Notification;
  onMarkAsRead: (id: string) => void;
  isDarkMode: boolean;
}

interface NotificationsPageProps {
  isDarkMode: boolean;
}

// Composant pour l'icône de notification avec badge
export const NotificationBell: React.FC<NotificationComponentsProps> = ({ isDarkMode }) => {
  const [notificationCount, setNotificationCount] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const notificationRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchNotificationCount = async () => {
      try {
        const data = await getUnreadNotificationsCount();
        setNotificationCount(data.count);
      } catch (error) {
        console.error('Error fetching notification count:', error);
      }
    };

    fetchNotificationCount();
    const interval = setInterval(fetchNotificationCount, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleToggleNotifications = async () => {
    const newState = !showNotifications;
    setShowNotifications(newState);
    
    if (newState && notifications.length === 0) {
      setLoading(true);
      try {
        const data = await getNotifications();
        setNotifications(data);
      } catch (error) {
        console.error('Error fetching notifications:', error);
      } finally {
        setLoading(false);
      }
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await markAllNotificationsAsRead();
      setNotificationCount(0);
      setNotifications(notifications.map(notif => ({ ...notif, read: true })));
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  };

  const handleMarkAsRead = async (notificationId: string) => {
    try {
      await markNotificationAsRead(notificationId);
      setNotifications(
        notifications.map(notif => 
          notif.id === notificationId ? { ...notif, read: true } : notif
        )
      );
      const unreadCount = notifications.filter(
        notif => notif.id !== notificationId && !notif.read
      ).length;
      setNotificationCount(unreadCount);
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  return (
    <div className="relative" ref={notificationRef}>
      <button
        onClick={handleToggleNotifications}
        className={`relative p-2 transition-colors focus:outline-none ${
          isDarkMode 
            ? 'text-gray-400 hover:text-white' 
            : 'text-gray-600 hover:text-purple-500'
        }`}
        aria-label="Notifications"
      >
        <FiBell className="h-6 w-6" />
        
        {notificationCount > 0 && (
          <span className="absolute top-0 right-0 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white transform translate-x-1/2 -translate-y-1/2 bg-purple-500 rounded-full">
            {notificationCount > 99 ? '99+' : notificationCount}
          </span>
        )}
      </button>

      <AnimatePresence>
        {showNotifications && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className={`absolute right-0 mt-2 w-80 rounded-md shadow-lg z-50 max-h-96 overflow-y-auto ${
              isDarkMode ? 'bg-gray-900' : 'bg-white'
            }`}
          >
            <div className={`p-3 border-b flex justify-between items-center ${
              isDarkMode ? 'border-gray-700' : 'border-gray-200'
            }`}>
              <h3 className={`text-lg font-semibold ${
                isDarkMode ? 'text-white' : 'text-gray-900'
              }`}>
                Notifications
              </h3>
              {notificationCount > 0 && (
                <button
                  onClick={handleMarkAllAsRead}
                  className={`text-sm transition-colors ${
                    isDarkMode 
                      ? 'text-purple-400 hover:text-purple-300' 
                      : 'text-purple-500 hover:text-purple-600'
                  }`}
                >
                  Tout marquer comme lu
                </button>
              )}
            </div>
            
            {loading ? (
              <div className="p-4 flex justify-center">
                <div className="spinner w-6 h-6 border-2 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
              </div>
            ) : notifications.length > 0 ? (
              <div>
                {notifications.map((notification) => (
                  <NotificationItem 
                    key={notification.id} 
                    notification={notification} 
                    onMarkAsRead={handleMarkAsRead}
                    isDarkMode={isDarkMode}
                  />
                ))}
              </div>
            ) : (
              <div className={`p-4 text-center ${
                isDarkMode ? 'text-gray-400' : 'text-gray-500'
              }`}>
                Aucune notification pour le moment.
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
// Composant pour un élément de notification
const NotificationItem: React.FC<NotificationItemProps> = ({ notification, onMarkAsRead, isDarkMode }) => {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    
    const seconds = Math.floor(diff / 1000);
    if (seconds < 60) return 'à l\'instant';
    
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `il y a ${minutes} min`;
    
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `il y a ${hours}h`;
    
    const days = Math.floor(hours / 24);
    if (days < 7) return `il y a ${days}j`;
    
    return date.toLocaleDateString();
  };

  const getNotificationIcon = () => {
    switch (notification.type) {
      case 'like':
        return <FiHeart className="w-4 h-4 text-pink-500" />;
      case 'comment':
        return <FiMessageCircle className="w-4 h-4 text-blue-500" />;
      case 'retweet':
        return <FiRepeat className="w-4 h-4 text-green-500" />;
      case 'follow':
        return <FiUserPlus className="w-4 h-4 text-purple-500" />;
      default:
        return null;
    }
  };

  const getNotificationText = () => {
    switch (notification.type) {
      case 'like':
        return <span> a aimé votre tweet</span>;
      case 'comment':
        return <span> a commenté votre tweet</span>;
      case 'retweet':
        return <span> a retweeté votre tweet</span>;
      case 'follow':
        return <span> a commencé à vous suivre</span>;
      default:
        return null;
    }
  };

  const handleClick = () => {
    if (!notification.read) {
      onMarkAsRead(notification.id);
    }
  };

  const notificationLink = notification.type === 'follow'
    ? `/profile/${notification.sender_username}`
    : `/tweet/${notification.tweet_id}`;

  return (
    <Link 
      href={notificationLink}
      onClick={handleClick}
      className={`block p-3 border-b transition-colors ${
        isDarkMode 
          ? `border-gray-700 ${!notification.read ? 'bg-purple-900/20' : ''} hover:bg-gray-800/50`
          : `border-gray-200 ${!notification.read ? 'bg-purple-50' : ''} hover:bg-gray-50`
      }`}
    >
      <div className="flex items-start">
        <div className="flex-shrink-0 mr-3">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
            isDarkMode ? 'bg-gray-700' : 'bg-gray-200'
          }`}>
            {getNotificationIcon()}
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <p className={`text-sm font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
            <span className="font-bold">{notification.sender_username}</span>
            {getNotificationText()}
          </p>
          {notification.type !== 'follow' && notification.tweet_content && (
            <p className={`text-xs mt-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
              {notification.tweet_content}
            </p>
          )}
          {notification.type === 'comment' && notification.comment_content && (
            <p className={`text-xs mt-1 italic ${
              isDarkMode ? 'text-gray-300 bg-gray-800/50' : 'text-gray-700 bg-gray-100'
            } p-2 rounded-lg`}>
              "{notification.comment_content}"
            </p>
          )}
          <p className={`text-xs mt-1 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
            {formatDate(notification.created_at)}
          </p>
        </div>
        {!notification.read && (
          <div className="w-2 h-2 bg-purple-500 rounded-full mt-1"></div>
        )}
      </div>
    </Link>
  );
};

// Page de notifications complète
export const NotificationsPage: React.FC<NotificationsPageProps> = ({ isDarkMode }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchNotifications = async () => {
      setLoading(true);
      try {
        const data = await getNotifications();
        setNotifications(data);
        await markAllNotificationsAsRead();
      } catch (error) {
        console.error('Error fetching notifications:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchNotifications();
  }, []);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  const getNotificationIcon = (type: 'like' | 'comment' | 'retweet' | 'follow') => {
    switch (type) {
      case 'like':
        return <FiHeart className="w-5 h-5 text-pink-500" />;
      case 'comment':
        return <FiMessageCircle className="w-5 h-5 text-blue-500" />;
      case 'retweet':
        return <FiRepeat className="w-5 h-5 text-green-500" />;
      case 'follow':
        return <FiUserPlus className="w-5 h-5 text-purple-500" />;
      default:
        return null;
    }
  };

  return (
    <div className={`max-w-2xl mx-auto ${isDarkMode ? 'bg-gray-900' : 'bg-white'}`}>
      <h1 className={`text-2xl font-bold p-4 border-b ${
        isDarkMode 
          ? 'text-white border-gray-700' 
          : 'text-gray-900 border-gray-200'
      }`}>
        Notifications
      </h1>
      
      {loading ? (
        <div className="p-8 flex justify-center">
          <div className="spinner w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : notifications.length > 0 ? (
        <div className={`divide-y ${isDarkMode ? 'divide-gray-700' : 'divide-gray-200'}`}>
          {notifications.map((notification) => (
            <div key={notification.id} className={`p-4 transition-colors ${
              isDarkMode ? 'hover:bg-gray-800/50' : 'hover:bg-gray-50'
            }`}>
              <div className="flex">
                <div className="flex-shrink-0 mr-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    isDarkMode ? 'bg-gray-700' : 'bg-gray-200'
                  }`}>
                    {getNotificationIcon(notification.type)}
                  </div>
                </div>
                <div className="flex-1">
                  <p className={isDarkMode ? 'text-white' : 'text-gray-900'}>
                    <Link 
                      href={`/profile/${notification.sender_username}`} 
                      className={`font-bold hover:underline ${
                        isDarkMode ? 'text-purple-400' : 'text-purple-600'
                      }`}
                    >
                      {notification.sender_username}
                    </Link>
                    {notification.type === 'like' && <span> a aimé votre tweet</span>}
                    {notification.type === 'comment' && <span> a commenté votre tweet</span>}
                    {notification.type === 'retweet' && <span> a retweeté votre tweet</span>}
                    {notification.type === 'follow' && <span> a commencé à vous suivre</span>}
                  </p>
                  
                  {notification.type !== 'follow' && notification.tweet_id && (
                    <Link 
                      href={`/tweet/${notification.tweet_id}`} 
                      className={`block mt-1 hover:underline ${
                        isDarkMode ? 'text-gray-400' : 'text-gray-600'
                      }`}
                    >
                      {notification.tweet_content}
                    </Link>
                  )}
                  
                  {notification.type === 'comment' && notification.comment_content && (
                    <p className={`mt-2 p-2 rounded-lg italic ${
                      isDarkMode 
                        ? 'bg-gray-800 text-gray-300' 
                        : 'bg-gray-100 text-gray-700'
                    }`}>
                      "{notification.comment_content}"
                    </p>
                  )}
                  
                  <p className={`text-xs mt-2 ${
                    isDarkMode ? 'text-gray-500' : 'text-gray-400'
                  }`}>
                    {formatDate(notification.created_at)}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className={`p-8 text-center ${
          isDarkMode ? 'text-gray-400' : 'text-gray-500'
        }`}>
          Aucune notification pour le moment.
        </div>
      )}
    </div>
  );
};