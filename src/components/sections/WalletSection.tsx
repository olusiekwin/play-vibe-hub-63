import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { WalletBalance } from "@/components/WalletBalance";
import { mockTransactions, Transaction } from "@/data/gameData";
import { ArrowLeft, Plus, Smartphone, TrendingUp, TrendingDown, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

interface WalletSectionProps {
  balance: number;
  onBack: () => void;
  onTopUp: (amount: number) => void;
}

export const WalletSection = ({ balance, onBack, onTopUp }: WalletSectionProps) => {
  const [topUpAmount, setTopUpAmount] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleTopUp = async () => {
    const amount = parseFloat(topUpAmount);
    if (amount > 0) {
      setIsLoading(true);
      // Simulate M-Pesa API call
      setTimeout(() => {
        onTopUp(amount);
        setTopUpAmount("");
        setIsLoading(false);
      }, 2000);
    }
  };

  const getTransactionIcon = (transaction: Transaction) => {
    switch (transaction.type) {
      case 'win':
        return <TrendingUp className="h-4 w-4 text-secondary" />;
      case 'bet':
        return <TrendingDown className="h-4 w-4 text-destructive" />;
      case 'topup':
        return <Plus className="h-4 w-4 text-primary" />;
      default:
        return <Clock className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const formatTransactionAmount = (transaction: Transaction) => {
    const prefix = transaction.type === 'bet' ? '-' : '+';
    return `${prefix}$${Math.abs(transaction.amount)}`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-2xl font-bold text-foreground">Wallet</h1>
      </div>

      {/* Wallet Balance */}
      <WalletBalance balance={balance} />

      {/* Top Up Section */}
      <div className="bg-gradient-card border border-border/50 rounded-lg p-4 space-y-4">
        <div className="flex items-center gap-2">
          <Smartphone className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold text-foreground">Top Up via M-Pesa</h2>
        </div>
        
        <div className="space-y-3">
          <Input
            type="number"
            placeholder="Enter amount..."
            value={topUpAmount}
            onChange={(e) => setTopUpAmount(e.target.value)}
          />
          
          <div className="grid grid-cols-3 gap-2">
            {[50, 100, 200].map((amount) => (
              <Button
                key={amount}
                variant="outline"
                size="sm"
                onClick={() => setTopUpAmount(amount.toString())}
              >
                ${amount}
              </Button>
            ))}
          </div>
          
          <Button 
            variant="wallet" 
            className="w-full"
            onClick={handleTopUp}
            disabled={!topUpAmount || isLoading}
          >
            {isLoading ? "Processing..." : "Top Up Now"}
          </Button>
        </div>
      </div>

      {/* Transaction History */}
      <div className="space-y-3">
        <h2 className="text-lg font-semibold text-foreground">Recent Transactions</h2>
        
        <div className="space-y-2">
          {mockTransactions.map((transaction) => (
            <div
              key={transaction.id}
              className="bg-gradient-card border border-border/50 rounded-lg p-3 flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                {getTransactionIcon(transaction)}
                <div>
                  <p className="font-medium text-foreground">
                    {transaction.type === 'topup' ? 'M-Pesa Top Up' : 
                     transaction.type === 'win' ? `Win - ${transaction.game}` :
                     `Bet - ${transaction.game}`}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {transaction.timestamp.toLocaleString()}
                  </p>
                </div>
              </div>
              
              <div className="text-right">
                <p className={cn(
                  "font-bold",
                  transaction.type === 'win' ? "text-secondary" :
                  transaction.type === 'bet' ? "text-destructive" :
                  "text-primary"
                )}>
                  {formatTransactionAmount(transaction)}
                </p>
                <p className="text-xs text-muted-foreground">
                  {transaction.status}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};