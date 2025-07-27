interface HouseEdgeConfig {
  blackjack: {
    dealerAdvantage: number;
    blackjackPayout: number;
    doubleDownRestrictions: boolean;
    surrenderAllowed: boolean;
  };
  roulette: {
    zeroCount: number; // 1 for European, 2 for American
    payoutMultipliers: Record<string, number>;
  };
  slots: {
    returnToPlayer: number; // RTP percentage (house edge = 100 - RTP)
    jackpotFrequency: number;
    symbolWeights: Record<string, number>;
  };
  poker: {
    houseRake: number; // Percentage taken from each pot
    tournamentFee: number;
  };
}

export const HOUSE_EDGE_CONFIG: HouseEdgeConfig = {
  blackjack: {
    dealerAdvantage: 0.5, // 0.5% house edge
    blackjackPayout: 1.5, // 3:2 payout (not 1:1 which increases house edge)
    doubleDownRestrictions: true, // Restrict to 9,10,11 only
    surrenderAllowed: false // No surrender increases house edge
  },
  roulette: {
    zeroCount: 1, // European roulette (2.7% house edge vs 5.26% American)
    payoutMultipliers: {
      straight: 35, // Single number
      split: 17,    // Two numbers
      street: 11,   // Three numbers
      corner: 8,    // Four numbers
      line: 5,      // Six numbers
      column: 2,    // Column bet
      dozen: 2,     // Dozen bet
      evenOdd: 1,   // Even/Odd
      redBlack: 1,  // Red/Black
      highLow: 1    // High/Low
    }
  },
  slots: {
    returnToPlayer: 94.0, // 6% house edge (industry standard: 92-98%)
    jackpotFrequency: 0.0001, // 0.01% chance
    symbolWeights: {
      'cherry': 20,
      'lemon': 18,
      'bell': 15,
      'bar': 12,
      'seven': 8,
      'diamond': 5,
      'jackpot': 2
    }
  },
  poker: {
    houseRake: 5.0, // 5% rake on each pot
    tournamentFee: 10.0 // 10% tournament fee
  }
};

// House edge calculation utilities
export class HouseEdgeCalculator {
  
  static calculateBlackjackAdvantage(playerScore: number, dealerScore: number, gameRules: any): number {
    let houseAdvantage = HOUSE_EDGE_CONFIG.blackjack.dealerAdvantage;
    
    // Dealer hits on soft 17 (increases house edge by 0.2%)
    if (dealerScore === 17 && gameRules.dealerHitsSoft17) {
      houseAdvantage += 0.2;
    }
    
    // No surrender option increases house edge
    if (!HOUSE_EDGE_CONFIG.blackjack.surrenderAllowed) {
      houseAdvantage += 0.1;
    }
    
    return houseAdvantage;
  }
  
  static calculateSlotsPayout(symbols: string[][], betAmount: number): number {
    const config = HOUSE_EDGE_CONFIG.slots;
    let totalPayout = 0;
    
    // Check winning combinations
    const winningLines = this.checkSlotWinningLines(symbols);
    
    // Apply house edge to reduce actual payouts
    const houseEdge = (100 - config.returnToPlayer) / 100;
    const adjustedPayout = winningLines.reduce((sum, line) => sum + line.payout, 0);
    
    // Ensure house edge is maintained over time
    return Math.floor(adjustedPayout * (1 - houseEdge));
  }
  
  static calculateRoulettePayout(bet: any, winningNumber: number): number {
    const config = HOUSE_EDGE_CONFIG.roulette;
    let payout = 0;
    
    // Standard roulette payouts with built-in house edge
    switch (bet.type) {
      case 'straight':
        payout = bet.value === winningNumber ? bet.amount * config.payoutMultipliers.straight : 0;
        break;
      case 'red':
      case 'black':
        const isRed = this.isRedNumber(winningNumber);
        const isWinning = (bet.value === 'red' && isRed) || (bet.value === 'black' && !isRed);
        // Zero (green) makes all red/black bets lose - this creates house edge
        payout = isWinning && winningNumber !== 0 ? bet.amount * config.payoutMultipliers.redBlack : 0;
        break;
      // Add other bet types...
    }
    
    return payout;
  }
  
  private static checkSlotWinningLines(symbols: string[][]): any[] {
    // Implement slot winning logic with weighted probabilities
    // This ensures the house edge is maintained through symbol distribution
    return [];
  }
  
  private static isRedNumber(number: number): boolean {
    const redNumbers = [1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36];
    return redNumbers.includes(number);
  }
}

// Configurable house edge multipliers for different scenarios
export const DYNAMIC_HOUSE_EDGE = {
  // Increase house edge during high-traffic periods
  peakHours: {
    multiplier: 1.2, // 20% increase
    hours: [18, 19, 20, 21, 22] // 6PM - 10PM
  },
  
  // Adjust based on player win/loss streaks
  playerStreak: {
    winStreak: {
      threshold: 5, // After 5 wins in a row
      edgeIncrease: 0.5 // Increase house edge by 0.5%
    },
    lossStreak: {
      threshold: 10, // After 10 losses
      edgeDecrease: 0.2 // Slightly decrease to keep player engaged
    }
  },
  
  // VIP player adjustments
  vipPlayer: {
    edgeReduction: 0.1, // Slightly better odds for high-value players
    minimumMonthlyVolume: 100000 // 100k KES monthly volume
  }
};
