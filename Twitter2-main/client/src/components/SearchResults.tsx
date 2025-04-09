'use client';

import React from 'react';
import Link from 'next/link';
import { X } from 'lucide-react';
import { User, Tweet } from '@/types';
import { TweetCard } from '@/components/TweetCard';
import { useAuth } from '@/context/AppContext';
import { getUserMediaUrl } from '@/services/api';
import { motion } from 'framer-motion';

interface SearchResultsProps {
  results: {
    users: User[];
    tweets: Tweet[];
  };
  onTweetUpdate: (tweet: Tweet) => void;
  onClear: () => void;
  query: string;
}

export const SearchResults: React.FC<SearchResultsProps> = ({
  results,
  onTweetUpdate,
  onClear,
  query
}) => {
  const { isDarkMode } = useAuth();
  const hasResults = results.users.length > 0 || results.tweets.length > 0;

  if (!hasResults) {
    return (
      <motion.div 
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className={`p-6 text-center rounded-lg ${
          isDarkMode ? 'bg-gray-800 text-gray-300' : 'bg-white text-gray-700 shadow'
        }`}
      >
        <p>No results found for "{query}"</p>
        <p className="mt-2 text-sm opacity-75">Try searching for a different username or keyword</p>
      </motion.div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-lg overflow-hidden ${
        isDarkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white shadow-md'
      }`}
    >
      <div className={`flex justify-between items-center p-4 border-b ${
        isDarkMode ? 'border-gray-700' : 'border-gray-200'
      }`}>
        <h2 className={`font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
          Results for "{query}"
        </h2>
        <button 
          onClick={onClear}
          className="text-purple-500 hover:text-purple-600 p-1 rounded-full"
          aria-label="Clear search results"
        >
          <X size={20} />
        </button>
      </div>
      
      {results.users.length > 0 && (
        <div className={`p-4 ${results.tweets.length > 0 ? `border-b ${
          isDarkMode ? 'border-gray-700' : 'border-gray-200'
        }` : ''}`}>
          <h3 className={`font-medium mb-3 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
            Users ({results.users.length})
          </h3>
          <div className="space-y-2">
            {results.users.map(user => (
              <Link key={user.id} href={`/profile/${user.username}`}>
                <div className={`flex items-center p-3 rounded-lg transition-colors ${
                  isDarkMode 
                    ? 'hover:bg-gray-700 text-gray-200' 
                    : 'hover:bg-gray-100 text-gray-700'
                }`}>
                  <div className="h-10 w-10 rounded-full overflow-hidden bg-gray-300 mr-3 flex-shrink-0">
                    {user.profile_picture_id ? (
                      <img 
                        src={getUserMediaUrl(user.profile_picture_id) || '/default-avatar.png'}
                        alt={user.username}
                        className="h-full w-full object-cover"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.src = '/default-avatar.png';
                        }}
                      />
                    ) : (
                      <div className={`h-full w-full flex items-center justify-center ${
                        isDarkMode ? 'bg-gray-700' : 'bg-gray-200'
                      }`}>
                        <span className="text-gray-500 font-bold">
                          {user.username.charAt(0).toUpperCase()}
                        </span>
                      </div>
                    )}
                  </div>
                  <div>
                    <p className="font-medium">@{user.username}</p>
                    {user.bio && 
                      <p className={`text-sm truncate max-w-xs ${
                        isDarkMode ? 'text-gray-400' : 'text-gray-500'
                      }`}>
                        {user.bio}
                      </p>
                    }
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
      
      {results.tweets.length > 0 && (
        <div>
          <div className="p-4">
            <h3 className={`font-medium mb-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
              Tweets ({results.tweets.length})
            </h3>
          </div>
          <div className={`divide-y ${isDarkMode ? 'divide-gray-700' : 'divide-gray-200'}`}>
            {results.tweets.map(tweet => (
              <TweetCard
                key={tweet.id}
                tweet={tweet}
                onTweetUpdate={onTweetUpdate}
              />
            ))}
          </div>
        </div>
      )}
    </motion.div>
  );
};