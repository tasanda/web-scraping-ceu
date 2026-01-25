import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { getTracking, createTracking, updateTracking } from '../controllers/trackingController';
import { complianceService } from '../services/complianceService';
import { AuthRequest } from '../middleware/auth';
import { Response } from 'express';
import { ApiResponse, ComplianceSummary } from '@ceu/types';

export const trackingRoutes = Router();

// All tracking routes require authentication
trackingRoutes.use(authenticate);

trackingRoutes.get('/', getTracking);
trackingRoutes.post('/', createTracking);
trackingRoutes.put('/:id', updateTracking);

trackingRoutes.get('/compliance', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.userId!;
    const year = parseInt(req.query.year as string) || new Date().getFullYear();

    const compliance = await complianceService.getComplianceForUser(userId, year);

    if (!compliance) {
      res.status(404).json({
        success: false,
        error: 'Compliance data not found',
      });
      return;
    }

    const response: ApiResponse<ComplianceSummary> = {
      success: true,
      data: compliance,
    };

    res.json(response);
  } catch (error) {
    console.error('Error fetching compliance:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch compliance',
    });
  }
});
