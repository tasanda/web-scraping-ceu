import { useState, useEffect } from 'react';
import { useCourses } from '../hooks/useCourseQueries';
import CourseCard from '../components/CourseCard';
import FilterBar from '../components/FilterBar';
import type { CourseFilters } from '@ceu/types';
import toast from 'react-hot-toast';

export default function CourseDiscovery() {
  const [filters, setFilters] = useState<CourseFilters>({});
  const [page, setPage] = useState(1);
  const pageSize = 20;

  const {
    data,
    isLoading: loading,
    error
  } = useCourses(filters, page, pageSize);

  const courses = data?.courses ?? [];
  const pagination = {
    page,
    pageSize,
    total: data?.total ?? 0,
    totalPages: data?.totalPages ?? 0,
  };

  useEffect(() => {
    if (error) {
      toast.error('Failed to load courses');
      console.error(error);
    }
  }, [error]);

  const handleFiltersChange = (newFilters: CourseFilters) => {
    setFilters(newFilters);
    setPage(1);
  };

  return (
    <div className="px-4 sm:px-6 lg:px-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-6">Discover Courses</h1>

      <FilterBar filters={filters} onFiltersChange={handleFiltersChange} />

      {loading ? (
        <div className="text-center py-12">
          <p className="text-gray-600">Loading courses...</p>
        </div>
      ) : courses.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-600">No courses found. Try adjusting your filters.</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            {courses.map((course) => (
              <CourseCard key={course.id} course={course} />
            ))}
          </div>

          {pagination.totalPages > 1 && (
            <div className="flex justify-center gap-2">
              <button
                onClick={() => setPage(page - 1)}
                disabled={page === 1}
                className="px-4 py-2 border border-gray-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <span className="px-4 py-2 text-gray-700">
                Page {page} of {pagination.totalPages}
              </span>
              <button
                onClick={() => setPage(page + 1)}
                disabled={page >= pagination.totalPages}
                className="px-4 py-2 border border-gray-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
