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
  company?: number | null;
  company_name?: string | null;
  status: 'pending' | 'accepted' | 'preparing' | 'out_for_delivery' | 'delivered' | 'cancelled';
  total_amount: string;
  delivery_address: string;
  notes?: string;
  has_invoice?: boolean;
  invoice_number?: string | null;
  created_at: string;
  updated_at: string;
  items: OrderItemDetail[];
}

export interface CreateOrderPayload {
  company_id?: number | null;
  delivery_address: string;
  notes?: string;
  items: Array<{
    product_id: number;
    quantity: number;
    requested_price?: number | string;
    discount_reason?: string;
  }>;
}

export interface InvoicePreviewItem {
  product_id: number;
  product_name: string;
  ordered_quantity: number;
  delivered_quantity: number;
  has_discrepancy: boolean;
  standard_rate: string;
  approved_discount_per_unit: string;
  effective_rate: string;
  recommended_quantity: number;
  line_total: string;
}

export interface OrderInvoicePreview {
  order_id: number;
  company: {
    id: number | null;
    name: string;
    phone: string;
  };
  has_existing_invoice: boolean;
  existing_invoice_number?: string | null;
  delivery_status: string;
  items: InvoicePreviewItem[];
  subtotal: string;
  discount_total: string;
  grand_total: string;
}

export interface PriceOverrideRequest {
  id: number;
  order: number;
  order_item: number;
  product: number;
  product_name: string;
  standard_price: string;
  requested_price: string;
  discount_amount: string;
  quantity: number;
  reason: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  requested_by_name: string;
  reviewed_by_name?: string | null;
  decision_timestamp?: string | null;
  review_notes?: string;
  created_at: string;
}

export const orderService = {
  /**
   * Fetch orders (scoped by role in backend)
   */
  async getOrders(params?: { status?: string; company?: number | string }): Promise<BackendOrder[]> {
    const query = new URLSearchParams();
    if (params?.status) query.append('status', params.status);
    if (params?.company) query.append('company', String(params.company));
    const qs = query.toString();
    return apiClient.get<BackendOrder[]>(`/orders/${qs ? `?${qs}` : ''}`);
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
   * Update order status following state machine
   */
  async updateOrderStatus(
    orderId: number | string,
    status: BackendOrder['status'],
  ): Promise<BackendOrder> {
    return apiClient.patch<BackendOrder>(`/orders/${orderId}/`, { status });
  },

  /**
   * Owner invoice preview showing ordered vs. delivered discrepancies and resolved rates
   */
  async getInvoicePreview(orderId: number | string): Promise<OrderInvoicePreview> {
    return apiClient.get<OrderInvoicePreview>(`/orders/${orderId}/invoice-preview/`);
  },

  /**
   * Manual Owner Invoice Confirmation (Never called automatically)
   */
  async generateManualInvoice(
    orderId: number | string,
    payload?: {
      items?: Array<{ product_id: number; quantity: number }>;
      notes?: string;
    },
  ): Promise<any> {
    return apiClient.post(`/orders/${orderId}/generate-invoice/`, payload || {});
  },

  /**
   * List price override requests
   */
  async getPriceOverrides(status?: string): Promise<PriceOverrideRequest[]> {
    const qs = status ? `?status=${status}` : '';
    return apiClient.get<PriceOverrideRequest[]>(`/orders/price-overrides/${qs}`);
  },

  /**
   * Owner approve or reject price override request
   */
  async reviewPriceOverride(
    requestId: number | string,
    data: { decision: 'APPROVED' | 'REJECTED'; notes?: string },
  ): Promise<PriceOverrideRequest> {
    return apiClient.post<PriceOverrideRequest>(`/orders/price-overrides/${requestId}/review/`, data);
  },
};

export default orderService;
