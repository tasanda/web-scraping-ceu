import { Request, Response } from 'express';
import { courseService } from '../services/courseService';
import { CourseFilters, ApiResponse, Course, PaginatedCourses } from '@ceu/types';

export const getCourses = async (req: Request, res: Response): Promise<void> => {
  try {
    const filters: CourseFilters = {
      field: req.query.field as any,
      category: req.query.category as string,
      search: req.query.search as string,
      dateFrom: req.query.dateFrom as string,
      dateTo: req.query.dateTo as string,
    };

    if (req.query.minPrice) {
      filters.minPrice = parseInt(req.query.minPrice as string);
    }
    if (req.query.maxPrice) {
      filters.maxPrice = parseInt(req.query.maxPrice as string);
    }

    const page = parseInt(req.query.page as string) || 1;
    const pageSize = parseInt(req.query.pageSize as string) || 20;

    const result = await courseService.getCourses(filters, page, pageSize);

    const response: ApiResponse<PaginatedCourses> = {
      success: true,
      data: result,
    };

    res.json(response);
  } catch (error) {
    console.error('Error fetching courses:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch courses',
    });
  }
};

export const getCourseById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const course = await courseService.getCourseById(id);

    if (!course) {
      res.status(404).json({
        success: false,
        error: 'Course not found',
      });
      return;
    }

    const response: ApiResponse<Course> = {
      success: true,
      data: course,
    };

    res.json(response);
  } catch (error) {
    console.error('Error fetching course:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch course',
    });
  }
};
