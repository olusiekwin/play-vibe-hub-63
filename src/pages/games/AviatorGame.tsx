import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { useGamblingStore } from "@/store/gamblingStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Plus, Minus, Plane, Trophy, TrendingUp } from "lucide-react";
import { games } from "@/data/gameData";

const AviatorGame = () => {
  const { balance, updateBalance, addTransaction, updateGameStats } = useGamblingStore();
  const [betAmount, setBetAmount] = useState(1000);
  const [isFlying, setIsFlying] = useState(false);
  const [multiplier, setMultiplier] = useState(1.00);
  const [cashedOut, setCashedOut] = useState(false);
  const [gameResult, setGameResult] = useState<string>("");
  const [crashMultiplier, setCrashMultiplier] = useState<number | null>(null);
  const [autoCashOut, setAutoCashOut] = useState<number>(2.0);
  const [hasBet, setHasBet] = useState(false);
  const [flightHistory, setFlightHistory] = useState<number[]>([]);
  const intervalRef = useRef<NodeJS.Timeout>();
  const { toast } = useToast();

  const game = games.find(g => g.id === 'aviator')!;

  const placeBet = () => {
    if (betAmount > balance) {
      toast({
        title: "Insufficient Funds",
        description: "Please reduce your bet or top up your wallet.",
        variant: "destructive"
      });
      return;
    }

    if (isFlying) {
      toast({
        title: "Flight in Progress",
        description: "Wait for the current flight to finish.",
        variant: "destructive"
      });
      return;
    }

    updateBalance(-betAmount);
    addTransaction({
      type: 'bet',
      amount: -betAmount,
      game: 'aviator',
      status: 'completed'
    });

    setHasBet(true);
    setCashedOut(false);
    setGameResult("");
    setCrashMultiplier(null);
    startFlight();
  };

  const startFlight = () => {
    setIsFlying(true);
    setMultiplier(1.00);
    
    // Generate random crash point between 1.01x and 50x
    const crashAt = Math.random() < 0.7 ? 
      1.01 + Math.random() * 3 : // 70% chance of crashing between 1.01x-4x
      1.01 + Math.random() * 49; // 30% chance of going higher

    setCrashMultiplier(crashAt);

    intervalRef.current = setInterval(() => {
      setMultiplier(prev => {
        const next = prev + 0.01;
        
        // Auto cash out if enabled and reached
        if (next >= autoCashOut && hasBet && !cashedOut) {
          cashOut(autoCashOut);
        }
        
        // Check if plane crashes
        if (next >= crashAt) {
          clearInterval(intervalRef.current);
          endFlight(crashAt, false);
          return crashAt;
        }
        
        return next;
      });
    }, 50);
  };

  const cashOut = (currentMultiplier?: number) => {
    if (!hasBet || cashedOut || !isFlying) return;

    const finalMultiplier = currentMultiplier || multiplier;
    const winAmount = Math.floor(betAmount * finalMultiplier);
    
    setCashedOut(true);
    updateBalance(winAmount);
    addTransaction({
      type: 'win',
      amount: winAmount,
      game: 'aviator',
      status: 'completed'
    });

    setGameResult(`Cashed out at ${finalMultiplier.toFixed(2)}x! Won KES ${winAmount.toLocaleString()}`);
    
    toast({
      title: "🎉 Successful Cash Out!",
      description: `You won KES ${winAmount.toLocaleString()} at ${finalMultiplier.toFixed(2)}x`,
    });

    updateGameStats({
      gamesPlayed: 1,
      totalWins: 1,
      betsToday: 1,
    });
  };

  const endFlight = (crashPoint: number, wasManualCashOut: boolean) => {
    setIsFlying(false);
    setHasBet(false);
    
    if (!wasManualCashOut && !cashedOut) {
      setGameResult(`Plane crashed at ${crashPoint.toFixed(2)}x! Lost KES ${betAmount.toLocaleString()}`);
      toast({
        title: "💥 Plane Crashed!",
        description: `Crashed at ${crashPoint.toFixed(2)}x. Better luck next time!`,
        variant: "destructive"
      });

      updateGameStats({
        gamesPlayed: 1,
        totalLosses: 1,
        betsToday: 1,
      });
    }

    // Add to history
    setFlightHistory(prev => [crashPoint, ...prev.slice(0, 9)]);
    
    // Auto start next round after 3 seconds
    setTimeout(() => {
      if (!hasBet) {
        setMultiplier(1.00);
        setCrashMultiplier(null);
        setGameResult("");
      }
    }, 3000);
  };

  const resetGame = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    setIsFlying(false);
    setHasBet(false);
    setCashedOut(false);
    setMultiplier(1.00);
    setCrashMultiplier(null);
    setGameResult("");
  };

  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  // Auto-start demo flights when no bet is placed
  useEffect(() => {
    if (!hasBet && !isFlying) {
      const timer = setTimeout(() => {
        startFlight();
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [hasBet, isFlying]);

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
            <p className="text-muted-foreground">Cash out before the plane crashes!</p>
          </div>
        </div>

        {/* Game Info */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          <div className="bg-gradient-card border border-border/50 rounded-lg p-4 text-center">
            <p className="text-sm text-muted-foreground">Your Balance</p>
            <p className="text-2xl font-bold text-primary">KES {balance.toLocaleString()}</p>
          </div>
          <div className="bg-gradient-card border border-border/50 rounded-lg p-4 text-center">
            <p className="text-sm text-muted-foreground">Current Bet</p>
            <p className="text-2xl font-bold text-accent">KES {betAmount.toLocaleString()}</p>
          </div>
          <div className="bg-gradient-card border border-border/50 rounded-lg p-4 text-center">
            <p className="text-sm text-muted-foreground">Auto Cash Out</p>
            <p className="text-2xl font-bold text-secondary">{autoCashOut.toFixed(2)}x</p>
          </div>
          <div className="bg-gradient-card border border-border/50 rounded-lg p-4 text-center">
            <p className="text-sm text-muted-foreground">Min Bet</p>
            <p className="text-2xl font-bold text-foreground">KES {game.minBet.toLocaleString()}</p>
          </div>
          <div className="bg-gradient-card border border-border/50 rounded-lg p-4 text-center">
            <p className="text-sm text-muted-foreground">Max Bet</p>
            <p className="text-2xl font-bold text-foreground">KES {game.maxBet.toLocaleString()}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Game Area */}
          <div className="lg:col-span-2">
            {/* Flight Display */}
            <div className="bg-gradient-felt border border-border/50 rounded-lg p-8 mb-6 relative overflow-hidden">
              <div className="text-center mb-6">
                <div className="flex items-center justify-center gap-4 mb-4">
                  <Plane className={`h-12 w-12 text-casino-gold transition-all duration-300 ${
                    isFlying ? 'animate-bounce' : ''
                  }`} />
                  <div className="text-6xl font-bold text-casino-gold">
                    {multiplier.toFixed(2)}x
                  </div>
                </div>
                
                {isFlying && (
                  <div className="text-lg text-casino-gold animate-pulse">
                    Flying... Cash out before it crashes!
                  </div>
                )}
                
                {crashMultiplier && !isFlying && (
                  <div className="text-lg text-roulette-red">
                    Crashed at {crashMultiplier.toFixed(2)}x
                  </div>
                )}
              </div>

              {/* Multiplier Chart Simulation */}
              <div className="h-32 bg-casino-black/20 rounded-lg p-4 border">
                <div className="flex items-end justify-center h-full">
                  <TrendingUp className={`h-8 w-8 text-casino-gold transition-all duration-300 ${
                    isFlying ? 'scale-110' : 'scale-100'
                  }`} />
                </div>
              </div>
            </div>

            {/* Game Result */}
            {gameResult && (
              <div className="bg-gradient-card border border-border/50 rounded-lg p-6 text-center mb-6">
                <div className="flex items-center justify-center gap-2 mb-4">
                  <Trophy className="h-6 w-6 text-accent" />
                  <h2 className="text-xl font-bold text-foreground">Round Complete</h2>
                </div>
                <p className="text-lg text-muted-foreground">{gameResult}</p>
              </div>
            )}
          </div>

          {/* Betting Controls */}
          <div className="space-y-6">
            {/* Bet Amount */}
            <div className="bg-gradient-card border border-border/50 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-foreground mb-4">Place Your Bet</h3>
              
              <div className="flex items-center gap-4 mb-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setBetAmount(Math.max(game.minBet, betAmount - 500))}
                  disabled={isFlying || hasBet}
                >
                  <Minus className="h-4 w-4" />
                </Button>
                
                <Input
                  type="number"
                  value={betAmount}
                  onChange={(e) => setBetAmount(Math.max(game.minBet, Math.min(game.maxBet, parseInt(e.target.value) || game.minBet)))}
                  className="text-center"
                  disabled={isFlying || hasBet}
                />
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setBetAmount(Math.min(game.maxBet, betAmount + 500))}
                  disabled={isFlying || hasBet}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              
              <div className="grid grid-cols-2 gap-2 mb-4">
                {[500, 1000, 2500, 5000].map((amount) => (
                  <Button
                    key={amount}
                    variant="outline"
                    size="sm"
                    onClick={() => setBetAmount(amount)}
                    disabled={isFlying || hasBet}
                  >
                    KES {amount.toLocaleString()}
                  </Button>
                ))}
              </div>

              {/* Auto Cash Out */}
              <div className="mb-4">
                <label className="text-sm text-muted-foreground mb-2 block">Auto Cash Out at:</label>
                <Input
                  type="number"
                  step="0.1"
                  min="1.1"
                  max="100"
                  value={autoCashOut}
                  onChange={(e) => setAutoCashOut(parseFloat(e.target.value) || 2.0)}
                  className="text-center"
                  disabled={isFlying}
                />
              </div>

              {/* Action Buttons */}
              {!hasBet ? (
                <Button variant="casino" onClick={placeBet} className="w-full" disabled={isFlying}>
                  <Plane className="h-4 w-4 mr-2" />
                  Place Bet & Fly
                </Button>
              ) : (
                <div className="space-y-2">
                  <Button 
                    variant="secondary" 
                    onClick={() => cashOut()} 
                    className="w-full"
                    disabled={!isFlying || cashedOut}
                  >
                    Cash Out ({multiplier.toFixed(2)}x)
                  </Button>
                  <Button variant="outline" onClick={resetGame} className="w-full">
                    Cancel Bet
                  </Button>
                </div>
              )}
            </div>

            {/* Flight History */}
            <div className="bg-gradient-card border border-border/50 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-foreground mb-4">Recent Flights</h3>
              <div className="space-y-2">
                {flightHistory.length === 0 ? (
                  <p className="text-muted-foreground text-sm">No flight history yet</p>
                ) : (
                  flightHistory.map((crash, index) => (
                    <div key={index} className="flex justify-between items-center p-2 bg-muted/10 rounded">
                      <span className="text-sm text-muted-foreground">Flight #{flightHistory.length - index}</span>
                      <span className={`font-bold ${crash >= 2 ? 'text-casino-gold' : 'text-roulette-red'}`}>
                        {crash.toFixed(2)}x
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Payout Info */}
            <div className="bg-gradient-card border border-border/50 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-foreground mb-4">How to Play</h3>
              <div className="text-sm text-muted-foreground space-y-2">
                <p>• Place your bet before the plane takes off</p>
                <p>• Watch the multiplier increase as the plane flies</p>
                <p>• Cash out before the plane crashes to win</p>
                <p>• Set auto cash out to automatically secure profits</p>
                <p>• Higher multipliers = higher risk & reward</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AviatorGame;