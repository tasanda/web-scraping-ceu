import { useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  useRecommendations,
  useStudyPlans,
  useAnalytics,
  usePreferences,
} from '../hooks/usePlannerQueries';
import RecommendationCard from '../components/planner/RecommendationCard';
import StudyPlanCard from '../components/planner/StudyPlanCard';
import AnalyticsWidget from '../components/planner/AnalyticsWidget';
import PlannerPreferencesModal from '../components/planner/PlannerPreferencesModal';
import CreatePlanModal from '../components/planner/CreatePlanModal';

export default function SmartPlanner() {
  const [isPreferencesOpen, setIsPreferencesOpen] = useState(false);
  const [isCreatePlanOpen, setIsCreatePlanOpen] = useState(false);

  const {
    data: recommendations,
    isLoading: recommendationsLoading,
    error: recommendationsError,
  } = useRecommendations(10);

  const {
    data: plans,
    isLoading: plansLoading,
    error: plansError,
  } = useStudyPlans();

  const {
    data: analytics,
    isLoading: analyticsLoading,
  } = useAnalytics();

  const { data: preferences } = usePreferences();

  const error = recommendationsError || plansError;

  if (error) {
    toast.error('Failed to load planner data');
  }

  return (
    <div className="px-4 sm:px-6 lg:px-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Smart Planner</h1>
          <p className="mt-1 text-sm text-gray-600">
            Get personalized course recommendations and create study plans
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setIsPreferencesOpen(true)}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
          >
            Preferences
          </button>
          <button
            onClick={() => setIsCreatePlanOpen(true)}
            className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-md hover:bg-primary-700"
          >
            Create Plan
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Recommendations Section */}
          <section className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Recommended Courses
            </h2>
            {recommendationsLoading ? (
              <div className="text-center py-8">
                <p className="text-gray-600">Loading recommendations...</p>
              </div>
            ) : recommendations && recommendations.length > 0 ? (
              <div className="space-y-4">
                {recommendations.slice(0, 5).map((rec) => (
                  <RecommendationCard key={rec.course.id} recommendation={rec} />
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-600">
                  No recommendations available. Set your preferences to get personalized suggestions.
                </p>
                <button
                  onClick={() => setIsPreferencesOpen(true)}
                  className="mt-4 text-primary-600 hover:text-primary-800 font-medium"
                >
                  Set Preferences
                </button>
              </div>
            )}
          </section>

          {/* Study Plans Section */}
          <section className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900">Your Study Plans</h2>
              <button
                onClick={() => setIsCreatePlanOpen(true)}
                className="text-primary-600 hover:text-primary-800 text-sm font-medium"
              >
                + New Plan
              </button>
            </div>
            {plansLoading ? (
              <div className="text-center py-8">
                <p className="text-gray-600">Loading plans...</p>
              </div>
            ) : plans && plans.length > 0 ? (
              <div className="space-y-4">
                {plans.map((plan) => (
                  <StudyPlanCard key={plan.id} plan={plan} />
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-600">
                  No study plans yet. Create one to organize your learning!
                </p>
                <button
                  onClick={() => setIsCreatePlanOpen(true)}
                  className="mt-4 px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-md hover:bg-primary-700"
                >
                  Create Your First Plan
                </button>
              </div>
            )}
          </section>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Analytics Widget */}
          <AnalyticsWidget analytics={analytics} loading={analyticsLoading} />

          {/* Quick Stats */}
          {preferences && (
            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Your Preferences</h3>
              <div className="space-y-3 text-sm">
                {preferences.budgetMax && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Budget</span>
                    <span className="font-medium">
                      ${preferences.budgetMin || 0} - ${preferences.budgetMax}
                    </span>
                  </div>
                )}
                {preferences.preferredFields.length > 0 && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Fields</span>
                    <span className="font-medium">
                      {preferences.preferredFields.length} selected
                    </span>
                  </div>
                )}
                {preferences.complianceDeadline && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Deadline</span>
                    <span className="font-medium">
                      {new Date(preferences.complianceDeadline).toLocaleDateString()}
                    </span>
                  </div>
                )}
              </div>
              <button
                onClick={() => setIsPreferencesOpen(true)}
                className="mt-4 w-full text-center text-primary-600 hover:text-primary-800 text-sm font-medium"
              >
                Edit Preferences
              </button>
            </div>
          )}

          {/* Quick Links */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Links</h3>
            <div className="space-y-2">
              <Link
                to="/discover"
                className="block text-primary-600 hover:text-primary-800 text-sm"
              >
                Browse All Courses
              </Link>
              <Link
                to="/my-courses"
                className="block text-primary-600 hover:text-primary-800 text-sm"
              >
                My Courses
              </Link>
              <Link
                to="/dashboard"
                className="block text-primary-600 hover:text-primary-800 text-sm"
              >
                Compliance Dashboard
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      <PlannerPreferencesModal
        isOpen={isPreferencesOpen}
        onClose={() => setIsPreferencesOpen(false)}
        currentPreferences={preferences}
      />

      <CreatePlanModal
        isOpen={isCreatePlanOpen}
        onClose={() => setIsCreatePlanOpen(false)}
      />
    </div>
  );
}
