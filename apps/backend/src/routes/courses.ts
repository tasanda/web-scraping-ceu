import { Router } from 'express';
import { getCourses, getCourseById, createCourse } from '../controllers/courseController';
import { authenticate } from '../middleware/auth';

export const courseRoutes = Router();

courseRoutes.get('/', getCourses);
courseRoutes.get('/:id', getCourseById);
courseRoutes.post('/', authenticate, createCourse);
