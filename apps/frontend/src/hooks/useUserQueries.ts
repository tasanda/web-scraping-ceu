import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { userApi } from '../services/api';
import { trackingKeys } from './useTrackingQueries';
import type { UpdateUserInput } from '@ceu/types';

export const userKeys = {
  me: ['user', 'me'] as const,
};

export function useUser() {
  return useQuery({
    queryKey: userKeys.me,
    queryFn: () => userApi.getMe(),
  });
}

export function useUpdateUser() {
  const queryClient = useQueryClient();
  const currentYear = new Date().getFullYear();

  return useMutation({
    mutationFn: (input: UpdateUserInput) => userApi.updateMe(input),
    onSuccess: (_, variables) => {
      // Invalidate user query
      queryClient.invalidateQueries({ queryKey: userKeys.me });

      // If annualCeuRequirement changed, invalidate compliance
      if (variables.annualCeuRequirement !== undefined) {
        queryClient.invalidateQueries({ queryKey: trackingKeys.compliance(currentYear) });
      }
    },
  });
}
