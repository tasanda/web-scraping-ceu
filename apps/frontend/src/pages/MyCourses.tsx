import { useState, useEffect } from 'react';
import { useTracking, useUpdateTracking } from '../hooks/useTrackingQueries';
import toast from 'react-hot-toast';
import { Link } from 'react-router-dom';

export default function MyCourses() {
  const [statusFilter, setStatusFilter] = useState<string>('');

  const {
    data: courses = [],
    isLoading: loading,
    error
  } = useTracking(statusFilter || undefined);

  const updateTrackingMutation = useUpdateTracking();

  useEffect(() => {
    if (error) {
      toast.error('Failed to load courses');
      console.error(error);
    }
  }, [error]);

  const handleStatusChange = async (id: string, newStatus: 'planned' | 'in_progress' | 'completed') => {
    try {
      await updateTrackingMutation.mutateAsync({
        id,
        input: {
          status: newStatus,
          ...(newStatus === 'completed' ? { completedDate: new Date() } : {}),
        },
      });
      toast.success('Course status updated');
    } catch (error) {
      toast.error('Failed to update course status');
      console.error(error);
    }
  };

  if (loading) {
    return (
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="text-center py-12">
          <p className="text-gray-600">Loading courses...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 sm:px-6 lg:px-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-6">My Courses</h1>

      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Filter by Status
        </label>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
        >
          <option value="">All Statuses</option>
          <option value="planned">Planned</option>
          <option value="in_progress">In Progress</option>
          <option value="completed">Completed</option>
        </select>
      </div>

      {courses.length === 0 ? (
        <div className="bg-white rounded-lg shadow-md p-12 text-center">
          <p className="text-gray-600 mb-4">No courses found.</p>
          <Link
            to="/discover"
            className="text-primary-600 hover:text-primary-800 font-medium"
          >
            Discover courses to get started →
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {courses.map((tracking) => (
            <div
              key={tracking.id}
              className="bg-white rounded-lg shadow-md p-6"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <Link
                    to={`/courses/${tracking.courseId}`}
                    className="text-xl font-semibold text-gray-900 hover:text-primary-600"
                  >
                    {tracking.course?.title || 'Unknown Course'}
                  </Link>
                  {tracking.course?.instructors && (
                    <p className="text-gray-600 mt-1">{tracking.course.instructors}</p>
                  )}
                  {tracking.notes && (
                    <p className="text-gray-700 mt-2">{tracking.notes}</p>
                  )}
                  <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
                    {tracking.course?.credits && (
                      <span>{tracking.course.credits} credits</span>
                    )}
                    {tracking.completedDate && (
                      <span>Completed: {new Date(tracking.completedDate).toLocaleDateString()}</span>
                    )}
                  </div>
                </div>
                <div className="ml-4">
                  <select
                    value={tracking.status}
                    onChange={(e) =>
                      handleStatusChange(
                        tracking.id,
                        e.target.value as 'planned' | 'in_progress' | 'completed'
                      )
                    }
                    disabled={updateTrackingMutation.isPending}
                    className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:opacity-50"
                  >
                    <option value="planned">Planned</option>
                    <option value="in_progress">In Progress</option>
                    <option value="completed">Completed</option>
                  </select>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
