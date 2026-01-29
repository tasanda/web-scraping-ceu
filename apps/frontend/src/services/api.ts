import axios from 'axios';
import type {
  ApiResponse,
  Course,
  PaginatedCourses,
  CourseFilters,
  CreateCourseInput,
  User,
  UpdateUserInput,
  UserCeuTracking,
  CreateTrackingInput,
  UpdateTrackingInput,
  ComplianceSummary,
  UserPlanningPreferences,
  UpdatePreferencesInput,
  StudyPlan,
  StudyPlanItem,
  CreateStudyPlanInput,
  UpdateStudyPlanInput,
  AddPlanItemInput,
  UpdatePlanItemInput,
  CourseRecommendation,
  GeneratedPlan,
  GeneratePlanRequest,
  PlannerAnalytics,
  AdminStats,
  AdminCourseUpdate,
  AdminProviderCreate,
  AdminProviderUpdate,
  AdminComplianceUpdate,
  PaginatedUsers,
  PaginatedProviders,
  CeuProvider,
  CeuCompliance,
  CourseReview,
  CreateReviewInput,
  UpdateReviewInput,
  PaginatedReviews,
  AdminReviewUpdate,
  AdminPaginatedReviews,
} from '@ceu/types';

const API_URL = import.meta.env.VITE_API_URL || '/api';

// Create axios instance
const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Function to get fresh token (will be set by Clerk auth hook)
let getTokenFn: (() => Promise<string | null>) | null = null;

export const setGetTokenFn = (fn: (() => Promise<string | null>) | null) => {
  getTokenFn = fn;
};

// Legacy function for backwards compatibility
export const setAuthToken = (_token: string | null) => {
  // No longer used - tokens are fetched fresh for each request
};

// Add auth interceptor that gets fresh token for each request
apiClient.interceptors.request.use(async (config) => {
  if (getTokenFn) {
    try {
      const token = await getTokenFn();
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (error) {
      console.error('Failed to get auth token:', error);
    }
  }
  return config;
});

export const courseApi = {
  getCourses: async (filters: CourseFilters = {}, page = 1, pageSize = 20): Promise<PaginatedCourses> => {
    const params = new URLSearchParams({
      page: page.toString(),
      pageSize: pageSize.toString(),
      ...(filters.field && { field: filters.field }),
      ...(filters.category && { category: filters.category }),
      ...(filters.search && { search: filters.search }),
      ...(filters.dateFrom && { dateFrom: filters.dateFrom }),
      ...(filters.dateTo && { dateTo: filters.dateTo }),
      ...(filters.minPrice && { minPrice: filters.minPrice.toString() }),
      ...(filters.maxPrice && { maxPrice: filters.maxPrice.toString() }),
    });

    const response = await apiClient.get<ApiResponse<PaginatedCourses>>(`/courses?${params}`);
    if (response.data.success && response.data.data) {
      return response.data.data;
    }
    throw new Error(response.data.error || 'Failed to fetch courses');
  },

  getCourseById: async (id: string): Promise<Course> => {
    const response = await apiClient.get<ApiResponse<Course>>(`/courses/${id}`);
    if (response.data.success && response.data.data) {
      return response.data.data;
    }
    throw new Error(response.data.error || 'Failed to fetch course');
  },

  createCourse: async (input: CreateCourseInput): Promise<Course> => {
    const response = await apiClient.post<ApiResponse<Course>>('/courses', input);
    if (response.data.success && response.data.data) {
      return response.data.data;
    }
    throw new Error(response.data.error || 'Failed to create course');
  },
};

export const userApi = {
  getMe: async (): Promise<User> => {
    const response = await apiClient.get<ApiResponse<User>>('/users/me');
    if (response.data.success && response.data.data) {
      return response.data.data;
    }
    throw new Error(response.data.error || 'Failed to fetch user');
  },

  updateMe: async (input: UpdateUserInput): Promise<User> => {
    const response = await apiClient.put<ApiResponse<User>>('/users/me', input);
    if (response.data.success && response.data.data) {
      return response.data.data;
    }
    throw new Error(response.data.error || 'Failed to update user');
  },
};

export const trackingApi = {
  getTracking: async (status?: string): Promise<UserCeuTracking[]> => {
    const params = status ? `?status=${status}` : '';
    const response = await apiClient.get<ApiResponse<UserCeuTracking[]>>(`/tracking${params}`);
    if (response.data.success && response.data.data) {
      return response.data.data;
    }
    throw new Error(response.data.error || 'Failed to fetch tracking');
  },

  createTracking: async (input: CreateTrackingInput): Promise<UserCeuTracking> => {
    const response = await apiClient.post<ApiResponse<UserCeuTracking>>('/tracking', input);
    if (response.data.success && response.data.data) {
      return response.data.data;
    }
    throw new Error(response.data.error || 'Failed to create tracking');
  },

  updateTracking: async (id: string, input: UpdateTrackingInput): Promise<UserCeuTracking> => {
    const response = await apiClient.put<ApiResponse<UserCeuTracking>>(`/tracking/${id}`, input);
    if (response.data.success && response.data.data) {
      return response.data.data;
    }
    throw new Error(response.data.error || 'Failed to update tracking');
  },

  deleteTracking: async (id: string): Promise<void> => {
    const response = await apiClient.delete<ApiResponse<void>>(`/tracking/${id}`);
    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to delete tracking');
    }
  },

  getCompliance: async (year?: number): Promise<ComplianceSummary> => {
    const params = year ? `?year=${year}` : '';
    const response = await apiClient.get<ApiResponse<ComplianceSummary>>(`/tracking/compliance${params}`);
    if (response.data.success && response.data.data) {
      return response.data.data;
    }
    throw new Error(response.data.error || 'Failed to fetch compliance');
  },
};

