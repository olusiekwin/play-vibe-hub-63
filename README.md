# Kenyan Casino Gaming Platform

A comprehensive online casino platform built with React, TypeScript, and modern web technologies, featuring popular games like Blackjack, Poker, Roulette, and Slots with Kenyan Shilling (KES) currency support.

## 🎮 Features

- **Multiple Casino Games**: Blackjack, Poker, Roulette, Slots
- **KES Currency Support**: All betting and payouts in Kenyan Shillings
- **Responsible Gaming**: Built-in session monitoring and mental health resources
- **Voice Betting**: Voice-activated betting functionality
- **Real-time Wallet**: Live balance updates and transaction history
- **Mobile Responsive**: Optimized for all device sizes

## 🏗️ Technology Stack

- **Frontend**: React 18, TypeScript, Vite
- **Styling**: Tailwind CSS, shadcn/ui components
- **State Management**: Zustand
- **Routing**: React Router DOM v7
- **Data Fetching**: TanStack Query
- **UI Components**: Radix UI primitives
- **Charts**: Recharts
- **Animations**: Tailwind CSS animations

## 📡 API Endpoints Documentation

### Authentication Endpoints

```typescript
// User Registration
POST /api/auth/register
{
  "email": "user@example.com",
  "password": "securePassword123",
  "firstName": "John",
  "lastName": "Doe",
  "phone": "+254700000000",
  "dateOfBirth": "1990-01-01"
}

// User Login
POST /api/auth/login
{
  "email": "user@example.com",
  "password": "securePassword123"
}

// Token Refresh
POST /api/auth/refresh
{
  "refreshToken": "refresh_token_here"
}

// Logout
POST /api/auth/logout
{
  "refreshToken": "refresh_token_here"
}
```

### User Profile Endpoints

```typescript
// Get User Profile
GET /api/user/profile
Headers: { Authorization: "Bearer {access_token}" }

// Update User Profile
PUT /api/user/profile
{
  "firstName": "John",
  "lastName": "Doe",
  "phone": "+254700000000",
  "preferences": {
    "sessionTimeLimit": 120,
    "dailyBudgetLimit": 10000,
    "notifications": true
  }
}

// Get User Statistics
GET /api/user/statistics
Response: {
  "totalGamesPlayed": 150,
  "totalWinnings": 45000.00,
  "totalLosses": 38000.00,
  "favoriteGame": "blackjack",
  "averageSessionTime": 45
}
```

### Wallet Management Endpoints

```typescript
// Get Wallet Balance
GET /api/wallet/balance
Response: {
  "balance": 15000.00,
  "currency": "KES",
  "lastUpdated": "2024-01-15T10:30:00Z"
}

// Deposit Funds
POST /api/wallet/deposit
{
  "amount": 5000.00,
  "paymentMethod": "mpesa",
  "phoneNumber": "+254700000000"
}

// Withdraw Funds
POST /api/wallet/withdraw
{
  "amount": 2000.00,
  "withdrawalMethod": "mpesa",
  "phoneNumber": "+254700000000"
}

// Transaction History
GET /api/wallet/transactions?page=1&limit=20
Response: {
  "transactions": [
    {
      "id": "txn_123456",
      "type": "deposit",
      "amount": 5000.00,
      "currency": "KES",
      "status": "completed",
      "timestamp": "2024-01-15T10:30:00Z",
      "description": "M-Pesa deposit"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "totalPages": 8
  }
}
```

### Game Management Endpoints

```typescript
// Start Game Session
POST /api/games/{gameType}/start
{
  "betAmount": 500.00,
  "gameSettings": {
    "difficulty": "medium",
    "autoPlay": false
  }
}

// Place Bet
POST /api/games/{gameType}/bet
{
  "sessionId": "session_123456",
  "betAmount": 1000.00,
  "betType": "specific_to_game"
}

// Get Game Result
POST /api/games/{gameType}/result
{
  "sessionId": "session_123456",
  "playerAction": "specific_to_game"
}

// End Game Session
POST /api/games/{gameType}/end
{
  "sessionId": "session_123456"
}
```

### Blackjack Specific Endpoints

```typescript
// Deal Initial Cards
POST /api/games/blackjack/deal
{
  "sessionId": "session_123456",
  "betAmount": 1000.00
}

// Player Actions
POST /api/games/blackjack/action
{
  "sessionId": "session_123456",
  "action": "hit" | "stand" | "double" | "split"
}

// Game State
GET /api/games/blackjack/state/{sessionId}
Response: {
  "playerHand": [
    {"suit": "hearts", "rank": "A", "value": 11},
    {"suit": "spades", "rank": "K", "value": 10}
  ],
  "dealerHand": [
    {"suit": "diamonds", "rank": "5", "value": 5},
    {"suit": "hidden", "rank": "hidden", "value": 0}
  ],
  "playerScore": 21,
  "dealerScore": 5,
  "gameStatus": "player_blackjack",
  "payout": 1500.00
}
```

