import type { PaginatedReviews, CourseReviewStats } from '@ceu/types';
import ReviewCard from './ReviewCard';
import StarRating from './StarRating';

interface ReviewListProps {
  reviews: PaginatedReviews;
  currentUserId?: string;
  page: number;
  onPageChange: (page: number) => void;
  onEdit: (reviewId: string) => void;
  onDelete: (reviewId: string) => void;
  onMarkHelpful: (reviewId: string) => void;
  isMarkingHelpful?: string; // ID of review being marked
}

function ReviewStats({ stats }: { stats: CourseReviewStats }) {
  const maxCount = Math.max(...Object.values(stats.ratingDistribution));

  return (
    <div className="bg-white rounded-lg shadow p-6 mb-6">
      <div className="flex flex-col md:flex-row md:items-center gap-6">
        {/* Average Rating */}
        <div className="text-center md:text-left">
          <div className="text-4xl font-bold text-gray-900">
            {stats.avgRating?.toFixed(1) ?? '-'}
          </div>
          <StarRating rating={stats.avgRating ?? 0} size="md" />
          <div className="text-sm text-gray-500 mt-1">
            {stats.reviewCount} review{stats.reviewCount !== 1 ? 's' : ''}
          </div>
        </div>

        {/* Rating Distribution */}
        <div className="flex-1">
          {[5, 4, 3, 2, 1].map((rating) => {
            const count = stats.ratingDistribution[rating as keyof typeof stats.ratingDistribution];
            const percentage = maxCount > 0 ? (count / maxCount) * 100 : 0;

            return (
              <div key={rating} className="flex items-center gap-2 mb-1">
                <span className="text-sm text-gray-600 w-8">{rating}</span>
                <div className="flex-1 bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-yellow-400 h-2 rounded-full transition-all"
                    style={{ width: `${percentage}%` }}
                  />
                </div>
                <span className="text-sm text-gray-500 w-8">{count}</span>
              </div>
            );
          })}
        </div>

        {/* Additional Stats */}
        <div className="flex flex-col gap-2 text-sm">
          {stats.avgDifficulty !== null && (
            <div className="flex items-center gap-2">
              <span className="text-gray-600">Avg. Difficulty:</span>
              <span className="font-medium">{stats.avgDifficulty.toFixed(1)}/5</span>
            </div>
          )}
          {stats.recommendPercent !== null && (
            <div className="flex items-center gap-2">
              <span className="text-gray-600">Would Recommend:</span>
              <span className="font-medium text-green-600">{stats.recommendPercent}%</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ReviewList({
  reviews,
  currentUserId,
  page,
  onPageChange,
  onEdit,
  onDelete,
  onMarkHelpful,
  isMarkingHelpful,
}: ReviewListProps) {
  if (reviews.total === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-8 text-center">
        <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
        </svg>
        <h3 className="mt-4 text-lg font-medium text-gray-900">No reviews yet</h3>
        <p className="mt-2 text-gray-500">Be the first to share your experience with this course!</p>
      </div>
    );
  }

  return (
    <div>
      <ReviewStats stats={reviews.stats} />

      <div className="space-y-4">
        {reviews.reviews.map((review) => (
          <ReviewCard
            key={review.id}
            review={review}
            isOwn={currentUserId === review.userId}
            onEdit={() => onEdit(review.id)}
            onDelete={() => onDelete(review.id)}
            onMarkHelpful={() => onMarkHelpful(review.id)}
            isMarkingHelpful={isMarkingHelpful === review.id}
          />
        ))}
      </div>

      {/* Pagination */}
      {reviews.totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-6">
          <button
            onClick={() => onPageChange(page - 1)}
            disabled={page === 1}
            className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Previous
          </button>
          <span className="text-sm text-gray-600">
            Page {page} of {reviews.totalPages}
          </span>
          <button
            onClick={() => onPageChange(page + 1)}
            disabled={page === reviews.totalPages}
            className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
