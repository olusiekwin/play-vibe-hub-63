import { useState, useEffect } from "react";
import { useWallet } from "@/hooks/useWallet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { WalletBalance } from "@/components/WalletBalance";
import { TransactionList } from "@/components/TransactionList";
import { Smartphone } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const WalletPage = () => {
  const { 
    balance, 
    currency, 
    deposit, 
    withdraw, 
    isLoading: walletLoading, 
    transactions, 
    fetchTransactions 
  } = useWallet();
  const [topUpAmount, setTopUpAmount] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  const handleTopUp = async () => {
    const amount = parseFloat(topUpAmount);
    if (amount > 0 && phoneNumber) {
      setIsLoading(true);
      
      try {
        await deposit(amount, 'mpesa', phoneNumber);
        
        toast({
          title: "💰 Top Up Successful!",
          description: `$${amount} has been added to your wallet via M-Pesa.`,
        });
        
        setTopUpAmount("");
        setPhoneNumber("");
      } catch (error) {
        toast({
          title: "❌ Top Up Failed",
          description: "There was an error processing your top-up. Please try again.",
        });
      } finally {
        setIsLoading(false);
      }
    }
  };

  return (
    <div className="min-h-screen bg-gradient-background pb-20">
      <div className="max-w-4xl mx-auto px-4 pt-6">
        {/* Header */}
        <div className="text-center py-6">
          <h1 className="text-3xl font-bold text-foreground mb-2">💰 Wallet</h1>
          <p className="text-muted-foreground">
            Manage your funds and track your transactions
          </p>
        </div>

        {/* Wallet Balance */}
        <WalletBalance 
          balance={balance} 
          currency={currency}
          isLoading={walletLoading}
          className="mb-6" 
        />

        {/* Top Up Section */}
        <div className="bg-gradient-card border border-border/50 rounded-lg p-6 mb-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-primary/20 rounded-lg">
              <Smartphone className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-foreground">M-Pesa Top Up</h2>
              <p className="text-sm text-muted-foreground">Add funds instantly via M-Pesa</p>
            </div>
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Phone Number
              </label>
              <Input
                type="tel"
                placeholder="254712345678"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                className="mb-4"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Amount (USD)
              </label>
              <Input
                type="number"
                placeholder="Enter amount..."
                value={topUpAmount}
                onChange={(e) => setTopUpAmount(e.target.value)}
              />
            </div>
            
            <div className="grid grid-cols-4 gap-2">
              {[25, 50, 100, 200].map((amount) => (
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
              disabled={!topUpAmount || !phoneNumber || isLoading}
            >
              {isLoading ? (
                <>
                  <Clock className="h-4 w-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Smartphone className="h-4 w-4 mr-2" />
                  Initiate M-Pesa STK
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Transaction History */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-foreground">Transaction History</h2>
            <Button variant="outline" size="sm">
              Export
            </Button>
          </div>
          
          <TransactionList transactions={transactions} />
        </div>
      </div>
    </div>
  );
};

export default WalletPage;