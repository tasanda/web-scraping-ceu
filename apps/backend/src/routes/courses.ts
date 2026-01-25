import { Router } from 'express';
import { getCourses, getCourseById } from '../controllers/courseController';

export const courseRoutes = Router();

courseRoutes.get('/', getCourses);
courseRoutes.get('/:id', getCourseById);
