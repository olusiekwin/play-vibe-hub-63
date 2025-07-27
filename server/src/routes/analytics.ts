import { Router, Request, Response, NextFunction } from 'express';
import { query, validationResult } from 'express-validator';
import { ApiError } from '@/utils/ApiError';
import { ApiResponse, AuthRequest } from '@/types';
import { authenticate, authorize } from '@/middleware/auth';
import { User } from '@/models/User';
import { GameSession } from '@/models/GameSession';
import { Transaction } from '@/models/Transaction';

const router = Router();

// Apply authentication to all routes
router.use(authenticate);

// @route   GET /api/analytics/player/:userId
// @desc    Get player analytics (admin only)
// @access  Private (Admin)
router.get('/player/:userId', authorize('admin'), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { userId } = req.params;
    const { timeRange = '30d' } = req.query;

    const user = await User.findById(userId);
    if (!user) {
      throw new ApiError('User not found', 404);
    }

    // Calculate date range
    const now = new Date();
    let startDate = new Date();
    
    switch (timeRange) {
      case '7d':
        startDate.setDate(now.getDate() - 7);
        break;
      case '30d':
        startDate.setDate(now.getDate() - 30);
        break;
      case '90d':
        startDate.setDate(now.getDate() - 90);
        break;
      case '1y':
        startDate.setFullYear(now.getFullYear() - 1);
        break;
      default:
        startDate.setDate(now.getDate() - 30);
    }

    // Get game sessions in date range
    const gameSessions = await GameSession.find({
      userId,
      createdAt: { $gte: startDate },
      status: 'completed'
    });

    // Get transactions in date range
    const transactions = await Transaction.find({
      userId,
      createdAt: { $gte: startDate },
      type: { $in: ['game_bet', 'game_win', 'deposit', 'withdrawal'] }
    });

    // Calculate analytics
    const totalSessions = gameSessions.length;
    const totalBet = gameSessions.reduce((sum, session) => sum + (session.totalBet || 0), 0);
    const totalWon = gameSessions.reduce((sum, session) => sum + (session.totalWin || 0), 0);
    const netResult = totalWon - totalBet;
    const winSessions = gameSessions.filter(session => (session.totalWin || 0) > (session.totalBet || 0)).length;
    const winRate = totalSessions > 0 ? (winSessions / totalSessions) * 100 : 0;

    // Calculate average session duration
    const avgSessionDuration = totalSessions > 0 
      ? gameSessions.reduce((sum, session) => {
          const duration = session.endedAt && session.createdAt 
            ? session.endedAt.getTime() - session.createdAt.getTime()
            : 0;
          return sum + duration;
        }, 0) / totalSessions / 1000 / 60 // Convert to minutes
      : 0;

    // Game type breakdown
    const gameTypeStats = gameSessions.reduce((acc, session) => {
      const gameType = session.gameType;
      if (!acc[gameType]) {
        acc[gameType] = {
          sessions: 0,
          totalBet: 0,
          totalWon: 0,
          netResult: 0
        };
      }
      acc[gameType].sessions += 1;
      acc[gameType].totalBet += session.totalBet || 0;
      acc[gameType].totalWon += session.totalWin || 0;
      acc[gameType].netResult += (session.totalWin || 0) - (session.totalBet || 0);
      return acc;
    }, {} as any);

    // Daily activity for chart
    const dailyActivity = [];
    for (let d = new Date(startDate); d <= now; d.setDate(d.getDate() + 1)) {
      const dayStart = new Date(d);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(d);
      dayEnd.setHours(23, 59, 59, 999);
      
      const daySessions = gameSessions.filter(session => 
        session.createdAt >= dayStart && session.createdAt <= dayEnd
      );
      
      const dayBet = daySessions.reduce((sum, session) => sum + (session.totalBet || 0), 0);
      const dayWon = daySessions.reduce((sum, session) => sum + (session.totalWin || 0), 0);
      
      dailyActivity.push({
        date: dayStart.toISOString().split('T')[0],
        sessions: daySessions.length,
        totalBet: dayBet,
        totalWon: dayWon,
        netResult: dayWon - dayBet
      });
    }

    // Transaction breakdown
    const deposits = transactions.filter(t => t.type === 'deposit').reduce((sum, t) => sum + t.amount, 0);
    const withdrawals = transactions.filter(t => t.type === 'withdrawal').reduce((sum, t) => sum + Math.abs(t.amount), 0);
    const totalBetTransactions = transactions.filter(t => t.type === 'game_bet').reduce((sum, t) => sum + Math.abs(t.amount), 0);
    const totalWinTransactions = transactions.filter(t => t.type === 'game_win').reduce((sum, t) => sum + t.amount, 0);

    // Risk assessment
    let riskLevel = 'low';
    const lossAmount = Math.abs(netResult);
    const balanceRatio = user.balance > 0 ? lossAmount / user.balance : 0;
    
    if (balanceRatio > 5 || lossAmount > 100000) {
      riskLevel = 'high';
    } else if (balanceRatio > 2 || lossAmount > 50000) {
      riskLevel = 'medium';
    }

    const response: ApiResponse = {
      success: true,
      message: 'Player analytics retrieved',
      data: {
        player: {
          userId: user._id,
          username: user.username,
          email: user.email,
          currentBalance: user.balance,
          memberSince: user.createdAt,
          lastActive: user.lastLogin || user.updatedAt
        },
        timeRange,
        summary: {
          totalSessions,
          totalBet,
          totalWon,
          netResult,
          winRate: Math.round(winRate * 100) / 100,
          avgSessionDuration: Math.round(avgSessionDuration * 100) / 100,
          riskLevel
        },
        gameTypeStats,
        dailyActivity,
        transactions: {
          deposits,
          withdrawals,
          totalBetTransactions,
          totalWinTransactions,
          netTransactions: deposits - withdrawals
        },
        patterns: {
          favoriteGame: Object.keys(gameTypeStats).reduce((a, b) => 
            gameTypeStats[a]?.sessions > gameTypeStats[b]?.sessions ? a : b, 'none'
          ),
          avgBetSize: totalSessions > 0 ? Math.round((totalBet / totalSessions) * 100) / 100 : 0,
          playingFrequency: totalSessions / Math.max(1, Math.ceil((now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)))
        }
      }
    };

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
});

