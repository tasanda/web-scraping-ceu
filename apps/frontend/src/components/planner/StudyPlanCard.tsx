import { Link } from 'react-router-dom';
import type { StudyPlan, PlanStatus } from '@ceu/types';

interface StudyPlanCardProps {
  plan: StudyPlan;
}

const STATUS_COLORS: Record<PlanStatus, string> = {
  draft: 'bg-gray-100 text-gray-800',
  active: 'bg-blue-100 text-blue-800',
  completed: 'bg-green-100 text-green-800',
  archived: 'bg-yellow-100 text-yellow-800',
};

export default function StudyPlanCard({ plan }: StudyPlanCardProps) {
  // Progress is based on tracking status (from My Courses)
  const completedItems = plan.items.filter((item) => item.tracking?.status === 'completed');
  const progress =
    plan.items.length > 0 ? (completedItems.length / plan.items.length) * 100 : 0;

  const totalCredits = plan.items.reduce(
    (sum, item) => sum + (item.tracking?.course?.credits || 0),
    0
  );

  const daysRemaining = Math.ceil(
    (new Date(plan.targetDeadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  );

  const isOverdue = daysRemaining < 0;
  const isUrgent = daysRemaining >= 0 && daysRemaining <= 7;

  return (
    <Link
      to={`/planner/plans/${plan.id}`}
      className="block border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
    >
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="font-medium text-gray-900">{plan.name}</h3>
          <div className="mt-1 flex items-center gap-2">
            <span
              className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[plan.status]}`}
            >
              {plan.status}
            </span>
            <span className="text-sm text-gray-600">
              {plan.items.length} course{plan.items.length !== 1 ? 's' : ''}
            </span>
          </div>
        </div>

        <div className="text-right">
          <div className="text-lg font-semibold text-gray-900">
            {totalCredits.toFixed(1)} / {plan.targetCredits}
          </div>
          <div className="text-xs text-gray-500">credits</div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mb-3">
        <div className="flex justify-between text-xs text-gray-600 mb-1">
          <span>{completedItems.length} of {plan.items.length} completed</span>
          <span>{Math.round(progress)}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className={`h-2 rounded-full transition-all ${
              progress === 100 ? 'bg-green-500' : 'bg-primary-600'
            }`}
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Footer Stats */}
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-4 text-gray-600">
          {plan.estimatedCost && (
            <span>${plan.estimatedCost.toFixed(0)}</span>
          )}
          {plan.estimatedHours && (
            <span>{plan.estimatedHours.toFixed(1)} hrs</span>
          )}
        </div>

        <div
          className={`text-sm font-medium ${
            isOverdue
              ? 'text-red-600'
              : isUrgent
              ? 'text-orange-600'
              : 'text-gray-600'
          }`}
        >
          {isOverdue
            ? `${Math.abs(daysRemaining)} days overdue`
            : daysRemaining === 0
            ? 'Due today'
            : `${daysRemaining} days left`}
        </div>
      </div>
    </Link>
  );
}
