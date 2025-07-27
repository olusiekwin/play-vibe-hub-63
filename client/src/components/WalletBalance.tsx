import { DollarSign, TrendingUp, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface WalletBalanceProps {
  balance: number;
  currency?: string;
  isLoading?: boolean;
  error?: string | null;
  className?: string;
}

export const WalletBalance = ({ 
  balance, 
  currency = "KES", 
  isLoading = false, 
  error = null, 
  className 
}: WalletBalanceProps) => {
  return (
    <div className={cn(
      "bg-gradient-card border border-border/50 rounded-lg p-4 shadow-card",
      className
    )}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-primary/20 rounded-lg">
            {isLoading ? (
              <Loader2 className="h-5 w-5 text-primary animate-spin" />
            ) : (
              <DollarSign className="h-5 w-5 text-primary" />
            )}
          </div>
          <div>
            <p className="text-muted-foreground text-sm">Wallet Balance</p>
            {error ? (
              <p className="text-destructive text-sm">Failed to load balance</p>
            ) : (
              <p className="text-2xl font-bold text-foreground">
                {currency} {isLoading ? "..." : balance.toLocaleString()}
              </p>
            )}
          </div>
        </div>
        <div className="text-right">
          <div className="flex items-center gap-1 text-secondary text-sm">
            <TrendingUp className="h-4 w-4" />
            <span>+12.5%</span>
          </div>
          <p className="text-xs text-muted-foreground">This week</p>
        </div>
      </div>
    </div>
  );
};