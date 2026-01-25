import { useState } from 'react';
import type { CourseField, CreateCourseInput } from '@ceu/types';

interface AddCourseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (input: CreateCourseInput) => Promise<void>;
  isLoading: boolean;
}

const fields: CourseField[] = [
  'mental_health',
  'nursing',
  'psychology',
  'counseling',
  'social_work',
  'other',
];

export default function AddCourseModal({ isOpen, onClose, onSubmit, isLoading }: AddCourseModalProps) {
  const [formData, setFormData] = useState<CreateCourseInput>({
    title: '',
    field: 'other',
    credits: '',
    description: '',
    instructors: '',
    duration: '',
    category: '',
    url: '',
    price: '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit(formData);
    setFormData({
      title: '',
      field: 'other',
      credits: '',
      description: '',
      instructors: '',
      duration: '',
      category: '',
      url: '',
      price: '',
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        {/* Backdrop */}
        <div
          className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
          onClick={onClose}
        />

        {/* Modal */}
        <div className="relative bg-white rounded-lg shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
          <div className="sticky top-0 bg-white px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900">Add Course Manually</h2>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="px-6 py-4 space-y-4">
            {/* Title - Required */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Title <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="title"
                value={formData.title}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="Course title"
              />
            </div>

            {/* Field - Required */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Field <span className="text-red-500">*</span>
              </label>
              <select
                name="field"
                value={formData.field}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                {fields.map((field) => (
                  <option key={field} value={field}>
                    {field.replace('_', ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
                  </option>
                ))}
              </select>
            </div>

            {/* Credits */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Credits
              </label>
              <input
                type="text"
                name="credits"
                value={formData.credits}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="e.g., 3.0"
              />
            </div>

            {/* Instructors */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Instructor(s)
              </label>
              <input
                type="text"
                name="instructors"
                value={formData.instructors}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="Instructor name(s)"
              />
            </div>

            {/* Duration */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Duration
              </label>
              <input
                type="text"
                name="duration"
                value={formData.duration}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="e.g., 2 hours"
              />
            </div>

            {/* Category */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Category
              </label>
              <input
                type="text"
                name="category"
                value={formData.category}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="e.g., Ethics, Clinical Skills"
              />
            </div>

            {/* Price */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Price
              </label>
              <input
                type="text"
                name="price"
                value={formData.price}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="e.g., $49.99 or Free"
              />
            </div>

            {/* URL */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                URL
              </label>
              <input
                type="url"
                name="url"
                value={formData.url}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="https://..."
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="Course description..."
              />
            </div>

            {/* Submit buttons */}
            <div className="flex gap-3 pt-4 border-t border-gray-200">
              <button
                type="button"
                onClick={onClose}
                disabled={isLoading}
                className="flex-1 px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isLoading || !formData.title}
                className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50"
              >
                {isLoading ? 'Adding...' : 'Add Course'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
