import { useState } from "react";
import { BottomNavigation } from "@/components/BottomNavigation";
import { HomeSection } from "@/components/sections/HomeSection";
import { GamesSection } from "@/components/sections/GamesSection";
import { VoiceSection } from "@/components/sections/VoiceSection";
import { WalletSection } from "@/components/sections/WalletSection";
import { HealthSection } from "@/components/sections/HealthSection";
import { useToast } from "@/hooks/use-toast";
import { useWallet } from "@/hooks/useWallet";

const Index = () => {
  const [activeTab, setActiveTab] = useState("home");
  const { toast } = useToast();
  const { balance, placeBet } = useWallet();

  const handleGamePlay = (gameId: string) => {
    toast({
      title: "Game Started!",
      description: `Loading ${gameId}... Good luck!`,
    });
  };

  const handlePlaceBet = async (amount: number, game: string, bet: string) => {
    if (amount <= balance) {
      try {
        // This would need to be implemented properly with game integration
        // For now, just show a placeholder message
        toast({
          title: "Bet Placed!",
          description: `KES ${amount.toLocaleString()} bet on ${bet} in ${game}. Good luck!`,
        });
      } catch (error) {
        toast({
          title: "Bet Failed",
          description: "Please try again.",
          variant: "destructive"
        });
      }
    } else {
      toast({
        title: "Insufficient Funds",
        description: "Please top up your wallet to place this bet.",
        variant: "destructive",
      });
    }
  };

  const renderActiveSection = () => {
    switch (activeTab) {
      case "home":
        return (
          <HomeSection
            onNavigate={setActiveTab}
            onGamePlay={handleGamePlay}
          />
        );
      case "games":
        return (
          <GamesSection
            onBack={() => setActiveTab("home")}
            onGamePlay={handleGamePlay}
          />
        );
      case "voice":
        return (
          <VoiceSection
            onBack={() => setActiveTab("home")}
            onPlaceBet={handlePlaceBet}
          />
        );
      case "wallet":
        return (
          <WalletSection
            onBack={() => setActiveTab("home")}
          />
        );
      case "health":
        return (
          <HealthSection
            onBack={() => setActiveTab("home")}
          />
        );
      default:
        return (
          <HomeSection
            onNavigate={setActiveTab}
            onGamePlay={handleGamePlay}
          />
        );
    }
  };

  return (
    <div className="min-h-screen bg-gradient-background">
      {/* Main Content */}
      <div className="max-w-md mx-auto pb-20 pt-6">
        <div className="px-4">
          {renderActiveSection()}
        </div>
      </div>

      {/* Bottom Navigation */}
      <BottomNavigation activeTab={activeTab} onTabChange={setActiveTab} />
    </div>
  );
};

export default Index;
