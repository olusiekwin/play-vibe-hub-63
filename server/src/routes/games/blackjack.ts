import { Router, Request, Response, NextFunction } from 'express';
import { body, validationResult } from 'express-validator';
import { v4 as uuidv4 } from 'uuid';
import { GameSessionModel } from '@/models/GameSession';
import { TransactionModel } from '@/models/Transaction';
import { UserModel } from '@/models/User';
import { ApiError } from '@/utils/ApiError';
import { ApiResponse, AuthRequest, BlackjackGameState, BlackjackAction, Card } from '@/types';
import { authenticate } from '@/middleware/auth';
import { gameRateLimiter } from '@/middleware/rateLimiter';
import { HouseEdgeCalculator, HOUSE_EDGE_CONFIG } from '@/utils/houseEdge';

const router = Router();

// Apply authentication to all game routes
router.use(authenticate);

// Card deck utilities
const suits = ['hearts', 'diamonds', 'clubs', 'spades'] as const;
const ranks = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'] as const;

const createDeck = (): Card[] => {
  const deck: Card[] = [];
  for (const suit of suits) {
    for (const rank of ranks) {
      let value = 0;
      if (rank === 'A') {
        value = 11; // Ace starts as 11, adjusted later if needed
      } else if (['J', 'Q', 'K'].includes(rank)) {
        value = 10;
      } else {
        value = parseInt(rank);
      }
      deck.push({ suit, rank, value });
    }
  }
  return deck;
};

const shuffleDeck = (deck: Card[]): Card[] => {
  const shuffled = [...deck];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

const calculateScore = (hand: Card[]): number => {
  let score = 0;
  let aces = 0;
  
  for (const card of hand) {
    if (card.rank === 'A') {
      aces++;
      score += 11;
    } else {
      score += card.value;
    }
  }
  
  // Adjust for aces
  while (score > 21 && aces > 0) {
    score -= 10;
    aces--;
  }
  
  return score;
};

const determineGameStatus = (playerScore: number, dealerScore: number, playerHand: Card[], dealerHand: Card[]): string => {
  if (playerScore > 21) return 'dealer_wins';
  if (dealerScore > 21) return 'player_wins';
  if (playerScore === 21 && playerHand.length === 2) return 'player_blackjack';
  if (dealerScore === 21 && dealerHand.length === 2) return 'dealer_blackjack';
  if (playerScore > dealerScore) return 'player_wins';
  if (dealerScore > playerScore) return 'dealer_wins';
  return 'push';
};

// Validation rules
const dealValidation = [
  body('betAmount')
    .isFloat({ min: 50, max: 10000 })
    .withMessage('Bet amount must be between 50 and 10,000 KES')
];

const actionValidation = [
  body('sessionId')
    .notEmpty()
    .withMessage('Session ID is required'),
  body('action')
    .isIn(['hit', 'stand', 'double', 'split'])
    .withMessage('Action must be one of: hit, stand, double, split')
];

// @route   POST /api/games/blackjack/deal
// @desc    Start a new blackjack game
// @access  Private
router.post('/deal', gameRateLimiter, dealValidation, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return next(new ApiError('Validation failed', 400));
    }

    const userId = req.user!._id;
    const { betAmount } = req.body;

    // Check if user has sufficient balance
    const user = await UserModel.findById(userId);
    if (!user) {
      return next(new ApiError('User not found', 404));
    }

    if (user.balance < betAmount) {
      return next(new ApiError('Insufficient balance', 400));
    }

    // Check for existing active blackjack session
    const existingSession = await GameSessionModel.findOne({
      userId,
      gameType: 'blackjack',
      status: 'active'
    });

    if (existingSession) {
      return next(new ApiError('You already have an active blackjack game', 400));
    }

    // Create shuffled deck
    const deck = shuffleDeck(createDeck());

    // Deal initial cards
    const playerHand = [deck.pop()!, deck.pop()!];
    const dealerHand = [deck.pop()!, deck.pop()!];

    const playerScore = calculateScore(playerHand);
    const dealerScore = calculateScore([dealerHand[0]]); // Only show dealer's first card

    // Create game session
    const sessionId = uuidv4();
    const gameSession = new GameSessionModel({
      sessionId,
      userId,
      gameType: 'blackjack',
      totalBet: betAmount,
      status: 'active',
      gameData: {
        deck,
        playerHand,
        dealerHand,
        playerScore,
        dealerScore,
        betAmount,
        gameStatus: playerScore === 21 ? 'player_blackjack' : 'player_turn'
      }
    });

    await gameSession.save();

    // Create bet transaction
    const betTransaction = new TransactionModel({
      userId,
      type: 'bet',
      amount: -betAmount,
      currency: 'KES',
      game: 'blackjack',
      gameSessionId: sessionId,
      status: 'completed',
      description: `Blackjack bet of ${betAmount} KES`
    });

    await betTransaction.save();

    // Update user balance
    await UserModel.findByIdAndUpdate(userId, {
      $inc: { balance: -betAmount }
    });

    const gameState: BlackjackGameState = {
      sessionId,
      playerHand,
      dealerHand: [dealerHand[0], { suit: 'hearts', rank: 'A', value: 0 }], // Hide dealer's second card
      playerScore,
      dealerScore,
      gameStatus: gameSession.gameData.gameStatus,
      betAmount,
      canDouble: playerHand.length === 2 && user.balance >= betAmount,
      canSplit: playerHand.length === 2 && playerHand[0].rank === playerHand[1].rank && user.balance >= betAmount
    };

    // Handle automatic blackjack
    if (gameState.gameStatus === 'player_blackjack') {
      await handleGameEnd(gameSession, 'player_blackjack');
    }

    const response: ApiResponse = {
      success: true,
      message: 'Blackjack game started',
      data: { gameState }
    };

    res.status(201).json(response);
  } catch (error) {
    next(error);
  }
});

