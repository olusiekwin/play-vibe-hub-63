import rateLimit from 'express-rate-limit';
import { ApiResponse } from '@/types';

export const rateLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'), // 15 minutes default
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'), // Limit each IP to 100 requests per windowMs
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again later',
    error: 'Rate limit exceeded'
  } as ApiResponse,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    const response: ApiResponse = {
      success: false,
      message: 'Too many requests from this IP, please try again later',
      error: 'Rate limit exceeded'
    };
    res.status(429).json(response);
  }
});

// More restrictive rate limiting for auth endpoints
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 login attempts per windowMs
  message: {
    success: false,
    message: 'Too many authentication attempts, please try again later',
    error: 'Authentication rate limit exceeded'
  } as ApiResponse,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // Don't count successful requests
  handler: (req, res) => {
    const response: ApiResponse = {
      success: false,
      message: 'Too many authentication attempts, please try again later',
      error: 'Authentication rate limit exceeded'
    };
    res.status(429).json(response);
  }
});

// Gaming-specific rate limiter to prevent rapid betting
export const gameRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30, // Limit each IP to 30 game actions per minute
  message: {
    success: false,
    message: 'You are playing too fast, please slow down',
    error: 'Game rate limit exceeded'
  } as ApiResponse,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    const response: ApiResponse = {
      success: false,
      message: 'You are playing too fast, please slow down',
      error: 'Game rate limit exceeded'
    };
    res.status(429).json(response);
  }
});