// @route   GET /api/analytics/games/popular
// @desc    Get popular games analytics
// @access  Private (Admin)
router.get('/games/popular', authorize('admin'), [
  query('timeRange').optional().isIn(['7d', '30d', '90d', '1y']).withMessage('Invalid time range')
], async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ApiError('Validation failed', 400, errors.array());
    }

    const { timeRange = '30d' } = req.query;

    // Calculate date range
    const now = new Date();
    let startDate = new Date();
    
    switch (timeRange) {
      case '7d':
        startDate.setDate(now.getDate() - 7);
        break;
      case '30d':
        startDate.setDate(now.getDate() - 30);
        break;
      case '90d':
        startDate.setDate(now.getDate() - 90);
        break;
      case '1y':
        startDate.setFullYear(now.getFullYear() - 1);
        break;
      default:
        startDate.setDate(now.getDate() - 30);
    }

    // Aggregate game statistics
    const gameStats = await GameSession.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate },
          status: 'completed'
        }
      },
      {
        $group: {
          _id: '$gameType',
          totalSessions: { $sum: 1 },
          totalPlayers: { $addToSet: '$userId' },
          totalBet: { $sum: '$totalBet' },
          totalWon: { $sum: '$totalWin' },
          avgSessionDuration: {
            $avg: {
              $divide: [
                { $subtract: ['$endedAt', '$createdAt'] },
                60000 // Convert to minutes
              ]
            }
          }
        }
      },
      {
        $project: {
          gameType: '$_id',
          totalSessions: 1,
          uniquePlayers: { $size: '$totalPlayers' },
          totalBet: 1,
          totalWon: 1,
          houseEdge: {
            $multiply: [
              {
                $divide: [
                  { $subtract: ['$totalBet', '$totalWon'] },
                  '$totalBet'
                ]
              },
              100
            ]
          },
          avgSessionDuration: { $round: ['$avgSessionDuration', 2] },
          _id: 0
        }
      },
      {
        $sort: { totalSessions: -1 }
      }
    ]);

    // Calculate daily trends for each game
    const dailyTrends = await GameSession.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate },
          status: 'completed'
        }
      },
      {
        $group: {
          _id: {
            gameType: '$gameType',
            date: {
              $dateToString: {
                format: '%Y-%m-%d',
                date: '$createdAt'
              }
            }
          },
          sessions: { $sum: 1 },
          totalBet: { $sum: '$totalBet' },
          totalWon: { $sum: '$totalWin' }
        }
      },
      {
        $group: {
          _id: '$_id.gameType',
          dailyData: {
            $push: {
              date: '$_id.date',
              sessions: '$sessions',
              totalBet: '$totalBet',
              totalWon: '$totalWon'
            }
          }
        }
      }
    ]);

    const response: ApiResponse = {
      success: true,
      message: 'Popular games analytics retrieved',
      data: {
        timeRange,
        games: gameStats,
        dailyTrends: dailyTrends.reduce((acc, game) => {
          acc[game._id] = game.dailyData;
          return acc;
        }, {} as any),
        summary: {
          totalGames: gameStats.length,
          totalSessions: gameStats.reduce((sum, game) => sum + game.totalSessions, 0),
          totalRevenue: gameStats.reduce((sum, game) => sum + (game.totalBet - game.totalWon), 0),
          avgHouseEdge: gameStats.length > 0 
            ? gameStats.reduce((sum, game) => sum + (game.houseEdge || 0), 0) / gameStats.length
            : 0
        }
      }
    };

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
});

