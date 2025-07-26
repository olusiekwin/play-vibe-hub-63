import pokerImage from "@/assets/poker-game.jpg";
import slotsImage from "@/assets/slots-game.jpg";
import blackjackImage from "@/assets/blackjack-game.jpg";
import rouletteImage from "@/assets/roulette-game.jpg";

export interface Game {
  id: string;
  title: string;
  image: string;
  category: string;
  minBet: number;
  maxBet: number;
}

export const games: Game[] = [
  {
    id: 'poker',
    title: 'Texas Hold\'em Poker',
    image: pokerImage,
    category: 'Cards',
    minBet: 500,
    maxBet: 50000,
  },
  {
    id: 'slots',
    title: 'Golden Slots',
    image: slotsImage,
    category: 'Slots',
    minBet: 250,
    maxBet: 25000,
  },
  {
    id: 'blackjack',
    title: 'Classic Blackjack',
    image: blackjackImage,
    category: 'Cards',
    minBet: 750,
    maxBet: 40000,
  },
  {
    id: 'roulette',
    title: 'European Roulette',
    image: rouletteImage,
    category: 'Roulette',
    minBet: 1000,
    maxBet: 75000,
  },
];

export interface Transaction {
  id: string;
  type: 'bet' | 'win' | 'topup';
  amount: number;
  game?: string;
  timestamp: Date;
  status: 'completed' | 'pending' | 'failed';
}

export const mockTransactions: Transaction[] = [
  {
    id: '1',
    type: 'win',
    amount: 12500,
    game: 'poker',
    timestamp: new Date(Date.now() - 1000 * 60 * 30),
    status: 'completed',
  },
  {
    id: '2',
    type: 'bet',
    amount: -5000,
    game: 'slots',
    timestamp: new Date(Date.now() - 1000 * 60 * 60),
    status: 'completed',
  },
  {
    id: '3',
    type: 'topup',
    amount: 25000,
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2),
    status: 'completed',
  },
];