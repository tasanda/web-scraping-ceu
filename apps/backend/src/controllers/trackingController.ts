import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { prisma } from '../lib/prisma';
import { complianceService } from '../services/complianceService';
import { ApiResponse, CreateTrackingInput, UpdateTrackingInput, UserCeuTracking } from '@ceu/types';
import { CourseStatus } from '@prisma/client';

export const getTracking = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.userId!;
    const status = req.query.status as CourseStatus | undefined;

    const where: any = { userId };
    if (status) {
      where.status = status;
    }

    const tracking = await prisma.userCeuTracking.findMany({
      where,
      include: {
        course: {
          include: {
            provider: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    const response: ApiResponse<UserCeuTracking[]> = {
      success: true,
      data: tracking.map(mapToTracking),
    };

    res.json(response);
  } catch (error) {
    console.error('Error fetching tracking:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch tracking',
    });
  }
};

export const createTracking = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.userId!;
    const input: CreateTrackingInput = req.body;

    // Verify course exists
    const course = await prisma.ceuCourse.findUnique({
      where: { id: input.courseId },
    });

    if (!course) {
      res.status(404).json({
        success: false,
        error: 'Course not found',
      });
      return;
    }

    // Check if already tracking
    const existing = await prisma.userCeuTracking.findUnique({
      where: {
        userId_courseId: {
          userId,
          courseId: input.courseId,
        },
      },
    });

    if (existing) {
      res.status(409).json({
        success: false,
        error: 'Course is already being tracked',
      });
      return;
    }

    const tracking = await prisma.userCeuTracking.create({
      data: {
        userId,
        courseId: input.courseId,
        status: input.status || 'planned',
        notes: input.notes,
      },
      include: {
        course: {
          include: {
            provider: true,
          },
        },
      },
    });

    const response: ApiResponse<UserCeuTracking> = {
      success: true,
      data: mapToTracking(tracking),
    };

    res.status(201).json(response);
  } catch (error) {
    console.error('Error creating tracking:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create tracking',
    });
  }
};

export const updateTracking = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.userId!;
    const { id } = req.params;
    const input: UpdateTrackingInput = req.body;

    // Verify ownership
    const existing = await prisma.userCeuTracking.findFirst({
      where: {
        id,
        userId,
      },
    });

    if (!existing) {
      res.status(404).json({
        success: false,
        error: 'Tracking not found',
      });
      return;
    }

    const updateData: any = {};
    if (input.status !== undefined) updateData.status = input.status;
    if (input.completedDate !== undefined) updateData.completedDate = input.completedDate;
    if (input.creditsEarned !== undefined) updateData.creditsEarned = input.creditsEarned;
    if (input.progressPercent !== undefined) updateData.progressPercent = input.progressPercent;
    if (input.notes !== undefined) updateData.notes = input.notes;

    // If marking as completed, set completed date and progress to 100%
    if (input.status === 'completed') {
      if (!input.completedDate) {
        updateData.completedDate = new Date();
      }
      updateData.progressPercent = 100;
    }

    // If moving back to planned, reset progress to 0
    if (input.status === 'planned') {
      updateData.progressPercent = 0;
    }

    const tracking = await prisma.userCeuTracking.update({
      where: { id },
      data: updateData,
      include: {
        course: {
          include: {
            provider: true,
          },
        },
      },
    });

    // Update compliance if status changed to or from completed
    const wasCompleted = existing.status === 'completed';
    const isNowCompleted = input.status === 'completed';
    const statusChanged = input.status !== undefined && input.status !== existing.status;

    if (statusChanged && (wasCompleted || isNowCompleted)) {
      // Use the completedDate year if available, otherwise use current year
      const year = existing.completedDate
        ? new Date(existing.completedDate).getFullYear()
        : new Date().getFullYear();
      await complianceService.updateCompliance(userId, year);
    }

    const response: ApiResponse<UserCeuTracking> = {
      success: true,
      data: mapToTracking(tracking),
    };

    res.json(response);
  } catch (error) {
    console.error('Error updating tracking:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update tracking',
    });
  }
};

export const deleteTracking = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.userId!;
    const { id } = req.params;

    // Verify ownership
    const existing = await prisma.userCeuTracking.findFirst({
      where: {
        id,
        userId,
      },
    });

    if (!existing) {
      res.status(404).json({
        success: false,
        error: 'Tracking not found',
      });
      return;
    }

    await prisma.userCeuTracking.delete({
      where: { id },
    });

    // Update compliance if the deleted course was completed
    if (existing.status === 'completed' && existing.completedDate) {
      const year = new Date(existing.completedDate).getFullYear();
      await complianceService.updateCompliance(userId, year);
    }

    res.json({
      success: true,
    });
  } catch (error) {
    console.error('Error deleting tracking:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete tracking',
    });
  }
};

function mapToTracking(tracking: any): UserCeuTracking {
  return {
    id: tracking.id,
    userId: tracking.userId,
    courseId: tracking.courseId,
    completedDate: tracking.completedDate,
    creditsEarned: tracking.creditsEarned,
    status: tracking.status,
    progressPercent: tracking.progressPercent ?? 0,
    notes: tracking.notes,
    course: tracking.course
      ? {
          id: tracking.course.id,
          providerId: tracking.course.providerId,
          title: tracking.course.title,
          url: tracking.course.url,
          description: tracking.course.description,
          instructors: tracking.course.instructors,
          price: tracking.course.price,
          originalPrice: tracking.course.originalPrice,
          credits: tracking.course.credits,
          duration: tracking.course.duration,
          category: tracking.course.category,
          field: tracking.course.field,
          date: tracking.course.date,
          imageUrl: tracking.course.imageUrl,
          scrapedAt: tracking.course.scrapedAt,
        }
      : undefined,
    createdAt: tracking.createdAt,
    updatedAt: tracking.updatedAt,
  };
}
