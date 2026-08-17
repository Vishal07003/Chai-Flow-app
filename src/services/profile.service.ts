import apiClient from './api';
import { UserProfile } from '../types/auth';

export const profileService = {
  async getProfile(initialProfile?: UserProfile): Promise<UserProfile> {
    return apiClient.get<UserProfile>('/profile', initialProfile || {
      fullName: 'Arjun Mehta',
      role: 'Network Owner',
      phone: '+91 1234567899',
      email: 'arjun@chaiflow.in',
      businessName: 'ChaiFlow Beverages',
      address: 'Shop 14, Kirti Nagar, New Delhi',
      avatarUrl:
        'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&auto=format&fit=crop&q=80',
    });
  },

  async updateProfile(profile: Partial<UserProfile>): Promise<UserProfile> {
    return apiClient.put<UserProfile>('/profile', profile, profile as UserProfile);
  },
};

export default profileService;
