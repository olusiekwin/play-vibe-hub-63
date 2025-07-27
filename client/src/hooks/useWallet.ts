import { useState, useEffect, useCallback } from 'react';
import { walletService, WalletBalance, Transaction } from '@/services/walletService';
import { gameService } from '@/services/gameService';
import { useAuth } from './useAuth';
import { useToast } from './use-toast';

export const useWallet = () => {
  const [balance, setBalance] = useState<number>(0);
  const [demoBalance, setDemoBalance] = useState<number>(0);
  const [realBalance, setRealBalance] = useState<number>(0);
  const [accountMode, setAccountMode] = useState<'demo' | 'real'>('demo');
  const [currency, setCurrency] = useState<string>('KES');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [transactionsLoading, setTransactionsLoading] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  // Fetch balance from backend
  const fetchBalance = useCallback(async () => {
    if (!user) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await walletService.getBalance();
      
      if (response.success && response.data) {
        setBalance(response.data.balance);
        setDemoBalance(response.data.demoBalance || 0);
        setRealBalance(response.data.realBalance || 0);
        setAccountMode(response.data.accountMode || 'demo');
        setCurrency(response.data.currency);
      } else {
        throw new Error('Failed to fetch balance');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch balance';
      setError(errorMessage);
      console.error('Error fetching balance:', err);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  // Fetch transactions from backend
  const fetchTransactions = useCallback(async (page = 1, limit = 10, type?: string) => {
    if (!user) return;
    
    setTransactionsLoading(true);
    
    try {
      const response = await walletService.getTransactions(page, limit, type);
      
      if (response.success && response.data) {
        setTransactions(response.data.transactions);
      } else {
        throw new Error('Failed to fetch transactions');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch transactions';
      console.error('Error fetching transactions:', err);
      setError(errorMessage);
    } finally {
      setTransactionsLoading(false);
    }
  }, [user]);

  // Fetch recent transactions (last 5)
  const fetchRecentTransactions = useCallback(async () => {
    return fetchTransactions(1, 5);
  }, [fetchTransactions]);

  // Refresh both balance and transactions
  const refreshAll = useCallback(async () => {
    await Promise.all([fetchBalance(), fetchTransactions()]);
  }, [fetchBalance, fetchTransactions]);

  // Fetch transactions when user changes
  useEffect(() => {
    if (user) {
      fetchTransactions();
    } else {
      setTransactions([]);
    }
  }, [user, fetchTransactions]);

  // Refresh balance (useful after transactions)
  const refreshBalance = () => {
    fetchBalance();
  };

  // Update balance locally (for immediate UI feedback)
  const updateBalance = (newBalance: number) => {
    setBalance(newBalance);
  };

  // Deposit money
  const deposit = async (amount: number, paymentMethod: 'mpesa' | 'card' | 'bank_transfer', phoneNumber?: string) => {
    setIsLoading(true);
    try {
      const response = await walletService.deposit({
        amount,
        paymentMethod,
        phoneNumber
      });

      if (response.success && response.data) {
        setBalance(response.data.newBalance);
        fetchTransactions(); // Refresh transactions after deposit
        toast({
          title: "Deposit Successful",
          description: `KES ${amount.toLocaleString()} has been added to your wallet.`
        });
        return response.data;
      } else {
        throw new Error('Deposit failed');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Deposit failed';
      toast({
        title: "Deposit Failed",
        description: errorMessage,
        variant: "destructive"
      });
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  // Withdraw money
  const withdraw = async (amount: number, paymentMethod: 'mpesa' | 'bank_transfer', phoneNumber?: string, accountNumber?: string) => {
    setIsLoading(true);
    try {
      const response = await walletService.withdraw({
        amount,
        paymentMethod,
        phoneNumber,
        accountNumber
      });

      if (response.success && response.data) {
        setBalance(response.data.newBalance);
        fetchTransactions(); // Refresh transactions after withdrawal
        toast({
          title: "Withdrawal Successful",
          description: `KES ${amount.toLocaleString()} has been withdrawn from your wallet.`
        });
        return response.data;
      } else {
        throw new Error('Withdrawal failed');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Withdrawal failed';
      toast({
        title: "Withdrawal Failed",
        description: errorMessage,
        variant: "destructive"
      });
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  // Place a game bet (deduct from wallet)
  const placeBet = async (
    amount: number, 
    gameId: string, 
    gameType: 'blackjack' | 'poker' | 'roulette' | 'slots',
    betDetails?: Record<string, unknown>
  ) => {
    try {
      const response = await gameService.wallet.placeBet({
        amount,
        gameId,
        gameType,
        betDetails
      });

      if (response.success && response.data) {
        setBalance(response.data.newBalance);
        fetchTransactions(); // Refresh transactions after bet
        toast({
          title: "Bet Placed",
          description: `KES ${amount.toLocaleString()} bet placed on ${gameType}.`
        });
        return response.data;
      } else {
        throw new Error('Failed to place bet');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to place bet';
      toast({
        title: "Bet Failed",
        description: errorMessage,
        variant: "destructive"
      });
      throw err;
    }
  };

  // Process a game win (add to wallet)
  const processWin = async (
    amount: number, 
    gameId: string, 
    gameType: 'blackjack' | 'poker' | 'roulette' | 'slots',
    winDetails?: Record<string, unknown>
  ) => {
    try {
      const response = await gameService.wallet.processWin({
        amount,
        gameId,
        gameType,
        winDetails
      });

      if (response.success && response.data) {
        setBalance(response.data.newBalance);
        fetchTransactions(); // Refresh transactions after win
        if (amount > 0) {
          toast({
            title: "You Won!",
            description: `Congratulations! You won KES ${amount.toLocaleString()} in ${gameType}.`
          });
        }
        return response.data;
      } else {
        throw new Error('Failed to process win');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to process win';
      console.error('Error processing win:', err);
      throw err;
    }
  };

  // Switch between demo and real account
  const switchAccount = async (accountType: 'demo' | 'real') => {
    try {
      const response = await walletService.switchAccount(accountType);
      
      if (response.success && response.data) {
        setBalance(response.data.balance);
        setDemoBalance(response.data.demoBalance);
        setRealBalance(response.data.realBalance);
        setAccountMode(response.data.accountMode);
        
        toast({
          title: `Switched to ${accountType} account`,
          description: `You are now using your ${accountType} account with KES ${response.data.balance.toLocaleString()}.`
        });
        
        // Refresh transactions for the new account type
        fetchTransactions();
        
        return response.data;
      } else {
        throw new Error('Failed to switch account');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to switch account';
      console.error('Error switching account:', err);
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive"
      });
      throw err;
    }
  };

  // Generate a unique game ID
  const generateGameId = () => {
    return gameService.wallet.generateGameId();
  };

  // Fetch balance when user changes or component mounts
  useEffect(() => {
    if (user) {
      fetchBalance();
    } else {
      setBalance(0);
      setCurrency('KES');
    }
  }, [user, fetchBalance]);

  return {
    balance,
    demoBalance,
    realBalance,
    accountMode,
    currency,
    isLoading,
    error,
    transactions,
    transactionsLoading,
    fetchBalance,
    refreshBalance,
    updateBalance,
    switchAccount,
    deposit,
    withdraw,
    placeBet,
    processWin,
    generateGameId,
    fetchTransactions,
    fetchRecentTransactions,
    refreshAll
  };
};
