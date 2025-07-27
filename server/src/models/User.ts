import mongoose, { Schema, Document } from 'mongoose';
import bcrypt from 'bcryptjs';
import { User, UserPreferences, UserStatistics } from '@/types';

export interface UserDocument extends User, Document {
  password: string;
  refreshTokens: string[];
  comparePassword(candidatePassword: string): Promise<boolean>;
  generateTokens(): { accessToken: string; refreshToken: string };
}

const userPreferencesSchema = new Schema<UserPreferences>({
  sessionTimeLimit: { type: Number, default: 120 }, // 2 hours
  dailyBudgetLimit: { type: Number, default: 10000 }, // 10,000 KES
  notifications: { type: Boolean, default: true },
  soundEffects: { type: Boolean, default: true },
  safeMode: { type: Boolean, default: false }
}, { _id: false });

const userStatisticsSchema = new Schema<UserStatistics>({
  totalGamesPlayed: { type: Number, default: 0 },
  totalWinnings: { type: Number, default: 0 },
  totalLosses: { type: Number, default: 0 },
  favoriteGame: { type: String, default: '' },
  averageSessionTime: { type: Number, default: 0 },
  biggestWin: { type: Number, default: 0 },
  timePlayedToday: { type: Number, default: 0 },
  betsToday: { type: Number, default: 0 }
}, { _id: false });

const userSchema = new Schema<UserDocument>({
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [8, 'Password must be at least 8 characters long'],
    select: false
  },
  firstName: {
    type: String,
    required: [true, 'First name is required'],
    trim: true,
    maxlength: [50, 'First name cannot exceed 50 characters']
  },
  lastName: {
    type: String,
    required: [true, 'Last name is required'],
    trim: true,
    maxlength: [50, 'Last name cannot exceed 50 characters']
  },
  phone: {
    type: String,
    required: [true, 'Phone number is required'],
    match: [/^\+254[0-9]{9}$/, 'Please enter a valid Kenyan phone number (+254XXXXXXXXX)']
  },
  dateOfBirth: {
    type: Date,
    required: [true, 'Date of birth is required'],
    validate: {
      validator: function(value: Date) {
        const age = Math.floor((Date.now() - value.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
        return age >= 18;
      },
      message: 'User must be at least 18 years old'
    }
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  role: {
    type: String,
    enum: ['player', 'admin'],
    default: 'player'
  },
  balance: {
    type: Number,
    default: 0,
    min: [0, 'Balance cannot be negative']
  },
  preferences: {
    type: userPreferencesSchema,
    default: () => ({})
  },
  statistics: {
    type: userStatisticsSchema,
    default: () => ({})
  },
  refreshTokens: [{
    type: String
  }]
}, {
  timestamps: true,
  toJSON: {
    transform: function(_doc, ret) {
      delete ret.password;
      delete ret.refreshTokens;
      delete ret.__v;
      return ret;
    }
  }
});

// Index for performance
userSchema.index({ email: 1 });
userSchema.index({ phone: 1 });
userSchema.index({ createdAt: -1 });

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const saltRounds = parseInt(process.env.BCRYPT_ROUNDS || '12');
    this.password = await bcrypt.hash(this.password, saltRounds);
    next();
  } catch (error) {
    next(error as Error);
  }
});

// Compare password method
userSchema.methods.comparePassword = async function(candidatePassword: string): Promise<boolean> {
  return bcrypt.compare(candidatePassword, this.password);
};

// Generate JWT tokens method
userSchema.methods.generateTokens = function() {
  const jwt = require('jsonwebtoken');
  
  const accessToken = jwt.sign(
    { 
      userId: this._id,
      email: this.email,
      role: this.role 
    },
    process.env.JWT_ACCESS_SECRET,
    { expiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m' }
  );
  
  const refreshToken = jwt.sign(
    { userId: this._id },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d' }
  );
  
  return { accessToken, refreshToken };
};

export const UserModel = mongoose.model<UserDocument>('User', userSchema);
