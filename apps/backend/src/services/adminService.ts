import { prisma } from '../lib/prisma';
import type {
  AdminStats,
  AdminUserView,
  AdminCourseUpdate,
  AdminProviderCreate,
  AdminProviderUpdate,
  AdminProvider,
  AdminComplianceUpdate,
  PaginatedUsers,
  PaginatedProviders,
  Course,
  CeuProvider,
  CourseReview,
  AdminReviewUpdate,
  AdminPaginatedReviews,
} from '@ceu/types';
import { CourseField, ComplianceStatus as PrismaComplianceStatus } from '@prisma/client';

class AdminService {
  // Dashboard stats
  async getStats(): Promise<AdminStats> {
    const currentYear = new Date().getFullYear();

    const [
      totalUsers,
      totalCourses,
      totalProviders,
      pendingReviews,
      compliantUsers,
      nonCompliantUsers,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.ceuCourse.count(),
      prisma.ceuProvider.count(),
      // Count courses from "Manual" provider that might need review
      prisma.ceuCourse.count({
        where: {
          provider: { name: 'Manual' },
        },
      }),
      prisma.ceuCompliance.count({
        where: {
          year: currentYear,
          complianceStatus: 'compliant',
        },
      }),
      prisma.ceuCompliance.count({
        where: {
          year: currentYear,
          complianceStatus: 'non_compliant',
        },
      }),
    ]);

