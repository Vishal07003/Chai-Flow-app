import { Platform } from 'react-native';

// Production PythonAnywhere Backend URL (HTTPS)
// Replace with the actual deployed domain, e.g. https://<yourname>.pythonanywhere.com/api/v1
export const PRODUCTION_API_URL = 'https://chaiflow.pythonanywhere.com/api/v1';

// Development Localhost URLs for emulators / direct dev servers
export const DEVELOPMENT_API_URL = Platform.select({
  android: 'http://127.0.0.1:8000/api/v1',
  ios: 'http://192.168.31.8:8000/api/v1',
  default: 'http://127.0.0.1:8000/api/v1',
})!;

// Automatically select PRODUCTION_API_URL in production (__DEV__ === false)
// or permit explicit toggle
export const API_BASE_URL = __DEV__ ? DEVELOPMENT_API_URL : PRODUCTION_API_URL;

export const STORAGE_KEYS = {
  ACCESS_TOKEN: '@chaiflow_access_token',
  REFRESH_TOKEN: '@chaiflow_refresh_token',
  USER_PROFILE: '@chaiflow_user_profile',
};
