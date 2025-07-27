export const HOUSE_EDGE_CONFIG = {
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
      'seven': 10,
      'diamond': 8,
      'jackpot': 2
    }
  },
  poker: {
    houseRake: 5.0, // 5% rake from each pot
    tournamentFee: 10.0 // 10% tournament fee
  }
};

// Dynamic house edge adjustments
const DYNAMIC_HOUSE_EDGE = {
  peakHours: {
    multiplier: 1.2, // 20% increase during peak hours
    hours: [18, 19, 20, 21, 22] // 6PM - 10PM
  },
  playerStreak: {
    winStreak: {
      threshold: 5,     // After 5 consecutive wins
      edgeIncrease: 0.5 // Increase house edge by 0.5%
    },
    lossStreak: {
      threshold: 10,    // After 10 consecutive losses
      edgeDecrease: 0.2 // Slightly decrease to retain player
    }
  },
  vipPlayer: {
    edgeReduction: 0.1,              // 0.1% reduction for VIPs
    minimumMonthlyVolume: 100000     // 100k KES monthly volume
  }
};

export const applyHouseEdge = (originalPayout, gameType, context = {}) => {
  let houseEdge = 0;
  
  // Base house edge by game type
  switch (gameType) {
    case 'blackjack':
      houseEdge = HOUSE_EDGE_CONFIG.blackjack.dealerAdvantage / 100;
      break;
    case 'roulette':
      houseEdge = 2.7 / 100; // European roulette
      break;
    case 'slots':
      houseEdge = (100 - HOUSE_EDGE_CONFIG.slots.returnToPlayer) / 100;
      break;
    case 'poker':
      // Poker uses rake system, not payout reduction
      return originalPayout * (1 - (HOUSE_EDGE_CONFIG.poker.houseRake / 100));
    default:
      houseEdge = 0.025; // Default 2.5%
  }
  
  // Apply dynamic adjustments
  const currentHour = new Date().getHours();
  
  // Peak hours adjustment
  if (DYNAMIC_HOUSE_EDGE.peakHours.hours.includes(currentHour)) {
    houseEdge *= DYNAMIC_HOUSE_EDGE.peakHours.multiplier;
  }
  
  // Player streak adjustments
  if (context.winStreak >= DYNAMIC_HOUSE_EDGE.playerStreak.winStreak.threshold) {
    houseEdge += DYNAMIC_HOUSE_EDGE.playerStreak.winStreak.edgeIncrease / 100;
  }
  
  if (context.lossStreak >= DYNAMIC_HOUSE_EDGE.playerStreak.lossStreak.threshold) {
    houseEdge -= DYNAMIC_HOUSE_EDGE.playerStreak.lossStreak.edgeDecrease / 100;
  }
  
  // VIP player adjustment
  if (context.isVip) {
    houseEdge -= DYNAMIC_HOUSE_EDGE.vipPlayer.edgeReduction / 100;
  }
  
  // Ensure house edge doesn't go negative
  houseEdge = Math.max(0, houseEdge);
  
  // Apply house edge to payout
  const adjustedPayout = originalPayout * (1 - houseEdge);
  
  return Math.floor(adjustedPayout); // Round down to ensure house advantage
};

export const calculateExpectedValue = (betAmount, gameType, betType = 'standard') => {
  let houseEdge = 0;
  
  switch (gameType) {
    case 'blackjack':
      houseEdge = HOUSE_EDGE_CONFIG.blackjack.dealerAdvantage / 100;
      break;
    case 'roulette':
      houseEdge = 2.7 / 100;
      break;
    case 'slots':
      houseEdge = (100 - HOUSE_EDGE_CONFIG.slots.returnToPlayer) / 100;
      break;
    case 'poker':
      houseEdge = HOUSE_EDGE_CONFIG.poker.houseRake / 100;
      break;
    default:
      houseEdge = 0.025;
  }
  
  return {
    betAmount,
    expectedReturn: betAmount * (1 - houseEdge),
    houseProfit: betAmount * houseEdge,
    houseEdgePercentage: houseEdge * 100
  };
};

export const getHouseEdgeInfo = (gameType) => {
  const config = HOUSE_EDGE_CONFIG[gameType];
  
  if (!config) {
    return {
      gameType,
      houseEdge: '2.5%',
      description: 'Standard house edge'
    };
  }
  
  switch (gameType) {
    case 'blackjack':
      return {
        gameType,
        houseEdge: `${config.dealerAdvantage}%`,
        description: 'Optimal basic strategy against dealer advantage',
        features: {
          blackjackPayout: `${config.blackjackPayout}:1`,
          surrenderAllowed: config.surrenderAllowed,
          doubleDownRestrictions: config.doubleDownRestrictions
        }
      };
    
    case 'roulette':
      return {
        gameType,
        houseEdge: '2.7%',
        description: 'European roulette with single zero',
        features: {
          zeroCount: config.zeroCount,
          wheelType: 'European'
        }
      };
    
    case 'slots':
      return {
        gameType,
        houseEdge: `${100 - config.returnToPlayer}%`,
        description: `${config.returnToPlayer}% Return to Player`,
        features: {
          rtp: `${config.returnToPlayer}%`,
          jackpotFrequency: `${config.jackpotFrequency * 100}%`
        }
      };
    
    case 'poker':
      return {
        gameType,
        houseEdge: `${config.houseRake}% rake`,
        description: 'House takes percentage of each pot',
        features: {
          rake: `${config.houseRake}%`,
          tournamentFee: `${config.tournamentFee}%`
        }
      };
    
    default:
      return {
        gameType,
        houseEdge: '2.5%',
        description: 'Standard house edge'
      };
  }
};
