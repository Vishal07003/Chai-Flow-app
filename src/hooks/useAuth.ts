import { useApp } from '../context/AppContext';

export const useAuth = () => {
  const {
    isAuthenticated,
    userMobile,
    userRole,
    login,
    logout,
    userProfile,
    updateUserProfile,
  } = useApp();

  return {
    isAuthenticated,
    userMobile,
    userRole,
    login,
    logout,
    userProfile,
    updateUserProfile,
  };
};

export default useAuth;
