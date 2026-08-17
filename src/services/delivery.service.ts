import apiClient from './api';
import { DeliveryBoyItem } from '../types/delivery';

export const deliveryService = {
  async getDeliveryBoys(
    initialData?: DeliveryBoyItem[],
  ): Promise<DeliveryBoyItem[]> {
    return apiClient.get<DeliveryBoyItem[]>('/delivery-boys', initialData || []);
  },

  async addDeliveryBoy(
    boy: Omit<DeliveryBoyItem, 'id'>,
  ): Promise<DeliveryBoyItem> {
    const id = Date.now().toString();
    const newBoy: DeliveryBoyItem = {
      ...boy,
      id,
      avatarUrl:
        boy.avatarUrl ||
        `https://ui-avatars.com/api/?name=${encodeURIComponent(
          boy.name,
        )}&background=3B82F6&color=FFF`,
    };
    return apiClient.post<DeliveryBoyItem>('/delivery-boys', boy, newBoy);
  },

  async updateDeliveryBoy(
    boyId: string,
    updated: Partial<DeliveryBoyItem>,
  ): Promise<Partial<DeliveryBoyItem>> {
    return apiClient.put(`/delivery-boys/${boyId}`, updated, {
      id: boyId,
      ...updated,
    });
  },

  async deleteDeliveryBoy(boyId: string): Promise<{ success: boolean }> {
    return apiClient.delete<{ success: boolean }>(`/delivery-boys/${boyId}`, {
      success: true,
    });
  },

  async assignOrder(boyId: string): Promise<{ success: boolean; boyId: string }> {
    return apiClient.post(`/delivery-boys/${boyId}/assign`, {}, {
      success: true,
      boyId,
    });
  },

  async updateStatus(
    boyId: string,
    status: 'BUSY' | 'READY' | 'OFFLINE',
  ): Promise<{ boyId: string; status: 'BUSY' | 'READY' | 'OFFLINE' }> {
    return apiClient.put(`/delivery-boys/${boyId}/status`, { status }, {
      boyId,
      status,
    });
  },
};

export default deliveryService;
