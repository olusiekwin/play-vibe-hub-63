import { Router, Request, Response, NextFunction } from 'express';
import { body, validationResult } from 'express-validator';
import { ApiError } from '@/utils/ApiError';
import { ApiResponse, AuthRequest } from '@/types';
import { authenticate } from '@/middleware/auth';
import { User } from '@/models/User';
import { GameSession } from '@/models/GameSession';
import { Transaction } from '@/models/Transaction';
import { applyHouseEdge, HOUSE_EDGE_CONFIG } from '@/utils/houseEdge';

const router = Router();

// Apply authentication to all routes
router.use(authenticate);

// Roulette wheel configuration (European Roulette - Single Zero)
const ROULETTE_NUMBERS = Array.from({ length: 37 }, (_, i) => i); // 0-36

const ROULETTE_COLORS = {
  0: 'green',
  1: 'red', 2: 'black', 3: 'red', 4: 'black', 5: 'red', 6: 'black',
  7: 'red', 8: 'black', 9: 'red', 10: 'black', 11: 'black', 12: 'red',
  13: 'black', 14: 'red', 15: 'black', 16: 'red', 17: 'black', 18: 'red',
  19: 'red', 20: 'black', 21: 'red', 22: 'black', 23: 'red', 24: 'black',
  25: 'red', 26: 'black', 27: 'red', 28: 'black', 29: 'black', 30: 'red',
  31: 'black', 32: 'red', 33: 'black', 34: 'red', 35: 'black', 36: 'red'
};

interface RouletteBet {
  type: 'straight' | 'red' | 'black' | 'even' | 'odd' | 'low' | 'high' | 'dozen1' | 'dozen2' | 'dozen3' | 'column1' | 'column2' | 'column3';
  amount: number;
  numbers?: number[];
  value?: number | string; // For specific number or color
}

interface RouletteGameState {
  sessionId: string;
  userId: string;
  bets: RouletteBet[];
  totalBetAmount: number;
  winningNumber?: number;
  winningColor?: string;
  payouts: { type: string; amount: number; winAmount: number }[];
  totalPayout: number;
  status: 'betting' | 'spinning' | 'completed';
  result?: {
    number: number;
    color: string;
    isEven: boolean;
    isLow: boolean;
    dozen: number;
    column: number;
  };
}

// Helper functions
const getRouletteColor = (number: number): string => {
  return ROULETTE_COLORS[number as keyof typeof ROULETTE_COLORS] || 'green';
};

const isEven = (number: number): boolean => number !== 0 && number % 2 === 0;
const isLow = (number: number): boolean => number >= 1 && number <= 18;
const isHigh = (number: number): boolean => number >= 19 && number <= 36;
const getDozen = (number: number): number => {
  if (number === 0) return 0;
  if (number <= 12) return 1;
  if (number <= 24) return 2;
  return 3;
};
const getColumn = (number: number): number => {
  if (number === 0) return 0;
  return ((number - 1) % 3) + 1;
};

const calculateBetPayout = (bet: RouletteBet, winningNumber: number): number => {
  const { type, amount, value } = bet;
  
  switch (type) {
    case 'straight':
      return winningNumber === Number(value) ? amount * 35 : 0;
    
    case 'red':
      return getRouletteColor(winningNumber) === 'red' ? amount * 1 : 0;
    
    case 'black':
      return getRouletteColor(winningNumber) === 'black' ? amount * 1 : 0;
    
    case 'even':
      return isEven(winningNumber) ? amount * 1 : 0;
    
    case 'odd':
      return !isEven(winningNumber) && winningNumber !== 0 ? amount * 1 : 0;
    
    case 'low':
      return isLow(winningNumber) ? amount * 1 : 0;
    
    case 'high':
      return isHigh(winningNumber) ? amount * 1 : 0;
    
    case 'dozen1':
      return getDozen(winningNumber) === 1 ? amount * 2 : 0;
    
    case 'dozen2':
      return getDozen(winningNumber) === 2 ? amount * 2 : 0;
    
    case 'dozen3':
      return getDozen(winningNumber) === 3 ? amount * 2 : 0;
    
    case 'column1':
      return getColumn(winningNumber) === 1 ? amount * 2 : 0;
    
    case 'column2':
      return getColumn(winningNumber) === 2 ? amount * 2 : 0;
    
    case 'column3':
      return getColumn(winningNumber) === 3 ? amount * 2 : 0;
    
    default:
      return 0;
  }
};

const spinRouletteWheel = (): number => {
  return Math.floor(Math.random() * 37); // 0-36
};

