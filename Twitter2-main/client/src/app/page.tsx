'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { TweetCard } from '@/components/TweetCard';
import { TweetForm } from '@/components/TweetForm';
import { SearchBar } from '@/components/SearchBar';
import { SearchResults } from '@/components/SearchResults';
import { Tweet, User } from '@/types';
import { useAuth } from '@/context/AppContext';
import { motion } from 'framer-motion';
import { getTweets, createTweet, search, getFeedData, getRecommendedTweets } from '@/services/api';

const HomePage = () => {
  const { user, isAuthenticated, loading: authLoading, isDarkMode } = useAuth();
  const [tweets, setTweets] = useState<Tweet[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<{ users: User[], tweets: Tweet[] } | null>(null);
  const [isSearching, setIsSearching] = useState(false);

  const [recommendedTweets, setRecommendedTweets] = useState<Tweet[]>([]);

  const router = useRouter();

  // Redirection si non authentifié
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, authLoading, router]);

  // Fetch tweets
  useEffect(() => {
    const fetchTweets = async () => {
      if (!isAuthenticated) return;
      
      setIsLoading(true);
      setError(null);
      try {
        // Utiliser la nouvelle fonction qui récupère tout en une seule requête
        const data = await getFeedData();
        setTweets(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error('Error fetching tweets:', error);
        setError('Failed to load tweets');
        setTweets([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchTweets();
  }, [isAuthenticated]);

  useEffect(() => {
    const fetchRecommendations = async () => {
      if (!isAuthenticated) return;
      
      try {
        const data = await getRecommendedTweets(3);
        setRecommendedTweets(data);
      } catch (error) {
        console.error('Error fetching recommendations:', error);
      }
    };
  
    fetchRecommendations();
  }, [isAuthenticated]);

const handleTweetSubmit = async (content: string, mediaFile?: File, tags: string[] = []) => {
  console.log("📩 Tags reçus dans handleTweetSubmit :", tags);

  if (!user) return;

  try {
    const newTweet = await createTweet(content, mediaFile, tags);
    setTweets(prev => [newTweet, ...prev]);
  } catch (error) {
    console.error('Error creating tweet:', error);
  }
};



  const handleTweetUpdate = (updatedTweet: Tweet) => {
    setTweets(prev =>
      prev.map(tweet => (tweet.id === updatedTweet.id ? updatedTweet : tweet))
    );

    if (searchResults) {
      setSearchResults({
        ...searchResults,
        tweets: searchResults.tweets.map(tweet =>
          tweet.id === updatedTweet.id ? updatedTweet : tweet
          )
      });
    }
  };

  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    setIsSearching(true);
    try {
      const results = await search(query);
      setSearchResults(results);
    } catch (error) {
      console.error('Error during search:', error);
    } finally {
      setIsSearching(false);
    }
  };

  const clearSearchResults = () => {
    setSearchResults(null);
    setSearchQuery('');
  };


  // Loader component
  const Loader = () => (
    <div className={`min-h-screen ${isDarkMode ? 'bg-gray-900' : 'bg-white'} flex justify-center items-center`}>
      <div className="w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
    </div>
  );

  // Error component
  const ErrorDisplay = () => (
    <div className={`min-h-screen ${isDarkMode ? 'bg-gray-900' : 'bg-white'} flex justify-center items-center`}>
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
  if (isLoading) return <Loader />;
  if (error) return <ErrorDisplay />;

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
              }`}>Accueil</h1>
            </div>
            
            {/* Search Bar */}
            <div className={`px-4 py-3 border-b ${
              isDarkMode ? 'border-gray-800' : 'border-gray-200'
            }`}>
              <SearchBar 
                onSearch={handleSearch} 
                isLoading={isSearching}
              />
            </div>
            
            {/* Display search results or tweet form */}
            {searchResults ? (
              <div className="p-4">
                <SearchResults 
                  results={searchResults}
                  onTweetUpdate={handleTweetUpdate}
                  onClear={clearSearchResults}
                  query={searchQuery}
                />
              </div>
            ) : (
              <TweetForm onSubmit={handleTweetSubmit} />
            )}
          </div>

          {/* Show normal timeline if not searching */}
          {!searchResults && (
            <div className={`divide-y ${
              isDarkMode ? 'divide-gray-800' : 'divide-gray-200'
            }`}>
              {tweets.length > 0 ? (
                tweets.map(tweet => (
                  <motion.div
                    key={tweet.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.3 }}
                  >
                    <TweetCard
                      tweet={tweet}
                      onTweetUpdate={handleTweetUpdate}
                    />
                  </motion.div>
                ))
              ) : (
                <div className={`flex flex-col items-center justify-center py-8 ${
                  isDarkMode ? 'text-gray-400' : 'text-gray-500'
                }`}>
                  <p className="text-xl font-semibold">Aucun tweet pour le moment</p>
                  <p className="mt-2">Soyez le premier à tweeter !</p>
                </div>
              )}
            </div>
          )}




          {!searchResults && recommendedTweets.length > 0 && (
            <div className={`mt-4 p-4 rounded-lg ${
              isDarkMode ? 'bg-gray-800' : 'bg-purple-50'
            }`}>
              <h2 className={`text-lg font-bold mb-2 ${
                isDarkMode ? 'text-white' : 'text-gray-900'
              }`}>
                Recommandés pour vous
              </h2>
              <div className={`divide-y ${
                isDarkMode ? 'divide-gray-700' : 'divide-gray-200'
              }`}>
                {recommendedTweets.map(tweet => (
                  <motion.div
                    key={tweet.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.3 }}
                  >
                    <TweetCard
                      tweet={tweet}
                      onTweetUpdate={handleTweetUpdate}
                    />
                  </motion.div>
                ))}
                <div className="pt-3">
                  <button
                    onClick={() => router.push('/recommended')}
                    className="w-full py-2 text-center text-sm text-purple-500 hover:text-purple-600 transition-colors"
                  >
                    Voir plus de recommandations →
                  </button>
                </div>
              </div>
            </div>
          )}
        </motion.div>
      </main>
    </div>
  );
};

export default HomePage;