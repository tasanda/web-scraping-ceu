export interface CourseReview {
  id: string;
  userId: string;
  courseId: string;
  rating: number; // 1-5
  title?: string | null;
  content?: string | null;
  difficultyRating?: number | null; // 1-5
  wouldRecommend: boolean;
  isVerified: boolean;
  helpfulCount: number;
  isHidden: boolean;
  hiddenReason?: string | null;
  hiddenAt?: Date | string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
  // Populated relations
  user?: {
    id: string;
    email: string;
    profession?: string | null;
  };
  course?: {
    id: string;
    title: string;
  };
  hasVotedHelpful?: boolean; // For current user
}

export interface CreateReviewInput {
  courseId: string;
  rating: number;
  title?: string;
  content?: string;
  difficultyRating?: number;
  wouldRecommend?: boolean;
}

export interface UpdateReviewInput {
  rating?: number;
  title?: string;
  content?: string;
  difficultyRating?: number;
  wouldRecommend?: boolean;
}

export interface CourseReviewStats {
  avgRating: number | null;
  reviewCount: number;
  ratingDistribution: {
    1: number;
    2: number;
    3: number;
    4: number;
    5: number;
  };
  avgDifficulty: number | null;
  recommendPercent: number | null;
}

export interface PaginatedReviews {
  reviews: CourseReview[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  stats: CourseReviewStats;
}

// Admin review management
export interface AdminReviewUpdate {
  isHidden: boolean;
  hiddenReason?: string;
}

export interface AdminPaginatedReviews {
  reviews: CourseReview[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}
