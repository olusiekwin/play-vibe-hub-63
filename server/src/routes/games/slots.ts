import { Router, Request, Response, NextFunction } from 'express';
import { body, validationResult } from 'express-validator';
import { v4 as uuidv4 } from 'uuid';
import { GameSessionModel } from '@/models/GameSession';
import { TransactionModel } from '@/models/Transaction';
import { UserModel } from '@/models/User';
import { ApiError } from '@/utils/ApiError';
import { ApiResponse, AuthRequest, SlotsGameState } from '@/types';
import { authenticate } from '@/middleware/auth';
import { gameRateLimiter } from '@/middleware/rateLimiter';
import { HOUSE_EDGE_CONFIG } from '@/utils/houseEdge';

const router = Router();

// Apply authentication to all routes
router.use(authenticate);

// Slot machine configuration with weighted symbols for house edge
const SLOT_SYMBOLS = {
  'cherry': { weight: 25, payout: { 3: 10, 2: 2 } },
  'lemon': { weight: 20, payout: { 3: 15 } },
  'bell': { weight: 18, payout: { 3: 20 } },
  'bar': { weight: 15, payout: { 3: 40 } },
  'seven': { weight: 12, payout: { 3: 80 } },
  'diamond': { weight: 8, payout: { 3: 150 } },
  'jackpot': { weight: 2, payout: { 3: 1000 } }
};

const PAYLINES = [
  [0, 0, 0], // Top row
  [1, 1, 1], // Middle row
  [2, 2, 2], // Bottom row
  [0, 1, 2], // Diagonal down
  [2, 1, 0], // Diagonal up
  [0, 1, 1], // Corner patterns
  [1, 0, 1],
  [1, 2, 1],
  [2, 1, 1]
];

// Generate weighted random symbol
const getRandomSymbol = (): string => {
  const totalWeight = Object.values(SLOT_SYMBOLS).reduce((sum, symbol) => sum + symbol.weight, 0);
  let random = Math.random() * totalWeight;
  
  for (const [symbol, config] of Object.entries(SLOT_SYMBOLS)) {
    random -= config.weight;
    if (random <= 0) {
      return symbol;
    }
  }
  
  return 'cherry'; // Fallback
};

// Generate slot reels with house edge
const spinReels = (): string[][] => {
  const reels: string[][] = [[], [], []];
  
  for (let reel = 0; reel < 3; reel++) {
    for (let position = 0; position < 3; position++) {
      reels[reel][position] = getRandomSymbol();
    }
  }
  
  return reels;
};

// Calculate winnings with house edge applied
const calculateSlotWinnings = (reels: string[][], betAmount: number, paylines: number): { winningLines: any[], totalPayout: number, jackpot: boolean } => {
  const winningLines: any[] = [];
  let totalPayout = 0;
  let jackpot = false;
  
  // Check each active payline
  for (let i = 0; i < Math.min(paylines, PAYLINES.length); i++) {
    const line = PAYLINES[i];
    const symbols = line.map(pos => reels[pos]);
    
    // Check for matching symbols
    const firstSymbol = symbols[0];
    const matchCount = symbols.filter(symbol => symbol === firstSymbol).length;
    
    if (matchCount >= 2) {
      const symbolConfig = SLOT_SYMBOLS[firstSymbol as keyof typeof SLOT_SYMBOLS];
      const payoutMultiplier = symbolConfig?.payout[matchCount as keyof typeof symbolConfig.payout] || 0;
      
      if (payoutMultiplier > 0) {
        const linePayout = betAmount * payoutMultiplier / paylines; // Divide by paylines to maintain house edge
        
        winningLines.push({
          line: i + 1,
          symbols: symbols,
          payout: linePayout
        });
        
        totalPayout += linePayout;
        
        // Check for jackpot
        if (firstSymbol === 'jackpot' && matchCount === 3) {
          jackpot = true;
          totalPayout *= 10; // Jackpot multiplier
        }
      }
    }
  }
  
  // Apply house edge - reduce payouts by configured percentage
  const houseEdge = (100 - HOUSE_EDGE_CONFIG.slots.returnToPlayer) / 100;
  totalPayout = Math.floor(totalPayout * (1 - houseEdge));
  
  return { winningLines, totalPayout, jackpot };
};

// Validation rules
const spinValidation = [
  body('betAmount')
    .isFloat({ min: 10, max: 25000 })
    .withMessage('Bet amount must be between 10 and 25,000 KES'),
  body('paylines')
    .isInt({ min: 1, max: 9 })
    .withMessage('Paylines must be between 1 and 9')
];

