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

// @route   POST /api/blackjack/start
// @desc    Start a new blackjack game
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

    // Create deck and shuffle
    const deck = createDeck();
    shuffleDeck(deck);

    // Deal initial cards
    const playerCards = [drawCard(deck), drawCard(deck)];
    const dealerCards = [drawCard(deck), drawCard(deck)];

    // Calculate hand values
    const playerValue = calculateHandValue(playerCards);
    const dealerUpCard = dealerCards[0];

    // Create game session
    const gameSession = new GameSession({
      userId: user._id,
      gameType: 'blackjack',
      betAmount,
      gameState: {
        deck,
        playerCards,
        dealerCards,
        playerValue,
        dealerValue: calculateHandValue([dealerUpCard]),
        status: playerValue === 21 ? 'blackjack' : 'playing',
        canDoubleDown: true,
        canSplit: playerCards[0].value === playerCards[1].value
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
      description: 'Blackjack bet',
      balanceBefore: user.balance + betAmount,
      balanceAfter: user.balance
    });
    await transaction.save();

    // Check for blackjack
    if (playerValue === 21) {
      return await handleBlackjack(gameSession, user, res);
    }

    const response = {
      success: true,
      message: 'Blackjack game started',
      data: {
        gameId: gameSession._id,
        playerCards: playerCards.map(card => ({ ...card, hidden: false })),
        dealerCards: [
          { ...dealerCards[0], hidden: false },
          { suit: 'hidden', value: 'hidden', hidden: true }
        ],
        playerValue,
        dealerValue: calculateHandValue([dealerUpCard]),
        status: 'playing',
        actions: ['hit', 'stand', ...(gameSession.gameState.canDoubleDown ? ['double'] : []), ...(gameSession.gameState.canSplit ? ['split'] : [])],
        balance: user.balance
      }
    };

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
});

// @route   POST /api/blackjack/action
// @desc    Perform action in blackjack game
// @access  Private
router.post('/action', [
  body('gameId').isMongoId().withMessage('Invalid game ID'),
  body('action').isIn(['hit', 'stand', 'double', 'split']).withMessage('Invalid action')
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ApiError('Validation failed', 400, errors.array());
    }

    const { gameId, action } = req.body;
    const gameSession = await GameSession.findById(gameId);
    const user = await User.findById(req.user._id);

    if (!gameSession || gameSession.userId.toString() !== req.user._id.toString()) {
      throw new ApiError('Game not found', 404);
    }

    if (gameSession.status !== 'active') {
      throw new ApiError('Game is not active', 400);
    }

    const gameState = gameSession.gameState;

    switch (action) {
      case 'hit':
        return await handleHit(gameSession, user, res);
      case 'stand':
        return await handleStand(gameSession, user, res);
      case 'double':
        return await handleDouble(gameSession, user, res);
      case 'split':
        return await handleSplit(gameSession, user, res);
      default:
        throw new ApiError('Invalid action', 400);
    }
  } catch (error) {
    next(error);
  }
});

