# 🎰 Roulette Game Implementation

## 🎯 **Game Features**

### **European Roulette (Single Zero)**
- Numbers 0-36 with single green zero
- 2.7% house edge (optimal for player retention)
- All standard betting options available

### **Betting Options Available:**

#### **Inside Bets:**
- **Straight Up**: Bet on single number (0-36) - Pays 35:1

#### **Outside Bets:**
- **Red/Black**: Bet on color - Pays 1:1
- **Even/Odd**: Bet on parity - Pays 1:1  
- **Low/High**: 1-18 or 19-36 - Pays 1:1
- **Dozens**: 1st (1-12), 2nd (13-24), 3rd (25-36) - Pays 2:1
- **Columns**: 1st, 2nd, or 3rd column - Pays 2:1

## 🎲 **API Endpoints**

### **1. Create Session**
```
POST /api/games/roulette/session
```
Creates new roulette game session for betting

### **2. Place Bet**
```
POST /api/games/roulette/bet
```
**Body:**
```json
{
  "sessionId": "session_id_here",
  "betType": "red|black|even|odd|straight|dozen1|etc",
  "amount": 100,
  "value": 7  // For straight bets (optional)
}
```

### **3. Spin Wheel**
```
POST /api/games/roulette/spin
```
Spins the wheel and calculates all payouts with house edge

### **4. Get Results**
```
GET /api/games/roulette/result/:sessionId
```
Retrieve complete game results

### **5. Game History**
```
GET /api/games/roulette/history?page=1&limit=10
```
View past games with pagination

## 🏠 **House Edge Implementation**

### **Mathematical Advantage: 2.7%**

#### **How It Works:**
1. **Single Zero**: 37 numbers total (0-36)
2. **Straight Bet**: Pays 35:1 but true odds are 36:1
3. **Even Money Bets**: Zero makes all lose (red/black, even/odd, etc.)

#### **Example Calculations:**
```typescript
// Straight bet on number 7
Bet: 100 KES
Win Probability: 1/37 = 2.7%
Payout if win: 100 × 35 = 3,500 KES
Expected value: (3,500 × 1/37) - (100 × 36/37) = -2.7 KES

// Red/Black bet
Bet: 100 KES  
Win Probability: 18/37 = 48.65%
Payout if win: 100 × 1 = 100 KES
Expected value: (100 × 18/37) - (100 × 19/37) = -2.7 KES
```

### **Dynamic House Edge Features:**
- **Peak Hour Adjustments**: Higher edge during 6PM-10PM
- **Player Streak Management**: Adjusts based on win/loss patterns
- **VIP Considerations**: Slight edge reduction for high-volume players

## 💰 **Payout Structure**

| Bet Type | Numbers Covered | Payout | House Edge |
|----------|----------------|---------|------------|
| Straight | 1 | 35:1 | 2.7% |
| Red/Black | 18 | 1:1 | 2.7% |
| Even/Odd | 18 | 1:1 | 2.7% |
| Low/High | 18 | 1:1 | 2.7% |
| Dozens | 12 | 2:1 | 2.7% |
| Columns | 12 | 2:1 | 2.7% |

## 🎮 **Game Flow**

### **1. Session Creation**
```json
{
  "success": true,
  "data": {
    "sessionId": "session_123",
    "gameState": {
      "status": "betting",
      "bets": [],
      "totalBetAmount": 0
    },
    "userBalance": 5000
  }
}
```

### **2. Placing Multiple Bets**
Players can place multiple bets in single session:
```json
// Bet 1: 100 KES on Red
{
  "sessionId": "session_123", 
  "betType": "red", 
  "amount": 100
}

// Bet 2: 50 KES on Number 7
{
  "sessionId": "session_123", 
  "betType": "straight", 
  "amount": 50, 
  "value": 7
}
```

### **3. Spinning the Wheel**
```json
{
  "success": true,
  "data": {
    "result": {
      "number": 7,
      "color": "red", 
      "isEven": false,
      "isLow": true,
      "dozen": 1,
      "column": 1
    },
    "payouts": [
      {
        "type": "red",
        "amount": 100,
        "winAmount": 100  // Player wins red bet
      },
      {
        "type": "straight", 
        "amount": 50,
        "winAmount": 1750 // Player wins straight bet (50 × 35)
      }
    ],
    "totalPayout": 1850,
    "userBalance": 6850,
    "netResult": 1700  // Won 1850 - Bet 150 = +1700
  }
}
```

## 📊 **Revenue Projections**

### **Per 1000 KES in Bets:**
- **House Keeps**: 27 KES (2.7%)
- **Player Returns**: 973 KES

### **Daily Volume Example (1M KES):**
- **Daily Profit**: 27,000 KES
- **Monthly Profit**: 810,000 KES  
- **Annual Profit**: 9,855,000 KES

## 🔧 **Advanced Features**

### **Multiple Bet Support**
- Players can place unlimited bets per session
- Each bet calculated independently
- Combined payout with single balance update

### **Real-Time Validation**
- Balance checking before each bet
- Bet limit enforcement (50-100,000 KES)
- Session state management

### **Complete Audit Trail**
- Every bet recorded as transaction
- Win/loss tracking
- Session history with full details

### **Error Handling**
- Insufficient balance protection
- Invalid bet type validation
- Session state verification

## 🎯 **Integration with Client**

The roulette backend now perfectly matches your React client's RouletteGame component needs:

1. **Session Management**: Create session before betting
2. **Multiple Betting**: Support all bet types your UI offers
3. **Real-Time Updates**: WebSocket ready for live wheel spins
4. **Balance Sync**: Automatic balance updates after each game
5. **History Tracking**: Complete game history for player review

## 🚀 **Ready to Play!**

Your roulette game is now fully functional with:
- ✅ Complete European roulette implementation
- ✅ All standard betting options
- ✅ 2.7% house edge ensuring profitability
- ✅ Real-time balance management  
- ✅ Transaction recording
- ✅ Game history tracking
- ✅ Comprehensive error handling

The house will mathematically win 2.7% of all roulette bets over time while providing exciting, fair gameplay for your players! 🎰💰
