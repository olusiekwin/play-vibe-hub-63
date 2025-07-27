import { Button } from "@/components/ui/button";
import { WalletBalance } from "@/components/WalletBalance";
import { GameCard } from "@/components/GameCard";
import { games } from "@/data/gameData";
import { Gamepad2, Mic, Shield, Plus } from "lucide-react";
import { useWallet } from "@/hooks/useWallet";

interface HomeSectionProps {
  onNavigate: (section: string) => void;
  onGamePlay: (gameId: string) => void;
}

export const HomeSection = ({ onNavigate, onGamePlay }: HomeSectionProps) => {
  const { balance, currency, isLoading, error } = useWallet();
  
  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div className="text-center py-6">
        <h1 className="text-3xl font-bold text-foreground mb-2">
          Welcome Back, Player!
        </h1>
        <p className="text-muted-foreground">
          Ready to test your luck today?
        </p>
      </div>

      {/* Wallet Balance */}
      <WalletBalance 
        balance={balance} 
        currency={currency}
        isLoading={isLoading}
        error={error}
      />

      {/* Quick Actions */}
      <div className="space-y-3">
        <h2 className="text-lg font-semibold text-foreground">Quick Actions</h2>
        <div className="grid grid-cols-2 gap-3">
          <Button 
            variant="game" 
            onClick={() => onNavigate('games')}
            className="h-16"
          >
            <Gamepad2 className="h-5 w-5" />
            Play Games
          </Button>
          <Button 
            variant="outline" 
            onClick={() => onNavigate('voice')}
            className="h-16"
          >
            <Mic className="h-5 w-5" />
            Voice Betting
          </Button>
          <Button 
            variant="wallet" 
            onClick={() => onNavigate('wallet')}
            className="h-16"
          >
            <Plus className="h-5 w-5" />
            Top Up
          </Button>
          <Button 
            variant="outline" 
            onClick={() => onNavigate('health')}
            className="h-16"
          >
            <Shield className="h-5 w-5" />
            Safe Mode
          </Button>
        </div>
      </div>

      {/* Featured Games */}
      <div className="space-y-3">
        <h2 className="text-lg font-semibold text-foreground">Featured Games</h2>
        <div className="grid grid-cols-2 gap-3">
          {games.slice(0, 4).map((game) => (
            <GameCard
              key={game.id}
              title={game.title}
              image={game.image}
              onPlay={() => onGamePlay(game.id)}
            />
          ))}
        </div>
      </div>
    </div>
  );
};