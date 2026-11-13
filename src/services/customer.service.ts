import apiClient from './api';
import { Customer } from '../types/customer';

export interface BackendCustomer {
  id: number;
  name: string;
  phone: string;
  address?: string;
  created_at: string;
  total_bills: number;
  total_billed_amount: string;
  total_pending_amount: string;
}

export const customerService = {
  async getCustomers(initialData?: Customer[]): Promise<Customer[]> {
    try {
      const backendCustomers = await apiClient.get<BackendCustomer[]>('/customers/');
      if (Array.isArray(backendCustomers) && backendCustomers.length > 0) {
        return backendCustomers.map((bc): Customer => {
          const initials = (bc.name || 'C')
            .split(' ')
            .map(n => n[0])
            .join('')
            .toUpperCase()
            .slice(0, 2);
          const pending = parseFloat(bc.total_pending_amount || '0');
          return {
            id: String(bc.id),
            name: bc.name,
            address: bc.address || 'Local Area',
            amount: isNaN(pending) ? 0 : pending,
            deliveryStatus: `${bc.total_bills || 0} bills recorded`,
            hasDot: pending > 0,
            isOverdue: pending > 0,
            initials,
            avatarUrl: `https://ui-avatars.com/api/?name=${encodeURIComponent(
              bc.name || 'Customer',
            )}&background=8C331A&color=FFF`,
          };
        });
      }
    } catch (e) {
      console.log('Using local fallback customers:', e);
    }
    return initialData || [];
  },

  async addCustomer(customer: Omit<Customer, 'id'>): Promise<Customer> {
    const initials = customer.name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);

    try {
      const res = await apiClient.post<BackendCustomer>('/customers/', {
        name: customer.name,
        phone: '+91 9999999999',
        address: customer.address || 'Local Area',
      });
      return {
        ...customer,
        id: String(res.id),
        initials,
        avatarUrl: `https://ui-avatars.com/api/?name=${encodeURIComponent(
          customer.name,
        )}&background=8C331A&color=FFF`,
      };
    } catch {
      const id = Date.now().toString();
      return {
        ...customer,
        id,
        initials,
        avatarUrl: `https://ui-avatars.com/api/?name=${encodeURIComponent(
          customer.name,
        )}&background=8C331A&color=FFF`,
      };
    }
  },

  async updateCustomer(id: string, updates: Partial<Customer>): Promise<Customer> {
    try {
      await apiClient.patch(`/customers/${id}/`, {
        name: updates.name,
        address: updates.address,
      });
    } catch (e) {
      console.log('Update customer error:', e);
    }
    return {
      id,
      ...updates,
    } as Customer;
  },

  async collectPayment(
    customerId: string,
    amountToDeduct: number,
    paymentMethod: 'cash' | 'online' = 'cash',
  ): Promise<{ success: boolean; customerId: string; amountCollected: number }> {
    try {
      await apiClient.post(`/customers/${customerId}/collect-payment/`, {
        amount: amountToDeduct,
        method: paymentMethod,
      });
    } catch (e) {
      console.log('Collect payment API fallback:', e);
    }
    return {
      success: true,
      customerId,
      amountCollected: amountToDeduct,
    };
  },

  async deleteCustomer(id: string): Promise<{ success: boolean }> {
    try {
      await apiClient.delete(`/customers/${id}/`);
    } catch (e) {
      console.log('Delete customer error:', e);
    }
    return { success: true };
  },
};

export default customerService;
