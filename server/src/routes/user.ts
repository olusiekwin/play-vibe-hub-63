import { Router, Request, Response, NextFunction } from 'express';
import { body, validationResult } from 'express-validator';
import { UserModel } from '@/models/User';
import { GameSessionModel } from '@/models/GameSession';
import { ApiError } from '@/utils/ApiError';
import { ApiResponse, AuthRequest } from '@/types';
import { authenticate } from '@/middleware/auth';

const router = Router();

// Apply authentication to all user routes
router.use(authenticate);

// Validation rules
const updateProfileValidation = [
  body('firstName')
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('First name must be between 2 and 50 characters'),
  body('lastName')
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Last name must be between 2 and 50 characters'),
  body('phone')
    .optional()
    .matches(/^\+254[0-9]{9}$/)
    .withMessage('Please provide a valid Kenyan phone number (+254XXXXXXXXX)')
];

const updatePreferencesValidation = [
  body('sessionTimeLimit')
    .optional()
    .isInt({ min: 30, max: 480 })
    .withMessage('Session time limit must be between 30 and 480 minutes'),
  body('dailyBudgetLimit')
    .optional()
    .isFloat({ min: 100, max: 1000000 })
    .withMessage('Daily budget limit must be between 100 and 1,000,000 KES'),
  body('notifications')
    .optional()
    .isBoolean()
    .withMessage('Notifications must be a boolean value'),
  body('soundEffects')
    .optional()
    .isBoolean()
    .withMessage('Sound effects must be a boolean value'),
  body('safeMode')
    .optional()
    .isBoolean()
    .withMessage('Safe mode must be a boolean value')
];

// @route   GET /api/user/profile
// @desc    Get user profile
// @access  Private
router.get('/profile', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!._id;
    
    const user = await UserModel.findById(userId).select('-password -refreshTokens');
    
    if (!user) {
      return next(new ApiError('User not found', 404));
    }

    const response: ApiResponse = {
      success: true,
      data: { user }
    };

    res.json(response);
  } catch (error) {
    next(error);
  }
});

// @route   PUT /api/user/profile
// @desc    Update user profile
// @access  Private
router.put('/profile', updateProfileValidation, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return next(new ApiError('Validation failed', 400));
    }

    const userId = req.user!._id;
    const { firstName, lastName, phone } = req.body;

    // Check if phone number is already taken by another user
    if (phone) {
      const existingUser = await UserModel.findOne({ 
        phone, 
        _id: { $ne: userId } 
      });
      
      if (existingUser) {
        return next(new ApiError('Phone number already in use', 409));
      }
    }

    // Update user profile
    const updateData: any = {};
    if (firstName) updateData.firstName = firstName;
    if (lastName) updateData.lastName = lastName;
    if (phone) updateData.phone = phone;

    const user = await UserModel.findByIdAndUpdate(
      userId,
      updateData,
      { new: true, runValidators: true }
    ).select('-password -refreshTokens');

    if (!user) {
      return next(new ApiError('User not found', 404));
    }

    const response: ApiResponse = {
      success: true,
      message: 'Profile updated successfully',
      data: { user }
    };

    res.json(response);
  } catch (error) {
    next(error);
  }
});

// @route   PUT /api/user/preferences
// @desc    Update user preferences
// @access  Private
router.put('/preferences', updatePreferencesValidation, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return next(new ApiError('Validation failed', 400));
    }

    const userId = req.user!._id;
    const preferences = req.body;

    // Update user preferences
    const user = await UserModel.findByIdAndUpdate(
      userId,
      { $set: { preferences } },
      { new: true, runValidators: true }
    ).select('-password -refreshTokens');

    if (!user) {
      return next(new ApiError('User not found', 404));
    }

    const response: ApiResponse = {
      success: true,
      message: 'Preferences updated successfully',
      data: { user }
    };

    res.json(response);
  } catch (error) {
    next(error);
  }
});

