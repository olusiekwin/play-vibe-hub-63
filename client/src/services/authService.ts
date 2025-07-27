import { apiClient, ApiResponse } from '@/lib/api';

// Auth types
export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
  phoneNumber?: string;
}

export interface AuthResponse {
  user: {
    id: string;
    username: string;
    email: string;
    balance: number;
    role: string;
  };
  tokens: {
    accessToken: string;
    refreshToken: string;
  };
}

// Auth API services
export const authService = {
  // Login user
  async login(credentials: LoginRequest): Promise<ApiResponse<AuthResponse>> {
    const response = await apiClient.post<ApiResponse<AuthResponse>>('/auth/login', credentials);
    
    if (response.success && response.data.tokens) {
      apiClient.setAuthToken(response.data.tokens.accessToken);
    }
    
    return response;
  },

  // Register user
  async register(userData: RegisterRequest): Promise<ApiResponse<AuthResponse>> {
    const response = await apiClient.post<ApiResponse<AuthResponse>>('/auth/register', userData);
    
    if (response.success && response.data.tokens) {
      apiClient.setAuthToken(response.data.tokens.accessToken);
    }
    
    return response;
  },

  // Logout user
  async logout(): Promise<ApiResponse> {
    try {
      const response = await apiClient.post<ApiResponse>('/auth/logout');
      apiClient.clearAuthToken();
      return response;
    } catch (error) {
      // Clear token even if logout fails
      apiClient.clearAuthToken();
      throw error;
    }
  },

  // Refresh token
  async refreshToken(): Promise<ApiResponse<{ accessToken: string }>> {
    const response = await apiClient.post<ApiResponse<{ accessToken: string }>>('/auth/refresh');
    
    if (response.success && response.data.accessToken) {
      apiClient.setAuthToken(response.data.accessToken);
    }
    
    return response;
  },

  // Get current user profile
  async getProfile(): Promise<ApiResponse<AuthResponse['user']>> {
    return apiClient.get<ApiResponse<AuthResponse['user']>>('/auth/profile');
  }
};
