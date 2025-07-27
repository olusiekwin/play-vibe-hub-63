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

// Roulette numbers and their colors
const ROULETTE_NUMBERS = {
  0: 'green',
  1: 'red', 2: 'black', 3: 'red', 4: 'black', 5: 'red', 6: 'black',
  7: 'red', 8: 'black', 9: 'red', 10: 'black', 11: 'black', 12: 'red',
  13: 'black', 14: 'red', 15: 'black', 16: 'red', 17: 'black', 18: 'red',
  19: 'red', 20: 'black', 21: 'red', 22: 'black', 23: 'red', 24: 'black',
  25: 'red', 26: 'black', 27: 'red', 28: 'black', 29: 'black', 30: 'red',
  31: 'black', 32: 'red', 33: 'black', 34: 'red', 35: 'black', 36: 'red'
};

// @route   POST /api/roulette/spin
// @desc    Place a bet and spin the roulette wheel
// @access  Private
router.post('/spin', [
  body('bets').isArray({ min: 1 }).withMessage('At least one bet is required'),
  body('bets.*.type').isIn(['straight', 'split', 'street', 'corner', 'line', 'dozen', 'column', 'red', 'black', 'odd', 'even', 'low', 'high']).withMessage('Invalid bet type'),
  body('bets.*.amount').isFloat({ min: 10 }).withMessage('Minimum bet is 10 KES'),
  body('bets.*.numbers').optional().isArray().withMessage('Numbers must be an array')
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ApiError('Validation failed', 400, errors.array());
    }

    const { bets } = req.body;
    const user = await User.findById(req.user._id);

    // Calculate total bet amount
    const totalBetAmount = bets.reduce((sum, bet) => sum + bet.amount, 0);

    if (user.balance < totalBetAmount) {
      throw new ApiError('Insufficient balance', 400);
    }

    // Validate bets
    for (const bet of bets) {
      if (!validateBet(bet)) {
        throw new ApiError(`Invalid bet: ${bet.type}`, 400);
      }
    }

    // Spin the wheel (generate random number 0-36)
    const winningNumber = Math.floor(Math.random() * 37);
    const winningColor = ROULETTE_NUMBERS[winningNumber];

    // Calculate payouts
    let totalPayout = 0;
    const betResults = [];

    for (const bet of bets) {
      const isWin = checkWin(bet, winningNumber, winningColor);
      const payout = isWin ? calculatePayout(bet) : 0;
      totalPayout += payout;
      
      betResults.push({
        ...bet,
        isWin,
        payout
      });
    }

    // Create game session
    const gameSession = new GameSession({
      userId: user._id,
      gameType: 'roulette',
      betAmount: totalBetAmount,
      gameState: {
        bets,
        winningNumber,
        winningColor,
        betResults,
        totalPayout
      },
      status: 'completed',
      outcome: totalPayout > totalBetAmount ? 'win' : totalPayout === totalBetAmount ? 'push' : 'lose',
      payout: totalPayout
    });

    await gameSession.save();

    // Update user balance
    user.balance = user.balance - totalBetAmount + totalPayout;
    await user.save();

    // Create bet transaction
    const betTransaction = new Transaction({
      userId: user._id,
      gameSessionId: gameSession._id,
      type: 'game_bet',
      amount: -totalBetAmount,
      description: 'Roulette bet',
      balanceBefore: user.balance + totalBetAmount - totalPayout,
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
        description: 'Roulette win',
        balanceBefore: user.balance - totalPayout,
        balanceAfter: user.balance
      });
      await payoutTransaction.save();
    }

    const response = {
      success: true,
      message: 'Roulette spin completed',
      data: {
        gameId: gameSession._id,
        winningNumber,
        winningColor,
        bets: betResults,
        totalBetAmount,
        totalPayout,
        netResult: totalPayout - totalBetAmount,
        balance: user.balance
      }
    };

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
});

