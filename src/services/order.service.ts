import apiClient from './api';
import { BackendProduct } from './product.service';

export interface OrderItemDetail {
  id: number;
  product: number;
  product_details: BackendProduct;
  quantity: number;
  price: string;
}

export interface BackendOrder {
  id: number;
  customer: number;
  customer_name: string;
  status: 'pending' | 'accepted' | 'preparing' | 'out_for_delivery' | 'delivered' | 'cancelled';
  total_amount: string;
  delivery_address: string;
  notes?: string;
  created_at: string;
  updated_at: string;
  items: OrderItemDetail[];
}

export interface CreateOrderPayload {
  delivery_address: string;
  notes?: string;
  items: Array<{
    product_id: number;
    quantity: number;
  }>;
}

export const orderService = {
  /**
   * Fetch orders (scoped by role in backend)
   */
  async getOrders(params?: { status?: string }): Promise<BackendOrder[]> {
    const qs = params?.status ? `?status=${params.status}` : '';
    return apiClient.get<BackendOrder[]>(`/orders/${qs}`);
  },

  /**
   * Fetch single order detail
   */
  async getOrderById(id: number | string): Promise<BackendOrder> {
    return apiClient.get<BackendOrder>(`/orders/${id}/`);
  },

  /**
   * Place new order
   */
  async createOrder(data: CreateOrderPayload): Promise<BackendOrder> {
    return apiClient.post<BackendOrder>('/orders/', data);
  },

  /**
   * Update order status
   * - Customer: can only set status to 'cancelled' if order is 'pending'
   * - Owner: progresses lifecycle ('accepted' -> 'preparing' -> 'out_for_delivery' -> 'delivered')
   */
  async updateOrderStatus(id: number | string, status: BackendOrder['status']): Promise<BackendOrder> {
    return apiClient.patch<BackendOrder>(`/orders/${id}/`, { status });
  },

  /**
   * Delete order (Owner only)
   */
  async deleteOrder(id: number | string): Promise<void> {
    return apiClient.delete<void>(`/orders/${id}/`);
  },
};

export default orderService;