// @route   GET /api/analytics/revenue/daily
// @desc    Get daily revenue analytics
// @access  Private (Admin)
router.get('/revenue/daily', authorize('admin'), [
  query('timeRange').optional().isIn(['7d', '30d', '90d', '1y']).withMessage('Invalid time range')
], async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ApiError('Validation failed', 400, errors.array());
    }

    const { timeRange = '30d' } = req.query;

    // Calculate date range
    const now = new Date();
    let startDate = new Date();
    
    switch (timeRange) {
      case '7d':
        startDate.setDate(now.getDate() - 7);
        break;
      case '30d':
        startDate.setDate(now.getDate() - 30);
        break;
      case '90d':
        startDate.setDate(now.getDate() - 90);
        break;
      case '1y':
        startDate.setFullYear(now.getFullYear() - 1);
        break;
      default:
        startDate.setDate(now.getDate() - 30);
    }

    // Get daily revenue data
    const dailyRevenue = await GameSession.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate },
          status: 'completed'
        }
      },
      {
        $group: {
          _id: {
            date: {
              $dateToString: {
                format: '%Y-%m-%d',
                date: '$createdAt'
              }
            }
          },
          totalSessions: { $sum: 1 },
          totalBet: { $sum: '$totalBet' },
          totalWon: { $sum: '$totalWin' },
          uniquePlayers: { $addToSet: '$userId' }
        }
      },
      {
        $project: {
          date: '$_id.date',
          totalSessions: 1,
          totalBet: 1,
          totalWon: 1,
          grossRevenue: { $subtract: ['$totalBet', '$totalWon'] },
          uniquePlayers: { $size: '$uniquePlayers' },
          _id: 0
        }
      },
      {
        $sort: { date: 1 }
      }
    ]);

    // Get deposit/withdrawal data
    const dailyTransactions = await Transaction.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate },
          type: { $in: ['deposit', 'withdrawal'] }
        }
      },
      {
        $group: {
          _id: {
            date: {
              $dateToString: {
                format: '%Y-%m-%d',
                date: '$createdAt'
              }
            },
            type: '$type'
          },
          amount: { $sum: '$amount' },
          count: { $sum: 1 }
        }
      },
      {
        $group: {
          _id: '$_id.date',
          transactions: {
            $push: {
              type: '$_id.type',
              amount: '$amount',
              count: '$count'
            }
          }
        }
      },
      {
        $sort: { _id: 1 }
      }
    ]);

    // Merge revenue and transaction data
    const revenueMap = new Map();
    dailyRevenue.forEach(day => {
      revenueMap.set(day.date, day);
    });

    dailyTransactions.forEach(day => {
      const existing = revenueMap.get(day._id) || {
        date: day._id,
        totalSessions: 0,
        totalBet: 0,
        totalWon: 0,
        grossRevenue: 0,
        uniquePlayers: 0
      };
      
      existing.deposits = 0;
      existing.withdrawals = 0;
      existing.depositCount = 0;
      existing.withdrawalCount = 0;
      
      day.transactions.forEach((t: any) => {
        if (t.type === 'deposit') {
          existing.deposits = t.amount;
          existing.depositCount = t.count;
        } else if (t.type === 'withdrawal') {
          existing.withdrawals = Math.abs(t.amount);
          existing.withdrawalCount = t.count;
        }
      });
      
      existing.netCashFlow = existing.deposits - existing.withdrawals;
      revenueMap.set(day._id, existing);
    });

    const combinedData = Array.from(revenueMap.values()).sort((a, b) => 
      new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    // Calculate summary statistics
    const totalRevenue = combinedData.reduce((sum, day) => sum + (day.grossRevenue || 0), 0);
    const totalDeposits = combinedData.reduce((sum, day) => sum + (day.deposits || 0), 0);
    const totalWithdrawals = combinedData.reduce((sum, day) => sum + (day.withdrawals || 0), 0);
    const totalSessions = combinedData.reduce((sum, day) => sum + (day.totalSessions || 0), 0);
    
    const avgDailyRevenue = combinedData.length > 0 ? totalRevenue / combinedData.length : 0;
    const avgDailySessions = combinedData.length > 0 ? totalSessions / combinedData.length : 0;
    
    // Calculate growth rate (comparing first and last week)
    const firstWeek = combinedData.slice(0, 7);
    const lastWeek = combinedData.slice(-7);
    const firstWeekRevenue = firstWeek.reduce((sum, day) => sum + (day.grossRevenue || 0), 0);
    const lastWeekRevenue = lastWeek.reduce((sum, day) => sum + (day.grossRevenue || 0), 0);
    const growthRate = firstWeekRevenue > 0 ? ((lastWeekRevenue - firstWeekRevenue) / firstWeekRevenue) * 100 : 0;

    const response: ApiResponse = {
      success: true,
      message: 'Daily revenue analytics retrieved',
      data: {
        timeRange,
        dailyData: combinedData,
        summary: {
          totalRevenue: Math.round(totalRevenue),
          totalDeposits: Math.round(totalDeposits),
          totalWithdrawals: Math.round(totalWithdrawals),
          netCashFlow: Math.round(totalDeposits - totalWithdrawals),
          totalSessions,
          avgDailyRevenue: Math.round(avgDailyRevenue),
          avgDailySessions: Math.round(avgDailySessions),
          growthRate: Math.round(growthRate * 100) / 100,
          profitMargin: totalDeposits > 0 ? Math.round((totalRevenue / totalDeposits) * 10000) / 100 : 0
        }
      }
    };

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
});

