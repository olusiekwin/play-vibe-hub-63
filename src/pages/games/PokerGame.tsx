import { useState } from "react";
import { Link } from "react-router-dom";
import { useGamblingStore } from "@/store/gamblingStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Plus, Minus, Shuffle, Trophy } from "lucide-react";
import { games } from "@/data/gameData";
import { PlayingCard } from "@/components/PlayingCard";

const PokerGame = () => {
  const { balance, updateBalance, addTransaction, updateGameStats } = useGamblingStore();
  const [betAmount, setBetAmount] = useState(2500);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playerCards, setPlayerCards] = useState<string[]>([]);
  const [gameResult, setGameResult] = useState<string>("");
  const [handRank, setHandRank] = useState<string>("");
  const { toast } = useToast();

  const game = games.find(g => g.id === 'poker')!;

  const suits = ['♠', '♥', '♦', '♣'];
  const ranks = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

  const generateCard = (): string => {
    const suit = suits[Math.floor(Math.random() * suits.length)];
    const rank = ranks[Math.floor(Math.random() * ranks.length)];
    return `${rank}${suit}`;
  };

  const analyzeHand = (cards: string[]): { rank: string, multiplier: number } => {
    const cardRanks = cards.map(card => card.slice(0, -1));
    const cardSuits = cards.map(card => card.slice(-1));
    
    // Count rank occurrences
    const rankCounts = cardRanks.reduce((acc, rank) => {
      acc[rank] = (acc[rank] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    const counts = Object.values(rankCounts).sort((a, b) => b - a);
    const isFlush = new Set(cardSuits).size === 1;
    
    // Check for straight
    const rankValues = cardRanks.map(rank => {
      if (rank === 'A') return 14;
      if (rank === 'K') return 13;
      if (rank === 'Q') return 12;
      if (rank === 'J') return 11;
      return parseInt(rank);
    }).sort((a, b) => a - b);
    
    const isStraight = rankValues.every((val, i) => i === 0 || val === rankValues[i - 1] + 1);
    
    if (isFlush && isStraight) return { rank: "Straight Flush", multiplier: 50 };
    if (counts[0] === 4) return { rank: "Four of a Kind", multiplier: 25 };
    if (counts[0] === 3 && counts[1] === 2) return { rank: "Full House", multiplier: 9 };
    if (isFlush) return { rank: "Flush", multiplier: 6 };
    if (isStraight) return { rank: "Straight", multiplier: 4 };
    if (counts[0] === 3) return { rank: "Three of a Kind", multiplier: 3 };
    if (counts[0] === 2 && counts[1] === 2) return { rank: "Two Pair", multiplier: 2 };
    if (counts[0] === 2) return { rank: "Pair", multiplier: 1 };
    
    return { rank: "High Card", multiplier: 0 };
  };

  const startGame = () => {
    if (betAmount > balance) {
      toast({
        title: "Insufficient Funds",
        description: "Please reduce your bet or top up your wallet.",
        variant: "destructive"
      });
      return;
    }

    updateBalance(-betAmount);
    addTransaction({
      type: 'bet',
      amount: -betAmount,
      game: 'poker',
      status: 'completed'
    });

    const newCards = Array(5).fill(null).map(() => generateCard());
    setPlayerCards(newCards);
    setIsPlaying(true);
    setGameResult("");
    setHandRank("");
  };

  const finishGame = () => {
    const analysis = analyzeHand(playerCards);
    setHandRank(analysis.rank);
    
    let winAmount = 0;
    if (analysis.multiplier > 0) {
      winAmount = betAmount * analysis.multiplier;
      updateBalance(winAmount);
      addTransaction({
        type: 'win',
        amount: winAmount,
        game: 'poker',
        status: 'completed'
      });
    }
    
    updateGameStats({
      gamesPlayed: 1,
      totalWins: winAmount > 0 ? 1 : 0,
      totalLosses: winAmount === 0 ? 1 : 0,
      betsToday: 1,
    });
    
    const result = winAmount > 0 ? `You won KES ${winAmount.toLocaleString()}!` : "No winning hand.";
    setGameResult(result);
    setIsPlaying(false);
    
    toast({
      title: winAmount > 0 ? "🎉 Winning Hand!" : "😔 Better luck next time!",
      description: `${analysis.rank} - ${result}`,
      variant: winAmount > 0 ? "default" : "destructive"
    });
  };

  const resetGame = () => {
    setPlayerCards([]);
    setGameResult("");
    setHandRank("");
    setIsPlaying(false);
  };

  return (
    <div className="min-h-screen bg-gradient-background pb-20">
      {/* Casino Atmosphere Background */}
      <div className="fixed inset-0 bg-gradient-to-br from-casino-black via-felt-green/20 to-casino-black opacity-90 pointer-events-none" />
      
      <div className="relative max-w-4xl mx-auto px-4 pt-6">
        {/* Premium Header */}
        <div className="flex items-center gap-4 mb-6 bg-gradient-felt border border-casino-gold/30 rounded-xl p-4 shadow-deep">
          <Link to="/games">
            <Button variant="outline" size="sm" className="border-casino-gold/50 text-casino-gold hover:bg-casino-gold/10">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Games
            </Button>
          </Link>
          <div className="flex-1">
            <h1 className="text-3xl font-bold bg-gradient-money bg-clip-text text-transparent drop-shadow-lg">
              💎 {game.title} 💎
            </h1>
            <p className="text-casino-gold/90 font-medium">Premium Five-Card Draw Poker</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-casino-gold/70">House Edge</p>
            <p className="text-lg font-bold text-casino-emerald">2.5%</p>
          </div>
        </div>

        {/* Premium Stats Dashboard */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-gradient-casino border-2 border-casino-gold/50 rounded-xl p-4 text-center shadow-money">
            <p className="text-sm text-casino-black/80 font-semibold">💰 YOUR BALANCE</p>
            <p className="text-2xl font-bold text-casino-black drop-shadow-sm">KES {balance.toLocaleString()}</p>
            <div className="w-full bg-casino-black/20 rounded-full h-1 mt-2">
              <div className="bg-casino-emerald h-1 rounded-full w-3/4"></div>
            </div>
          </div>
          <div className="bg-gradient-poker border-2 border-poker-blue/70 rounded-xl p-4 text-center shadow-deep">
            <p className="text-sm text-casino-gold/90 font-semibold">⚡ MIN BET</p>
            <p className="text-2xl font-bold text-casino-white">KES {game.minBet.toLocaleString()}</p>
          </div>
          <div className="bg-gradient-poker border-2 border-poker-blue/70 rounded-xl p-4 text-center shadow-deep">
            <p className="text-sm text-casino-gold/90 font-semibold">🎯 MAX BET</p>
            <p className="text-2xl font-bold text-casino-white">KES {game.maxBet.toLocaleString()}</p>
          </div>
          <div className="bg-gradient-money border-2 border-casino-emerald/70 rounded-xl p-4 text-center shadow-money animate-pulse-glow">
            <p className="text-sm text-casino-black/80 font-semibold">🎲 CURRENT BET</p>
            <p className="text-2xl font-bold text-casino-black">KES {betAmount.toLocaleString()}</p>
          </div>
        </div>

        {/* Premium Betting Interface */}
        {!isPlaying && (
          <div className="bg-gradient-felt border-2 border-casino-gold/40 rounded-xl p-6 mb-6 shadow-deep">
            <h2 className="text-xl font-bold text-casino-gold mb-6 text-center">
              💎 PLACE YOUR BET 💎
            </h2>
            
            <div className="flex items-center justify-center gap-4 mb-6">
              <Button
                variant="outline"
                size="lg"
                onClick={() => setBetAmount(Math.max(game.minBet, betAmount - 1250))}
                disabled={betAmount <= game.minBet}
                className="border-casino-gold/50 text-casino-gold hover:bg-casino-gold/20 h-12 w-12 rounded-full"
              >
                <Minus className="h-5 w-5" />
              </Button>
              
              <div className="bg-casino-black/50 border-2 border-casino-gold rounded-xl p-4 min-w-[200px] text-center">
                <Input
                  type="number"
                  value={betAmount}
                  onChange={(e) => setBetAmount(Math.max(game.minBet, Math.min(game.maxBet, parseInt(e.target.value) || game.minBet)))}
                  className="text-center text-2xl font-bold bg-transparent border-none text-casino-gold focus:ring-casino-gold"
                  min={game.minBet}
                  max={game.maxBet}
                />
                <p className="text-casino-gold/70 text-sm font-medium">KES Amount</p>
              </div>
              
              <Button
                variant="outline"
                size="lg"
                onClick={() => setBetAmount(Math.min(game.maxBet, betAmount + 1250))}
                disabled={betAmount >= game.maxBet}
                className="border-casino-gold/50 text-casino-gold hover:bg-casino-gold/20 h-12 w-12 rounded-full"
              >
                <Plus className="h-5 w-5" />
              </Button>
            </div>
            
            <div className="grid grid-cols-4 gap-3 mb-6">
              {[1250, 2500, 5000, 10000].map((amount) => (
                <Button
                  key={amount}
                  variant="outline"
                  onClick={() => setBetAmount(Math.min(game.maxBet, amount))}
                  className="bg-casino-gold/10 border-casino-gold/40 text-casino-gold hover:bg-casino-gold/20 font-bold py-3"
                >
                  KES {amount.toLocaleString()}
                </Button>
              ))}
            </div>
            
            <Button 
              onClick={startGame} 
              className="w-full h-14 text-xl font-bold bg-gradient-money border-2 border-casino-emerald shadow-money hover:shadow-deep transition-all duration-300 hover:scale-105"
            >
              <Shuffle className="h-6 w-6 mr-3" />
              💰 DEAL CARDS & WIN BIG 💰
            </Button>
          </div>
        )}

        {/* Premium Casino Table */}
        {isPlaying || gameResult && (
          <div className="space-y-6">
            {/* Professional Poker Table */}
            <div className="bg-gradient-felt border-4 border-casino-gold/60 rounded-2xl p-8 shadow-deep relative overflow-hidden">
              {/* Table Felt Pattern */}
              <div className="absolute inset-0 bg-felt-green opacity-20 pointer-events-none" style={{
                backgroundImage: `radial-gradient(circle at 1px 1px, rgba(255,255,255,0.15) 1px, transparent 0)`,
                backgroundSize: '20px 20px'
              }} />
              
              <h3 className="text-2xl font-bold text-casino-gold mb-6 text-center drop-shadow-lg">
                🎭 {handRank ? `${handRank} Hand` : 'Your Poker Hand'} 🎭
              </h3>
              
              <div className="relative flex gap-4 justify-center flex-wrap mb-6">
                {playerCards.map((card, index) => (
                  <div key={index} className="relative">
                    <PlayingCard
                      rank={card.slice(0, -1)}
                      suit={card.slice(-1)}
                      className="hover:scale-110 transition-all duration-300 shadow-deep"
                    />
                    {handRank && (
                      <div className="absolute -top-3 -right-3 w-8 h-8 bg-casino-gold rounded-full flex items-center justify-center text-casino-black font-bold text-sm animate-bounce">
                        {index + 1}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Decorative casino elements */}
              <div className="absolute top-4 left-4 text-casino-gold/30 text-2xl">♠</div>
              <div className="absolute top-4 right-4 text-casino-gold/30 text-2xl">♥</div>
              <div className="absolute bottom-4 left-4 text-casino-gold/30 text-2xl">♦</div>
              <div className="absolute bottom-4 right-4 text-casino-gold/30 text-2xl">♣</div>
            </div>

            {/* Game Action Center */}
            {isPlaying && !gameResult && (
              <div className="text-center bg-gradient-casino border-2 border-casino-gold rounded-xl p-6 shadow-money">
                <Button 
                  onClick={finishGame} 
                  size="lg"
                  className="bg-gradient-money border-2 border-casino-emerald text-casino-black font-bold text-xl px-8 py-4 shadow-money hover:shadow-deep transition-all duration-300 hover:scale-105"
                >
                  <Trophy className="h-6 w-6 mr-3" />
                  💰 REVEAL WINNING HAND 💰
                </Button>
              </div>
            )}

            {/* Premium Results Display */}
            {gameResult && (
              <div className="bg-gradient-casino border-4 border-casino-gold rounded-2xl p-8 text-center shadow-money relative overflow-hidden">
                {/* Celebration background effect */}
                <div className="absolute inset-0 bg-gradient-to-r from-casino-gold/20 via-casino-emerald/20 to-casino-gold/20 animate-pulse" />
                
                <div className="relative z-10">
                  <div className="flex items-center justify-center gap-3 mb-6">
                    <Trophy className="h-12 w-12 text-casino-gold animate-bounce" />
                    <h2 className="text-3xl font-bold text-casino-black drop-shadow-lg">GAME COMPLETE</h2>
                    <Trophy className="h-12 w-12 text-casino-gold animate-bounce" />
                  </div>
                  
                  <div className="bg-casino-black/20 rounded-xl p-4 mb-6">
                    <p className="text-2xl font-bold text-casino-emerald mb-2">{handRank}</p>
                    <p className="text-xl text-casino-black font-semibold">{gameResult}</p>
                  </div>
                  
                  <Button 
                    onClick={resetGame}
                    className="bg-gradient-money border-2 border-casino-emerald text-casino-black font-bold text-xl px-8 py-4 shadow-money hover:shadow-deep transition-all duration-300 hover:scale-105"
                  >
                    🎲 PLAY ANOTHER HAND 🎲
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Premium Payout Schedule */}
        <div className="bg-gradient-casino border-4 border-casino-gold/70 rounded-2xl p-8 mt-6 shadow-money">
          <h3 className="text-2xl font-bold text-casino-black mb-6 text-center drop-shadow-lg">
            💎 OFFICIAL PAYOUT SCHEDULE 💎
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              { hand: "Straight Flush", multiplier: "50x", emoji: "🎆", color: "text-casino-ruby" },
              { hand: "Four of a Kind", multiplier: "25x", emoji: "👑", color: "text-casino-emerald" },
              { hand: "Full House", multiplier: "9x", emoji: "🏠", color: "text-casino-gold" },
              { hand: "Flush", multiplier: "6x", emoji: "🌊", color: "text-poker-blue" },
              { hand: "Straight", multiplier: "4x", emoji: "📈", color: "text-casino-emerald" },
              { hand: "Three of a Kind", multiplier: "3x", emoji: "🎯", color: "text-casino-gold" },
              { hand: "Two Pair", multiplier: "2x", emoji: "👥", color: "text-casino-emerald" },
              { hand: "Pair", multiplier: "1x", emoji: "⭐", color: "text-casino-gold" }
            ].map((payout, index) => (
              <div key={index} className="bg-casino-black/20 border border-casino-gold/30 rounded-xl p-4 flex justify-between items-center hover:bg-casino-gold/10 transition-all duration-200">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{payout.emoji}</span>
                  <span className="text-casino-black font-semibold">{payout.hand}</span>
                </div>
                <span className={`text-xl font-bold ${payout.color} drop-shadow-sm`}>
                  {payout.multiplier}
                </span>
              </div>
            ))}
          </div>
          
          <div className="mt-6 text-center bg-casino-black/20 rounded-xl p-4">
            <p className="text-casino-black/80 text-sm font-medium">
              💰 Minimum qualifying hand: One Pair or better
            </p>
            <p className="text-casino-emerald font-bold">
              🎲 House Edge: 2.5% | RTP: 97.5%
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PokerGame;