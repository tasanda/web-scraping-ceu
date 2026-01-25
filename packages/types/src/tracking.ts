import { CourseStatus } from './course';

export interface UserCeuTracking {
  id: string;
  userId: string;
  courseId: string;
  completedDate?: Date | null;
  creditsEarned?: number | null;
  status: CourseStatus;
  progressPercent: number;
  notes?: string | null;
  course?: import('./course').Course;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateTrackingInput {
  courseId: string;
  status?: CourseStatus;
  notes?: string;
}

export interface UpdateTrackingInput {
  status?: CourseStatus;
  completedDate?: Date | null;
  creditsEarned?: number | null;
  progressPercent?: number;
  notes?: string;
}
