import mongoose, { Schema, Document } from 'mongoose';
import { GameSession } from '@/types';

export interface GameSessionDocument extends GameSession, Document {}

const gameSessionSchema = new Schema<GameSessionDocument>({
  sessionId: {
    type: String,
    required: [true, 'Session ID is required'],
    unique: true,
    index: true
  },
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User ID is required'],
    index: true
  },
  gameType: {
    type: String,
    enum: ['blackjack', 'poker', 'roulette', 'slots'],
    required: [true, 'Game type is required']
  },
  startTime: {
    type: Date,
    default: Date.now,
    required: true
  },
  endTime: {
    type: Date
  },
  totalBet: {
    type: Number,
    default: 0,
    min: [0, 'Total bet cannot be negative']
  },
  totalWinnings: {
    type: Number,
    default: 0,
    min: [0, 'Total winnings cannot be negative']
  },
  status: {
    type: String,
    enum: ['active', 'completed', 'abandoned'],
    default: 'active'
  },
  gameData: {
    type: Schema.Types.Mixed,
    default: {}
  }
}, {
  timestamps: true,
  toJSON: {
    transform: function(_doc: any, ret: any) {
      delete ret.__v;
      return ret;
    }
  }
});

// Compound indexes for better query performance
gameSessionSchema.index({ userId: 1, startTime: -1 });
gameSessionSchema.index({ userId: 1, gameType: 1 });
gameSessionSchema.index({ userId: 1, status: 1 });
gameSessionSchema.index({ sessionId: 1, userId: 1 });

// Static method to get active session for user and game type
gameSessionSchema.statics.getActiveSession = function(userId: string, gameType: string) {
  return this.findOne({
    userId,
    gameType,
    status: 'active'
  });
};

// Static method to get user's game statistics
gameSessionSchema.statics.getUserGameStats = async function(userId: string) {
  const result = await this.aggregate([
    { $match: { userId: new mongoose.Types.ObjectId(userId) } },
    {
      $group: {
        _id: null,
        totalGamesPlayed: { $sum: 1 },
        totalBet: { $sum: '$totalBet' },
        totalWinnings: { $sum: '$totalWinnings' },
        averageSessionTime: {
          $avg: {
            $cond: [
              { $ne: ['$endTime', null] },
              { $divide: [{ $subtract: ['$endTime', '$startTime'] }, 60000] }, // Convert to minutes
              0
            ]
          }
        },
        gameTypes: { $addToSet: '$gameType' }
      }
    }
  ]);

  if (result.length === 0) {
    return {
      totalGamesPlayed: 0,
      totalBet: 0,
      totalWinnings: 0,
      totalLosses: 0,
      averageSessionTime: 0,
      favoriteGame: '',
      biggestWin: 0
    };
  }

  const stats = result[0];
  const totalLosses = stats.totalBet - stats.totalWinnings;

  // Get favorite game (most played)
  const favoriteGameResult = await this.aggregate([
    { $match: { userId: new mongoose.Types.ObjectId(userId) } },
    { $group: { _id: '$gameType', count: { $sum: 1 } } },
    { $sort: { count: -1 } },
    { $limit: 1 }
  ]);

  const favoriteGame = favoriteGameResult.length > 0 ? favoriteGameResult[0]._id : '';

  // Get biggest win
  const biggestWinResult = await this.aggregate([
    { $match: { userId: new mongoose.Types.ObjectId(userId) } },
    { $group: { _id: null, biggestWin: { $max: '$totalWinnings' } } }
  ]);

  const biggestWin = biggestWinResult.length > 0 ? biggestWinResult[0].biggestWin : 0;

  return {
    totalGamesPlayed: stats.totalGamesPlayed,
    totalBet: stats.totalBet,
    totalWinnings: stats.totalWinnings,
    totalLosses: Math.max(0, totalLosses),
    averageSessionTime: Math.round(stats.averageSessionTime || 0),
    favoriteGame,
    biggestWin
  };
};

// Instance method to end session
gameSessionSchema.methods.endSession = function() {
  this.endTime = new Date();
  this.status = 'completed';
  return this.save();
};

// Instance method to abandon session
gameSessionSchema.methods.abandonSession = function() {
  this.endTime = new Date();
  this.status = 'abandoned';
  return this.save();
};

export const GameSessionModel = mongoose.model<GameSessionDocument>('GameSession', gameSessionSchema);
