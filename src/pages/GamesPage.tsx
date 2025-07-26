import { useState } from "react";
import { Link } from "react-router-dom";
import { GameCard } from "@/components/GameCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { games } from "@/data/gameData";
import { Search, Filter } from "lucide-react";

const GamesPage = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");

  const categories = ["all", "Cards", "Slots", "Roulette"];

  const filteredGames = games.filter((game) => {
    const matchesSearch = game.title.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === "all" || game.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="min-h-screen bg-gradient-background pb-20">
      <div className="max-w-6xl mx-auto px-4 pt-6">
        {/* Header */}
        <div className="text-center py-6">
          <h1 className="text-3xl font-bold text-foreground mb-2">🎰 Casino Games</h1>
          <p className="text-muted-foreground">
            Choose your game and let the fun begin!
          </p>
        </div>

        {/* Search */}
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Search games..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Categories */}
        <div className="flex gap-2 overflow-x-auto pb-4 mb-6">
          {categories.map((category) => (
            <Button
              key={category}
              variant={selectedCategory === category ? "casino" : "outline"}
              size="sm"
              onClick={() => setSelectedCategory(category)}
              className="whitespace-nowrap"
            >
              <Filter className="h-4 w-4 mr-2" />
              {category === "all" ? "All Games" : category}
            </Button>
          ))}
        </div>

        {/* Games Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredGames.map((game) => (
            <Link key={game.id} to={`/games/${game.id}`}>
              <GameCard
                title={game.title}
                image={game.image}
                onPlay={() => {}} // Navigation handled by Link
                className="hover:scale-105 transition-transform duration-300"
              />
            </Link>
          ))}
        </div>

        {filteredGames.length === 0 && (
          <div className="text-center py-12">
            <div className="bg-gradient-card border border-border/50 rounded-lg p-8">
              <p className="text-muted-foreground text-lg mb-4">
                No games found matching your criteria.
              </p>
              <Button 
                variant="outline" 
                onClick={() => {
                  setSearchTerm("");
                  setSelectedCategory("all");
                }}
              >
                Clear Filters
              </Button>
            </div>
          </div>
        )}

        {/* Game Statistics */}
        <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-gradient-card border border-border/50 rounded-lg p-6 text-center">
            <h3 className="text-lg font-semibold text-foreground mb-2">Most Popular</h3>
            <p className="text-2xl font-bold text-primary">Texas Hold'em Poker</p>
            <p className="text-sm text-muted-foreground">67% of players</p>
          </div>
          
          <div className="bg-gradient-card border border-border/50 rounded-lg p-6 text-center">
            <h3 className="text-lg font-semibold text-foreground mb-2">Highest Payout</h3>
            <p className="text-2xl font-bold text-secondary">European Roulette</p>
            <p className="text-sm text-muted-foreground">Up to 35:1</p>
          </div>
          
          <div className="bg-gradient-card border border-border/50 rounded-lg p-6 text-center">
            <h3 className="text-lg font-semibold text-foreground mb-2">Easiest to Win</h3>
            <p className="text-2xl font-bold text-accent">Classic Blackjack</p>
            <p className="text-sm text-muted-foreground">49% win rate</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GamesPage;