// @route   POST /api/games/blackjack/action
// @desc    Perform player action in blackjack
// @access  Private
router.post('/action', gameRateLimiter, actionValidation, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return next(new ApiError('Validation failed', 400));
    }

    const userId = req.user!._id;
    const { sessionId, action }: BlackjackAction = req.body;

    // Find the game session
    const gameSession = await GameSessionModel.findOne({
      sessionId,
      userId,
      gameType: 'blackjack',
      status: 'active'
    });

    if (!gameSession) {
      return next(new ApiError('Game session not found or already completed', 404));
    }

    const gameData = gameSession.gameData;
    let { deck, playerHand, dealerHand, playerScore, dealerScore, betAmount } = gameData;

    // Perform action
    switch (action) {
      case 'hit':
        if (deck.length === 0) {
          return next(new ApiError('No more cards in deck', 400));
        }
        playerHand.push(deck.pop()!);
        playerScore = calculateScore(playerHand);
        
        if (playerScore > 21) {
          gameData.gameStatus = 'dealer_wins';
        }
        break;

      case 'stand':
        // Dealer plays
        dealerScore = calculateScore(dealerHand);
        while (dealerScore < 17) {
          if (deck.length === 0) break;
          dealerHand.push(deck.pop()!);
          dealerScore = calculateScore(dealerHand);
        }
        gameData.gameStatus = determineGameStatus(playerScore, dealerScore, playerHand, dealerHand);
        break;

      case 'double':
        const user = await UserModel.findById(userId);
        if (!user || user.balance < betAmount) {
          return next(new ApiError('Insufficient balance to double', 400));
        }
        
        // Double the bet
        await UserModel.findByIdAndUpdate(userId, { $inc: { balance: -betAmount } });
        gameSession.totalBet += betAmount;
        
        // Hit once and stand
        if (deck.length > 0) {
          playerHand.push(deck.pop()!);
          playerScore = calculateScore(playerHand);
        }
        
        if (playerScore <= 21) {
          // Dealer plays
          dealerScore = calculateScore(dealerHand);
          while (dealerScore < 17) {
            if (deck.length === 0) break;
            dealerHand.push(deck.pop()!);
            dealerScore = calculateScore(dealerHand);
          }
          gameData.gameStatus = determineGameStatus(playerScore, dealerScore, playerHand, dealerHand);
        } else {
          gameData.gameStatus = 'dealer_wins';
        }
        
        betAmount *= 2;
        break;

      default:
        return next(new ApiError('Invalid action', 400));
    }

    // Update game data
    gameData.playerHand = playerHand;
    gameData.dealerHand = dealerHand;
    gameData.playerScore = playerScore;
    gameData.dealerScore = dealerScore;
    gameData.betAmount = betAmount;

    gameSession.gameData = gameData;
    await gameSession.save();

    // Handle game end
    if (['player_wins', 'dealer_wins', 'push', 'player_blackjack', 'dealer_blackjack'].includes(gameData.gameStatus)) {
      await handleGameEnd(gameSession, gameData.gameStatus);
    }

    const gameState: BlackjackGameState = {
      sessionId,
      playerHand,
      dealerHand,
      playerScore,
      dealerScore,
      gameStatus: gameData.gameStatus,
      betAmount,
      canDouble: false,
      canSplit: false
    };

    const response: ApiResponse = {
      success: true,
      message: `Action ${action} performed`,
      data: { gameState }
    };

    res.json(response);
  } catch (error) {
    next(error);
  }
});

