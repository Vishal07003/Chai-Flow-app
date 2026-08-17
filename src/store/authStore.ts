import { storage } from '../utils/storage';
import { UserProfile, UserRole } from '../types/auth';

const AUTH_KEY = '@auth_store_v1';

export const authStore = {
  async saveAuth(userRole: UserRole, userProfile: UserProfile): Promise<boolean> {
    return storage.setItem(AUTH_KEY, { userRole, userProfile });
  },

  async getAuth(): Promise<{ userRole: UserRole; userProfile: UserProfile } | null> {
    return storage.getItem(AUTH_KEY);
  },

  async clearAuth(): Promise<boolean> {
    return storage.removeItem(AUTH_KEY);
  },
};

export default authStore;
