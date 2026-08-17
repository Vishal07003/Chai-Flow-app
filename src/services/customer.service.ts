import apiClient from './api';
import { Customer } from '../types/customer';

export const customerService = {
  async getCustomers(initialData?: Customer[]): Promise<Customer[]> {
    return apiClient.get<Customer[]>('/customers', initialData || []);
  },

  async addCustomer(customer: Omit<Customer, 'id'>): Promise<Customer> {
    const id = Date.now().toString();
    const initials = customer.name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);

    const newCustomer: Customer = {
      ...customer,
      id,
      initials,
      avatarUrl: `https://ui-avatars.com/api/?name=${encodeURIComponent(
        customer.name,
      )}&background=8C331A&color=FFF`,
    };

    return apiClient.post<Customer>('/customers', customer, newCustomer);
  },

  async updateCustomer(id: string, updates: Partial<Customer>): Promise<Customer> {
    return apiClient.put<Customer>(`/customers/${id}`, updates, {
      id,
      ...updates,
    } as Customer);
  },

  async collectPayment(
    customerId: string,
    amountToDeduct: number,
  ): Promise<{ success: boolean; customerId: string; amountCollected: number }> {
    return apiClient.post('/customers/collect-payment', {
      customerId,
      amountToDeduct,
    }, {
      success: true,
      customerId,
      amountCollected: amountToDeduct,
    });
  },

  async deleteCustomer(id: string): Promise<{ success: boolean }> {
    return apiClient.delete<{ success: boolean }>(`/customers/${id}`, {
      success: true,
    });
  },
};

export default customerService;
