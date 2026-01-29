import { prisma } from '../lib/prisma';
import {
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
  RecommendationReason,
  Course,
  CourseField,
  CourseType,
  UserCeuTracking,
} from '@ceu/types';
import {
  PlanStatus as PrismaPlanStatus,
  CourseField as PrismaCourseField,
  CourseType as PrismaCourseType,
} from '@prisma/client';

export class PlannerService {
  // ==================== PREFERENCES ====================

  async getPreferences(userId: string): Promise<UserPlanningPreferences | null> {
    const prefs = await prisma.userPlanningPreferences.findUnique({
      where: { userId },
    });

    return prefs ? this.mapToPreferences(prefs) : null;
  }

  async updatePreferences(
    userId: string,
    input: UpdatePreferencesInput
  ): Promise<UserPlanningPreferences> {
    const prefs = await prisma.userPlanningPreferences.upsert({
      where: { userId },
      update: {
        budgetMin: input.budgetMin !== undefined ? input.budgetMin : undefined,
        budgetMax: input.budgetMax !== undefined ? input.budgetMax : undefined,
        preferredFields: input.preferredFields as PrismaCourseField[] | undefined,
        preferredCourseTypes: input.preferredCourseTypes as PrismaCourseType[] | undefined,
        availableDaysPerWeek: input.availableDaysPerWeek,
        hoursPerSession: input.hoursPerSession !== undefined ? input.hoursPerSession : undefined,
        preferredTimeSlots: input.preferredTimeSlots,
        complianceDeadline: input.complianceDeadline
          ? new Date(input.complianceDeadline)
          : undefined,
      },
      create: {
        userId,
        budgetMin: input.budgetMin,
        budgetMax: input.budgetMax,
        preferredFields: (input.preferredFields || []) as PrismaCourseField[],
        preferredCourseTypes: (input.preferredCourseTypes || []) as PrismaCourseType[],
        availableDaysPerWeek: input.availableDaysPerWeek,
        hoursPerSession: input.hoursPerSession,
        preferredTimeSlots: input.preferredTimeSlots || [],
        complianceDeadline: input.complianceDeadline
          ? new Date(input.complianceDeadline)
          : null,
      },
    });

    return this.mapToPreferences(prefs);
  }

  // ==================== STUDY PLANS ====================

