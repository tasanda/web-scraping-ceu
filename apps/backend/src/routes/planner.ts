import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import {
  getPreferences,
  updatePreferences,
  getStudyPlans,
  getStudyPlan,
  createStudyPlan,
  updateStudyPlan,
  deleteStudyPlan,
  addPlanItem,
  updatePlanItem,
  removePlanItem,
  getRecommendations,
  generatePlan,
  getAnalytics,
} from '../controllers/plannerController';

export const plannerRoutes = Router();

// All planner routes require authentication
plannerRoutes.use(authenticate);

// Preferences
plannerRoutes.get('/preferences', getPreferences);
plannerRoutes.put('/preferences', updatePreferences);

// Study Plans
plannerRoutes.get('/plans', getStudyPlans);
plannerRoutes.get('/plans/:id', getStudyPlan);
plannerRoutes.post('/plans', createStudyPlan);
plannerRoutes.put('/plans/:id', updateStudyPlan);
plannerRoutes.delete('/plans/:id', deleteStudyPlan);

// Plan Items
plannerRoutes.post('/plans/:id/items', addPlanItem);
plannerRoutes.put('/plans/:id/items/:itemId', updatePlanItem);
plannerRoutes.delete('/plans/:id/items/:itemId', removePlanItem);

// Recommendations & Generation
plannerRoutes.get('/recommendations', getRecommendations);
plannerRoutes.post('/generate', generatePlan);

// Analytics
plannerRoutes.get('/analytics', getAnalytics);
