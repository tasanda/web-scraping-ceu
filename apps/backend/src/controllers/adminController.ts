import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { adminService } from '../services/adminService';

// Dashboard
export const getStats = async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    const stats = await adminService.getStats();
    res.json({ success: true, data: stats });
  } catch (error) {
    console.error('Error getting admin stats:', error);
    res.status(500).json({ success: false, error: 'Failed to get stats' });
  }
};

// Users
export const getUsers = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const pageSize = parseInt(req.query.pageSize as string) || 20;
    const search = req.query.search as string | undefined;

    const result = await adminService.getUsers(page, pageSize, search);
    res.json({ success: true, data: result });
  } catch (error) {
    console.error('Error getting users:', error);
    res.status(500).json({ success: false, error: 'Failed to get users' });
  }
};

// Courses
export const getCourses = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const pageSize = parseInt(req.query.pageSize as string) || 20;
    const search = req.query.search as string | undefined;
    const providerId = req.query.providerId as string | undefined;
    const manualOnly = req.query.manualOnly === 'true';

    const result = await adminService.getCourses(page, pageSize, search, providerId, manualOnly);
    res.json({ success: true, data: result });
  } catch (error) {
    console.error('Error getting courses:', error);
    res.status(500).json({ success: false, error: 'Failed to get courses' });
  }
};

export const updateCourse = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const course = await adminService.updateCourse(id, req.body);

    if (!course) {
      res.status(404).json({ success: false, error: 'Course not found' });
      return;
    }

    res.json({ success: true, data: course });
  } catch (error) {
    console.error('Error updating course:', error);
    res.status(500).json({ success: false, error: 'Failed to update course' });
  }
};

export const deleteCourse = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const success = await adminService.deleteCourse(id);

    if (!success) {
      res.status(404).json({ success: false, error: 'Course not found or could not be deleted' });
      return;
    }

    res.json({ success: true, message: 'Course deleted' });
  } catch (error) {
    console.error('Error deleting course:', error);
    res.status(500).json({ success: false, error: 'Failed to delete course' });
  }
};

// Providers
export const getProviders = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const pageSize = parseInt(req.query.pageSize as string) || 20;

    const result = await adminService.getProviders(page, pageSize);
    res.json({ success: true, data: result });
  } catch (error) {
    console.error('Error getting providers:', error);
    res.status(500).json({ success: false, error: 'Failed to get providers' });
  }
};

export const createProvider = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const provider = await adminService.createProvider(req.body);
    res.status(201).json({ success: true, data: provider });
  } catch (error) {
    console.error('Error creating provider:', error);
    res.status(500).json({ success: false, error: 'Failed to create provider' });
  }
};

export const updateProvider = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const provider = await adminService.updateProvider(id, req.body);

    if (!provider) {
      res.status(404).json({ success: false, error: 'Provider not found' });
      return;
    }

    res.json({ success: true, data: provider });
  } catch (error) {
    console.error('Error updating provider:', error);
    res.status(500).json({ success: false, error: 'Failed to update provider' });
  }
};

export const deleteProvider = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const success = await adminService.deleteProvider(id);

    if (!success) {
      res.status(400).json({
        success: false,
        error: 'Provider not found or has associated courses',
      });
      return;
    }

    res.json({ success: true, message: 'Provider deleted' });
  } catch (error) {
    console.error('Error deleting provider:', error);
    res.status(500).json({ success: false, error: 'Failed to delete provider' });
  }
};

// Compliance
export const updateCompliance = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { userId, year } = req.params;
    const compliance = await adminService.updateCompliance(userId, parseInt(year), req.body);

    if (!compliance) {
      res.status(404).json({ success: false, error: 'Failed to update compliance' });
      return;
    }

    res.json({ success: true, data: compliance });
  } catch (error) {
    console.error('Error updating compliance:', error);
    res.status(500).json({ success: false, error: 'Failed to update compliance' });
  }
};

// Manual courses for review
export const getManualCourses = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const pageSize = parseInt(req.query.pageSize as string) || 20;

    const result = await adminService.getManualCourses(page, pageSize);
    res.json({ success: true, data: result });
  } catch (error) {
    console.error('Error getting manual courses:', error);
    res.status(500).json({ success: false, error: 'Failed to get manual courses' });
  }
};

// Reviews
export const getReviews = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const pageSize = parseInt(req.query.pageSize as string) || 20;
    const search = req.query.search as string | undefined;
    const showHidden = req.query.showHidden === 'true' ? true : req.query.showHidden === 'false' ? false : undefined;

    const result = await adminService.getReviews(page, pageSize, search, showHidden);
    res.json({ success: true, data: result });
  } catch (error) {
    console.error('Error getting reviews:', error);
    res.status(500).json({ success: false, error: 'Failed to get reviews' });
  }
};

export const updateReview = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const review = await adminService.updateReview(id, req.body);

    if (!review) {
      res.status(404).json({ success: false, error: 'Review not found' });
      return;
    }

    res.json({ success: true, data: review });
  } catch (error) {
    console.error('Error updating review:', error);
    res.status(500).json({ success: false, error: 'Failed to update review' });
  }
};

export const deleteReview = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const success = await adminService.deleteReview(id);

    if (!success) {
      res.status(404).json({ success: false, error: 'Review not found' });
      return;
    }

    res.json({ success: true, message: 'Review deleted' });
  } catch (error) {
    console.error('Error deleting review:', error);
    res.status(500).json({ success: false, error: 'Failed to delete review' });
  }
};