// @route   GET /api/games/blackjack/state/:sessionId
// @desc    Get current game state
// @access  Private
router.get('/state/:sessionId', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!._id;
    const { sessionId } = req.params;

    const gameSession = await GameSessionModel.findOne({
      sessionId,
      userId,
      gameType: 'blackjack'
    });

    if (!gameSession) {
      return next(new ApiError('Game session not found', 404));
    }

    const gameData = gameSession.gameData;
    const gameState: BlackjackGameState = {
      sessionId,
      playerHand: gameData.playerHand,
      dealerHand: gameSession.status === 'active' && gameData.gameStatus === 'player_turn' 
        ? [gameData.dealerHand[0], { suit: 'hearts', rank: 'A', value: 0 }] // Hide dealer's second card
        : gameData.dealerHand,
      playerScore: gameData.playerScore,
      dealerScore: gameData.dealerScore,
      gameStatus: gameData.gameStatus,
      betAmount: gameData.betAmount,
      canDouble: gameSession.status === 'active' && gameData.playerHand.length === 2,
      canSplit: gameSession.status === 'active' && gameData.playerHand.length === 2 && 
               gameData.playerHand[0].rank === gameData.playerHand[1].rank
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

// Helper function to handle game end
async function handleGameEnd(gameSession: any, gameStatus: string) {
  const userId = gameSession.userId;
  const betAmount = gameSession.gameData.betAmount;
  let payout = 0;

  // Calculate payout with house edge considerations
  switch (gameStatus) {
    case 'player_wins':
      payout = betAmount * 2; // Return bet + win
      break;
    case 'player_blackjack':
      // Use configured blackjack payout (3:2 instead of 1:1 reduces house edge for player satisfaction)
      payout = betAmount * (1 + HOUSE_EDGE_CONFIG.blackjack.blackjackPayout);
      break;
    case 'push':
      payout = betAmount; // Return bet only
      break;
    case 'dealer_wins':
    case 'dealer_blackjack':
      payout = 0; // No payout - house wins
      break;
  }

  // Apply dynamic house edge adjustments
  const currentHour = new Date().getHours();
  if (HOUSE_EDGE_CONFIG.blackjack.dealerAdvantage && 
      [18, 19, 20, 21, 22].includes(currentHour)) {
    // Slightly reduce payouts during peak hours (increase house edge)
    payout = Math.floor(payout * 0.98); // 2% reduction
  }

  // Update game session
  gameSession.status = 'completed';
  gameSession.totalWinnings = payout;
  gameSession.endTime = new Date();
  await gameSession.save();

  // Create win transaction if there's a payout
  if (payout > 0) {
    const winTransaction = new TransactionModel({
      userId,
      type: 'win',
      amount: payout,
      currency: 'KES',
      game: 'blackjack',
      gameSessionId: gameSession.sessionId,
      status: 'completed',
      description: `Blackjack win of ${payout} KES`
    });

    await winTransaction.save();

    // Update user balance
    await UserModel.findByIdAndUpdate(userId, {
      $inc: { balance: payout }
    });
  }

  return payout;
}

export default router;
