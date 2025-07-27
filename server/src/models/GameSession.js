import mongoose, { Schema } from 'mongoose';

const gameSessionSchema = new Schema({
  sessionId: {
    type: String,
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
  endedAt: {
    type: Date
  },
  totalBet: {
    type: Number,
    default: 0,
    min: [0, 'Total bet cannot be negative']
  },
  totalWin: {
    type: Number,
    default: 0,
    min: [0, 'Total winnings cannot be negative']
  },
  totalWinnings: {
    type: Number,
    default: 0,
    min: [0, 'Total winnings cannot be negative']
  },
  netResult: {
    type: Number,
    default: 0
  },
  status: {
    type: String,
    enum: ['active', 'completed', 'abandoned'],
    default: 'active'
  },
  gameData: {
    type: Schema.Types.Mixed,
    default: {}
  },
  gameState: {
    type: Schema.Types.Mixed,
    default: {}
  },
  metadata: {
    type: Schema.Types.Mixed,
    default: {}
  },
  houseEdgeApplied: {
    type: Number,
    default: 0
  },
  playerIpAddress: {
    type: String
  },
  userAgent: {
    type: String
  },
  deviceInfo: {
    type: Schema.Types.Mixed,
    default: {}
  }
}, {
  timestamps: true,
  toJSON: {
    transform: function(doc, ret) {
      delete ret.__v;
      return ret;
    }
  }
});

// Indexes for better query performance
gameSessionSchema.index({ userId: 1, gameType: 1 });
gameSessionSchema.index({ status: 1 });
gameSessionSchema.index({ createdAt: -1 });
gameSessionSchema.index({ gameType: 1, createdAt: -1 });
gameSessionSchema.index({ userId: 1, createdAt: -1 });
gameSessionSchema.index({ totalBet: -1 });
gameSessionSchema.index({ totalWin: -1 });

// Calculate session duration virtual field
gameSessionSchema.virtual('duration').get(function() {
  if (this.endTime && this.startTime) {
    return this.endTime.getTime() - this.startTime.getTime();
  }
  return null;
});

// Calculate profit/loss virtual field
gameSessionSchema.virtual('profitLoss').get(function() {
  return (this.totalWin || 0) - (this.totalBet || 0);
});

// Auto-set endTime when status changes to completed
gameSessionSchema.pre('save', function(next) {
  if (this.status === 'completed' && !this.endTime) {
    this.endTime = new Date();
    this.endedAt = new Date();
  }
  
  // Calculate net result
  this.netResult = (this.totalWin || 0) - (this.totalBet || 0);
  
  next();
});

export const GameSession = mongoose.model('GameSession', gameSessionSchema);
