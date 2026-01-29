import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { reviewService } from '../services/reviewService';

// Get reviews for a course (public, but shows helpful votes for authenticated users)
export const getCourseReviews = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { courseId } = req.params;
    const page = parseInt(req.query.page as string) || 1;
    const pageSize = parseInt(req.query.pageSize as string) || 10;

    const result = await reviewService.getCourseReviews(
      courseId,
      page,
      pageSize,
      req.userId // May be undefined for unauthenticated requests
    );

    res.json({ success: true, data: result });
  } catch (error) {
    console.error('Error getting course reviews:', error);
    res.status(500).json({ success: false, error: 'Failed to get reviews' });
  }
};

// Get user's review for a course
export const getUserReview = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.userId) {
      res.status(401).json({ success: false, error: 'Unauthorized' });
      return;
    }

    const { courseId } = req.params;
    const review = await reviewService.getUserReview(req.userId, courseId);

    res.json({ success: true, data: review });
  } catch (error) {
    console.error('Error getting user review:', error);
    res.status(500).json({ success: false, error: 'Failed to get review' });
  }
};

// Create a review
export const createReview = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.userId) {
      res.status(401).json({ success: false, error: 'Unauthorized' });
      return;
    }

    const review = await reviewService.createReview(req.userId, req.body);

    if (!review) {
      res.status(400).json({ success: false, error: 'You have already reviewed this course' });
      return;
    }

    res.status(201).json({ success: true, data: review });
  } catch (error) {
    console.error('Error creating review:', error);
    res.status(500).json({ success: false, error: 'Failed to create review' });
  }
};

// Update a review
export const updateReview = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.userId) {
      res.status(401).json({ success: false, error: 'Unauthorized' });
      return;
    }

    const { id } = req.params;
    const review = await reviewService.updateReview(req.userId, id, req.body);

    if (!review) {
      res.status(404).json({ success: false, error: 'Review not found or not authorized' });
      return;
    }

    res.json({ success: true, data: review });
  } catch (error) {
    console.error('Error updating review:', error);
    res.status(500).json({ success: false, error: 'Failed to update review' });
  }
};

// Delete a review
export const deleteReview = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.userId) {
      res.status(401).json({ success: false, error: 'Unauthorized' });
      return;
    }

    const { id } = req.params;
    const success = await reviewService.deleteReview(req.userId, id);

    if (!success) {
      res.status(404).json({ success: false, error: 'Review not found or not authorized' });
      return;
    }

    res.json({ success: true, message: 'Review deleted' });
  } catch (error) {
    console.error('Error deleting review:', error);
    res.status(500).json({ success: false, error: 'Failed to delete review' });
  }
};

// Mark review as helpful (toggle)
export const markHelpful = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.userId) {
      res.status(401).json({ success: false, error: 'Unauthorized' });
      return;
    }

    const { id } = req.params;
    const added = await reviewService.markHelpful(req.userId, id);

    res.json({
      success: true,
      data: { helpful: added },
      message: added ? 'Marked as helpful' : 'Removed helpful vote',
    });
  } catch (error) {
    console.error('Error marking review helpful:', error);
    res.status(500).json({ success: false, error: 'Failed to update helpful vote' });
  }
};
