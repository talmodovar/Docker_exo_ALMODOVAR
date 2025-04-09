'use client';
import React, {useState, useEffect, useRef} from 'react';
import {Tweet} from '@/types';
import Link from 'next/link';
import {
    likeTweet,
    unlikeTweet,
    checkLikeStatus,
    retweetTweet,
    unretweetTweet,
    checkRetweetStatus
} from '@/services/api';
import {CommentSection} from '@/components/CommentSection';
import WebcamCapture from '@/components/WebcamCapture';
import EmotionReactions from '@/components/EmotionReactions';
import {useAuth} from '@/context/AppContext';
import {FiMessageCircle, FiHeart, FiRepeat, FiSmile, FiMaximize2} from 'react-icons/fi';
import {getMediaUrl} from '@/services/api';
import UserAvatar from './UserAvatar';
import {FiBookmark} from 'react-icons/fi';
import {toggleBookmark, checkBookmarkStatus} from '@/services/api';

interface TweetCardProps {
    tweet: Tweet;
    onTweetUpdate?: (updatedTweet: Tweet) => void;
}

export const TweetCard: React.FC<TweetCardProps> = ({tweet, onTweetUpdate}) => {
    const {user, isDarkMode} = useAuth();
    const [isBookmarked, setIsBookmarked] = useState(false);

    const [isLiked, setIsLiked] = useState(tweet.user_liked || false);
    const [likeCount, setLikeCount] = useState(tweet.like_count);
    const [showComments, setShowComments] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [showWebcam, setShowWebcam] = useState(false);
    const [userReaction, setUserReaction] = useState<string | undefined>(
        tweet.reactions?.user_reaction
    );
    const [isReacting, setIsReacting] = useState(false);
    const [isRetweeted, setIsRetweeted] = useState(tweet.user_retweeted || false);
    const [retweetCount, setRetweetCount] = useState(tweet.retweet_count || 0);
    const [isMediaExpanded, setIsMediaExpanded] = useState(false);

    const webcamContainerRef = useRef<HTMLDivElement>(null);
    const videoRef = useRef<HTMLVideoElement>(null);


    const renderContent = (content: string) => {
        const parts = content.split(/(@\w+)/g);

        return (
            <p className={`mt-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                {parts.map((part, index) => {
                    if (part.match(/^@\w+/)) {
                        const username = part.substring(1);
                        return (
                            <Link
                                key={index}
                                href={`/profile/${username}`}
                                className={`${isDarkMode ? 'text-purple-400' : 'text-purple-600'} hover:underline`}
                            >
                                {part}
                            </Link>
                        );
                    }
                    return <span key={index}>{part}</span>;
                })}
            </p>
        );
    };


    const getMediaType = (mediaUrl?: string): 'image' | 'video' | null => {
        if (!mediaUrl) return null;

        const extension = mediaUrl.split('.').pop()?.toLowerCase();
        if (!extension) return null;

        if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(extension)) {
            return 'image';
        } else if (['mp4', 'webm', 'ogg', 'mov'].includes(extension)) {
            return 'video';
        }

        return null;
    };

    // const mediaType = getMediaType(tweet.media_url);

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleString();
    };

    useEffect(() => {
        const checkIfBookmarked = async () => {
            try {
                const bookmarked = await checkBookmarkStatus(tweet.id);
                setIsBookmarked(bookmarked);
            } catch (error) {
                console.error('Erreur lors de la récupération du statut du favori :', error);
            }
        };

        checkIfBookmarked();
    }, [tweet.id]);


    // Vérifier le statut de like au chargement
    // useEffect(() => {
    //   const checkLiked = async () => {
    //     try {
    //       const response = await checkLikeStatus(tweet.id);
    //       setIsLiked(response.liked);
    //     } catch (error) {
    //       console.error('Error checking like status:', error);
    //     }
    //   };

    //   checkLiked();
    //   fetchUserReaction();
    // }, [tweet.id]);

    // useEffect(() => {
    //   const checkRetweeted = async () => {
    //     try {
    //       const response = await checkRetweetStatus(tweet.id);
    //       setIsRetweeted(response.retweeted);
    //     } catch (error) {
    //       console.error('Error checking retweet status:', error);
    //     }
    //   };

    //   checkRetweeted();
    // }, [tweet.id]);

    const handleRetweetToggle = async () => {
        setIsLoading(true);
        try {
            if (isRetweeted) {
                await unretweetTweet(tweet.id);
                setRetweetCount(prev => prev - 1);
            } else {
                await retweetTweet(tweet.id);
                setRetweetCount(prev => prev + 1);
            }
            setIsRetweeted(!isRetweeted);

            // Mettre à jour le tweet si callback fourni
            if (onTweetUpdate) {
                onTweetUpdate({
                    ...tweet,
                    retweet_count: isRetweeted ? retweetCount - 1 : retweetCount + 1
                });
            }
        } catch (error) {
            console.error('Error toggling retweet:', error);
        } finally {
            setIsLoading(false);
        }
    };

    // Récupérer la réaction de l'utilisateur pour ce tweet
    const fetchUserReaction = async () => {
        if (!user) return;

        try {
            const response = await fetch(`http://localhost:8000/api/tweets/${tweet.id}/reactions`);
            if (response.ok) {
                const reactions = await response.json();
                const userReaction = reactions.find((r: any) => r.user_id === user.id);
                if (userReaction) {
                    setUserReaction(userReaction.emotion);
                }
            }
        } catch (error) {
            console.error('Error fetching user reaction:', error);
        }
    };

    // Gérer le clic sur le bouton de like
    const handleLikeToggle = async () => {
        setIsLoading(true);
        try {
            if (isLiked) {
                await unlikeTweet(tweet.id);
                setLikeCount(prev => prev - 1);
            } else {
                await likeTweet(tweet.id);
                setLikeCount(prev => prev + 1);
            }
            setIsLiked(!isLiked);

            // Mettre à jour le tweet si callback fourni
            if (onTweetUpdate) {
                onTweetUpdate({
                    ...tweet,
                    like_count: isLiked ? likeCount - 1 : likeCount + 1
                });
            }
        } catch (error) {
            console.error('Error toggling like:', error);
        } finally {
            setIsLoading(false);
        }
    };

    // Gérer l'affichage des commentaires
    const toggleComments = () => {
        setShowComments(!showComments);
    };

    // Gérer l'affichage de la webcam pour réagir
    const toggleReaction = () => {
        setShowWebcam(!showWebcam);

        // Scroll to the webcam if opening
        if (!showWebcam && webcamContainerRef.current) {
            setTimeout(() => {
                webcamContainerRef.current?.scrollIntoView({behavior: 'smooth', block: 'nearest'});
            }, 100);
        }
    };


    // Toggle media expansion
    const toggleMediaExpansion = () => {
        setIsMediaExpanded(!isMediaExpanded);
    };

    // Gérer la capture d'image pour réaction
    const handleImageCaptured = async (imageData: string) => {
        if (!user) return;

        try {
            setIsReacting(true);

            const response = await fetch(`http://localhost:8000/api/tweets/${tweet.id}/reactions`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    tweet_id: tweet.id,
                    user_id: user.id,
                    image: imageData
                }),
            });

            if (!response.ok) {
                throw new Error(`Erreur HTTP: ${response.status}`);
            }

            const reaction = await response.json();
            console.log('Réaction enregistrée:', reaction);
            setUserReaction(reaction.emotion);

            // Fermer la webcam après quelques secondes
            setTimeout(() => {
                setShowWebcam(false);
            }, 2000);

        } catch (error) {
            console.error('Error registering reaction:', error);
        } finally {
            setIsReacting(false);
        }
    };

    // Mettre à jour le compteur de commentaires
    const handleCommentAdded = () => {
        if (onTweetUpdate) {
            onTweetUpdate({
                ...tweet,
                comment_count: tweet.comment_count + 1
            });
        }
    };

    return (
        <div className={`p-4 border-b ${
            isDarkMode
                ? 'border-gray-800 hover:bg-purple-500/5'
                : 'border-gray-200 hover:bg-purple-500/5'
        } transition-all`}>
            {tweet.is_retweet && (
                <div className="flex items-center text-sm text-purple-400 mb-2">
                    <FiRepeat className="w-4 h-4 mr-2"/>
                    <span>Retweeté par {tweet.author_username}</span>
                </div>
            )}

            <div className="flex">
                <div className="flex-shrink-0">
                    <UserAvatar username={tweet.author_username} size="medium" className="rounded-xl"
                                userInfo={tweet.author_info}/>
                </div>

                <div className="ml-3 flex-grow">
                    <div className="flex items-center">
                        <Link
                            href={`/profile/${tweet.author_username}`}
                            className={`font-semibold ${
                                isDarkMode
                                    ? 'text-white hover:text-purple-400'
                                    : 'text-gray-900 hover:text-purple-600'
                            } transition-colors`}
                        >
                            {tweet.author_username}
                        </Link>
                        <span className="ml-2 text-sm text-purple-400">
    {formatDate(tweet.created_at)}
  </span>
                    </div>

                    {renderContent(tweet.content)}

                    {tweet.tags && tweet.tags.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-2">
                            {(tweet.tags || []).map((tag, index) => (
                                <span
                                    key={index}
                                    className="px-3 py-1 text-sm bg-purple-500 text-white rounded-full cursor-pointer hover:bg-purple-600 transition"
                                >
                  #{tag}
                </span>
                            ))}
                        </div>
                    )}

                    {tweet.media_id && tweet.media_type && (
                        <div className={`mt-3 relative rounded-xl overflow-hidden ${
                            isMediaExpanded ? 'fixed inset-0 z-50 bg-black flex items-center justify-center p-4' : 'max-h-96'
                        }`}>
                            <button
                                onClick={toggleMediaExpansion}
                                className={`absolute z-10 p-2 bg-black/50 rounded-full text-white ${
                                    isMediaExpanded ? 'top-4 right-4' : 'top-2 right-2'
                                }`}
                            >
                                <FiMaximize2 className="w-5 h-5"/>
                            </button>

                            {tweet.media_type === 'image' && (
                                <img
                                    src={getMediaUrl(tweet.media_id)}
                                    alt="Media content"
                                    className={`rounded-xl ${
                                        isMediaExpanded ? 'max-h-screen max-w-full object-contain' : 'w-full object-cover'
                                    }`}
                                    onClick={isMediaExpanded ? undefined : toggleMediaExpansion}
                                />
                            )}

                            {tweet.media_type === 'video' && (
                                <video
                                    ref={videoRef}
                                    src={getMediaUrl(tweet.media_id)}
                                    controls
                                    className={`rounded-xl ${
                                        isMediaExpanded ? 'max-h-screen max-w-full' : 'w-full max-h-96'
                                    }`}
                                    onClick={e => {
                                        if (!isMediaExpanded) {
                                            e.preventDefault();
                                            toggleMediaExpansion();
                                        }
                                    }}
                                />
                            )}
                        </div>
                    )}

                    <div className="mt-2">
                        <EmotionReactions tweetId={tweet.id} userReaction={userReaction}
                                          reactionData={tweet.reactions}/>
                    </div>

                    <div className="mt-3 flex space-x-6">

                        <button
                            onClick={async () => {
                                try {
                                    const response = await toggleBookmark(tweet.id);
                                    setIsBookmarked(!isBookmarked);
                                } catch (error) {
                                    console.error('Erreur lors du toggle des favoris:', error);
                                }
                            }}
                            className={`flex items-center transition-colors group ${
                                isBookmarked
                                    ? 'text-yellow-500'
                                    : isDarkMode
                                        ? 'text-gray-400 hover:text-yellow-400'
                                        : 'text-gray-500 hover:text-yellow-600'
                            }`}
                        >
                            <FiBookmark className="w-5 h-5 mr-2 group-hover:text-yellow-400"/>
                            <span>{isBookmarked ? 'Favori' : 'Ajouter'}</span>
                        </button>


                        <button
                            onClick={toggleComments}
                            className={`flex items-center ${
                                isDarkMode
                                    ? 'text-gray-400 hover:text-purple-400'
                                    : 'text-gray-500 hover:text-purple-600'
                            } transition-colors group`}
                        >
                            <FiMessageCircle className="w-5 h-5 mr-2 group-hover:text-purple-400"/>
                            <span>{tweet.comment_count}</span>
                        </button>

                        <button
                            onClick={handleRetweetToggle}
                            disabled={isLoading}
                            className={`flex items-center transition-colors group ${
                                isRetweeted
                                    ? 'text-green-500'
                                    : isDarkMode
                                        ? 'text-gray-400 hover:text-green-400'
                                        : 'text-gray-500 hover:text-green-600'
                            }`}
                        >
                            <FiRepeat className={`w-5 h-5 mr-2 ${
                                isRetweeted
                                    ? 'text-green-500'
                                    : 'group-hover:text-green-400'
                            }`}/>
                            <span>{retweetCount}</span>
                        </button>

                        <button
                            onClick={handleLikeToggle}
                            disabled={isLoading}
                            className={`flex items-center transition-colors group ${
                                isLiked
                                    ? 'text-pink-500'
                                    : isDarkMode
                                        ? 'text-gray-400 hover:text-pink-400'
                                        : 'text-gray-500 hover:text-pink-600'
                            }`}
                        >
                            <FiHeart className={`w-5 h-5 mr-2 ${
                                isLiked
                                    ? 'text-pink-500 fill-current'
                                    : 'group-hover:text-pink-400'
                            }`}/>
                            <span>{likeCount}</span>
                        </button>

                        <button
                            onClick={toggleReaction}
                            className={`flex items-center transition-colors group ${
                                showWebcam
                                    ? 'text-yellow-500'
                                    : isDarkMode
                                        ? 'text-gray-400 hover:text-yellow-400'
                                        : 'text-gray-500 hover:text-yellow-600'
                            }`}
                        >
                            <FiSmile className="w-5 h-5 mr-2 group-hover:text-yellow-400"/>
                            <span>Réagir</span>
                        </button>
                    </div>

                    {showWebcam && (
                        <div
                            ref={webcamContainerRef}
                            className={`mt-4 p-4 rounded-xl border ${
                                isDarkMode
                                    ? 'bg-gray-800/50 border-gray-700'
                                    : 'bg-gray-100/50 border-gray-200'
                            }`}
                        >
                            <div className={`text-sm font-medium mb-2 ${
                                isDarkMode ? 'text-purple-400' : 'text-purple-600'
                            }`}>
                                {isReacting ?
                                    "Analyse de votre réaction en cours..." :
                                    "Exprimez votre réaction à ce tweet"
                                }
                            </div>
                            <WebcamCapture
                                onImageCaptured={handleImageCaptured}
                                autoSendToBackend={false}
                                compact={true}
                            />
                        </div>
                    )}

                    {showComments && (
                        <div className={`mt-4 border-t pt-4 ${
                            isDarkMode ? 'border-gray-800' : 'border-gray-200'
                        }`}>
                            <CommentSection
                                tweetId={tweet.id}
                                onCommentAdded={handleCommentAdded}
                            />
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
};