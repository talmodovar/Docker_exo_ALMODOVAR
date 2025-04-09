import React from 'react';
import { Comment } from '@/types';
import Link from 'next/link';
import UserAvatar from './UserAvatar';

interface CommentCardProps {
  comment: Comment;
}

export const CommentCard: React.FC<CommentCardProps> = ({ comment }) => {
  // Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  return (
    <div className="flex space-x-2 p-2 rounded-lg bg-gray-50">
      <div className="flex-shrink-0">
        <div className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center">
          <UserAvatar username={comment.author_username} size="small" />
        </div>
      </div>
      <div className="flex-1">
        <div className="flex items-center">
          <Link href={`/profile/${comment.author_username}`} className="font-medium text-dark hover:underline text-sm">
            {comment.author_username}
          </Link>
          <span className="ml-2 text-xs text-secondary">
            {formatDate(comment.created_at)}
          </span>
        </div>
        <p className="text-sm text-gray-800 mt-1">{comment.content}</p>
      </div>
    </div>
  );
};