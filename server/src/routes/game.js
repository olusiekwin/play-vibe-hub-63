import { Router } from 'express';

const router = Router();

// @route   GET /api/games
// @desc    Get available games
// @access  Public
router.get('/', (req, res) => {
  const games = [
    {
      name: 'Blackjack',
      type: 'blackjack',
      description: 'Classic card game with 0.5% house edge',
      minBet: 50,
      maxBet: 100000,
      houseEdge: '0.5%'
    },
    {
      name: 'Roulette',
      type: 'roulette',
      description: 'European roulette with single zero',
      minBet: 50,
      maxBet: 100000,
      houseEdge: '2.7%'
    },
    {
      name: 'Slots',
      type: 'slots',
      description: 'Multi-line slot machine with jackpots',
      minBet: 10,
      maxBet: 25000,
      houseEdge: '6.0%'
    },
    {
      name: 'Poker',
      type: 'poker',
      description: 'Texas Hold\'em with 5% rake',
      minBet: 100,
      maxBet: 50000,
      houseEdge: '5.0% rake'
    }
  ];

  res.json({
    success: true,
    message: 'Available games retrieved',
    data: { games }
  });
});

export default router;
