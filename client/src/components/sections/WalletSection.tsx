import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { WalletBalance } from "@/components/WalletBalance";
import { TransactionList } from "@/components/TransactionList";
import { ArrowLeft, Smartphone } from "lucide-react";
import { useWallet } from "@/hooks/useWallet";

interface WalletSectionProps {
  onBack: () => void;
}

export const WalletSection = ({ onBack }: WalletSectionProps) => {
  const [topUpAmount, setTopUpAmount] = useState("");
  const [isDepositLoading, setIsDepositLoading] = useState(false);
  const { balance, currency, isLoading, error, deposit, transactions, fetchTransactions } = useWallet();

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  const handleTopUp = async () => {
    const amount = parseFloat(topUpAmount);
    if (amount > 0) {
      setIsDepositLoading(true);
      try {
        await deposit(amount, 'mpesa', '254700000000'); // Default phone number
        setTopUpAmount("");
      } catch (err) {
        console.error('Deposit failed:', err);
      } finally {
        setIsDepositLoading(false);
      }
    }
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
      <WalletBalance 
        balance={balance} 
        currency={currency}
        isLoading={isLoading}
        error={error}
      />

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
            disabled={!topUpAmount || isDepositLoading}
          >
            {isDepositLoading ? "Processing..." : "Top Up Now"}
          </Button>
        </div>
      </div>

      {/* Transaction History */}
      <div className="space-y-3">
        <h2 className="text-lg font-semibold text-foreground">Recent Transactions</h2>
        <TransactionList transactions={transactions} />
      </div>
    </div>
  );
};