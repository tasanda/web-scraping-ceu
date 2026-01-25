export type CourseField = 
  | 'mental_health'
  | 'nursing'
  | 'psychology'
  | 'counseling'
  | 'social_work'
  | 'other';

export type CourseStatus = 'planned' | 'in_progress' | 'completed';

export interface Course {
  id: string;
  providerId: string;
  title: string;
  url: string;
  description?: string | null;
  instructors?: string | null;
  price?: string | null;
  originalPrice?: string | null;
  credits?: string | null;
  duration?: string | null;
  category?: string | null;
  field: CourseField;
  date?: string | null;
  imageUrl?: string | null;
  scrapedAt: Date;
  provider?: CeuProvider;
}

export interface CeuProvider {
  id: string;
  name: string;
  baseUrl: string;
  active: boolean;
}

export interface CourseFilters {
  field?: CourseField;
  category?: string;
  minPrice?: number;
  maxPrice?: number;
  search?: string;
  dateFrom?: string;
  dateTo?: string;
  credits?: string;
}

export interface PaginatedCourses {
  courses: Course[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}
