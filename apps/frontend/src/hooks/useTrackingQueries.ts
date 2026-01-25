import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { trackingApi } from '../services/api';
import type { CreateTrackingInput, UpdateTrackingInput } from '@ceu/types';

export const trackingKeys = {
  all: ['tracking'] as const,
  byStatus: (status?: string) => ['tracking', { status }] as const,
  compliance: (year: number) => ['compliance', year] as const,
};

export function useCompliance(year: number) {
  return useQuery({
    queryKey: trackingKeys.compliance(year),
    queryFn: () => trackingApi.getCompliance(year),
  });
}

export function useTracking(status?: string) {
  return useQuery({
    queryKey: trackingKeys.byStatus(status),
    queryFn: () => trackingApi.getTracking(status),
  });
}

export function useCreateTracking() {
  const queryClient = useQueryClient();
  const currentYear = new Date().getFullYear();

  return useMutation({
    mutationFn: (input: CreateTrackingInput) => trackingApi.createTracking(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: trackingKeys.all });
      queryClient.invalidateQueries({ queryKey: trackingKeys.compliance(currentYear) });
    },
  });
}

export function useUpdateTracking() {
  const queryClient = useQueryClient();
  const currentYear = new Date().getFullYear();

  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateTrackingInput }) =>
      trackingApi.updateTracking(id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: trackingKeys.all });
      queryClient.invalidateQueries({ queryKey: trackingKeys.compliance(currentYear) });
    },
  });
}

export function useDeleteTracking() {
  const queryClient = useQueryClient();
  const currentYear = new Date().getFullYear();

  return useMutation({
    mutationFn: (id: string) => trackingApi.deleteTracking(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: trackingKeys.all });
      queryClient.invalidateQueries({ queryKey: trackingKeys.compliance(currentYear) });
    },
  });
}