// @route   POST /api/games/roulette/session
// @desc    Create new roulette session
// @access  Private
router.post('/session', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      throw new ApiError('User not authenticated', 401);
    }

    const user = await User.findById(userId);
    if (!user) {
      throw new ApiError('User not found', 404);
    }

    // Create new game session
    const gameSession = new GameSession({
      userId,
      gameType: 'roulette',
      status: 'active',
      gameState: {
        sessionId: '',
        userId,
        bets: [],
        totalBetAmount: 0,
        payouts: [],
        totalPayout: 0,
        status: 'betting'
      } as RouletteGameState,
      metadata: {
        startTime: new Date(),
        gameVersion: '1.0'
      }
    });

    await gameSession.save();

    // Update game state with session ID
    const gameState = gameSession.gameState as RouletteGameState;
    gameState.sessionId = gameSession._id.toString();
    await gameSession.save();

    const response: ApiResponse = {
      success: true,
      message: 'Roulette session created',
      data: {
        sessionId: gameSession._id,
        gameState: gameState,
        userBalance: user.balance
      }
    };

    res.status(201).json(response);
  } catch (error) {
    next(error);
  }
});

// @route   POST /api/games/roulette/bet
// @desc    Place roulette bet
// @access  Private
router.post('/bet', [
  body('sessionId').notEmpty().withMessage('Session ID is required'),
  body('betType').isIn(['straight', 'red', 'black', 'even', 'odd', 'low', 'high', 'dozen1', 'dozen2', 'dozen3', 'column1', 'column2', 'column3']).withMessage('Invalid bet type'),
  body('amount').isFloat({ min: 0.01 }).withMessage('Bet amount must be positive'),
  body('value').optional()
], async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ApiError('Validation failed', 400, errors.array());
    }

    const userId = req.user?.id;
    if (!userId) {
      throw new ApiError('User not authenticated', 401);
    }

    const { sessionId, betType, amount, value } = req.body;

    // Find user and session
    const [user, gameSession] = await Promise.all([
      User.findById(userId),
      GameSession.findOne({ _id: sessionId, userId, status: 'active' })
    ]);

    if (!user) {
      throw new ApiError('User not found', 404);
    }

    if (!gameSession) {
      throw new ApiError('Game session not found', 404);
    }

    // Validate bet amount
    const minBet = parseFloat(process.env.MIN_BET_AMOUNT || '50');
    const maxBet = parseFloat(process.env.MAX_BET_AMOUNT || '100000');

    if (amount < minBet || amount > maxBet) {
      throw new ApiError(`Bet amount must be between ${minBet} and ${maxBet} KES`, 400);
    }

    // Check user balance
    if (user.balance < amount) {
      throw new ApiError('Insufficient balance', 400);
    }

    const gameState = gameSession.gameState as RouletteGameState;

    // Validate game state
    if (gameState.status !== 'betting') {
      throw new ApiError('Cannot place bets at this time', 400);
    }

    // Validate straight bet value
    if (betType === 'straight' && (typeof value !== 'number' || value < 0 || value > 36)) {
      throw new ApiError('Invalid number for straight bet', 400);
    }

    // Create bet
    const bet: RouletteBet = {
      type: betType as RouletteBet['type'],
      amount,
      value
    };

    // Add bet to game state
    gameState.bets.push(bet);
    gameState.totalBetAmount += amount;

    // Deduct bet amount from user balance
    user.balance -= amount;

    // Save changes
    await Promise.all([
      user.save(),
      gameSession.save()
    ]);

    const response: ApiResponse = {
      success: true,
      message: 'Bet placed successfully',
      data: {
        bet,
        totalBets: gameState.bets.length,
        totalBetAmount: gameState.totalBetAmount,
        userBalance: user.balance
      }
    };

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
});

