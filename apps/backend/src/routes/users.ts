import { Router } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth';
import { Response } from 'express';
import { prisma } from '../lib/prisma';
import { ApiResponse, User, UpdateUserInput } from '@ceu/types';
import { complianceService } from '../services/complianceService';

export const userRoutes = Router();

userRoutes.get('/me', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.userId!;

    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      res.status(404).json({
        success: false,
        error: 'User not found',
      });
      return;
    }

    const response: ApiResponse<User> = {
      success: true,
      data: {
        id: user.id,
        email: user.email,
        clerkId: user.clerkId,
        profession: user.profession,
        licenseNumber: user.licenseNumber,
        annualCeuRequirement: user.annualCeuRequirement,
        createdAt: user.createdAt,
      },
    };

    res.json(response);
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch user',
    });
  }
});

userRoutes.put('/me', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.userId!;
    const input: UpdateUserInput = req.body;

    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        profession: input.profession,
        licenseNumber: input.licenseNumber,
        annualCeuRequirement: input.annualCeuRequirement,
      },
    });

    // If annualCeuRequirement changed, update compliance record
    if (input.annualCeuRequirement !== undefined) {
      const year = new Date().getFullYear();
      // Update the compliance record's requiredCredits and recalculate status
      const existingCompliance = await prisma.ceuCompliance.findUnique({
        where: {
          userId_year: { userId, year },
        },
      });

      if (existingCompliance) {
        // Update requiredCredits and recalculate status
        const earnedCredits = existingCompliance.earnedCredits;
        const requiredCredits = input.annualCeuRequirement;
        let complianceStatus: 'compliant' | 'non_compliant' | 'in_progress';

        if (earnedCredits >= requiredCredits) {
          complianceStatus = 'compliant';
        } else if (earnedCredits > 0) {
          complianceStatus = 'in_progress';
        } else {
          complianceStatus = 'non_compliant';
        }

        await prisma.ceuCompliance.update({
          where: {
            userId_year: { userId, year },
          },
          data: {
            requiredCredits,
            complianceStatus,
          },
        });
      } else {
        // Create new compliance record
        await complianceService.updateCompliance(userId, year);
      }
    }

    const response: ApiResponse<User> = {
      success: true,
      data: {
        id: user.id,
        email: user.email,
        clerkId: user.clerkId,
        profession: user.profession,
        licenseNumber: user.licenseNumber,
        annualCeuRequirement: user.annualCeuRequirement,
        createdAt: user.createdAt,
      },
    };

    res.json(response);
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update user',
    });
  }
});