export const plannerApi = {
  // Preferences
  getPreferences: async (): Promise<UserPlanningPreferences | null> => {
    const response = await apiClient.get<ApiResponse<UserPlanningPreferences | null>>('/planner/preferences');
    if (response.data.success) {
      return response.data.data ?? null;
    }
    throw new Error(response.data.error || 'Failed to fetch preferences');
  },

  updatePreferences: async (input: UpdatePreferencesInput): Promise<UserPlanningPreferences> => {
    const response = await apiClient.put<ApiResponse<UserPlanningPreferences>>('/planner/preferences', input);
    if (response.data.success && response.data.data) {
      return response.data.data;
    }
    throw new Error(response.data.error || 'Failed to update preferences');
  },

  // Study Plans
  getStudyPlans: async (): Promise<StudyPlan[]> => {
    const response = await apiClient.get<ApiResponse<StudyPlan[]>>('/planner/plans');
    if (response.data.success && response.data.data) {
      return response.data.data;
    }
    throw new Error(response.data.error || 'Failed to fetch study plans');
  },

  getStudyPlan: async (id: string): Promise<StudyPlan> => {
    const response = await apiClient.get<ApiResponse<StudyPlan>>(`/planner/plans/${id}`);
    if (response.data.success && response.data.data) {
      return response.data.data;
    }
    throw new Error(response.data.error || 'Failed to fetch study plan');
  },

  createStudyPlan: async (input: CreateStudyPlanInput): Promise<StudyPlan> => {
    const response = await apiClient.post<ApiResponse<StudyPlan>>('/planner/plans', input);
    if (response.data.success && response.data.data) {
      return response.data.data;
    }
    throw new Error(response.data.error || 'Failed to create study plan');
  },

  updateStudyPlan: async (id: string, input: UpdateStudyPlanInput): Promise<StudyPlan> => {
    const response = await apiClient.put<ApiResponse<StudyPlan>>(`/planner/plans/${id}`, input);
    if (response.data.success && response.data.data) {
      return response.data.data;
    }
    throw new Error(response.data.error || 'Failed to update study plan');
  },

  deleteStudyPlan: async (id: string): Promise<void> => {
    const response = await apiClient.delete<ApiResponse<void>>(`/planner/plans/${id}`);
    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to delete study plan');
    }
  },

  // Plan Items
  addPlanItem: async (planId: string, input: AddPlanItemInput): Promise<StudyPlanItem> => {
    const response = await apiClient.post<ApiResponse<StudyPlanItem>>(`/planner/plans/${planId}/items`, input);
    if (response.data.success && response.data.data) {
      return response.data.data;
    }
    throw new Error(response.data.error || 'Failed to add plan item');
  },

  updatePlanItem: async (planId: string, itemId: string, input: UpdatePlanItemInput): Promise<StudyPlanItem> => {
    const response = await apiClient.put<ApiResponse<StudyPlanItem>>(`/planner/plans/${planId}/items/${itemId}`, input);
    if (response.data.success && response.data.data) {
      return response.data.data;
    }
    throw new Error(response.data.error || 'Failed to update plan item');
  },

  removePlanItem: async (planId: string, itemId: string): Promise<void> => {
    const response = await apiClient.delete<ApiResponse<void>>(`/planner/plans/${planId}/items/${itemId}`);
    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to remove plan item');
    }
  },

  // Recommendations & Generation
  getRecommendations: async (limit: number = 10): Promise<CourseRecommendation[]> => {
    const response = await apiClient.get<ApiResponse<CourseRecommendation[]>>(`/planner/recommendations?limit=${limit}`);
    if (response.data.success && response.data.data) {
      return response.data.data;
    }
    throw new Error(response.data.error || 'Failed to fetch recommendations');
  },

  generatePlan: async (request: GeneratePlanRequest): Promise<GeneratedPlan> => {
    const response = await apiClient.post<ApiResponse<GeneratedPlan>>('/planner/generate', request);
    if (response.data.success && response.data.data) {
      return response.data.data;
    }
    throw new Error(response.data.error || 'Failed to generate plan');
  },

  // Analytics
  getAnalytics: async (): Promise<PlannerAnalytics> => {
    const response = await apiClient.get<ApiResponse<PlannerAnalytics>>('/planner/analytics');
    if (response.data.success && response.data.data) {
      return response.data.data;
    }
    throw new Error(response.data.error || 'Failed to fetch analytics');
  },
};

