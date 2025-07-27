import { useState } from "react";
import { Link } from "react-router-dom";
import { useGamblingStore } from "@/store/gamblingStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Plus, Minus, Shuffle, Trophy } from "lucide-react";
import { games } from "@/data/gameData";
import { PlayingCard } from "@/components/PlayingCard";
import { gameService, BlackjackGameState } from "@/services/gameService";
import { useAuth } from "@/hooks/useAuth";
import { useWallet } from "@/hooks/useWallet";

const BlackjackGame = () => {
  const { addTransaction, updateGameStats } = useGamblingStore();
  const { user } = useAuth();
  const { balance, placeBet, processWin, generateGameId } = useWallet();
  const [betAmount, setBetAmount] = useState(2500);
  const [gameState, setGameState] = useState<BlackjackGameState | null>(null);
  const [currentGameId, setCurrentGameId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const game = games.find(g => g.id === 'blackjack')!;

  const getCardValue = (card: string) => {
    if (card === 'A') return 11;
    if (['J', 'Q', 'K'].includes(card)) return 10;
    return parseInt(card);
  };

  const startGame = async () => {
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please log in to play.",
        variant: "destructive"
      });
      return;
    }

    if (betAmount > balance) {
      toast({
        title: "Insufficient Funds",
        description: "Please reduce your bet or top up your wallet.",
        variant: "destructive"
      });
      return;
    }

    try {
      setIsLoading(true);
      
      // Generate game ID and place bet
      const gameId = generateGameId();
      setCurrentGameId(gameId);
      
      // Place bet (deduct from wallet)
      await placeBet(betAmount, gameId, 'blackjack', { 
        betType: 'initial_bet' 
      });
      
      // Start the game
      const response = await gameService.blackjack.startGame(betAmount);
      
      if (response.success && response.data) {
        setGameState(response.data);
        
        addTransaction({
          type: 'bet',
          amount: -betAmount,
          game: 'blackjack',
          status: 'completed'
        });

        if (response.data.status === 'blackjack') {
          handleGameEnd(response.data);
        }
      } else {
        throw new Error(response.message || 'Failed to start game');
      }
    } catch (error) {
      toast({
        title: "Game Error",
        description: "Failed to start game. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const hit = async () => {
    if (!gameState || !gameState.gameId) return;
    
    try {
      setIsLoading(true);
      const response = await gameService.blackjack.performAction(gameState.gameId, 'hit');
      
      if (response.success && response.data) {
        setGameState(response.data);
        
        if (response.data.status !== 'playing') {
          handleGameEnd(response.data);
        }
      } else {
        throw new Error(response.message || 'Failed to hit');
      }
    } catch (error) {
      toast({
        title: "Game Error",
        description: "Failed to hit. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const stand = async () => {
    if (!gameState || !gameState.gameId) return;
    
    try {
      setIsLoading(true);
      const response = await gameService.blackjack.performAction(gameState.gameId, 'stand');
      
      if (response.success && response.data) {
        setGameState(response.data);
        handleGameEnd(response.data);
      } else {
        throw new Error(response.message || 'Failed to stand');
      }
    } catch (error) {
      toast({
        title: "Game Error",
        description: "Failed to stand. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleGameEnd = async (result: BlackjackGameState) => {
    // Process winnings through wallet
    if (result.payout && result.payout > 0 && currentGameId) {
      try {
        await processWin(result.payout, currentGameId, 'blackjack', {
          outcome: result.outcome,
          playerValue: result.playerValue,
          dealerValue: result.dealerValue,
          betAmount: betAmount
        });
        
        addTransaction({
          type: 'win',
          amount: result.payout,
          game: 'blackjack',
          status: 'completed'
        });
      } catch (error) {
        console.error('Failed to process winnings:', error);
      }
    }
    
    updateGameStats({
      gamesPlayed: 1,
      totalWins: result.outcome === 'win' ? 1 : 0,
      totalLosses: result.outcome === 'lose' ? 1 : 0,
      betsToday: 1,
    });
    
    const getResultMessage = () => {
      if (result.status === 'blackjack') return 'Blackjack! You win!';
      if (result.status === 'bust') return 'Bust! You lose.';
      if (result.outcome === 'win') return 'You win!';
      if (result.outcome === 'lose') return 'Dealer wins.';
      return 'Push! It\'s a tie.';
    };
    
    toast({
      title: result.outcome === 'win' ? "🎉 Congratulations!" : "😔 Better luck next time!",
      description: getResultMessage(),
      variant: result.outcome === 'win' ? "default" : "destructive"
    });
  };

  const resetGame = () => {
    setGameState(null);
    setCurrentGameId(null);
  };

  const isPlaying = gameState && gameState.status === 'playing';
  const isGameOver = gameState && gameState.status !== 'playing';

  return (
    <div className="min-h-screen bg-gradient-background pb-20">
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center gap-4 mb-8">
          <Link to="/games">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Games
            </Button>
          </Link>
          <div className="flex items-center gap-3">
            <img 
              src={game.image} 
              alt={game.title}
              className="w-12 h-12 rounded-lg object-cover"
            />
            <div>
              <h1 className="text-2xl font-bold text-white">{game.title}</h1>
              <p className="text-gray-400">{game.category}</p>
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <div className="bg-card border border-border rounded-xl p-6 mb-6">
              <h2 className="text-xl font-semibold mb-4 text-white">Game Table</h2>
              
              {/* Betting Controls */}
              {!isPlaying && !isGameOver && (
                <div className="space-y-4 mb-6">
                  <div className="flex items-center gap-4">
                    <label className="text-sm font-medium text-gray-300">Bet Amount:</label>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setBetAmount(Math.max(500, betAmount - 500))}
                        disabled={isLoading}
                      >
                        <Minus className="w-4 h-4" />
                      </Button>
                      <Input
                        type="number"
                        value={betAmount}
                        onChange={(e) => setBetAmount(Number(e.target.value))}
                        className="w-32 text-center"
                        min="500"
                        max={balance}
                        step="500"
                        disabled={isLoading}
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setBetAmount(Math.min(balance, betAmount + 500))}
                        disabled={isLoading}
                      >
                        <Plus className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                  
                  <Button 
                    onClick={startGame} 
                    className="w-full bg-primary hover:bg-primary/90"
                    disabled={isLoading || betAmount > balance}
                  >
                    {isLoading ? "Starting..." : "Deal Cards"}
                  </Button>
                </div>
              )}

              {/* Dealer's Hand */}
              {gameState && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-medium mb-3 text-white">
                      Dealer ({isPlaying ? "?" : gameState.dealerValue})
                    </h3>
                    <div className="flex gap-2">
                      {gameState.dealerCards.map((card, index) => (
                        <PlayingCard
                          key={index}
                          suit={card.suit}
                          rank={isPlaying && index === 1 && !card.hidden ? "?" : card.value}
                          isHidden={isPlaying && index === 1 && card.hidden}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Player's Hand */}
                  <div>
                    <h3 className="text-lg font-medium mb-3 text-white">
                      Your Hand ({gameState.playerValue})
                    </h3>
                    <div className="flex gap-2">
                      {gameState.playerCards.map((card, index) => (
                        <PlayingCard
                          key={index}
                          suit={card.suit}
                          rank={card.value}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Game Actions */}
                  {isPlaying && (
                    <div className="flex gap-4">
                      <Button 
                        onClick={hit} 
                        className="flex-1 bg-green-600 hover:bg-green-700"
                        disabled={isLoading}
                      >
                        {isLoading ? "..." : "Hit"}
                      </Button>
                      <Button 
                        onClick={stand} 
                        className="flex-1 bg-red-600 hover:bg-red-700"
                        disabled={isLoading}
                      >
                        {isLoading ? "..." : "Stand"}
                      </Button>
                    </div>
                  )}

                  {/* New Game Button */}
                  {isGameOver && (
                    <Button 
                      onClick={resetGame} 
                      className="w-full bg-primary hover:bg-primary/90"
                    >
                      <Shuffle className="w-4 h-4 mr-2" />
                      New Game
                    </Button>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <div className="bg-card border border-border rounded-xl p-6">
              <h3 className="text-lg font-semibold mb-4 text-white flex items-center gap-2">
                <Trophy className="w-5 h-5 text-yellow-500" />
                Game Rules
              </h3>
              <div className="space-y-3 text-sm text-gray-300">
                <p>• Get as close to 21 as possible without going over</p>
                <p>• Face cards (J, Q, K) are worth 10 points</p>
                <p>• Aces are worth 1 or 11 (whichever is better)</p>
                <p>• Dealer must hit on 16 and stand on 17</p>
                <p>• Blackjack (21 with 2 cards) pays 3:2</p>
                <p>• Regular wins pay 1:1</p>
              </div>
            </div>

            <div className="bg-card border border-border rounded-xl p-6">
              <h3 className="text-lg font-semibold mb-4 text-white">Quick Stats</h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-400">Current Bet:</span>
                  <span className="text-white">₹{betAmount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Balance:</span>
                  <span className="text-white">₹{balance.toLocaleString()}</span>
                </div>
                {gameState && gameState.payout && (
                  <div className="flex justify-between">
                    <span className="text-gray-400">Potential Win:</span>
                    <span className="text-green-400">₹{gameState.payout.toLocaleString()}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BlackjackGame;