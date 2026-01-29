import type { PlannerAnalytics } from '@ceu/types';

interface AnalyticsWidgetProps {
  analytics: PlannerAnalytics | undefined;
  loading: boolean;
}

export default function AnalyticsWidget({ analytics, loading }: AnalyticsWidgetProps) {
  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Learning Insights</h3>
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-200 rounded w-3/4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          <div className="h-4 bg-gray-200 rounded w-2/3"></div>
        </div>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Learning Insights</h3>
        <p className="text-sm text-gray-600">
          Complete some courses to see your learning analytics.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Learning Insights</h3>

      {/* Key Stats */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="text-center p-3 bg-gray-50 rounded-lg">
          <div className="text-2xl font-bold text-primary-600">
            {analytics.totalCreditsEarned.toFixed(1)}
          </div>
          <div className="text-xs text-gray-600">Credits Earned</div>
        </div>
        <div className="text-center p-3 bg-gray-50 rounded-lg">
          <div className="text-2xl font-bold text-primary-600">
            {analytics.totalCoursesCompleted}
          </div>
          <div className="text-xs text-gray-600">Courses Done</div>
        </div>
      </div>

      {/* Ratings */}
      {(analytics.averageRating || analytics.averageDifficulty) && (
        <div className="mb-6 space-y-2">
          {analytics.averageRating && (
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Avg. Rating</span>
              <div className="flex items-center">
                <span className="text-sm font-medium text-gray-900">
                  {analytics.averageRating.toFixed(1)}
                </span>
                <span className="ml-1 text-yellow-500">&#9733;</span>
              </div>
            </div>
          )}
          {analytics.averageDifficulty && (
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Avg. Difficulty</span>
              <span className="text-sm font-medium text-gray-900">
                {analytics.averageDifficulty.toFixed(1)} / 5
              </span>
            </div>
          )}
        </div>
      )}

      {/* Top Fields */}
      {analytics.mostStudiedFields.length > 0 && (
        <div className="mb-6">
          <h4 className="text-sm font-medium text-gray-700 mb-2">Top Fields</h4>
          <div className="space-y-2">
            {analytics.mostStudiedFields.slice(0, 3).map((item) => (
              <div key={item.field} className="flex justify-between items-center">
                <span className="text-sm text-gray-600 capitalize">
                  {item.field.replace('_', ' ')}
                </span>
                <span className="text-sm font-medium text-gray-900">
                  {item.count} course{item.count !== 1 ? 's' : ''}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Monthly Progress Chart (Simple) */}
      {analytics.monthlyProgress.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-2">Monthly Progress</h4>
          <div className="flex items-end justify-between h-16 gap-1">
            {analytics.monthlyProgress.map((month) => {
              const maxCredits = Math.max(
                ...analytics.monthlyProgress.map((m) => m.credits),
                1
              );
              const height = (month.credits / maxCredits) * 100;

              return (
                <div
                  key={month.month}
                  className="flex-1 flex flex-col items-center"
                  title={`${month.month}: ${month.credits} credits`}
                >
                  <div
                    className={`w-full rounded-t ${
                      month.credits > 0 ? 'bg-primary-500' : 'bg-gray-200'
                    }`}
                    style={{ height: `${Math.max(height, 4)}%` }}
                  />
                  <span className="text-xs text-gray-500 mt-1">{month.month[0]}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Upcoming Deadlines */}
      {analytics.upcomingDeadlines.length > 0 && (
        <div className="mt-6 pt-4 border-t border-gray-200">
          <h4 className="text-sm font-medium text-gray-700 mb-2">Upcoming Deadlines</h4>
          <div className="space-y-2">
            {analytics.upcomingDeadlines.slice(0, 2).map((deadline) => {
              const daysLeft = Math.ceil(
                (new Date(deadline.deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
              );
              return (
                <div
                  key={deadline.planId}
                  className="flex justify-between items-center text-sm"
                >
                  <span className="text-gray-600 truncate">{deadline.planName}</span>
                  <span
                    className={`font-medium ${
                      daysLeft <= 7 ? 'text-red-600' : 'text-gray-900'
                    }`}
                  >
                    {daysLeft} days
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
