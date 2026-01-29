export type CourseField =
  | 'mental_health'
  | 'nursing'
  | 'psychology'
  | 'counseling'
  | 'social_work'
  | 'other';

export type CourseStatus = 'planned' | 'in_progress' | 'completed';

export type CourseType =
  | 'live_webinar'
  | 'in_person'
  | 'on_demand'
  | 'self_paced';

export interface Course {
  id: string;
  providerId: string;
  title: string;
  url: string;
  description?: string | null;
  instructors?: string | null;
  // Numeric values for calculations
  price?: number | null;
  originalPrice?: number | null;
  credits?: number | null;
  duration?: number | null; // Duration in minutes
  // String values for display
  priceString?: string | null;
  creditsString?: string | null;
  durationString?: string | null;
  category?: string | null;
  field: CourseField;
  date?: string | null;
  imageUrl?: string | null;
  // Course type and scheduling
  courseType: CourseType;
  startDate?: Date | string | null;
  endDate?: Date | string | null;
  registrationDeadline?: Date | string | null;
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

export interface CreateCourseInput {
  title: string;
  field: CourseField;
  credits?: string;
  description?: string;
  instructors?: string;
  duration?: string;
  category?: string;
  url?: string;
  price?: string;
}
