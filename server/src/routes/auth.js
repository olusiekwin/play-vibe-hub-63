import { Router } from 'express';
import { body, validationResult } from 'express-validator';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { User } from '../models/User.js';
import { ApiError } from '../utils/ApiError.js';
import { authRateLimiter } from '../middleware/rateLimiter.js';
import { authenticate } from '../middleware/auth.js';

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
  body('phoneNumber')
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
    }),
  body('username')
    .trim()
    .isLength({ min: 3, max: 30 })
    .withMessage('Username must be between 3 and 30 characters')
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage('Username can only contain letters, numbers, and underscores'),
  body('nationalId')
    .matches(/^[0-9]{8}$/)
    .withMessage('Please enter a valid 8-digit National ID'),
  body('county')
    .isIn([
      'Baringo', 'Bomet', 'Bungoma', 'Busia', 'Elgeyo-Marakwet', 'Embu', 'Garissa',
      'Homa Bay', 'Isiolo', 'Kajiado', 'Kakamega', 'Kericho', 'Kiambu', 'Kilifi',
      'Kirinyaga', 'Kisii', 'Kisumu', 'Kitui', 'Kwale', 'Laikipia', 'Lamu', 'Machakos',
      'Makueni', 'Mandera', 'Marsabit', 'Meru', 'Migori', 'Mombasa', 'Murang\'a',
      'Nairobi', 'Nakuru', 'Nandi', 'Narok', 'Nyamira', 'Nyandarua', 'Nyeri',
      'Samburu', 'Siaya', 'Taita-Taveta', 'Tana River', 'Tharaka-Nithi', 'Trans Nzoia',
      'Turkana', 'Uasin Gishu', 'Vihiga', 'Wajir', 'West Pokot'
    ])
    .withMessage('Please select a valid county')
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

// Helper function to generate JWT tokens
const generateTokens = (userId) => {
  const accessToken = jwt.sign(
    { userId },
    process.env.JWT_ACCESS_SECRET,
    { expiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m' }
  );

  const refreshToken = jwt.sign(
    { userId },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d' }
  );

  return { accessToken, refreshToken };
};

// @route   POST /api/auth/register
// @desc    Register a new user
// @access  Public
router.post('/register', authRateLimiter, registerValidation, async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return next(new ApiError('Validation failed', 400, errors.array()));
    }

    const {
      email,
      password,
      firstName,
      lastName,
      username,
      phoneNumber,
      dateOfBirth,
      nationalId,
      county
    } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({
      $or: [{ email }, { username }, { phoneNumber }, { nationalId }]
    });

    if (existingUser) {
      if (existingUser.email === email) {
        return next(new ApiError('Email already registered', 409));
      }
      if (existingUser.username === username) {
        return next(new ApiError('Username already taken', 409));
      }
      if (existingUser.phoneNumber === phoneNumber) {
        return next(new ApiError('Phone number already registered', 409));
      }
      if (existingUser.nationalId === nationalId) {
        return next(new ApiError('National ID already registered', 409));
      }
    }

    // Create new user
    const user = new User({
      email,
      password,
      firstName,
      lastName,
      username,
      phoneNumber,
      dateOfBirth: new Date(dateOfBirth),
      nationalId,
      county
    });

    await user.save();

    // Generate tokens
    const { accessToken, refreshToken } = generateTokens(user._id);

    // Add refresh token to user
    user.refreshTokens.push(refreshToken);
    await user.save();

    const response = {
      success: true,
      message: 'User registered successfully',
      data: {
        user: {
          id: user._id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          username: user.username,
          phoneNumber: user.phoneNumber,
          county: user.county,
          balance: user.balance,
          role: user.role,
          status: user.status
        },
        tokens: {
          accessToken,
          refreshToken
        }
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
router.post('/login', authRateLimiter, loginValidation, async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return next(new ApiError('Validation failed', 400, errors.array()));
    }

    const { email, password } = req.body;

    // Find user and include password for comparison
    const user = await User.findOne({ email }).select('+password');

    if (!user || !(await user.comparePassword(password))) {
      return next(new ApiError('Invalid email or password', 401));
    }

    if (user.status !== 'active') {
      return next(new ApiError('Account is not active. Please contact support.', 403));
    }

    // Generate tokens
    const { accessToken, refreshToken } = generateTokens(user._id);

    // Add refresh token to user and cleanup old ones
    user.refreshTokens.push(refreshToken);
    user.cleanupRefreshTokens();
    user.lastLogin = new Date();
    await user.save();

    const response = {
      success: true,
      message: 'Login successful',
      data: {
        user: {
          id: user._id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          username: user.username,
          phoneNumber: user.phoneNumber,
          county: user.county,
          balance: user.balance,
          role: user.role,
          status: user.status
        },
        tokens: {
          accessToken,
          refreshToken
        }
      }
    };

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
});

// @route   POST /api/auth/refresh
// @desc    Refresh access token
// @access  Public
router.post('/refresh', async (req, res, next) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return next(new ApiError('Refresh token is required', 401));
    }

    // Verify refresh token
    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    const user = await User.findById(decoded.userId);

    if (!user || !user.refreshTokens.includes(refreshToken)) {
      return next(new ApiError('Invalid refresh token', 401));
    }

    // Generate new tokens
    const { accessToken, refreshToken: newRefreshToken } = generateTokens(user._id);

    // Replace old refresh token with new one
    const tokenIndex = user.refreshTokens.indexOf(refreshToken);
    user.refreshTokens[tokenIndex] = newRefreshToken;
    await user.save();

    const response = {
      success: true,
      message: 'Tokens refreshed successfully',
      data: {
        tokens: {
          accessToken,
          refreshToken: newRefreshToken
        }
      }
    };

    res.status(200).json(response);
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      return next(new ApiError('Invalid refresh token', 401));
    }
    if (error instanceof jwt.TokenExpiredError) {
      return next(new ApiError('Refresh token expired', 401));
    }
    next(error);
  }
});

// @route   POST /api/auth/logout
// @desc    Logout user
// @access  Private
router.post('/logout', authenticate, async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    const user = await User.findById(req.user._id);

    if (refreshToken && user.refreshTokens.includes(refreshToken)) {
      user.refreshTokens = user.refreshTokens.filter(token => token !== refreshToken);
      await user.save();
    }

    const response = {
      success: true,
      message: 'Logged out successfully'
    };

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
});

// @route   POST /api/auth/logout-all
// @desc    Logout from all devices
// @access  Private
router.post('/logout-all', authenticate, async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    user.refreshTokens = [];
    await user.save();

    const response = {
      success: true,
      message: 'Logged out from all devices successfully'
    };

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
});

// @route   GET /api/auth/me
// @desc    Get current user profile
// @access  Private
router.get('/me', authenticate, async (req, res, next) => {
  try {
    const response = {
      success: true,
      message: 'User profile retrieved successfully',
      data: {
        user: req.user
      }
    };

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
});

export default router;
