import { useCompliance, useTracking } from '../hooks/useTrackingQueries';
import ComplianceWidget from '../components/ComplianceWidget';
import toast from 'react-hot-toast';
import { Link } from 'react-router-dom';
import { useEffect } from 'react';

export default function Dashboard() {
  const currentYear = new Date().getFullYear();

  const {
    data: compliance,
    isLoading: complianceLoading,
    error: complianceError
  } = useCompliance(currentYear);

  const {
    data: trackingData,
    isLoading: trackingLoading,
    error: trackingError
  } = useTracking();

  const recentCourses = trackingData?.slice(0, 5) ?? [];
  const loading = complianceLoading || trackingLoading;
  const error = complianceError || trackingError;

  useEffect(() => {
    if (error) {
      toast.error('Failed to load dashboard data');
      console.error(error);
    }
  }, [error]);

  if (loading) {
    return (
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="text-center py-12">
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 sm:px-6 lg:px-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-6">Dashboard</h1>

      {compliance && (
        <div className="mb-8">
          <ComplianceWidget compliance={compliance} />
        </div>
      )}

      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-900">Recent Courses</h2>
          <Link
            to="/my-courses"
            className="text-primary-600 hover:text-primary-800 text-sm font-medium"
          >
            View All →
          </Link>
        </div>

        {recentCourses.length === 0 ? (
          <p className="text-gray-600">No courses tracked yet. Start by discovering courses!</p>
        ) : (
          <div className="space-y-4">
            {recentCourses.map((tracking) => (
              <div
                key={tracking.id}
                className="flex items-center justify-between p-4 border border-gray-200 rounded-lg"
              >
                <div>
                  <Link
                    to={`/courses/${tracking.courseId}`}
                    className="font-medium text-gray-900 hover:text-primary-600"
                  >
                    {tracking.course?.title || 'Unknown Course'}
                  </Link>
                  <p className="text-sm text-gray-600 mt-1">
                    Status: {tracking.status.replace('_', ' ')}
                  </p>
                </div>
                {tracking.creditsEarned && (
                  <span className="text-lg font-semibold text-gray-900">
                    {tracking.creditsEarned} credits
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
