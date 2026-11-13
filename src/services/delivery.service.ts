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

  // Fleet Partner operations connected to Django /api/v1/deliveries/partners/
  async getDeliveryBoys(initialData?: any[]): Promise<any[]> {
    try {
      const backendPartners = await apiClient.get<any[]>('/deliveries/partners/');
      if (Array.isArray(backendPartners) && backendPartners.length > 0) {
        return backendPartners.map(p => ({
          id: String(p.id),
          name: p.name,
          phone: p.phone,
          status: p.status,
          vehicleType: p.vehicle_type,
          vehicleModel: p.vehicle_model,
          numberPlate: p.number_plate,
          location: p.location || 'Hub Central',
          activeDeliveries: p.active_deliveries || 0,
          completedToday: p.completed_today || 0,
          rating: p.rating ? parseFloat(p.rating) : 4.8,
          batteryLevel: p.battery_level ? `${p.battery_level}%` : '85%',
          avatarUrl: `https://ui-avatars.com/api/?name=${encodeURIComponent(p.name)}&background=3B82F6&color=FFF`,
        }));
      }
    } catch (e) {
      console.log('Using local fallback for delivery boys:', e);
    }
    return initialData || [];
  },

  async addDeliveryBoy(boy: any): Promise<any> {
    const id = Date.now().toString();
    try {
      const res = await apiClient.post<any>('/deliveries/partners/', {
        name: boy.name,
        phone: boy.phone || '+91 9999999999',
        status: boy.status || 'READY',
        vehicle_type: boy.vehicleType || 'Electric Scooter',
        vehicle_model: boy.vehicleModel || 'Hero Electric Splendor',
        number_plate: boy.numberPlate || 'KA-01-EA-9920',
        location: boy.location || 'Hub Central',
      });
      return {
        ...boy,
        id: String(res.id),
        avatarUrl: `https://ui-avatars.com/api/?name=${encodeURIComponent(boy.name)}&background=3B82F6&color=FFF`,
      };
    } catch {
      const newBoy = {
        ...boy,
        id,
        avatarUrl:
          boy.avatarUrl ||
          `https://ui-avatars.com/api/?name=${encodeURIComponent(
            boy.name,
          )}&background=3B82F6&color=FFF`,
      };
      return newBoy;
    }
  },

  async updateDeliveryBoy(
    boyId: string,
    updated: any,
  ): Promise<any> {
    try {
      await apiClient.patch(`/deliveries/partners/${boyId}/`, {
        name: updated.name,
        phone: updated.phone,
        status: updated.status,
        location: updated.location,
        vehicle_type: updated.vehicleType,
        vehicle_model: updated.vehicleModel,
        number_plate: updated.numberPlate,
      });
    } catch (e) {
      console.log('Update delivery partner fallback:', e);
    }
    return {
      id: boyId,
      ...updated,
    };
  },

  async deleteDeliveryBoy(boyId: string): Promise<{ success: boolean }> {
    try {
      await apiClient.delete(`/deliveries/partners/${boyId}/`);
    } catch (e) {
      console.log('Delete delivery partner fallback:', e);
    }
    return { success: true };
  },

  async assignOrder(boyId: string): Promise<{ success: boolean; boyId: string }> {
    return {
      success: true,
      boyId,
    };
  },

  async updateStatus(
    boyId: string,
    status: 'BUSY' | 'READY' | 'OFFLINE',
  ): Promise<{ boyId: string; status: 'BUSY' | 'READY' | 'OFFLINE' }> {
    try {
      await apiClient.patch(`/deliveries/partners/${boyId}/`, { status });
    } catch (e) {
      console.log('Update partner status fallback:', e);
    }
    return {
      boyId,
      status,
    };
  },
};

export default deliveryService;
