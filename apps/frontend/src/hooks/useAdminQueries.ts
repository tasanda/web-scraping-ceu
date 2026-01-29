import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '../services/api';
import type {
  AdminCourseUpdate,
  AdminProviderCreate,
  AdminProviderUpdate,
  AdminComplianceUpdate,
  AdminReviewUpdate,
} from '@ceu/types';

export const adminKeys = {
  all: ['admin'] as const,
  stats: () => [...adminKeys.all, 'stats'] as const,
  users: (page: number, pageSize: number, search?: string) =>
    [...adminKeys.all, 'users', { page, pageSize, search }] as const,
  courses: (page: number, pageSize: number, search?: string, providerId?: string, manualOnly?: boolean) =>
    [...adminKeys.all, 'courses', { page, pageSize, search, providerId, manualOnly }] as const,
  manualCourses: (page: number, pageSize: number) =>
    [...adminKeys.all, 'manualCourses', { page, pageSize }] as const,
  providers: (page: number, pageSize: number) =>
    [...adminKeys.all, 'providers', { page, pageSize }] as const,
  reviews: (page: number, pageSize: number, search?: string, showHidden?: boolean) =>
    [...adminKeys.all, 'reviews', { page, pageSize, search, showHidden }] as const,
};

// Stats
export function useAdminStats() {
  return useQuery({
    queryKey: adminKeys.stats(),
    queryFn: () => adminApi.getStats(),
  });
}

// Users
export function useAdminUsers(page = 1, pageSize = 20, search?: string) {
  return useQuery({
    queryKey: adminKeys.users(page, pageSize, search),
    queryFn: () => adminApi.getUsers(page, pageSize, search),
  });
}

// Courses
export function useAdminCourses(
  page = 1,
  pageSize = 20,
  search?: string,
  providerId?: string,
  manualOnly?: boolean
) {
  return useQuery({
    queryKey: adminKeys.courses(page, pageSize, search, providerId, manualOnly),
    queryFn: () => adminApi.getCourses(page, pageSize, search, providerId, manualOnly),
  });
}

export function useAdminManualCourses(page = 1, pageSize = 20) {
  return useQuery({
    queryKey: adminKeys.manualCourses(page, pageSize),
    queryFn: () => adminApi.getManualCourses(page, pageSize),
  });
}

export function useUpdateCourse() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: AdminCourseUpdate }) =>
      adminApi.updateCourse(id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminKeys.all });
    },
  });
}

export function useDeleteCourse() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => adminApi.deleteCourse(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminKeys.all });
    },
  });
}

// Providers
export function useAdminProviders(page = 1, pageSize = 20) {
  return useQuery({
    queryKey: adminKeys.providers(page, pageSize),
    queryFn: () => adminApi.getProviders(page, pageSize),
  });
}

export function useCreateProvider() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: AdminProviderCreate) => adminApi.createProvider(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminKeys.all });
    },
  });
}

export function useUpdateProvider() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: AdminProviderUpdate }) =>
      adminApi.updateProvider(id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminKeys.all });
    },
  });
}

export function useDeleteProvider() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => adminApi.deleteProvider(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminKeys.all });
    },
  });
}

// Compliance
export function useUpdateCompliance() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      userId,
      year,
      input,
    }: {
      userId: string;
      year: number;
      input: AdminComplianceUpdate;
    }) => adminApi.updateCompliance(userId, year, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminKeys.all });
    },
  });
}

// Reviews
export function useAdminReviews(page = 1, pageSize = 20, search?: string, showHidden?: boolean) {
  return useQuery({
    queryKey: adminKeys.reviews(page, pageSize, search, showHidden),
    queryFn: () => adminApi.getReviews(page, pageSize, search, showHidden),
  });
}

export function useUpdateAdminReview() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: AdminReviewUpdate }) =>
      adminApi.updateReview(id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminKeys.all });
    },
  });
}

export function useDeleteAdminReview() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => adminApi.deleteReview(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminKeys.all });
    },
  });
}
