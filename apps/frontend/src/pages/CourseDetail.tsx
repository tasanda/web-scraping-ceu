import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useCourse } from '../hooks/useCourseQueries';
import { useCreateTracking } from '../hooks/useTrackingQueries';
import toast from 'react-hot-toast';

export default function CourseDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const {
    data: course,
    isLoading: loading,
    error
  } = useCourse(id);

  const createTrackingMutation = useCreateTracking();

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
    </div>
  );
}
