import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useCreateStudyPlan, useGeneratePlan, useAddPlanItem } from '../../hooks/usePlannerQueries';
import type { CourseField, CourseType } from '@ceu/types';

interface CreatePlanModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const FIELDS: { value: CourseField; label: string }[] = [
  { value: 'mental_health', label: 'Mental Health' },
  { value: 'psychology', label: 'Psychology' },
  { value: 'counseling', label: 'Counseling' },
  { value: 'nursing', label: 'Nursing' },
  { value: 'social_work', label: 'Social Work' },
  { value: 'other', label: 'Other' },
];

const COURSE_TYPES: { value: CourseType; label: string }[] = [
  { value: 'on_demand', label: 'On-Demand' },
  { value: 'self_paced', label: 'Self-Paced' },
  { value: 'live_webinar', label: 'Live Webinar' },
  { value: 'in_person', label: 'In-Person' },
];

export default function CreatePlanModal({ isOpen, onClose }: CreatePlanModalProps) {
  const navigate = useNavigate();
  const createPlan = useCreateStudyPlan();
  const generatePlan = useGeneratePlan();
  const addPlanItem = useAddPlanItem();

  const [name, setName] = useState('');
  const [targetCredits, setTargetCredits] = useState('');
  const [targetDeadline, setTargetDeadline] = useState('');
  const [notes, setNotes] = useState('');
  const [autoGenerate, setAutoGenerate] = useState(false);
  const [maxBudget, setMaxBudget] = useState('');
  const [selectedFields, setSelectedFields] = useState<CourseField[]>([]);
  const [selectedTypes, setSelectedTypes] = useState<CourseType[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleFieldToggle = (field: CourseField) => {
    setSelectedFields((prev) =>
      prev.includes(field) ? prev.filter((f) => f !== field) : [...prev, field]
    );
  };

  const handleTypeToggle = (type: CourseType) => {
    setSelectedTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name || !targetCredits || !targetDeadline) {
      toast.error('Please fill in all required fields');
      return;
    }

    setIsSubmitting(true);

    try {
      // Create the plan first
      const plan = await createPlan.mutateAsync({
        name,
        targetCredits: parseFloat(targetCredits),
        targetDeadline,
        notes: notes || undefined,
      });

      // If auto-generate is enabled, generate recommendations and add them
      if (autoGenerate) {
        try {
          const generated = await generatePlan.mutateAsync({
            targetCredits: parseFloat(targetCredits),
            targetDeadline,
            maxBudget: maxBudget ? parseFloat(maxBudget) : undefined,
            preferredFields: selectedFields.length > 0 ? selectedFields : undefined,
            preferredCourseTypes: selectedTypes.length > 0 ? selectedTypes : undefined,
          });

          // Add generated courses to the plan
          for (const rec of generated.courses) {
            await addPlanItem.mutateAsync({
              planId: plan.id,
              input: { courseId: rec.course.id },
            });
          }

          if (generated.warnings.length > 0) {
            generated.warnings.forEach((w) => toast(w.message, { icon: '!' }));
          }

          toast.success(
            `Plan created with ${generated.courses.length} courses (${generated.totalCredits.toFixed(1)} credits)`
          );
        } catch {
          toast.error('Plan created but failed to auto-generate courses');
        }
      } else {
        toast.success('Plan created successfully');
      }

      // Reset form
      setName('');
      setTargetCredits('');
      setTargetDeadline('');
      setNotes('');
      setAutoGenerate(false);
      setMaxBudget('');
      setSelectedFields([]);
      setSelectedTypes([]);

      onClose();
      navigate(`/planner/plans/${plan.id}`);
    } catch {
      toast.error('Failed to create plan');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">Create Study Plan</h2>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Plan Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Plan Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., 2024 CEU Requirements"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
              required
            />
          </div>

          {/* Target Credits */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Target Credits <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              step="0.5"
              value={targetCredits}
              onChange={(e) => setTargetCredits(e.target.value)}
              placeholder="e.g., 20"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
              required
            />
          </div>

          {/* Target Deadline */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Target Deadline <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              value={targetDeadline}
              onChange={(e) => setTargetDeadline(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
              required
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Notes (optional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="Any notes about this plan..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
            />
          </div>

          {/* Auto-Generate Toggle */}
          <div className="border-t border-gray-200 pt-4">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={autoGenerate}
                onChange={(e) => setAutoGenerate(e.target.checked)}
                className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
              />
              <div>
                <span className="text-sm font-medium text-gray-900">
                  Auto-generate course selection
                </span>
                <p className="text-xs text-gray-500">
                  Automatically add recommended courses to meet your goal
                </p>
              </div>
            </label>
          </div>

          {/* Auto-Generate Options */}
          {autoGenerate && (
            <div className="space-y-4 p-4 bg-gray-50 rounded-lg">
              {/* Max Budget */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Max Budget (optional)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                  <input
                    type="number"
                    value={maxBudget}
                    onChange={(e) => setMaxBudget(e.target.value)}
                    placeholder="No limit"
                    className="w-full pl-7 pr-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                  />
                </div>
              </div>

              {/* Preferred Fields */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Preferred Fields (optional)
                </label>
                <div className="flex flex-wrap gap-2">
                  {FIELDS.map((field) => (
                    <button
                      key={field.value}
                      type="button"
                      onClick={() => handleFieldToggle(field.value)}
                      className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                        selectedFields.includes(field.value)
                          ? 'bg-primary-600 text-white'
                          : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-100'
                      }`}
                    >
                      {field.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Preferred Types */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Preferred Course Types (optional)
                </label>
                <div className="flex flex-wrap gap-2">
                  {COURSE_TYPES.map((type) => (
                    <button
                      key={type.value}
                      type="button"
                      onClick={() => handleTypeToggle(type.value)}
                      className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                        selectedTypes.includes(type.value)
                          ? 'bg-primary-600 text-white'
                          : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-100'
                      }`}
                    >
                      {type.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-md hover:bg-primary-700 disabled:opacity-50"
            >
              {isSubmitting
                ? autoGenerate
                  ? 'Creating & Generating...'
                  : 'Creating...'
                : 'Create Plan'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
