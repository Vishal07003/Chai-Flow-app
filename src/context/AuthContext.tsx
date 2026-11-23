import React, { createContext, useContext } from 'react';
import { useApp } from './AppContext';
import { UserRole, UserProfile } from '../types/auth';
import offlineDeliveryService from '../services/offlineDelivery.service';

interface AuthContextType {
  isAuthenticated: boolean;
  userRole: UserRole;
  userMobile: string;
  userProfile: UserProfile;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const {
    isAuthenticated,
    userRole,
    userMobile,
    userProfile,
    logout,
  } = useApp();

  const handleLogout = () => {
    // Quarantine/clear pending offline actions to preserve session isolation
    offlineDeliveryService.clearQueueOnLogout().catch(err => {
      console.log('Error clearing offline queue during logout:', err);
    });
    logout();
  };

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        userRole: (userRole === 'ADMIN' ? 'OWNER' : 'DELIVERY_PARTNER') as UserRole,
        userMobile,
        userProfile: {
          ...userProfile,
          id: userProfile.phone || '1',
          name: userProfile.fullName,
          role: (userRole === 'ADMIN' ? 'OWNER' : 'DELIVERY_PARTNER') as string,
        },
        logout: handleLogout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuthContext = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuthContext must be used within an AuthProvider');
  }
  return context;
};