// @route   POST /api/games/roulette/spin
// @desc    Spin the roulette wheel
// @access  Private
router.post('/spin', [
  body('sessionId').notEmpty().withMessage('Session ID is required')
], async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ApiError('Validation failed', 400, errors.array());
    }

    const userId = req.user?.id;
    if (!userId) {
      throw new ApiError('User not authenticated', 401);
    }

    const { sessionId } = req.body;

    // Find user and session
    const [user, gameSession] = await Promise.all([
      User.findById(userId),
      GameSession.findOne({ _id: sessionId, userId, status: 'active' })
    ]);

    if (!user) {
      throw new ApiError('User not found', 404);
    }

    if (!gameSession) {
      throw new ApiError('Game session not found', 404);
    }

    const gameState = gameSession.gameState as RouletteGameState;

    // Validate game state
    if (gameState.status !== 'betting') {
      throw new ApiError('Cannot spin at this time', 400);
    }

    if (gameState.bets.length === 0) {
      throw new ApiError('No bets placed', 400);
    }

    // Update status to spinning
    gameState.status = 'spinning';
    await gameSession.save();

    // Spin the wheel
    const winningNumber = spinRouletteWheel();
    const winningColor = getRouletteColor(winningNumber);

    // Set result
    gameState.result = {
      number: winningNumber,
      color: winningColor,
      isEven: isEven(winningNumber),
      isLow: isLow(winningNumber),
      dozen: getDozen(winningNumber),
      column: getColumn(winningNumber)
    };

    // Calculate payouts for each bet
    let totalPayout = 0;
    const payouts = [];

    for (const bet of gameState.bets) {
      const winAmount = calculateBetPayout(bet, winningNumber);
      
      if (winAmount > 0) {
        // Apply house edge to winnings
        const adjustedWinAmount = applyHouseEdge(winAmount, 'roulette', {
          userId,
          betAmount: bet.amount,
          gameType: 'roulette'
        });

        payouts.push({
          type: bet.type,
          amount: bet.amount,
          winAmount: adjustedWinAmount
        });

        totalPayout += adjustedWinAmount;
      } else {
        payouts.push({
          type: bet.type,
          amount: bet.amount,
          winAmount: 0
        });
      }
    }

    // Update game state
    gameState.payouts = payouts;
    gameState.totalPayout = totalPayout;
    gameState.winningNumber = winningNumber;
    gameState.winningColor = winningColor;
    gameState.status = 'completed';

    // Add winnings to user balance
    if (totalPayout > 0) {
      user.balance += totalPayout;
    }

    // Create transaction records
    const transactions = [];

    // Record each bet as a transaction
    for (const bet of gameState.bets) {
      transactions.push(new Transaction({
        userId,
        type: 'game_bet',
        amount: -bet.amount,
        description: `Roulette bet: ${bet.type}`,
        gameSessionId: gameSession._id,
        metadata: { betType: bet.type, betValue: bet.value }
      }));
    }

    // Record winnings if any
    if (totalPayout > 0) {
      transactions.push(new Transaction({
        userId,
        type: 'game_win',
        amount: totalPayout,
        description: `Roulette win: Number ${winningNumber}`,
        gameSessionId: gameSession._id,
        metadata: { 
          winningNumber, 
          winningColor,
          payouts: payouts.filter(p => p.winAmount > 0)
        }
      }));
    }

    // Update session status
    gameSession.status = 'completed';
    gameSession.endedAt = new Date();
    gameSession.totalBet = gameState.totalBetAmount;
    gameSession.totalWin = totalPayout;
    gameSession.netResult = totalPayout - gameState.totalBetAmount;

    // Update user statistics
    user.totalGamesPlayed += 1;
    user.totalBet += gameState.totalBetAmount;
    user.totalWon += totalPayout;

    if (totalPayout > gameState.totalBetAmount) {
      user.totalWins += 1;
    } else {
      user.totalLosses += 1;
    }

    // Save all changes
    await Promise.all([
      user.save(),
      gameSession.save(),
      ...transactions.map(t => t.save())
    ]);

    const response: ApiResponse = {
      success: true,
      message: 'Roulette spin completed',
      data: {
        result: gameState.result,
        payouts: gameState.payouts,
        totalPayout,
        userBalance: user.balance,
        netResult: gameSession.netResult
      }
    };

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
});

// @route   GET /api/games/roulette/result/:sessionId
// @desc    Get roulette spin result
// @access  Private
router.get('/result/:sessionId', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      throw new ApiError('User not authenticated', 401);
    }

    const { sessionId } = req.params;

    const gameSession = await GameSession.findOne({ 
      _id: sessionId, 
      userId,
      gameType: 'roulette'
    });

    if (!gameSession) {
      throw new ApiError('Game session not found', 404);
    }

    const gameState = gameSession.gameState as RouletteGameState;

    const response: ApiResponse = {
      success: true,
      message: 'Roulette result retrieved',
      data: {
        sessionId: gameSession._id,
        status: gameState.status,
        result: gameState.result,
        bets: gameState.bets,
        payouts: gameState.payouts,
        totalBetAmount: gameState.totalBetAmount,
        totalPayout: gameState.totalPayout,
        netResult: gameSession.netResult,
        createdAt: gameSession.createdAt,
        completedAt: gameSession.endedAt
      }
    };

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
});

// @route   GET /api/games/roulette/history
// @desc    Get user's roulette game history
// @access  Private
router.get('/history', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      throw new ApiError('User not authenticated', 401);
    }

    const { page = 1, limit = 10 } = req.query;

    const gameSessions = await GameSession.find({ 
      userId,
      gameType: 'roulette',
      status: 'completed'
    })
    .sort({ createdAt: -1 })
    .limit(Number(limit) * Number(page))
    .skip((Number(page) - 1) * Number(limit));

    const total = await GameSession.countDocuments({ 
      userId,
      gameType: 'roulette',
      status: 'completed'
    });

    const response: ApiResponse = {
      success: true,
      message: 'Roulette history retrieved',
      data: {
        games: gameSessions.map(session => ({
          sessionId: session._id,
          result: (session.gameState as RouletteGameState).result,
          totalBet: session.totalBet,
          totalWin: session.totalWin,
          netResult: session.netResult,
          playedAt: session.createdAt
        })),
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          pages: Math.ceil(total / Number(limit))
        }
      }
    };

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
});

export default router;