// @route   GET /api/analytics/sessions/average-duration
// @desc    Get average session duration analytics
// @access  Private (Admin)
router.get('/sessions/average-duration', authorize('admin'), [
  query('timeRange').optional().isIn(['7d', '30d', '90d', '1y']).withMessage('Invalid time range'),
  query('gameType').optional().isIn(['blackjack', 'roulette', 'slots', 'poker']).withMessage('Invalid game type')
], async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new ApiError('Validation failed', 400, errors.array());
    }

    const { timeRange = '30d', gameType } = req.query;

    // Calculate date range
    const now = new Date();
    let startDate = new Date();
    
    switch (timeRange) {
      case '7d':
        startDate.setDate(now.getDate() - 7);
        break;
      case '30d':
        startDate.setDate(now.getDate() - 30);
        break;
      case '90d':
        startDate.setDate(now.getDate() - 90);
        break;
      case '1y':
        startDate.setFullYear(now.getFullYear() - 1);
        break;
      default:
        startDate.setDate(now.getDate() - 30);
    }

    // Build match query
    const matchQuery: any = {
      createdAt: { $gte: startDate },
      status: 'completed',
      endedAt: { $exists: true, $ne: null }
    };

    if (gameType) {
      matchQuery.gameType = gameType;
    }

    // Get session duration analytics
    const sessionAnalytics = await GameSession.aggregate([
      {
        $match: matchQuery
      },
      {
        $project: {
          gameType: 1,
          userId: 1,
          duration: {
            $divide: [
              { $subtract: ['$endedAt', '$createdAt'] },
              60000 // Convert to minutes
            ]
          },
          totalBet: 1,
          totalWin: 1,
          hour: { $hour: '$createdAt' },
          dayOfWeek: { $dayOfWeek: '$createdAt' },
          date: {
            $dateToString: {
              format: '%Y-%m-%d',
              date: '$createdAt'
            }
          }
        }
      },
      {
        $group: {
          _id: {
            gameType: '$gameType',
            date: '$date'
          },
          avgDuration: { $avg: '$duration' },
          minDuration: { $min: '$duration' },
          maxDuration: { $max: '$duration' },
          sessionCount: { $sum: 1 },
          uniquePlayers: { $addToSet: '$userId' },
          totalBet: { $sum: '$totalBet' },
          totalWin: { $sum: '$totalWin' }
        }
      }
    ]);

    // Overall statistics
    const overallStats = await GameSession.aggregate([
      {
        $match: matchQuery
      },
      {
        $project: {
          gameType: 1,
          duration: {
            $divide: [
              { $subtract: ['$endedAt', '$createdAt'] },
              60000
            ]
          },
          hour: { $hour: '$createdAt' },
          dayOfWeek: { $dayOfWeek: '$createdAt' }
        }
      },
      {
        $group: {
          _id: '$gameType',
          avgDuration: { $avg: '$duration' },
          minDuration: { $min: '$duration' },
          maxDuration: { $max: '$duration' },
          sessionCount: { $sum: 1 },
          hourlyData: {
            $push: {
              hour: '$hour',
              duration: '$duration'
            }
          },
          weeklyData: {
            $push: {
              dayOfWeek: '$dayOfWeek',
              duration: '$duration'
            }
          }
        }
      }
    ]);

    // Calculate hourly and daily patterns
    const patterns = overallStats.map(game => {
      const hourlyAvg = Array.from({ length: 24 }, (_, hour) => {
        const hourSessions = game.hourlyData.filter((s: any) => s.hour === hour);
        const avgDuration = hourSessions.length > 0 
          ? hourSessions.reduce((sum: number, s: any) => sum + s.duration, 0) / hourSessions.length
          : 0;
        return { hour, avgDuration: Math.round(avgDuration * 100) / 100 };
      });

      const dailyAvg = Array.from({ length: 7 }, (_, day) => {
        const daySessions = game.weeklyData.filter((s: any) => s.dayOfWeek === day + 1);
        const avgDuration = daySessions.length > 0
          ? daySessions.reduce((sum: number, s: any) => sum + s.duration, 0) / daySessions.length
          : 0;
        return { 
          day: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][day],
          avgDuration: Math.round(avgDuration * 100) / 100 
        };
      });

      return {
        gameType: game._id,
        avgDuration: Math.round(game.avgDuration * 100) / 100,
        minDuration: Math.round(game.minDuration * 100) / 100,
        maxDuration: Math.round(game.maxDuration * 100) / 100,
        sessionCount: game.sessionCount,
        hourlyPatterns: hourlyAvg,
        dailyPatterns: dailyAvg
      };
    });

    const response: ApiResponse = {
      success: true,
      message: 'Session duration analytics retrieved',
      data: {
        timeRange,
        gameType: gameType || 'all',
        overallStats: patterns,
        dailyBreakdown: sessionAnalytics.map(item => ({
          gameType: item._id.gameType,
          date: item._id.date,
          avgDuration: Math.round(item.avgDuration * 100) / 100,
          minDuration: Math.round(item.minDuration * 100) / 100,
          maxDuration: Math.round(item.maxDuration * 100) / 100,
          sessionCount: item.sessionCount,
          uniquePlayers: item.uniquePlayers.length,
          totalBet: item.totalBet,
          totalWin: item.totalWin
        })),
        summary: patterns.length > 0 ? {
          overallAvgDuration: Math.round(
            patterns.reduce((sum, p) => sum + p.avgDuration, 0) / patterns.length * 100
          ) / 100,
          totalSessions: patterns.reduce((sum, p) => sum + p.sessionCount, 0),
          longestSession: Math.max(...patterns.map(p => p.maxDuration)),
          shortestSession: Math.min(...patterns.map(p => p.minDuration))
        } : null
      }
    };

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
});

