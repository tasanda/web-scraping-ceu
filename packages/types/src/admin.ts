import type { Course, CeuProvider, CourseField, CourseType } from './course';
import type { User } from './user';
import type { CeuCompliance } from './compliance';

// Admin user view with additional info
export interface AdminUserView extends User {
  tracking?: {
    total: number;
    completed: number;
    inProgress: number;
  };
  compliance?: CeuCompliance | null;
}

// Course management
export interface AdminCourseUpdate {
  title?: string;
  description?: string | null;
  instructors?: string | null;
  price?: number | null;
  credits?: number | null;
  duration?: number | null;
  category?: string | null;
  field?: CourseField;
  courseType?: CourseType;
  startDate?: string | null;
  endDate?: string | null;
  registrationDeadline?: string | null;
  isApproved?: boolean;
}

// Provider management
export interface AdminProviderCreate {
  name: string;
  baseUrl: string;
  active?: boolean;
}

export interface AdminProviderUpdate {
  name?: string;
  baseUrl?: string;
  active?: boolean;
}

export interface AdminProvider extends CeuProvider {
  courseCount?: number;
}

// Compliance management
export interface AdminComplianceUpdate {
  earnedCredits?: number;
  requiredCredits?: number;
  complianceStatus?: 'compliant' | 'non_compliant' | 'in_progress';
}

// Manual course review
export interface ManualCourseReview {
  id: string;
  course: Course;
  submittedBy: User;
  submittedAt: Date;
  status: 'pending' | 'approved' | 'rejected';
  reviewedBy?: User;
  reviewedAt?: Date;
  reviewNotes?: string;
}

// Admin dashboard stats
export interface AdminStats {
  totalUsers: number;
  totalCourses: number;
  totalProviders: number;
  pendingReviews: number;
  compliantUsers: number;
  nonCompliantUsers: number;
}

// Paginated responses for admin
export interface PaginatedUsers {
  users: AdminUserView[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface PaginatedProviders {
  providers: AdminProvider[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}
