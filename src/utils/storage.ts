/**
 * Storage Utility Module
 * Chai Flow App
 *
 * Provides type-safe wrapper functions around AsyncStorage
 * with predefined keys, error handling, and batch operations.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

export const STORAGE_KEYS = {
  USER_TOKEN: '@chaiflow_user_token',
  USER_PROFILE: '@chaiflow_user_profile',
  USER_ROLE: '@chaiflow_user_role',
  CUSTOMERS: '@chaiflow_customers',
  LEADS: '@chaiflow_leads',
  INVOICES: '@chaiflow_invoices',
  DELIVERY_BOYS: '@chaiflow_delivery_boys',
  NOTIFICATIONS: '@chaiflow_notifications',
  APP_SETTINGS: '@chaiflow_app_settings',
  THEME_MODE: '@chaiflow_theme_mode',
} as const;

export type StorageKey =
  | (typeof STORAGE_KEYS)[keyof typeof STORAGE_KEYS]
  | string;

export const storage = {
  /**
   * Get an item from storage and parse as JSON
   */
  async getItem<T>(
    key: StorageKey,
    defaultValue: T | null = null,
  ): Promise<T | null> {
    try {
      const jsonValue = await AsyncStorage.getItem(key);
      if (jsonValue === null) return defaultValue;
      return JSON.parse(jsonValue) as T;
    } catch (e) {
      console.error(`[Storage] getItem error for key "${key}":`, e);
      return defaultValue;
    }
  },

  /**
   * Save an item into storage as JSON string
   */
  async setItem<T>(key: StorageKey, value: T): Promise<boolean> {
    try {
      const jsonValue = JSON.stringify(value);
      await AsyncStorage.setItem(key, jsonValue);
      return true;
    } catch (e) {
      console.error(`[Storage] setItem error for key "${key}":`, e);
      return false;
    }
  },

  /**
   * Remove a single key from storage
   */
  async removeItem(key: StorageKey): Promise<boolean> {
    try {
      await AsyncStorage.removeItem(key);
      return true;
    } catch (e) {
      console.error(`[Storage] removeItem error for key "${key}":`, e);
      return false;
    }
  },

  /**
   * Clear all app storage data
   */
  async clear(): Promise<boolean> {
    try {
      await AsyncStorage.clear();
      return true;
    } catch (e) {
      console.error('[Storage] clear error:', e);
      return false;
    }
  },

  /**
   * Get multiple items by keys
   */
  async multiGet<T>(keys: StorageKey[]): Promise<Record<string, T | null>> {
    try {
      const result: Record<string, T | null> = {};
      await Promise.all(
        keys.map(async key => {
          const val = await this.getItem<T>(key);
          result[key] = val;
        }),
      );
      return result;
    } catch (e) {
      console.error('[Storage] multiGet error:', e);
      return {};
    }
  },

  /**
   * Save multiple key-value pairs at once
   */
  async multiSet(keyValuePairs: [StorageKey, unknown][]): Promise<boolean> {
    try {
      await Promise.all(
        keyValuePairs.map(([key, val]) => this.setItem(key, val)),
      );
      return true;
    } catch (e) {
      console.error('[Storage] multiSet error:', e);
      return false;
    }
  },
};

export default storage;
