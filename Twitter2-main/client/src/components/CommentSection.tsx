import React, { useState, useEffect } from 'react';
import { Comment } from '@/types';
import { getTweetComments, createComment } from '@/services/api';
import { CommentCard } from '@/components/CommentCard';

interface CommentSectionProps {
  tweetId: string;
  onCommentAdded?: () => void;
}

export const CommentSection: React.FC<CommentSectionProps> = ({ tweetId, onCommentAdded }) => {
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const fetchComments = async () => {
      setIsLoading(true);
      try {
        const data = await getTweetComments(tweetId);
        setComments(data);
      } catch (error) {
        console.error('Error fetching comments:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchComments();
  }, [tweetId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    setIsSubmitting(true);
    try {
      const comment = await createComment(tweetId, newComment);
      setComments([comment, ...comments]);
      setNewComment('');
      
      if (onCommentAdded) {
        onCommentAdded();
      }
    } catch (error) {
      console.error('Error posting comment:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="mt-4 border-t border-extralight pt-4">
      {/* Formulaire de commentaire */}
      <form onSubmit={handleSubmit} className="mb-4">
        <div className="flex">
          <input
            type="text"
            placeholder="Ajouter un commentaire..."
            className="flex-1 border border-gray-300 rounded-l-lg p-2 focus:outline-none focus:ring-1 focus:ring-blue-500"
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            maxLength={280}
          />
          <button
            type="submit"
            disabled={!newComment.trim() || isSubmitting}
            className="bg-primary hover:bg-blue-600 text-white px-4 rounded-r-lg disabled:opacity-50"
          >
            {isSubmitting ? '...' : 'Commenter'}
          </button>
        </div>
      </form>

      {/* Liste des commentaires */}
      {isLoading ? (
        <div className="flex justify-center py-4">
          <div className="spinner w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : comments.length > 0 ? (
        <div className="space-y-3">
          {comments.map((comment) => (
            <CommentCard key={comment.id} comment={comment} />
          ))}
        </div>
      ) : (
        <p className="text-center text-gray-500 py-2">Aucun commentaire pour l'instant.</p>
      )}
    </div>
  );
};