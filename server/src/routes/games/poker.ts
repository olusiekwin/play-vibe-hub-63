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

// Poker types and interfaces
interface Card {
  suit: 'hearts' | 'diamonds' | 'clubs' | 'spades';
  rank: 'A' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K';
  value: number;
}

interface PokerPlayer {
  userId: string;
  username: string;
  chips: number;
  cards: Card[];
  currentBet: number;
  totalBet: number;
  status: 'active' | 'folded' | 'all-in' | 'disconnected';
  position: number;
}

interface PokerTable {
  tableId: string;
  players: PokerPlayer[];
  maxPlayers: number;
  smallBlind: number;
  bigBlind: number;
  communityCards: Card[];
  pot: number;
  currentPlayer: number;
  dealerPosition: number;
  gamePhase: 'waiting' | 'preflop' | 'flop' | 'turn' | 'river' | 'showdown' | 'ended';
  deck: Card[];
  lastAction: string;
  minimumBuyIn: number;
  maximumBuyIn: number;
}

interface PokerGameState {
  tableId: string;
  userId: string;
  buyInAmount: number;
  currentChips: number;
  totalWagered: number;
  totalWon: number;
  handsPlayed: number;
  status: 'active' | 'completed';
  sessionStartTime: Date;
}

// Create standard 52-card deck
const createDeck = (): Card[] => {
  const suits: Card['suit'][] = ['hearts', 'diamonds', 'clubs', 'spades'];
  const ranks: Card['rank'][] = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
  const deck: Card[] = [];

  for (const suit of suits) {
    for (const rank of ranks) {
      let value = parseInt(rank);
      if (rank === 'A') value = 14; // Ace high
      if (rank === 'J') value = 11;
      if (rank === 'Q') value = 12;
      if (rank === 'K') value = 13;
      
      deck.push({ suit, rank, value });
    }
  }

  return shuffleDeck(deck);
};

