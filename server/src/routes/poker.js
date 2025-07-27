import { Router } from 'express';
import { body, validationResult } from 'express-validator';
import { authenticate } from '../middleware/auth.js';
import { GameSession } from '../models/GameSession.js';
import { Transaction } from '../models/Transaction.js';
import { User } from '../models/User.js';
import { ApiError } from '../utils/ApiError.js';

const router = Router();

// Apply authentication to all routes
router.use(authenticate);

// Poker hand rankings
const HAND_RANKINGS = {
  'royal_flush': 1000,
  'straight_flush': 500,
  'four_of_a_kind': 100,
  'full_house': 50,
  'flush': 25,
  'straight': 15,
  'three_of_a_kind': 10,
  'two_pair': 5,
  'jacks_or_better': 2,
  'high_card': 0
};

// @route   POST /api/poker/start
// @desc    Start a new video poker game
// @access  Private
router.post('/start', [
  body('betAmount').isFloat({ min: 10 }).withMessage('Minimum bet is 10 KES')
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ApiError('Validation failed', 400, errors.array());
    }

    const { betAmount } = req.body;
    const user = await User.findById(req.user._id);

    if (user.balance < betAmount) {
      throw new ApiError('Insufficient balance', 400);
    }

    // Create and shuffle deck
    const deck = createDeck();
    shuffleDeck(deck);

    // Deal 5 cards
    const hand = [];
    for (let i = 0; i < 5; i++) {
      hand.push(deck.pop());
    }

    // Create game session
    const gameSession = new GameSession({
      userId: user._id,
      gameType: 'poker',
      betAmount,
      gameState: {
        deck,
        hand,
        held: [false, false, false, false, false],
        stage: 'deal',
        finalHand: null,
        handRank: null
      },
      status: 'active'
    });

    await gameSession.save();

    // Deduct bet amount
    user.balance -= betAmount;
    await user.save();

    // Create bet transaction
    const transaction = new Transaction({
      userId: user._id,
      gameSessionId: gameSession._id,
      type: 'game_bet',
      amount: -betAmount,
      description: 'Video poker bet',
      balanceBefore: user.balance + betAmount,
      balanceAfter: user.balance
    });
    await transaction.save();

    const response = {
      success: true,
      message: 'Poker game started',
      data: {
        gameId: gameSession._id,
        hand: hand.map((card, index) => ({
          ...card,
          position: index,
          held: false
        })),
        stage: 'deal',
        balance: user.balance,
        actions: ['hold', 'draw']
      }
    };

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
});

// @route   POST /api/poker/hold
// @desc    Hold/unhold cards in poker game
// @access  Private
router.post('/hold', [
  body('gameId').isMongoId().withMessage('Invalid game ID'),
  body('positions').isArray().withMessage('Positions must be an array'),
  body('positions.*').isInt({ min: 0, max: 4 }).withMessage('Invalid card position')
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ApiError('Validation failed', 400, errors.array());
    }

    const { gameId, positions } = req.body;
    const gameSession = await GameSession.findById(gameId);

    if (!gameSession || gameSession.userId.toString() !== req.user._id.toString()) {
      throw new ApiError('Game not found', 404);
    }

    if (gameSession.status !== 'active' || gameSession.gameState.stage !== 'deal') {
      throw new ApiError('Cannot hold cards at this stage', 400);
    }

    // Update held cards
    const held = [false, false, false, false, false];
    positions.forEach(pos => {
      if (pos >= 0 && pos <= 4) {
        held[pos] = true;
      }
    });

    gameSession.gameState.held = held;
    await gameSession.save();

    const response = {
      success: true,
      message: 'Cards held',
      data: {
        gameId: gameSession._id,
        hand: gameSession.gameState.hand.map((card, index) => ({
          ...card,
          position: index,
          held: held[index]
        })),
        stage: 'deal',
        actions: ['hold', 'draw']
      }
    };

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
});

// @route   POST /api/poker/draw
// @desc    Draw new cards to replace non-held cards
// @access  Private
router.post('/draw', [
  body('gameId').isMongoId().withMessage('Invalid game ID')
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ApiError('Validation failed', 400, errors.array());
    }

    const { gameId } = req.body;
    const gameSession = await GameSession.findById(gameId);
    const user = await User.findById(req.user._id);

    if (!gameSession || gameSession.userId.toString() !== req.user._id.toString()) {
      throw new ApiError('Game not found', 404);
    }

    if (gameSession.status !== 'active' || gameSession.gameState.stage !== 'deal') {
      throw new ApiError('Cannot draw cards at this stage', 400);
    }

    const gameState = gameSession.gameState;
    const finalHand = [...gameState.hand];

    // Replace non-held cards
    for (let i = 0; i < 5; i++) {
      if (!gameState.held[i]) {
        finalHand[i] = gameState.deck.pop();
      }
    }

    // Evaluate final hand
    const handRank = evaluateHand(finalHand);
    const payout = calculatePayout(handRank, gameSession.betAmount);

    // Update game state
    gameState.finalHand = finalHand;
    gameState.handRank = handRank;
    gameState.stage = 'complete';
    gameSession.status = 'completed';
    gameSession.outcome = payout > 0 ? 'win' : 'lose';
    gameSession.payout = payout;

    // Update user balance
    user.balance += payout;

    await Promise.all([gameSession.save(), user.save()]);

    // Create payout transaction if there's a win
    if (payout > 0) {
      const payoutTransaction = new Transaction({
        userId: user._id,
        gameSessionId: gameSession._id,
        type: 'game_win',
        amount: payout,
        description: `Video poker win (${handRank.name})`,
        balanceBefore: user.balance - payout,
        balanceAfter: user.balance
      });
      await payoutTransaction.save();
    }

    const response = {
      success: true,
      message: 'Cards drawn, game complete',
      data: {
        gameId: gameSession._id,
        finalHand: finalHand.map((card, index) => ({
          ...card,
          position: index,
          held: gameState.held[index]
        })),
        handRank: handRank.name,
        payout,
        stage: 'complete',
        balance: user.balance
      }
    };

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
});

