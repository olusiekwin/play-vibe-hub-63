import { Router } from 'express';
import { body, validationResult } from 'express-validator';
import { authenticate } from '../middleware/auth.js';
import { GameSession } from '../models/GameSession.js';
import { Transaction } from '../models/Transaction.js';
import { User } from '../models/User.js';
import { ApiError } from '../utils/ApiError.js';
import { applyHouseEdge } from '../utils/houseEdge.js';

const router = Router();

// Apply authentication to all routes
router.use(authenticate);

// Slot machine symbols and their weights
const SYMBOLS = {
  '🍒': { value: 2, weight: 100 },    // Cherry - most common
  '🍋': { value: 3, weight: 80 },     // Lemon
  '🍊': { value: 4, weight: 60 },     // Orange
  '🍇': { value: 5, weight: 40 },     // Grapes
  '🔔': { value: 10, weight: 20 },    // Bell
  '⭐': { value: 15, weight: 10 },    // Star
  '💎': { value: 50, weight: 5 },     // Diamond - rarest
  '7️⃣': { value: 100, weight: 2 }     // Lucky 7 - jackpot
};

// @route   POST /api/slots/spin
// @desc    Spin the slot machine
// @access  Private
router.post('/spin', [
  body('betAmount').isFloat({ min: 10 }).withMessage('Minimum bet is 10 KES'),
  body('lines').optional().isInt({ min: 1, max: 25 }).withMessage('Lines must be between 1 and 25')
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ApiError('Validation failed', 400, errors.array());
    }

    const { betAmount, lines = 1 } = req.body;
    const user = await User.findById(req.user._id);
    const totalBet = betAmount * lines;

    if (user.balance < totalBet) {
      throw new ApiError('Insufficient balance', 400);
    }

    // Generate 5x3 slot grid
    const grid = generateSlotGrid();
    
    // Check for winning combinations
    const winningLines = checkWinningLines(grid, lines);
    const totalPayout = calculateSlotPayout(winningLines, betAmount);
    
    // Create game session
    const gameSession = new GameSession({
      userId: user._id,
      gameType: 'slots',
      betAmount: totalBet,
      gameState: {
        grid,
        lines,
        betPerLine: betAmount,
        winningLines,
        totalPayout,
        symbols: Object.keys(SYMBOLS)
      },
      status: 'completed',
      outcome: totalPayout > totalBet ? 'win' : totalPayout === totalBet ? 'push' : 'lose',
      payout: totalPayout
    });

    await gameSession.save();

    // Update user balance
    user.balance = user.balance - totalBet + totalPayout;
    await user.save();

    // Create bet transaction
    const betTransaction = new Transaction({
      userId: user._id,
      gameSessionId: gameSession._id,
      type: 'game_bet',
      amount: -totalBet,
      description: `Slots bet (${lines} lines)`,
      balanceBefore: user.balance + totalBet - totalPayout,
      balanceAfter: user.balance - totalPayout
    });
    await betTransaction.save();

    // Create payout transaction if there's a win
    if (totalPayout > 0) {
      const payoutTransaction = new Transaction({
        userId: user._id,
        gameSessionId: gameSession._id,
        type: 'game_win',
        amount: totalPayout,
        description: 'Slots win',
        balanceBefore: user.balance - totalPayout,
        balanceAfter: user.balance
      });
      await payoutTransaction.save();
    }

    const response = {
      success: true,
      message: 'Slot machine spin completed',
      data: {
        gameId: gameSession._id,
        grid,
        lines,
        betPerLine: betAmount,
        totalBet,
        winningLines,
        totalPayout,
        netResult: totalPayout - totalBet,
        balance: user.balance,
        isJackpot: winningLines.some(line => line.isJackpot)
      }
    };

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
});

