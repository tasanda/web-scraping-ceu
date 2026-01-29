import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { plannerService } from '../services/plannerService';
import {
  ApiResponse,
  UserPlanningPreferences,
  StudyPlan,
  StudyPlanItem,
  CourseRecommendation,
  GeneratedPlan,
  PlannerAnalytics,
  UpdatePreferencesInput,
  CreateStudyPlanInput,
  UpdateStudyPlanInput,
  AddPlanItemInput,
  UpdatePlanItemInput,
  GeneratePlanRequest,
} from '@ceu/types';

// ==================== PREFERENCES ====================

export const getPreferences = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.userId!;
    const preferences = await plannerService.getPreferences(userId);

    const response: ApiResponse<UserPlanningPreferences | null> = {
      success: true,
      data: preferences,
    };

    res.json(response);
  } catch (error) {
    console.error('Error fetching preferences:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch preferences',
    });
  }
};

export const updatePreferences = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.userId!;
    const input: UpdatePreferencesInput = req.body;

    const preferences = await plannerService.updatePreferences(userId, input);

    const response: ApiResponse<UserPlanningPreferences> = {
      success: true,
      data: preferences,
    };

    res.json(response);
  } catch (error) {
    console.error('Error updating preferences:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update preferences',
    });
  }
};

// ==================== STUDY PLANS ====================

export const getStudyPlans = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.userId!;
    const plans = await plannerService.getStudyPlans(userId);

    const response: ApiResponse<StudyPlan[]> = {
      success: true,
      data: plans,
    };

    res.json(response);
  } catch (error) {
    console.error('Error fetching study plans:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch study plans',
    });
  }
};

export const getStudyPlan = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.userId!;
    const { id } = req.params;

    const plan = await plannerService.getStudyPlanById(userId, id);

    if (!plan) {
      res.status(404).json({
        success: false,
        error: 'Study plan not found',
      });
      return;
    }

    const response: ApiResponse<StudyPlan> = {
      success: true,
      data: plan,
    };

    res.json(response);
  } catch (error) {
    console.error('Error fetching study plan:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch study plan',
    });
  }
};

export const createStudyPlan = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.userId!;
    const input: CreateStudyPlanInput = req.body;

    if (!input.name || !input.targetCredits || !input.targetDeadline) {
      res.status(400).json({
        success: false,
        error: 'Name, targetCredits, and targetDeadline are required',
      });
      return;
    }

    const plan = await plannerService.createStudyPlan(userId, input);

    const response: ApiResponse<StudyPlan> = {
      success: true,
      data: plan,
    };

    res.status(201).json(response);
  } catch (error) {
    console.error('Error creating study plan:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create study plan',
    });
  }
};

export const updateStudyPlan = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.userId!;
    const { id } = req.params;
    const input: UpdateStudyPlanInput = req.body;

    const plan = await plannerService.updateStudyPlan(userId, id, input);

    if (!plan) {
      res.status(404).json({
        success: false,
        error: 'Study plan not found',
      });
      return;
    }

    const response: ApiResponse<StudyPlan> = {
      success: true,
      data: plan,
    };

    res.json(response);
  } catch (error) {
    console.error('Error updating study plan:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update study plan',
    });
  }
};

export const deleteStudyPlan = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.userId!;
    const { id } = req.params;

    const deleted = await plannerService.deleteStudyPlan(userId, id);

    if (!deleted) {
      res.status(404).json({
        success: false,
        error: 'Study plan not found',
      });
      return;
    }

    res.json({
      success: true,
    });
  } catch (error) {
    console.error('Error deleting study plan:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete study plan',
    });
  }
};

// ==================== PLAN ITEMS ====================

export const addPlanItem = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.userId!;
    const { id: planId } = req.params;
    const input: AddPlanItemInput = req.body;

    if (!input.courseId) {
      res.status(400).json({
        success: false,
        error: 'courseId is required',
      });
      return;
    }

    const item = await plannerService.addPlanItem(userId, planId, input);

    if (!item) {
      res.status(404).json({
        success: false,
        error: 'Study plan not found or course already in plan',
      });
      return;
    }

    const response: ApiResponse<StudyPlanItem> = {
      success: true,
      data: item,
    };

    res.status(201).json(response);
  } catch (error) {
    console.error('Error adding plan item:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to add plan item',
    });
  }
};

export const updatePlanItem = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.userId!;
    const { id: planId, itemId } = req.params;
    const input: UpdatePlanItemInput = req.body;

    const item = await plannerService.updatePlanItem(userId, planId, itemId, input);

    if (!item) {
      res.status(404).json({
        success: false,
        error: 'Plan item not found',
      });
      return;
    }

    const response: ApiResponse<StudyPlanItem> = {
      success: true,
      data: item,
    };

    res.json(response);
  } catch (error) {
    console.error('Error updating plan item:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update plan item',
    });
  }
};

export const removePlanItem = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.userId!;
    const { id: planId, itemId } = req.params;

    const removed = await plannerService.removePlanItem(userId, planId, itemId);

    if (!removed) {
      res.status(404).json({
        success: false,
        error: 'Plan item not found',
      });
      return;
    }

    res.json({
      success: true,
    });
  } catch (error) {
    console.error('Error removing plan item:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to remove plan item',
    });
  }
};

// ==================== RECOMMENDATIONS & GENERATION ====================

export const getRecommendations = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.userId!;
    const limit = parseInt(req.query.limit as string) || 10;

    const recommendations = await plannerService.getRecommendations(userId, limit);

    const response: ApiResponse<CourseRecommendation[]> = {
      success: true,
      data: recommendations,
    };

    res.json(response);
  } catch (error) {
    console.error('Error fetching recommendations:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch recommendations',
    });
  }
};

export const generatePlan = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.userId!;
    const request: GeneratePlanRequest = req.body;

    if (!request.targetCredits || !request.targetDeadline) {
      res.status(400).json({
        success: false,
        error: 'targetCredits and targetDeadline are required',
      });
      return;
    }

    const plan = await plannerService.generatePlan(userId, request);

    const response: ApiResponse<GeneratedPlan> = {
      success: true,
      data: plan,
    };

    res.json(response);
  } catch (error) {
    console.error('Error generating plan:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate plan',
    });
  }
};

// ==================== ANALYTICS ====================

export const getAnalytics = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.userId!;
    const analytics = await plannerService.getAnalytics(userId);

    const response: ApiResponse<PlannerAnalytics> = {
      success: true,
      data: analytics,
    };

    res.json(response);
  } catch (error) {
    console.error('Error fetching analytics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch analytics',
    });
  }
};