    return {
      totalUsers,
      totalCourses,
      totalProviders,
      pendingReviews,
      compliantUsers,
      nonCompliantUsers,
    };
  }

  // User management
  async getUsers(page: number = 1, pageSize: number = 20, search?: string): Promise<PaginatedUsers> {
    const skip = (page - 1) * pageSize;
    const currentYear = new Date().getFullYear();

    const where = search
      ? {
          OR: [
            { email: { contains: search, mode: 'insensitive' as const } },
            { licenseNumber: { contains: search, mode: 'insensitive' as const } },
          ],
        }
      : {};

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        include: {
          compliance: {
            where: { year: currentYear },
            take: 1,
          },
          _count: {
            select: { tracking: true },
          },
        },
      }),
      prisma.user.count({ where }),
    ]);

    // Get tracking stats for each user
    const userViews: AdminUserView[] = await Promise.all(
      users.map(async (user) => {
        const trackingStats = await prisma.userCeuTracking.groupBy({
          by: ['status'],
          where: { userId: user.id },
          _count: true,
        });

        const completed = trackingStats.find((s) => s.status === 'completed')?._count || 0;
        const inProgress = trackingStats.find((s) => s.status === 'in_progress')?._count || 0;
        const total = user._count.tracking;

        return {
          id: user.id,
          email: user.email,
          clerkId: user.clerkId,
          profession: user.profession,
          licenseNumber: user.licenseNumber,
          annualCeuRequirement: user.annualCeuRequirement,
          createdAt: user.createdAt,
          tracking: { total, completed, inProgress },
          compliance: user.compliance[0]
            ? {
                id: user.compliance[0].id,
                userId: user.compliance[0].userId,
                year: user.compliance[0].year,
                requiredCredits: user.compliance[0].requiredCredits,
                earnedCredits: user.compliance[0].earnedCredits,
                complianceStatus: user.compliance[0].complianceStatus,
                updatedAt: user.compliance[0].updatedAt,
              }
            : null,
        };
      })
    );

    return {
      users: userViews,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  // Course management
  async getCourses(
    page: number = 1,
    pageSize: number = 20,
    search?: string,
    providerId?: string,
    manualOnly?: boolean
  ) {
    const skip = (page - 1) * pageSize;

    const where: any = {};

    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (providerId) {
      where.providerId = providerId;
    }

    if (manualOnly) {
      where.provider = { name: 'Manual' };
    }

    const [courses, total] = await Promise.all([
      prisma.ceuCourse.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { scrapedAt: 'desc' },
        include: { provider: true },
      }),
      prisma.ceuCourse.count({ where }),
    ]);

    return {
      courses: courses.map(this.mapToCourse),
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  async updateCourse(id: string, input: AdminCourseUpdate): Promise<Course | null> {
    const course = await prisma.ceuCourse.update({
      where: { id },
      data: {
        ...(input.title !== undefined && { title: input.title }),
        ...(input.description !== undefined && { description: input.description }),
        ...(input.instructors !== undefined && { instructors: input.instructors }),
        ...(input.price !== undefined && { price: input.price }),
        ...(input.credits !== undefined && { credits: input.credits }),
        ...(input.duration !== undefined && { duration: input.duration }),
        ...(input.category !== undefined && { category: input.category }),
        ...(input.field !== undefined && { field: input.field as CourseField }),
        ...(input.courseType !== undefined && { courseType: input.courseType }),
        ...(input.startDate !== undefined && {
          startDate: input.startDate ? new Date(input.startDate) : null,
        }),
        ...(input.endDate !== undefined && {
          endDate: input.endDate ? new Date(input.endDate) : null,
        }),
        ...(input.registrationDeadline !== undefined && {
          registrationDeadline: input.registrationDeadline
            ? new Date(input.registrationDeadline)
            : null,
        }),
      },
      include: { provider: true },
    });

    return this.mapToCourse(course);
  }

  async deleteCourse(id: string): Promise<boolean> {
    try {
      await prisma.ceuCourse.delete({ where: { id } });
      return true;
    } catch {
      return false;
    }
  }

  // Provider management
  async getProviders(page: number = 1, pageSize: number = 20): Promise<PaginatedProviders> {
    const skip = (page - 1) * pageSize;

    const [providers, total] = await Promise.all([
      prisma.ceuProvider.findMany({
        skip,
        take: pageSize,
        orderBy: { name: 'asc' },
        include: {
          _count: { select: { courses: true } },
        },
      }),
      prisma.ceuProvider.count(),
    ]);

    const adminProviders: AdminProvider[] = providers.map((p) => ({
      id: p.id,
      name: p.name,
      baseUrl: p.baseUrl,
      active: p.active,
      courseCount: p._count.courses,
    }));

    return {
      providers: adminProviders,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  async createProvider(input: AdminProviderCreate): Promise<CeuProvider> {
    const provider = await prisma.ceuProvider.create({
      data: {
        name: input.name,
        baseUrl: input.baseUrl,
        active: input.active ?? true,
      },
    });

    return {
      id: provider.id,
      name: provider.name,
      baseUrl: provider.baseUrl,
      active: provider.active,
    };
  }

  async updateProvider(id: string, input: AdminProviderUpdate): Promise<CeuProvider | null> {
    try {
      const provider = await prisma.ceuProvider.update({
        where: { id },
        data: {
          ...(input.name !== undefined && { name: input.name }),
          ...(input.baseUrl !== undefined && { baseUrl: input.baseUrl }),
          ...(input.active !== undefined && { active: input.active }),
        },
      });

      return {
        id: provider.id,
        name: provider.name,
        baseUrl: provider.baseUrl,
        active: provider.active,
      };
    } catch {
      return null;
    }
  }

  async deleteProvider(id: string): Promise<boolean> {
    try {
      // Check if provider has courses
      const courseCount = await prisma.ceuCourse.count({
        where: { providerId: id },
      });

      if (courseCount > 0) {
        return false; // Can't delete provider with courses
      }

      await prisma.ceuProvider.delete({ where: { id } });
      return true;
    } catch {
      return false;
    }
  }

  // Compliance management
  async updateCompliance(
    userId: string,
    year: number,
    input: AdminComplianceUpdate
  ): Promise<any | null> {
    try {
      const compliance = await prisma.ceuCompliance.upsert({
        where: { userId_year: { userId, year } },
        update: {
          ...(input.earnedCredits !== undefined && { earnedCredits: input.earnedCredits }),
          ...(input.requiredCredits !== undefined && { requiredCredits: input.requiredCredits }),
          ...(input.complianceStatus !== undefined && {
            complianceStatus: input.complianceStatus as PrismaComplianceStatus,
          }),
        },
        create: {
          userId,
          year,
          earnedCredits: input.earnedCredits ?? 0,
          requiredCredits: input.requiredCredits ?? 0,
          complianceStatus: (input.complianceStatus as PrismaComplianceStatus) ?? 'in_progress',
        },
      });

      return {
        id: compliance.id,
        userId: compliance.userId,
        year: compliance.year,
        requiredCredits: compliance.requiredCredits,
        earnedCredits: compliance.earnedCredits,
        complianceStatus: compliance.complianceStatus,
        updatedAt: compliance.updatedAt,
      };
    } catch {
      return null;
    }
  }

  // Get manual courses for review
  async getManualCourses(page: number = 1, pageSize: number = 20) {
    return this.getCourses(page, pageSize, undefined, undefined, true);
  }

  // Review management
  async getReviews(
    page: number = 1,
    pageSize: number = 20,
    search?: string,
    showHidden?: boolean
  ): Promise<AdminPaginatedReviews> {
    const skip = (page - 1) * pageSize;

    const where: any = {};

    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { content: { contains: search, mode: 'insensitive' } },
        { user: { email: { contains: search, mode: 'insensitive' } } },
        { course: { title: { contains: search, mode: 'insensitive' } } },
      ];
    }

    // By default show all reviews, but can filter to only hidden
    if (showHidden !== undefined) {
      where.isHidden = showHidden;
    }

    const [reviews, total] = await Promise.all([
      prisma.courseReview.findMany({
        where,
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
          course: {
            select: {
              id: true,
              title: true,
            },
          },
        },
      }),
      prisma.courseReview.count({ where }),
    ]);

    return {
      reviews: reviews.map(this.mapToReview),
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  async updateReview(id: string, input: AdminReviewUpdate): Promise<CourseReview | null> {
    try {
      const review = await prisma.courseReview.update({
        where: { id },
        data: {
          isHidden: input.isHidden,
          hiddenReason: input.isHidden ? input.hiddenReason : null,
          hiddenAt: input.isHidden ? new Date() : null,
        },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              profession: true,
            },
          },
          course: {
            select: {
              id: true,
              title: true,
            },
          },
        },
      });

      // Update course stats if review visibility changed
      await this.updateCourseReviewStats(review.courseId);

      return this.mapToReview(review);
    } catch {
      return null;
    }
  }

  async deleteReview(id: string): Promise<boolean> {
    try {
      const review = await prisma.courseReview.delete({ where: { id } });
      // Update course stats after deletion
      await this.updateCourseReviewStats(review.courseId);
      return true;
    } catch {
      return false;
    }
  }

  private async updateCourseReviewStats(courseId: string): Promise<void> {
    // Only count non-hidden reviews for stats
    const reviews = await prisma.courseReview.findMany({
      where: { courseId, isHidden: false },
      select: { rating: true },
    });

    const reviewCount = reviews.length;
    const avgRating = reviewCount > 0
      ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviewCount
      : null;

    await prisma.ceuCourse.update({
      where: { id: courseId },
      data: {
        avgRating: avgRating ? Math.round(avgRating * 10) / 10 : null,
        reviewCount,
      },
    });
  }

  private mapToReview(review: any): CourseReview {
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
      course: review.course
        ? {
            id: review.course.id,
            title: review.course.title,
          }
        : undefined,
    };
  }

  private mapToCourse(course: any): Course {
    return {
      id: course.id,
      providerId: course.providerId,
      title: course.title,
      url: course.url,
      description: course.description,
      instructors: course.instructors,
      price: course.price ? parseFloat(course.price.toString()) : null,
      originalPrice: course.originalPrice ? parseFloat(course.originalPrice.toString()) : null,
      credits: course.credits ? parseFloat(course.credits.toString()) : null,
      duration: course.duration,
      category: course.category,
      field: course.field,
      date: course.date,
      imageUrl: course.imageUrl,
      courseType: course.courseType,
      startDate: course.startDate,
      endDate: course.endDate,
      registrationDeadline: course.registrationDeadline,
      scrapedAt: course.scrapedAt,
      provider: course.provider
        ? {
            id: course.provider.id,
            name: course.provider.name,
            baseUrl: course.provider.baseUrl,
            active: course.provider.active,
          }
        : undefined,
    };
  }
}

export const adminService = new AdminService();
