// Mettre à jour le fichier types.ts avec ces interfaces

export interface User {
  id: string;
  username: string;
  email: string;
  created_at: string;
  followers_count: number; // Nombre d'abonnés
  following_count: number; // Nombre d'abonnements
  bio?: string; // Biographie optionnelle
  profile_picture_id?: string;
  banner_picture_id?: string;
}

export interface Follow {
  id: string;
  follower_id: string;
  follower_username: string;
  followed_id: string;
  followed_username: string;
  created_at: string;
}

export interface Tweet {
  id: string;
  content: string;
  author_id: string;
  author_username: string;
  created_at: string;
  like_count: number;
  comment_count: number;
  retweet_count: number;
  is_retweet: boolean;
  original_tweet_id?: string;
  original_author_username?: string;
  media_id?: string;  // ID du média dans MongoDB GridFS
  media_type?: 'image' | 'video';  // Type de média
  tags?: string[];
}

export interface Comment {
  id: string;
  content: string;
  tweet_id: string;
  author_id: string;
  author_username: string;
  created_at: string;
}

export interface Like {
  id: string;
  tweet_id: string;
  user_id: string;
  username: string;
  created_at: string;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
}

export interface Notification {
  id: string;
  recipient_id: string;
  sender_id: string;
  sender_username: string;
  type: 'like' | 'comment' | 'retweet' | 'follow' | 'mention'; // Ajout du type retweet
  tweet_id: string;
  tweet_content: string;
  comment_id?: string;
  comment_content?: string;
  read: boolean;
  created_at: string;
}

export interface EmotionReaction {
  id: string;
  tweet_id: string;
  user_id: string;
  emotion: string;
  confidence: number;
  created_at: string;
}

export interface EmotionReactionSummary {
  tweet_id: string;
  reaction_count: number;
  reactions: {
    [key: string]: number;
  };
}