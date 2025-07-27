import { Router } from 'express';
import { body, validationResult } from 'express-validator';
import { authenticate } from '../middleware/auth.js';
import { User } from '../models/User.js';
import { Transaction } from '../models/Transaction.js';
import { ApiError } from '../utils/ApiError.js';

const router = Router();

// Apply authentication to all routes
router.use(authenticate);

// @route   GET /api/wallet/balance
// @desc    Get user wallet balance
// @access  Private
router.get('/balance', async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    
    const response = {
      success: true,
      message: 'Balance retrieved successfully',
      data: {
        balance: user.balance,
        currency: 'KES'
      }
    };

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
});

// @route   POST /api/wallet/deposit
// @desc    Deposit money to wallet
// @access  Private
router.post('/deposit', [
  body('amount').isFloat({ min: 50 }).withMessage('Minimum deposit is 50 KES'),
  body('paymentMethod').isIn(['mpesa', 'card', 'bank_transfer']).withMessage('Invalid payment method')
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ApiError('Validation failed', 400, errors.array());
    }

    const { amount, paymentMethod, phoneNumber } = req.body;
    const user = await User.findById(req.user._id);

    // Create transaction record
    const transaction = new Transaction({
      userId: user._id,
      type: 'deposit',
      amount: amount,
      description: `Wallet deposit via ${paymentMethod}`,
      paymentMethod,
      status: 'pending',
      balanceBefore: user.balance,
      balanceAfter: user.balance + amount,
      metadata: { phoneNumber }
    });

    await transaction.save();

    // For demo purposes, auto-approve deposit
    // In production, integrate with actual payment provider
    transaction.status = 'completed';
    user.balance += amount;
    
    await Promise.all([transaction.save(), user.save()]);

    const response = {
      success: true,
      message: 'Deposit successful',
      data: {
        transaction: {
          id: transaction._id,
          amount: transaction.amount,
          status: transaction.status,
          paymentMethod: transaction.paymentMethod
        },
        newBalance: user.balance
      }
    };

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
});

// @route   POST /api/wallet/withdraw
// @desc    Withdraw money from wallet
// @access  Private
router.post('/withdraw', [
  body('amount').isFloat({ min: 100 }).withMessage('Minimum withdrawal is 100 KES'),
  body('paymentMethod').isIn(['mpesa', 'bank_transfer']).withMessage('Invalid payment method')
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ApiError('Validation failed', 400, errors.array());
    }

    const { amount, paymentMethod, phoneNumber, accountNumber } = req.body;
    const user = await User.findById(req.user._id);

    if (user.balance < amount) {
      throw new ApiError('Insufficient balance', 400);
    }

    // Create transaction record
    const transaction = new Transaction({
      userId: user._id,
      type: 'withdrawal',
      amount: -amount,
      description: `Wallet withdrawal via ${paymentMethod}`,
      paymentMethod,
      status: 'pending',
      balanceBefore: user.balance,
      balanceAfter: user.balance - amount,
      metadata: { phoneNumber, accountNumber }
    });

    await transaction.save();

    // For demo purposes, auto-approve withdrawal
    // In production, add proper validation and processing
    transaction.status = 'completed';
    user.balance -= amount;
    
    await Promise.all([transaction.save(), user.save()]);

    const response = {
      success: true,
      message: 'Withdrawal successful',
      data: {
        transaction: {
          id: transaction._id,
          amount: Math.abs(transaction.amount),
          status: transaction.status,
          paymentMethod: transaction.paymentMethod
        },
        newBalance: user.balance
      }
    };

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
});

// @route   GET /api/wallet/transactions
// @desc    Get user transaction history
// @access  Private
router.get('/transactions', async (req, res, next) => {
  try {
    const { page = 1, limit = 20, type } = req.query;
    
    const query = { userId: req.user._id };
    if (type && ['deposit', 'withdrawal', 'game_bet', 'game_win'].includes(type)) {
      query.type = type;
    }

    const transactions = await Transaction.find(query)
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Transaction.countDocuments(query);

    const response = {
      success: true,
      message: 'Transaction history retrieved',
      data: {
        transactions: transactions.map(t => ({
          id: t._id,
          type: t.type,
          amount: t.amount,
          description: t.description,
          status: t.status,
          paymentMethod: t.paymentMethod,
          createdAt: t.createdAt
        })),
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      }
    };

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
});

export default router;
