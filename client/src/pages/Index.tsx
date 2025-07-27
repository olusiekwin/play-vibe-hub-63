import { useState } from "react";
import { BottomNavigation } from "@/components/BottomNavigation";
import { HomeSection } from "@/components/sections/HomeSection";
import { GamesSection } from "@/components/sections/GamesSection";
import { VoiceSection } from "@/components/sections/VoiceSection";
import { WalletSection } from "@/components/sections/WalletSection";
import { HealthSection } from "@/components/sections/HealthSection";
import { useToast } from "@/hooks/use-toast";

const Index = () => {
  const [activeTab, setActiveTab] = useState("home");
  const [balance, setBalance] = useState(1250);
  const { toast } = useToast();

  const handleGamePlay = (gameId: string) => {
    toast({
      title: "Game Started!",
      description: `Loading ${gameId}... Good luck!`,
    });
  };

  const handleTopUp = (amount: number) => {
    setBalance(prev => prev + amount);
    toast({
      title: "Top Up Successful!",
      description: `$${amount} has been added to your wallet via M-Pesa.`,
    });
  };

  const handlePlaceBet = (amount: number, game: string, bet: string) => {
    if (amount <= balance) {
      setBalance(prev => prev - amount);
      toast({
        title: "Bet Placed!",
        description: `$${amount} bet on ${bet} in ${game}. Good luck!`,
      });
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
            balance={balance}
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
            balance={balance}
            onBack={() => setActiveTab("home")}
            onTopUp={handleTopUp}
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
            balance={balance}
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
