import apiClient from './api';
import { PaymentRecord } from '../types/order';

export const paymentService = {
  async getPaymentHistory(
    initialData?: PaymentRecord[],
  ): Promise<PaymentRecord[]> {
    return apiClient.get<PaymentRecord[]>('/payments/history', initialData || []);
  },

  async recordPayment(payment: Omit<PaymentRecord, 'id'>): Promise<PaymentRecord> {
    const newRecord: PaymentRecord = {
      ...payment,
      id: `pay-${Date.now()}`,
    };
    return apiClient.post<PaymentRecord>('/payments', payment, newRecord);
  },

  async getSettlementSummary(): Promise<{ totalSettled: number; pendingSettlements: number }> {
    return apiClient.get('/payments/summary', {
      totalSettled: 21550,
      pendingSettlements: 4320,
    });
  },
};

export default paymentService;
