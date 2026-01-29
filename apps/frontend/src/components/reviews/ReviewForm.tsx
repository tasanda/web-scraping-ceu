import { useState } from 'react';
import type { CourseReview, CreateReviewInput, UpdateReviewInput } from '@ceu/types';
import StarRating from './StarRating';

interface ReviewFormProps {
  courseId: string;
  existingReview?: CourseReview | null;
  onSubmit: (input: CreateReviewInput | UpdateReviewInput) => void;
  onCancel?: () => void;
  isSubmitting?: boolean;
}

export default function ReviewForm({
  courseId,
  existingReview,
  onSubmit,
  onCancel,
  isSubmitting = false,
}: ReviewFormProps) {
  const [rating, setRating] = useState(existingReview?.rating ?? 0);
  const [title, setTitle] = useState(existingReview?.title ?? '');
  const [content, setContent] = useState(existingReview?.content ?? '');
  const [difficultyRating, setDifficultyRating] = useState(existingReview?.difficultyRating ?? 0);
  const [wouldRecommend, setWouldRecommend] = useState(existingReview?.wouldRecommend ?? true);
  const [errors, setErrors] = useState<{ rating?: string }>({});

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (rating === 0) {
      setErrors({ rating: 'Please select a rating' });
      return;
    }

    const input = existingReview
      ? {
          rating,
          title: title || undefined,
          content: content || undefined,
          difficultyRating: difficultyRating || undefined,
          wouldRecommend,
        }
      : {
          courseId,
          rating,
          title: title || undefined,
          content: content || undefined,
          difficultyRating: difficultyRating || undefined,
          wouldRecommend,
        };

    onSubmit(input);
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        {existingReview ? 'Edit Your Review' : 'Write a Review'}
      </h3>

      {/* Overall Rating */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Overall Rating <span className="text-red-500">*</span>
        </label>
        <StarRating
          rating={rating}
          size="lg"
          interactive
          onChange={setRating}
        />
        {errors.rating && (
          <p className="mt-1 text-sm text-red-600">{errors.rating}</p>
        )}
      </div>

      {/* Title */}
      <div className="mb-4">
        <label htmlFor="review-title" className="block text-sm font-medium text-gray-700 mb-1">
          Review Title
        </label>
        <input
          type="text"
          id="review-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Summarize your experience"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          maxLength={100}
        />
      </div>

      {/* Content */}
      <div className="mb-4">
        <label htmlFor="review-content" className="block text-sm font-medium text-gray-700 mb-1">
          Your Review
        </label>
        <textarea
          id="review-content"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Share your experience with this course..."
          rows={4}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          maxLength={2000}
        />
        <p className="mt-1 text-xs text-gray-500">{content.length}/2000 characters</p>
      </div>

      {/* Difficulty Rating */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Difficulty Level
        </label>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-500">Easy</span>
          <div className="flex gap-2">
            {[1, 2, 3, 4, 5].map((level) => (
              <button
                key={level}
                type="button"
                onClick={() => setDifficultyRating(level)}
                className={`w-8 h-8 rounded-full text-sm font-medium transition-colors ${
                  difficultyRating === level
                    ? 'bg-primary-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {level}
              </button>
            ))}
          </div>
          <span className="text-sm text-gray-500">Hard</span>
        </div>
      </div>

      {/* Would Recommend */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Would you recommend this course?
        </label>
        <div className="flex gap-4">
          <button
            type="button"
            onClick={() => setWouldRecommend(true)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-colors ${
              wouldRecommend
                ? 'border-green-500 bg-green-50 text-green-700'
                : 'border-gray-300 text-gray-600 hover:bg-gray-50'
            }`}
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            Yes
          </button>
          <button
            type="button"
            onClick={() => setWouldRecommend(false)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-colors ${
              !wouldRecommend
                ? 'border-red-500 bg-red-50 text-red-700'
                : 'border-gray-300 text-gray-600 hover:bg-gray-50'
            }`}
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            No
          </button>
        </div>
      </div>

      {/* Submit Buttons */}
      <div className="flex justify-end gap-3">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-gray-700 hover:text-gray-900"
          >
            Cancel
          </button>
        )}
        <button
          type="submit"
          disabled={isSubmitting}
          className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting ? 'Submitting...' : existingReview ? 'Update Review' : 'Submit Review'}
        </button>
      </div>
    </form>
  );
}
