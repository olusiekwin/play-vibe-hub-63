import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { GameSession } from '../models/GameSession.js';
import { Transaction } from '../models/Transaction.js';
import { User } from '../models/User.js';
import { ApiError } from '../utils/ApiError.js';

const router = Router();

// Apply authentication to all routes
router.use(authenticate);

// @route   GET /api/analytics/dashboard
// @desc    Get user dashboard analytics
// @access  Private
router.get('/dashboard', async (req, res, next) => {
  try {
    const userId = req.user._id;
    const { period = '30d' } = req.query;

    // Calculate date range
    const endDate = new Date();
    const startDate = new Date();
    
    switch (period) {
      case '24h':
        startDate.setHours(startDate.getHours() - 24);
        break;
      case '7d':
        startDate.setDate(startDate.getDate() - 7);
        break;
      case '30d':
        startDate.setDate(startDate.getDate() - 30);
        break;
      case '90d':
        startDate.setDate(startDate.getDate() - 90);
        break;
      default:
        startDate.setDate(startDate.getDate() - 30);
    }

    // Get user's current balance
    const user = await User.findById(userId);

    // Get game statistics
    const gameStats = await GameSession.aggregate([
      {
        $match: {
          userId: userId,
          createdAt: { $gte: startDate, $lte: endDate }
        }
      },
      {
        $group: {
          _id: '$gameType',
          totalGames: { $sum: 1 },
          totalBet: { $sum: '$betAmount' },
          totalPayout: { $sum: '$payout' },
          wins: {
            $sum: {
              $cond: [{ $eq: ['$outcome', 'win'] }, 1, 0]
            }
          },
          losses: {
            $sum: {
              $cond: [{ $eq: ['$outcome', 'lose'] }, 1, 0]
            }
          }
        }
      }
    ]);

    // Get overall statistics
    const overallStats = await GameSession.aggregate([
      {
        $match: {
          userId: userId,
          createdAt: { $gte: startDate, $lte: endDate }
        }
      },
      {
        $group: {
          _id: null,
          totalGames: { $sum: 1 },
          totalBet: { $sum: '$betAmount' },
          totalPayout: { $sum: '$payout' },
          wins: {
            $sum: {
              $cond: [{ $eq: ['$outcome', 'win'] }, 1, 0]
            }
          }
        }
      }
    ]);

    // Get daily activity for charts
    const dailyActivity = await GameSession.aggregate([
      {
        $match: {
          userId: userId,
          createdAt: { $gte: startDate, $lte: endDate }
        }
      },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$createdAt' }
          },
          games: { $sum: 1 },
          totalBet: { $sum: '$betAmount' },
          totalPayout: { $sum: '$payout' }
        }
      },
      {
        $sort: { '_id': 1 }
      }
    ]);

    // Get recent big wins
    const bigWins = await GameSession.find({
      userId: userId,
      outcome: 'win',
      payout: { $gte: 500 }, // Wins of 500+ KES
      createdAt: { $gte: startDate, $lte: endDate }
    })
      .sort({ payout: -1 })
      .limit(5)
      .select('gameType payout betAmount createdAt');

    // Calculate derived metrics
    const overall = overallStats[0] || { totalGames: 0, totalBet: 0, totalPayout: 0, wins: 0 };
    const netResult = overall.totalPayout - overall.totalBet;
    const winRate = overall.totalGames > 0 ? (overall.wins / overall.totalGames * 100).toFixed(1) : 0;
    const avgBet = overall.totalGames > 0 ? (overall.totalBet / overall.totalGames).toFixed(2) : 0;

    const response = {
      success: true,
      message: 'Dashboard analytics retrieved',
      data: {
        period,
        dateRange: {
          start: startDate.toISOString().split('T')[0],
          end: endDate.toISOString().split('T')[0]
        },
        summary: {
          currentBalance: user.balance,
          totalGames: overall.totalGames,
          totalBet: overall.totalBet,
          totalPayout: overall.totalPayout,
          netResult,
          winRate: parseFloat(winRate),
          avgBet: parseFloat(avgBet)
        },
        gameBreakdown: gameStats.map(game => ({
          gameType: game._id,
          totalGames: game.totalGames,
          totalBet: game.totalBet,
          totalPayout: game.totalPayout,
          netResult: game.totalPayout - game.totalBet,
          winRate: ((game.wins / game.totalGames) * 100).toFixed(1),
          wins: game.wins,
          losses: game.losses
        })),
        dailyActivity: dailyActivity.map(day => ({
          date: day._id,
          games: day.games,
          totalBet: day.totalBet,
          totalPayout: day.totalPayout,
          netResult: day.totalPayout - day.totalBet
        })),
        bigWins: bigWins.map(win => ({
          id: win._id,
          gameType: win.gameType,
          payout: win.payout,
          betAmount: win.betAmount,
          multiplier: (win.payout / win.betAmount).toFixed(2),
          date: win.createdAt
        }))
      }
    };

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
});

