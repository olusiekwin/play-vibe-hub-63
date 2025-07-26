import { useState } from "react";
import { Link } from "react-router-dom";
import { useGamblingStore } from "@/store/gamblingStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Plus, Minus, Zap, Trophy } from "lucide-react";
import { games } from "@/data/gameData";
import { SlotMachine } from "@/components/SlotMachine";

const SlotsGame = () => {
  const { balance, updateBalance, addTransaction, updateGameStats } = useGamblingStore();
  const [betAmount, setBetAmount] = useState(1250);
  const [isSpinning, setIsSpinning] = useState(false);
  const [reels, setReels] = useState(['🍒', '🍒', '🍒']);
  const [gameResult, setGameResult] = useState<string>("");
  const [winAmount, setWinAmount] = useState(0);
  const { toast } = useToast();

  const game = games.find(g => g.id === 'slots')!;

  const symbols = ['🍒', '🍋', '🍊', '🍇', '🔔', '⭐', '💎'];
  const payouts = {
    '💎💎💎': 100,
    '⭐⭐⭐': 50,
    '🔔🔔🔔': 25,
    '🍇🍇🍇': 15,
    '🍊🍊🍊': 10,
    '🍋🍋🍋': 8,
    '🍒🍒🍒': 5,
    '💎💎': 3,
    '⭐⭐': 2,
    '🍒🍒': 1
  };

  const spin = async () => {
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
      game: 'slots',
      status: 'completed'
    });

    setIsSpinning(true);
    setGameResult("");
    setWinAmount(0);

    // Animate spinning
    const spinDuration = 2000;
    const spinInterval = 100;
    const spins = spinDuration / spinInterval;
    
    for (let i = 0; i < spins; i++) {
      setTimeout(() => {
        setReels([
          symbols[Math.floor(Math.random() * symbols.length)],
          symbols[Math.floor(Math.random() * symbols.length)],
          symbols[Math.floor(Math.random() * symbols.length)]
        ]);
      }, i * spinInterval);
    }

    // Final result
    setTimeout(() => {
      const finalReels = [
        symbols[Math.floor(Math.random() * symbols.length)],
        symbols[Math.floor(Math.random() * symbols.length)],
        symbols[Math.floor(Math.random() * symbols.length)]
      ];
      setReels(finalReels);
      calculateWin(finalReels);
      setIsSpinning(false);
    }, spinDuration);
  };

  const calculateWin = (finalReels: string[]) => {
    const reelString = finalReels.join('');
    let multiplier = 0;
    let resultText = "";

    // Check for exact matches first
    if (payouts[reelString as keyof typeof payouts]) {
      multiplier = payouts[reelString as keyof typeof payouts];
      resultText = `${reelString} - ${multiplier}x win!`;
    } else {
      // Check for two matching symbols
      const first = finalReels[0];
      const second = finalReels[1];
      const third = finalReels[2];
      
      if (first === second && first !== third) {
        const twoMatch = `${first}${first}`;
        if (payouts[twoMatch as keyof typeof payouts]) {
          multiplier = payouts[twoMatch as keyof typeof payouts];
          resultText = `Two ${first} - ${multiplier}x win!`;
        }
      } else if (first === third && first !== second) {
        const twoMatch = `${first}${first}`;
        if (payouts[twoMatch as keyof typeof payouts]) {
          multiplier = payouts[twoMatch as keyof typeof payouts];
          resultText = `Two ${first} - ${multiplier}x win!`;
        }
      } else if (second === third && second !== first) {
        const twoMatch = `${second}${second}`;
        if (payouts[twoMatch as keyof typeof payouts]) {
          multiplier = payouts[twoMatch as keyof typeof payouts];
          resultText = `Two ${second} - ${multiplier}x win!`;
        }
      }
    }

    if (multiplier > 0) {
      const totalWin = betAmount * multiplier;
      setWinAmount(totalWin);
      updateBalance(totalWin);
      addTransaction({
        type: 'win',
        amount: totalWin,
        game: 'slots',
        status: 'completed'
      });
      setGameResult(resultText);
      
      toast({
        title: "🎉 You Won!",
        description: `${resultText} You won KES ${totalWin.toLocaleString()}!`,
      });
    } else {
      setGameResult("No winning combination. Try again!");
      toast({
        title: "😔 No Win",
        description: "Better luck next spin!",
        variant: "destructive"
      });
    }
    
    updateGameStats({
      gamesPlayed: 1,
      totalWins: multiplier > 0 ? 1 : 0,
      totalLosses: multiplier === 0 ? 1 : 0,
      betsToday: 1,
    });
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
            <p className="text-muted-foreground">Spin to win big prizes!</p>
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
        <div className="bg-gradient-card border border-border/50 rounded-lg p-6 mb-6">
          <h2 className="text-lg font-semibold text-foreground mb-4">Place Your Bet</h2>
          
          <div className="flex items-center gap-4 mb-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setBetAmount(Math.max(game.minBet, betAmount - 625))}
              disabled={betAmount <= game.minBet || isSpinning}
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
              disabled={isSpinning}
            />
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => setBetAmount(Math.min(game.maxBet, betAmount + 625))}
              disabled={betAmount >= game.maxBet || isSpinning}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          
          <div className="flex gap-2 mb-4">
            {[625, 1250, 2500, 5000].map((amount) => (
              <Button
                key={amount}
                variant="outline"
                size="sm"
                onClick={() => setBetAmount(Math.min(game.maxBet, amount))}
                disabled={isSpinning}
              >
                KES {amount.toLocaleString()}
              </Button>
            ))}
          </div>
        </div>

        {/* Slot Machine */}
        <div className="flex justify-center mb-6">
          <SlotMachine
            reels={reels}
            isSpinning={isSpinning}
            onSpin={spin}
            betAmount={betAmount}
            gameResult={gameResult}
            winAmount={winAmount}
          />
        </div>

        {/* Payout Table */}
        <div className="bg-gradient-card border border-border/50 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-foreground mb-4">Payout Table</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
            <div className="flex justify-between items-center p-2 bg-muted/10 rounded">
              <span className="text-foreground">💎💎💎</span>
              <span className="text-foreground font-bold">100x</span>
            </div>
            <div className="flex justify-between items-center p-2 bg-muted/10 rounded">
              <span className="text-foreground">⭐⭐⭐</span>
              <span className="text-foreground font-bold">50x</span>
            </div>
            <div className="flex justify-between items-center p-2 bg-muted/10 rounded">
              <span className="text-foreground">🔔🔔🔔</span>
              <span className="text-foreground font-bold">25x</span>
            </div>
            <div className="flex justify-between items-center p-2 bg-muted/10 rounded">
              <span className="text-foreground">🍇🍇🍇</span>
              <span className="text-foreground font-bold">15x</span>
            </div>
            <div className="flex justify-between items-center p-2 bg-muted/10 rounded">
              <span className="text-foreground">🍊🍊🍊</span>
              <span className="text-foreground font-bold">10x</span>
            </div>
            <div className="flex justify-between items-center p-2 bg-muted/10 rounded">
              <span className="text-foreground">🍋🍋🍋</span>
              <span className="text-foreground font-bold">8x</span>
            </div>
            <div className="flex justify-between items-center p-2 bg-muted/10 rounded">
              <span className="text-foreground">🍒🍒🍒</span>
              <span className="text-foreground font-bold">5x</span>
            </div>
            <div className="flex justify-between items-center p-2 bg-muted/10 rounded">
              <span className="text-foreground">Any 2 matching</span>
              <span className="text-foreground font-bold">1-3x</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SlotsGame;