// Helper functions
function createDeck() {
  const suits = ['hearts', 'diamonds', 'clubs', 'spades'];
  const values = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
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

function drawCard(deck) {
  return deck.pop();
}

function calculateHandValue(cards) {
  let value = 0;
  let aces = 0;

  for (const card of cards) {
    if (card.value === 'A') {
      aces++;
      value += 11;
    } else if (['J', 'Q', 'K'].includes(card.value)) {
      value += 10;
    } else {
      value += parseInt(card.value);
    }
  }

  // Adjust for aces
  while (value > 21 && aces > 0) {
    value -= 10;
    aces--;
  }

  return value;
}

async function handleBlackjack(gameSession, user, res) {
  const payout = gameSession.betAmount * 2.5; // 3:2 payout for blackjack
  
  user.balance += payout;
  gameSession.status = 'completed';
  gameSession.outcome = 'win';
  gameSession.payout = payout;
  gameSession.gameState.status = 'blackjack';

  await Promise.all([user.save(), gameSession.save()]);

  // Create win transaction
  const transaction = new Transaction({
    userId: user._id,
    gameSessionId: gameSession._id,
    type: 'game_win',
    amount: payout,
    description: 'Blackjack win',
    balanceBefore: user.balance - payout,
    balanceAfter: user.balance
  });
  await transaction.save();

  const response = {
    success: true,
    message: 'Blackjack! You win!',
    data: {
      gameId: gameSession._id,
      status: 'blackjack',
      payout,
      balance: user.balance
    }
  };

  res.status(200).json(response);
}

async function handleHit(gameSession, user, res) {
  const gameState = gameSession.gameState;
  const newCard = drawCard(gameState.deck);
  gameState.playerCards.push(newCard);
  gameState.playerValue = calculateHandValue(gameState.playerCards);
  gameState.canDoubleDown = false;
  gameState.canSplit = false;

  if (gameState.playerValue > 21) {
    // Bust
    gameSession.status = 'completed';
    gameSession.outcome = 'lose';
    gameSession.payout = 0;
    gameState.status = 'bust';
  } else if (gameState.playerValue === 21) {
    // Auto-stand on 21
    return await handleStand(gameSession, user, res);
  }

  await gameSession.save();

  const response = {
    success: true,
    message: gameState.playerValue > 21 ? 'Bust! You lose!' : 'Card dealt',
    data: {
      gameId: gameSession._id,
      playerCards: gameState.playerCards.map(card => ({ ...card, hidden: false })),
      playerValue: gameState.playerValue,
      status: gameState.status,
      actions: gameState.playerValue > 21 ? [] : ['hit', 'stand'],
      balance: user.balance,
      ...(gameSession.status === 'completed' && { payout: gameSession.payout })
    }
  };

  res.status(200).json(response);
}

async function handleStand(gameSession, user, res) {
  const gameState = gameSession.gameState;
  
  // Reveal dealer's hidden card
  let dealerValue = calculateHandValue(gameState.dealerCards);

  // Dealer hits on soft 17
  while (dealerValue < 17) {
    const newCard = drawCard(gameState.deck);
    gameState.dealerCards.push(newCard);
    dealerValue = calculateHandValue(gameState.dealerCards);
  }

  gameState.dealerValue = dealerValue;

  // Determine outcome
  let outcome;
  let payout = 0;

  if (dealerValue > 21) {
    outcome = 'win';
    payout = gameSession.betAmount * 2;
  } else if (gameState.playerValue > dealerValue) {
    outcome = 'win';
    payout = gameSession.betAmount * 2;
  } else if (gameState.playerValue === dealerValue) {
    outcome = 'push';
    payout = gameSession.betAmount; // Return bet
  } else {
    outcome = 'lose';
    payout = 0;
  }

  user.balance += payout;
  gameSession.status = 'completed';
  gameSession.outcome = outcome;
  gameSession.payout = payout;
  gameState.status = 'completed';

  await Promise.all([user.save(), gameSession.save()]);

  // Create transaction if there's a payout
  if (payout > 0) {
    const transaction = new Transaction({
      userId: user._id,
      gameSessionId: gameSession._id,
      type: outcome === 'push' ? 'game_refund' : 'game_win',
      amount: payout,
      description: `Blackjack ${outcome}`,
      balanceBefore: user.balance - payout,
      balanceAfter: user.balance
    });
    await transaction.save();
  }

  const response = {
    success: true,
    message: `Game completed: ${outcome}`,
    data: {
      gameId: gameSession._id,
      playerCards: gameState.playerCards.map(card => ({ ...card, hidden: false })),
      dealerCards: gameState.dealerCards.map(card => ({ ...card, hidden: false })),
      playerValue: gameState.playerValue,
      dealerValue: gameState.dealerValue,
      status: 'completed',
      outcome,
      payout,
      balance: user.balance
    }
  };

  res.status(200).json(response);
}

async function handleDouble(gameSession, user, res) {
  const gameState = gameSession.gameState;
  
  if (!gameState.canDoubleDown) {
    throw new ApiError('Cannot double down', 400);
  }

  if (user.balance < gameSession.betAmount) {
    throw new ApiError('Insufficient balance to double down', 400);
  }

  // Double the bet
  user.balance -= gameSession.betAmount;
  gameSession.betAmount *= 2;

  // Deal one card and stand
  const newCard = drawCard(gameState.deck);
  gameState.playerCards.push(newCard);
  gameState.playerValue = calculateHandValue(gameState.playerCards);

  await user.save();

  // Create additional bet transaction
  const transaction = new Transaction({
    userId: user._id,
    gameSessionId: gameSession._id,
    type: 'game_bet',
    amount: -gameSession.betAmount / 2,
    description: 'Blackjack double down',
    balanceBefore: user.balance + gameSession.betAmount / 2,
    balanceAfter: user.balance
  });
  await transaction.save();

  if (gameState.playerValue > 21) {
    // Bust
    gameSession.status = 'completed';
    gameSession.outcome = 'lose';
    gameSession.payout = 0;
    gameState.status = 'bust';
    
    await gameSession.save();

    const response = {
      success: true,
      message: 'Bust! You lose!',
      data: {
        gameId: gameSession._id,
        playerCards: gameState.playerCards.map(card => ({ ...card, hidden: false })),
        playerValue: gameState.playerValue,
        status: 'bust',
        outcome: 'lose',
        payout: 0,
        balance: user.balance
      }
    };

    return res.status(200).json(response);
  }

  // Auto-stand after double down
  return await handleStand(gameSession, user, res);
}

async function handleSplit(gameSession, user, res) {
  // Splitting implementation would be more complex
  // For now, return not implemented
  throw new ApiError('Split not implemented yet', 501);
}

export default router;
