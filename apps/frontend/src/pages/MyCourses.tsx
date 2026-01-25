import { useState, useEffect } from 'react';
import { useTracking, useUpdateTracking, useDeleteTracking, useCreateTracking } from '../hooks/useTrackingQueries';
import { useCreateCourse } from '../hooks/useCourseQueries';
import toast from 'react-hot-toast';
import { Link } from 'react-router-dom';
import AddCourseModal from '../components/AddCourseModal';
import type { CreateCourseInput } from '@ceu/types';

function ProgressInput({
  trackingId,
  initialValue,
  onSave,
  disabled
}: {
  trackingId: string;
  initialValue: number;
  onSave: (id: string, value: number) => void;
  disabled: boolean;
}) {
  const [value, setValue] = useState(initialValue.toString());

  useEffect(() => {
    setValue(initialValue.toString());
  }, [initialValue]);

  const handleSave = () => {
    const numValue = Math.min(100, Math.max(0, parseInt(value) || 0));
    setValue(numValue.toString());
    if (numValue !== initialValue) {
      onSave(trackingId, numValue);
    }
  };

  return (
    <div className="flex items-center gap-1">
      <input
        type="number"
        min="0"
        max="100"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={handleSave}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            handleSave();
            (e.target as HTMLInputElement).blur();
          }
        }}
        disabled={disabled}
        className="w-16 px-2 py-1 border border-gray-300 rounded-md text-center focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:opacity-50"
      />
      <span className="text-sm text-gray-600">%</span>
    </div>
  );
}

