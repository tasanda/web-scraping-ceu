import type { CourseReview } from '@ceu/types';
import StarRating from './StarRating';

interface ReviewCardProps {
  review: CourseReview;
  isOwn?: boolean;
  onEdit?: () => void;
  onDelete?: () => void;
  onMarkHelpful?: () => void;
  isMarkingHelpful?: boolean;
}

export default function ReviewCard({
  review,
  isOwn = false,
  onEdit,
  onDelete,
  onMarkHelpful,
  isMarkingHelpful = false,
}: ReviewCardProps) {
  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const getDisplayName = () => {
    if (review.user?.profession) {
      return review.user.profession;
    }
    if (review.user?.email) {
      return review.user.email.split('@')[0];
    }
    return 'Anonymous';
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center">
            <span className="text-primary-600 font-semibold">
              {getDisplayName().charAt(0).toUpperCase()}
            </span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-medium text-gray-900">
                {getDisplayName()}
              </span>
              {review.isVerified && (
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                  Verified
                </span>
              )}
              {isOwn && (
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                  Your Review
                </span>
              )}
            </div>
            <span className="text-sm text-gray-500">
              {formatDate(review.createdAt)}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <StarRating rating={review.rating} size="sm" />
        </div>
      </div>

      {review.title && (
        <h4 className="font-semibold text-gray-900 mb-2">{review.title}</h4>
      )}

      {review.content && (
        <p className="text-gray-700 mb-4">{review.content}</p>
      )}

      <div className="flex flex-wrap gap-4 text-sm text-gray-600 mb-4">
        {review.difficultyRating && (
          <div className="flex items-center gap-1">
            <span>Difficulty:</span>
            <span className="font-medium">{review.difficultyRating}/5</span>
          </div>
        )}
        {review.wouldRecommend !== undefined && (
          <div className="flex items-center gap-1">
            <span>{review.wouldRecommend ? 'Would recommend' : 'Would not recommend'}</span>
            {review.wouldRecommend ? (
              <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            ) : (
              <svg className="w-4 h-4 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            )}
          </div>
        )}
      </div>

      <div className="flex items-center justify-between pt-4 border-t border-gray-200">
        <button
          onClick={onMarkHelpful}
          disabled={isMarkingHelpful || isOwn}
          className={`flex items-center gap-1 text-sm ${
            review.hasVotedHelpful
              ? 'text-primary-600'
              : 'text-gray-500 hover:text-gray-700'
          } ${isOwn ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          <svg className="w-4 h-4" fill={review.hasVotedHelpful ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" />
          </svg>
          <span>Helpful ({review.helpfulCount})</span>
        </button>

        {isOwn && (
          <div className="flex items-center gap-2">
            <button
              onClick={onEdit}
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              Edit
            </button>
            <button
              onClick={onDelete}
              className="text-sm text-red-500 hover:text-red-700"
            >
              Delete
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
