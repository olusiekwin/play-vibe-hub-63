import mongoose, { Schema, Document } from 'mongoose';
import { Transaction } from '@/types';

export interface TransactionDocument extends Transaction, Document {}

const transactionSchema = new Schema<TransactionDocument>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User ID is required'],
    index: true
  },
  type: {
    type: String,
    enum: ['bet', 'win', 'topup', 'withdrawal'],
    required: [true, 'Transaction type is required']
  },
  amount: {
    type: Number,
    required: [true, 'Amount is required'],
    validate: {
      validator: function(value: number) {
        return Math.abs(value) > 0;
      },
      message: 'Amount must be greater than 0'
    }
  },
  currency: {
    type: String,
    enum: ['KES'],
    default: 'KES'
  },
  game: {
    type: String,
    enum: ['blackjack', 'poker', 'roulette', 'slots'],
    required: function(this: TransactionDocument) {
      return this.type === 'bet' || this.type === 'win';
    }
  },
  gameSessionId: {
    type: String,
    required: function(this: TransactionDocument) {
      return this.type === 'bet' || this.type === 'win';
    }
  },
  status: {
    type: String,
    enum: ['pending', 'completed', 'failed', 'cancelled'],
    default: 'pending'
  },
  paymentMethod: {
    type: String,
    enum: ['mpesa', 'wallet'],
    required: function(this: TransactionDocument) {
      return this.type === 'topup' || this.type === 'withdrawal';
    }
  },
  mpesaTransactionId: {
    type: String,
    sparse: true,
    unique: true
  },
  description: {
    type: String,
    required: [true, 'Description is required'],
    maxlength: [255, 'Description cannot exceed 255 characters']
  },
  timestamp: {
    type: Date,
    default: Date.now,
    index: true
  }
}, {
  timestamps: true,
  toJSON: {
    transform: function(_doc, ret) {
      delete ret.__v;
      return ret;
    }
  }
});

// Compound indexes for better query performance
transactionSchema.index({ userId: 1, timestamp: -1 });
transactionSchema.index({ userId: 1, type: 1 });
transactionSchema.index({ userId: 1, status: 1 });
transactionSchema.index({ gameSessionId: 1 });
transactionSchema.index({ mpesaTransactionId: 1 }, { sparse: true });

// Static method to get user's transaction history
transactionSchema.statics.getUserTransactions = function(
  userId: string, 
  page: number = 1, 
  limit: number = 20,
  type?: string,
  status?: string
) {
  const query: any = { userId };
  
  if (type) query.type = type;
  if (status) query.status = status;
  
  const skip = (page - 1) * limit;
  
  return this.find(query)
    .sort({ timestamp: -1 })
    .skip(skip)
    .limit(limit)
    .lean();
};

// Static method to get user's balance
transactionSchema.statics.calculateUserBalance = async function(userId: string) {
  const result = await this.aggregate([
    { $match: { userId: new mongoose.Types.ObjectId(userId), status: 'completed' } },
    {
      $group: {
        _id: null,
        totalTopups: {
          $sum: {
            $cond: [{ $eq: ['$type', 'topup'] }, '$amount', 0]
          }
        },
        totalWinnings: {
          $sum: {
            $cond: [{ $eq: ['$type', 'win'] }, '$amount', 0]
          }
        },
        totalBets: {
          $sum: {
            $cond: [{ $eq: ['$type', 'bet'] }, { $abs: '$amount' }, 0]
          }
        },
        totalWithdrawals: {
          $sum: {
            $cond: [{ $eq: ['$type', 'withdrawal'] }, { $abs: '$amount' }, 0]
          }
        }
      }
    }
  ]);

  if (result.length === 0) {
    return { balance: 0, totalTopups: 0, totalWinnings: 0, totalBets: 0, totalWithdrawals: 0 };
  }

  const { totalTopups, totalWinnings, totalBets, totalWithdrawals } = result[0];
  const balance = totalTopups + totalWinnings - totalBets - totalWithdrawals;

  return { balance, totalTopups, totalWinnings, totalBets, totalWithdrawals };
};

export const TransactionModel = mongoose.model<TransactionDocument>('Transaction', transactionSchema);
