import { Request, Response, NextFunction } from 'express';
import { ApiError } from '@/utils/ApiError';
import { ApiResponse } from '@/types';

export const notFound = (req: Request, res: Response, next: NextFunction): void => {
  const message = `Route ${req.originalUrl} not found`;
  const error = new ApiError(message, 404);
  
  const response: ApiResponse = {
    success: false,
    message: error.message
  };

  res.status(error.statusCode).json(response);
};
