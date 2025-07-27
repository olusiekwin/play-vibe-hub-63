import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { UserModel } from '@/models/User';
import { AuthRequest, TokenPayload } from '@/types';
import { ApiError } from '@/utils/ApiError';

export const authenticate = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next(new ApiError('Access token is required', 401));
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    
    if (!token) {
      return next(new ApiError('Access token is required', 401));
    }

    // Verify the JWT token
    const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET!) as TokenPayload;
    
    // Find the user
    const user = await UserModel.findById(decoded.userId).select('-password -refreshTokens');
    
    if (!user) {
      return next(new ApiError('User not found', 401));
    }

    // Attach user to request object
    req.user = user.toObject();
    
    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      return next(new ApiError('Invalid token', 401));
    }
    if (error instanceof jwt.TokenExpiredError) {
      return next(new ApiError('Token expired', 401));
    }
    next(error);
  }
};

export const authorize = (...roles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new ApiError('Authentication required', 401));
    }

    if (!roles.includes(req.user.role)) {
      return next(new ApiError('Insufficient permissions', 403));
    }

    next();
  };
};

export const optionalAuth = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next(); // Continue without authentication
    }

    const token = authHeader.substring(7);
    
    if (!token) {
      return next(); // Continue without authentication
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET!) as TokenPayload;
      const user = await UserModel.findById(decoded.userId).select('-password -refreshTokens');
      
      if (user) {
        req.user = user.toObject();
      }
    } catch (jwtError) {
      // Invalid token, but continue without authentication
    }
    
    next();
  } catch (error) {
    next(error);
  }
};
