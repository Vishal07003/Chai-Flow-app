import { useApp } from '../context/AppContext';

export const useAuth = () => {
  const {
    isAuthenticated,
    userMobile,
    userRole,
    loginWithVerifiedUser,
    logout,
    userProfile,
    updateUserProfile,
  } = useApp();

  return {
    isAuthenticated,
    userMobile,
    userRole,
    loginWithVerifiedUser,
    logout,
    userProfile,
    updateUserProfile,
  };
};

export default useAuth;
