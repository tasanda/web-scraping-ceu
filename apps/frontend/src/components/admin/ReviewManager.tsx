import { useState } from 'react';
import toast from 'react-hot-toast';
import { useAdminReviews, useUpdateAdminReview, useDeleteAdminReview } from '../../hooks/useAdminQueries';
import type { CourseReview } from '@ceu/types';
import { StarRating } from '../reviews';

export default function ReviewManager() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [showHidden, setShowHidden] = useState<boolean | undefined>(undefined);
  const [moderatingReview, setModeratingReview] = useState<CourseReview | null>(null);

  const { data, isLoading } = useAdminReviews(page, 20, search || undefined, showHidden);
  const updateReview = useUpdateAdminReview();
  const deleteReview = useDeleteAdminReview();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearch(searchInput);
    setPage(1);
  };

  const handleToggleHidden = async (review: CourseReview) => {
    if (review.isHidden) {
      // Unhide directly
      try {
        await updateReview.mutateAsync({
          id: review.id,
          input: { isHidden: false },
        });
        toast.success('Review is now visible');
      } catch {
        toast.error('Failed to unhide review');
      }
    } else {
      // Show moderation modal for hiding
      setModeratingReview(review);
    }
  };

  const handleHideReview = async (reason: string) => {
    if (!moderatingReview) return;
    try {
      await updateReview.mutateAsync({
        id: moderatingReview.id,
        input: { isHidden: true, hiddenReason: reason },
      });
      toast.success('Review hidden');
      setModeratingReview(null);
    } catch {
      toast.error('Failed to hide review');
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to permanently delete this review? This cannot be undone.')) {
      return;
    }
    try {
      await deleteReview.mutateAsync(id);
      toast.success('Review deleted');
    } catch {
      toast.error('Failed to delete review');
    }
  };

  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <div>
      {/* Search and Filters */}
      <div className="mb-6 space-y-4">
        <form onSubmit={handleSearch}>
          <div className="flex gap-2">
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search reviews by user, course, or content..."
              className="flex-1 px-4 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
            />
            <button
              type="submit"
              className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700"
            >
              Search
            </button>
            {search && (
              <button
                type="button"
                onClick={() => {
                  setSearch('');
                  setSearchInput('');
                }}
                className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Clear
              </button>
            )}
          </div>
        </form>

        {/* Filter buttons */}
        <div className="flex gap-2">
          <button
            onClick={() => setShowHidden(undefined)}
            className={`px-3 py-1 rounded-md text-sm ${
              showHidden === undefined
                ? 'bg-primary-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            All Reviews
          </button>
          <button
            onClick={() => setShowHidden(false)}
            className={`px-3 py-1 rounded-md text-sm ${
              showHidden === false
                ? 'bg-green-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Visible Only
          </button>
          <button
            onClick={() => setShowHidden(true)}
            className={`px-3 py-1 rounded-md text-sm ${
              showHidden === true
                ? 'bg-red-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Hidden Only
          </button>
        </div>
      </div>

      {/* Reviews Table */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center">
            <p className="text-gray-600">Loading reviews...</p>
          </div>
        ) : data && data.reviews.length > 0 ? (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Review
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Course
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      User
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Rating
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {data.reviews.map((review) => (
                    <tr key={review.id} className={`hover:bg-gray-50 ${review.isHidden ? 'bg-red-50' : ''}`}>
                      <td className="px-6 py-4">
                        <div className="max-w-md">
                          {review.title && (
                            <div className="text-sm font-medium text-gray-900 truncate">
                              {review.title}
                            </div>
                          )}
                          <div className="text-sm text-gray-500 line-clamp-2">
                            {review.content || 'No content'}
                          </div>
                          <div className="text-xs text-gray-400 mt-1">
                            {formatDate(review.createdAt)}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900 max-w-xs truncate">
                          {review.course?.title || 'Unknown Course'}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {review.user?.email || 'Unknown'}
                        {review.isVerified && (
                          <span className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                            Verified
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <StarRating rating={review.rating} size="sm" />
                      </td>
                      <td className="px-6 py-4">
                        {review.isHidden ? (
                          <div>
                            <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-red-100 text-red-800">
                              Hidden
                            </span>
                            {review.hiddenReason && (
                              <div className="text-xs text-gray-500 mt-1 max-w-xs truncate" title={review.hiddenReason}>
                                {review.hiddenReason}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-green-100 text-green-800">
                            Visible
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right text-sm font-medium">
                        <button
                          onClick={() => handleToggleHidden(review)}
                          className={`mr-4 ${
                            review.isHidden
                              ? 'text-green-600 hover:text-green-900'
                              : 'text-yellow-600 hover:text-yellow-900'
                          }`}
                        >
                          {review.isHidden ? 'Unhide' : 'Hide'}
                        </button>
                        <button
                          onClick={() => handleDelete(review.id)}
                          className="text-red-600 hover:text-red-900"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
              <p className="text-sm text-gray-500">
                Showing {(page - 1) * 20 + 1} to {Math.min(page * 20, data.total)} of {data.total} reviews
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage(page - 1)}
                  disabled={page === 1}
                  className="px-3 py-1 border border-gray-300 rounded-md text-sm disabled:opacity-50"
                >
                  Previous
                </button>
                <button
                  onClick={() => setPage(page + 1)}
                  disabled={page >= data.totalPages}
                  className="px-3 py-1 border border-gray-300 rounded-md text-sm disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="p-8 text-center">
            <p className="text-gray-600">No reviews found</p>
          </div>
        )}
      </div>

      {/* Hide Review Modal */}
      {moderatingReview && (
        <HideReviewModal
          review={moderatingReview}
          onHide={handleHideReview}
          onClose={() => setModeratingReview(null)}
        />
      )}
    </div>
  );
}

interface HideReviewModalProps {
  review: CourseReview;
  onHide: (reason: string) => Promise<void>;
  onClose: () => void;
}

function HideReviewModal({ review, onHide, onClose }: HideReviewModalProps) {
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) {
      toast.error('Please provide a reason for hiding this review');
      return;
    }
    setSaving(true);
    await onHide(reason);
    setSaving(false);
  };

  const commonReasons = [
    'Inappropriate language',
    'Spam or advertising',
    'Off-topic content',
    'Harassment or abuse',
    'False or misleading information',
  ];

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4">
        <div className="fixed inset-0 bg-black opacity-30" onClick={onClose} />
        <div className="relative bg-white rounded-lg shadow-xl max-w-lg w-full p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Hide Review</h2>

          <div className="mb-4 p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <StarRating rating={review.rating} size="sm" />
              <span className="text-sm text-gray-500">by {review.user?.email}</span>
            </div>
            {review.title && (
              <div className="font-medium text-gray-900">{review.title}</div>
            )}
            <div className="text-sm text-gray-600 mt-1 line-clamp-3">
              {review.content || 'No content'}
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Reason for hiding <span className="text-red-500">*</span>
              </label>

              {/* Quick select buttons */}
              <div className="flex flex-wrap gap-2 mb-3">
                {commonReasons.map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setReason(r)}
                    className={`px-2 py-1 text-xs rounded-full border ${
                      reason === r
                        ? 'bg-primary-100 border-primary-500 text-primary-700'
                        : 'border-gray-300 text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    {r}
                  </button>
                ))}
              </div>

              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Enter the reason for hiding this review..."
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
              />
            </div>

            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving || !reason.trim()}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50"
              >
                {saving ? 'Hiding...' : 'Hide Review'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