// @route   POST /api/games/slots/spin
// @desc    Spin the slot machine
// @access  Private
router.post('/spin', gameRateLimiter, spinValidation, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return next(new ApiError('Validation failed', 400));
    }

    const userId = req.user!._id;
    const { betAmount, paylines } = req.body;

    // Check if user has sufficient balance
    const user = await UserModel.findById(userId);
    if (!user) {
      return next(new ApiError('User not found', 404));
    }

    if (user.balance < betAmount) {
      return next(new ApiError('Insufficient balance', 400));
    }

    // Spin the reels
    const reels = spinReels();
    const { winningLines, totalPayout, jackpot } = calculateSlotWinnings(reels, betAmount, paylines);

    // Create game session
    const sessionId = uuidv4();
    const gameSession = new GameSessionModel({
      sessionId,
      userId,
      gameType: 'slots',
      totalBet: betAmount,
      totalWinnings: totalPayout,
      status: 'completed',
      gameData: {
        reels,
        winningLines,
        totalPayout,
        jackpot,
        betAmount,
        paylines
      }
    });

    await gameSession.save();

    // Create bet transaction
    const betTransaction = new TransactionModel({
      userId,
      type: 'bet',
      amount: -betAmount,
      currency: 'KES',
      game: 'slots',
      gameSessionId: sessionId,
      status: 'completed',
      description: `Slots bet of ${betAmount} KES`
    });

    await betTransaction.save();

    // Update user balance (deduct bet)
    await UserModel.findByIdAndUpdate(userId, {
      $inc: { balance: -betAmount }
    });

    // Create win transaction if there's a payout
    if (totalPayout > 0) {
      const winTransaction = new TransactionModel({
        userId,
        type: 'win',
        amount: totalPayout,
        currency: 'KES',
        game: 'slots',
        gameSessionId: sessionId,
        status: 'completed',
        description: `Slots win of ${totalPayout} KES${jackpot ? ' (JACKPOT!)' : ''}`
      });

      await winTransaction.save();

      // Update user balance (add winnings)
      await UserModel.findByIdAndUpdate(userId, {
        $inc: { balance: totalPayout }
      });
    }

    const gameState: SlotsGameState = {
      sessionId,
      reels,
      winningLines,
      totalPayout,
      jackpot,
      betAmount,
      paylines
    };

    const response: ApiResponse = {
      success: true,
      message: jackpot ? 'JACKPOT! Congratulations!' : totalPayout > 0 ? 'You won!' : 'Better luck next time!',
      data: { gameState }
    };

    res.status(201).json(response);
  } catch (error) {
    next(error);
  }
});

// @route   GET /api/games/slots/result/:sessionId
// @desc    Get slot spin result
// @access  Private
router.get('/result/:sessionId', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!._id;
    const { sessionId } = req.params;

    const gameSession = await GameSessionModel.findOne({
      sessionId,
      userId,
      gameType: 'slots'
    });

    if (!gameSession) {
      return next(new ApiError('Game session not found', 404));
    }

    const gameState: SlotsGameState = {
      sessionId,
      reels: gameSession.gameData.reels,
      winningLines: gameSession.gameData.winningLines,
      totalPayout: gameSession.gameData.totalPayout,
      jackpot: gameSession.gameData.jackpot,
      betAmount: gameSession.gameData.betAmount,
      paylines: gameSession.gameData.paylines
    };

    const response: ApiResponse = {
      success: true,
      data: { gameState }
    };

    res.json(response);
  } catch (error) {
    next(error);
  }
});

// @route   GET /api/games/slots/paytable
// @desc    Get slots paytable information
// @access  Private
router.get('/paytable', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const paytable = Object.entries(SLOT_SYMBOLS).map(([symbol, config]) => ({
      symbol,
      payouts: config.payout,
      frequency: `${((config.weight / 100) * 100).toFixed(1)}%`
    }));

    const response: ApiResponse = {
      success: true,
      data: {
        paytable,
        houseEdge: `${(100 - HOUSE_EDGE_CONFIG.slots.returnToPlayer).toFixed(1)}%`,
        returnToPlayer: `${HOUSE_EDGE_CONFIG.slots.returnToPlayer}%`,
        maxPaylines: PAYLINES.length
      }
    };

    res.json(response);
  } catch (error) {
    next(error);
  }
});

export default router;
