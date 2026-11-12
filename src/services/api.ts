import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL, STORAGE_KEYS } from '../constants/api.config';

class ApiClient {
  private isRefreshing = false;
  private refreshSubscribers: Array<(token: string) => void> = [];

  private onRefreshed(token: string) {
    this.refreshSubscribers.forEach(cb => cb(token));
    this.refreshSubscribers = [];
  }

  private addRefreshSubscriber(cb: (token: string) => void) {
    this.refreshSubscribers.push(cb);
  }

  /**
   * Safe JWT token retrieval
   */
  async getAccessToken(): Promise<string | null> {
    try {
      return await AsyncStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
    } catch {
      return null;
    }
  }

  async getRefreshToken(): Promise<string | null> {
    try {
      return await AsyncStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN);
    } catch {
      return null;
    }
  }

  async setTokens(access: string, refresh?: string): Promise<void> {
    const entries: Record<string, string> = {
      [STORAGE_KEYS.ACCESS_TOKEN]: access,
    };
    if (refresh) {
      entries[STORAGE_KEYS.REFRESH_TOKEN] = refresh;
    }
    await AsyncStorage.setMany(entries);
  }

  async clearTokens(): Promise<void> {
    await AsyncStorage.removeMany([
      STORAGE_KEYS.ACCESS_TOKEN,
      STORAGE_KEYS.REFRESH_TOKEN,
      STORAGE_KEYS.USER_PROFILE,
    ]);
  }

  /**
   * Refreshes JWT token without duplicate refresh storms
   */
  async refreshAccessToken(): Promise<string | null> {
    const refreshToken = await this.getRefreshToken();
    if (!refreshToken) {
      await this.clearTokens();
      return null;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/auth/token/refresh/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh: refreshToken }),
      });

      if (!response.ok) {
        await this.clearTokens();
        return null;
      }

      const data = await response.json();
      await AsyncStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, data.access);
      return data.access;
    } catch {
      return null;
    }
  }

  /**
   * Core request engine supporting Bearer auth & automatic 401 token refresh
   */
  async request<T>(
    endpoint: string,
    options: RequestInit = {},
    isRetry = false,
  ): Promise<T> {
    const url = endpoint.startsWith('http')
      ? endpoint
      : `${API_BASE_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...((options.headers as Record<string, string>) || {}),
    };

    // Attach token unless explicitly requested without auth
    const token = await this.getAccessToken();
    if (token && !headers.Authorization) {
      headers.Authorization = `Bearer ${token}`;
    }

    try {
      const response = await fetch(url, { ...options, headers });

      // Handle 401 Unauthorized token expiration
      if (response.status === 401 && !isRetry && !endpoint.includes('/auth/token/')) {
        if (!this.isRefreshing) {
          this.isRefreshing = true;
          const newToken = await this.refreshAccessToken();
          this.isRefreshing = false;

          if (newToken) {
            this.onRefreshed(newToken);
            return this.request<T>(endpoint, options, true);
          } else {
            throw new Error('Session expired. Please log in again.');
          }
        } else {
          // Queue duplicate requests while refresh is in flight
          return new Promise<T>((resolve, reject) => {
            this.addRefreshSubscriber(async () => {
              try {
                const res = await this.request<T>(endpoint, options, true);
                resolve(res);
              } catch (err) {
                reject(err);
              }
            });
          });
        }
      }

      // 204 No Content
      if (response.status === 204) {
        return {} as T;
      }

      const responseData = await response.json().catch(() => null);

      if (!response.ok) {
        const errorMessage =
          responseData?.detail ||
          responseData?.message ||
          (responseData && typeof responseData === 'object'
            ? Object.entries(responseData)
                .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : v}`)
                .join('; ')
            : `Request failed with status ${response.status}`);
        throw new Error(errorMessage);
      }

      return responseData as T;
    } catch (error: any) {
      throw error;
    }
  }

  get<T>(endpoint: string, fallbackOrHeaders?: T | Record<string, string>): Promise<T> {
    const headers =
      fallbackOrHeaders && !Array.isArray(fallbackOrHeaders) && typeof fallbackOrHeaders === 'object' && !('length' in fallbackOrHeaders)
        ? (fallbackOrHeaders as Record<string, string>)
        : undefined;
    return this.request<T>(endpoint, { method: 'GET', headers }).catch(err => {
      if (fallbackOrHeaders !== undefined && headers === undefined) {
        return fallbackOrHeaders as T;
      }
      throw err;
    });
  }

  post<T>(endpoint: string, body?: any, fallbackOrHeaders?: T | Record<string, string>): Promise<T> {
    const headers =
      fallbackOrHeaders && typeof fallbackOrHeaders === 'object' && !('id' in (fallbackOrHeaders as object)) && !('success' in (fallbackOrHeaders as object))
        ? (fallbackOrHeaders as Record<string, string>)
        : undefined;
    return this.request<T>(endpoint, {
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
      headers,
    }).catch(err => {
      if (fallbackOrHeaders !== undefined && headers === undefined) {
        return fallbackOrHeaders as T;
      }
      throw err;
    });
  }

  patch<T>(endpoint: string, body?: any, headers?: Record<string, string>): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PATCH',
      body: body ? JSON.stringify(body) : undefined,
      headers,
    });
  }

  put<T>(endpoint: string, body?: any, fallbackOrHeaders?: T | Record<string, string>): Promise<T> {
    const headers =
      fallbackOrHeaders && typeof fallbackOrHeaders === 'object' && !('id' in (fallbackOrHeaders as object)) && !('success' in (fallbackOrHeaders as object))
        ? (fallbackOrHeaders as Record<string, string>)
        : undefined;
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined,
      headers,
    }).catch(err => {
      if (fallbackOrHeaders !== undefined && headers === undefined) {
        return fallbackOrHeaders as T;
      }
      throw err;
    });
  }

  delete<T>(endpoint: string, fallbackOrHeaders?: T | Record<string, string>): Promise<T> {
    const headers =
      fallbackOrHeaders && typeof fallbackOrHeaders === 'object' && !('success' in (fallbackOrHeaders as object))
        ? (fallbackOrHeaders as Record<string, string>)
        : undefined;
    return this.request<T>(endpoint, { method: 'DELETE', headers }).catch(err => {
      if (fallbackOrHeaders !== undefined && headers === undefined) {
        return fallbackOrHeaders as T;
      }
      throw err;
    });
  }
}

export const apiClient = new ApiClient();
export default apiClient;
