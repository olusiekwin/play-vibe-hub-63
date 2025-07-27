import { apiClient, ApiResponse } from '@/lib/api';

interface AuthResponse {
  user: {
    id: string;
    email: string;
    username: string;
    balance: number;
    role: string;
    status: string;
  };
  tokens: {
    accessToken: string;
    refreshToken: string;
  };
}

interface UserProfile {
  id: string;
  email: string;
  username: string;
  balance: number;
  role: string;
  status: string;
}

export const simpleAuthService = {
  // Register a new user with minimal requirements
  async register(username: string, email: string, password: string): Promise<ApiResponse<AuthResponse>> {
    return apiClient.post<ApiResponse<AuthResponse>>('/simple-auth/register', {
      username,
      email,
      password
    });
  },

  // Login user
  async login(email: string, password: string): Promise<ApiResponse<AuthResponse>> {
    return apiClient.post<ApiResponse<AuthResponse>>('/simple-auth/login', {
      email,
      password
    });
  },

  // Get user profile
  async getProfile(): Promise<ApiResponse<UserProfile>> {
    return apiClient.get<ApiResponse<UserProfile>>('/users/profile');
  },

  // Logout user
  async logout(): Promise<ApiResponse<{ message: string }>> {
    return apiClient.post<ApiResponse<{ message: string }>>('/auth/logout');
  },

  // Refresh token
  async refreshToken(refreshToken: string): Promise<ApiResponse<{ accessToken: string }>> {
    return apiClient.post<ApiResponse<{ accessToken: string }>>('/auth/refresh', {
      refreshToken
    });
  }
};