  async getStudyPlans(userId: string): Promise<StudyPlan[]> {
    const plans = await prisma.studyPlan.findMany({
      where: { userId },
      include: {
        items: {
          include: {
            tracking: {
              include: {
                course: {
                  include: {
                    provider: true,
                  },
                },
              },
            },
          },
          orderBy: { priority: 'asc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return plans.map((plan) => this.mapToStudyPlan(plan));
  }

  async getStudyPlanById(userId: string, planId: string): Promise<StudyPlan | null> {
    const plan = await prisma.studyPlan.findFirst({
      where: { id: planId, userId },
      include: {
        items: {
          include: {
            tracking: {
              include: {
                course: {
                  include: {
                    provider: true,
                  },
                },
              },
            },
          },
          orderBy: { priority: 'asc' },
        },
      },
    });

    return plan ? this.mapToStudyPlan(plan) : null;
  }

  async createStudyPlan(userId: string, input: CreateStudyPlanInput): Promise<StudyPlan> {
    const plan = await prisma.studyPlan.create({
      data: {
        userId,
        name: input.name,
        targetCredits: input.targetCredits,
        targetDeadline: new Date(input.targetDeadline),
        notes: input.notes,
        status: PrismaPlanStatus.draft,
      },
      include: {
        items: {
          include: {
            tracking: {
              include: {
                course: {
                  include: {
                    provider: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    return this.mapToStudyPlan(plan);
  }

  async updateStudyPlan(
    userId: string,
    planId: string,
    input: UpdateStudyPlanInput
  ): Promise<StudyPlan | null> {
    const existing = await prisma.studyPlan.findFirst({
      where: { id: planId, userId },
    });

    if (!existing) {
      return null;
    }

    const plan = await prisma.studyPlan.update({
      where: { id: planId },
      data: {
        name: input.name,
        targetCredits: input.targetCredits,
        targetDeadline: input.targetDeadline ? new Date(input.targetDeadline) : undefined,
        status: input.status as PrismaPlanStatus | undefined,
        notes: input.notes,
      },
      include: {
        items: {
          include: {
            tracking: {
              include: {
                course: {
                  include: {
                    provider: true,
                  },
                },
              },
            },
          },
          orderBy: { priority: 'asc' },
        },
      },
    });

    return this.mapToStudyPlan(plan);
  }

  async deleteStudyPlan(userId: string, planId: string): Promise<boolean> {
    const existing = await prisma.studyPlan.findFirst({
      where: { id: planId, userId },
    });

    if (!existing) {
      return false;
    }

    await prisma.studyPlan.delete({
      where: { id: planId },
    });

    return true;
  }

  // ==================== PLAN ITEMS ====================

  async addPlanItem(
    userId: string,
    planId: string,
    input: AddPlanItemInput
  ): Promise<StudyPlanItem | null> {
    // Verify plan ownership
    const plan = await prisma.studyPlan.findFirst({
      where: { id: planId, userId },
    });

    if (!plan) {
      return null;
    }

    // Get or create tracking entry (adds to My Courses if not already tracked)
    let tracking = await prisma.userCeuTracking.findUnique({
      where: {
        userId_courseId: {
          userId,
          courseId: input.courseId,
        },
      },
    });

    if (!tracking) {
      // Create tracking entry - this adds to "My Courses"
      tracking = await prisma.userCeuTracking.create({
        data: {
          userId,
          courseId: input.courseId,
          status: 'planned',
        },
      });
    }

    // Check if already in this plan
    const existing = await prisma.studyPlanItem.findUnique({
      where: {
        planId_trackingId: {
          planId,
          trackingId: tracking.id,
        },
      },
    });

    if (existing) {
      return null; // Already in plan
    }

    // Create plan item linked to tracking
    const item = await prisma.studyPlanItem.create({
      data: {
        planId,
        trackingId: tracking.id,
        scheduledDate: input.scheduledDate ? new Date(input.scheduledDate) : null,
        scheduledTime: input.scheduledTime,
        priority: input.priority || 0,
        notes: input.notes,
      },
      include: {
        tracking: {
          include: {
            course: {
              include: {
                provider: true,
              },
            },
          },
        },
      },
    });

    // Update plan estimates
    await this.updatePlanEstimates(planId);

    return this.mapToStudyPlanItem(item);
  }

  async updatePlanItem(
    userId: string,
    planId: string,
    itemId: string,
    input: UpdatePlanItemInput
  ): Promise<StudyPlanItem | null> {
    const plan = await prisma.studyPlan.findFirst({
      where: { id: planId, userId },
    });

    if (!plan) {
      return null;
    }

    const item = await prisma.studyPlanItem.update({
      where: { id: itemId },
      data: {
        scheduledDate: input.scheduledDate ? new Date(input.scheduledDate) : undefined,
        scheduledTime: input.scheduledTime,
        priority: input.priority,
        notes: input.notes,
      },
      include: {
        tracking: {
          include: {
            course: {
              include: {
                provider: true,
              },
            },
          },
        },
      },
    });

    return this.mapToStudyPlanItem(item);
  }

  async removePlanItem(userId: string, planId: string, itemId: string): Promise<boolean> {
    const plan = await prisma.studyPlan.findFirst({
      where: { id: planId, userId },
    });

    if (!plan) {
      return false;
    }

    await prisma.studyPlanItem.delete({
      where: { id: itemId },
    });

    // Update plan estimates
    await this.updatePlanEstimates(planId);

    return true;
  }

  private async updatePlanEstimates(planId: string): Promise<void> {
    const items = await prisma.studyPlanItem.findMany({
      where: { planId },
      include: {
        tracking: {
          include: { course: true },
        },
      },
    });

    let totalCost = 0;
    let totalMinutes = 0;

    for (const item of items) {
      const course = item.tracking.course;
      if (course.price) {
        totalCost += Number(course.price);
      }
      if (course.duration) {
        totalMinutes += course.duration;
      }
    }

    await prisma.studyPlan.update({
      where: { id: planId },
      data: {
        estimatedCost: totalCost,
        estimatedHours: totalMinutes / 60,
      },
    });
  }

  // ==================== RECOMMENDATIONS ====================

  async getRecommendations(userId: string, limit: number = 10): Promise<CourseRecommendation[]> {
    const [user, preferences, trackedCourses] = await Promise.all([
      prisma.user.findUnique({ where: { id: userId } }),
      prisma.userPlanningPreferences.findUnique({ where: { userId } }),
      prisma.userCeuTracking.findMany({
        where: { userId },
        select: { courseId: true },
      }),
    ]);

    // Get compliance info
    const currentYear = new Date().getFullYear();
    const compliance = await prisma.ceuCompliance.findUnique({
      where: { userId_year: { userId, year: currentYear } },
    });

    const creditsNeeded = compliance
      ? Math.max(0, compliance.requiredCredits - compliance.earnedCredits)
      : 0;

    // Exclude already tracked courses
    const excludeIds = new Set(trackedCourses.map((t) => t.courseId));

    // Fetch candidate courses
    const courses = await prisma.ceuCourse.findMany({
      where: {
        id: { notIn: Array.from(excludeIds) },
        provider: { name: { not: 'Manual' } },
      },
      include: { provider: true },
      take: 100,
    });

    // Score each course
    const recommendations: CourseRecommendation[] = courses.map((course) => {
      const { score, reasons } = this.calculateCourseScore(
        course,
        user,
        preferences,
        creditsNeeded
      );

      return {
        course: this.mapToCourse(course),
        score,
        reasons,
      };
    });

    return recommendations
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }

  private calculateCourseScore(
    course: any,
    user: any,
    preferences: any,
    creditsNeeded: number
  ): { score: number; reasons: RecommendationReason[] } {
    let score = 50;
    const reasons: RecommendationReason[] = [];

    if (course.credits && creditsNeeded > 0) {
      const courseCredits = Number(course.credits);
      const creditRatio = Math.min(courseCredits / creditsNeeded, 1);
      score += creditRatio * 20;
      reasons.push('credits_needed');
    }

    if (preferences?.preferredFields?.includes(course.field)) {
      score += 15;
      reasons.push('matches_field');
    }

    if (user?.profession && course.field === user.profession) {
      score += 10;
      reasons.push('matches_profession');
    }

    if (course.price && preferences?.budgetMax) {
      const price = Number(course.price);
      const maxBudget = Number(preferences.budgetMax);
      if (price <= maxBudget) {
        score += price <= maxBudget / 2 ? 10 : 5;
        reasons.push('within_budget');
      }
    }

    if (preferences?.preferredCourseTypes?.includes(course.courseType)) {
      score += 10;
      reasons.push('matches_course_type');
    }

    if (
      (course.courseType === 'live_webinar' || course.courseType === 'in_person') &&
      course.startDate
    ) {
      const daysUntil = Math.floor(
        (new Date(course.startDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
      );
      if (daysUntil >= 0 && daysUntil <= 30) {
        score += 5;
        reasons.push('upcoming_live_event');
      }
    }

    return { score: Math.min(100, Math.max(0, score)), reasons };
  }

  // ==================== GENERATE PLAN ====================

  async generatePlan(userId: string, request: GeneratePlanRequest): Promise<GeneratedPlan> {
    const recommendations = await this.getRecommendations(userId, 50);

    let filtered = recommendations;

    if (request.preferredFields?.length) {
      filtered = filtered.filter(
        (r) => request.preferredFields!.includes(r.course.field as CourseField)
      );
    }

    if (request.preferredCourseTypes?.length) {
      filtered = filtered.filter(
        (r) => request.preferredCourseTypes!.includes(r.course.courseType as CourseType)
      );
    }

    if (request.excludeCourseIds?.length) {
      filtered = filtered.filter((r) => !request.excludeCourseIds!.includes(r.course.id));
    }

    const selected: CourseRecommendation[] = [];
    let totalCredits = 0;
    let totalCost = 0;
    let totalHours = 0;
    const maxBudget = request.maxBudget ?? Infinity;

    for (const rec of filtered) {
      const courseCredits = rec.course.credits ? Number(rec.course.credits) : 0;
      const coursePrice = rec.course.price ? Number(rec.course.price) : 0;
      const courseDuration = rec.course.duration ? Number(rec.course.duration) / 60 : 0;

      if (totalCost + coursePrice > maxBudget) {
        continue;
      }

      selected.push(rec);
      totalCredits += courseCredits;
      totalCost += coursePrice;
      totalHours += courseDuration;

      if (totalCredits >= request.targetCredits) {
        break;
      }
    }

    const deadline = new Date(request.targetDeadline);
    const now = new Date();
    const daysAvailable = Math.floor((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    const coursesPerWeek = Math.max(1, Math.ceil(selected.length / (daysAvailable / 7)));

    const scheduledDates: Date[] = [];
    let currentDate = new Date(now);
    for (let i = 0; i < selected.length; i++) {
      scheduledDates.push(new Date(currentDate));
      currentDate.setDate(currentDate.getDate() + Math.floor(7 / coursesPerWeek));
    }

    const warnings: GeneratedPlan['warnings'] = [];

    if (totalCredits < request.targetCredits) {
      warnings.push({
        type: 'credits_short',
        message: `Selected courses provide ${totalCredits.toFixed(1)} credits, but you need ${request.targetCredits}`,
      });
    }

    if (request.maxBudget && totalCost > request.maxBudget) {
      warnings.push({
        type: 'budget_exceeded',
        message: `Total cost $${totalCost.toFixed(2)} exceeds budget of $${request.maxBudget.toFixed(2)}`,
      });
    }

    if (daysAvailable < selected.length * 2) {
      warnings.push({
        type: 'deadline_tight',
        message: `You have ${daysAvailable} days to complete ${selected.length} courses`,
      });
    }

    return {
      courses: selected,
      totalCredits,
      totalCost,
      totalHours,
      scheduledDates,
      warnings,
    };
  }

  // ==================== ANALYTICS ====================

  async getAnalytics(userId: string): Promise<PlannerAnalytics> {
    const currentYear = new Date().getFullYear();

    const completedTracking = await prisma.userCeuTracking.findMany({
      where: { userId, status: 'completed' },
      include: { course: true },
    });

    const totalCreditsEarned = completedTracking.reduce((sum, t) => {
      return sum + (t.creditsEarned || 0);
    }, 0);

    const history = await prisma.courseCompletionHistory.findMany({
      where: { userId },
    });

    const ratings = history.filter((h) => h.rating).map((h) => h.rating!);
    const difficulties = history.filter((h) => h.difficultyRating).map((h) => h.difficultyRating!);

    const averageRating = ratings.length > 0
      ? ratings.reduce((a, b) => a + b, 0) / ratings.length
      : undefined;
    const averageDifficulty = difficulties.length > 0
      ? difficulties.reduce((a, b) => a + b, 0) / difficulties.length
      : undefined;

    const fieldCounts: Record<string, number> = {};
    for (const t of completedTracking) {
      const field = t.course.field;
      fieldCounts[field] = (fieldCounts[field] || 0) + 1;
    }
    const mostStudiedFields = Object.entries(fieldCounts)
      .map(([field, count]) => ({ field: field as CourseField, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    const monthlyProgress: { month: string; credits: number }[] = [];
    for (let month = 0; month < 12; month++) {
      const monthStart = new Date(currentYear, month, 1);
      const monthEnd = new Date(currentYear, month + 1, 0);

      const monthCredits = completedTracking
        .filter((t) => {
          if (!t.completedDate) return false;
          const date = new Date(t.completedDate);
          return date >= monthStart && date <= monthEnd;
        })
        .reduce((sum, t) => sum + (t.creditsEarned || 0), 0);

      monthlyProgress.push({
        month: monthStart.toLocaleString('default', { month: 'short' }),
        credits: monthCredits,
      });
    }

    // Get active plans with incomplete items
    const activePlans = await prisma.studyPlan.findMany({
      where: { userId, status: 'active' },
      include: {
        items: {
          include: {
            tracking: {
              include: { course: true },
            },
          },
        },
      },
    });

    const upcomingDeadlines = activePlans.map((plan) => {
      const incompleteItems = plan.items.filter(
        (item) => item.tracking.status !== 'completed'
      );
      const creditsRemaining = incompleteItems.reduce((sum, item) => {
        return sum + (item.tracking.course.credits ? Number(item.tracking.course.credits) : 0);
      }, 0);

      return {
        planId: plan.id,
        planName: plan.name,
        deadline: plan.targetDeadline,
        creditsRemaining,
      };
    });

    return {
      totalCreditsEarned,
      totalCoursesCompleted: completedTracking.length,
      averageRating,
      averageDifficulty,
      mostStudiedFields,
      monthlyProgress,
      upcomingDeadlines,
    };
  }

  // ==================== MAPPERS ====================

  private mapToPreferences(prefs: any): UserPlanningPreferences {
    return {
      id: prefs.id,
      userId: prefs.userId,
      budgetMin: prefs.budgetMin ? Number(prefs.budgetMin) : null,
      budgetMax: prefs.budgetMax ? Number(prefs.budgetMax) : null,
      preferredFields: prefs.preferredFields as CourseField[],
      preferredCourseTypes: prefs.preferredCourseTypes as CourseType[],
      availableDaysPerWeek: prefs.availableDaysPerWeek,
      hoursPerSession: prefs.hoursPerSession ? Number(prefs.hoursPerSession) : null,
      preferredTimeSlots: prefs.preferredTimeSlots,
      complianceDeadline: prefs.complianceDeadline,
      createdAt: prefs.createdAt,
      updatedAt: prefs.updatedAt,
    };
  }

  private mapToStudyPlan(plan: any): StudyPlan {
    return {
      id: plan.id,
      userId: plan.userId,
      name: plan.name,
      targetCredits: Number(plan.targetCredits),
      targetDeadline: plan.targetDeadline,
      status: plan.status,
      estimatedCost: plan.estimatedCost ? Number(plan.estimatedCost) : null,
      estimatedHours: plan.estimatedHours ? Number(plan.estimatedHours) : null,
      notes: plan.notes,
      items: plan.items?.map((item: any) => this.mapToStudyPlanItem(item)) || [],
      createdAt: plan.createdAt,
      updatedAt: plan.updatedAt,
    };
  }

  private mapToStudyPlanItem(item: any): StudyPlanItem {
    return {
      id: item.id,
      planId: item.planId,
      trackingId: item.trackingId,
      scheduledDate: item.scheduledDate,
      scheduledTime: item.scheduledTime,
      priority: item.priority,
      notes: item.notes,
      tracking: item.tracking ? this.mapToTracking(item.tracking) : undefined,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    };
  }

  private mapToTracking(tracking: any): UserCeuTracking {
    return {
      id: tracking.id,
      userId: tracking.userId,
      courseId: tracking.courseId,
      completedDate: tracking.completedDate,
      creditsEarned: tracking.creditsEarned,
      status: tracking.status,
      progressPercent: tracking.progressPercent ?? 0,
      notes: tracking.notes,
      course: tracking.course ? this.mapToCourse(tracking.course) : undefined,
      createdAt: tracking.createdAt,
      updatedAt: tracking.updatedAt,
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
      price: course.price ? Number(course.price) : null,
      originalPrice: course.originalPrice ? Number(course.originalPrice) : null,
      priceString: course.priceString,
      credits: course.credits ? Number(course.credits) : null,
      creditsString: course.creditsString,
      duration: course.duration,
      durationString: course.durationString,
      category: course.category,
      field: course.field as CourseField,
      date: course.date,
      imageUrl: course.imageUrl,
      courseType: course.courseType as CourseType,
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

export const plannerService = new PlannerService();
