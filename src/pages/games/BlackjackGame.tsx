import { useState } from "react";
import { Link } from "react-router-dom";
import { useGamblingStore } from "@/store/gamblingStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Plus, Minus, Shuffle, Trophy } from "lucide-react";
import { games } from "@/data/gameData";

const BlackjackGame = () => {
  const { balance, updateBalance, addTransaction, updateGameStats } = useGamblingStore();
  const [betAmount, setBetAmount] = useState(50);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playerCards, setPlayerCards] = useState<number[]>([]);
  const [dealerCards, setDealerCards] = useState<number[]>([]);
  const [gameResult, setGameResult] = useState<string>("");
  const { toast } = useToast();

  const game = games.find(g => g.id === 'blackjack')!;

  const getCardValue = (card: number) => Math.min(card, 10);
  const getHandValue = (cards: number[]) => {
    let value = cards.reduce((sum, card) => sum + getCardValue(card), 0);
    let aces = cards.filter(card => card === 1).length;
    
    while (value <= 11 && aces > 0) {
      value += 10;
      aces--;
    }
    return value;
  };

  const drawCard = () => Math.floor(Math.random() * 13) + 1;

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
      game: 'blackjack',
      status: 'completed'
    });

    const newPlayerCards = [drawCard(), drawCard()];
    const newDealerCards = [drawCard(), drawCard()];
    
    setPlayerCards(newPlayerCards);
    setDealerCards(newDealerCards);
    setIsPlaying(true);
    setGameResult("");

    const playerValue = getHandValue(newPlayerCards);
    if (playerValue === 21) {
      endGame(newPlayerCards, newDealerCards);
    }
  };

  const hit = () => {
    const newCards = [...playerCards, drawCard()];
    setPlayerCards(newCards);
    
    if (getHandValue(newCards) > 21) {
      endGame(newCards, dealerCards);
    }
  };

  const stand = () => {
    endGame(playerCards, dealerCards);
  };

  const endGame = (finalPlayerCards: number[], finalDealerCards: number[]) => {
    let dealerFinal = [...finalDealerCards];
    
    // Dealer draws until 17 or higher
    while (getHandValue(dealerFinal) < 17) {
      dealerFinal.push(drawCard());
    }
    
    setDealerCards(dealerFinal);
    
    const playerValue = getHandValue(finalPlayerCards);
    const dealerValue = getHandValue(dealerFinal);
    
    let result = "";
    let winAmount = 0;
    
    if (playerValue > 21) {
      result = "Bust! You lose.";
    } else if (dealerValue > 21) {
      result = "Dealer busts! You win!";
      winAmount = betAmount * 2;
    } else if (playerValue === 21 && finalPlayerCards.length === 2) {
      result = "Blackjack! You win!";
      winAmount = Math.floor(betAmount * 2.5);
    } else if (playerValue > dealerValue) {
      result = "You win!";
      winAmount = betAmount * 2;
    } else if (playerValue < dealerValue) {
      result = "Dealer wins.";
    } else {
      result = "Push! It's a tie.";
      winAmount = betAmount;
    }
    
    if (winAmount > 0) {
      updateBalance(winAmount);
      addTransaction({
        type: 'win',
        amount: winAmount,
        game: 'blackjack',
        status: 'completed'
      });
    }
    
    updateGameStats({
      gamesPlayed: 1,
      totalWins: winAmount > betAmount ? 1 : 0,
      totalLosses: winAmount === 0 ? 1 : 0,
      betsToday: 1,
    });
    
    setGameResult(result);
    setIsPlaying(false);
    
    toast({
      title: winAmount > 0 ? "🎉 Congratulations!" : "😔 Better luck next time!",
      description: result,
      variant: winAmount > 0 ? "default" : "destructive"
    });
  };

  const resetGame = () => {
    setPlayerCards([]);
    setDealerCards([]);
    setGameResult("");
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
            <p className="text-muted-foreground">Beat the dealer to 21!</p>
          </div>
        </div>

        {/* Game Info */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-gradient-card border border-border/50 rounded-lg p-4 text-center">
            <p className="text-sm text-muted-foreground">Your Balance</p>
            <p className="text-2xl font-bold text-primary">${balance}</p>
          </div>
          <div className="bg-gradient-card border border-border/50 rounded-lg p-4 text-center">
            <p className="text-sm text-muted-foreground">Min Bet</p>
            <p className="text-2xl font-bold text-foreground">${game.minBet}</p>
          </div>
          <div className="bg-gradient-card border border-border/50 rounded-lg p-4 text-center">
            <p className="text-sm text-muted-foreground">Max Bet</p>
            <p className="text-2xl font-bold text-foreground">${game.maxBet}</p>
          </div>
          <div className="bg-gradient-card border border-border/50 rounded-lg p-4 text-center">
            <p className="text-sm text-muted-foreground">Current Bet</p>
            <p className="text-2xl font-bold text-accent">${betAmount}</p>
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
                onClick={() => setBetAmount(Math.max(game.minBet, betAmount - 25))}
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
                onClick={() => setBetAmount(Math.min(game.maxBet, betAmount + 25))}
                disabled={betAmount >= game.maxBet}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            
            <div className="flex gap-2 mb-4">
              {[25, 50, 100, 200].map((amount) => (
                <Button
                  key={amount}
                  variant="outline"
                  size="sm"
                  onClick={() => setBetAmount(Math.min(game.maxBet, amount))}
                >
                  ${amount}
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
            {/* Dealer Cards */}
            <div className="bg-gradient-card border border-border/50 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-foreground mb-4">
                Dealer ({isPlaying && !gameResult ? "?" : getHandValue(dealerCards)})
              </h3>
              <div className="flex gap-2 flex-wrap">
                {dealerCards.map((card, index) => (
                  <div
                    key={index}
                    className="w-16 h-24 bg-card border border-border rounded-lg flex items-center justify-center text-lg font-bold"
                  >
                    {(isPlaying && !gameResult && index === 1) ? "?" : card}
                  </div>
                ))}
              </div>
            </div>

            {/* Player Cards */}
            <div className="bg-gradient-card border border-border/50 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-foreground mb-4">
                Your Hand ({getHandValue(playerCards)})
              </h3>
              <div className="flex gap-2 flex-wrap">
                {playerCards.map((card, index) => (
                  <div
                    key={index}
                    className="w-16 h-24 bg-primary/20 border border-primary/50 rounded-lg flex items-center justify-center text-lg font-bold text-primary"
                  >
                    {card}
                  </div>
                ))}
              </div>
            </div>

            {/* Game Controls */}
            {isPlaying && !gameResult && (
              <div className="flex gap-4">
                <Button variant="casino" onClick={hit} className="flex-1">
                  Hit
                </Button>
                <Button variant="outline" onClick={stand} className="flex-1">
                  Stand
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
                <p className="text-lg text-muted-foreground mb-4">{gameResult}</p>
                <Button variant="casino" onClick={resetGame}>
                  Play Again
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default BlackjackGame;