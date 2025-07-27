import jwt from 'jsonwebtoken';
import { User } from '../models/User.js';
import { ApiError } from '../utils/ApiError.js';

export const authenticate = async (req, res, next) => {
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
    const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
    
    // Find the user
    const user = await User.findById(decoded.userId).select('-password -refreshTokens');
    
    if (!user) {
      return next(new ApiError('User not found', 401));
    }

    // Check if user is active
    if (user.status !== 'active') {
      return next(new ApiError('Account is not active', 403));
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

export const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(new ApiError('Authentication required', 401));
    }

    if (!roles.includes(req.user.role)) {
      return next(new ApiError('Insufficient permissions', 403));
    }

    next();
  };
};

export const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next();
    }

    const token = authHeader.substring(7);
    
    if (!token) {
      return next();
    }

    const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
    const user = await User.findById(decoded.userId).select('-password -refreshTokens');
    
    if (user && user.status === 'active') {
      req.user = user.toObject();
    }
    
    next();
  } catch (error) {
    // If token is invalid, just continue without user
    next();
  }
};
