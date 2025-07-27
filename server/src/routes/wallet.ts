import { Router, Request, Response, NextFunction } from 'express';
import { body, query, validationResult } from 'express-validator';
import { TransactionModel } from '@/models/Transaction';
import { UserModel } from '@/models/User';
import { ApiError } from '@/utils/ApiError';
import { ApiResponse, AuthRequest, DepositRequest, WithdrawalRequest, PaginatedResponse } from '@/types';
import { authenticate } from '@/middleware/auth';
import { rateLimiter } from '@/middleware/rateLimiter';

const router = Router();

// Apply authentication to all wallet routes
router.use(authenticate);

// Validation rules
const depositValidation = [
  body('amount')
    .isFloat({ min: 50, max: 100000 })
    .withMessage('Deposit amount must be between 50 and 100,000 KES'),
  body('paymentMethod')
    .isIn(['mpesa'])
    .withMessage('Only M-Pesa payments are supported'),
  body('phoneNumber')
    .matches(/^\+254[0-9]{9}$/)
    .withMessage('Please provide a valid Kenyan phone number (+254XXXXXXXXX)')
];

const withdrawalValidation = [
  body('amount')
    .isFloat({ min: 100, max: 50000 })
    .withMessage('Withdrawal amount must be between 100 and 50,000 KES'),
  body('withdrawalMethod')
    .isIn(['mpesa'])
    .withMessage('Only M-Pesa withdrawals are supported'),
  body('phoneNumber')
    .matches(/^\+254[0-9]{9}$/)
    .withMessage('Please provide a valid Kenyan phone number (+254XXXXXXXXX)')
];

const transactionQueryValidation = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  query('type')
    .optional()
    .isIn(['bet', 'win', 'topup', 'withdrawal'])
    .withMessage('Type must be one of: bet, win, topup, withdrawal'),
  query('status')
    .optional()
    .isIn(['pending', 'completed', 'failed', 'cancelled'])
    .withMessage('Status must be one of: pending, completed, failed, cancelled')
];

// @route   GET /api/wallet/balance
// @desc    Get user's wallet balance
// @access  Private
router.get('/balance', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!._id;
    
    // Get current balance from user document
    const user = await UserModel.findById(userId).select('balance');
    
    if (!user) {
      return next(new ApiError('User not found', 404));
    }

    const response: ApiResponse = {
      success: true,
      data: {
        balance: user.balance,
        currency: 'KES',
        lastUpdated: new Date().toISOString()
      }
    };

    res.json(response);
  } catch (error) {
    next(error);
  }
});

// @route   POST /api/wallet/deposit
// @desc    Deposit funds to wallet
// @access  Private
router.post('/deposit', rateLimiter, depositValidation, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return next(new ApiError('Validation failed', 400));
    }

    const userId = req.user!._id;
    const { amount, paymentMethod, phoneNumber }: DepositRequest = req.body;

    // Create pending transaction
    const transaction = new TransactionModel({
      userId,
      type: 'topup',
      amount,
      currency: 'KES',
      status: 'pending',
      paymentMethod,
      description: `M-Pesa deposit of ${amount} KES`
    });

    await transaction.save();

    // TODO: Integrate with M-Pesa STK Push API
    // For now, simulate successful payment
    setTimeout(async () => {
      try {
        transaction.status = 'completed';
        transaction.mpesaTransactionId = `MP${Date.now()}${Math.floor(Math.random() * 1000)}`;
        await transaction.save();

        // Update user balance
        await UserModel.findByIdAndUpdate(userId, {
          $inc: { balance: amount }
        });

        // TODO: Send WebSocket notification to user
        console.log(`Deposit of ${amount} KES completed for user ${userId}`);
      } catch (error) {
        console.error('Error processing deposit:', error);
        transaction.status = 'failed';
        await transaction.save();
      }
    }, 2000);

    const response: ApiResponse = {
      success: true,
      message: 'Deposit initiated successfully. You will receive an M-Pesa prompt shortly.',
      data: {
        transactionId: transaction._id,
        amount,
        status: 'pending'
      }
    };

    res.status(201).json(response);
  } catch (error) {
    next(error);
  }
});

// @route   POST /api/wallet/withdraw
// @desc    Withdraw funds from wallet
// @access  Private
router.post('/withdraw', rateLimiter, withdrawalValidation, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return next(new ApiError('Validation failed', 400));
    }

    const userId = req.user!._id;
    const { amount, withdrawalMethod, phoneNumber }: WithdrawalRequest = req.body;

    // Check if user has sufficient balance
    const user = await UserModel.findById(userId);
    
    if (!user) {
      return next(new ApiError('User not found', 404));
    }

    if (user.balance < amount) {
      return next(new ApiError('Insufficient balance', 400));
    }

    // Create pending transaction
    const transaction = new TransactionModel({
      userId,
      type: 'withdrawal',
      amount: -amount, // Negative for withdrawals
      currency: 'KES',
      status: 'pending',
      paymentMethod: withdrawalMethod,
      description: `M-Pesa withdrawal of ${amount} KES`
    });

    await transaction.save();

    // Temporarily reduce balance (will be confirmed after M-Pesa processing)
    await UserModel.findByIdAndUpdate(userId, {
      $inc: { balance: -amount }
    });

    // TODO: Integrate with M-Pesa B2C API
    // For now, simulate successful withdrawal
    setTimeout(async () => {
      try {
        transaction.status = 'completed';
        transaction.mpesaTransactionId = `MW${Date.now()}${Math.floor(Math.random() * 1000)}`;
        await transaction.save();

        // TODO: Send WebSocket notification to user
        console.log(`Withdrawal of ${amount} KES completed for user ${userId}`);
      } catch (error) {
        console.error('Error processing withdrawal:', error);
        transaction.status = 'failed';
        await transaction.save();

        // Refund balance on failure
        await UserModel.findByIdAndUpdate(userId, {
          $inc: { balance: amount }
        });
      }
    }, 3000);

    const response: ApiResponse = {
      success: true,
      message: 'Withdrawal initiated successfully. Funds will be sent to your M-Pesa account shortly.',
      data: {
        transactionId: transaction._id,
        amount,
        status: 'pending'
      }
    };

    res.status(201).json(response);
  } catch (error) {
    next(error);
  }
});

// @route   GET /api/wallet/transactions
// @desc    Get user's transaction history
// @access  Private
router.get('/transactions', transactionQueryValidation, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return next(new ApiError('Validation failed', 400));
    }

    const userId = req.user!._id;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const type = req.query.type as string;
    const status = req.query.status as string;

    const query: any = { userId };
    if (type) query.type = type;
    if (status) query.status = status;

    const skip = (page - 1) * limit;

    // Get transactions
    const transactions = await TransactionModel.find(query)
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    // Get total count for pagination
    const total = await TransactionModel.countDocuments(query);
    const totalPages = Math.ceil(total / limit);

    const response: PaginatedResponse<any> = {
      success: true,
      data: transactions,
      pagination: {
        page,
        limit,
        total,
        totalPages
      }
    };

    res.json(response);
  } catch (error) {
    next(error);
  }
});

// @route   GET /api/wallet/transaction/:id
// @desc    Get specific transaction details
// @access  Private
router.get('/transaction/:id', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!._id;
    const transactionId = req.params.id;

    const transaction = await TransactionModel.findOne({
      _id: transactionId,
      userId
    });

    if (!transaction) {
      return next(new ApiError('Transaction not found', 404));
    }

    const response: ApiResponse = {
      success: true,
      data: { transaction }
    };

    res.json(response);
  } catch (error) {
    next(error);
  }
});

export default router;
