import { Request, Response, NextFunction } from 'express';
import { ErrorResponse } from '@ceu/types';

export const errorHandler = (
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void => {
  console.error('Error:', err);

  const errorResponse: ErrorResponse = {
    success: false,
    error: err.message || 'Internal server error',
    details: process.env.NODE_ENV === 'development' ? { stack: err.stack } : undefined,
  };

  res.status(500).json(errorResponse);
};
