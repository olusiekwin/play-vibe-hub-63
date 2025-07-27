# Casino Gaming Platform - Backend

A comprehensive Express.js backend API for the Kenyan Casino Gaming Platform, featuring games like Blackjack, Poker, Roulette, and Slots with KES currency support and M-Pesa integration.

## 🚀 Features

- **Authentication & Authorization**: JWT-based auth with refresh tokens
- **Multiple Casino Games**: Blackjack (fully implemented), Poker, Roulette, Slots
- **Wallet Management**: Deposits, withdrawals, transaction history
- **M-Pesa Integration**: Kenya's mobile money platform (ready for implementation)
- **Real-time Gaming**: WebSocket support for live game updates
- **User Management**: Profiles, preferences, statistics
- **Responsible Gaming**: Session limits, spending controls, safe mode
- **Admin Analytics**: Game statistics, revenue tracking
- **Security**: Rate limiting, input validation, data encryption

## 🏗️ Technology Stack

- **Framework**: Express.js with TypeScript
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: JWT tokens with bcrypt password hashing
- **Real-time**: Socket.IO for WebSocket connections
- **Validation**: Express Validator & Joi
- **Security**: Helmet, CORS, Rate Limiting
- **Logging**: Winston for structured logging
- **Payment**: M-Pesa API integration (Kenya)

## 📦 Installation

1. **Clone the repository**
   ```bash
   cd server
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Setup**
   ```bash
   cp .env.example .env
   ```
   
   Update the `.env` file with your configuration:
   ```env
   NODE_ENV=development
   PORT=3001
   MONGODB_URI=mongodb://localhost:27017/casino-gaming-db
   JWT_ACCESS_SECRET=your-super-secret-access-token
   JWT_REFRESH_SECRET=your-super-secret-refresh-token
   ```

4. **Start MongoDB**
   ```bash
   # Using Docker
   docker run -d -p 27017:27017 --name mongodb mongo:latest
   
   # Or use local MongoDB installation
   mongod
   ```

5. **Run the application**
   ```bash
   # Development mode
   npm run dev
   
   # Build and run production
   npm run build
   npm start
   ```

## 📡 API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - User login
- `POST /api/auth/refresh` - Refresh access token
- `POST /api/auth/logout` - Logout user
- `GET /api/auth/me` - Get current user

### User Management
- `GET /api/user/profile` - Get user profile
- `PUT /api/user/profile` - Update profile
- `PUT /api/user/preferences` - Update preferences
- `GET /api/user/statistics` - Get user statistics
- `POST /api/user/change-password` - Change password
- `DELETE /api/user/account` - Delete account

### Wallet Management
- `GET /api/wallet/balance` - Get wallet balance
- `POST /api/wallet/deposit` - Deposit funds
- `POST /api/wallet/withdraw` - Withdraw funds
- `GET /api/wallet/transactions` - Transaction history
- `GET /api/wallet/transaction/:id` - Get specific transaction

### Games
- `GET /api/games` - Get all available games
- `GET /api/games/:gameType` - Get specific game info
- `GET /api/games/sessions/active` - Get active sessions
- `GET /api/games/sessions/history` - Get session history
- `POST /api/games/:gameType/abandon` - Abandon game session
- `GET /api/games/stats/user` - Get user game statistics

### Blackjack Specific
- `POST /api/games/blackjack/deal` - Start new blackjack game
- `POST /api/games/blackjack/action` - Perform game action (hit, stand, double)
- `GET /api/games/blackjack/state/:sessionId` - Get game state

### Other Games (Under Development)
- `POST /api/games/poker/join` - Join poker table
- `POST /api/games/roulette/bet` - Place roulette bet
- `POST /api/games/slots/spin` - Spin slot machine

### Payments (M-Pesa Integration)
- `POST /api/payments/mpesa/stkpush` - Initiate M-Pesa deposit
- `POST /api/payments/mpesa/withdraw` - Process M-Pesa withdrawal
- `POST /api/payments/mpesa/callback` - M-Pesa webhook callback
- `POST /api/payments/mpesa/timeout` - M-Pesa timeout handler

## 🎮 WebSocket Events

Connect to `ws://localhost:3001` with authentication token:

```javascript
const socket = io('ws://localhost:3001', {
  auth: {
    token: 'your-jwt-token'
  }
});

// Join game room
socket.emit('game:join', { gameType: 'blackjack', sessionId: 'session-id' });

// Listen for game updates
socket.on('game:state-updated', (data) => {
  console.log('Game state updated:', data);
});

// Listen for balance updates
socket.on('wallet:balance-updated', (data) => {
  console.log('Balance updated:', data);
});
```

## 🗃️ Database Schema

