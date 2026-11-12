import { Platform, PermissionsAndroid } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  getMessaging,
  getToken,
  requestPermission as requestFirebasePermission,
  onTokenRefresh,
  onMessage,
  onNotificationOpenedApp,
  getInitialNotification,
  type RemoteMessage,
} from '@react-native-firebase/messaging';
import Toast from 'react-native-toast-message';
import apiClient from './api';

const FCM_TOKEN_STORAGE_KEY = '@chaiflow_fcm_token';

export interface DeviceTokenPayload {
  token: string;
  platform: 'android' | 'ios' | 'web';
}

export type NotificationNavigationHandler = (screen: string, params?: Record<string, any>) => void;

class NotificationService {
  private navigationHandler: NotificationNavigationHandler | null = null;
  private unsubscribeTokenRefresh: (() => void) | null = null;
  private unsubscribeOnMessage: (() => void) | null = null;
  private unsubscribeOnNotificationOpened: (() => void) | null = null;

  /**
   * Set global navigation callback from NavigationContainer ref or top-level component
   */
  setNavigationHandler(handler: NotificationNavigationHandler) {
    this.navigationHandler = handler;
  }

  /**
   * Request system notification permission (Android 13+ POST_NOTIFICATIONS & iOS)
   */
  async requestPermission(): Promise<boolean> {
    try {
      if (Platform.OS === 'android') {
        if (Platform.Version >= 33) {
          const granted = await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
            {
              title: 'Chai Flow Order Notifications',
              message:
                'Allow Chai Flow to alert you when order statuses change or deliveries are assigned.',
              buttonPositive: 'Allow',
              buttonNegative: 'Deny',
            },
          );
          return granted === PermissionsAndroid.RESULTS.GRANTED;
        }
        return true;
      }

      // iOS permission request via Firebase Messaging
      const messagingInstance = getMessaging();
      const authStatus = await requestFirebasePermission(messagingInstance);
      return authStatus === 1 || authStatus === 2; // Authorized or Provisional
    } catch {
      return false;
    }
  }

  /**
   * Get device FCM registration token
   */
  async getFCMToken(): Promise<string | null> {
    try {
      const messagingInstance = getMessaging();
      return await getToken(messagingInstance);
    } catch (e) {
      console.warn('[FCM] Error obtaining FCM token:', e);
      return null;
    }
  }

  /**
   * Register or update FCM device token with the Django backend
   */
  async registerDeviceToken(fcmToken?: string): Promise<void> {
    const token = fcmToken || (await this.getFCMToken());
    if (!token) return;

    // Only register if user is currently authenticated
    const authToken = await apiClient.getAccessToken();
    if (!authToken) return;

    try {
      await apiClient.post('/notifications/devices/', {
        token,
        platform: Platform.OS === 'ios' ? 'ios' : 'android',
      });
      await AsyncStorage.setItem(FCM_TOKEN_STORAGE_KEY, token);
    } catch {
      // Ignored if offline or non-blocking
    }
  }

  /**
   * Deactivate device token on logout
   */
  async deactivateDeviceToken(): Promise<void> {
    try {
      const storedToken =
        (await AsyncStorage.getItem(FCM_TOKEN_STORAGE_KEY)) ||
        (await this.getFCMToken());

      if (storedToken) {
        const authToken = await apiClient.getAccessToken();
        if (authToken) {
          await apiClient.post('/notifications/devices/deactivate/', {
            token: storedToken,
          });
        }
        await AsyncStorage.removeItem(FCM_TOKEN_STORAGE_KEY);
      }
    } catch {
      // Ignored on logout
    }
  }

  /**
   * Parse notification payload and return target navigation screen & params
   */
  getNavigationTarget(
    data: Record<string, any>,
  ): { screen: string; params?: any } | null {
    if (!data) return null;

    const notifType = data.type;
    if (notifType === 'new_order' || notifType === 'order_status') {
      return {
        screen: 'Orders',
        params: { orderId: data.order_id },
      };
    }
    if (notifType === 'delivery_assigned') {
      // Corrected to match registered screen name in DeliveryNavigator
      return {
        screen: 'OrderDetails',
        params: {
          order: { id: data.order_id, delivery_id: data.delivery_id },
        },
      };
    }
    return null;
  }

  /**
   * Start lifecycle listeners (token refresh, foreground messages, tap handling)
   */
  initializeListeners(navHandler?: NotificationNavigationHandler): () => void {
    if (navHandler) {
      this.navigationHandler = navHandler;
    }

    const messagingInstance = getMessaging();

    // 1. Listen for Token Refreshes
    this.unsubscribeTokenRefresh = onTokenRefresh(
      messagingInstance,
      async (newToken: string) => {
        await this.registerDeviceToken(newToken);
      },
    );

    // 2. Foreground Message Listener: Show Toast and prevent duplicate sound/dialog
    this.unsubscribeOnMessage = onMessage(
      messagingInstance,
      async (remoteMessage: RemoteMessage) => {
        const title =
          remoteMessage.notification?.title ||
          remoteMessage.data?.title ||
          'Chai Flow Update';
        const body =
          remoteMessage.notification?.body ||
          remoteMessage.data?.body ||
          'You have a new update.';

        Toast.show({
          type: 'info',
          text1: String(title),
          text2: String(body),
          onPress: () => {
            Toast.hide();
            if (remoteMessage.data) {
              const target = this.getNavigationTarget(remoteMessage.data);
              if (target && this.navigationHandler) {
                this.navigationHandler(target.screen, target.params);
              }
            }
          },
        });
      },
    );

    // 3. Notification opened from Background
    this.unsubscribeOnNotificationOpened = onNotificationOpenedApp(
      messagingInstance,
      (remoteMessage: RemoteMessage) => {
        if (remoteMessage.data) {
          const target = this.getNavigationTarget(remoteMessage.data);
          if (target && this.navigationHandler) {
            this.navigationHandler(target.screen, target.params);
          }
        }
      },
    );

    // 4. Notification opened from Terminated State
    getInitialNotification(messagingInstance)
      .then((remoteMessage: RemoteMessage | null) => {
        if (remoteMessage?.data) {
          const target = this.getNavigationTarget(remoteMessage.data);
          if (target && this.navigationHandler) {
            this.navigationHandler(target.screen, target.params);
          }
        }
      })
      .catch(() => {});

    // Return cleanup function
    return () => {
      if (this.unsubscribeTokenRefresh) this.unsubscribeTokenRefresh();
      if (this.unsubscribeOnMessage) this.unsubscribeOnMessage();
      if (this.unsubscribeOnNotificationOpened)
        this.unsubscribeOnNotificationOpened();
    };
  }

  // Compatibility methods for AppContext notification state management
  async getNotifications(initialData?: any[]): Promise<any[]> {
    return apiClient.get<any[]>('/notifications', initialData || []);
  }

  async addNotification(item: {
    title: string;
    message: string;
    type: string;
  }): Promise<any> {
    const newNotif = {
      ...item,
      id: `notif-${Date.now()}`,
      time: 'Just now',
      isRead: false,
    };
    return apiClient.post<any>('/notifications', item, newNotif);
  }

  async markAllAsRead(): Promise<{ success: boolean }> {
    return apiClient.put('/notifications/mark-read', {}, { success: true });
  }

  async deleteNotification(id: string): Promise<{ success: boolean }> {
    return apiClient.delete(`/notifications/${id}`, { success: true });
  }

  async clearAll(): Promise<{ success: boolean }> {
    return apiClient.delete('/notifications', { success: true });
  }
}

export const notificationService = new NotificationService();
export default notificationService;