// @route   GET /api/slots/paytable
// @desc    Get slot machine paytable
// @access  Private
router.get('/paytable', async (req, res, next) => {
  try {
    const paytable = [];
    
    for (const [symbol, data] of Object.entries(SYMBOLS)) {
      paytable.push({
        symbol,
        value: data.value,
        payouts: {
          3: data.value,
          4: data.value * 5,
          5: data.value * 25
        }
      });
    }

    const response = {
      success: true,
      message: 'Paytable retrieved',
      data: {
        paytable,
        specialRules: [
          'Match 3 or more symbols in a line to win',
          'Payouts are multiplied by bet per line',
          '7️⃣ symbols create jackpot combinations',
          'Maximum 25 paylines available'
        ]
      }
    };

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
});

// @route   GET /api/slots/history
// @desc    Get slots game history
// @access  Private
router.get('/history', async (req, res, next) => {
  try {
    const { page = 1, limit = 20 } = req.query;

    const games = await GameSession.find({
      userId: req.user._id,
      gameType: 'slots'
    })
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await GameSession.countDocuments({
      userId: req.user._id,
      gameType: 'slots'
    });

    const response = {
      success: true,
      message: 'Slots history retrieved',
      data: {
        games: games.map(game => ({
          id: game._id,
          grid: game.gameState.grid,
          lines: game.gameState.lines,
          betAmount: game.betAmount,
          payout: game.payout,
          netResult: game.payout - game.betAmount,
          outcome: game.outcome,
          winningLines: game.gameState.winningLines?.length || 0,
          createdAt: game.createdAt
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

// Helper functions
function generateSlotGrid() {
  const grid = [];
  
  for (let row = 0; row < 3; row++) {
    const rowSymbols = [];
    for (let col = 0; col < 5; col++) {
      rowSymbols.push(getRandomSymbol());
    }
    grid.push(rowSymbols);
  }
  
  return grid;
}

function getRandomSymbol() {
  const symbols = Object.keys(SYMBOLS);
  const weights = Object.values(SYMBOLS).map(s => s.weight);
  const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
  
  let random = Math.random() * totalWeight;
  
  for (let i = 0; i < symbols.length; i++) {
    random -= weights[i];
    if (random <= 0) {
      return symbols[i];
    }
  }
  
  return symbols[0]; // Fallback
}

function checkWinningLines(grid, activeLines) {
  const winningLines = [];
  
  // Define paylines (row indices for each column)
  const paylines = [
    [1, 1, 1, 1, 1], // Middle row
    [0, 0, 0, 0, 0], // Top row
    [2, 2, 2, 2, 2], // Bottom row
    [0, 1, 2, 1, 0], // V shape
    [2, 1, 0, 1, 2], // ^ shape
    [1, 0, 0, 0, 1], // Top V
    [1, 2, 2, 2, 1], // Bottom V
    [0, 0, 1, 2, 2], // Zigzag 1
    [2, 2, 1, 0, 0], // Zigzag 2
    [1, 2, 1, 0, 1], // W shape
    [1, 0, 1, 2, 1], // M shape
    [0, 1, 0, 1, 0], // Up-down
    [2, 1, 2, 1, 2], // Down-up
    [0, 2, 0, 2, 0], // Zigzag 3
    [2, 0, 2, 0, 2], // Zigzag 4
    [1, 1, 0, 1, 1], // Top dip
    [1, 1, 2, 1, 1], // Bottom dip
    [0, 1, 1, 1, 0], // Mountain
    [2, 1, 1, 1, 2], // Valley
    [0, 0, 2, 0, 0], // Top-bottom-top
    [2, 2, 0, 2, 2], // Bottom-top-bottom
    [1, 0, 2, 0, 1], // Cross 1
    [1, 2, 0, 2, 1], // Cross 2
    [0, 2, 1, 2, 0], // Bottom zigzag
    [2, 0, 1, 0, 2]  // Top zigzag
  ];
  
  for (let lineIndex = 0; lineIndex < Math.min(activeLines, paylines.length); lineIndex++) {
    const payline = paylines[lineIndex];
    const lineSymbols = payline.map((row, col) => grid[row][col]);
    
    // Check for winning combinations
    const winData = checkLineWin(lineSymbols, lineIndex + 1);
    if (winData) {
      winningLines.push(winData);
    }
  }
  
  return winningLines;
}

function checkLineWin(lineSymbols, lineNumber) {
  // Count consecutive symbols from left
  const firstSymbol = lineSymbols[0];
  let consecutiveCount = 1;
  
  for (let i = 1; i < lineSymbols.length; i++) {
    if (lineSymbols[i] === firstSymbol) {
      consecutiveCount++;
    } else {
      break;
    }
  }
  
  // Need at least 3 consecutive symbols to win
  if (consecutiveCount >= 3) {
    const symbolData = SYMBOLS[firstSymbol];
    const isJackpot = firstSymbol === '7️⃣' && consecutiveCount === 5;
    
    return {
      lineNumber,
      symbol: firstSymbol,
      count: consecutiveCount,
      baseValue: symbolData.value,
      multiplier: getPayoutMultiplier(consecutiveCount),
      isJackpot
    };
  }
  
  return null;
}

function getPayoutMultiplier(count) {
  switch (count) {
    case 3: return 1;
    case 4: return 5;
    case 5: return 25;
    default: return 0;
  }
}

function calculateSlotPayout(winningLines, betPerLine) {
  let totalPayout = 0;
  
  for (const line of winningLines) {
    let linePayout = line.baseValue * line.multiplier * betPerLine;
    
    // Jackpot bonus for 5 sevens
    if (line.isJackpot) {
      linePayout *= 10; // 10x multiplier for jackpot
    }
    
    totalPayout += linePayout;
  }
  
  return totalPayout;
}

export default router;
