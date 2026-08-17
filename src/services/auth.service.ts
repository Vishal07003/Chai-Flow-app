import apiClient from './api';
import { UserRole, UserProfile } from '../types/auth';

export const authService = {
  async sendOtp(phone: string): Promise<{ success: boolean; message: string }> {
    return apiClient.post('/auth/send-otp', { phone }, {
      success: true,
      message: 'OTP sent successfully',
    });
  },

  async verifyOtp(phone: string, otp: string): Promise<{ success: boolean; token: string }> {
    return apiClient.post('/auth/verify-otp', { phone, otp }, {
      success: true,
      token: `mock_jwt_token_${Date.now()}`,
    });
  },

  async login(
    mobile?: string,
    role?: UserRole,
  ): Promise<{ success: boolean; mobile: string; role: UserRole }> {
    return apiClient.post('/auth/login', { mobile, role }, {
      success: true,
      mobile: mobile || '+91 1234567899',
      role: role || 'ADMIN',
    });
  },

  async logout(): Promise<{ success: boolean }> {
    return apiClient.post('/auth/logout', {}, { success: true });
  },
};

export default authService;
