import { Router } from 'express';
import { body, validationResult } from 'express-validator';
import jwt from 'jsonwebtoken';
import { User } from '../models/User.js';
import { ApiError } from '../utils/ApiError.js';

const router = Router();

// Simple registration validation
const simpleRegisterValidation = [
  body('username')
    .trim()
    .isLength({ min: 3, max: 30 })
    .withMessage('Username must be between 3 and 30 characters'),
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long')
];

// Simple login validation
const simpleLoginValidation = [
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
    process.env.JWT_ACCESS_SECRET || 'fallback_secret',
    { expiresIn: '15m' }
  );

  const refreshToken = jwt.sign(
    { userId },
    process.env.JWT_REFRESH_SECRET || 'fallback_refresh_secret',
    { expiresIn: '7d' }
  );

  return { accessToken, refreshToken };
};

// @route   POST /api/simple-auth/register
// @desc    Simple user registration
// @access  Public
router.post('/register', simpleRegisterValidation, async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return next(new ApiError('Validation failed', 400, errors.array()));
    }

    const { email, password, username } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({
      $or: [{ email }, { username }]
    });

    if (existingUser) {
      if (existingUser.email === email) {
        return next(new ApiError('Email already registered', 409));
      }
      if (existingUser.username === username) {
        return next(new ApiError('Username already taken', 409));
      }
    }

    // Create new user with minimal required fields and defaults
    const user = new User({
      email,
      password,
      username,
      firstName: username, // Use username as firstname
      lastName: 'User', // Default lastname
      phoneNumber: `+254700${Math.floor(Math.random() * 1000000).toString().padStart(6, '0')}`, // Generate random phone
      dateOfBirth: new Date('1990-01-01'), // Default date
      nationalId: Math.floor(Math.random() * 100000000).toString().padStart(8, '0'), // Generate random ID
      county: 'Nairobi', // Default county
      status: 'active', // Explicitly set as active
      isEmailVerified: true,
      isPhoneVerified: true,
      isIdVerified: true
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
          username: user.username,
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

// @route   POST /api/simple-auth/login
// @desc    Simple user login
// @access  Public
router.post('/login', simpleLoginValidation, async (req, res, next) => {
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

    // All accounts are automatically active now
    // No status check needed

    // Generate tokens
    const { accessToken, refreshToken } = generateTokens(user._id);

    // Add refresh token to user
    user.refreshTokens.push(refreshToken);
    user.lastLogin = new Date();
    await user.save();

    const response = {
      success: true,
      message: 'Login successful',
      data: {
        user: {
          id: user._id,
          email: user.email,
          username: user.username,
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

export default router;
