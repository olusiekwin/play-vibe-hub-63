import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface Transaction {
  id: string;
  type: 'bet' | 'win' | 'topup';
  amount: number;
  game?: string;
  timestamp: Date;
  status: 'completed' | 'pending' | 'failed';
}

export interface GameStats {
  gamesPlayed: number;
  totalWins: number;
  totalLosses: number;
  timePlayedToday: number; // in minutes
  betsToday: number;
  biggestWin: number;
  favoriteGame: string;
}

export interface PlayerSettings {
  safeMode: boolean;
  timeLimit: number; // in minutes
  betLimit: number; // in dollars
  emailNotifications: boolean;
  soundEffects: boolean;
}

interface GamblingStore {
  // Wallet & Transactions
  balance: number;
  transactions: Transaction[];
  addTransaction: (transaction: Omit<Transaction, 'id' | 'timestamp'>) => void;
  updateBalance: (amount: number) => void;
  
  // Game Stats
  gameStats: GameStats;
  updateGameStats: (stats: Partial<GameStats>) => void;
  
  // Settings
  settings: PlayerSettings;
  updateSettings: (settings: Partial<PlayerSettings>) => void;
  
  // Session tracking
  sessionStartTime: Date | null;
  startSession: () => void;
  endSession: () => void;
  
  // Achievements & Streaks
  currentStreak: number;
  bestStreak: number;
  updateStreak: (won: boolean) => void;
}

export const useGamblingStore = create<GamblingStore>()(
  persist(
    (set, get) => ({
      // Initial state
      balance: 1250,
      transactions: [
        {
          id: '1',
          type: 'win',
          amount: 250,
          game: 'poker',
          timestamp: new Date(Date.now() - 1000 * 60 * 30),
          status: 'completed',
        },
        {
          id: '2',
          type: 'bet',
          amount: -100,
          game: 'slots',
          timestamp: new Date(Date.now() - 1000 * 60 * 60),
          status: 'completed',
        },
        {
          id: '3',
          type: 'topup',
          amount: 500,
          timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2),
          status: 'completed',
        },
      ],
      
      gameStats: {
        gamesPlayed: 45,
        totalWins: 18,
        totalLosses: 27,
        timePlayedToday: 45,
        betsToday: 12,
        biggestWin: 850,
        favoriteGame: 'poker',
      },
      
      settings: {
        safeMode: false,
        timeLimit: 60,
        betLimit: 100,
        emailNotifications: true,
        soundEffects: true,
      },
      
      sessionStartTime: null,
      currentStreak: 0,
      bestStreak: 7,
      
      // Actions
      addTransaction: (transaction) => {
        const newTransaction: Transaction = {
          ...transaction,
          id: Math.random().toString(36).substr(2, 9),
          timestamp: new Date(),
        };
        
        set((state) => ({
          transactions: [newTransaction, ...state.transactions].slice(0, 50), // Keep last 50
        }));
      },
      
      updateBalance: (amount) => {
        set((state) => ({
          balance: Math.max(0, state.balance + amount),
        }));
      },
      
      updateGameStats: (stats) => {
        set((state) => ({
          gameStats: { ...state.gameStats, ...stats },
        }));
      },
      
      updateSettings: (settings) => {
        set((state) => ({
          settings: { ...state.settings, ...settings },
        }));
      },
      
      startSession: () => {
        set({ sessionStartTime: new Date() });
      },
      
      endSession: () => {
        const { sessionStartTime, gameStats } = get();
        if (sessionStartTime) {
          const sessionDuration = Math.floor(
            (Date.now() - sessionStartTime.getTime()) / (1000 * 60)
          );
          set((state) => ({
            sessionStartTime: null,
            gameStats: {
              ...state.gameStats,
              timePlayedToday: state.gameStats.timePlayedToday + sessionDuration,
            },
          }));
        }
      },
      
      updateStreak: (won) => {
        set((state) => {
          const newStreak = won ? state.currentStreak + 1 : 0;
          return {
            currentStreak: newStreak,
            bestStreak: Math.max(state.bestStreak, newStreak),
          };
        });
      },
    }),
    {
      name: 'gambling-store',
      partialize: (state) => ({
        balance: state.balance,
        transactions: state.transactions,
        gameStats: state.gameStats,
        settings: state.settings,
        currentStreak: state.currentStreak,
        bestStreak: state.bestStreak,
      }),
    }
  )
);