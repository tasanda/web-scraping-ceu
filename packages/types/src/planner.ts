import { Course, CourseField, CourseType } from './course';
import { UserCeuTracking } from './tracking';

// Plan status types
export type PlanStatus = 'draft' | 'active' | 'completed' | 'archived';

// User Planning Preferences
export interface UserPlanningPreferences {
  id: string;
  userId: string;
  budgetMin?: number | null;
  budgetMax?: number | null;
  preferredFields: CourseField[];
  preferredCourseTypes: CourseType[];
  availableDaysPerWeek?: number | null;
  hoursPerSession?: number | null;
  preferredTimeSlots: string[];
  complianceDeadline?: Date | string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface UpdatePreferencesInput {
  budgetMin?: number | null;
  budgetMax?: number | null;
  preferredFields?: CourseField[];
  preferredCourseTypes?: CourseType[];
  availableDaysPerWeek?: number | null;
  hoursPerSession?: number | null;
  preferredTimeSlots?: string[];
  complianceDeadline?: Date | string | null;
}

// Study Plan
export interface StudyPlan {
  id: string;
  userId: string;
  name: string;
  targetCredits: number;
  targetDeadline: Date | string;
  status: PlanStatus;
  estimatedCost?: number | null;
  estimatedHours?: number | null;
  notes?: string | null;
  items: StudyPlanItem[];
  createdAt: Date;
  updatedAt: Date;
}

export interface StudyPlanItem {
  id: string;
  planId: string;
  trackingId: string;
  scheduledDate?: Date | string | null;
  scheduledTime?: string | null;
  priority: number;
  notes?: string | null;
  tracking?: UserCeuTracking; // Contains course and status from My Courses
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateStudyPlanInput {
  name: string;
  targetCredits: number;
  targetDeadline: Date | string;
  notes?: string;
}

export interface UpdateStudyPlanInput {
  name?: string;
  targetCredits?: number;
  targetDeadline?: Date | string;
  status?: PlanStatus;
  notes?: string | null;
}

export interface AddPlanItemInput {
  courseId: string;
  scheduledDate?: Date | string | null;
  scheduledTime?: string | null;
  priority?: number;
  notes?: string;
}

export interface UpdatePlanItemInput {
  scheduledDate?: Date | string | null;
  scheduledTime?: string | null;
  priority?: number;
  notes?: string | null;
}

// Course Recommendation
export type RecommendationReason =
  | 'matches_field'
  | 'matches_profession'
  | 'within_budget'
  | 'credits_needed'
  | 'matches_course_type'
  | 'upcoming_live_event'
  | 'high_rating'
  | 'popular';

export interface CourseRecommendation {
  course: Course;
  score: number; // 0-100
  reasons: RecommendationReason[];
}

// Generated Plan
export interface PlanWarning {
  type: 'budget_exceeded' | 'deadline_tight' | 'credits_short' | 'scheduling_conflict';
  message: string;
}

export interface GeneratedPlan {
  courses: CourseRecommendation[];
  totalCredits: number;
  totalCost: number;
  totalHours: number;
  scheduledDates: (Date | string)[];
  warnings: PlanWarning[];
}

export interface GeneratePlanRequest {
  targetCredits: number;
  targetDeadline: Date | string;
  maxBudget?: number;
  preferredFields?: CourseField[];
  preferredCourseTypes?: CourseType[];
  excludeCourseIds?: string[];
}

// Course Completion History (for analytics)
export interface CourseCompletionHistory {
  id: string;
  userId: string;
  courseId: string;
  completedAt: Date;
  actualDuration?: number | null;
  rating?: number | null;
  difficultyRating?: number | null;
  wouldRecommend?: boolean | null;
  notes?: string | null;
  createdAt: Date;
}

// Analytics
export interface PlannerAnalytics {
  totalCreditsEarned: number;
  totalCoursesCompleted: number;
  averageRating?: number;
  averageDifficulty?: number;
  mostStudiedFields: { field: CourseField; count: number }[];
  monthlyProgress: { month: string; credits: number }[];
  upcomingDeadlines: { planId: string; planName: string; deadline: Date | string; creditsRemaining: number }[];
}
