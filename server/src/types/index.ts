import { Request } from 'express';

// User related types
export interface User {
  _id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  dateOfBirth: Date;
  isVerified: boolean;
  role: 'player' | 'admin';
  balance: number;
  createdAt: Date;
  updatedAt: Date;
  preferences: UserPreferences;
  statistics: UserStatistics;
}

export interface UserPreferences {
  sessionTimeLimit: number; // in minutes
  dailyBudgetLimit: number; // in KES
  notifications: boolean;
  soundEffects: boolean;
  safeMode: boolean;
}

export interface UserStatistics {
  totalGamesPlayed: number;
  totalWinnings: number;
  totalLosses: number;
  favoriteGame: string;
  averageSessionTime: number; // in minutes
  biggestWin: number;
  timePlayedToday: number;
  betsToday: number;
}

// Authentication types
export interface AuthRequest extends Request {
  user?: User;
  body: any;
  params: any;
  query: any;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData extends LoginCredentials {
  firstName: string;
  lastName: string;
  phone: string;
  dateOfBirth: string;
}

export interface TokenPayload {
  userId: string;
  email: string;
  role: 'player' | 'admin';
  iat: number;
  exp: number;
}

// Transaction types
export interface Transaction {
  _id: string;
  userId: string;
  type: 'bet' | 'win' | 'topup' | 'withdrawal';
  amount: number;
  currency: 'KES';
  game?: string;
  gameSessionId?: string;
  status: 'pending' | 'completed' | 'failed' | 'cancelled';
  paymentMethod?: 'mpesa' | 'wallet';
  mpesaTransactionId?: string;
  description: string;
  timestamp: Date;
}

// Wallet types
export interface WalletBalance {
  balance: number;
  currency: 'KES';
  lastUpdated: Date;
}

export interface DepositRequest {
  amount: number;
  paymentMethod: 'mpesa';
  phoneNumber: string;
}

export interface WithdrawalRequest {
  amount: number;
  withdrawalMethod: 'mpesa';
  phoneNumber: string;
}

// Game types
export interface Game {
  id: string;
  title: string;
  category: string;
  minBet: number;
  maxBet: number;
  houseEdge: number;
  isActive: boolean;
}

export interface GameSession {
  _id: string;
  sessionId: string;
  userId: string;
  gameType: 'blackjack' | 'poker' | 'roulette' | 'slots';
  startTime: Date;
  endTime?: Date;
  totalBet: number;
  totalWinnings: number;
  status: 'active' | 'completed' | 'abandoned';
  gameData: any; // Game-specific data
}

// Card types for card games
export interface Card {
  suit: 'hearts' | 'diamonds' | 'clubs' | 'spades';
  rank: 'A' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K';
  value: number;
}

// Blackjack specific types
export interface BlackjackGameState {
  sessionId: string;
  playerHand: Card[];
  dealerHand: Card[];
  playerScore: number;
  dealerScore: number;
  gameStatus: 'dealing' | 'player_turn' | 'dealer_turn' | 'player_wins' | 'dealer_wins' | 'push' | 'player_blackjack' | 'dealer_blackjack';
  betAmount: number;
  canDouble: boolean;
  canSplit: boolean;
}

export interface BlackjackAction {
  sessionId: string;
  action: 'hit' | 'stand' | 'double' | 'split';
}

// Roulette specific types
export interface RouletteBet {
  type: 'number' | 'color' | 'even_odd' | 'high_low' | 'dozen' | 'column';
  value: number | string;
  amount: number;
}

export interface RouletteGameState {
  sessionId: string;
  bets: RouletteBet[];
  winningNumber?: number;
  winningColor?: 'red' | 'black' | 'green';
  isEven?: boolean;
  payouts?: RoulettePayout[];
  totalPayout?: number;
}

export interface RoulettePayout {
  betType: string;
  betValue: number | string;
  betAmount: number;
  payout: number;
  multiplier: number;
}

// Slots specific types
export interface SlotsGameState {
  sessionId: string;
  reels: string[][];
  winningLines: SlotsWinningLine[];
  totalPayout: number;
  jackpot: boolean;
  betAmount: number;
  paylines: number;
}

export interface SlotsWinningLine {
  line: number;
  symbols: string[];
  payout: number;
}

// Poker specific types
export interface PokerPlayer {
  id: string;
  name: string;
  chips: number;
  position: string;
  cards: Card[];
  isActive: boolean;
  hasActed: boolean;
  lastAction?: 'fold' | 'call' | 'raise' | 'check';
}

export interface PokerGameState {
  tableId: string;
  players: PokerPlayer[];
  communityCards: Card[];
  pot: number;
  currentBet: number;
  gamePhase: 'preflop' | 'flop' | 'turn' | 'river' | 'showdown';
  activePlayer?: string;
  dealerPosition: number;
}

export interface PokerAction {
  tableId: string;
  action: 'fold' | 'call' | 'raise' | 'check';
  amount?: number;
}

// M-Pesa specific types
export interface MpesaSTKPushRequest {
  phoneNumber: string;
  amount: number;
  accountReference: string;
  transactionDesc: string;
}

export interface MpesaSTKPushResponse {
  MerchantRequestID: string;
  CheckoutRequestID: string;
  ResponseCode: string;
  ResponseDescription: string;
  CustomerMessage: string;
}

export interface MpesaCallbackData {
  MerchantRequestID: string;
  CheckoutRequestID: string;
  ResultCode: number;
  ResultDesc: string;
  CallbackMetadata?: {
    Item: Array<{
      Name: string;
      Value: string | number;
    }>;
  };
}

// WebSocket types
export interface WebSocketMessage {
  type: string;
  data: any;
  userId?: string;
  sessionId?: string;
}

export interface GameUpdateMessage extends WebSocketMessage {
  type: 'game:update';
  data: {
    gameType: string;
    gameState: any;
  };
}

export interface BalanceUpdateMessage extends WebSocketMessage {
  type: 'wallet:balance-updated';
  data: {
    newBalance: number;
    change: number;
  };
}

// API Response types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  errors?: string[];
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Error types
export interface AppError extends Error {
  statusCode: number;
  isOperational: boolean;
}

export interface ValidationError {
  field: string;
  message: string;
  value?: any;
}