### Poker Specific Endpoints

```typescript
// Join Poker Table
POST /api/games/poker/join
{
  "tableId": "table_123",
  "buyIn": 5000.00
}

// Player Action
POST /api/games/poker/action
{
  "tableId": "table_123",
  "action": "fold" | "call" | "raise" | "check",
  "amount": 1000.00
}

// Get Table State
GET /api/games/poker/table/{tableId}
Response: {
  "players": [
    {
      "id": "player_1",
      "name": "John Doe",
      "chips": 4500.00,
      "position": "dealer",
      "cards": [
        {"suit": "hearts", "rank": "A"},
        {"suit": "spades", "rank": "K"}
      ]
    }
  ],
  "communityCards": [
    {"suit": "diamonds", "rank": "Q"},
    {"suit": "clubs", "rank": "J"},
    {"suit": "hearts", "rank": "10"}
  ],
  "pot": 3000.00,
  "currentBet": 500.00,
  "gamePhase": "flop"
}
```

### Roulette Specific Endpoints

```typescript
// Place Roulette Bet
POST /api/games/roulette/bet
{
  "sessionId": "session_123456",
  "bets": [
    {
      "type": "number",
      "value": 17,
      "amount": 500.00
    },
    {
      "type": "color",
      "value": "red",
      "amount": 1000.00
    }
  ]
}

// Spin Wheel
POST /api/games/roulette/spin
{
  "sessionId": "session_123456"
}

// Get Spin Result
GET /api/games/roulette/result/{sessionId}
Response: {
  "winningNumber": 17,
  "winningColor": "red",
  "isEven": false,
  "payouts": [
    {
      "betType": "number",
      "betValue": 17,
      "betAmount": 500.00,
      "payout": 17500.00,
      "multiplier": 35
    },
    {
      "betType": "color",
      "betValue": "red",
      "betAmount": 1000.00,
      "payout": 2000.00,
      "multiplier": 2
    }
  ],
  "totalPayout": 19500.00
}
```

### Slots Specific Endpoints

```typescript
// Spin Slots
POST /api/games/slots/spin
{
  "sessionId": "session_123456",
  "betAmount": 100.00,
  "paylines": 25
}

// Get Spin Result
GET /api/games/slots/result/{sessionId}
Response: {
  "reels": [
    ["cherry", "lemon", "bell"],
    ["cherry", "cherry", "seven"],
    ["bell", "cherry", "bar"]
  ],
  "winningLines": [
    {
      "line": 1,
      "symbols": ["cherry", "cherry", "cherry"],
      "payout": 500.00
    }
  ],
  "totalPayout": 500.00,
  "jackpot": false
}
```

## 🎯 KES Currency Specifications

### Betting Ranges (in Kenyan Shillings)

```typescript
const BETTING_RANGES = {
  blackjack: {
    min: 50,      // KES 50
    max: 50000,   // KES 50,000
    default: 500  // KES 500
  },
  poker: {
    min: 100,     // KES 100
    max: 100000,  // KES 100,000
    default: 1000 // KES 1,000
  },
  roulette: {
    min: 25,      // KES 25
    max: 25000,   // KES 25,000
    default: 250  // KES 250
  },
  slots: {
    min: 10,      // KES 10
    max: 5000,    // KES 5,000
    default: 100  // KES 100
  }
}
```

### Payout Structures

```typescript
const PAYOUT_MULTIPLIERS = {
  blackjack: {
    win: 2.0,
    blackjack: 2.5,
    push: 1.0,
    insurance: 3.0
  },
  poker: {
    royalFlush: 800,
    straightFlush: 50,
    fourOfAKind: 25,
    fullHouse: 9,
    flush: 6,
    straight: 4,
    threeOfAKind: 3,
    twoPair: 2,
    pair: 1
  },
  roulette: {
    straight: 35,    // Single number
    split: 17,       // Two numbers
    street: 11,      // Three numbers
    corner: 8,       // Four numbers
    line: 5,         // Six numbers
    dozen: 2,        // 12 numbers
    evenOdd: 1,      // Even/Odd
    redBlack: 1,     // Red/Black
    highLow: 1       // 1-18/19-36
  },
  slots: {
    jackpot: 1000,
    sevenMatch: 100,
    tripleMatch: 50,
    doubleMatch: 10,
    singleMatch: 2
  }
}
```

## 🔐 Authentication & Security

