import { useState } from 'react';
import toast from 'react-hot-toast';
import { useAdminCourses, useUpdateCourse, useDeleteCourse } from '../../hooks/useAdminQueries';
import type { Course, AdminCourseUpdate, CourseField, CourseType } from '@ceu/types';

const FIELDS: CourseField[] = ['mental_health', 'nursing', 'psychology', 'counseling', 'social_work', 'other'];
const COURSE_TYPES: CourseType[] = ['live_webinar', 'in_person', 'on_demand', 'self_paced'];

export default function CourseManager() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);

  const { data, isLoading } = useAdminCourses(page, 20, search || undefined);
  const updateCourse = useUpdateCourse();
  const deleteCourse = useDeleteCourse();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearch(searchInput);
    setPage(1);
  };

  const handleEdit = (course: Course) => {
    setEditingCourse(course);
  };

  const handleSave = async (id: string, input: AdminCourseUpdate) => {
    try {
      await updateCourse.mutateAsync({ id, input });
      toast.success('Course updated');
      setEditingCourse(null);
    } catch {
      toast.error('Failed to update course');
    }
  };

  const handleDelete = async (id: string, title: string) => {
    if (!window.confirm(`Are you sure you want to delete "${title}"? This cannot be undone.`)) {
      return;
    }

    try {
      await deleteCourse.mutateAsync(id);
      toast.success('Course deleted');
    } catch {
      toast.error('Failed to delete course');
    }
  };

  return (
    <div>
      {/* Search */}
      <form onSubmit={handleSearch} className="mb-6">
        <div className="flex gap-2">
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search courses..."
            className="flex-1 px-4 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
          />
          <button
            type="submit"
            className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700"
          >
            Search
          </button>
          {search && (
            <button
              type="button"
              onClick={() => {
                setSearch('');
                setSearchInput('');
              }}
              className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Clear
            </button>
          )}
        </div>
      </form>

      {/* Courses Table */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center">
            <p className="text-gray-600">Loading courses...</p>
          </div>
        ) : data && data.courses.length > 0 ? (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Title
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Provider
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Credits
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Price
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Type
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {data.courses.map((course) => (
                    <tr key={course.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-gray-900 max-w-xs truncate">
                          {course.title}
                        </div>
                        <div className="text-sm text-gray-500">{course.field}</div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {course.provider?.name || 'Unknown'}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {course.credits ?? 'N/A'}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {course.price ? `$${course.price}` : 'N/A'}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {course.courseType?.replace('_', ' ') || 'N/A'}
                      </td>
                      <td className="px-6 py-4 text-right text-sm font-medium">
                        <button
                          onClick={() => handleEdit(course)}
                          className="text-primary-600 hover:text-primary-900 mr-4"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(course.id, course.title)}
                          className="text-red-600 hover:text-red-900"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
              <p className="text-sm text-gray-500">
                Showing {(page - 1) * 20 + 1} to {Math.min(page * 20, data.total)} of {data.total} courses
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage(page - 1)}
                  disabled={page === 1}
                  className="px-3 py-1 border border-gray-300 rounded-md text-sm disabled:opacity-50"
                >
                  Previous
                </button>
                <button
                  onClick={() => setPage(page + 1)}
                  disabled={page >= data.totalPages}
                  className="px-3 py-1 border border-gray-300 rounded-md text-sm disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="p-8 text-center">
            <p className="text-gray-600">No courses found</p>
          </div>
        )}
      </div>

      {/* Edit Modal */}
      {editingCourse && (
        <EditCourseModal
          course={editingCourse}
          onSave={handleSave}
          onClose={() => setEditingCourse(null)}
        />
      )}
    </div>
  );
}

interface EditCourseModalProps {
  course: Course;
  onSave: (id: string, input: AdminCourseUpdate) => Promise<void>;
  onClose: () => void;
}

function EditCourseModal({ course, onSave, onClose }: EditCourseModalProps) {
  const [formData, setFormData] = useState<AdminCourseUpdate>({
    title: course.title,
    description: course.description || '',
    credits: course.credits ?? undefined,
    price: course.price ?? undefined,
    duration: course.duration ?? undefined,
    field: course.field,
    courseType: course.courseType,
    category: course.category || '',
    instructors: course.instructors || '',
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    await onSave(course.id, formData);
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4">
        <div className="fixed inset-0 bg-black opacity-30" onClick={onClose} />
        <div className="relative bg-white rounded-lg shadow-xl max-w-2xl w-full p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Edit Course</h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Title</label>
              <input
                type="text"
                value={formData.title || ''}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Description</label>
              <textarea
                value={formData.description || ''}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
                className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Credits</label>
                <input
                  type="number"
                  step="0.1"
                  value={formData.credits ?? ''}
                  onChange={(e) => setFormData({ ...formData, credits: e.target.value ? parseFloat(e.target.value) : undefined })}
                  className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Price ($)</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.price ?? ''}
                  onChange={(e) => setFormData({ ...formData, price: e.target.value ? parseFloat(e.target.value) : undefined })}
                  className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Field</label>
                <select
                  value={formData.field || ''}
                  onChange={(e) => setFormData({ ...formData, field: e.target.value as CourseField })}
                  className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md"
                >
                  {FIELDS.map((f) => (
                    <option key={f} value={f}>
                      {f.replace('_', ' ')}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Course Type</label>
                <select
                  value={formData.courseType || ''}
                  onChange={(e) => setFormData({ ...formData, courseType: e.target.value as CourseType })}
                  className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md"
                >
                  {COURSE_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t.replace('_', ' ')}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Duration (minutes)</label>
              <input
                type="number"
                value={formData.duration ?? ''}
                onChange={(e) => setFormData({ ...formData, duration: e.target.value ? parseInt(e.target.value) : undefined })}
                className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Instructors</label>
              <input
                type="text"
                value={formData.instructors || ''}
                onChange={(e) => setFormData({ ...formData, instructors: e.target.value })}
                className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Category</label>
              <input
                type="text"
                value={formData.category || ''}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