// Shuffle deck using Fisher-Yates algorithm
const shuffleDeck = (deck: Card[]): Card[] => {
  const shuffled = [...deck];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

// Hand evaluation functions
const evaluateHand = (cards: Card[]): { rank: number; description: string; kickers: number[] } => {
  const sorted = [...cards].sort((a, b) => b.value - a.value);
  
  // Check for flush
  const isFlush = cards.every(card => card.suit === cards[0].suit);
  
  // Check for straight
  const values = sorted.map(card => card.value);
  const isStraight = values.every((val, i) => i === 0 || val === values[i - 1] - 1);
  
  // Count ranks
  const rankCounts: { [key: number]: number } = {};
  values.forEach(val => rankCounts[val] = (rankCounts[val] || 0) + 1);
  const counts = Object.values(rankCounts).sort((a, b) => b - a);
  
  // Determine hand rank
  if (isStraight && isFlush) {
    if (values[0] === 14 && values[4] === 10) {
      return { rank: 10, description: 'Royal Flush', kickers: [] };
    }
    return { rank: 9, description: 'Straight Flush', kickers: [values[0]] };
  }
  
  if (counts[0] === 4) {
    return { rank: 8, description: 'Four of a Kind', kickers: values };
  }
  
  if (counts[0] === 3 && counts[1] === 2) {
    return { rank: 7, description: 'Full House', kickers: values };
  }
  
  if (isFlush) {
    return { rank: 6, description: 'Flush', kickers: values };
  }
  
  if (isStraight) {
    return { rank: 5, description: 'Straight', kickers: [values[0]] };
  }
  
  if (counts[0] === 3) {
    return { rank: 4, description: 'Three of a Kind', kickers: values };
  }
  
  if (counts[0] === 2 && counts[1] === 2) {
    return { rank: 3, description: 'Two Pair', kickers: values };
  }
  
  if (counts[0] === 2) {
    return { rank: 2, description: 'One Pair', kickers: values };
  }
  
  return { rank: 1, description: 'High Card', kickers: values };
};

// In-memory poker tables (in production, use Redis or database)
const pokerTables: Map<string, PokerTable> = new Map();

// @route   POST /api/games/poker/create-table
// @desc    Create a new poker table
// @access  Private
router.post('/create-table', [
  body('maxPlayers').isInt({ min: 2, max: 9 }).withMessage('Max players must be between 2 and 9'),
  body('smallBlind').isFloat({ min: 25 }).withMessage('Small blind must be at least 25 KES'),
  body('bigBlind').isFloat({ min: 50 }).withMessage('Big blind must be at least 50 KES'),
  body('minimumBuyIn').isFloat({ min: 1000 }).withMessage('Minimum buy-in must be at least 1000 KES'),
  body('maximumBuyIn').isFloat({ min: 10000 }).withMessage('Maximum buy-in must be at least 10000 KES')
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

    const { maxPlayers, smallBlind, bigBlind, minimumBuyIn, maximumBuyIn } = req.body;

    const tableId = `table_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const newTable: PokerTable = {
      tableId,
      players: [],
      maxPlayers,
      smallBlind,
      bigBlind,
      communityCards: [],
      pot: 0,
      currentPlayer: 0,
      dealerPosition: 0,
      gamePhase: 'waiting',
      deck: createDeck(),
      lastAction: 'Table created',
      minimumBuyIn,
      maximumBuyIn
    };

    pokerTables.set(tableId, newTable);

    const response: ApiResponse = {
      success: true,
      message: 'Poker table created successfully',
      data: {
        tableId,
        maxPlayers,
        smallBlind,
        bigBlind,
        minimumBuyIn,
        maximumBuyIn,
        currentPlayers: 0
      }
    };

    res.status(201).json(response);
  } catch (error) {
    next(error);
  }
});

// @route   POST /api/games/poker/join
// @desc    Join a poker table
// @access  Private
router.post('/join', [
  body('tableId').notEmpty().withMessage('Table ID is required'),
  body('buyInAmount').isFloat({ min: 1000 }).withMessage('Buy-in amount must be at least 1000 KES')
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

    const { tableId, buyInAmount } = req.body;

    const user = await User.findById(userId);
    if (!user) {
      throw new ApiError('User not found', 404);
    }

    const table = pokerTables.get(tableId);
    if (!table) {
      throw new ApiError('Table not found', 404);
    }

    // Validate buy-in amount
    if (buyInAmount < table.minimumBuyIn || buyInAmount > table.maximumBuyIn) {
      throw new ApiError(`Buy-in must be between ${table.minimumBuyIn} and ${table.maximumBuyIn} KES`, 400);
    }

    // Check if user has sufficient balance
    if (user.balance < buyInAmount) {
      throw new ApiError('Insufficient balance', 400);
    }

    // Check if table is full
    if (table.players.length >= table.maxPlayers) {
      throw new ApiError('Table is full', 400);
    }

    // Check if user already at table
    if (table.players.some(p => p.userId === userId)) {
      throw new ApiError('Already at this table', 400);
    }

    // Add player to table
    const newPlayer: PokerPlayer = {
      userId,
      username: user.username,
      chips: buyInAmount,
      cards: [],
      currentBet: 0,
      totalBet: 0,
      status: 'active',
      position: table.players.length
    };

    table.players.push(newPlayer);

    // Deduct buy-in from user balance
    user.balance -= buyInAmount;
    await user.save();

    // Create game session
    const gameSession = new GameSession({
      userId,
      gameType: 'poker',
      status: 'active',
      gameState: {
        tableId,
        userId,
        buyInAmount,
        currentChips: buyInAmount,
        totalWagered: 0,
        totalWon: 0,
        handsPlayed: 0,
        status: 'active',
        sessionStartTime: new Date()
      } as PokerGameState,
      metadata: {
        tableId,
        buyInAmount,
        startTime: new Date()
      }
    });

    await gameSession.save();

    // Record buy-in transaction
    const transaction = new Transaction({
      userId,
      type: 'game_bet',
      amount: -buyInAmount,
      description: `Poker table buy-in: ${tableId}`,
      gameSessionId: gameSession._id,
      metadata: { tableId, buyInAmount }
    });

    await transaction.save();

    // Start game if minimum players reached
    if (table.players.length >= 2 && table.gamePhase === 'waiting') {
      startNewHand(table);
    }

    const response: ApiResponse = {
      success: true,
      message: 'Joined poker table successfully',
      data: {
        tableId,
        position: newPlayer.position,
        chips: newPlayer.chips,
        currentPlayers: table.players.length,
        gamePhase: table.gamePhase,
        userBalance: user.balance
      }
    };

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
});

// @route   POST /api/games/poker/action
// @desc    Perform poker action
// @access  Private
router.post('/action', [
  body('tableId').notEmpty().withMessage('Table ID is required'),
  body('action').isIn(['fold', 'call', 'raise', 'check', 'all-in']).withMessage('Invalid action'),
  body('amount').optional().isFloat({ min: 0 }).withMessage('Amount must be positive')
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

    const { tableId, action, amount = 0 } = req.body;

    const table = pokerTables.get(tableId);
    if (!table) {
      throw new ApiError('Table not found', 404);
    }

    const player = table.players.find(p => p.userId === userId);
    if (!player) {
      throw new ApiError('Not at this table', 404);
    }

    // Check if it's player's turn
    if (table.players[table.currentPlayer]?.userId !== userId) {
      throw new ApiError('Not your turn', 400);
    }

    // Process action
    const result = processPokerAction(table, player, action, amount);

    const response: ApiResponse = {
      success: true,
      message: `Action ${action} processed`,
      data: {
        tableState: getPublicTableState(table, userId),
        actionResult: result
      }
    };

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
});

// @route   GET /api/games/poker/table/:tableId
// @desc    Get poker table state
// @access  Private
router.get('/table/:tableId', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      throw new ApiError('User not authenticated', 401);
    }

    const { tableId } = req.params;

    const table = pokerTables.get(tableId);
    if (!table) {
      throw new ApiError('Table not found', 404);
    }

    const response: ApiResponse = {
      success: true,
      message: 'Table state retrieved',
      data: getPublicTableState(table, userId)
    };

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
});

// @route   GET /api/games/poker/tables
// @desc    Get available poker tables
// @access  Private
router.get('/tables', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const tables = Array.from(pokerTables.values()).map(table => ({
      tableId: table.tableId,
      currentPlayers: table.players.length,
      maxPlayers: table.maxPlayers,
      smallBlind: table.smallBlind,
      bigBlind: table.bigBlind,
      minimumBuyIn: table.minimumBuyIn,
      maximumBuyIn: table.maximumBuyIn,
      gamePhase: table.gamePhase,
      pot: table.pot
    }));

    const response: ApiResponse = {
      success: true,
      message: 'Available tables retrieved',
      data: { tables }
    };

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
});

// Helper functions
const startNewHand = (table: PokerTable): void => {
  // Reset for new hand
  table.deck = createDeck();
  table.communityCards = [];
  table.pot = 0;
  table.gamePhase = 'preflop';
  
  // Reset player states
  table.players.forEach(player => {
    player.cards = [];
    player.currentBet = 0;
    player.status = 'active';
  });

  // Move dealer button
  table.dealerPosition = (table.dealerPosition + 1) % table.players.length;
  
  // Post blinds
  postBlinds(table);
  
  // Deal hole cards
  dealHoleCards(table);
  
  // Set first player to act
  table.currentPlayer = (table.dealerPosition + 3) % table.players.length;
};

const postBlinds = (table: PokerTable): void => {
  const smallBlindPos = (table.dealerPosition + 1) % table.players.length;
  const bigBlindPos = (table.dealerPosition + 2) % table.players.length;
  
  const smallBlindPlayer = table.players[smallBlindPos];
  const bigBlindPlayer = table.players[bigBlindPos];
  
  // Post small blind
  const smallBlindAmount = Math.min(smallBlindPlayer.chips, table.smallBlind);
  smallBlindPlayer.chips -= smallBlindAmount;
  smallBlindPlayer.currentBet = smallBlindAmount;
  table.pot += smallBlindAmount;
  
  // Post big blind
  const bigBlindAmount = Math.min(bigBlindPlayer.chips, table.bigBlind);
  bigBlindPlayer.chips -= bigBlindAmount;
  bigBlindPlayer.currentBet = bigBlindAmount;
  table.pot += bigBlindAmount;
};

const dealHoleCards = (table: PokerTable): void => {
  table.players.forEach(player => {
    player.cards = [table.deck.pop()!, table.deck.pop()!];
  });
};

const processPokerAction = (table: PokerTable, player: PokerPlayer, action: string, amount: number): any => {
  switch (action) {
    case 'fold':
      player.status = 'folded';
      break;
    
    case 'call':
      const callAmount = table.players.reduce((max, p) => Math.max(max, p.currentBet), 0) - player.currentBet;
      const actualCall = Math.min(callAmount, player.chips);
      player.chips -= actualCall;
      player.currentBet += actualCall;
      table.pot += actualCall;
      break;
    
    case 'raise':
      const currentBet = table.players.reduce((max, p) => Math.max(max, p.currentBet), 0);
      const raiseAmount = Math.min(amount, player.chips);
      player.chips -= raiseAmount;
      player.currentBet = currentBet + raiseAmount;
      table.pot += raiseAmount;
      break;
    
    case 'check':
      // No chips added
      break;
    
    case 'all-in':
      const allInAmount = player.chips;
      player.chips = 0;
      player.currentBet += allInAmount;
      table.pot += allInAmount;
      player.status = 'all-in';
      break;
  }

  // Move to next player
  moveToNextPlayer(table);
  
  // Check if betting round is complete
  if (isBettingRoundComplete(table)) {
    advanceGamePhase(table);
  }
  
  return { action, player: player.username, pot: table.pot };
};

const moveToNextPlayer = (table: PokerTable): void => {
  let nextPlayer = (table.currentPlayer + 1) % table.players.length;
  let attempts = 0;
  
  while (attempts < table.players.length) {
    if (table.players[nextPlayer].status === 'active') {
      table.currentPlayer = nextPlayer;
      return;
    }
    nextPlayer = (nextPlayer + 1) % table.players.length;
    attempts++;
  }
};

const isBettingRoundComplete = (table: PokerTable): boolean => {
  const activePlayers = table.players.filter(p => p.status === 'active');
  if (activePlayers.length <= 1) return true;
  
  const currentBet = Math.max(...table.players.map(p => p.currentBet));
  return activePlayers.every(p => p.currentBet === currentBet);
};

const advanceGamePhase = (table: PokerTable): void => {
  switch (table.gamePhase) {
    case 'preflop':
      table.gamePhase = 'flop';
      dealCommunityCards(table, 3);
      break;
    case 'flop':
      table.gamePhase = 'turn';
      dealCommunityCards(table, 1);
      break;
    case 'turn':
      table.gamePhase = 'river';
      dealCommunityCards(table, 1);
      break;
    case 'river':
      table.gamePhase = 'showdown';
      determineWinner(table);
      break;
  }
  
  // Reset bets for new round
  table.players.forEach(p => p.currentBet = 0);
  table.currentPlayer = (table.dealerPosition + 1) % table.players.length;
};

const dealCommunityCards = (table: PokerTable, count: number): void => {
  for (let i = 0; i < count; i++) {
    table.communityCards.push(table.deck.pop()!);
  }
};

const determineWinner = async (table: PokerTable): Promise<void> => {
  const activePlayers = table.players.filter(p => p.status !== 'folded');
  
  if (activePlayers.length === 1) {
    // Only one player left, they win
    const winner = activePlayers[0];
    const winAmount = table.pot;
    
    // Apply house rake
    const rake = Math.floor(winAmount * (HOUSE_EDGE_CONFIG.poker.houseRake / 100));
    const playerWinnings = winAmount - rake;
    
    winner.chips += playerWinnings;
    
    // Record transaction for winner
    await recordPokerWinnings(winner.userId, playerWinnings, table.tableId);
  } else {
    // Evaluate hands for showdown
    const handsWithPlayers = activePlayers.map(player => {
      const bestHand = getBestHand([...player.cards, ...table.communityCards]);
      return { player, hand: bestHand };
    });
    
    // Sort by hand strength
    handsWithPlayers.sort((a, b) => {
      if (a.hand.rank !== b.hand.rank) return b.hand.rank - a.hand.rank;
      
      // Compare kickers
      for (let i = 0; i < Math.min(a.hand.kickers.length, b.hand.kickers.length); i++) {
        if (a.hand.kickers[i] !== b.hand.kickers[i]) {
          return b.hand.kickers[i] - a.hand.kickers[i];
        }
      }
      return 0;
    });
    
    // Determine winners (could be ties)
    const winners = [handsWithPlayers[0]];
    for (let i = 1; i < handsWithPlayers.length; i++) {
      if (compareHands(handsWithPlayers[0].hand, handsWithPlayers[i].hand) === 0) {
        winners.push(handsWithPlayers[i]);
      } else {
        break;
      }
    }
    
    // Split pot among winners
    const winAmount = Math.floor(table.pot / winners.length);
    const rake = Math.floor(winAmount * (HOUSE_EDGE_CONFIG.poker.houseRake / 100));
    const playerWinnings = winAmount - rake;
    
    for (const winner of winners) {
      winner.player.chips += playerWinnings;
      await recordPokerWinnings(winner.player.userId, playerWinnings, table.tableId);
    }
  }
  
  // End hand
  table.gamePhase = 'ended';
  
  // Start new hand if enough players
  setTimeout(() => {
    if (table.players.filter(p => p.chips > 0).length >= 2) {
      startNewHand(table);
    }
  }, 5000);
};

const getBestHand = (cards: Card[]): { rank: number; description: string; kickers: number[] } => {
  // Generate all possible 5-card combinations
  const combinations = getCombinations(cards, 5);
  let bestHand = { rank: 0, description: '', kickers: [] };
  
  for (const combo of combinations) {
    const hand = evaluateHand(combo);
    if (hand.rank > bestHand.rank) {
      bestHand = hand;
    }
  }
  
  return bestHand;
};

const getCombinations = (arr: Card[], k: number): Card[][] => {
  if (k === 1) return arr.map(card => [card]);
  
  const result: Card[][] = [];
  for (let i = 0; i <= arr.length - k; i++) {
    const head = arr[i];
    const tailCombos = getCombinations(arr.slice(i + 1), k - 1);
    for (const combo of tailCombos) {
      result.push([head, ...combo]);
    }
  }
  return result;
};

const compareHands = (hand1: any, hand2: any): number => {
  if (hand1.rank !== hand2.rank) return hand1.rank - hand2.rank;
  
  for (let i = 0; i < Math.min(hand1.kickers.length, hand2.kickers.length); i++) {
    if (hand1.kickers[i] !== hand2.kickers[i]) {
      return hand1.kickers[i] - hand2.kickers[i];
    }
  }
  return 0;
};

const recordPokerWinnings = async (userId: string, amount: number, tableId: string): Promise<void> => {
  try {
    // Update user balance
    await User.findByIdAndUpdate(userId, { $inc: { balance: amount } });
    
    // Record transaction
    const transaction = new Transaction({
      userId,
      type: 'game_win',
      amount,
      description: `Poker winnings from table ${tableId}`,
      metadata: { tableId, winAmount: amount }
    });
    
    await transaction.save();
  } catch (error) {
    console.error('Error recording poker winnings:', error);
  }
};

const getPublicTableState = (table: PokerTable, userId: string) => {
  const currentPlayer = table.players.find(p => p.userId === userId);
  
  return {
    tableId: table.tableId,
    gamePhase: table.gamePhase,
    pot: table.pot,
    communityCards: table.communityCards,
    currentPlayer: table.currentPlayer,
    dealerPosition: table.dealerPosition,
    players: table.players.map(p => ({
      username: p.username,
      chips: p.chips,
      currentBet: p.currentBet,
      status: p.status,
      position: p.position,
      cards: p.userId === userId ? p.cards : [] // Only show own cards
    })),
    yourCards: currentPlayer?.cards || [],
    lastAction: table.lastAction
  };
};

export default router;
    const response: ApiResponse = {
      success: false,
      message: 'Poker is currently under development'
    };

    res.status(501).json(response);
  } catch (error) {
    next(error);
  }
});

export default router;