### JWT Token Structure

```typescript
interface JWTPayload {
  userId: string;
  email: string;
  role: 'player' | 'admin';
  permissions: string[];
  iat: number;
  exp: number;
}
```

### Session Management

```typescript
interface GameSession {
  sessionId: string;
  userId: string;
  gameType: 'blackjack' | 'poker' | 'roulette' | 'slots';
  startTime: string;
  endTime?: string;
  totalBet: number;
  totalWinnings: number;
  status: 'active' | 'completed' | 'abandoned';
}
```

## 📊 Error Handling

### Standard Error Response Format

```typescript
interface ErrorResponse {
  error: {
    code: string;
    message: string;
    details?: any;
    timestamp: string;
    requestId: string;
  }
}

// Common Error Codes
const ERROR_CODES = {
  INSUFFICIENT_FUNDS: 'WALLET_001',
  INVALID_BET_AMOUNT: 'GAME_001',
  SESSION_EXPIRED: 'AUTH_001',
  GAME_NOT_FOUND: 'GAME_002',
  RATE_LIMIT_EXCEEDED: 'API_001',
  VALIDATION_ERROR: 'VAL_001',
  INTERNAL_SERVER_ERROR: 'SYS_001'
}
```

## 🚀 Frontend Routes

```typescript
const routes = [
  '/',                    // Homepage
  '/games',              // Games lobby
  '/games/blackjack',    // Blackjack game
  '/games/poker',        // Poker game
  '/games/roulette',     // Roulette game
  '/games/slots',        // Slots game
  '/wallet',             // Wallet management
  '/profile',            // User profile
  '/mental-health',      // Responsible gaming
  '/voice-betting',      // Voice betting feature
  '*'                    // 404 page
];
```

## 🎮 Game State Management

### Zustand Store Structure

```typescript
interface GamblingStore {
  // Wallet State
  balance: number;
  currency: 'KES';
  
  // Game State
  currentGame: Game | null;
  gameHistory: GameResult[];
  
  // Session State
  sessionStartTime: Date | null;
  totalBet: number;
  totalWinnings: number;
  
  // Actions
  updateBalance: (amount: number) => void;
  startGame: (game: Game) => void;
  endGame: (result: GameResult) => void;
  placeBet: (amount: number) => void;
  addWinnings: (amount: number) => void;
}
```

## 🔧 Development Setup

### Prerequisites
- Node.js (v18 or higher)
- npm or yarn

### Installation
```bash
git clone <repository-url>
cd kenyan-casino-platform
npm install
npm run dev
```

### Environment Variables
```env
VITE_API_BASE_URL=http://localhost:3000/api
VITE_MPESA_CONSUMER_KEY=your_mpesa_key
VITE_MPESA_CONSUMER_SECRET=your_mpesa_secret
VITE_JWT_SECRET=your_jwt_secret
```

## 📱 Mobile Payment Integration (M-Pesa)

### M-Pesa STK Push for Deposits
```typescript
POST /api/payments/mpesa/stkpush
{
  "phoneNumber": "+254700000000",
  "amount": 1000.00,
  "accountReference": "CASINO_DEPOSIT",
  "transactionDesc": "Casino wallet deposit"
}
```

### M-Pesa Withdrawal
```typescript
POST /api/payments/mpesa/withdraw
{
  "phoneNumber": "+254700000000",
  "amount": 500.00,
  "remarks": "Casino winnings withdrawal"
}
```

## 🛡️ Responsible Gaming Features

### Session Limits
- Maximum session time: 4 hours
- Mandatory breaks every 2 hours
- Daily spending limits
- Loss limits per session

### Mental Health Resources
- Self-assessment tools
- Helpline contacts
- Cool-off periods
- Self-exclusion options

## 📈 Analytics & Reporting

### Player Analytics Endpoints
```typescript
GET /api/analytics/player/{userId}
GET /api/analytics/games/popular
GET /api/analytics/revenue/daily
GET /api/analytics/sessions/average-duration
```

## 🔄 WebSocket Events

### Real-time Game Updates
```typescript
// Connect to game room
ws://localhost:3000/ws/game/{gameId}

// Events
interface WebSocketEvents {
  'game:started': GameStartData;
  'game:bet-placed': BetData;
  'game:result': GameResult;
  'game:ended': GameEndData;
  'wallet:balance-updated': BalanceUpdate;
}
```

## 📋 Deployment

### Production Build
```bash
npm run build
npm run preview
```

### Docker Deployment
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

---

*This documentation serves as a comprehensive guide for backend developers to integrate with the Kenyan Casino Gaming Platform. All monetary values are in Kenyan Shillings (KES) and the platform is optimized for the Kenyan market.*