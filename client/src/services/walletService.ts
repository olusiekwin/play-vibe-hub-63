import { apiClient, ApiResponse } from '@/lib/api';

// Wallet types
export interface WalletBalance {
  balance: number;
  demoBalance: number;
  realBalance: number;
  accountMode: 'demo' | 'real';
  currentAccountType: 'demo' | 'real';
  currency: string;
}

export interface DepositRequest {
  amount: number;
  paymentMethod: 'mpesa' | 'card' | 'bank_transfer';
  phoneNumber?: string;
}

export interface WithdrawalRequest {
  amount: number;
  paymentMethod: 'mpesa' | 'bank_transfer';
  phoneNumber?: string;
  accountNumber?: string;
}

export interface Transaction {
  id: string;
  type: 'deposit' | 'withdrawal' | 'game_bet' | 'game_win' | 'game_refund';
  amount: number;
  description: string;
  status: 'pending' | 'completed' | 'failed';
  paymentMethod?: string;
  createdAt: string;
}

export interface TransactionResponse {
  transaction: {
    id: string;
    amount: number;
    status: string;
    paymentMethod: string;
  };
  newBalance: number;
}

export interface TransactionHistory {
  transactions: Transaction[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

// Wallet API services
export const walletService = {
  // Get wallet balance
  async getBalance(): Promise<ApiResponse<WalletBalance>> {
    return apiClient.get<ApiResponse<WalletBalance>>('/wallet/balance');
  },

  // Switch between demo and real account
  async switchAccount(accountType: 'demo' | 'real'): Promise<ApiResponse<WalletBalance>> {
    return apiClient.post<ApiResponse<WalletBalance>>('/wallet/switch-account', { accountType });
  },

  // Deposit money (only for real accounts)
  async deposit(depositData: DepositRequest): Promise<ApiResponse<TransactionResponse>> {
    return apiClient.post<ApiResponse<TransactionResponse>>('/wallet/deposit', depositData);
  },

  // Withdraw money
  async withdraw(withdrawalData: WithdrawalRequest): Promise<ApiResponse<TransactionResponse>> {
    return apiClient.post<ApiResponse<TransactionResponse>>('/wallet/withdraw', withdrawalData);
  },

  // Get transaction history
  async getTransactions(page = 1, limit = 20, type?: string): Promise<ApiResponse<TransactionHistory>> {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
      ...(type && { type })
    });
    
    return apiClient.get<ApiResponse<TransactionHistory>>(`/wallet/transactions?${params}`);
  }
};
