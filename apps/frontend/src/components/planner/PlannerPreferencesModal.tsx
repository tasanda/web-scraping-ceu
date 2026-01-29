import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import type { UserPlanningPreferences, CourseField, CourseType } from '@ceu/types';
import { useUpdatePreferences } from '../../hooks/usePlannerQueries';

interface PlannerPreferencesModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentPreferences: UserPlanningPreferences | null | undefined;
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

const TIME_SLOTS = [
  'Morning (6am-12pm)',
  'Afternoon (12pm-5pm)',
  'Evening (5pm-9pm)',
  'Night (9pm-12am)',
];

export default function PlannerPreferencesModal({
  isOpen,
  onClose,
  currentPreferences,
}: PlannerPreferencesModalProps) {
  const updatePreferences = useUpdatePreferences();

  const [budgetMin, setBudgetMin] = useState<string>('');
  const [budgetMax, setBudgetMax] = useState<string>('');
  const [selectedFields, setSelectedFields] = useState<CourseField[]>([]);
  const [selectedCourseTypes, setSelectedCourseTypes] = useState<CourseType[]>([]);
  const [daysPerWeek, setDaysPerWeek] = useState<string>('');
  const [hoursPerSession, setHoursPerSession] = useState<string>('');
  const [selectedTimeSlots, setSelectedTimeSlots] = useState<string[]>([]);
  const [complianceDeadline, setComplianceDeadline] = useState<string>('');

  useEffect(() => {
    if (currentPreferences) {
      setBudgetMin(currentPreferences.budgetMin?.toString() || '');
      setBudgetMax(currentPreferences.budgetMax?.toString() || '');
      setSelectedFields(currentPreferences.preferredFields || []);
      setSelectedCourseTypes(currentPreferences.preferredCourseTypes || []);
      setDaysPerWeek(currentPreferences.availableDaysPerWeek?.toString() || '');
      setHoursPerSession(currentPreferences.hoursPerSession?.toString() || '');
      setSelectedTimeSlots(currentPreferences.preferredTimeSlots || []);
      setComplianceDeadline(
        currentPreferences.complianceDeadline
          ? new Date(currentPreferences.complianceDeadline).toISOString().split('T')[0]
          : ''
      );
    }
  }, [currentPreferences]);

  const handleFieldToggle = (field: CourseField) => {
    setSelectedFields((prev) =>
      prev.includes(field) ? prev.filter((f) => f !== field) : [...prev, field]
    );
  };

  const handleCourseTypeToggle = (type: CourseType) => {
    setSelectedCourseTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
    );
  };

  const handleTimeSlotToggle = (slot: string) => {
    setSelectedTimeSlots((prev) =>
      prev.includes(slot) ? prev.filter((s) => s !== slot) : [...prev, slot]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      await updatePreferences.mutateAsync({
        budgetMin: budgetMin ? parseFloat(budgetMin) : null,
        budgetMax: budgetMax ? parseFloat(budgetMax) : null,
        preferredFields: selectedFields,
        preferredCourseTypes: selectedCourseTypes,
        availableDaysPerWeek: daysPerWeek ? parseInt(daysPerWeek) : null,
        hoursPerSession: hoursPerSession ? parseFloat(hoursPerSession) : null,
        preferredTimeSlots: selectedTimeSlots,
        complianceDeadline: complianceDeadline || null,
      });
      toast.success('Preferences saved');
      onClose();
    } catch {
      toast.error('Failed to save preferences');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">Planning Preferences</h2>
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
          {/* Budget */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Budget Range
            </label>
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                <input
                  type="number"
                  value={budgetMin}
                  onChange={(e) => setBudgetMin(e.target.value)}
                  placeholder="Min"
                  className="w-full pl-7 pr-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                />
              </div>
              <span className="text-gray-500">to</span>
              <div className="relative flex-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                <input
                  type="number"
                  value={budgetMax}
                  onChange={(e) => setBudgetMax(e.target.value)}
                  placeholder="Max"
                  className="w-full pl-7 pr-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                />
              </div>
            </div>
          </div>

          {/* Preferred Fields */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Preferred Fields
            </label>
            <div className="flex flex-wrap gap-2">
              {FIELDS.map((field) => (
                <button
                  key={field.value}
                  type="button"
                  onClick={() => handleFieldToggle(field.value)}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                    selectedFields.includes(field.value)
                      ? 'bg-primary-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {field.label}
                </button>
              ))}
            </div>
          </div>

          {/* Course Types */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Preferred Course Types
            </label>
            <div className="flex flex-wrap gap-2">
              {COURSE_TYPES.map((type) => (
                <button
                  key={type.value}
                  type="button"
                  onClick={() => handleCourseTypeToggle(type.value)}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                    selectedCourseTypes.includes(type.value)
                      ? 'bg-primary-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {type.label}
                </button>
              ))}
            </div>
          </div>

          {/* Availability */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Days per Week
              </label>
              <select
                value={daysPerWeek}
                onChange={(e) => setDaysPerWeek(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
              >
                <option value="">Select...</option>
                {[1, 2, 3, 4, 5, 6, 7].map((n) => (
                  <option key={n} value={n}>
                    {n} day{n !== 1 ? 's' : ''}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Hours per Session
              </label>
              <select
                value={hoursPerSession}
                onChange={(e) => setHoursPerSession(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
              >
                <option value="">Select...</option>
                {[0.5, 1, 1.5, 2, 2.5, 3, 4].map((n) => (
                  <option key={n} value={n}>
                    {n} hour{n !== 1 ? 's' : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Time Slots */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Preferred Time Slots
            </label>
            <div className="flex flex-wrap gap-2">
              {TIME_SLOTS.map((slot) => (
                <button
                  key={slot}
                  type="button"
                  onClick={() => handleTimeSlotToggle(slot)}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                    selectedTimeSlots.includes(slot)
                      ? 'bg-primary-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {slot}
                </button>
              ))}
            </div>
          </div>

          {/* Compliance Deadline */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Compliance Deadline
            </label>
            <input
              type="date"
              value={complianceDeadline}
              onChange={(e) => setComplianceDeadline(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
            />
          </div>

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
              disabled={updatePreferences.isPending}
              className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-md hover:bg-primary-700 disabled:opacity-50"
            >
              {updatePreferences.isPending ? 'Saving...' : 'Save Preferences'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