// @route   GET /api/analytics/overview
// @desc    Get casino overview analytics (admin only)
// @access  Private (Admin)
router.get('/overview', authorize('admin'), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const now = new Date();
    const last30Days = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const last7Days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    // Get basic counts
    const [totalUsers, totalSessions, totalTransactions] = await Promise.all([
      User.countDocuments(),
      GameSession.countDocuments({ status: 'completed' }),
      Transaction.countDocuments()
    ]);

    // Get recent activity
    const [recentSessions, recentRevenue, activeUsers] = await Promise.all([
      GameSession.countDocuments({ 
        createdAt: { $gte: last7Days }, 
        status: 'completed' 
      }),
      GameSession.aggregate([
        {
          $match: {
            createdAt: { $gte: last30Days },
            status: 'completed'
          }
        },
        {
          $group: {
            _id: null,
            totalBet: { $sum: '$totalBet' },
            totalWon: { $sum: '$totalWin' }
          }
        }
      ]),
      User.countDocuments({ 
        lastLogin: { $gte: last7Days } 
      })
    ]);

    const revenue = recentRevenue[0] || { totalBet: 0, totalWon: 0 };
    const grossRevenue = revenue.totalBet - revenue.totalWon;

    // Top games by sessions
    const topGames = await GameSession.aggregate([
      {
        $match: {
          createdAt: { $gte: last30Days },
          status: 'completed'
        }
      },
      {
        $group: {
          _id: '$gameType',
          sessions: { $sum: 1 },
          revenue: { $sum: { $subtract: ['$totalBet', '$totalWin'] } }
        }
      },
      {
        $sort: { sessions: -1 }
      },
      {
        $limit: 5
      }
    ]);

    // Top players by activity
    const topPlayers = await GameSession.aggregate([
      {
        $match: {
          createdAt: { $gte: last30Days },
          status: 'completed'
        }
      },
      {
        $group: {
          _id: '$userId',
          sessions: { $sum: 1 },
          totalBet: { $sum: '$totalBet' },
          totalWon: { $sum: '$totalWin' }
        }
      },
      {
        $sort: { totalBet: -1 }
      },
      {
        $limit: 10
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
          sessions: 1,
          totalBet: 1,
          totalWon: 1,
          netResult: { $subtract: ['$totalWon', '$totalBet'] }
        }
      }
    ]);

    const response: ApiResponse = {
      success: true,
      message: 'Casino overview analytics retrieved',
      data: {
        summary: {
          totalUsers,
          totalSessions,
          totalTransactions,
          activeUsers,
          recentSessions,
          grossRevenue: Math.round(grossRevenue),
          houseEdge: revenue.totalBet > 0 ? Math.round((grossRevenue / revenue.totalBet) * 10000) / 100 : 0
        },
        topGames: topGames.map(game => ({
          gameType: game._id,
          sessions: game.sessions,
          revenue: Math.round(game.revenue)
        })),
        topPlayers: topPlayers.map(player => ({
          username: player.username,
          sessions: player.sessions,
          totalBet: Math.round(player.totalBet),
          totalWon: Math.round(player.totalWon),
          netResult: Math.round(player.netResult)
        })),
        timestamp: now
      }
    };

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
});

export default router;