// @route   GET /api/roulette/history
// @desc    Get roulette game history
// @access  Private
router.get('/history', async (req, res, next) => {
  try {
    const { page = 1, limit = 20 } = req.query;

    const games = await GameSession.find({
      userId: req.user._id,
      gameType: 'roulette'
    })
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await GameSession.countDocuments({
      userId: req.user._id,
      gameType: 'roulette'
    });

    const response = {
      success: true,
      message: 'Roulette history retrieved',
      data: {
        games: games.map(game => ({
          id: game._id,
          winningNumber: game.gameState.winningNumber,
          winningColor: game.gameState.winningColor,
          betAmount: game.betAmount,
          payout: game.payout,
          netResult: game.payout - game.betAmount,
          outcome: game.outcome,
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
function validateBet(bet) {
  const { type, numbers } = bet;

  switch (type) {
    case 'straight':
      return numbers && numbers.length === 1 && numbers[0] >= 0 && numbers[0] <= 36;
    case 'split':
      return numbers && numbers.length === 2 && areAdjacent(numbers[0], numbers[1]);
    case 'street':
      return numbers && numbers.length === 3 && areInSameRow(numbers);
    case 'corner':
      return numbers && numbers.length === 4 && areCornerNumbers(numbers);
    case 'line':
      return numbers && numbers.length === 6 && areTwoAdjacentRows(numbers);
    case 'dozen':
      return numbers && numbers.length === 1 && [1, 2, 3].includes(numbers[0]);
    case 'column':
      return numbers && numbers.length === 1 && [1, 2, 3].includes(numbers[0]);
    case 'red':
    case 'black':
    case 'odd':
    case 'even':
    case 'low':
    case 'high':
      return !numbers || numbers.length === 0;
    default:
      return false;
  }
}

function areAdjacent(num1, num2) {
  // Simplified adjacency check for roulette table
  const diff = Math.abs(num1 - num2);
  return diff === 1 || diff === 3;
}

function areInSameRow(numbers) {
  // Check if three numbers are in the same row
  const rows = [
    [1, 2, 3], [4, 5, 6], [7, 8, 9], [10, 11, 12],
    [13, 14, 15], [16, 17, 18], [19, 20, 21], [22, 23, 24],
    [25, 26, 27], [28, 29, 30], [31, 32, 33], [34, 35, 36]
  ];
  
  return rows.some(row => 
    numbers.every(num => row.includes(num)) && numbers.length === 3
  );
}

function areCornerNumbers(numbers) {
  // Check if four numbers form a corner (square) on the table
  const corners = [
    [1, 2, 4, 5], [2, 3, 5, 6], [4, 5, 7, 8], [5, 6, 8, 9],
    [7, 8, 10, 11], [8, 9, 11, 12], [10, 11, 13, 14], [11, 12, 14, 15],
    [13, 14, 16, 17], [14, 15, 17, 18], [16, 17, 19, 20], [17, 18, 20, 21],
    [19, 20, 22, 23], [20, 21, 23, 24], [22, 23, 25, 26], [23, 24, 26, 27],
    [25, 26, 28, 29], [26, 27, 29, 30], [28, 29, 31, 32], [29, 30, 32, 33],
    [31, 32, 34, 35], [32, 33, 35, 36]
  ];
  
  return corners.some(corner => 
    numbers.every(num => corner.includes(num)) && numbers.length === 4
  );
}

function areTwoAdjacentRows(numbers) {
  // Check if six numbers form two adjacent rows
  const doubleRows = [
    [1, 2, 3, 4, 5, 6], [4, 5, 6, 7, 8, 9], [7, 8, 9, 10, 11, 12],
    [10, 11, 12, 13, 14, 15], [13, 14, 15, 16, 17, 18], [16, 17, 18, 19, 20, 21],
    [19, 20, 21, 22, 23, 24], [22, 23, 24, 25, 26, 27], [25, 26, 27, 28, 29, 30],
    [28, 29, 30, 31, 32, 33], [31, 32, 33, 34, 35, 36]
  ];
  
  return doubleRows.some(doubleRow => 
    numbers.every(num => doubleRow.includes(num)) && numbers.length === 6
  );
}

function checkWin(bet, winningNumber, winningColor) {
  const { type, numbers } = bet;

  switch (type) {
    case 'straight':
      return numbers[0] === winningNumber;
    case 'split':
      return numbers.includes(winningNumber);
    case 'street':
      return numbers.includes(winningNumber);
    case 'corner':
      return numbers.includes(winningNumber);
    case 'line':
      return numbers.includes(winningNumber);
    case 'dozen':
      const dozen = numbers[0];
      if (dozen === 1) return winningNumber >= 1 && winningNumber <= 12;
      if (dozen === 2) return winningNumber >= 13 && winningNumber <= 24;
      if (dozen === 3) return winningNumber >= 25 && winningNumber <= 36;
      return false;
    case 'column':
      const column = numbers[0];
      if (column === 1) return winningNumber % 3 === 1 && winningNumber > 0;
      if (column === 2) return winningNumber % 3 === 2 && winningNumber > 0;
      if (column === 3) return winningNumber % 3 === 0 && winningNumber > 0;
      return false;
    case 'red':
      return winningColor === 'red';
    case 'black':
      return winningColor === 'black';
    case 'odd':
      return winningNumber > 0 && winningNumber % 2 === 1;
    case 'even':
      return winningNumber > 0 && winningNumber % 2 === 0;
    case 'low':
      return winningNumber >= 1 && winningNumber <= 18;
    case 'high':
      return winningNumber >= 19 && winningNumber <= 36;
    default:
      return false;
  }
}

function calculatePayout(bet) {
  const { type, amount } = bet;
  
  const payoutMultipliers = {
    straight: 35,      // 35:1
    split: 17,         // 17:1
    street: 11,        // 11:1
    corner: 8,         // 8:1
    line: 5,           // 5:1
    dozen: 2,          // 2:1
    column: 2,         // 2:1
    red: 1,            // 1:1
    black: 1,          // 1:1
    odd: 1,            // 1:1
    even: 1,           // 1:1
    low: 1,            // 1:1
    high: 1            // 1:1
  };

  const multiplier = payoutMultipliers[type] || 0;
  return amount * (multiplier + 1); // Include original bet in payout
}

export default router;
