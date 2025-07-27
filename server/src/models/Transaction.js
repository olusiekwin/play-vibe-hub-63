import mongoose, { Schema } from 'mongoose';

const transactionSchema = new Schema({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User ID is required'],
    index: true
  },
  type: {
    type: String,
    enum: ['game_bet', 'game_win', 'deposit', 'withdrawal', 'bet', 'win', 'topup'],
    required: [true, 'Transaction type is required']
  },
  amount: {
    type: Number,
    required: [true, 'Amount is required']
  },
  currency: {
    type: String,
    enum: ['KES'],
    default: 'KES'
  },
  game: {
    type: String,
    enum: ['blackjack', 'poker', 'roulette', 'slots']
  },
  gameSessionId: {
    type: Schema.Types.ObjectId,
    ref: 'GameSession'
  },
  status: {
    type: String,
    enum: ['pending', 'completed', 'failed', 'cancelled'],
    default: 'pending'
  },
  description: {
    type: String,
    maxlength: [500, 'Description cannot exceed 500 characters']
  },
  metadata: {
    type: Schema.Types.Mixed,
    default: {}
  },
  paymentMethod: {
    type: String,
    enum: ['mpesa', 'bank_transfer', 'card', 'internal'],
    default: 'internal'
  },
  externalTransactionId: {
    type: String,
    sparse: true
  },
  balanceBefore: {
    type: Number,
    min: [0, 'Balance before cannot be negative']
  },
  balanceAfter: {
    type: Number,
    min: [0, 'Balance after cannot be negative']
  },
  fees: {
    type: Number,
    default: 0,
    min: [0, 'Fees cannot be negative']
  },
  processingTime: {
    type: Number,
    default: 0
  },
  failureReason: {
    type: String
  },
  ipAddress: {
    type: String
  },
  userAgent: {
    type: String
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
transactionSchema.index({ userId: 1, createdAt: -1 });
transactionSchema.index({ type: 1, status: 1 });
transactionSchema.index({ gameSessionId: 1 });
transactionSchema.index({ externalTransactionId: 1 });
transactionSchema.index({ amount: -1 });
transactionSchema.index({ createdAt: -1 });
transactionSchema.index({ status: 1, createdAt: -1 });

// Virtual for absolute amount (for display purposes)
transactionSchema.virtual('absoluteAmount').get(function() {
  return Math.abs(this.amount);
});

// Virtual for transaction direction
transactionSchema.virtual('direction').get(function() {
  return this.amount >= 0 ? 'credit' : 'debit';
});

// Pre-save middleware to set processing time
transactionSchema.pre('save', function(next) {
  if (this.isModified('status') && this.status === 'completed') {
    this.processingTime = Date.now() - this.createdAt.getTime();
  }
  next();
});

export const Transaction = mongoose.model('Transaction', transactionSchema);
