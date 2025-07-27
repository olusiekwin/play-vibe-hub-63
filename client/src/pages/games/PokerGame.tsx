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
      <div className="max-w-4xl mx-auto px-4 pt-6">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Link to="/games">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Games
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-foreground">{game.title}</h1>
            <p className="text-muted-foreground">Get the best poker hand!</p>
          </div>
        </div>

        {/* Game Info */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-gradient-card border border-border/50 rounded-lg p-4 text-center">
            <p className="text-sm text-muted-foreground">Your Balance</p>
            <p className="text-2xl font-bold text-primary">KES {balance.toLocaleString()}</p>
          </div>
          <div className="bg-gradient-card border border-border/50 rounded-lg p-4 text-center">
            <p className="text-sm text-muted-foreground">Min Bet</p>
            <p className="text-2xl font-bold text-foreground">KES {game.minBet.toLocaleString()}</p>
          </div>
          <div className="bg-gradient-card border border-border/50 rounded-lg p-4 text-center">
            <p className="text-sm text-muted-foreground">Max Bet</p>
            <p className="text-2xl font-bold text-foreground">KES {game.maxBet.toLocaleString()}</p>
          </div>
          <div className="bg-gradient-card border border-border/50 rounded-lg p-4 text-center">
            <p className="text-sm text-muted-foreground">Current Bet</p>
            <p className="text-2xl font-bold text-accent">KES {betAmount.toLocaleString()}</p>
          </div>
        </div>

        {/* Bet Controls */}
        {!isPlaying && (
          <div className="bg-gradient-card border border-border/50 rounded-lg p-6 mb-6">
            <h2 className="text-lg font-semibold text-foreground mb-4">Place Your Bet</h2>
            
            <div className="flex items-center gap-4 mb-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setBetAmount(Math.max(game.minBet, betAmount - 1250))}
                disabled={betAmount <= game.minBet}
              >
                <Minus className="h-4 w-4" />
              </Button>
              
              <Input
                type="number"
                value={betAmount}
                onChange={(e) => setBetAmount(Math.max(game.minBet, Math.min(game.maxBet, parseInt(e.target.value) || game.minBet)))}
                className="w-24 text-center"
                min={game.minBet}
                max={game.maxBet}
              />
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => setBetAmount(Math.min(game.maxBet, betAmount + 1250))}
                disabled={betAmount >= game.maxBet}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            
            <div className="flex gap-2 mb-4">
              {[1250, 2500, 5000, 10000].map((amount) => (
                <Button
                  key={amount}
                  variant="outline"
                  size="sm"
                  onClick={() => setBetAmount(Math.min(game.maxBet, amount))}
                >
                  KES {amount.toLocaleString()}
                </Button>
              ))}
            </div>
            
            <Button variant="casino" onClick={startGame} className="w-full">
              <Shuffle className="h-4 w-4 mr-2" />
              Deal Cards
            </Button>
          </div>
        )}

        {/* Game Board */}
        {isPlaying || gameResult && (
          <div className="space-y-6">
            {/* Player Cards */}
            <div className="bg-gradient-card border border-border/50 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-foreground mb-4">
                Your Hand {handRank && `- ${handRank}`}
              </h3>
              <div className="flex gap-3 justify-center flex-wrap">
                {playerCards.map((card, index) => (
                  <PlayingCard
                    key={index}
                    rank={card.slice(0, -1)}
                    suit={card.slice(-1)}
                    className="hover:scale-110 transition-transform duration-200"
                  />
                ))}
              </div>
            </div>

            {/* Game Controls */}
            {isPlaying && !gameResult && (
              <div className="text-center">
                <Button variant="casino" onClick={finishGame} size="lg">
                  <Trophy className="h-4 w-4 mr-2" />
                  Show Results
                </Button>
              </div>
            )}

            {/* Game Result */}
            {gameResult && (
              <div className="bg-gradient-card border border-border/50 rounded-lg p-6 text-center">
                <div className="flex items-center justify-center gap-2 mb-4">
                  <Trophy className="h-6 w-6 text-accent" />
                  <h2 className="text-xl font-bold text-foreground">Game Over</h2>
                </div>
                <p className="text-lg text-accent mb-2">{handRank}</p>
                <p className="text-lg text-muted-foreground mb-4">{gameResult}</p>
                <Button variant="casino" onClick={resetGame}>
                  Play Again
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Payout Table */}
        <div className="bg-gradient-card border border-border/50 rounded-lg p-6 mt-6">
          <h3 className="text-lg font-semibold text-foreground mb-4">Payout Table</h3>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Straight Flush</span>
              <span className="text-foreground font-bold">50x</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Four of a Kind</span>
              <span className="text-foreground font-bold">25x</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Full House</span>
              <span className="text-foreground font-bold">9x</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Flush</span>
              <span className="text-foreground font-bold">6x</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Straight</span>
              <span className="text-foreground font-bold">4x</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Three of a Kind</span>
              <span className="text-foreground font-bold">3x</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Two Pair</span>
              <span className="text-foreground font-bold">2x</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Pair</span>
              <span className="text-foreground font-bold">1x</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PokerGame;