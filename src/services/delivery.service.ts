import apiClient from './api';
import { BackendOrder } from './order.service';

export interface DriverDetails {
  id: number;
  username: string;
  first_name: string;
  last_name: string;
  phone?: string;
}

export interface BackendDeliveryItem {
  id: number;
  delivery: number;
  product: number;
  product_name: string;
  ordered_quantity: number;
  delivered_quantity: number;
  discrepancy_notes?: string;
  has_discrepancy: boolean;
}

export interface DeliveryStatusHistoryItem {
  id: number;
  from_status: string;
  to_status: string;
  changed_by_name: string;
  notes?: string;
  created_at: string;
}

export interface BackendDelivery {
  id: number;
  order: number;
  order_details: BackendOrder;
  driver: number | null;
  driver_details: DriverDetails | null;
  status: 'assigned' | 'accepted' | 'picked_up' | 'on_the_way' | 'delivered' | 'failed';
  pickup_time: string | null;
  delivered_time: string | null;
  current_lat: number | null;
  current_lng: number | null;
  failure_reason?: string;
  updated_at: string;
  delivered_items?: BackendDeliveryItem[];
  status_history?: DeliveryStatusHistoryItem[];
}

export interface DeliveryPartnerProfile {
  id: number;
  user?: number | null;
  name: string;
  phone: string;
  emergency_phone?: string;
  license_number?: string;
  vehicle_type: string;
  vehicle_model?: string;
  number_plate?: string;
  location?: string;
  status: 'READY' | 'BUSY' | 'OFFLINE';
  avatar_url?: string;
  active_deliveries_count: number;
  created_at: string;
}

export interface LocationPingPayload {
  latitude: number;
  longitude: number;
  accuracy?: number;
  speed?: number;
  recorded_at?: string;
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
   * Assign or reassign delivery driver to an order (Owner only)
   */
  async assignDriver(deliveryId: number | string, driverId: number): Promise<BackendDelivery> {
    return apiClient.patch<BackendDelivery>(`/deliveries/${deliveryId}/`, {
      driver: driverId,
    });
  },

  /**
   * Delivery Partner status transition (assigned -> accepted -> picked_up -> on_the_way -> delivered / failed)
   */
  async updateStatus(
    deliveryId: number | string,
    status: BackendDelivery['status'],
    notes?: string,
  ): Promise<BackendDelivery> {
    return apiClient.patch<BackendDelivery>(`/deliveries/${deliveryId}/`, {
      status,
      notes,
    });
  },

  /**
   * Record actual delivered quantities before marking delivered (Discrepancy audit)
   */
  async recordDeliveredQuantities(
    deliveryId: number | string,
    items: Array<{ product_id: number; delivered_quantity: number; discrepancy_notes?: string }>,
  ): Promise<BackendDeliveryItem[]> {
    return apiClient.post<BackendDeliveryItem[]>(`/deliveries/${deliveryId}/record-delivered-quantities/`, {
      items,
    });
  },

  /**
   * Send single or buffered location pings (Terminates immediately when delivered/failed)
   */
  async sendLocationPings(
    deliveryId: number | string,
    pings: LocationPingPayload | LocationPingPayload[],
  ): Promise<{ success: boolean; pings_recorded: number; active_tracking: boolean }> {
    const payload = Array.isArray(pings) ? { pings } : pings;
    return apiClient.post(`/deliveries/${deliveryId}/location-ping/`, payload);
  },

  /**
   * Fleet Partner CRUD
   */
  async getDeliveryPartners(status?: string): Promise<DeliveryPartnerProfile[]> {
    const qs = status ? `?status=${status}` : '';
    return apiClient.get<DeliveryPartnerProfile[]>(`/deliveries/partners/${qs}`);
  },

  async getDeliveryBoys(initialData?: any[]): Promise<any[]> {
    try {
      const data = await apiClient.get<any[]>('/deliveries/partners/');
      if (Array.isArray(data) && data.length > 0) {
        return data.map(item => ({
          id: String(item.id),
          name: item.name,
          phone: item.phone,
          status: item.status || 'READY',
          location: item.location || 'Hub Central',
          vehicleType: item.vehicle_type || 'Scooter',
          vehicleModel: item.vehicle_model || '',
          numberPlate: item.number_plate || '',
        }));
      }
    } catch (e) {
      console.log('Failed to fetch delivery partners from backend:', e);
    }
    return initialData || [];
  },

  async addDeliveryBoy(data: any): Promise<any> {
    return apiClient.post('/deliveries/partners/', data);
  },

  async updateDeliveryBoy(id: string | number, data: any): Promise<any> {
    return apiClient.patch(`/deliveries/partners/${id}/`, data);
  },

  async deleteDeliveryBoy(id: string | number): Promise<void> {
    return apiClient.delete(`/deliveries/partners/${id}/`);
  },
};

export default deliveryService;
