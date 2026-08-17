import apiClient from './api';
import { ScheduleItem } from '../types/delivery';

export const scheduleService = {
  async getSchedules(initialData?: ScheduleItem[]): Promise<ScheduleItem[]> {
    return apiClient.get<ScheduleItem[]>('/schedules', initialData || []);
  },

  async addSchedule(
    schedule: Omit<ScheduleItem, 'id'>,
  ): Promise<ScheduleItem> {
    const item: ScheduleItem = {
      ...schedule,
      id: `sch-${Date.now()}`,
    };
    return apiClient.post<ScheduleItem>('/schedules', schedule, item);
  },

  async completeSchedule(
    scheduleId: string,
  ): Promise<{ success: boolean; scheduleId: string }> {
    return apiClient.put(`/schedules/${scheduleId}/complete`, {}, {
      success: true,
      scheduleId,
    });
  },
};

export default scheduleService;
