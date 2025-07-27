import { Router, Request, Response, NextFunction } from 'express';
import { body, validationResult } from 'express-validator';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { UserModel } from '@/models/User';
import { ApiError } from '@/utils/ApiError';
import { ApiResponse, RegisterData, LoginCredentials } from '@/types';
import { authRateLimiter } from '@/middleware/rateLimiter';
import { authenticate } from '@/middleware/auth';

const router = Router();

// Validation rules
const registerValidation = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'),
  body('firstName')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('First name must be between 2 and 50 characters'),
  body('lastName')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Last name must be between 2 and 50 characters'),
  body('phone')
    .matches(/^\+254[0-9]{9}$/)
    .withMessage('Please provide a valid Kenyan phone number (+254XXXXXXXXX)'),
  body('dateOfBirth')
    .isISO8601()
    .withMessage('Please provide a valid date of birth')
    .custom((value) => {
      const age = Math.floor((Date.now() - new Date(value).getTime()) / (365.25 * 24 * 60 * 60 * 1000));
      if (age < 18) {
        throw new Error('You must be at least 18 years old');
      }
      return true;
    })
];

const loginValidation = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
  body('password')
    .notEmpty()
    .withMessage('Password is required')
];

// @route   POST /api/auth/register
// @desc    Register a new user
// @access  Public
router.post('/register', authRateLimiter, registerValidation, async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return next(new ApiError('Validation failed', 400));
    }

    const { email, password, firstName, lastName, phone, dateOfBirth }: RegisterData = req.body;

    // Check if user already exists
    const existingUser = await UserModel.findOne({
      $or: [{ email }, { phone }]
    });

    if (existingUser) {
      if (existingUser.email === email) {
        return next(new ApiError('Email already registered', 409));
      }
      if (existingUser.phone === phone) {
        return next(new ApiError('Phone number already registered', 409));
      }
    }

    // Create new user
    const user = new UserModel({
      email,
      password,
      firstName,
      lastName,
      phone,
      dateOfBirth: new Date(dateOfBirth)
    });

    await user.save();

    // Generate tokens
    const { accessToken, refreshToken } = user.generateTokens();

    // Store refresh token
    user.refreshTokens.push(refreshToken);
    await user.save();

    const response: ApiResponse = {
      success: true,
      message: 'User registered successfully',
      data: {
        user: user.toJSON(),
        accessToken,
        refreshToken
      }
    };

    res.status(201).json(response);
  } catch (error) {
    next(error);
  }
});

// @route   POST /api/auth/login
// @desc    Login user
// @access  Public
router.post('/login', authRateLimiter, loginValidation, async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return next(new ApiError('Validation failed', 400));
    }

    const { email, password }: LoginCredentials = req.body;

    // Find user and include password for comparison
    const user = await UserModel.findOne({ email }).select('+password');
    
    if (!user) {
      return next(new ApiError('Invalid email or password', 401));
    }

    // Check password
    const isPasswordValid = await user.comparePassword(password);
    
    if (!isPasswordValid) {
      return next(new ApiError('Invalid email or password', 401));
    }

    // Generate tokens
    const { accessToken, refreshToken } = user.generateTokens();

    // Store refresh token
    user.refreshTokens.push(refreshToken);
    await user.save();

    const response: ApiResponse = {
      success: true,
      message: 'Login successful',
      data: {
        user: user.toJSON(),
        accessToken,
        refreshToken
      }
    };

    res.json(response);
  } catch (error) {
    next(error);
  }
});

// @route   POST /api/auth/refresh
// @desc    Refresh access token
// @access  Public
router.post('/refresh', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return next(new ApiError('Refresh token is required', 400));
    }

    // Verify refresh token
    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET!) as any;
    
    // Find user and check if refresh token exists
    const user = await UserModel.findById(decoded.userId);
    
    if (!user || !user.refreshTokens.includes(refreshToken)) {
      return next(new ApiError('Invalid refresh token', 401));
    }

    // Generate new tokens
    const { accessToken, refreshToken: newRefreshToken } = user.generateTokens();

    // Replace old refresh token with new one
    user.refreshTokens = user.refreshTokens.filter(token => token !== refreshToken);
    user.refreshTokens.push(newRefreshToken);
    await user.save();

    const response: ApiResponse = {
      success: true,
      message: 'Token refreshed successfully',
      data: {
        accessToken,
        refreshToken: newRefreshToken
      }
    };

    res.json(response);
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError || error instanceof jwt.TokenExpiredError) {
      return next(new ApiError('Invalid refresh token', 401));
    }
    next(error);
  }
});

// @route   POST /api/auth/logout
// @desc    Logout user
// @access  Private
router.post('/logout', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { refreshToken } = req.body;
    const userId = (req as any).user._id;

    if (refreshToken) {
      // Remove specific refresh token
      await UserModel.findByIdAndUpdate(userId, {
        $pull: { refreshTokens: refreshToken }
      });
    } else {
      // Remove all refresh tokens (logout from all devices)
      await UserModel.findByIdAndUpdate(userId, {
        $set: { refreshTokens: [] }
      });
    }

    const response: ApiResponse = {
      success: true,
      message: 'Logout successful'
    };

    res.json(response);
  } catch (error) {
    next(error);
  }
});

// @route   GET /api/auth/me
// @desc    Get current user
// @access  Private
router.get('/me', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = (req as any).user;

    const response: ApiResponse = {
      success: true,
      data: { user }
    };

    res.json(response);
  } catch (error) {
    next(error);
  }
});

export default router;
