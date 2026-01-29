import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import type { CourseRecommendation, RecommendationReason } from '@ceu/types';
import { useAddPlanItem, useStudyPlans } from '../../hooks/usePlannerQueries';
import { useState } from 'react';

interface RecommendationCardProps {
  recommendation: CourseRecommendation;
}

const REASON_LABELS: Record<RecommendationReason, string> = {
  matches_field: 'Matches your field',
  matches_profession: 'Matches your profession',
  within_budget: 'Within budget',
  credits_needed: 'Credits you need',
  matches_course_type: 'Preferred format',
  upcoming_live_event: 'Live event soon',
  high_rating: 'Highly rated',
  popular: 'Popular choice',
};

const REASON_COLORS: Record<RecommendationReason, string> = {
  matches_field: 'bg-blue-100 text-blue-700',
  matches_profession: 'bg-purple-100 text-purple-700',
  within_budget: 'bg-green-100 text-green-700',
  credits_needed: 'bg-orange-100 text-orange-700',
  matches_course_type: 'bg-indigo-100 text-indigo-700',
  upcoming_live_event: 'bg-red-100 text-red-700',
  high_rating: 'bg-yellow-100 text-yellow-700',
  popular: 'bg-pink-100 text-pink-700',
};

export default function RecommendationCard({ recommendation }: RecommendationCardProps) {
  const { course, score, reasons } = recommendation;
  const [showPlanSelect, setShowPlanSelect] = useState(false);

  const { data: plans } = useStudyPlans();
  const addPlanItem = useAddPlanItem();

  const activePlans = plans?.filter((p) => p.status === 'draft' || p.status === 'active') || [];

  const handleAddToPlan = async (planId: string) => {
    try {
      await addPlanItem.mutateAsync({
        planId,
        input: { courseId: course.id },
      });
      toast.success('Course added to plan and My Courses');
      setShowPlanSelect(false);
    } catch {
      toast.error('Failed to add course to plan');
    }
  };

  const scoreColor =
    score >= 80 ? 'text-green-600' : score >= 60 ? 'text-yellow-600' : 'text-gray-600';

  return (
    <div className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <Link
            to={`/courses/${course.id}`}
            className="font-medium text-gray-900 hover:text-primary-600 line-clamp-1"
          >
            {course.title}
          </Link>

          <div className="mt-1 flex items-center gap-3 text-sm text-gray-600">
            {course.credits && <span>{course.credits} credits</span>}
            {course.price && <span>${course.price}</span>}
            {course.courseType && (
              <span className="capitalize">{course.courseType.replace('_', ' ')}</span>
            )}
          </div>

          {/* Reason Tags */}
          <div className="mt-2 flex flex-wrap gap-1">
            {reasons.slice(0, 3).map((reason) => (
              <span
                key={reason}
                className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${REASON_COLORS[reason]}`}
              >
                {REASON_LABELS[reason]}
              </span>
            ))}
          </div>
        </div>

        <div className="ml-4 flex flex-col items-end gap-2">
          {/* Score Badge */}
          <div className={`text-lg font-bold ${scoreColor}`}>{Math.round(score)}</div>

          {/* Add to Plan Button */}
          <div className="relative">
            <button
              onClick={() => setShowPlanSelect(!showPlanSelect)}
              className="text-sm text-primary-600 hover:text-primary-800 font-medium"
              title="Also adds to My Courses"
            >
              + Add to Plan
            </button>

            {showPlanSelect && (
              <div className="absolute right-0 mt-1 w-48 bg-white rounded-md shadow-lg border border-gray-200 z-10">
                {activePlans.length === 0 ? (
                  <div className="p-3 text-sm text-gray-600">
                    No active plans. Create one first.
                  </div>
                ) : (
                  <div className="py-1">
                    {activePlans.map((plan) => (
                      <button
                        key={plan.id}
                        onClick={() => handleAddToPlan(plan.id)}
                        className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      >
                        {plan.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
