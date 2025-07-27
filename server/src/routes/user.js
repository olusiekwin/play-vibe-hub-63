import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { User } from '../models/User.js';
import { ApiError } from '../utils/ApiError.js';

const router = Router();

// Apply authentication to all routes
router.use(authenticate);

// @route   GET /api/users/profile
// @desc    Get user profile
// @access  Private
router.get('/profile', async (req, res, next) => {
  try {
    const response = {
      success: true,
      message: 'Profile retrieved successfully',
      data: {
        user: req.user
      }
    };

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
});

// @route   PUT /api/users/profile
// @desc    Update user profile
// @access  Private
router.put('/profile', async (req, res, next) => {
  try {
    const { firstName, lastName, phoneNumber, county } = req.body;
    
    const user = await User.findById(req.user._id);
    if (!user) {
      throw new ApiError('User not found', 404);
    }

    // Update allowed fields
    if (firstName) user.firstName = firstName;
    if (lastName) user.lastName = lastName;
    if (phoneNumber) user.phoneNumber = phoneNumber;
    if (county) user.county = county;

    await user.save();

    const response = {
      success: true,
      message: 'Profile updated successfully',
      data: {
        user: user.toJSON()
      }
    };

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
});

// @route   GET /api/users/stats
// @desc    Get user gaming statistics
// @access  Private
router.get('/stats', async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    
    const response = {
      success: true,
      message: 'User statistics retrieved',
      data: {
        statistics: {
          totalGamesPlayed: user.totalGamesPlayed || 0,
          totalBet: user.totalBet || 0,
          totalWon: user.totalWon || 0,
          totalWins: user.totalWins || 0,
          totalLosses: user.totalLosses || 0,
          netResult: (user.totalWon || 0) - (user.totalBet || 0),
          winRate: user.totalGamesPlayed > 0 ? ((user.totalWins || 0) / user.totalGamesPlayed * 100) : 0,
          currentBalance: user.balance
        }
      }
    };

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
});

export default router;
