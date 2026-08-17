import apiClient from './api';
import { NotificationItem } from '../types/auth';

export const notificationService = {
  async getNotifications(
    initialData?: NotificationItem[],
  ): Promise<NotificationItem[]> {
    return apiClient.get<NotificationItem[]>('/notifications', initialData || []);
  },

  async addNotification(
    item: Omit<NotificationItem, 'id' | 'time' | 'isRead'>,
  ): Promise<NotificationItem> {
    const newNotif: NotificationItem = {
      ...item,
      id: `notif-${Date.now()}`,
      time: 'Just now',
      isRead: false,
    };
    return apiClient.post<NotificationItem>('/notifications', item, newNotif);
  },

  async markAllAsRead(): Promise<{ success: boolean }> {
    return apiClient.put('/notifications/mark-read', {}, { success: true });
  },

  async deleteNotification(id: string): Promise<{ success: boolean }> {
    return apiClient.delete(`/notifications/${id}`, { success: true });
  },

  async clearAll(): Promise<{ success: boolean }> {
    return apiClient.delete('/notifications', { success: true });
  },
};

export default notificationService;
