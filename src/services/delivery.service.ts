import apiClient from './api';
import { BackendOrder } from './order.service';

export interface DriverDetails {
  id: number;
  username: string;
  first_name: string;
  last_name: string;
  phone?: string;
}

export interface BackendDelivery {
  id: number;
  order: number;
  order_details: BackendOrder;
  driver: number | null;
  driver_details: DriverDetails | null;
  status: 'assigned' | 'picked_up' | 'delivered' | 'failed';
  pickup_time: string | null;
  delivered_time: string | null;
  current_lat: number | null;
  current_lng: number | null;
  updated_at: string;
}

export const deliveryService = {
  /**
   * Fetch deliveries list (filtered by driver if delivery partner, or all if owner)
   */
  async getDeliveries(params?: { driver?: number; status?: string }): Promise<BackendDelivery[]> {
    const query = new URLSearchParams();
    if (params?.driver) query.append('driver', String(params.driver));
    if (params?.status) query.append('status', params.status);
    const qs = query.toString();
    return apiClient.get<BackendDelivery[]>(`/deliveries/${qs ? `?${qs}` : ''}`);
  },

  /**
   * Get single delivery detail
   */
  async getDeliveryById(id: number | string): Promise<BackendDelivery> {
    return apiClient.get<BackendDelivery>(`/deliveries/${id}/`);
  },

  /**
   * Assign delivery driver to an order (Owner only)
   */
  async assignDriver(deliveryId: number | string, driverId: number): Promise<BackendDelivery> {
    return apiClient.patch<BackendDelivery>(`/deliveries/${deliveryId}/`, {
      driver: driverId,
    });
  },

  /**
   * Update delivery GPS coordinates & status (Assigned delivery partner)
   */
  async updateLocationAndStatus(
    deliveryId: number | string,
    data: {
      status?: BackendDelivery['status'];
      current_lat?: number;
      current_lng?: number;
    },
  ): Promise<BackendDelivery> {
    return apiClient.patch<BackendDelivery>(`/deliveries/${deliveryId}/`, data);
  },

  // Compatibility methods for AppContext DeliveryBoy operations
  async getDeliveryBoys(initialData?: any[]): Promise<any[]> {
    return apiClient.get<any[]>('/delivery-boys', initialData || []);
  },

  async addDeliveryBoy(boy: any): Promise<any> {
    const id = Date.now().toString();
    const newBoy = {
      ...boy,
      id,
      avatarUrl:
        boy.avatarUrl ||
        `https://ui-avatars.com/api/?name=${encodeURIComponent(
          boy.name,
        )}&background=3B82F6&color=FFF`,
    };
    return apiClient.post<any>('/delivery-boys', boy, newBoy);
  },

  async updateDeliveryBoy(
    boyId: string,
    updated: any,
  ): Promise<any> {
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
