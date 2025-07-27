import { formatDistanceToNow } from 'date-fns';
import { TrendingUp, TrendingDown, Plus, Minus, Gamepad2, Clock, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Transaction } from '@/services/walletService';

interface TransactionListProps {
  transactions: Transaction[];
  isLoading?: boolean;
  className?: string;
}

export const TransactionList = ({ transactions, isLoading = false, className }: TransactionListProps) => {
  const getTransactionIcon = (transaction: Transaction) => {
    switch (transaction.type) {
      case 'deposit':
        return <Plus className="h-4 w-4 text-primary" />;
      case 'withdrawal':
        return <Minus className="h-4 w-4 text-destructive" />;
      case 'game_bet':
        return <TrendingDown className="h-4 w-4 text-destructive" />;
      case 'game_win':
        return <TrendingUp className="h-4 w-4 text-secondary" />;
      default:
        return <Clock className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getStatusIcon = (status: Transaction['status']) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-3 w-3 text-secondary" />;
      case 'failed':
        return <XCircle className="h-3 w-3 text-destructive" />;
      case 'pending':
        return <AlertCircle className="h-3 w-3 text-warning" />;
      default:
        return <Clock className="h-3 w-3 text-muted-foreground" />;
    }
  };

  const formatTransactionAmount = (transaction: Transaction) => {
    const amount = Math.abs(transaction.amount);
    const sign = transaction.amount >= 0 ? '+' : '-';
    return `${sign}KES ${amount.toLocaleString()}`;
  };

  const getAmountColor = (transaction: Transaction) => {
    if (transaction.amount >= 0) {
      return 'text-secondary'; // Green for positive amounts
    }
    return 'text-destructive'; // Red for negative amounts
  };

  const formatTransactionDescription = (transaction: Transaction) => {
    if (transaction.description) {
      return transaction.description;
    }
    
    // Fallback descriptions based on type
    switch (transaction.type) {
      case 'deposit':
        return 'Wallet top-up';
      case 'withdrawal':
        return 'Wallet withdrawal';
      case 'game_bet':
        return 'Game bet placed';
      case 'game_win':
        return 'Game winnings';
      default:
        return 'Transaction';
    }
  };

  if (isLoading) {
    return (
      <div className={cn("space-y-3", className)}>
        {[...Array(3)].map((_, i) => (
          <div key={i} className="bg-gradient-card border border-border/50 rounded-lg p-3 animate-pulse">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-muted rounded-full"></div>
                <div className="space-y-1">
                  <div className="w-24 h-4 bg-muted rounded"></div>
                  <div className="w-16 h-3 bg-muted rounded"></div>
                </div>
              </div>
              <div className="w-16 h-4 bg-muted rounded"></div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (transactions.length === 0) {
    return (
      <div className={cn("text-center py-8", className)}>
        <Gamepad2 className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
        <p className="text-muted-foreground">No transactions yet</p>
        <p className="text-sm text-muted-foreground">Start playing or top up your wallet to see activity</p>
      </div>
    );
  }

  return (
    <div className={cn("space-y-3", className)}>
      {transactions.map((transaction) => (
        <div
          key={transaction.id}
          className="bg-gradient-card border border-border/50 rounded-lg p-3 hover:border-primary/20 transition-colors"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-background/50 rounded-full">
                {getTransactionIcon(transaction)}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-foreground">
                    {formatTransactionDescription(transaction)}
                  </p>
                  {getStatusIcon(transaction.status)}
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span>{formatDistanceToNow(new Date(transaction.createdAt), { addSuffix: true })}</span>
                  {transaction.paymentMethod && (
                    <>
                      <span>•</span>
                      <span className="capitalize">{transaction.paymentMethod}</span>
                    </>
                  )}
                </div>
              </div>
            </div>
            <div className="text-right">
              <p className={cn("text-sm font-semibold", getAmountColor(transaction))}>
                {formatTransactionAmount(transaction)}
              </p>
              <p className="text-xs text-muted-foreground capitalize">
                {transaction.status}
              </p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};