// @route   GET /api/user/statistics
// @desc    Get user statistics
// @access  Private
router.get('/statistics', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!._id;

    // Get game statistics
    const gameStats = await GameSessionModel.getUserGameStats(userId);

    // Get current user data for additional stats
    const user = await UserModel.findById(userId).select('balance statistics createdAt');
    
    if (!user) {
      return next(new ApiError('User not found', 404));
    }

    // Calculate account age
    const accountAgeInDays = Math.floor(
      (Date.now() - user.createdAt.getTime()) / (1000 * 60 * 60 * 24)
    );

    // Calculate profit/loss
    const profitLoss = gameStats.totalWinnings - gameStats.totalBet;
    const winRate = gameStats.totalGamesPlayed > 0 
      ? ((gameStats.totalWinnings / gameStats.totalBet) * 100).toFixed(2)
      : '0.00';

    const statistics = {
      ...gameStats,
      currentBalance: user.balance,
      accountAgeInDays,
      profitLoss,
      winRate: parseFloat(winRate),
      averageBetSize: gameStats.totalGamesPlayed > 0 
        ? (gameStats.totalBet / gameStats.totalGamesPlayed).toFixed(2)
        : '0.00'
    };

    const response: ApiResponse = {
      success: true,
      data: { statistics }
    };

    res.json(response);
  } catch (error) {
    next(error);
  }
});

// @route   POST /api/user/change-password
// @desc    Change user password
// @access  Private
router.post('/change-password', [
  body('currentPassword')
    .notEmpty()
    .withMessage('Current password is required'),
  body('newPassword')
    .isLength({ min: 8 })
    .withMessage('New password must be at least 8 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage('New password must contain at least one uppercase letter, one lowercase letter, one number, and one special character')
], async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return next(new ApiError('Validation failed', 400));
    }

    const userId = req.user!._id;
    const { currentPassword, newPassword } = req.body;

    // Get user with password
    const user = await UserModel.findById(userId).select('+password');
    
    if (!user) {
      return next(new ApiError('User not found', 404));
    }

    // Verify current password
    const isCurrentPasswordValid = await user.comparePassword(currentPassword);
    
    if (!isCurrentPasswordValid) {
      return next(new ApiError('Current password is incorrect', 400));
    }

    // Update password
    user.password = newPassword;
    await user.save();

    // Clear all refresh tokens (force re-login on all devices)
    user.refreshTokens = [];
    await user.save();

    const response: ApiResponse = {
      success: true,
      message: 'Password changed successfully. Please log in again.'
    };

    res.json(response);
  } catch (error) {
    next(error);
  }
});

// @route   DELETE /api/user/account
// @desc    Delete user account
// @access  Private
router.delete('/account', [
  body('password')
    .notEmpty()
    .withMessage('Password is required to delete account'),
  body('confirmation')
    .equals('DELETE')
    .withMessage('Please type DELETE to confirm account deletion')
], async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return next(new ApiError('Validation failed', 400));
    }

    const userId = req.user!._id;
    const { password } = req.body;

    // Get user with password
    const user = await UserModel.findById(userId).select('+password');
    
    if (!user) {
      return next(new ApiError('User not found', 404));
    }

    // Verify password
    const isPasswordValid = await user.comparePassword(password);
    
    if (!isPasswordValid) {
      return next(new ApiError('Incorrect password', 400));
    }

    // Check if user has active games
    const activeGames = await GameSessionModel.countDocuments({
      userId,
      status: 'active'
    });

    if (activeGames > 0) {
      return next(new ApiError('Cannot delete account with active games. Please complete or abandon all active games first.', 400));
    }

    // Soft delete: mark user as deleted but keep data for compliance
    await UserModel.findByIdAndUpdate(userId, {
      email: `deleted_${userId}@deleted.com`,
      isDeleted: true,
      deletedAt: new Date(),
      refreshTokens: []
    });

    const response: ApiResponse = {
      success: true,
      message: 'Account deleted successfully'
    };

    res.json(response);
  } catch (error) {
    next(error);
  }
});

export default router;
