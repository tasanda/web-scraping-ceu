import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { reviewApi } from '../services/api';
import type { CreateReviewInput, UpdateReviewInput } from '@ceu/types';
import { courseKeys } from './useCourseQueries';

export const reviewKeys = {
  all: ['reviews'] as const,
  course: (courseId: string) => ['reviews', 'course', courseId] as const,
  courseList: (courseId: string, page: number, pageSize: number) =>
    ['reviews', 'course', courseId, 'list', page, pageSize] as const,
  userReview: (courseId: string) => ['reviews', 'user', courseId] as const,
};

export function useCourseReviews(courseId: string | undefined, page: number = 1, pageSize: number = 10) {
  return useQuery({
    queryKey: reviewKeys.courseList(courseId!, page, pageSize),
    queryFn: () => reviewApi.getCourseReviews(courseId!, page, pageSize),
    enabled: !!courseId,
  });
}

export function useUserReview(courseId: string | undefined) {
  return useQuery({
    queryKey: reviewKeys.userReview(courseId!),
    queryFn: () => reviewApi.getUserReview(courseId!),
    enabled: !!courseId,
  });
}

export function useCreateReview() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateReviewInput) => reviewApi.createReview(input),
    onSuccess: (_, variables) => {
      // Invalidate course reviews and user review
      queryClient.invalidateQueries({ queryKey: reviewKeys.course(variables.courseId) });
      queryClient.invalidateQueries({ queryKey: reviewKeys.userReview(variables.courseId) });
      // Invalidate course detail to refresh avgRating/reviewCount
      queryClient.invalidateQueries({ queryKey: courseKeys.detail(variables.courseId) });
    },
  });
}

export function useUpdateReview() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateReviewInput; courseId: string }) =>
      reviewApi.updateReview(id, input),
    onSuccess: (_, variables) => {
      // Invalidate course reviews and user review
      queryClient.invalidateQueries({ queryKey: reviewKeys.course(variables.courseId) });
      queryClient.invalidateQueries({ queryKey: reviewKeys.userReview(variables.courseId) });
      // Invalidate course detail to refresh avgRating/reviewCount
      queryClient.invalidateQueries({ queryKey: courseKeys.detail(variables.courseId) });
    },
  });
}

export function useDeleteReview() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id }: { id: string; courseId: string }) => reviewApi.deleteReview(id),
    onSuccess: (_, variables) => {
      // Invalidate course reviews and user review
      queryClient.invalidateQueries({ queryKey: reviewKeys.course(variables.courseId) });
      queryClient.invalidateQueries({ queryKey: reviewKeys.userReview(variables.courseId) });
      // Invalidate course detail to refresh avgRating/reviewCount
      queryClient.invalidateQueries({ queryKey: courseKeys.detail(variables.courseId) });
    },
  });
}

export function useMarkHelpful() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id }: { id: string; courseId: string }) => reviewApi.markHelpful(id),
    onSuccess: (_, variables) => {
      // Invalidate course reviews to refresh helpful counts
      queryClient.invalidateQueries({ queryKey: reviewKeys.course(variables.courseId) });
    },
  });
}
