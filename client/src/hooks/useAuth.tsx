import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { simpleAuthService } from '@/services/simpleAuthService';
import { apiClient } from '@/lib/api';

interface User {
  id: string;
  username: string;
  email: string;
  balance: number;
  role: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (username: string, email: string, password: string, phoneNumber?: string) => Promise<void>;
  logout: () => Promise<void>;
  updateBalance: (newBalance: number) => void;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Check if user is authenticated on app load
  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('authToken');
      if (token) {
        apiClient.setAuthToken(token);
        try {
          const response = await simpleAuthService.getProfile();
          if (response.success) {
            setUser(response.data);
          } else {
            // Invalid token, clear it
            localStorage.removeItem('authToken');
            apiClient.clearAuthToken();
          }
        } catch (error) {
          console.error('Auth check failed:', error);
          localStorage.removeItem('authToken');
          apiClient.clearAuthToken();
        }
      }
      setIsLoading(false);
    };

    checkAuth();
  }, []);

  const login = async (email: string, password: string) => {
    const response = await simpleAuthService.login(email, password);
    if (response.success) {
      setUser(response.data.user);
      localStorage.setItem('authToken', response.data.tokens.accessToken);
      localStorage.setItem('refreshToken', response.data.tokens.refreshToken);
      apiClient.setAuthToken(response.data.tokens.accessToken);
    } else {
      throw new Error(response.message || 'Login failed');
    }
  };

  const register = async (username: string, email: string, password: string, phoneNumber?: string) => {
    const response = await simpleAuthService.register(username, email, password);
    if (response.success) {
      setUser(response.data.user);
      localStorage.setItem('authToken', response.data.tokens.accessToken);
      localStorage.setItem('refreshToken', response.data.tokens.refreshToken);
      apiClient.setAuthToken(response.data.tokens.accessToken);
    } else {
      throw new Error(response.message || 'Registration failed');
    }
  };

  const logout = async () => {
    try {
      await simpleAuthService.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setUser(null);
      localStorage.removeItem('authToken');
      localStorage.removeItem('refreshToken');
      apiClient.clearAuthToken();
    }
  };

  const updateBalance = (newBalance: number) => {
    if (user) {
      setUser({ ...user, balance: newBalance });
    }
  };

  const refreshProfile = async () => {
    try {
      const response = await simpleAuthService.getProfile();
      if (response.success) {
        setUser(response.data);
      }
    } catch (error) {
      console.error('Failed to refresh profile:', error);
    }
  };

  const value: AuthContextType = {
    user,
    isLoading,
    isAuthenticated: !!user,
    login,
    register,
    logout,
    updateBalance,
    refreshProfile
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