// @route   GET /api/poker/paytable
// @desc    Get video poker paytable
// @access  Private
router.get('/paytable', async (req, res, next) => {
  try {
    const paytable = [];
    
    for (const [handName, multiplier] of Object.entries(HAND_RANKINGS)) {
      if (multiplier > 0) {
        paytable.push({
          hand: handName.replace('_', ' ').toUpperCase(),
          payout: `${multiplier}:1`
        });
      }
    }

    const response = {
      success: true,
      message: 'Paytable retrieved',
      data: {
        paytable: paytable.reverse(), // Show best hands first
        rules: [
          'Minimum qualifying hand: Jacks or Better',
          'Hold cards you want to keep, then draw',
          'Payouts are multiplied by bet amount',
          'Royal Flush pays the maximum jackpot'
        ]
      }
    };

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
});

// Helper functions
function createDeck() {
  const suits = ['hearts', 'diamonds', 'clubs', 'spades'];
  const values = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
  const deck = [];

  for (const suit of suits) {
    for (const value of values) {
      deck.push({ suit, value });
    }
  }

  return deck;
}

function shuffleDeck(deck) {
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
}

function evaluateHand(hand) {
  const values = hand.map(card => getCardValue(card.value));
  const suits = hand.map(card => card.suit);
  
  // Sort values for easier analysis
  values.sort((a, b) => a - b);
  
  const isFlush = suits.every(suit => suit === suits[0]);
  const isStraight = checkStraight(values);
  const valueCounts = getValueCounts(values);
  
  // Check for specific hands
  if (isFlush && isStraight && values[0] === 10) {
    return { name: 'royal_flush', rank: 1 };
  }
  
  if (isFlush && isStraight) {
    return { name: 'straight_flush', rank: 2 };
  }
  
  if (valueCounts.includes(4)) {
    return { name: 'four_of_a_kind', rank: 3 };
  }
  
  if (valueCounts.includes(3) && valueCounts.includes(2)) {
    return { name: 'full_house', rank: 4 };
  }
  
  if (isFlush) {
    return { name: 'flush', rank: 5 };
  }
  
  if (isStraight) {
    return { name: 'straight', rank: 6 };
  }
  
  if (valueCounts.includes(3)) {
    return { name: 'three_of_a_kind', rank: 7 };
  }
  
  if (valueCounts.filter(count => count === 2).length === 2) {
    return { name: 'two_pair', rank: 8 };
  }
  
  if (valueCounts.includes(2)) {
    // Check if pair is Jacks or better
    const pairValue = getPairValue(hand);
    if (pairValue >= 11) { // J, Q, K, A
      return { name: 'jacks_or_better', rank: 9 };
    }
  }
  
  return { name: 'high_card', rank: 10 };
}

function getCardValue(value) {
  if (value === 'A') return 14;
  if (value === 'K') return 13;
  if (value === 'Q') return 12;
  if (value === 'J') return 11;
  return parseInt(value);
}

function checkStraight(values) {
  // Check for regular straight
  for (let i = 1; i < values.length; i++) {
    if (values[i] !== values[i - 1] + 1) {
      // Check for A-2-3-4-5 straight (wheel)
      if (values[0] === 2 && values[1] === 3 && values[2] === 4 && values[3] === 5 && values[4] === 14) {
        return true;
      }
      return false;
    }
  }
  return true;
}

function getValueCounts(values) {
  const counts = {};
  values.forEach(value => {
    counts[value] = (counts[value] || 0) + 1;
  });
  return Object.values(counts).sort((a, b) => b - a);
}

function getPairValue(hand) {
  const valueCounts = {};
  hand.forEach(card => {
    const value = getCardValue(card.value);
    valueCounts[value] = (valueCounts[value] || 0) + 1;
  });
  
  for (const [value, count] of Object.entries(valueCounts)) {
    if (count === 2) {
      return parseInt(value);
    }
  }
  
  return 0;
}

function calculatePayout(handRank, betAmount) {
  const multiplier = HAND_RANKINGS[handRank.name] || 0;
  return betAmount * multiplier;
}

export default router;
