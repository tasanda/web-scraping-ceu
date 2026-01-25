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
