'use client';

import React, {useEffect, useState, useCallback} from 'react';
import {getUserTweets, getUserStats, getUserLikedTweets, getUserRetweetedTweets, getUserMediaUrl} from '@/services/api';
import {Tweet, User} from '@/types';
import {TweetCard} from '@/components/TweetCard';
import {useAuth} from '@/context/AppContext';
import {redirect} from 'next/navigation';
import FollowButton from '@/components/FollowButton';
import FollowersList from '@/components/FollowersList';
import FollowingList from '@/components/FollowingList';
import ProfileEditor from '@/components/ProfileEditor';
import {FiEdit} from 'react-icons/fi';
import {getUserBookmarkedTweets} from '@/services/api';


type TabType = 'tweets' | 'likes' | 'retweets' | 'bookmarks';

// Le composant principal qui contient toute la logique et l'UI
export default function ProfilePage({username}: { username: string }) {
    const [tweets, setTweets] = useState<Tweet[]>([]);
    const [likedTweets, setLikedTweets] = useState<Tweet[]>([]);
    const [retweetedTweets, setRetweetedTweets] = useState<Tweet[]>([]);
    const [activeTab, setActiveTab] = useState<TabType>('tweets');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const {user, isAuthenticated, loading: authLoading, refreshUserData, isDarkMode} = useAuth();
    const [userStats, setUserStats] = useState({followers_count: 0, following_count: 0});
    const [showFollowers, setShowFollowers] = useState(false);
    const [showFollowing, setShowFollowing] = useState(false);
    const [showProfileEditor, setShowProfileEditor] = useState(false);
    const [profileUser, setProfileUser] = useState<User | null>(null);

    // Marqueurs pour éviter le chargement répété des données
    const [tweetsLoaded, setTweetsLoaded] = useState(false);
    const [likesLoaded, setLikesLoaded] = useState(false);
    const [retweetsLoaded, setRetweetsLoaded] = useState(false);

    // Vérifier si le profil appartient à l'utilisateur connecté
    const isOwnProfile = user?.username === username;

    // Marqueur favoris
    const [bookmarkedTweets, setBookmarkedTweets] = useState<Tweet[]>([]);
    const [bookmarksLoaded, setBookmarksLoaded] = useState(false);


    // Charger les tweets en fonction de l'onglet actif (stabilisé avec useCallback)
    const fetchTweetsForActiveTab = useCallback(async (tab: TabType) => {
        try {
            setLoading(true);

            switch (tab) {
                case 'tweets':
                    if (!tweetsLoaded) {
                        const tweetsData = await getUserTweets(username);
                        setTweets(tweetsData);
                        setTweetsLoaded(true);
                    }
                    break;

                case 'likes':
                    if (!likesLoaded) {
                        const likedData = await getUserLikedTweets(username);
                        setLikedTweets(likedData);
                        setLikesLoaded(true);
                    }
                    break;

                case 'retweets':
                    if (!retweetsLoaded) {
                        const retweetedData = await getUserRetweetedTweets(username);
                        setRetweetedTweets(retweetedData);
                        setRetweetsLoaded(true);
                    }
                    break;

                case 'bookmarks':
                    if (!bookmarksLoaded) {
                        const bookmarkedData = await getUserBookmarkedTweets(username);
                        console.log("📥 Favoris récupérés :", bookmarkedData);
                        setBookmarkedTweets(bookmarkedData);
                        setBookmarksLoaded(true);
                    }
                    break;
            }
        } catch (error) {
            console.error(`Error fetching ${tab}:`, error);
            setError(`Impossible de charger les ${tab}.`);
        } finally {
            setLoading(false);
        }
    }, [username, tweetsLoaded, likesLoaded, retweetsLoaded, bookmarksLoaded]);


    // Effet pour le chargement initial des données utilisateur
    useEffect(() => {
        // Rediriger si non authentifié
        if (!authLoading && !isAuthenticated) {
            redirect('/login');
        }

        // Ne chargez les données que si l'utilisateur est authentifié et que nous n'avons pas déjà chargé les données
        if (isAuthenticated && username && !profileUser) {
            const fetchUserData = async () => {
                try {
                    setLoading(true);

                    // Récupérer les statistiques
                    const stats = await getUserStats(username);
                    setUserStats(stats);

                    // Si c'est le profil de l'utilisateur connecté, utiliser ses données
                    if (isOwnProfile && user) {
                        setProfileUser(user);
                    } else {
                        // Sinon, créer un objet avec les informations minimales
                        setProfileUser({
                            id: '',
                            username: username,
                            email: '',
                            created_at: '',
                            followers_count: stats.followers_count,
                            following_count: stats.following_count
                        });
                    }

                    // Ne pas appeler fetchTweetsForActiveTab ici, il sera appelé dans un autre useEffect
                } catch (error) {
                    console.error('Error fetching user data:', error);
                    setError('Impossible de charger les données de cet utilisateur.');
                } finally {
                    setLoading(false);
                }
            };

            fetchUserData();
        }
    }, [username, isAuthenticated, authLoading, user, isOwnProfile, profileUser]);

    // Effet séparé pour le chargement des tweets
    useEffect(() => {
        if (isAuthenticated && username) {
            fetchTweetsForActiveTab(activeTab);
        }
    }, [isAuthenticated, username, activeTab, fetchTweetsForActiveTab]);

    // Effet pour rafraîchir les données utilisateur si c'est le profil de l'utilisateur connecté
    useEffect(() => {
        if (isOwnProfile && user && refreshUserData && !profileUser) {
            refreshUserData()
                .then(() => {
                    console.log('Données utilisateur rafraîchies');
                })
                .catch(error => {
                    console.error('Erreur lors du rafraîchissement des données utilisateur:', error);
                });
        }
    }, [isOwnProfile, user, refreshUserData, profileUser]);

    // Changer d'onglet
    const handleTabChange = (tab: TabType) => {
        if (tab !== activeTab) {
            setActiveTab(tab);
            // Ne pas appeler fetchTweetsForActiveTab ici, l'effet le fera
        }
    };

    // Gérer le changement d'état du bouton suivre
    const handleFollowChange = (following: boolean) => {
        // Mettre à jour le compteur d'abonnés localement
        setUserStats(prev => ({
            ...prev,
            followers_count: following ? prev.followers_count + 1 : prev.followers_count - 1
        }));
    };

    // Mettre à jour les données utilisateur après modification du profil
    const handleProfileUpdate = (updatedUser: User) => {
        setProfileUser(updatedUser);
    };

    // Afficher le contenu actif selon l'onglet
    const renderActiveContent = () => {
        if (loading) {
            return (
                <div className="flex justify-center p-8">
                    <div
                        className="spinner w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
                </div>
            );
        }

        if (error) {
            return <div className="p-4 text-red-500 text-center">{error}</div>;
        }

        let currentTweets: Tweet[] = [];
        let emptyMessage = "";

        switch (activeTab) {
            case 'tweets':
                currentTweets = tweets;
                emptyMessage = "Cet utilisateur n'a pas encore tweeté.";
                break;
            case 'likes':
                currentTweets = likedTweets;
                emptyMessage = "Cet utilisateur n'a pas encore liké de tweets.";
                break;
            case 'retweets':
                currentTweets = retweetedTweets;
                emptyMessage = "Cet utilisateur n'a pas encore retweeté.";
                break;
            case 'bookmarks':
                currentTweets = bookmarkedTweets;
                emptyMessage = "Cet utilisateur n'a pas encore ajouté de tweets en favoris.";
                break;
        }

        if (currentTweets.length === 0) {
            return (
                <div className={`text-center p-8 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                    {emptyMessage}
                </div>
            );
        }

        return (
            <div className="tweets-container">
                {currentTweets.map((tweet) => (
                    <TweetCard key={tweet.id} tweet={tweet}/>
                ))}
            </div>
        );
    };


    if (authLoading) {
        return (
            <div className={`min-h-screen flex items-center justify-center ${
                isDarkMode ? 'bg-gray-900' : 'bg-gray-50'
            }`}>
                <div className="text-center">
                    <div
                        className="spinner w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
                    <p className={`mt-4 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                        Chargement...
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className={`min-h-screen ${isDarkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
            <div className={`border-b ${isDarkMode ? 'border-gray-800' : 'border-gray-200'}`}>
                <div className="p-4">
                    <h1 className={`text-xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                        Profil
                    </h1>
                </div>

                {/* Bannière */}
                <div className={`relative ${isDarkMode ? 'bg-gray-800' : 'bg-gray-200'} h-32 overflow-hidden`}>
                    {profileUser?.banner_picture_id && (
                        <img
                            src={getUserMediaUrl(profileUser.banner_picture_id) || undefined}
                            alt="Bannière"
                            className="w-full h-full object-cover"
                        />
                    )}

                    {isOwnProfile && (
                        <button
                            onClick={() => setShowProfileEditor(true)}
                            className={`absolute bottom-2 right-2 p-2 ${
                                isDarkMode
                                    ? 'bg-black/50 text-white hover:bg-black/70'
                                    : 'bg-white/50 text-gray-900 hover:bg-white/70'
                            } rounded-full transition-colors`}
                            title="Modifier le profil"
                        >
                            <FiEdit className="w-5 h-5"/>
                        </button>
                    )}
                </div>

                <div className={`p-4 border-b ${isDarkMode ? 'border-gray-800' : 'border-gray-200'}`}>
                    <div className="relative">
                        {/* Photo de profil */}
                        <div className="absolute -top-12 left-0">
                            <div className={`w-24 h-24 rounded-full overflow-hidden border-4 ${
                                isDarkMode ? 'border-gray-900' : 'border-white'
                            } flex items-center justify-center bg-purple-500`}>
                                {profileUser?.profile_picture_id ? (
                                    <img
                                        src={getUserMediaUrl(profileUser.profile_picture_id) || undefined}
                                        alt={`${username} profile`}
                                        className="w-full h-full object-cover"
                                    />
                                ) : (
                                    <span className="text-white font-bold text-4xl">
                    {username.charAt(0).toUpperCase()}
                  </span>
                                )}
                            </div>
                        </div>

                        {/* Actions (suivre/ne plus suivre) */}
                        <div className="absolute top-0 right-0">
                            {!isOwnProfile ? (
                                <FollowButton
                                    username={username}
                                    onFollowChange={handleFollowChange}
                                />
                            ) : (
                                <button
                                    onClick={() => setShowProfileEditor(true)}
                                    className={`px-4 py-1.5 rounded-full transition-colors flex items-center ${
                                        isDarkMode
                                            ? 'bg-gray-700 hover:bg-gray-600 text-white'
                                            : 'bg-gray-200 hover:bg-gray-300 text-gray-900'
                                    }`}
                                >
                                    <FiEdit className="w-4 h-4 mr-2"/>
                                    <span>Éditer le profil</span>
                                </button>
                            )}
                        </div>

                        <div className="pt-16">
                            <h2 className={`text-xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                                {username}
                            </h2>
                            <p className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>@{username}</p>

                            {/* Bio */}
                            {profileUser?.bio && (
                                <p className={`mt-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                                    {profileUser.bio}
                                </p>
                            )}

                            {/* Statistiques */}
                            <div className="mt-3 flex space-x-4">
                                <button
                                    onClick={() => setShowFollowing(true)}
                                    className={`${isDarkMode ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-gray-900'} transition-colors`}
                                >
                  <span className={isDarkMode ? 'text-white' : 'text-gray-900'} font-bold>
                    {userStats.following_count}
                  </span> abonnements
                                </button>
                                <button
                                    onClick={() => setShowFollowers(true)}
                                    className={`${isDarkMode ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-gray-900'} transition-colors`}
                                >
                  <span className={isDarkMode ? 'text-white' : 'text-gray-900'} font-bold>
                    {userStats.followers_count}
                  </span> abonnés
                                </button>
                                <span className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>
                  <span className={isDarkMode ? 'text-white' : 'text-gray-900'} font-bold>
                    {tweets.length}
                  </span> tweets
                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Onglets de navigation */}
            <div className={`flex border-b ${isDarkMode ? 'border-gray-800' : 'border-gray-200'}`}>
                {['tweets', 'likes', 'retweets'].map((tab) => (
                    <button
                        key={tab}
                        onClick={() => handleTabChange(tab as TabType)}
                        className={`flex-1 py-3 text-center font-medium transition-colors ${
                            activeTab === tab
                                ? 'text-purple-500 border-b-2 border-purple-500'
                                : isDarkMode
                                    ? 'text-gray-400 hover:text-white'
                                    : 'text-gray-600 hover:text-gray-900'
                        }`}
                    >
                        {tab === 'tweets' ? 'Tweets' : tab === 'likes' ? "J'aime" : 'Retweets'}
                    </button>
                ))}

                {/*Afficher l'onglet Favoris que si l'utilisateur regarde son propre profil*/}
                {isOwnProfile && (
                    <button
                        onClick={() => handleTabChange('bookmarks' as TabType)}
                        className={`flex-1 py-3 text-center font-medium transition-colors ${
                            activeTab === 'bookmarks'
                                ? 'text-purple-500 border-b-2 border-purple-500'
                                : isDarkMode
                                    ? 'text-gray-400 hover:text-white'
                                    : 'text-gray-600 hover:text-gray-900'
                        }`}
                    >
                        Favoris
                    </button>
                )}
            </div>


            {/* Contenu selon l'onglet actif */}
            {renderActiveContent()}

            {/* Éditeur de profil */}
            {showProfileEditor && profileUser && (
                <ProfileEditor
                    user={profileUser}
                    isVisible={showProfileEditor}
                    onClose={() => setShowProfileEditor(false)}
                    onProfileUpdated={handleProfileUpdate}
                    isDarkMode={isDarkMode}
                />
            )}

            {/* Modales pour les listes d'abonnés/abonnements */}
            <FollowersList
                username={username}
                isVisible={showFollowers}
                onClose={() => setShowFollowers(false)}
                isDarkMode={isDarkMode}
            />

            <FollowingList
                username={username}
                isVisible={showFollowing}
                onClose={() => setShowFollowing(false)}
                isDarkMode={isDarkMode}
            />
        </div>
    )
};