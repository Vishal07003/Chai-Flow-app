import React, { createContext, useContext } from 'react';
import { useApp } from './AppContext';
import { UserRole, UserProfile } from '../types/auth';

interface AuthContextType {
  isAuthenticated: boolean;
  userRole: UserRole;
  userMobile: string;
  userProfile: UserProfile;
  login: (mobile?: string, role?: UserRole) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const {
    isAuthenticated,
    userRole,
    userMobile,
    userProfile,
    login: appLogin,
    logout,
  } = useApp();

  const handleLogin = (mobile?: string, role?: UserRole) => {
    let mappedRole: 'ADMIN' | 'DELIVERY_PARTNER' | undefined;
    if (role === 'OWNER' || role === 'ADMIN') {
      mappedRole = 'ADMIN';
    } else if (role === 'DELIVERY_PARTNER') {
      mappedRole = 'DELIVERY_PARTNER';
    }
    appLogin(mobile, mappedRole);
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
        login: handleLogin,
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
