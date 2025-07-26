import { Link } from "react-router-dom";
import { useGamblingStore } from "@/store/gamblingStore";
import { WalletBalance } from "@/components/WalletBalance";
import { GameCard } from "@/components/GameCard";
import { games } from "@/data/gameData";
import { Button } from "@/components/ui/button";
import { Gamepad2, Mic, Shield, Plus, TrendingUp, Clock, Trophy } from "lucide-react";

const HomePage = () => {
  const { balance, gameStats, currentStreak } = useGamblingStore();

  return (
    <div className="min-h-screen bg-gradient-background pb-20">
      <div className="max-w-4xl mx-auto px-4 pt-6">
        {/* Welcome Header */}
        <div className="text-center py-6">
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Welcome Back, High Roller! 🎲
          </h1>
          <p className="text-muted-foreground">
            Your luck is waiting. Ready to make it count?
          </p>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-gradient-card border border-border/50 rounded-lg p-4 text-center">
            <TrendingUp className="h-6 w-6 mx-auto mb-2 text-secondary" />
            <p className="text-2xl font-bold text-foreground">{gameStats.totalWins}</p>
            <p className="text-xs text-muted-foreground">Total Wins</p>
          </div>
          
          <div className="bg-gradient-card border border-border/50 rounded-lg p-4 text-center">
            <Clock className="h-6 w-6 mx-auto mb-2 text-primary" />
            <p className="text-2xl font-bold text-foreground">{gameStats.timePlayedToday}m</p>
            <p className="text-xs text-muted-foreground">Today</p>
          </div>
          
          <div className="bg-gradient-card border border-border/50 rounded-lg p-4 text-center">
            <Trophy className="h-6 w-6 mx-auto mb-2 text-accent" />
            <p className="text-2xl font-bold text-foreground">{currentStreak}</p>
            <p className="text-xs text-muted-foreground">Win Streak</p>
          </div>
          
          <div className="bg-gradient-card border border-border/50 rounded-lg p-4 text-center">
            <Gamepad2 className="h-6 w-6 mx-auto mb-2 text-primary" />
            <p className="text-2xl font-bold text-foreground">${gameStats.biggestWin}</p>
            <p className="text-xs text-muted-foreground">Biggest Win</p>
          </div>
        </div>

        {/* Wallet Balance */}
        <WalletBalance balance={balance} className="mb-6" />

        {/* Quick Actions */}
        <div className="space-y-3 mb-6">
          <h2 className="text-xl font-semibold text-foreground">Quick Actions</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Link to="/games">
              <Button variant="game" className="w-full h-16">
                <Gamepad2 className="h-5 w-5 mb-1" />
                Play Games
              </Button>
            </Link>
            <Link to="/voice">
              <Button variant="outline" className="w-full h-16">
                <Mic className="h-5 w-5 mb-1" />
                Voice Betting
              </Button>
            </Link>
            <Link to="/wallet">
              <Button variant="wallet" className="w-full h-16">
                <Plus className="h-5 w-5 mb-1" />
                Top Up Wallet
              </Button>
            </Link>
            <Link to="/health">
              <Button variant="outline" className="w-full h-16">
                <Shield className="h-5 w-5 mb-1" />
                Mental Health
              </Button>
            </Link>
          </div>
        </div>

        {/* Featured Games */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-foreground">🔥 Hot Games</h2>
            <Link to="/games">
              <Button variant="ghost" size="sm">View All</Button>
            </Link>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {games.slice(0, 4).map((game) => (
              <Link key={game.id} to={`/games/${game.id}`}>
                <GameCard
                  title={game.title}
                  image={game.image}
                  onPlay={() => {}} // Navigation handled by Link
                />
              </Link>
            ))}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="mt-8 space-y-4">
          <h2 className="text-xl font-semibold text-foreground">Recent Activity</h2>
          <div className="bg-gradient-card border border-border/50 rounded-lg p-4">
            <p className="text-muted-foreground text-center py-4">
              Start playing to see your recent activity here!
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HomePage;