import { prisma } from '../lib/prisma';
import { Course, CourseFilters, PaginatedCourses, CreateCourseInput } from '@ceu/types';
import { Prisma, CourseField } from '@prisma/client';

export class CourseService {
  async getCourses(
    filters: CourseFilters = {},
    page: number = 1,
    pageSize: number = 20
  ): Promise<PaginatedCourses> {
    const skip = (page - 1) * pageSize;

    const where: Prisma.CeuCourseWhereInput = {
      // Exclude manually added courses from discover page
      provider: {
        name: { not: 'Manual' },
      },
    };

    if (filters.field) {
      where.field = filters.field;
    }

    if (filters.category) {
      where.category = {
        contains: filters.category,
        mode: 'insensitive',
      };
    }

    if (filters.search) {
      where.OR = [
        { title: { contains: filters.search, mode: 'insensitive' } },
        { description: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    if (filters.dateFrom || filters.dateTo) {
      where.date = {};
      if (filters.dateFrom) {
        where.date.gte = filters.dateFrom;
      }
      if (filters.dateTo) {
        where.date.lte = filters.dateTo;
      }
    }

    if (filters.minPrice || filters.maxPrice) {
      // Note: Price is stored as string, might need conversion
      // This is a simplified version
    }

    const [courses, total] = await Promise.all([
      prisma.ceuCourse.findMany({
        where,
        skip,
        take: pageSize,
        include: {
          provider: true,
        },
        orderBy: {
          scrapedAt: 'desc',
        },
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

  async getCourseById(id: string): Promise<Course | null> {
    const course = await prisma.ceuCourse.findUnique({
      where: { id },
      include: {
        provider: true,
      },
    });

    return course ? this.mapToCourse(course) : null;
  }

  async createCourse(input: CreateCourseInput): Promise<Course> {
    // Get or create "Manual" provider for user-added courses
    let manualProvider = await prisma.ceuProvider.findFirst({
      where: { name: 'Manual' },
    });

    if (!manualProvider) {
      manualProvider = await prisma.ceuProvider.create({
        data: {
          name: 'Manual',
          baseUrl: 'manual://user-added',
          active: true,
        },
      });
    }

    // Generate a unique URL for manual courses
    const uniqueUrl = input.url || `manual://course-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Parse string inputs to appropriate types
    const credits = input.credits ? parseFloat(input.credits) : null;
    const duration = input.duration ? parseInt(input.duration, 10) : null;
    const price = input.price ? parseFloat(input.price) : null;

    const course = await prisma.ceuCourse.create({
      data: {
        providerId: manualProvider.id,
        title: input.title,
        url: uniqueUrl,
        field: input.field as CourseField,
        credits: credits && !isNaN(credits) ? credits : null,
        creditsString: input.credits,
        description: input.description,
        instructors: input.instructors,
        duration: duration && !isNaN(duration) ? duration : null,
        durationString: input.duration,
        category: input.category,
        price: price && !isNaN(price) ? price : null,
        priceString: input.price,
      },
      include: {
        provider: true,
      },
    });

    return this.mapToCourse(course);
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
      avgRating: course.avgRating ? parseFloat(course.avgRating.toString()) : null,
      reviewCount: course.reviewCount ?? 0,
    };
  }
}

export const courseService = new CourseService();
