
import { Platform } from 'react-native';

export const API_BASE_URL = Platform.select({
  android: 'http://127.0.0.1:8000/api/v1',
  ios: 'http://192.168.31.8:8000/api/v1',
  default: 'http://127.0.0.1:8000/api/v1',
})!;

export const STORAGE_KEYS = {
  ACCESS_TOKEN: '@chaiflow_access_token',
  REFRESH_TOKEN: '@chaiflow_refresh_token',
  USER_PROFILE: '@chaiflow_user_profile',
};
