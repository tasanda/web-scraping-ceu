import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  useStudyPlan,
  useUpdateStudyPlan,
  useDeleteStudyPlan,
  useRemovePlanItem,
} from '../hooks/usePlannerQueries';
import type { PlanStatus, CourseStatus } from '@ceu/types';

const STATUS_COLORS: Record<PlanStatus, string> = {
  draft: 'bg-gray-100 text-gray-800',
  active: 'bg-blue-100 text-blue-800',
  completed: 'bg-green-100 text-green-800',
  archived: 'bg-yellow-100 text-yellow-800',
};

const TRACKING_STATUS_COLORS: Record<CourseStatus, string> = {
  planned: 'bg-gray-100 text-gray-800',
  in_progress: 'bg-yellow-100 text-yellow-800',
  completed: 'bg-green-100 text-green-800',
};

export default function StudyPlanDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState('');

  const { data: plan, isLoading, error } = useStudyPlan(id);
  const updatePlan = useUpdateStudyPlan();
  const deletePlan = useDeleteStudyPlan();
  const removeItem = useRemovePlanItem();

  if (isLoading) {
    return (
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="text-center py-12">
          <p className="text-gray-600">Loading plan...</p>
        </div>
      </div>
    );
  }

  if (error || !plan) {
    return (
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="text-center py-12">
          <p className="text-red-600">Failed to load study plan</p>
          <Link to="/planner" className="mt-4 text-primary-600 hover:text-primary-800">
            Back to Planner
          </Link>
        </div>
      </div>
    );
  }

  const handleStatusChange = async (newStatus: PlanStatus) => {
    try {
      await updatePlan.mutateAsync({ id: plan.id, input: { status: newStatus } });
      toast.success(`Plan ${newStatus === 'active' ? 'activated' : newStatus}`);
    } catch {
      toast.error('Failed to update plan status');
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this plan?')) return;

    try {
      await deletePlan.mutateAsync(plan.id);
      toast.success('Plan deleted');
      navigate('/planner');
    } catch {
      toast.error('Failed to delete plan');
    }
  };

  const handleSaveName = async () => {
    try {
      await updatePlan.mutateAsync({ id: plan.id, input: { name: editName } });
      setIsEditing(false);
      toast.success('Plan name updated');
    } catch {
      toast.error('Failed to update plan name');
    }
  };

  const handleRemoveItem = async (itemId: string) => {
    if (!window.confirm('Remove this course from the plan? (It will remain in My Courses)')) return;

    try {
      await removeItem.mutateAsync({ planId: plan.id, itemId });
      toast.success('Course removed from plan');
    } catch {
      toast.error('Failed to remove course');
    }
  };

  // Calculate progress based on tracking status
  const completedItems = plan.items.filter((item) => item.tracking?.status === 'completed');
  const progress =
    plan.items.length > 0 ? (completedItems.length / plan.items.length) * 100 : 0;

  const totalCredits = plan.items.reduce(
    (sum, item) => sum + (item.tracking?.course?.credits || 0),
    0
  );

  return (
    <div className="px-4 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-6">
        <Link
          to="/planner"
          className="text-sm text-gray-600 hover:text-gray-900 mb-2 inline-block"
        >
          &larr; Back to Planner
        </Link>

        <div className="flex items-start justify-between">
          <div className="flex-1">
            {isEditing ? (
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="text-3xl font-bold text-gray-900 border-b-2 border-primary-600 focus:outline-none"
                  autoFocus
                />
                <button
                  onClick={handleSaveName}
                  className="text-sm text-primary-600 hover:text-primary-800"
                >
                  Save
                </button>
                <button
                  onClick={() => setIsEditing(false)}
                  className="text-sm text-gray-600 hover:text-gray-800"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <h1 className="text-3xl font-bold text-gray-900">{plan.name}</h1>
                <button
                  onClick={() => {
                    setEditName(plan.name);
                    setIsEditing(true);
                  }}
                  className="text-sm text-gray-500 hover:text-gray-700"
                >
                  Edit
                </button>
              </div>
            )}
            <div className="mt-2 flex items-center gap-4">
              <span
                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[plan.status]}`}
              >
                {plan.status}
              </span>
              <span className="text-sm text-gray-600">
                Target: {plan.targetCredits} credits by{' '}
                {new Date(plan.targetDeadline).toLocaleDateString()}
              </span>
            </div>
          </div>

          <div className="flex gap-2">
            {plan.status === 'draft' && (
              <button
                onClick={() => handleStatusChange('active')}
                className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-md hover:bg-primary-700"
              >
                Activate Plan
              </button>
            )}
            {plan.status === 'active' && (
              <button
                onClick={() => handleStatusChange('completed')}
                className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700"
              >
                Mark Complete
              </button>
            )}
            <button
              onClick={handleDelete}
              className="px-4 py-2 text-sm font-medium text-red-600 bg-white border border-red-300 rounded-md hover:bg-red-50"
            >
              Delete
            </button>
          </div>
        </div>
      </div>

      {/* Progress and Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow-md p-4">
          <p className="text-sm text-gray-600">Progress</p>
          <div className="mt-2">
            <div className="flex justify-between text-sm mb-1">
              <span>{completedItems.length} / {plan.items.length} courses</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-primary-600 h-2 rounded-full"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-4">
          <p className="text-sm text-gray-600">Total Credits</p>
          <p className="text-2xl font-bold text-gray-900">{totalCredits.toFixed(1)}</p>
          <p className="text-sm text-gray-500">of {plan.targetCredits} target</p>
        </div>

        <div className="bg-white rounded-lg shadow-md p-4">
          <p className="text-sm text-gray-600">Estimated Cost</p>
          <p className="text-2xl font-bold text-gray-900">
            ${plan.estimatedCost?.toFixed(2) || '0.00'}
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-md p-4">
          <p className="text-sm text-gray-600">Estimated Time</p>
          <p className="text-2xl font-bold text-gray-900">
            {plan.estimatedHours?.toFixed(1) || '0'} hrs
          </p>
        </div>
      </div>

      {/* Course List */}
      <div className="bg-white rounded-lg shadow-md">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Courses in Plan</h2>
          <Link
            to="/my-courses"
            className="text-sm text-primary-600 hover:text-primary-800"
          >
            Manage in My Courses &rarr;
          </Link>
        </div>

        {plan.items.length === 0 ? (
          <div className="p-6 text-center">
            <p className="text-gray-600">No courses in this plan yet.</p>
            <Link
              to="/discover"
              className="mt-4 inline-block text-primary-600 hover:text-primary-800"
            >
              Browse Courses
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {plan.items.map((item) => {
              const tracking = item.tracking;
              const course = tracking?.course;
              const status = tracking?.status || 'planned';

              return (
                <div key={item.id} className="p-6 flex items-center justify-between">
                  <div className="flex-1">
                    <Link
                      to={`/courses/${course?.id}`}
                      className="font-medium text-gray-900 hover:text-primary-600"
                    >
                      {course?.title || 'Unknown Course'}
                    </Link>
                    <div className="mt-1 flex items-center gap-4 text-sm text-gray-600">
                      {course?.credits && (
                        <span>{course.credits} credits</span>
                      )}
                      {course?.price && <span>${course.price}</span>}
                      {item.scheduledDate && (
                        <span>
                          Scheduled: {new Date(item.scheduledDate).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                    {tracking?.progressPercent !== undefined && tracking.progressPercent > 0 && tracking.progressPercent < 100 && (
                      <div className="mt-2 w-48">
                        <div className="w-full bg-gray-200 rounded-full h-1.5">
                          <div
                            className="bg-primary-600 h-1.5 rounded-full"
                            style={{ width: `${tracking.progressPercent}%` }}
                          />
                        </div>
                        <span className="text-xs text-gray-500">{tracking.progressPercent}% complete</span>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-4">
                    {/* Status badge from tracking */}
                    <span
                      className={`text-xs font-medium px-3 py-1 rounded-full ${TRACKING_STATUS_COLORS[status]}`}
                    >
                      {status.replace('_', ' ')}
                    </span>

                    <button
                      onClick={() => handleRemoveItem(item.id)}
                      className="text-gray-400 hover:text-red-600"
                      title="Remove from plan"
                    >
                      <svg
                        className="w-5 h-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M6 18L18 6M6 6l12 12"
                        />
                      </svg>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Info Note */}
      <div className="mt-4 p-4 bg-blue-50 rounded-lg">
        <p className="text-sm text-blue-800">
          <strong>Tip:</strong> Course progress is synced with My Courses.
          To update course status or mark courses complete, go to{' '}
          <Link to="/my-courses" className="underline">My Courses</Link>.
        </p>
      </div>

      {/* Notes Section */}
      {plan.notes && (
        <div className="mt-6 bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Notes</h3>
          <p className="text-gray-600">{plan.notes}</p>
        </div>
      )}
    </div>
  );
}
