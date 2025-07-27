import { Router, Request, Response, NextFunction } from 'express';
import { GameSessionModel } from '@/models/GameSession';
import { ApiError } from '@/utils/ApiError';
import { ApiResponse, AuthRequest, Game } from '@/types';
import { authenticate } from '@/middleware/auth';

const router = Router();

// Apply authentication to all game routes
router.use(authenticate);

// Game configuration
const games: Game[] = [
  {
    id: 'blackjack',
    title: 'Classic Blackjack',
    category: 'Cards',
    minBet: 50,
    maxBet: 10000,
    houseEdge: 0.5,
    isActive: true
  },
  {
    id: 'poker',
    title: 'Texas Hold\'em Poker',
    category: 'Cards',
    minBet: 100,
    maxBet: 50000,
    houseEdge: 2.5,
    isActive: true
  },
  {
    id: 'roulette',
    title: 'European Roulette',
    category: 'Roulette',
    minBet: 25,
    maxBet: 75000,
    houseEdge: 2.7,
    isActive: true
  },
  {
    id: 'slots',
    title: 'Golden Slots',
    category: 'Slots',
    minBet: 10,
    maxBet: 25000,
    houseEdge: 3.0,
    isActive: true
  }
];

// @route   GET /api/games
// @desc    Get all available games
// @access  Private
router.get('/', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const activeGames = games.filter(game => game.isActive);

    const response: ApiResponse = {
      success: true,
      data: { games: activeGames }
    };

    res.json(response);
  } catch (error) {
    next(error);
  }
});

// @route   GET /api/games/:gameType
// @desc    Get specific game information
// @access  Private
router.get('/:gameType', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { gameType } = req.params;
    const game = games.find(g => g.id === gameType);

    if (!game) {
      return next(new ApiError('Game not found', 404));
    }

    if (!game.isActive) {
      return next(new ApiError('Game is currently unavailable', 503));
    }

    const response: ApiResponse = {
      success: true,
      data: { game }
    };

    res.json(response);
  } catch (error) {
    next(error);
  }
});

// @route   GET /api/games/sessions/active
// @desc    Get user's active game sessions
// @access  Private
router.get('/sessions/active', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!._id;

    const activeSessions = await GameSessionModel.find({
      userId,
      status: 'active'
    }).select('sessionId gameType startTime totalBet');

    const response: ApiResponse = {
      success: true,
      data: { activeSessions }
    };

    res.json(response);
  } catch (error) {
    next(error);
  }
});

// @route   GET /api/games/sessions/history
// @desc    Get user's game session history
// @access  Private
router.get('/sessions/history', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!._id;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const gameType = req.query.gameType as string;

    const query: any = { userId, status: { $in: ['completed', 'abandoned'] } };
    if (gameType) query.gameType = gameType;

    const skip = (page - 1) * limit;

    const sessions = await GameSessionModel.find(query)
      .sort({ endTime: -1 })
      .skip(skip)
      .limit(limit)
      .select('sessionId gameType startTime endTime totalBet totalWinnings status');

    const total = await GameSessionModel.countDocuments(query);
    const totalPages = Math.ceil(total / limit);

    const response: ApiResponse = {
      success: true,
      data: {
        sessions,
        pagination: {
          page,
          limit,
          total,
          totalPages
        }
      }
    };

    res.json(response);
  } catch (error) {
    next(error);
  }
});

// @route   POST /api/games/:gameType/abandon
// @desc    Abandon an active game session
// @access  Private
router.post('/:gameType/abandon', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!._id;
    const { gameType } = req.params;

    const gameSession = await GameSessionModel.findOne({
      userId,
      gameType,
      status: 'active'
    });

    if (!gameSession) {
      return next(new ApiError('No active game session found', 404));
    }

    await gameSession.abandonSession();

    const response: ApiResponse = {
      success: true,
      message: 'Game session abandoned'
    };

    res.json(response);
  } catch (error) {
    next(error);
  }
});

// @route   GET /api/games/stats/user
// @desc    Get user's game statistics
// @access  Private
router.get('/stats/user', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!._id;

    // Get comprehensive game statistics
    const stats = await GameSessionModel.getUserGameStats(userId);

    // Get recent activity (last 10 games)
    const recentGames = await GameSessionModel.find({
      userId,
      status: { $in: ['completed', 'abandoned'] }
    })
    .sort({ endTime: -1 })
    .limit(10)
    .select('gameType endTime totalBet totalWinnings status');

    // Get today's statistics
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const todayStats = await GameSessionModel.aggregate([
      {
        $match: {
          userId: new (require('mongoose')).Types.ObjectId(userId),
          startTime: { $gte: today }
        }
      },
      {
        $group: {
          _id: null,
          gamesPlayedToday: { $sum: 1 },
          totalBetToday: { $sum: '$totalBet' },
          totalWinningsToday: { $sum: '$totalWinnings' },
          timePlayedToday: {
            $sum: {
              $cond: [
                { $ne: ['$endTime', null] },
                { $divide: [{ $subtract: ['$endTime', '$startTime'] }, 60000] },
                0
              ]
            }
          }
        }
      }
    ]);

    const todayData = todayStats.length > 0 ? todayStats[0] : {
      gamesPlayedToday: 0,
      totalBetToday: 0,
      totalWinningsToday: 0,
      timePlayedToday: 0
    };

    const response: ApiResponse = {
      success: true,
      data: {
        ...stats,
        ...todayData,
        recentGames: recentGames.map(game => ({
          gameType: game.gameType,
          endTime: game.endTime,
          totalBet: game.totalBet,
          totalWinnings: game.totalWinnings,
          status: game.status,
          profit: game.totalWinnings - game.totalBet
        }))
      }
    };

    res.json(response);
  } catch (error) {
    next(error);
  }
});

export default router;
