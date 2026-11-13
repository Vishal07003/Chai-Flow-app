import apiClient from './api';
import { ScheduleItem } from '../types/delivery';

export const scheduleService = {
  async getSchedules(initialData?: ScheduleItem[]): Promise<ScheduleItem[]> {
    try {
      const backendSchedules = await apiClient.get<any[]>('/deliveries/schedules/');
      if (Array.isArray(backendSchedules) && backendSchedules.length > 0) {
        return backendSchedules.map(s => ({
          id: String(s.id),
          timeSlot: s.time_slot || '09:00 AM',
          title: s.title || `Route #${s.id}`,
          customerName: s.customer_name || 'Valued Customer',
          address: s.address || 'Local Market Area',
          deliveryBoy: s.partner_name || 'Unassigned',
          status: s.status || 'UPCOMING',
          itemsCount: s.items_count || 1,
        }));
      }
    } catch (e) {
      console.log('Using local fallback for schedules:', e);
    }
    return initialData || [];
  },

  async addSchedule(
    schedule: Omit<ScheduleItem, 'id'>,
  ): Promise<ScheduleItem> {
    const fallbackId = `sch-${Date.now()}`;
    try {
      const res = await apiClient.post<any>('/deliveries/schedules/', {
        title: schedule.title,
        customer_name: schedule.customerName,
        address: schedule.address,
        time_slot: schedule.timeSlot,
        items_count: schedule.itemsCount || 1,
        status: schedule.status || 'UPCOMING',
      });
      return {
        ...schedule,
        id: String(res.id),
      };
    } catch {
      const item: ScheduleItem = {
        ...schedule,
        id: fallbackId,
      };
      return item;
    }
  },

  async completeSchedule(
    scheduleId: string,
  ): Promise<{ success: boolean; scheduleId: string }> {
    try {
      await apiClient.patch(`/deliveries/schedules/${scheduleId}/`, {
        status: 'COMPLETED',
      });
    } catch (e) {
      console.log('Complete schedule fallback:', e);
    }
    return {
      success: true,
      scheduleId,
    };
  },
};

export default scheduleService;
