'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Tweet } from '@/types';
import { getTweets } from '@/services/api';
import { useAuth } from '@/context/AppContext';
import { redirect } from 'next/navigation';
import Layout from '@/components/Layout';
import { TweetCard } from '@/components/TweetCard';
import Link from 'next/link';
import WebcamCapture from '@/components/WebcamCapture';

export default function TweetPage() {
  const { id } = useParams();
  const tweetId = Array.isArray(id) ? id[0] : id;
  const [tweet, setTweet] = useState<Tweet | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { isAuthenticated, loading: authLoading } = useAuth();

  useEffect(() => {
    // Rediriger si non authentifié
    if (!authLoading && !isAuthenticated) {
      redirect('/login');
    }

    const fetchTweet = async () => {
      setLoading(true);
      try {
        // Pour l'instant, on récupère tous les tweets et on filtre
        // À terme, il faudrait créer une route API spécifique
        const tweets = await getTweets();
        const foundTweet = tweets.find(t => t.id === tweetId);
        
        if (foundTweet) {
          setTweet(foundTweet);
        } else {
          setError('Tweet non trouvé');
        }
      } catch (error) {
        console.error('Error fetching tweet:', error);
        setError('Erreur lors du chargement du tweet');
      } finally {
        setLoading(false);
      }
    };

    if (isAuthenticated && tweetId) {
      fetchTweet();
    }
  }, [isAuthenticated, authLoading, tweetId]);

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="spinner w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="mt-4 text-gray-600">Chargement...</p>
        </div>
      </div>
    );
  }

  const handleTweetUpdate = (updatedTweet: Tweet) => {
    setTweet(updatedTweet);
  };

  return (
    <Layout>
      <div className="border-b border-extralight">
        <div className="p-4 flex items-center">
          <Link href="/" className="mr-4">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
            </svg>
          </Link>
          <h1 className="text-xl font-bold">Tweet</h1>
        </div>
      </div>

      {/* Composant  WebcamCapture Utilisé ici */}
      <div className="mb-4">
        <WebcamCapture />
      </div>

      {loading ? (
        <div className="flex justify-center p-8">
          <div className="spinner w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : error ? (
        <div className="p-8 text-center text-red-500">
          {error}
        </div>
      ) : tweet ? (
        <div>
          <TweetCard 
            tweet={tweet} 
            onTweetUpdate={handleTweetUpdate} 
          />
        </div>
      ) : (
        <div className="p-8 text-center text-gray-500">
          Tweet non trouvé
        </div>
      )}
    </Layout>
  );
}