import { prisma } from '../lib/prisma';
import type {
  CourseReview,
  CreateReviewInput,
  UpdateReviewInput,
  PaginatedReviews,
  CourseReviewStats,
} from '@ceu/types';

class ReviewService {
  // Get reviews for a course (excludes hidden reviews)
  async getCourseReviews(
    courseId: string,
    page: number = 1,
    pageSize: number = 10,
    currentUserId?: string
  ): Promise<PaginatedReviews> {
    const skip = (page - 1) * pageSize;

    // Filter out hidden reviews for public display
    const whereClause = { courseId, isHidden: false };

    const [reviews, total, stats] = await Promise.all([
      prisma.courseReview.findMany({
        where: whereClause,
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              profession: true,
            },
          },
          helpfulVotes: currentUserId
            ? {
                where: { userId: currentUserId },
                select: { id: true },
              }
            : false,
        },
      }),
      prisma.courseReview.count({ where: whereClause }),
      this.getCourseStats(courseId),
    ]);

    return {
      reviews: reviews.map((r) => this.mapToReview(r, currentUserId)),
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
      stats,
    };
  }

  // Get stats for a course (excludes hidden reviews)
  async getCourseStats(courseId: string): Promise<CourseReviewStats> {
    const reviews = await prisma.courseReview.findMany({
      where: { courseId, isHidden: false },
      select: {
        rating: true,
        difficultyRating: true,
        wouldRecommend: true,
      },
    });

    if (reviews.length === 0) {
      return {
        avgRating: null,
        reviewCount: 0,
        ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
        avgDifficulty: null,
        recommendPercent: null,
      };
    }

    const ratingDistribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    let totalRating = 0;
    let totalDifficulty = 0;
    let difficultyCount = 0;
    let recommendCount = 0;

    for (const review of reviews) {
      totalRating += review.rating;
      ratingDistribution[review.rating as 1 | 2 | 3 | 4 | 5]++;

      if (review.difficultyRating) {
        totalDifficulty += review.difficultyRating;
        difficultyCount++;
      }

      if (review.wouldRecommend) {
        recommendCount++;
      }
    }

    return {
      avgRating: Math.round((totalRating / reviews.length) * 10) / 10,
      reviewCount: reviews.length,
      ratingDistribution,
      avgDifficulty: difficultyCount > 0 ? Math.round((totalDifficulty / difficultyCount) * 10) / 10 : null,
      recommendPercent: Math.round((recommendCount / reviews.length) * 100),
    };
  }

  // Create a review
  async createReview(
    userId: string,
    input: CreateReviewInput
  ): Promise<CourseReview | null> {
    // Check if user already reviewed this course
    const existing = await prisma.courseReview.findUnique({
      where: { userId_courseId: { userId, courseId: input.courseId } },
    });

    if (existing) {
      return null; // User already reviewed
    }

    // Check if user has completed the course (for verified badge)
    const tracking = await prisma.userCeuTracking.findUnique({
      where: { userId_courseId: { userId, courseId: input.courseId } },
    });

    const isVerified = tracking?.status === 'completed';

    const review = await prisma.courseReview.create({
      data: {
        userId,
        courseId: input.courseId,
        rating: input.rating,
        title: input.title,
        content: input.content,
        difficultyRating: input.difficultyRating,
        wouldRecommend: input.wouldRecommend ?? true,
        isVerified,
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            profession: true,
          },
        },
      },
    });

    // Update course stats
    await this.updateCourseStats(input.courseId);

    return this.mapToReview(review);
  }

  // Update a review
  async updateReview(
    userId: string,
    reviewId: string,
    input: UpdateReviewInput
  ): Promise<CourseReview | null> {
    // Verify ownership
    const existing = await prisma.courseReview.findFirst({
      where: { id: reviewId, userId },
    });

    if (!existing) {
      return null;
    }

    const review = await prisma.courseReview.update({
      where: { id: reviewId },
      data: {
        ...(input.rating !== undefined && { rating: input.rating }),
        ...(input.title !== undefined && { title: input.title }),
        ...(input.content !== undefined && { content: input.content }),
        ...(input.difficultyRating !== undefined && { difficultyRating: input.difficultyRating }),
        ...(input.wouldRecommend !== undefined && { wouldRecommend: input.wouldRecommend }),
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            profession: true,
          },
        },
      },
    });

    // Update course stats
    await this.updateCourseStats(existing.courseId);

    return this.mapToReview(review);
  }

  // Delete a review
  async deleteReview(userId: string, reviewId: string): Promise<boolean> {
    const existing = await prisma.courseReview.findFirst({
      where: { id: reviewId, userId },
    });

    if (!existing) {
      return false;
    }

    await prisma.courseReview.delete({ where: { id: reviewId } });

    // Update course stats
    await this.updateCourseStats(existing.courseId);

    return true;
  }

  // Get user's review for a course
  async getUserReview(userId: string, courseId: string): Promise<CourseReview | null> {
    const review = await prisma.courseReview.findUnique({
      where: { userId_courseId: { userId, courseId } },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            profession: true,
          },
        },
      },
    });

    return review ? this.mapToReview(review) : null;
  }

  // Mark review as helpful
  async markHelpful(userId: string, reviewId: string): Promise<boolean> {
    // Check if already voted
    const existing = await prisma.reviewHelpful.findUnique({
      where: { reviewId_userId: { reviewId, userId } },
    });

    if (existing) {
      // Remove vote
      await prisma.reviewHelpful.delete({
        where: { id: existing.id },
      });
      await prisma.courseReview.update({
        where: { id: reviewId },
        data: { helpfulCount: { decrement: 1 } },
      });
      return false; // Vote removed
    } else {
      // Add vote
      await prisma.reviewHelpful.create({
        data: { reviewId, userId },
      });
      await prisma.courseReview.update({
        where: { id: reviewId },
        data: { helpfulCount: { increment: 1 } },
      });
      return true; // Vote added
    }
  }

  // Update cached stats on course
  private async updateCourseStats(courseId: string): Promise<void> {
    const stats = await this.getCourseStats(courseId);

    await prisma.ceuCourse.update({
      where: { id: courseId },
      data: {
        avgRating: stats.avgRating,
        reviewCount: stats.reviewCount,
      },
    });
  }

  private mapToReview(review: any, currentUserId?: string): CourseReview {
    return {
      id: review.id,
      userId: review.userId,
      courseId: review.courseId,
      rating: review.rating,
      title: review.title,
      content: review.content,
      difficultyRating: review.difficultyRating,
      wouldRecommend: review.wouldRecommend,
      isVerified: review.isVerified,
      helpfulCount: review.helpfulCount,
      isHidden: review.isHidden,
      hiddenReason: review.hiddenReason,
      hiddenAt: review.hiddenAt,
      createdAt: review.createdAt,
      updatedAt: review.updatedAt,
      user: review.user
        ? {
            id: review.user.id,
            email: review.user.email,
            profession: review.user.profession,
          }
        : undefined,
      hasVotedHelpful: currentUserId && review.helpfulVotes
        ? review.helpfulVotes.length > 0
        : undefined,
    };
  }
}

export const reviewService = new ReviewService();
