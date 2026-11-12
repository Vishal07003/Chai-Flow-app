import { Platform } from 'react-native';

/**
 * Chai Flow Centralized API Configuration
 *
 * Android Emulator: http://10.0.2.2:8000/api/v1
 * iOS Simulator / Web: http://localhost:8000/api/v1
 * Physical Device: Replace with your PC local Wi-Fi IP (e.g. http://192.168.1.5:8000/api/v1)
 */
export const API_BASE_URL = Platform.select({
  android: 'http://192.168.31.8:8000/api/v1',
  ios: 'http://localhost:8000/api/v1',
  default: 'http://localhost:8000/api/v1',
});

export const STORAGE_KEYS = {
  ACCESS_TOKEN: '@chaiflow_access_token',
  REFRESH_TOKEN: '@chaiflow_refresh_token',
  USER_PROFILE: '@chaiflow_user_profile',
};

