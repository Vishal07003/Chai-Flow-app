/**
 * Toast Utility Module
 * Chai Flow App
 * 
 * Powered by react-native-toast-message
 */

import Toast from 'react-native-toast-message';

export const AppToast = {
  success: (title: string, message?: string) => {
    Toast.show({
      type: 'success',
      text1: title,
      text2: message,
      position: 'top',
      visibilityTime: 2500,
    });
  },

  error: (title: string, message?: string) => {
    Toast.show({
      type: 'error',
      text1: title,
      text2: message,
      position: 'top',
      visibilityTime: 3000,
    });
  },

  info: (title: string, message?: string) => {
    Toast.show({
      type: 'info',
      text1: title,
      text2: message,
      position: 'top',
      visibilityTime: 2500,
    });
  },

  warning: (title: string, message?: string) => {
    Toast.show({
      type: 'info',
      text1: title,
      text2: message,
      position: 'top',
      visibilityTime: 2500,
    });
  },
};

/**
 * Helper alias functions for direct calling
 */
export const showSuccessToast = (title: string, message?: string) =>
  AppToast.success(title, message);

export const showErrorToast = (title: string, message?: string) =>
  AppToast.error(title, message);

export const showInfoToast = (title: string, message?: string) =>
  AppToast.info(title, message);

export const showToast = (title: string, message?: string, type: 'success' | 'error' | 'info' = 'info') => {
  if (type === 'success') AppToast.success(title, message);
  else if (type === 'error') AppToast.error(title, message);
  else AppToast.info(title, message);
};

export default AppToast;