export const adminApi = {
  // Dashboard
  getStats: async (): Promise<AdminStats> => {
    const response = await apiClient.get<ApiResponse<AdminStats>>('/admin/stats');
    if (response.data.success && response.data.data) {
      return response.data.data;
    }
    throw new Error(response.data.error || 'Failed to fetch admin stats');
  },

  // Users
  getUsers: async (page = 1, pageSize = 20, search?: string): Promise<PaginatedUsers> => {
    const params = new URLSearchParams({
      page: page.toString(),
      pageSize: pageSize.toString(),
      ...(search && { search }),
    });
    const response = await apiClient.get<ApiResponse<PaginatedUsers>>(`/admin/users?${params}`);
    if (response.data.success && response.data.data) {
      return response.data.data;
    }
    throw new Error(response.data.error || 'Failed to fetch users');
  },

  // Courses
  getCourses: async (
    page = 1,
    pageSize = 20,
    search?: string,
    providerId?: string,
    manualOnly?: boolean
  ): Promise<PaginatedCourses> => {
    const params = new URLSearchParams({
      page: page.toString(),
      pageSize: pageSize.toString(),
      ...(search && { search }),
      ...(providerId && { providerId }),
      ...(manualOnly && { manualOnly: 'true' }),
    });
    const response = await apiClient.get<ApiResponse<PaginatedCourses>>(`/admin/courses?${params}`);
    if (response.data.success && response.data.data) {
      return response.data.data;
    }
    throw new Error(response.data.error || 'Failed to fetch courses');
  },

  updateCourse: async (id: string, input: AdminCourseUpdate): Promise<Course> => {
    const response = await apiClient.put<ApiResponse<Course>>(`/admin/courses/${id}`, input);
    if (response.data.success && response.data.data) {
      return response.data.data;
    }
    throw new Error(response.data.error || 'Failed to update course');
  },

  deleteCourse: async (id: string): Promise<void> => {
    const response = await apiClient.delete<ApiResponse<void>>(`/admin/courses/${id}`);
    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to delete course');
    }
  },

  getManualCourses: async (page = 1, pageSize = 20): Promise<PaginatedCourses> => {
    const params = new URLSearchParams({
      page: page.toString(),
      pageSize: pageSize.toString(),
    });
    const response = await apiClient.get<ApiResponse<PaginatedCourses>>(`/admin/courses/manual?${params}`);
    if (response.data.success && response.data.data) {
      return response.data.data;
    }
    throw new Error(response.data.error || 'Failed to fetch manual courses');
  },

  // Providers
  getProviders: async (page = 1, pageSize = 20): Promise<PaginatedProviders> => {
    const params = new URLSearchParams({
      page: page.toString(),
      pageSize: pageSize.toString(),
    });
    const response = await apiClient.get<ApiResponse<PaginatedProviders>>(`/admin/providers?${params}`);
    if (response.data.success && response.data.data) {
      return response.data.data;
    }
    throw new Error(response.data.error || 'Failed to fetch providers');
  },

  createProvider: async (input: AdminProviderCreate): Promise<CeuProvider> => {
    const response = await apiClient.post<ApiResponse<CeuProvider>>('/admin/providers', input);
    if (response.data.success && response.data.data) {
      return response.data.data;
    }
    throw new Error(response.data.error || 'Failed to create provider');
  },

  updateProvider: async (id: string, input: AdminProviderUpdate): Promise<CeuProvider> => {
    const response = await apiClient.put<ApiResponse<CeuProvider>>(`/admin/providers/${id}`, input);
    if (response.data.success && response.data.data) {
      return response.data.data;
    }
    throw new Error(response.data.error || 'Failed to update provider');
  },

  deleteProvider: async (id: string): Promise<void> => {
    const response = await apiClient.delete<ApiResponse<void>>(`/admin/providers/${id}`);
    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to delete provider');
    }
  },

  // Compliance
  updateCompliance: async (userId: string, year: number, input: AdminComplianceUpdate): Promise<CeuCompliance> => {
    const response = await apiClient.put<ApiResponse<CeuCompliance>>(`/admin/compliance/${userId}/${year}`, input);
    if (response.data.success && response.data.data) {
      return response.data.data;
    }
    throw new Error(response.data.error || 'Failed to update compliance');
  },

  // Reviews
  getReviews: async (
    page = 1,
    pageSize = 20,
    search?: string,
    showHidden?: boolean
  ): Promise<AdminPaginatedReviews> => {
    const params = new URLSearchParams({
      page: page.toString(),
      pageSize: pageSize.toString(),
      ...(search && { search }),
      ...(showHidden !== undefined && { showHidden: showHidden.toString() }),
    });
    const response = await apiClient.get<ApiResponse<AdminPaginatedReviews>>(`/admin/reviews?${params}`);
    if (response.data.success && response.data.data) {
      return response.data.data;
    }
    throw new Error(response.data.error || 'Failed to fetch reviews');
  },

  updateReview: async (id: string, input: AdminReviewUpdate): Promise<CourseReview> => {
    const response = await apiClient.put<ApiResponse<CourseReview>>(`/admin/reviews/${id}`, input);
    if (response.data.success && response.data.data) {
      return response.data.data;
    }
    throw new Error(response.data.error || 'Failed to update review');
  },

  deleteReview: async (id: string): Promise<void> => {
    const response = await apiClient.delete<ApiResponse<void>>(`/admin/reviews/${id}`);
    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to delete review');
    }
  },
};

