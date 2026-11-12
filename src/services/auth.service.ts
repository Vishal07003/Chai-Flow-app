import apiClient from './api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from '../constants/api.config';

export interface UserProfileResponse {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  profile: {
    phone: string;
    role: 'owner' | 'customer' | 'delivery';
    address: string;
    created_at: string;
  };
}

export interface AuthTokens {
  access: string;
  refresh: string;
}

export interface RegisterPayload {
  username: string;
  password?: string;
  phone: string;
  email?: string;
  first_name?: string;
  last_name?: string;
  address?: string;
}

export const authService = {
  /**
   * Register customer account via Django backend
   */
  async register(data: RegisterPayload): Promise<{ user: UserProfileResponse; tokens: AuthTokens }> {
    const res = await apiClient.post<{ user: UserProfileResponse; tokens: AuthTokens }>(
      '/accounts/register/',
      data,
    );
    if (res.tokens?.access) {
      await apiClient.setTokens(res.tokens.access, res.tokens.refresh);
      await AsyncStorage.setItem(STORAGE_KEYS.USER_PROFILE, JSON.stringify(res.user));
    }
    return res;
  },

  /**
   * Login via JWT endpoint (/api/v1/auth/token/)
   */
  async login(username: string, password: string): Promise<AuthTokens> {
    const tokens = await apiClient.post<AuthTokens>('/auth/token/', {
      username,
      password,
    });
    if (tokens?.access) {
      await apiClient.setTokens(tokens.access, tokens.refresh);
      const profile = await this.getCurrentUser();
      await AsyncStorage.setItem(STORAGE_KEYS.USER_PROFILE, JSON.stringify(profile));
    }
    return tokens;
  },

  /**
   * Retrieve current authenticated user profile
   */
  async getCurrentUser(): Promise<UserProfileResponse> {
    return apiClient.get<UserProfileResponse>('/accounts/profile/');
  },

  /**
   * Update profile information
   */
  async updateProfile(data: Partial<{
    phone: string;
    address: string;
    first_name: string;
    last_name: string;
    email: string;
  }>): Promise<UserProfileResponse> {
    const updated = await apiClient.patch<UserProfileResponse>('/accounts/profile/', data);
    await AsyncStorage.setItem(STORAGE_KEYS.USER_PROFILE, JSON.stringify(updated));
    return updated;
  },

  /**
   * Log out and clear tokens
   */
  async logout(): Promise<void> {
    await apiClient.clearTokens();
  },

  /**
   * Check if user is currently authenticated
   */
  async isAuthenticated(): Promise<boolean> {
    const token = await apiClient.getAccessToken();
    return !!token;
  },
};

export default authService;
