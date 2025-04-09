'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Tweet } from '@/types';
import { useAuth } from '@/context/AppContext';
import { motion } from 'framer-motion';
import { getTrendingHashtags, search } from '@/services/api';
import { TweetCard } from '@/components/TweetCard';

interface TrendingTag {
  tag: string;
  count: number;
  sample_tweets: Tweet[];
}

const TrendsPage = () => {
  const { user, isAuthenticated, loading: authLoading, isDarkMode } = useAuth();
  const [trends, setTrends] = useState<TrendingTag[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [tagTweets, setTagTweets] = useState<Tweet[]>([]);
  
  const router = useRouter();

  // Redirection si non authentifié
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, authLoading, router]);

  // Fetch trending hashtags
  useEffect(() => {
    const fetchTrends = async () => {
      if (!isAuthenticated) return;
      
      setIsLoading(true);
      setError(null);
      try {
        const data = await getTrendingHashtags();
        setTrends(data);
      } catch (error) {
        console.error('Error fetching trends:', error);
        setError('Failed to load trending hashtags');
        setTrends([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchTrends();
  }, [isAuthenticated]);

  // Fetch tweets for selected tag
  useEffect(() => {
    const fetchTagTweets = async () => {
      if (!selectedTag) {
        setTagTweets([]);
        return;
      }
      
      try {
        setIsLoading(true);
        const results = await search(selectedTag);
        setTagTweets(results.tweets);
      } catch (error) {
        console.error('Error fetching tag tweets:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchTagTweets();
  }, [selectedTag]);

  // Loader component
  const Loader = () => (
    <div className={`flex justify-center items-center py-10`}>
      <div className="w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
    </div>
  );

  // Error component
  const ErrorDisplay = () => (
    <div className={`flex justify-center items-center py-10`}>
      <div className="text-red-500 flex flex-col items-center">
        <p>{error}</p>
        <button 
          onClick={() => window.location.reload()} 
          className="mt-4 px-4 py-2 bg-purple-500 rounded-full text-white hover:bg-purple-600 transition-colors"
        >
          Réessayer
        </button>
      </div>
    </div>
  );

  if (authLoading) return <Loader />;
  if (!isAuthenticated) return null;

  return (
    <div className={`min-h-screen ${isDarkMode ? 'bg-gray-900' : 'bg-white'}`}>
      <main className="max-w-2xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <div className={`sticky top-0 z-10 ${
            isDarkMode 
              ? 'bg-gray-900/80 border-gray-800' 
              : 'bg-white/80 border-gray-200'
          } backdrop-blur-md`}>
            <div className={`px-4 py-3 border-b ${
              isDarkMode ? 'border-gray-800' : 'border-gray-200'
            }`}>
              <h1 className={`text-xl font-bold ${
                isDarkMode ? 'text-white' : 'text-gray-900'
              }`}>{selectedTag ? `#${selectedTag}` : 'Tendances'}</h1>
              
              {selectedTag && (
                <button 
                  onClick={() => setSelectedTag(null)}
                  className={`mt-2 flex items-center text-sm ${
                    isDarkMode ? 'text-purple-400' : 'text-purple-600'
                  }`}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 mr-1">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
                  </svg>
                  Retour aux tendances
                </button>
              )}
            </div>
          </div>

          {isLoading && !selectedTag ? (
            <Loader />
          ) : error && !selectedTag ? (
            <ErrorDisplay />
          ) : !selectedTag ? (
            <div className={`p-4 divide-y ${
              isDarkMode ? 'divide-gray-800' : 'divide-gray-200'
            }`}>
              {trends.length > 0 ? (
                trends.map((trend) => (
                  <motion.div
                    key={trend.tag}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.3 }}
                    className={`py-4 cursor-pointer hover:bg-${
                      isDarkMode ? 'gray-800/50' : 'gray-100'
                    } px-3 rounded-lg transition-colors`}
                    onClick={() => setSelectedTag(trend.tag)}
                  >
                    <p className="text-lg font-bold text-purple-500">#{trend.tag}</p>
                    <p className={`text-sm ${
                      isDarkMode ? 'text-gray-400' : 'text-gray-500'
                    }`}>{trend.count} tweet{trend.count > 1 ? 's' : ''}</p>
                  </motion.div>
                ))
              ) : (
                <div className={`flex flex-col items-center justify-center py-8 ${
                  isDarkMode ? 'text-gray-400' : 'text-gray-500'
                }`}>
                  <p className="text-xl font-semibold">Aucune tendance pour le moment</p>
                  <p className="mt-2">Utilisez des hashtags dans vos tweets pour voir les tendances !</p>
                </div>
              )}
            </div>
          ) : (
            <div className="p-4">
              {isLoading ? (
                <Loader />
              ) : (
                <div className={`divide-y ${
                  isDarkMode ? 'divide-gray-800' : 'divide-gray-200'
                }`}>
                  {tagTweets.length > 0 ? (
                    tagTweets.map(tweet => (
                      <motion.div
                        key={tweet.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.3 }}
                      >
                        <TweetCard
                          tweet={tweet}
                          onTweetUpdate={(updatedTweet) => {
                            setTagTweets(prev =>
                              prev.map(t => t.id === updatedTweet.id ? updatedTweet : t)
                            );
                          }}
                        />
                      </motion.div>
                    ))
                  ) : (
                    <div className={`flex flex-col items-center justify-center py-8 ${
                      isDarkMode ? 'text-gray-400' : 'text-gray-500'
                    }`}>
                      <p className="text-xl font-semibold">Aucun tweet trouvé</p>
                      <p className="mt-2">Soyez le premier à tweeter avec #{selectedTag} !</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </motion.div>
      </main>
    </div>
  );
};

export default TrendsPage;