export const reviewApi = {
  getCourseReviews: async (courseId: string, page = 1, pageSize = 10): Promise<PaginatedReviews> => {
    const params = new URLSearchParams({
      page: page.toString(),
      pageSize: pageSize.toString(),
    });
    const response = await apiClient.get<ApiResponse<PaginatedReviews>>(`/reviews/course/${courseId}?${params}`);
    if (response.data.success && response.data.data) {
      return response.data.data;
    }
    throw new Error(response.data.error || 'Failed to fetch reviews');
  },

  getUserReview: async (courseId: string): Promise<CourseReview | null> => {
    const response = await apiClient.get<ApiResponse<CourseReview | null>>(`/reviews/course/${courseId}/mine`);
    if (response.data.success) {
      return response.data.data ?? null;
    }
    throw new Error(response.data.error || 'Failed to fetch user review');
  },

  createReview: async (input: CreateReviewInput): Promise<CourseReview> => {
    const response = await apiClient.post<ApiResponse<CourseReview>>('/reviews', input);
    if (response.data.success && response.data.data) {
      return response.data.data;
    }
    throw new Error(response.data.error || 'Failed to create review');
  },

  updateReview: async (id: string, input: UpdateReviewInput): Promise<CourseReview> => {
    const response = await apiClient.put<ApiResponse<CourseReview>>(`/reviews/${id}`, input);
    if (response.data.success && response.data.data) {
      return response.data.data;
    }
    throw new Error(response.data.error || 'Failed to update review');
  },

  deleteReview: async (id: string): Promise<void> => {
    const response = await apiClient.delete<ApiResponse<void>>(`/reviews/${id}`);
    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to delete review');
    }
  },

  markHelpful: async (id: string): Promise<{ helpful: boolean }> => {
    const response = await apiClient.post<ApiResponse<{ helpful: boolean }>>(`/reviews/${id}/helpful`);
    if (response.data.success && response.data.data) {
      return response.data.data;
    }
    throw new Error(response.data.error || 'Failed to mark review helpful');
  },
};
