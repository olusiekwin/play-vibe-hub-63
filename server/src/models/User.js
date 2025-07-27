import mongoose, { Schema } from 'mongoose';
import bcrypt from 'bcryptjs';

const userPreferencesSchema = new Schema({
  sessionTimeLimit: { type: Number, default: 120 }, // 2 hours
  dailyBudgetLimit: { type: Number, default: 10000 }, // 10,000 KES
  notifications: { type: Boolean, default: true },
  soundEffects: { type: Boolean, default: true },
  safeMode: { type: Boolean, default: false }
}, { _id: false });

const userStatisticsSchema = new Schema({
  totalGamesPlayed: { type: Number, default: 0 },
  totalWinnings: { type: Number, default: 0 },
  totalLosses: { type: Number, default: 0 },
  favoriteGame: { type: String, default: '' },
  averageSessionTime: { type: Number, default: 0 },
  biggestWin: { type: Number, default: 0 },
  timePlayedToday: { type: Number, default: 0 },
  betsToday: { type: Number, default: 0 }
}, { _id: false });

const userSchema = new Schema({
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
  username: {
    type: String,
    required: [true, 'Username is required'],
    unique: true,
    trim: true,
    minlength: [3, 'Username must be at least 3 characters long'],
    maxlength: [30, 'Username cannot exceed 30 characters'],
    match: [/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores']
  },
  phoneNumber: {
    type: String,
    required: [true, 'Phone number is required'],
    unique: true,
    match: [/^\+254[0-9]{9}$/, 'Please enter a valid Kenyan phone number (+254XXXXXXXXX)']
  },
  dateOfBirth: {
    type: Date,
    required: [true, 'Date of birth is required'],
    validate: {
      validator: function(value) {
        const age = Math.floor((Date.now() - value.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
        return age >= 18;
      },
      message: 'You must be at least 18 years old to register'
    }
  },
  nationalId: {
    type: String,
    required: [true, 'National ID is required'],
    unique: true,
    match: [/^[0-9]{8}$/, 'Please enter a valid 8-digit National ID']
  },
  county: {
    type: String,
    required: [true, 'County is required'],
    enum: [
      'Baringo', 'Bomet', 'Bungoma', 'Busia', 'Elgeyo-Marakwet', 'Embu', 'Garissa',
      'Homa Bay', 'Isiolo', 'Kajiado', 'Kakamega', 'Kericho', 'Kiambu', 'Kilifi',
      'Kirinyaga', 'Kisii', 'Kisumu', 'Kitui', 'Kwale', 'Laikipia', 'Lamu', 'Machakos',
      'Makueni', 'Mandera', 'Marsabit', 'Meru', 'Migori', 'Mombasa', 'Murang\'a',
      'Nairobi', 'Nakuru', 'Nandi', 'Narok', 'Nyamira', 'Nyandarua', 'Nyeri',
      'Samburu', 'Siaya', 'Taita-Taveta', 'Tana River', 'Tharaka-Nithi', 'Trans Nzoia',
      'Turkana', 'Uasin Gishu', 'Vihiga', 'Wajir', 'West Pokot'
    ]
  },
  // Demo account balance - for practice/testing
  demoBalance: {
    type: Number,
    default: 10000, // Give new users 10,000 KES demo balance
    min: [-100000, 'Demo balance cannot exceed minus 100k']
  },
  // Real account balance - actual money
  realBalance: {
    type: Number,
    default: 0, // Real balance starts at 0, requires deposit
    min: [0, 'Real balance cannot be negative']
  },
  // Current account mode
  accountMode: {
    type: String,
    enum: ['demo', 'real'],
    default: 'demo' // Users start in demo mode
  },
  // Legacy balance field - we'll use this for backward compatibility
  balance: {
    type: Number,
    default: 10000, // Keep for backward compatibility
    min: [0, 'Balance cannot be negative']
  },
  role: {
    type: String,
    enum: ['player', 'admin', 'moderator'],
    default: 'player'
  },
  status: {
    type: String,
    enum: ['active', 'suspended', 'banned', 'pending_verification'],
    default: 'active'
  },
  isEmailVerified: {
    type: Boolean,
    default: true
  },
  isPhoneVerified: {
    type: Boolean,
    default: true
  },
  isIdVerified: {
    type: Boolean,
    default: true
  },
  preferences: {
    type: userPreferencesSchema,
    default: () => ({})
  },
  statistics: {
    type: userStatisticsSchema,
    default: () => ({})
  },
  lastLogin: {
    type: Date
  },
  refreshTokens: [{
    type: String
  }],
  passwordResetToken: String,
  passwordResetExpires: Date,
  emailVerificationToken: String,
  emailVerificationExpires: Date,
  totalBet: { type: Number, default: 0 },
  totalWon: { type: Number, default: 0 },
  totalWins: { type: Number, default: 0 },
  totalLosses: { type: Number, default: 0 }
}, {
  timestamps: true,
  toJSON: {
    transform: function(doc, ret) {
      delete ret.password;
      delete ret.refreshTokens;
      delete ret.passwordResetToken;
      delete ret.passwordResetExpires;
      delete ret.emailVerificationToken;
      delete ret.emailVerificationExpires;
      delete ret.__v;
      return ret;
    }
  }
});

// Indexes for better query performance
userSchema.index({ email: 1 });
userSchema.index({ username: 1 });
userSchema.index({ phoneNumber: 1 });
userSchema.index({ nationalId: 1 });
userSchema.index({ status: 1 });
userSchema.index({ createdAt: -1 });

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Compare password method
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Remove expired refresh tokens
userSchema.methods.cleanupRefreshTokens = function() {
  // In a real implementation, you'd decode and check expiration
  // For now, we'll limit to 5 tokens per user
  if (this.refreshTokens.length > 5) {
    this.refreshTokens = this.refreshTokens.slice(-5);
  }
};

export const User = mongoose.model('User', userSchema);
