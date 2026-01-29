import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { plannerApi } from '../services/api';
import { trackingKeys } from './useTrackingQueries';
import type {
  UpdatePreferencesInput,
  CreateStudyPlanInput,
  UpdateStudyPlanInput,
  AddPlanItemInput,
  UpdatePlanItemInput,
  GeneratePlanRequest,
} from '@ceu/types';

export const plannerKeys = {
  all: ['planner'] as const,
  preferences: () => [...plannerKeys.all, 'preferences'] as const,
  plans: () => [...plannerKeys.all, 'plans'] as const,
  plan: (id: string) => [...plannerKeys.plans(), id] as const,
  recommendations: (limit: number) => [...plannerKeys.all, 'recommendations', limit] as const,
  analytics: () => [...plannerKeys.all, 'analytics'] as const,
};

// Preferences
export function usePreferences() {
  return useQuery({
    queryKey: plannerKeys.preferences(),
    queryFn: () => plannerApi.getPreferences(),
  });
}

export function useUpdatePreferences() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: UpdatePreferencesInput) => plannerApi.updatePreferences(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: plannerKeys.preferences() });
      queryClient.invalidateQueries({ queryKey: plannerKeys.recommendations(10) });
    },
  });
}

// Study Plans
export function useStudyPlans() {
  return useQuery({
    queryKey: plannerKeys.plans(),
    queryFn: () => plannerApi.getStudyPlans(),
  });
}

export function useStudyPlan(id: string | undefined) {
  return useQuery({
    queryKey: plannerKeys.plan(id!),
    queryFn: () => plannerApi.getStudyPlan(id!),
    enabled: !!id,
    // Always refetch on mount to get latest tracking status
    refetchOnMount: 'always',
    staleTime: 0,
  });
}

export function useCreateStudyPlan() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateStudyPlanInput) => plannerApi.createStudyPlan(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: plannerKeys.plans() });
    },
  });
}

export function useUpdateStudyPlan() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateStudyPlanInput }) =>
      plannerApi.updateStudyPlan(id, input),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: plannerKeys.plans() });
      queryClient.invalidateQueries({ queryKey: plannerKeys.plan(variables.id) });
    },
  });
}

export function useDeleteStudyPlan() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => plannerApi.deleteStudyPlan(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: plannerKeys.plans() });
    },
  });
}

// Plan Items
export function useAddPlanItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ planId, input }: { planId: string; input: AddPlanItemInput }) =>
      plannerApi.addPlanItem(planId, input),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: plannerKeys.plan(variables.planId) });
      queryClient.invalidateQueries({ queryKey: plannerKeys.plans() });
      queryClient.invalidateQueries({ queryKey: plannerKeys.recommendations(10) });
      // Also invalidate tracking since adding to plan creates tracking entry
      queryClient.invalidateQueries({ queryKey: trackingKeys.all });
    },
  });
}

export function useUpdatePlanItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      planId,
      itemId,
      input,
    }: {
      planId: string;
      itemId: string;
      input: UpdatePlanItemInput;
    }) => plannerApi.updatePlanItem(planId, itemId, input),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: plannerKeys.plan(variables.planId) });
      queryClient.invalidateQueries({ queryKey: plannerKeys.plans() });
    },
  });
}

export function useRemovePlanItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ planId, itemId }: { planId: string; itemId: string }) =>
      plannerApi.removePlanItem(planId, itemId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: plannerKeys.plan(variables.planId) });
      queryClient.invalidateQueries({ queryKey: plannerKeys.plans() });
      queryClient.invalidateQueries({ queryKey: plannerKeys.recommendations(10) });
    },
  });
}

// Recommendations
export function useRecommendations(limit: number = 10) {
  return useQuery({
    queryKey: plannerKeys.recommendations(limit),
    queryFn: () => plannerApi.getRecommendations(limit),
  });
}

// Generate Plan
export function useGeneratePlan() {
  return useMutation({
    mutationFn: (request: GeneratePlanRequest) => plannerApi.generatePlan(request),
  });
}

// Analytics
export function useAnalytics() {
  return useQuery({
    queryKey: plannerKeys.analytics(),
    queryFn: () => plannerApi.getAnalytics(),
  });
}
