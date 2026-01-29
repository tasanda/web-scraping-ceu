import { Link } from 'react-router-dom';
import type { Course } from '@ceu/types';
import { StarRating } from './reviews';

interface CourseCardProps {
  course: Course;
}

export default function CourseCard({ course }: CourseCardProps) {
  return (
    <Link
      to={`/courses/${course.id}`}
      className="block bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow overflow-hidden"
    >
      {course.imageUrl && (
        <img
          src={course.imageUrl}
          alt={course.title}
          className="w-full h-48 object-cover"
        />
      )}
      <div className="p-6">
        <div className="flex items-start justify-between mb-2">
          <h3 className="text-lg font-semibold text-gray-900 line-clamp-2">
            {course.title}
          </h3>
          <span className="ml-2 px-2 py-1 text-xs font-medium bg-primary-100 text-primary-800 rounded">
            {course.field.replace('_', ' ')}
          </span>
        </div>

        {course.instructors && (
          <p className="text-sm text-gray-600 mb-2">
            {course.instructors}
          </p>
        )}

        {/* Rating display */}
        {(course.avgRating !== null || (course.reviewCount ?? 0) > 0) && (
          <div className="flex items-center gap-2 mb-2">
            <StarRating rating={course.avgRating ?? 0} size="sm" />
            <span className="text-xs text-gray-500">
              ({course.reviewCount ?? 0})
            </span>
          </div>
        )}

        {course.description && (
          <p className="text-sm text-gray-700 mb-4 line-clamp-3">
            {course.description}
          </p>
        )}

        <div className="flex items-center justify-between text-sm">
          <div className="flex gap-4 text-gray-600">
            {course.credits && (
              <span>{course.credits} credits</span>
            )}
            {course.duration && (
              <span>{course.duration}</span>
            )}
          </div>
          {course.price && (
            <span className="font-semibold text-gray-900">
              {course.price}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
