import { Router } from 'express';
import { authenticate, requireAdmin } from '../middleware/auth';
import {
  getStats,
  getUsers,
  getCourses,
  updateCourse,
  deleteCourse,
  getProviders,
  createProvider,
  updateProvider,
  deleteProvider,
  updateCompliance,
  getManualCourses,
} from '../controllers/adminController';

const router = Router();

// All admin routes require authentication and admin role
router.use(authenticate);
router.use(requireAdmin);

// Dashboard
router.get('/stats', getStats);

// Users
router.get('/users', getUsers);

// Courses
router.get('/courses', getCourses);
router.put('/courses/:id', updateCourse);
router.delete('/courses/:id', deleteCourse);

// Manual courses for review
router.get('/courses/manual', getManualCourses);

// Providers
router.get('/providers', getProviders);
router.post('/providers', createProvider);
router.put('/providers/:id', updateProvider);
router.delete('/providers/:id', deleteProvider);

// Compliance
router.put('/compliance/:userId/:year', updateCompliance);

export { router as adminRoutes };