export default function MyCourses() {
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  const {
    data: courses = [],
    isLoading: loading,
    error
  } = useTracking(statusFilter || undefined);

  const updateTrackingMutation = useUpdateTracking();
  const deleteTrackingMutation = useDeleteTracking();
  const createCourseMutation = useCreateCourse();
  const createTrackingMutation = useCreateTracking();

  useEffect(() => {
    if (error) {
      toast.error('Failed to load courses');
      console.error(error);
    }
  }, [error]);

  const handleStatusChange = async (id: string, newStatus: 'planned' | 'in_progress' | 'completed') => {
    try {
      await updateTrackingMutation.mutateAsync({
        id,
        input: {
          status: newStatus,
          ...(newStatus === 'completed' ? { completedDate: new Date() } : {}),
        },
      });
      toast.success('Course status updated');
    } catch (error) {
      toast.error('Failed to update course status');
      console.error(error);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteTrackingMutation.mutateAsync(id);
      setDeleteConfirmId(null);
      toast.success('Course removed from your list');
    } catch (error) {
      toast.error('Failed to remove course');
      console.error(error);
    }
  };

  const handleProgressChange = async (id: string, progressPercent: number) => {
    try {
      await updateTrackingMutation.mutateAsync({
        id,
        input: { progressPercent },
      });
    } catch (error) {
      toast.error('Failed to update progress');
      console.error(error);
    }
  };

  const handleAddCourse = async (input: CreateCourseInput) => {
    try {
      // Create the course
      const course = await createCourseMutation.mutateAsync(input);
      // Add it to tracking
      await createTrackingMutation.mutateAsync({
        courseId: course.id,
        status: 'planned',
      });
      setIsAddModalOpen(false);
      toast.success('Course added successfully');
    } catch (error) {
      toast.error('Failed to add course');
      console.error(error);
    }
  };

  const handleCertificateUpload = (trackingId: string, file: File) => {
    // TODO: Implement S3 upload when AWS is connected
    console.log('Certificate upload placeholder:', { trackingId, fileName: file.name, fileSize: file.size });
    toast.success(`Certificate "${file.name}" selected. Upload will be available once connected to AWS S3.`);
  };

  if (loading) {
    return (
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="text-center py-12">
          <p className="text-gray-600">Loading courses...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 sm:px-6 lg:px-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold text-gray-900">My Courses</h1>
        <button
          onClick={() => setIsAddModalOpen(true)}
          className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 flex items-center gap-2"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
          </svg>
          Add Course
        </button>
      </div>

      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Filter by Status
        </label>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
        >
          <option value="">All Statuses</option>
          <option value="planned">Planned</option>
          <option value="in_progress">In Progress</option>
          <option value="completed">Completed</option>
        </select>
      </div>

      {courses.length === 0 ? (
        <div className="bg-white rounded-lg shadow-md p-12 text-center">
          <p className="text-gray-600 mb-4">No courses found.</p>
          <Link
            to="/discover"
            className="text-primary-600 hover:text-primary-800 font-medium"
          >
            Discover courses to get started →
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {courses.map((tracking) => (
            <div
              key={tracking.id}
              className="bg-white rounded-lg shadow-md p-6"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <Link
                    to={`/courses/${tracking.courseId}`}
                    className="text-xl font-semibold text-gray-900 hover:text-primary-600"
                  >
                    {tracking.course?.title || 'Unknown Course'}
                  </Link>
                  {tracking.course?.instructors && (
                    <p className="text-gray-600 mt-1">{tracking.course.instructors}</p>
                  )}
                  {tracking.notes && (
                    <p className="text-gray-700 mt-2">{tracking.notes}</p>
                  )}
                  <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
                    {tracking.course?.credits && (
                      <span>{tracking.course.credits} credits</span>
                    )}
                    {tracking.completedDate && (
                      <span>Completed: {new Date(tracking.completedDate).toLocaleDateString()}</span>
                    )}
                  </div>
                </div>
                <div className="ml-4 flex items-center gap-2">
                  <select
                    value={tracking.status}
                    onChange={(e) =>
                      handleStatusChange(
                        tracking.id,
                        e.target.value as 'planned' | 'in_progress' | 'completed'
                      )
                    }
                    disabled={updateTrackingMutation.isPending}
                    className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:opacity-50"
                  >
                    <option value="planned">Planned</option>
                    <option value="in_progress">In Progress</option>
                    <option value="completed">Completed</option>
                  </select>
                  <button
                    onClick={() => setDeleteConfirmId(tracking.id)}
                    className="px-3 py-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-md transition-colors"
                    title="Remove course"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                  </button>
                </div>
              </div>

              {tracking.status === 'in_progress' && (
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <div className="flex items-center gap-3">
                    <label className="text-sm font-medium text-gray-700">
                      Progress:
                    </label>
                    <ProgressInput
                      trackingId={tracking.id}
                      initialValue={tracking.progressPercent}
                      onSave={handleProgressChange}
                      disabled={updateTrackingMutation.isPending}
                    />
                  </div>
                  <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-primary-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${tracking.progressPercent}%` }}
                    />
                  </div>
                </div>
              )}

              {tracking.status === 'completed' && (
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-green-600">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      <span className="text-sm font-medium">100% Complete</span>
                    </div>
                    <div>
                      <input
                        type="file"
                        id={`certificate-${tracking.id}`}
                        accept=".pdf,.jpg,.jpeg,.png"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            handleCertificateUpload(tracking.id, file);
                          }
                          e.target.value = '';
                        }}
                      />
                      <label
                        htmlFor={`certificate-${tracking.id}`}
                        className="inline-flex items-center gap-2 px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 cursor-pointer transition-colors"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM6.293 6.707a1 1 0 010-1.414l3-3a1 1 0 011.414 0l3 3a1 1 0 01-1.414 1.414L11 5.414V13a1 1 0 11-2 0V5.414L7.707 6.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
                        </svg>
                        Upload Certificate
                      </label>
                    </div>
                  </div>
                </div>
              )}

              {deleteConfirmId === tracking.id && (
                <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-md">
                  <p className="text-red-800 mb-3">Are you sure you want to remove this course from your list?</p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleDelete(tracking.id)}
                      disabled={deleteTrackingMutation.isPending}
                      className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50"
                    >
                      {deleteTrackingMutation.isPending ? 'Removing...' : 'Yes, Remove'}
                    </button>
                    <button
                      onClick={() => setDeleteConfirmId(null)}
                      disabled={deleteTrackingMutation.isPending}
                      className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 disabled:opacity-50"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <AddCourseModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSubmit={handleAddCourse}
        isLoading={createCourseMutation.isPending || createTrackingMutation.isPending}
      />
    </div>
  );
}
