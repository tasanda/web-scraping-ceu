import { prisma } from '../lib/prisma';
import { Course, CourseFilters, PaginatedCourses } from '@ceu/types';
import { Prisma } from '@prisma/client';

export class CourseService {
  async getCourses(
    filters: CourseFilters = {},
    page: number = 1,
    pageSize: number = 20
  ): Promise<PaginatedCourses> {
    const skip = (page - 1) * pageSize;

    const where: Prisma.CeuCourseWhereInput = {};

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

  private mapToCourse(course: any): Course {
    return {
      id: course.id,
      providerId: course.providerId,
      title: course.title,
      url: course.url,
      description: course.description,
      instructors: course.instructors,
      price: course.price,
      originalPrice: course.originalPrice,
      credits: course.credits,
      duration: course.duration,
      category: course.category,
      field: course.field,
      date: course.date,
      imageUrl: course.imageUrl,
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

export const courseService = new CourseService();
