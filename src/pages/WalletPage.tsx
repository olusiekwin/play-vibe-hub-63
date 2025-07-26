import { useState } from "react";
import { useGamblingStore } from "@/store/gamblingStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { WalletBalance } from "@/components/WalletBalance";
import { Smartphone, Plus, TrendingUp, TrendingDown, Clock, CheckCircle, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

const WalletPage = () => {
  const { balance, transactions, updateBalance, addTransaction } = useGamblingStore();
  const [topUpAmount, setTopUpAmount] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleTopUp = async () => {
    const amount = parseFloat(topUpAmount);
    if (amount > 0 && phoneNumber) {
      setIsLoading(true);
      
      // Add pending transaction
      addTransaction({
        type: 'topup',
        amount: amount,
        status: 'pending',
      });
      
      // Simulate M-Pesa STK push and processing
      setTimeout(() => {
        updateBalance(amount);
        addTransaction({
          type: 'topup',
          amount: amount,
          status: 'completed',
        });
        
        toast({
          title: "💰 Top Up Successful!",
          description: `$${amount} has been added to your wallet via M-Pesa.`,
        });
        
        setTopUpAmount("");
        setPhoneNumber("");
        setIsLoading(false);
      }, 3000);
      
      toast({
        title: "📱 M-Pesa STK Sent",
        description: "Check your phone and enter your M-Pesa PIN to complete the transaction.",
      });
    }
  };

  const getTransactionIcon = (transaction: any) => {
    switch (transaction.type) {
      case 'win':
        return <TrendingUp className="h-5 w-5 text-secondary" />;
      case 'bet':
        return <TrendingDown className="h-5 w-5 text-destructive" />;
      case 'topup':
        return <Plus className="h-5 w-5 text-primary" />;
      default:
        return <Clock className="h-5 w-5 text-muted-foreground" />;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-secondary" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-destructive" />;
      default:
        return <Clock className="h-4 w-4 text-primary animate-spin" />;
    }
  };

  const formatTransactionAmount = (transaction: any) => {
    const prefix = transaction.type === 'bet' ? '-' : '+';
    return `${prefix}$${Math.abs(transaction.amount)}`;
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
        <WalletBalance balance={balance} className="mb-6" />

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
          
          <div className="space-y-3">
            {transactions.length > 0 ? (
              transactions.map((transaction) => (
                <div
                  key={transaction.id}
                  className="bg-gradient-card border border-border/50 rounded-lg p-4 flex items-center justify-between hover:bg-card/80 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="p-2 bg-muted/20 rounded-lg">
                      {getTransactionIcon(transaction)}
                    </div>
                    <div>
                      <p className="font-medium text-foreground">
                        {transaction.type === 'topup' ? 'M-Pesa Top Up' : 
                         transaction.type === 'win' ? `Win - ${transaction.game}` :
                         `Bet - ${transaction.game}`}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(transaction.timestamp).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  
                  <div className="text-right flex items-center gap-3">
                    <div>
                      <p className={cn(
                        "font-bold text-lg",
                        transaction.type === 'win' ? "text-secondary" :
                        transaction.type === 'bet' ? "text-destructive" :
                        "text-primary"
                      )}>
                        {formatTransactionAmount(transaction)}
                      </p>
                      <div className="flex items-center gap-1 justify-end">
                        {getStatusIcon(transaction.status)}
                        <p className="text-xs text-muted-foreground capitalize">
                          {transaction.status}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="bg-gradient-card border border-border/50 rounded-lg p-8 text-center">
                <p className="text-muted-foreground">No transactions yet</p>
                <p className="text-sm text-muted-foreground mt-2">
                  Start playing or top up your wallet to see transactions here
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default WalletPage;