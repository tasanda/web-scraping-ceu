import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useUser } from '@clerk/clerk-react';
import { useCourse } from '../hooks/useCourseQueries';
import { useCreateTracking } from '../hooks/useTrackingQueries';
import {
  useCourseReviews,
  useUserReview,
  useCreateReview,
  useUpdateReview,
  useDeleteReview,
  useMarkHelpful,
} from '../hooks/useReviewQueries';
import { ReviewForm, ReviewList, StarRating } from '../components/reviews';
import type { CreateReviewInput, UpdateReviewInput } from '@ceu/types';
import toast from 'react-hot-toast';

export default function CourseDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, isSignedIn } = useUser();
  const [reviewPage, setReviewPage] = useState(1);
  const [isEditingReview, setIsEditingReview] = useState(false);
  const [showReviewForm, setShowReviewForm] = useState(false);

  const {
    data: course,
    isLoading: loading,
    error
  } = useCourse(id);

  const createTrackingMutation = useCreateTracking();

  // Review queries
  const { data: reviewsData, isLoading: reviewsLoading } = useCourseReviews(id, reviewPage);
  const { data: userReview } = useUserReview(id);
  const createReviewMutation = useCreateReview();
  const updateReviewMutation = useUpdateReview();
  const deleteReviewMutation = useDeleteReview();
  const markHelpfulMutation = useMarkHelpful();

  useEffect(() => {
    if (error) {
      toast.error('Failed to load course');
      console.error(error);
    }
  }, [error]);

  const handleAddToTracking = async () => {
    if (!id) return;
    try {
      await createTrackingMutation.mutateAsync({ courseId: id, status: 'planned' });
      toast.success('Course added to your tracking list');
      navigate('/my-courses');
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to add course');
      console.error(error);
    }
  };

  const handleCreateReview = async (input: CreateReviewInput | UpdateReviewInput) => {
    try {
      await createReviewMutation.mutateAsync(input as CreateReviewInput);
      toast.success('Review submitted successfully');
      setShowReviewForm(false);
    } catch (error: any) {
      toast.error(error.message || 'Failed to submit review');
    }
  };

  const handleUpdateReview = async (input: CreateReviewInput | UpdateReviewInput) => {
    if (!userReview) return;
    try {
      await updateReviewMutation.mutateAsync({
        id: userReview.id,
        input: input as UpdateReviewInput,
        courseId: id!,
      });
      toast.success('Review updated successfully');
      setIsEditingReview(false);
    } catch (error: any) {
      toast.error(error.message || 'Failed to update review');
    }
  };

  const handleDeleteReview = async (reviewId: string) => {
    if (!confirm('Are you sure you want to delete your review?')) return;
    try {
      await deleteReviewMutation.mutateAsync({ id: reviewId, courseId: id! });
      toast.success('Review deleted');
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete review');
    }
  };

  const handleMarkHelpful = async (reviewId: string) => {
    if (!isSignedIn) {
      toast.error('Please sign in to mark reviews as helpful');
      return;
    }
    try {
      await markHelpfulMutation.mutateAsync({ id: reviewId, courseId: id! });
    } catch (error: any) {
      toast.error(error.message || 'Failed to update helpful vote');
    }
  };

  if (loading) {
    return (
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="text-center py-12">
          <p className="text-gray-600">Loading course...</p>
        </div>
      </div>
    );
  }

  if (!course) {
    return (
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="text-center py-12">
          <p className="text-gray-600">Course not found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 sm:px-6 lg:px-8">
      <button
        onClick={() => navigate(-1)}
        className="mb-4 text-primary-600 hover:text-primary-800"
      >
        ← Back
      </button>

      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        {course.imageUrl && (
          <img
            src={course.imageUrl}
            alt={course.title}
            className="w-full h-64 object-cover"
          />
        )}

        <div className="p-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">{course.title}</h1>
              {course.instructors && (
                <p className="text-lg text-gray-600">{course.instructors}</p>
              )}
              {(course.avgRating !== null || (course.reviewCount ?? 0) > 0) && (
                <div className="flex items-center gap-2 mt-2">
                  <StarRating rating={course.avgRating ?? 0} size="sm" />
                  <span className="text-sm text-gray-600">
                    {course.avgRating?.toFixed(1) ?? '-'} ({course.reviewCount ?? 0} review{(course.reviewCount ?? 0) !== 1 ? 's' : ''})
                  </span>
                </div>
              )}
            </div>
            <span className="px-3 py-1 text-sm font-medium bg-primary-100 text-primary-800 rounded">
              {course.field.replace('_', ' ')}
            </span>
          </div>

          {course.description && (
            <div className="mb-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Description</h2>
              <p className="text-gray-700">{course.description}</p>
            </div>
          )}

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            {course.credits && (
              <div>
                <p className="text-sm text-gray-600">Credits</p>
                <p className="text-lg font-semibold text-gray-900">{course.credits}</p>
              </div>
            )}
            {course.duration && (
              <div>
                <p className="text-sm text-gray-600">Duration</p>
                <p className="text-lg font-semibold text-gray-900">{course.duration}</p>
              </div>
            )}
            {course.date && (
              <div>
                <p className="text-sm text-gray-600">Date</p>
                <p className="text-lg font-semibold text-gray-900">{course.date}</p>
              </div>
            )}
            {course.price && (
              <div>
                <p className="text-sm text-gray-600">Price</p>
                <p className="text-lg font-semibold text-gray-900">{course.price}</p>
                {course.originalPrice && (
                  <p className="text-sm text-gray-500 line-through">{course.originalPrice}</p>
                )}
              </div>
            )}
          </div>

          {course.provider && (
            <div className="mb-6">
              <p className="text-sm text-gray-600">Provider</p>
              <a
                href={course.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary-600 hover:text-primary-800"
              >
                {course.provider.name}
              </a>
            </div>
          )}

          <div className="flex gap-4">
            <button
              onClick={handleAddToTracking}
              disabled={createTrackingMutation.isPending}
              className="px-6 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {createTrackingMutation.isPending ? 'Adding...' : 'Add to My Courses'}
            </button>
            {course.url && (
              <a
                href={course.url}
                target="_blank"
                rel="noopener noreferrer"
                className="px-6 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
              >
                View on Provider Site
              </a>
            )}
          </div>
        </div>
      </div>

      {/* Reviews Section */}
      <div className="mt-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Reviews</h2>
          {isSignedIn && !userReview && !showReviewForm && (
            <button
              onClick={() => setShowReviewForm(true)}
              className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
            >
              Write a Review
            </button>
          )}
        </div>

        {/* Show review form for creating new review */}
        {showReviewForm && !userReview && (
          <div className="mb-6">
            <ReviewForm
              courseId={id!}
              onSubmit={handleCreateReview}
              onCancel={() => setShowReviewForm(false)}
              isSubmitting={createReviewMutation.isPending}
            />
          </div>
        )}

        {/* Show user's existing review with edit option */}
        {userReview && !isEditingReview && (
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Your Review</h3>
            <ReviewForm
              courseId={id!}
              existingReview={userReview}
              onSubmit={handleUpdateReview}
              onCancel={() => setIsEditingReview(false)}
              isSubmitting={updateReviewMutation.isPending}
            />
          </div>
        )}

        {/* Edit form for existing review */}
        {userReview && isEditingReview && (
          <div className="mb-6">
            <ReviewForm
              courseId={id!}
              existingReview={userReview}
              onSubmit={handleUpdateReview}
              onCancel={() => setIsEditingReview(false)}
              isSubmitting={updateReviewMutation.isPending}
            />
          </div>
        )}

        {/* Reviews list */}
        {reviewsLoading ? (
          <div className="text-center py-8">
            <p className="text-gray-600">Loading reviews...</p>
          </div>
        ) : reviewsData ? (
          <ReviewList
            reviews={reviewsData}
            currentUserId={user?.id}
            page={reviewPage}
            onPageChange={setReviewPage}
            onEdit={() => setIsEditingReview(true)}
            onDelete={handleDeleteReview}
            onMarkHelpful={handleMarkHelpful}
            isMarkingHelpful={markHelpfulMutation.isPending ? undefined : undefined}
          />
        ) : null}

        {/* Prompt to sign in */}
        {!isSignedIn && (
          <div className="mt-4 p-4 bg-gray-50 rounded-lg text-center">
            <p className="text-gray-600">
              Sign in to write a review or mark reviews as helpful.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