### User Model
```typescript
{
  email: string;
  password: string; // hashed
  firstName: string;
  lastName: string;
  phone: string; // +254XXXXXXXXX format
  dateOfBirth: Date;
  isVerified: boolean;
  role: 'player' | 'admin';
  balance: number; // in KES
  preferences: {
    sessionTimeLimit: number;
    dailyBudgetLimit: number;
    notifications: boolean;
    soundEffects: boolean;
    safeMode: boolean;
  };
  statistics: {
    totalGamesPlayed: number;
    totalWinnings: number;
    totalLosses: number;
    favoriteGame: string;
    averageSessionTime: number;
    biggestWin: number;
    timePlayedToday: number;
    betsToday: number;
  };
}
```

### Transaction Model
```typescript
{
  userId: ObjectId;
  type: 'bet' | 'win' | 'topup' | 'withdrawal';
  amount: number; // in KES
  currency: 'KES';
  game?: string;
  gameSessionId?: string;
  status: 'pending' | 'completed' | 'failed' | 'cancelled';
  paymentMethod?: 'mpesa' | 'wallet';
  mpesaTransactionId?: string;
  description: string;
  timestamp: Date;
}
```

### GameSession Model
```typescript
{
  sessionId: string; // UUID
  userId: ObjectId;
  gameType: 'blackjack' | 'poker' | 'roulette' | 'slots';
  startTime: Date;
  endTime?: Date;
  totalBet: number;
  totalWinnings: number;
  status: 'active' | 'completed' | 'abandoned';
  gameData: any; // Game-specific data
}
```

## 🔧 Development

### Scripts
```bash
npm run dev          # Start development server with hot reload
npm run build        # Build TypeScript to JavaScript
npm start           # Start production server
npm run lint        # Run ESLint
npm run lint:fix    # Fix ESLint issues
npm test           # Run tests
npm run test:watch # Run tests in watch mode
```

### Project Structure
```
src/
├── config/         # Database and app configuration
├── controllers/    # Route controllers (future)
├── middleware/     # Express middleware
├── models/         # Mongoose models
├── routes/         # API routes
│   └── games/      # Game-specific routes
├── services/       # Business logic services
├── sockets/        # WebSocket handlers
├── types/          # TypeScript type definitions
├── utils/          # Utility functions
└── server.ts       # Main application entry point
```

## 🔐 Security Features

- **Password Hashing**: bcrypt with configurable rounds
- **JWT Authentication**: Access and refresh token strategy
- **Rate Limiting**: Configurable limits for different endpoints
- **Input Validation**: Express Validator for all inputs
- **CORS Protection**: Configurable origins
- **Helmet Security**: Security headers
- **Request Logging**: Comprehensive request/response logging

## 🎯 KES Currency Support

All monetary values are in Kenyan Shillings (KES):
- Minimum bet amounts: 10-100 KES depending on game
- Maximum bet amounts: 10,000-75,000 KES depending on game
- Deposit range: 50-100,000 KES
- Withdrawal range: 100-50,000 KES

## 📱 M-Pesa Integration

The backend is prepared for M-Pesa integration:
- STK Push for deposits
- B2C for withdrawals
- Callback handling for transaction confirmation
- Timeout handling for failed transactions

To complete M-Pesa integration:
1. Register with Safaricom for M-Pesa API access
2. Update environment variables with M-Pesa credentials
3. Implement actual API calls in payment routes

## 🛡️ Responsible Gaming

Built-in responsible gaming features:
- Session time limits (30-480 minutes)
- Daily budget limits (100-1,000,000 KES)
- Safe mode for restricted play
- Session monitoring and alerts
- Self-exclusion options (future)

## 🚀 Deployment

### Docker Deployment
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY dist ./dist
EXPOSE 3001
CMD ["node", "dist/server.js"]
```

### Environment Variables for Production
```env
NODE_ENV=production
PORT=3001
MONGODB_URI=mongodb://your-mongo-cluster/casino-gaming-db
JWT_ACCESS_SECRET=your-production-secret
JWT_REFRESH_SECRET=your-production-refresh-secret
CORS_ORIGIN=https://your-frontend-domain.com
MPESA_ENVIRONMENT=production
```

## 📈 Monitoring & Analytics

- Winston logging with multiple transports
- Request/response logging
- Error tracking and reporting
- Game session analytics
- User behavior tracking
- Revenue and payout tracking

## 🔄 API Versioning

The API is designed to support versioning:
- Current version: v1 (implicit in /api/ routes)
- Future versions can be added as /api/v2/ etc.

## 🧪 Testing

Run the test suite:
```bash
npm test                # Run all tests
npm run test:watch     # Run tests in watch mode
npm run test:coverage  # Run tests with coverage report
```

## 📚 API Documentation

Full API documentation is available at `/api-docs` when running the server (future implementation with Swagger).

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new features
5. Ensure all tests pass
6. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

---

**Note**: This backend is specifically designed for the Kenyan market with KES currency and M-Pesa payment integration. Ensure compliance with local gambling regulations before deployment.
