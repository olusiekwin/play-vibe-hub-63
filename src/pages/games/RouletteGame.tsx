import { useState } from "react";
import { Link } from "react-router-dom";
import { useGamblingStore } from "@/store/gamblingStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Plus, Minus, RotateCcw, Trophy } from "lucide-react";
import { games } from "@/data/gameData";
import { cn } from "@/lib/utils";
import { RouletteWheel } from "@/components/RouletteWheel";

const RouletteGame = () => {
  const { balance, updateBalance, addTransaction, updateGameStats } = useGamblingStore();
  const [betAmount, setBetAmount] = useState(2500);
  const [selectedBets, setSelectedBets] = useState<Record<string, number>>({});
  const [isSpinning, setIsSpinning] = useState(false);
  const [winningNumber, setWinningNumber] = useState<number | null>(null);
  const [gameResult, setGameResult] = useState<string>("");
  const [totalWin, setTotalWin] = useState(0);
  const { toast } = useToast();

  const game = games.find(g => g.id === 'roulette')!;

  const numbers = Array.from({ length: 37 }, (_, i) => i); // 0-36
  const redNumbers = [1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36];

  const placeBet = (betType: string, amount: number) => {
    const totalBets = Object.values(selectedBets).reduce((sum, bet) => sum + bet, 0);
    if (totalBets + amount > balance) {
      toast({
        title: "Insufficient Funds",
        description: "You don't have enough balance for this bet.",
        variant: "destructive"
      });
      return;
    }

    setSelectedBets(prev => ({
      ...prev,
      [betType]: (prev[betType] || 0) + amount
    }));
  };

  const clearBets = () => {
    setSelectedBets({});
  };

  const spin = async () => {
    const totalBets = Object.values(selectedBets).reduce((sum, bet) => sum + bet, 0);
    
    if (totalBets === 0) {
      toast({
        title: "No Bets Placed",
        description: "Please place at least one bet before spinning.",
        variant: "destructive"
      });
      return;
    }

    if (totalBets > balance) {
      toast({
        title: "Insufficient Funds",
        description: "You don't have enough balance for these bets.",
        variant: "destructive"
      });
      return;
    }

    // Deduct total bets from balance
    updateBalance(-totalBets);
    addTransaction({
      type: 'bet',
      amount: -totalBets,
      game: 'roulette',
      status: 'completed'
    });

    setIsSpinning(true);
    setGameResult("");
    setTotalWin(0);

    // Simulate spinning animation
    setTimeout(() => {
      const result = Math.floor(Math.random() * 37); // 0-36
      setWinningNumber(result);
      calculateWinnings(result);
      setIsSpinning(false);
    }, 3000);
  };

  const calculateWinnings = (number: number) => {
    let totalWinnings = 0;
    const results: string[] = [];

    // Check each bet type
    Object.entries(selectedBets).forEach(([betType, betAmount]) => {
      let won = false;
      let multiplier = 0;

      switch (betType) {
        case 'red':
          won = redNumbers.includes(number) && number !== 0;
          multiplier = 2;
          break;
        case 'black':
          won = !redNumbers.includes(number) && number !== 0;
          multiplier = 2;
          break;
        case 'even':
          won = number % 2 === 0 && number !== 0;
          multiplier = 2;
          break;
        case 'odd':
          won = number % 2 === 1;
          multiplier = 2;
          break;
        case 'low':
          won = number >= 1 && number <= 18;
          multiplier = 2;
          break;
        case 'high':
          won = number >= 19 && number <= 36;
          multiplier = 2;
          break;
        case 'first12':
          won = number >= 1 && number <= 12;
          multiplier = 3;
          break;
        case 'second12':
          won = number >= 13 && number <= 24;
          multiplier = 3;
          break;
        case 'third12':
          won = number >= 25 && number <= 36;
          multiplier = 3;
          break;
        default:
          // Straight number bet
          if (betType.startsWith('number-')) {
            const betNumber = parseInt(betType.split('-')[1]);
            won = number === betNumber;
            multiplier = 36;
          }
      }

      if (won) {
        const winAmount = betAmount * multiplier;
        totalWinnings += winAmount;
        results.push(`${betType}: +KES ${winAmount.toLocaleString()}`);
      } else {
        results.push(`${betType}: -KES ${betAmount.toLocaleString()}`);
      }
    });

    if (totalWinnings > 0) {
      updateBalance(totalWinnings);
      addTransaction({
        type: 'win',
        amount: totalWinnings,
        game: 'roulette',
        status: 'completed'
      });
    }

    setTotalWin(totalWinnings);
    setGameResult(results.join(', '));
    
    updateGameStats({
      gamesPlayed: 1,
      totalWins: totalWinnings > 0 ? 1 : 0,
      totalLosses: totalWinnings === 0 ? 1 : 0,
      betsToday: 1,
    });

    toast({
      title: totalWinnings > 0 ? "🎉 You Won!" : "😔 No Win",
      description: `Number ${number}! ${totalWinnings > 0 ? `You won KES ${totalWinnings.toLocaleString()}!` : 'Better luck next spin!'}`,
      variant: totalWinnings > 0 ? "default" : "destructive"
    });

    // Clear bets after spin
    setSelectedBets({});
  };

  const resetGame = () => {
    setWinningNumber(null);
    setGameResult("");
    setTotalWin(0);
    setSelectedBets({});
  };

  return (
    <div className="min-h-screen bg-gradient-background pb-20">
      <div className="max-w-6xl mx-auto px-4 pt-6">
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
            <p className="text-muted-foreground">Place your bets and spin the wheel!</p>
          </div>
        </div>

        {/* Game Info */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          <div className="bg-gradient-card border border-border/50 rounded-lg p-4 text-center">
            <p className="text-sm text-muted-foreground">Your Balance</p>
            <p className="text-2xl font-bold text-primary">KES {balance.toLocaleString()}</p>
          </div>
          <div className="bg-gradient-card border border-border/50 rounded-lg p-4 text-center">
            <p className="text-sm text-muted-foreground">Total Bets</p>
            <p className="text-2xl font-bold text-accent">KES {Object.values(selectedBets).reduce((sum, bet) => sum + bet, 0).toLocaleString()}</p>
          </div>
          <div className="bg-gradient-card border border-border/50 rounded-lg p-4 text-center">
            <p className="text-sm text-muted-foreground">Last Number</p>
            <p className="text-2xl font-bold text-foreground">{winningNumber !== null ? winningNumber : '-'}</p>
          </div>
          <div className="bg-gradient-card border border-border/50 rounded-lg p-4 text-center">
            <p className="text-sm text-muted-foreground">Last Win</p>
            <p className="text-2xl font-bold text-secondary">KES {totalWin.toLocaleString()}</p>
          </div>
          <div className="bg-gradient-card border border-border/50 rounded-lg p-4 text-center">
            <p className="text-sm text-muted-foreground">Bet Amount</p>
            <p className="text-2xl font-bold text-foreground">KES {betAmount.toLocaleString()}</p>
          </div>
        </div>

        {/* Bet Amount Controls */}
        <div className="bg-gradient-card border border-border/50 rounded-lg p-6 mb-6">
          <h2 className="text-lg font-semibold text-foreground mb-4">Bet Amount</h2>
          
          <div className="flex items-center gap-4 mb-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setBetAmount(Math.max(250, betAmount - 1250))}
              disabled={isSpinning}
            >
              <Minus className="h-4 w-4" />
            </Button>
            
            <Input
              type="number"
              value={betAmount}
              onChange={(e) => setBetAmount(Math.max(250, parseInt(e.target.value) || 250))}
              className="w-24 text-center"
              disabled={isSpinning}
            />
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => setBetAmount(betAmount + 1250)}
              disabled={isSpinning}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          
          <div className="flex gap-2">
            {[1250, 2500, 5000, 10000].map((amount) => (
              <Button
                key={amount}
                variant="outline"
                size="sm"
                onClick={() => setBetAmount(amount)}
                disabled={isSpinning}
              >
                KES {amount.toLocaleString()}
              </Button>
            ))}
          </div>
        </div>

        {/* Roulette Wheel & Numbers */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Wheel */}
          <div className="bg-gradient-card border border-border/50 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-foreground mb-4 text-center">European Roulette</h3>
            <RouletteWheel 
              isSpinning={isSpinning}
              winningNumber={winningNumber}
            />
          </div>

          {/* Number Grid */}
          <div className="bg-gradient-card border border-border/50 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-foreground mb-4">Straight Number Bets</h3>
            <div className="grid grid-cols-6 gap-1 text-xs">
              {numbers.map(num => (
                <Button
                  key={num}
                  variant="outline"
                  size="sm"
                  className={cn(
                    "h-8 p-1",
                    num === 0 ? "bg-secondary/20 text-secondary" :
                    redNumbers.includes(num) ? "bg-red-500/20 text-red-500" : "bg-foreground/10",
                    selectedBets[`number-${num}`] && "ring-2 ring-primary"
                  )}
                  onClick={() => placeBet(`number-${num}`, betAmount)}
                  disabled={isSpinning}
                >
                  {num}
                  {selectedBets[`number-${num}`] && (
                    <div className="text-xs">KES {selectedBets[`number-${num}`].toLocaleString()}</div>
                  )}
                </Button>
              ))}
            </div>
          </div>
        </div>

        {/* Outside Bets */}
        <div className="bg-gradient-card border border-border/50 rounded-lg p-6 mb-6">
          <h3 className="text-lg font-semibold text-foreground mb-4">Outside Bets</h3>
          
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {[
              { key: 'red', label: 'Red', color: 'bg-red-500/20 text-red-500' },
              { key: 'black', label: 'Black', color: 'bg-foreground/20' },
              { key: 'even', label: 'Even', color: 'bg-primary/20 text-primary' },
              { key: 'odd', label: 'Odd', color: 'bg-accent/20 text-accent' },
              { key: 'low', label: '1-18', color: 'bg-secondary/20 text-secondary' },
              { key: 'high', label: '19-36', color: 'bg-secondary/20 text-secondary' },
              { key: 'first12', label: '1st 12', color: 'bg-muted/20' },
              { key: 'second12', label: '2nd 12', color: 'bg-muted/20' },
              { key: 'third12', label: '3rd 12', color: 'bg-muted/20' }
            ].map(bet => (
              <Button
                key={bet.key}
                variant="outline"
                className={cn(
                  "flex flex-col gap-1 h-16",
                  bet.color,
                  selectedBets[bet.key] && "ring-2 ring-primary"
                )}
                onClick={() => placeBet(bet.key, betAmount)}
                disabled={isSpinning}
              >
                <span className="font-bold">{bet.label}</span>
                {selectedBets[bet.key] && (
                  <span className="text-xs">KES {selectedBets[bet.key].toLocaleString()}</span>
                )}
              </Button>
            ))}
          </div>
        </div>

        {/* Game Controls */}
        <div className="flex gap-4 mb-6">
          <Button
            variant="casino"
            size="lg"
            onClick={spin}
            disabled={isSpinning || Object.keys(selectedBets).length === 0}
            className="flex-1"
          >
            {isSpinning ? (
              <>
                <RotateCcw className="h-5 w-5 mr-2 animate-spin" />
                Spinning...
              </>
            ) : (
              <>
                <RotateCcw className="h-5 w-5 mr-2" />
                SPIN
              </>
            )}
          </Button>
          
          <Button
            variant="outline"
            onClick={clearBets}
            disabled={isSpinning}
          >
            Clear Bets
          </Button>
          
          <Button
            variant="outline"
            onClick={resetGame}
            disabled={isSpinning}
          >
            Reset
          </Button>
        </div>

        {/* Game Result */}
        {gameResult && (
          <div className="bg-gradient-card border border-border/50 rounded-lg p-6 text-center">
            <div className="flex items-center justify-center gap-2 mb-4">
              <Trophy className="h-6 w-6 text-accent" />
              <h2 className="text-xl font-bold text-foreground">Spin Complete!</h2>
            </div>
            <p className="text-lg text-muted-foreground mb-2">Number: {winningNumber}</p>
            <p className="text-sm text-muted-foreground mb-4">{gameResult}</p>
            {totalWin > 0 && (
              <p className="text-2xl font-bold text-secondary">Total Win: +KES {totalWin.toLocaleString()}</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default RouletteGame;