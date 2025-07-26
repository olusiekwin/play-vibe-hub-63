import { Home, Gamepad2, Mic, Wallet, Shield } from "lucide-react";
import { cn } from "@/lib/utils";

interface BottomNavigationProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export const BottomNavigation = ({ activeTab, onTabChange }: BottomNavigationProps) => {
  const tabs = [
    { id: 'home', label: 'Home', icon: Home },
    { id: 'games', label: 'Games', icon: Gamepad2 },
    { id: 'voice', label: 'Voice', icon: Mic },
    { id: 'wallet', label: 'Wallet', icon: Wallet },
    { id: 'health', label: 'Health', icon: Shield },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-gradient-card border-t border-border/50 backdrop-blur-sm z-50">
      <div className="max-w-md mx-auto">
        <div className="flex items-center justify-around py-2">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            
            return (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={cn(
                  "flex flex-col items-center gap-1 px-3 py-2 rounded-lg transition-all duration-300",
                  isActive 
                    ? "text-primary bg-primary/10 shadow-glow" 
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                )}
              >
                <Icon size={20} className={cn(isActive && "animate-pulse-glow")} />
                <span className="text-xs font-medium">{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};