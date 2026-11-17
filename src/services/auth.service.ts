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
  user?: UserProfileResponse;
}

export interface SendOtpResponse {
  success: boolean;
  message: string;
  session_id: string;
  cooldown_seconds: number;
  user_exists?: boolean;
}

export interface VerifyOtpResponse {
  success: boolean;
  user: UserProfileResponse;
  tokens: AuthTokens;
}

export interface VerifyDeliveryOtpResponse {
  success: boolean;
  message: string;
  role: 'delivery';
  user: UserProfileResponse;
  partner?: any;
  tokens: AuthTokens;
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
   * Single Unified OTP Request (POST /api/v1/auth/request-otp/)
   * Backend checks registered accounts and triggers OTP.
   */
  async requestOtp(phone: string): Promise<SendOtpResponse> {
    return apiClient.post<SendOtpResponse>('/auth/request-otp/', { phone });
  },

  /**
   * Single Unified OTP Verification (POST /api/v1/auth/verify-otp/)
   * Backend strictly determines role from database ('owner' | 'delivery').
   */
  async verifyOtpUnified(phone: string, otp: string, sessionId?: string): Promise<VerifyOtpResponse> {
    const res = await apiClient.post<VerifyOtpResponse>('/auth/verify-otp/', {
      phone,
      otp,
      session_id: sessionId,
    });

    if (res.tokens?.access) {
      await apiClient.setTokens(res.tokens.access, res.tokens.refresh);
      await AsyncStorage.setItem(STORAGE_KEYS.USER_PROFILE, JSON.stringify(res.user));
    }
    return res;
  },

  /**
   * Dedicated Delivery Partner OTP Request (POST /api/v1/auth/delivery/request-otp/)
   */
  async requestDeliveryOtp(mobileNumber: string): Promise<SendOtpResponse> {
    return apiClient.post<SendOtpResponse>('/auth/delivery/request-otp/', {
      mobile_number: mobileNumber,
    });
  },

  /**
   * Dedicated Delivery Partner OTP Verification (POST /api/v1/auth/delivery/verify-otp/)
   * Issues JWT access/refresh tokens and stores verified profile
   */
  async verifyDeliveryOtp(
    mobileNumber: string,
    otp: string,
    sessionId?: string
  ): Promise<VerifyDeliveryOtpResponse> {
    const res = await apiClient.post<VerifyDeliveryOtpResponse>('/auth/delivery/verify-otp/', {
      mobile_number: mobileNumber,
      otp,
      session_id: sessionId,
    });

    if (res.tokens?.access) {
      await apiClient.setTokens(res.tokens.access, res.tokens.refresh);
      await AsyncStorage.setItem(STORAGE_KEYS.USER_PROFILE, JSON.stringify(res.user));
    }
    return res;
  },
  async sendOtp(phone: string): Promise<SendOtpResponse> {
    return apiClient.post<SendOtpResponse>('/accounts/otp/send/', { phone });
  },

  /**
   * Resend OTP to user's mobile number
   */
  async resendOtp(phone: string): Promise<SendOtpResponse> {
    return apiClient.post<SendOtpResponse>('/accounts/otp/resend/', { phone });
  },

  /**
   * Verify entered OTP code and obtain session JWT tokens
   */
  async verifyOtp(phone: string, sessionId: string, otp: string, targetRole?: 'owner' | 'delivery'): Promise<VerifyOtpResponse> {
    const res = await apiClient.post<VerifyOtpResponse>('/accounts/otp/verify/', {
      phone,
      session_id: sessionId,
      otp,
      target_role: targetRole,
    });

    if (res.tokens?.access) {
      await apiClient.setTokens(res.tokens.access, res.tokens.refresh);
      await AsyncStorage.setItem(STORAGE_KEYS.USER_PROFILE, JSON.stringify(res.user));
    }
    return res;
  },

  /**
   * Register customer account via Django backend (form-based)
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
   * Username/password login via JWT endpoint (/api/v1/auth/token/)
   * Supports targetRole validation on backend
   */
  async login(username: string, password: string, targetRole?: 'owner' | 'delivery'): Promise<AuthTokens> {
    const tokens = await apiClient.post<AuthTokens>('/auth/token/', {
      username,
      password,
      target_role: targetRole,
    });
    if (tokens?.access) {
      await apiClient.setTokens(tokens.access, tokens.refresh);
      const profile = tokens.user || (await this.getCurrentUser());
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
