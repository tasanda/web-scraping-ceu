import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import {
  getCourseReviews,
  getUserReview,
  createReview,
  updateReview,
  deleteReview,
  markHelpful,
} from '../controllers/reviewController';

const router = Router();

// Public routes (auth optional for showing helpful votes)
router.get('/course/:courseId', getCourseReviews);

// Protected routes
router.get('/course/:courseId/mine', authenticate, getUserReview);
router.post('/', authenticate, createReview);
router.put('/:id', authenticate, updateReview);
router.delete('/:id', authenticate, deleteReview);
router.post('/:id/helpful', authenticate, markHelpful);

export { router as reviewRoutes };
