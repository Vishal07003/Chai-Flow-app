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

  // Legacy/Compatibility methods for offline AppContext invoice management
  async getInvoices(initialData?: any[]): Promise<any[]> {
    return apiClient.get<any[]>('/orders/invoices', initialData || []);
  },

  async createInvoice(
    name: string,
    amount: number,
    dueDays: string,
    fullItem?: any,
  ): Promise<any> {
    const invId = fullItem?.id || `inv-${Date.now()}`;
    const invNo =
      fullItem?.invoiceNo ||
      `INV-2026-${Math.floor(100 + Math.random() * 900)}`;

    const newInv = {
      id: invId,
      invoiceNo: invNo,
      name,
      customerAddress: fullItem?.customerAddress || 'Local Market Area',
      customerPhone: fullItem?.customerPhone || '+91 98765 00000',
      amount: `₹${amount.toLocaleString()}`,
      numericAmount: amount,
      due: dueDays,
      date: fullItem?.date || 'Today',
      isOverdue: dueDays.toLowerCase().includes('overdue'),
      status: dueDays.toLowerCase().includes('overdue') ? 'OVERDUE' : 'PENDING',
      items: fullItem?.items || [
        { id: '1', name: 'Chai Supplies Bundle', qty: 1, price: amount },
      ],
      subtotal: fullItem?.subtotal || amount,
      tax: fullItem?.tax || 0,
      notes: fullItem?.notes || 'Thank you for your business with ChaiFlow!',
    };

    return apiClient.post<any>('/orders/invoices', newInv, newInv);
  },

  async createQuickBill(billData: any): Promise<any> {
    const invId = `inv-${Date.now()}`;
    const invNo = `QBILL-2026-${Math.floor(1000 + Math.random() * 9000)}`;

    const newInv = {
      id: invId,
      invoiceNo: invNo,
      name: billData.name || 'Walk-in Customer',
      customerAddress: billData.customerAddress || 'Counter Walk-in',
      customerPhone: billData.customerPhone || '',
      amount: `₹${(billData.numericAmount || 0).toLocaleString()}`,
      numericAmount: billData.numericAmount || 0,
      due: billData.due || 'Paid on Spot',
      date: billData.date || 'Today',
      isOverdue: false,
      status: billData.status || 'PAID',
      items: billData.items || [],
      subtotal: billData.subtotal || billData.numericAmount || 0,
      tax: billData.tax || 0,
      notes: billData.notes || 'Counter Quick Bill',
    };

    return apiClient.post<any>('/orders/quick-bill', newInv, newInv);
  },

  async markInvoiceAsPaid(id: string): Promise<{ success: boolean; id: string }> {
    return apiClient.put(`/orders/invoices/${id}/pay`, {}, {
      success: true,
      id,
    });
  },

  async deleteInvoice(id: string): Promise<{ success: boolean }> {
    return apiClient.delete<{ success: boolean }>(`/orders/invoices/${id}`, {
      success: true,
    });
  },
};

export default orderService;
