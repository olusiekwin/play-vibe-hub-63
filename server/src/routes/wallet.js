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
// @desc    Get user wallet balance (supports both demo and real)
// @access  Private
router.get('/balance', async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    const accountType = req.query.accountType || user.accountMode || 'demo';
    
    // Get the appropriate balance based on account type
    const balance = accountType === 'real' ? user.realBalance : user.demoBalance;
    
    const response = {
      success: true,
      message: 'Balance retrieved successfully',
      data: {
        balance: balance,
        demoBalance: user.demoBalance,
        realBalance: user.realBalance,
        accountMode: user.accountMode,
        currentAccountType: accountType,
        currency: 'KES'
      }
    };

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
});

// @route   POST /api/wallet/switch-account
// @desc    Switch between demo and real account mode
// @access  Private
router.post('/switch-account', [
  body('accountType').isIn(['demo', 'real']).withMessage('Account type must be demo or real')
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ApiError('Validation failed', 400, errors.array());
    }

    const { accountType } = req.body;
    const user = await User.findById(req.user._id);

    // Update user's account mode
    user.accountMode = accountType;
    await user.save();

    const balance = accountType === 'real' ? user.realBalance : user.demoBalance;

    const response = {
      success: true,
      message: `Switched to ${accountType} account`,
      data: {
        accountMode: user.accountMode,
        balance: balance,
        demoBalance: user.demoBalance,
        realBalance: user.realBalance,
        currency: 'KES'
      }
    };

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
});

// @route   POST /api/wallet/deposit
// @desc    Deposit money to real wallet (demo accounts cannot deposit real money)
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

    // Deposits only work for real accounts
    if (user.accountMode === 'demo') {
      throw new ApiError('Cannot deposit real money to demo account. Switch to real account first.', 400);
    }

    // Create transaction record
    const transaction = new Transaction({
      userId: user._id,
      type: 'deposit',
      amount: amount,
      accountType: 'real',
      description: `Real wallet deposit via ${paymentMethod}`,
      paymentMethod,
      status: 'pending',
      balanceBefore: user.realBalance,
      balanceAfter: user.realBalance + amount,
      metadata: { phoneNumber }
    });

    await transaction.save();

    // For demo purposes, auto-approve deposit
    // In production, integrate with actual payment provider
    transaction.status = 'completed';
    user.realBalance += amount;
    user.balance = user.realBalance; // Update legacy balance field
    
    await Promise.all([transaction.save(), user.save()]);

    const response = {
      success: true,
      message: 'Real money deposit successful',
      data: {
        transaction: {
          id: transaction._id,
          amount: transaction.amount,
          status: transaction.status,
          paymentMethod: transaction.paymentMethod,
          accountType: 'real'
        },
        newBalance: user.realBalance,
        demoBalance: user.demoBalance,
        realBalance: user.realBalance
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

// @route   POST /api/wallet/game-bet
// @desc    Deduct money for game bet (supports both demo and real accounts)
// @access  Private
router.post('/game-bet', [
  body('amount').isFloat({ min: 1 }).withMessage('Minimum bet is 1 KES'),
  body('gameId').notEmpty().withMessage('Game ID is required'),
  body('gameType').isIn(['blackjack', 'poker', 'roulette', 'slots']).withMessage('Invalid game type')
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ApiError('Validation failed', 400, errors.array());
    }

    const { amount, gameId, gameType, betDetails } = req.body;
    const user = await User.findById(req.user._id);
    const accountType = user.accountMode;

    // Get current balance based on account type
    const currentBalance = accountType === 'real' ? user.realBalance : user.demoBalance;

    if (currentBalance < amount) {
      throw new ApiError(`Insufficient ${accountType} balance`, 400);
    }

    // Create transaction record for bet
    const transaction = new Transaction({
      userId: user._id,
      type: 'game_bet',
      amount: -amount,
      accountType: accountType,
      description: `${gameType} ${accountType} bet - Game ID: ${gameId}`,
      status: 'completed',
      balanceBefore: currentBalance,
      balanceAfter: currentBalance - amount,
      metadata: { gameId, gameType, betDetails }
    });

    // Deduct bet amount from appropriate balance
    if (accountType === 'real') {
      user.realBalance -= amount;
      user.balance = user.realBalance; // Update legacy field
    } else {
      user.demoBalance -= amount;
      user.balance = user.demoBalance; // Update legacy field
    }
    
    await Promise.all([transaction.save(), user.save()]);

    const response = {
      success: true,
      message: `${accountType.charAt(0).toUpperCase() + accountType.slice(1)} bet placed successfully`,
      data: {
        transaction: {
          id: transaction._id,
          amount: Math.abs(transaction.amount),
          gameId,
          gameType,
          accountType
        },
        newBalance: accountType === 'real' ? user.realBalance : user.demoBalance,
        accountType: accountType
      }
    };

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
});

// @route   POST /api/wallet/game-win
// @desc    Add winnings to wallet
// @access  Private
router.post('/game-win', [
  body('amount').isFloat({ min: 0 }).withMessage('Win amount must be positive'),
  body('gameId').notEmpty().withMessage('Game ID is required'),
  body('gameType').isIn(['blackjack', 'poker', 'roulette', 'slots']).withMessage('Invalid game type')
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ApiError('Validation failed', 400, errors.array());
    }

    const { amount, gameId, gameType, winDetails } = req.body;
    const user = await User.findById(req.user._id);
    const accountType = user.accountMode;

    if (amount > 0) {
      // Get current balance based on account type
      const currentBalance = accountType === 'real' ? user.realBalance : user.demoBalance;

      // Create transaction record for win
      const transaction = new Transaction({
        userId: user._id,
        type: 'game_win',
        amount: amount,
        accountType: accountType,
        description: `${gameType} ${accountType} win - Game ID: ${gameId}`,
        status: 'completed',
        balanceBefore: currentBalance,
        balanceAfter: currentBalance + amount,
        metadata: { gameId, gameType, winDetails }
      });

      // Add winnings to appropriate balance
      if (accountType === 'real') {
        user.realBalance += amount;
        user.balance = user.realBalance; // Update legacy field
      } else {
        user.demoBalance += amount;
        user.balance = user.demoBalance; // Update legacy field
      }
      
      await Promise.all([transaction.save(), user.save()]);
    }

    const response = {
      success: true,
      message: amount > 0 ? `${accountType.charAt(0).toUpperCase() + accountType.slice(1)} winnings added successfully` : 'Game completed',
      data: {
        transaction: amount > 0 ? {
          id: transaction._id,
          amount: amount,
          gameId,
          gameType,
          accountType
        } : null,
        newBalance: accountType === 'real' ? user.realBalance : user.demoBalance,
        accountType: accountType,
        winAmount: amount
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
