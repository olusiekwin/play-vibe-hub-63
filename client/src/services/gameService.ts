import { apiClient, ApiResponse } from '@/lib/api';

// Game types
export interface GameCard {
  suit: string;
  value: string;
  hidden?: boolean;
}

export interface BlackjackGameState {
  gameId: string;
  playerCards: GameCard[];
  dealerCards: GameCard[];
  playerValue: number;
  dealerValue: number;
  status: 'playing' | 'blackjack' | 'bust' | 'completed';
  actions: string[];
  balance: number;
  payout?: number;
  outcome?: 'win' | 'lose' | 'push';
}

export interface RouletteSpinRequest {
  bets: Array<{
    type: 'straight' | 'split' | 'street' | 'corner' | 'line' | 'dozen' | 'column' | 'red' | 'black' | 'odd' | 'even' | 'low' | 'high';
    amount: number;
    numbers?: number[];
  }>;
}

export interface RouletteResult {
  gameId: string;
  winningNumber: number;
  winningColor: string;
  bets: Array<{
    type: string;
    amount: number;
    isWin: boolean;
    payout: number;
  }>;
  totalBetAmount: number;
  totalPayout: number;
  netResult: number;
  balance: number;
}

export interface SlotsResult {
  gameId: string;
  grid: string[][];
  lines: number;
  betPerLine: number;
  totalBet: number;
  winningLines: Array<{
    lineNumber: number;
    symbol: string;
    count: number;
    baseValue: number;
    multiplier: number;
    isJackpot?: boolean;
  }>;
  totalPayout: number;
  netResult: number;
  balance: number;
  isJackpot: boolean;
}

export interface PokerGameState {
  gameId: string;
  hand: Array<GameCard & { position: number; held: boolean }>;
  finalHand?: Array<GameCard & { position: number; held: boolean }>;
  handRank?: string;
  stage: 'deal' | 'complete';
  actions: string[];
  balance: number;
  payout?: number;
}

export interface GameHistoryItem {
  id: string;
  gameType: string;
  betAmount: number;
  payout: number;
  netResult: number;
  outcome: string;
  createdAt: string;
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

export interface PaytableItem {
  symbol?: string;
  hand?: string;
  value?: number;
  payout: string;
  payouts?: {
    3: number;
    4: number;
    5: number;
  };
}

// Game API services
export const gameService = {
  // Blackjack APIs
  blackjack: {
    async startGame(betAmount: number): Promise<ApiResponse<BlackjackGameState>> {
      return apiClient.post<ApiResponse<BlackjackGameState>>('/blackjack/start', { betAmount });
    },

    async performAction(gameId: string, action: 'hit' | 'stand' | 'double' | 'split'): Promise<ApiResponse<BlackjackGameState>> {
      return apiClient.post<ApiResponse<BlackjackGameState>>('/blackjack/action', { gameId, action });
    }
  },

  // Roulette APIs
  roulette: {
    async spin(spinData: RouletteSpinRequest): Promise<ApiResponse<RouletteResult>> {
      return apiClient.post<ApiResponse<RouletteResult>>('/roulette/spin', spinData);
    },

    async getHistory(page = 1, limit = 20): Promise<ApiResponse<{ games: GameHistoryItem[]; pagination: Pagination }>> {
      return apiClient.get<ApiResponse<{ games: GameHistoryItem[]; pagination: Pagination }>>(`/roulette/history?page=${page}&limit=${limit}`);
    }
  },

  // Slots APIs
  slots: {
    async spin(betAmount: number, lines = 1): Promise<ApiResponse<SlotsResult>> {
      return apiClient.post<ApiResponse<SlotsResult>>('/slots/spin', { betAmount, lines });
    },

    async getPaytable(): Promise<ApiResponse<{ paytable: PaytableItem[]; specialRules: string[] }>> {
      return apiClient.get<ApiResponse<{ paytable: PaytableItem[]; specialRules: string[] }>>('/slots/paytable');
    },

    async getHistory(page = 1, limit = 20): Promise<ApiResponse<{ games: GameHistoryItem[]; pagination: Pagination }>> {
      return apiClient.get<ApiResponse<{ games: GameHistoryItem[]; pagination: Pagination }>>(`/slots/history?page=${page}&limit=${limit}`);
    }
  },

  // Poker APIs
  poker: {
    async startGame(betAmount: number): Promise<ApiResponse<PokerGameState>> {
      return apiClient.post<ApiResponse<PokerGameState>>('/poker/start', { betAmount });
    },

    async holdCards(gameId: string, positions: number[]): Promise<ApiResponse<PokerGameState>> {
      return apiClient.post<ApiResponse<PokerGameState>>('/poker/hold', { gameId, positions });
    },

    async drawCards(gameId: string): Promise<ApiResponse<PokerGameState>> {
      return apiClient.post<ApiResponse<PokerGameState>>('/poker/draw', { gameId });
    },

    async getPaytable(): Promise<ApiResponse<{ paytable: PaytableItem[]; rules: string[] }>> {
      return apiClient.get<ApiResponse<{ paytable: PaytableItem[]; rules: string[] }>>('/poker/paytable');
    }
  },

  // Wallet integration for games
  wallet: {
    // Place a bet (deduct from wallet)
    async placeBet(betData: {
      amount: number;
      gameId: string;
      gameType: 'blackjack' | 'poker' | 'roulette' | 'slots';
      betDetails?: Record<string, unknown>;
    }): Promise<ApiResponse<{
      transaction: { id: string; amount: number; gameId: string; gameType: string; } | null;
      newBalance: number;
    }>> {
      return apiClient.post('/wallet/game-bet', betData);
    },

    // Process a win (add to wallet)
    async processWin(winData: {
      amount: number;
      gameId: string;
      gameType: 'blackjack' | 'poker' | 'roulette' | 'slots';
      winDetails?: Record<string, unknown>;
    }): Promise<ApiResponse<{
      transaction: { id: string; amount: number; gameId: string; gameType: string; } | null;
      newBalance: number;
      winAmount?: number;
    }>> {
      return apiClient.post('/wallet/game-win', winData);
    },

    // Generate a unique game ID
    generateGameId(): string {
      return `game_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
  }
};
