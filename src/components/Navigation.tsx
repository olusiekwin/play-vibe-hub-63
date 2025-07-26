import { Link, useLocation } from "react-router-dom";
import { Home, Gamepad2, Mic, Wallet, Shield, User } from "lucide-react";
import { cn } from "@/lib/utils";

export const Navigation = () => {
  const location = useLocation();
  
  const navItems = [
    { to: "/", label: "Home", icon: Home },
    { to: "/games", label: "Games", icon: Gamepad2 },
    { to: "/voice", label: "Voice", icon: Mic },
    { to: "/wallet", label: "Wallet", icon: Wallet },
    { to: "/health", label: "Health", icon: Shield },
    { to: "/profile", label: "Profile", icon: User },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-gradient-card border-t border-border/50 backdrop-blur-sm z-50">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-around py-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.to;
            
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "flex flex-col items-center gap-1 px-3 py-2 rounded-lg transition-all duration-300",
                  isActive 
                    ? "text-primary bg-primary/10 shadow-glow" 
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                )}
              >
                <Icon size={20} className={cn(isActive && "animate-pulse-glow")} />
                <span className="text-xs font-medium">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
};