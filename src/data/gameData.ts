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
    minBet: 10,
    maxBet: 1000,
  },
  {
    id: 'slots',
    title: 'Golden Slots',
    image: slotsImage,
    category: 'Slots',
    minBet: 5,
    maxBet: 500,
  },
  {
    id: 'blackjack',
    title: 'Classic Blackjack',
    image: blackjackImage,
    category: 'Cards',
    minBet: 15,
    maxBet: 800,
  },
  {
    id: 'roulette',
    title: 'European Roulette',
    image: rouletteImage,
    category: 'Roulette',
    minBet: 20,
    maxBet: 1500,
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
];