// @route   GET /api/analytics/game-stats/:gameType
// @desc    Get detailed statistics for a specific game type
// @access  Private
router.get('/game-stats/:gameType', async (req, res, next) => {
  try {
    const { gameType } = req.params;
    const userId = req.user._id;
    const { period = '30d' } = req.query;

    // Validate game type
    const validGameTypes = ['blackjack', 'roulette', 'slots', 'poker'];
    if (!validGameTypes.includes(gameType)) {
      throw new ApiError('Invalid game type', 400);
    }

    // Calculate date range
    const endDate = new Date();
    const startDate = new Date();
    
    switch (period) {
      case '24h':
        startDate.setHours(startDate.getHours() - 24);
        break;
      case '7d':
        startDate.setDate(startDate.getDate() - 7);
        break;
      case '30d':
        startDate.setDate(startDate.getDate() - 30);
        break;
      case '90d':
        startDate.setDate(startDate.getDate() - 90);
        break;
      default:
        startDate.setDate(startDate.getDate() - 30);
    }

    // Get detailed game statistics
    const gameStats = await GameSession.aggregate([
      {
        $match: {
          userId: userId,
          gameType: gameType,
          createdAt: { $gte: startDate, $lte: endDate }
        }
      },
      {
        $group: {
          _id: null,
          totalGames: { $sum: 1 },
          totalBet: { $sum: '$betAmount' },
          totalPayout: { $sum: '$payout' },
          wins: {
            $sum: {
              $cond: [{ $eq: ['$outcome', 'win'] }, 1, 0]
            }
          },
          losses: {
            $sum: {
              $cond: [{ $eq: ['$outcome', 'lose'] }, 1, 0]
            }
          },
          pushes: {
            $sum: {
              $cond: [{ $eq: ['$outcome', 'push'] }, 1, 0]
            }
          },
          maxWin: { $max: '$payout' },
          maxBet: { $max: '$betAmount' },
          avgBet: { $avg: '$betAmount' },
          avgPayout: { $avg: '$payout' }
        }
      }
    ]);

    // Get betting pattern analysis
    const bettingPatterns = await GameSession.aggregate([
      {
        $match: {
          userId: userId,
          gameType: gameType,
          createdAt: { $gte: startDate, $lte: endDate }
        }
      },
      {
        $bucket: {
          groupBy: '$betAmount',
          boundaries: [0, 50, 100, 250, 500, 1000, 2500, Infinity],
          default: 'Other',
          output: {
            count: { $sum: 1 },
            totalBet: { $sum: '$betAmount' },
            totalPayout: { $sum: '$payout' },
            wins: {
              $sum: {
                $cond: [{ $eq: ['$outcome', 'win'] }, 1, 0]
              }
            }
          }
        }
      }
    ]);

    // Get session length analysis
    const sessionAnalysis = await GameSession.aggregate([
      {
        $match: {
          userId: userId,
          gameType: gameType,
          createdAt: { $gte: startDate, $lte: endDate }
        }
      },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$createdAt' }
          },
          gamesPerDay: { $sum: 1 },
          dailyBet: { $sum: '$betAmount' },
          dailyPayout: { $sum: '$payout' }
        }
      },
      {
        $group: {
          _id: null,
          avgGamesPerDay: { $avg: '$gamesPerDay' },
          maxGamesPerDay: { $max: '$gamesPerDay' },
          avgDailyBet: { $avg: '$dailyBet' },
          maxDailyBet: { $max: '$dailyBet' }
        }
      }
    ]);

    const stats = gameStats[0] || {};
    const session = sessionAnalysis[0] || {};

    const response = {
      success: true,
      message: `${gameType} statistics retrieved`,
      data: {
        gameType,
        period,
        overview: {
          totalGames: stats.totalGames || 0,
          totalBet: stats.totalBet || 0,
          totalPayout: stats.totalPayout || 0,
          netResult: (stats.totalPayout || 0) - (stats.totalBet || 0),
          winRate: stats.totalGames ? ((stats.wins / stats.totalGames) * 100).toFixed(1) : 0,
          wins: stats.wins || 0,
          losses: stats.losses || 0,
          pushes: stats.pushes || 0
        },
        records: {
          maxWin: stats.maxWin || 0,
          maxBet: stats.maxBet || 0,
          avgBet: stats.avgBet ? stats.avgBet.toFixed(2) : 0,
          avgPayout: stats.avgPayout ? stats.avgPayout.toFixed(2) : 0
        },
        bettingPatterns: bettingPatterns.map(pattern => ({
          range: pattern._id === 'Other' ? '2500+' : `${pattern._id.toString().split(',')[0]}-${pattern._id.toString().split(',')[1] || '∞'}`,
          count: pattern.count,
          totalBet: pattern.totalBet,
          totalPayout: pattern.totalPayout,
          winRate: pattern.count ? ((pattern.wins / pattern.count) * 100).toFixed(1) : 0
        })),
        sessionStats: {
          avgGamesPerDay: session.avgGamesPerDay ? session.avgGamesPerDay.toFixed(1) : 0,
          maxGamesPerDay: session.maxGamesPerDay || 0,
          avgDailyBet: session.avgDailyBet ? session.avgDailyBet.toFixed(2) : 0,
          maxDailyBet: session.maxDailyBet || 0
        }
      }
    };

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
});

