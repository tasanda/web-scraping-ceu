import { useQuery } from '@tanstack/react-query';
import { courseApi } from '../services/api';
import type { CourseFilters } from '@ceu/types';

export const courseKeys = {
  all: ['courses'] as const,
  list: (filters: CourseFilters, page: number, pageSize: number) =>
    ['courses', 'list', filters, page, pageSize] as const,
  detail: (id: string) => ['courses', id] as const,
};

export function useCourses(filters: CourseFilters, page: number, pageSize: number = 20) {
  return useQuery({
    queryKey: courseKeys.list(filters, page, pageSize),
    queryFn: () => courseApi.getCourses(filters, page, pageSize),
  });
}

export function useCourse(id: string | undefined) {
  return useQuery({
    queryKey: courseKeys.detail(id!),
    queryFn: () => courseApi.getCourseById(id!),
    enabled: !!id,
  });
}
