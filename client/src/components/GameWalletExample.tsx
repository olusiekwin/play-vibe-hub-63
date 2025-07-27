// Example of how to integrate wallet functionality in any game component

import { useState } from 'react';
import { useWallet } from '@/hooks/useWallet';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';

export const GameWalletIntegrationExample = () => {
  const { balance, placeBet, processWin, generateGameId } = useWallet();
  const [currentGameId, setCurrentGameId] = useState<string | null>(null);
  const [gameInProgress, setGameInProgress] = useState(false);
  const { toast } = useToast();

  // Example: Start a game with a bet
  const startGameWithBet = async (betAmount: number, gameType: 'blackjack' | 'poker' | 'roulette' | 'slots') => {
    try {
      // Check if user has sufficient balance
      if (betAmount > balance) {
        toast({
          title: "Insufficient Funds",
          description: "Please top up your wallet or reduce your bet.",
          variant: "destructive"
        });
        return;
      }

      // Generate unique game ID
      const gameId = generateGameId();
      setCurrentGameId(gameId);

      // Place bet (this deducts from user's wallet)
      const betResult = await placeBet(betAmount, gameId, gameType, {
        betType: 'main_bet',
        timestamp: new Date().toISOString()
      });

      console.log('Bet placed:', betResult);
      setGameInProgress(true);

      // Here you would implement your game logic
      // For example, call your game API, simulate card dealing, etc.
      
    } catch (error) {
      console.error('Failed to start game:', error);
      toast({
        title: "Game Error",
        description: "Failed to start game. Please try again.",
        variant: "destructive"
      });
    }
  };

  // Example: End game and process winnings
  const endGameWithWinnings = async (winAmount: number, gameType: 'blackjack' | 'poker' | 'roulette' | 'slots') => {
    try {
      if (!currentGameId) {
        throw new Error('No active game');
      }

      // Process winnings (this adds to user's wallet)
      const winResult = await processWin(winAmount, currentGameId, gameType, {
        winType: winAmount > 0 ? 'win' : 'loss',
        timestamp: new Date().toISOString(),
        details: 'Game completed'
      });

      console.log('Winnings processed:', winResult);
      
      // Reset game state
      setGameInProgress(false);
      setCurrentGameId(null);

    } catch (error) {
      console.error('Failed to process winnings:', error);
      toast({
        title: "Error",
        description: "Failed to process game result.",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="p-4 space-y-4">
      <h3 className="text-lg font-semibold">Game Wallet Integration Example</h3>
      
      <div className="bg-card p-4 rounded-lg">
        <p className="text-sm text-muted-foreground mb-2">Current Balance:</p>
        <p className="text-2xl font-bold">KES {balance.toLocaleString()}</p>
      </div>

      {!gameInProgress ? (
        <div className="space-y-2">
          <Button 
            onClick={() => startGameWithBet(1000, 'blackjack')}
            className="w-full"
          >
            Start Blackjack Game (KES 1,000 bet)
          </Button>
          <Button 
            onClick={() => startGameWithBet(2500, 'roulette')}
            variant="outline"
            className="w-full"
          >
            Start Roulette Game (KES 2,500 bet)
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          <p className="text-center text-muted-foreground">Game in progress...</p>
          <Button 
            onClick={() => endGameWithWinnings(2000, 'blackjack')}
            variant="default"
            className="w-full"
          >
            Win Game (KES 2,000)
          </Button>
          <Button 
            onClick={() => endGameWithWinnings(0, 'blackjack')}
            variant="destructive"
            className="w-full"
          >
            Lose Game (No winnings)
          </Button>
        </div>
      )}
    </div>
  );
};

/* 
Usage Instructions:

1. Import the useWallet hook in your game component:
   import { useWallet } from '@/hooks/useWallet';

2. Get the wallet functions:
   const { balance, placeBet, processWin, generateGameId } = useWallet();

3. When starting a game:
   - Check if user has sufficient balance
   - Generate a unique game ID
   - Call placeBet() to deduct the bet amount
   - Start your game logic

4. When ending a game:
   - Calculate winnings (0 for loss, positive number for win)
   - Call processWin() to add winnings to wallet
   - Reset game state

5. The wallet will automatically:
   - Update the user's balance in the database
   - Create transaction records
   - Show appropriate toast notifications
   - Update the UI with new balance

Transaction Types:
- 'game_bet': Deducts money when bet is placed
- 'game_win': Adds money when game is won
*/