// @route   GET /api/analytics/leaderboard
// @desc    Get game leaderboards
// @access  Private
router.get('/leaderboard', async (req, res, next) => {
  try {
    const { gameType, period = '30d', metric = 'totalWins' } = req.query;

    // Calculate date range
    const endDate = new Date();
    const startDate = new Date();
    
    switch (period) {
      case '24h':
        startDate.setHours(startDate.getHours() - 24);
        break;
      case '7d':
        startDate.setDate(startDate.getDate() - 7);
        break;
      case '30d':
        startDate.setDate(startDate.getDate() - 30);
        break;
      default:
        startDate.setDate(startDate.getDate() - 30);
    }

    // Build match criteria
    const matchCriteria = {
      createdAt: { $gte: startDate, $lte: endDate }
    };

    if (gameType && ['blackjack', 'roulette', 'slots', 'poker'].includes(gameType)) {
      matchCriteria.gameType = gameType;
    }

    // Determine sort field based on metric
    let sortField;
    switch (metric) {
      case 'totalWins':
        sortField = 'wins';
        break;
      case 'totalPayout':
        sortField = 'totalPayout';
        break;
      case 'biggestWin':
        sortField = 'maxWin';
        break;
      case 'gamesPlayed':
        sortField = 'totalGames';
        break;
      default:
        sortField = 'wins';
    }

    // Get leaderboard data
    const leaderboard = await GameSession.aggregate([
      { $match: matchCriteria },
      {
        $group: {
          _id: '$userId',
          totalGames: { $sum: 1 },
          totalBet: { $sum: '$betAmount' },
          totalPayout: { $sum: '$payout' },
          wins: {
            $sum: {
              $cond: [{ $eq: ['$outcome', 'win'] }, 1, 0]
            }
          },
          maxWin: { $max: '$payout' }
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'user'
        }
      },
      {
        $unwind: '$user'
      },
      {
        $project: {
          username: '$user.username',
          totalGames: 1,
          totalBet: 1,
          totalPayout: 1,
          wins: 1,
          maxWin: 1,
          netResult: { $subtract: ['$totalPayout', '$totalBet'] },
          winRate: {
            $multiply: [
              { $divide: ['$wins', '$totalGames'] },
              100
            ]
          }
        }
      },
      { $sort: { [sortField]: -1 } },
      { $limit: 50 }
    ]);

    // Add ranking
    const rankedLeaderboard = leaderboard.map((entry, index) => ({
      rank: index + 1,
      username: entry.username,
      totalGames: entry.totalGames,
      wins: entry.wins,
      winRate: entry.winRate.toFixed(1),
      totalPayout: entry.totalPayout,
      maxWin: entry.maxWin,
      netResult: entry.netResult
    }));

    const response = {
      success: true,
      message: 'Leaderboard retrieved',
      data: {
        period,
        gameType: gameType || 'all',
        metric,
        leaderboard: rankedLeaderboard
      }
    };

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
});

export default router;
