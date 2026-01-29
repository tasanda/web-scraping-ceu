import { useState } from 'react';
import toast from 'react-hot-toast';
import { useAdminManualCourses, useUpdateCourse, useDeleteCourse } from '../../hooks/useAdminQueries';
import type { Course, AdminCourseUpdate, CourseField, CourseType } from '@ceu/types';

const FIELDS: CourseField[] = ['mental_health', 'nursing', 'psychology', 'counseling', 'social_work', 'other'];
const COURSE_TYPES: CourseType[] = ['live_webinar', 'in_person', 'on_demand', 'self_paced'];

export default function ManualCourseReview() {
  const [page, setPage] = useState(1);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);

  const { data, isLoading } = useAdminManualCourses(page, 20);
  const updateCourse = useUpdateCourse();
  const deleteCourse = useDeleteCourse();

  const handleApprove = async (course: Course) => {
    try {
      // Approving just means we've reviewed it and it's valid
      // Could add an isApproved field later if needed
      toast.success(`Course "${course.title}" approved`);
    } catch {
      toast.error('Failed to approve course');
    }
  };

  const handleReject = async (course: Course) => {
    if (!window.confirm(`Are you sure you want to reject and delete "${course.title}"?`)) {
      return;
    }

    try {
      await deleteCourse.mutateAsync(course.id);
      toast.success('Course rejected and deleted');
    } catch {
      toast.error('Failed to delete course');
    }
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

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-gray-900">Manual Course Reviews</h2>
        <p className="text-sm text-gray-500 mt-1">
          Review courses manually added by users to ensure accuracy
        </p>
      </div>

      {/* Courses List */}
      <div className="bg-white rounded-lg shadow-md">
        {isLoading ? (
          <div className="p-8 text-center">
            <p className="text-gray-600">Loading manual courses...</p>
          </div>
        ) : data && data.courses.length > 0 ? (
          <>
            <div className="divide-y divide-gray-200">
              {data.courses.map((course) => (
                <div key={course.id} className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-medium text-gray-900">{course.title}</h3>
                      <div className="mt-2 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <span className="text-gray-500">Field:</span>{' '}
                          <span className="text-gray-900 capitalize">
                            {course.field?.replace('_', ' ')}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-500">Credits:</span>{' '}
                          <span className="text-gray-900">{course.credits ?? 'Not specified'}</span>
                        </div>
                        <div>
                          <span className="text-gray-500">Price:</span>{' '}
                          <span className="text-gray-900">
                            {course.price ? `$${course.price}` : 'Not specified'}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-500">Type:</span>{' '}
                          <span className="text-gray-900 capitalize">
                            {course.courseType?.replace('_', ' ') || 'Not specified'}
                          </span>
                        </div>
                      </div>
                      {course.description && (
                        <p className="mt-2 text-sm text-gray-600 line-clamp-2">
                          {course.description}
                        </p>
                      )}
                      {course.instructors && (
                        <p className="mt-1 text-sm text-gray-500">
                          <span className="font-medium">Instructors:</span> {course.instructors}
                        </p>
                      )}
                      <p className="mt-2 text-xs text-gray-400">
                        Added: {new Date(course.scrapedAt).toLocaleDateString()}
                      </p>
                    </div>

                    <div className="ml-4 flex flex-col gap-2">
                      <button
                        onClick={() => handleApprove(course)}
                        className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => handleEdit(course)}
                        className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleReject(course)}
                        className="px-4 py-2 text-sm font-medium text-red-600 bg-white border border-red-300 rounded-md hover:bg-red-50"
                      >
                        Reject
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination */}
            {data.totalPages > 1 && (
              <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
                <p className="text-sm text-gray-500">
                  Page {page} of {data.totalPages} ({data.total} courses)
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
            )}
          </>
        ) : (
          <div className="p-8 text-center">
            <div className="text-green-500 mb-2">
              <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <p className="text-gray-600">No manual courses to review</p>
            <p className="text-sm text-gray-500 mt-1">
              Courses manually added by users will appear here
            </p>
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
        <div className="relative bg-white rounded-lg shadow-xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Edit Manual Course</h2>

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
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      credits: e.target.value ? parseFloat(e.target.value) : undefined,
                    })
                  }
                  className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Price ($)</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.price ?? ''}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      price: e.target.value ? parseFloat(e.target.value) : undefined,
                    })
                  }
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
                  onChange={(e) =>
                    setFormData({ ...formData, courseType: e.target.value as CourseType })
                  }
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
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    duration: e.target.value ? parseInt(e.target.value) : undefined,
                  })
                }
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
