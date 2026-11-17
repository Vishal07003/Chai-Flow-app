import React, { createContext, useContext } from 'react';
import { useApp } from './AppContext';
import { UserRole, UserProfile } from '../types/auth';

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
        logout,
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
