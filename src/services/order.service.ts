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
  customer_profile?: number | null;
  customer_name: string;
  customer_phone?: string;
  company?: number | null;
  company_name?: string | null;
  status: 'pending' | 'accepted' | 'preparing' | 'out_for_delivery' | 'delivered' | 'cancelled';
  total_amount: string;
  delivery_address: string;
  scheduled_delivery_date?: string | null;
  scheduled_delivery_time?: string | null;
  notes?: string;
  delivery_partner_id?: number | null;
  delivery_partner_name?: string | null;
  delivery_status?: 'assigned' | 'accepted' | 'picked_up' | 'on_the_way' | 'delivered' | 'failed' | null;
  has_invoice?: boolean;
  invoice_number?: string | null;
  created_at: string;
  updated_at: string;
  items: OrderItemDetail[];
}

export interface CreateOrderPayload {
  customer_id?: number | null;
  company_id?: number | null;
  delivery_partner_id?: number | null;
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

export interface RecurringOrderItem {
  id: number;
  product: number;
  product_name: string;
  product_price: string;
  quantity: number;
  unit_price?: string;
}

export interface BackendRecurringOrder {
  id: number;
  customer: number;
  customer_profile?: number | null;
  customer_name: string;
  customer_phone?: string;
  company?: number | null;
  delivery_partner?: number | null;
  delivery_partner_name?: string | null;
  delivery_address: string;
  frequency: 'daily' | 'weekdays';
  weekdays?: string;
  is_paused: boolean;
  skipped_dates?: string[];
  auto_approve?: boolean;
  notes?: string;
  created_at: string;
  updated_at: string;
  items: RecurringOrderItem[];
  is_scheduled_today: boolean;
  today_order_generated: boolean;
  today_order_id?: number | null;
  // Phase 2A: Notification & Timing Schedule
  use_global_notification_settings?: boolean;
  custom_order_generation_time?: string | null;
  custom_owner_notification_time?: string | null;
  custom_partner_notification_time?: string | null;
  owner_notification_enabled?: boolean;
  partner_notification_enabled?: boolean;
  effective_notification_schedule?: {
    is_custom: boolean;
    order_generation_time: string;
    owner_notification_time: string;
    partner_notification_time: string;
    owner_notification_enabled: boolean;
    partner_notification_enabled: boolean;
    timezone: string;
  };
}

export interface GlobalRecurringNotificationSetting {
  id: number;
  order_generation_time: string;
  owner_notification_time: string;
  partner_notification_time: string;
  owner_notification_enabled: boolean;
  partner_notification_enabled: boolean;
  timezone: string;
  updated_at?: string;
}

export interface CreateRecurringOrderPayload {
  customer_id?: number | null;
  delivery_partner_id?: number | null;
  delivery_address: string;
  frequency: 'daily' | 'weekdays';
  weekdays?: string;
  is_paused?: boolean;
  auto_approve?: boolean;
  notes?: string;
  // Phase 2A
  use_global_notification_settings?: boolean;
  custom_order_generation_time?: string | null;
  custom_owner_notification_time?: string | null;
  custom_partner_notification_time?: string | null;
  owner_notification_enabled?: boolean;
  partner_notification_enabled?: boolean;
  items: Array<{
    product_id: number;
    quantity: number;
    unit_price?: number;
  }>;
}

export const orderService = {
  /**
   * Fetch orders (scoped by role in backend)
   */
  async getOrders(params?: { status?: string; company?: number | string; customer?: number | string }): Promise<BackendOrder[]> {
    const query = new URLSearchParams();
    if (params?.status) query.append('status', params.status);
    if (params?.company) query.append('company', String(params.company));
    if (params?.customer) query.append('customer', String(params.customer));
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

  /**
   * Recurring Orders API
   */
  async getRecurringOrders(params?: { customer?: number; is_paused?: boolean }): Promise<BackendRecurringOrder[]> {
    const query = new URLSearchParams();
    if (params?.customer) query.append('customer', String(params.customer));
    if (params?.is_paused !== undefined) query.append('is_paused', String(params.is_paused));
    const qs = query.toString();
    return apiClient.get<BackendRecurringOrder[]>(`/orders/recurring/${qs ? `?${qs}` : ''}`);
  },

  async createRecurringOrder(data: CreateRecurringOrderPayload): Promise<BackendRecurringOrder> {
    return apiClient.post<BackendRecurringOrder>('/orders/recurring/', data);
  },

  async updateRecurringOrder(
    id: number | string,
    data: Partial<CreateRecurringOrderPayload>,
  ): Promise<BackendRecurringOrder> {
    return apiClient.patch<BackendRecurringOrder>(`/orders/recurring/${id}/`, data);
  },

  async pauseRecurringOrder(id: number | string): Promise<{ status: string }> {
    return apiClient.post(`/orders/recurring/${id}/pause/`);
  },

  async resumeRecurringOrder(id: number | string): Promise<{ status: string }> {
    return apiClient.post(`/orders/recurring/${id}/resume/`);
  },

  async skipRecurringDate(id: number | string, date?: string): Promise<{ status: string; skipped_dates: string[] }> {
    return apiClient.post(`/orders/recurring/${id}/skip-date/`, { date });
  },

  async unskipRecurringDate(id: number | string, date?: string): Promise<{ status: string; skipped_dates: string[] }> {
    return apiClient.post(`/orders/recurring/${id}/unskip-date/`, { date });
  },

  async generateOrderFromRecurring(
    id: number | string,
    date?: string,
  ): Promise<{ success?: boolean; already_generated?: boolean; message: string; order: BackendOrder }> {
    return apiClient.post(`/orders/recurring/${id}/generate-order/`, { date });
  },

  /**
   * Phase 2A: Global Recurring Notification Settings
   */
  async getGlobalRecurringSettings(): Promise<GlobalRecurringNotificationSetting> {
    const res = await apiClient.get<GlobalRecurringNotificationSetting | GlobalRecurringNotificationSetting[]>(
      '/orders/recurring-settings/'
    );
    if (Array.isArray(res)) {
      return res[0];
    }
    return res;
  },

  async updateGlobalRecurringSettings(
    data: Partial<GlobalRecurringNotificationSetting>,
  ): Promise<GlobalRecurringNotificationSetting> {
    return apiClient.patch<GlobalRecurringNotificationSetting>('/orders/recurring-settings/1/', data);
  },

  /**
   * APPROVED FEATURE: Daily Delivery Schedule API Integration
   */
  async getDailySchedules(params?: { customer?: number | string; is_active?: boolean }): Promise<DailyDeliverySchedule[]> {
    const query = new URLSearchParams();
    if (params?.customer) query.append('customer', String(params.customer));
    if (params?.is_active !== undefined) query.append('is_active', String(params.is_active));
    const qs = query.toString();
    return apiClient.get<DailyDeliverySchedule[]>(`/orders/schedules/${qs ? `?${qs}` : ''}`);
  },

  async createDailySchedule(data: CreateDailySchedulePayload): Promise<DailyDeliverySchedule> {
    return apiClient.post<DailyDeliverySchedule>('/orders/schedules/', data);
  },

  async updateDailySchedule(id: number | string, data: Partial<CreateDailySchedulePayload>): Promise<DailyDeliverySchedule> {
    return apiClient.patch<DailyDeliverySchedule>(`/orders/schedules/${id}/`, data);
  },

  async cancelDateDelivery(id: number | string, dateStr: string, reason?: string): Promise<{
    case: 'A' | 'B';
    status: string;
    message: string;
    order_id?: number;
    cancelled_date?: string;
  }> {
    return apiClient.post(`/orders/schedules/${id}/cancel-date/`, { date: dateStr, reason });
  },

  async triggerScheduleRunNow(id: number | string, dateStr?: string): Promise<{
    success?: boolean;
    already_generated?: boolean;
    message: string;
    order: BackendOrder;
  }> {
    return apiClient.post(`/orders/schedules/${id}/generate-now/`, { date: dateStr });
  },
};

export interface DailyDeliveryScheduleItem {
  id: number;
  product: number;
  product_name: string;
  product_price: string;
  quantity: number;
  unit_price: string;
}

export interface ScheduleCancellationException {
  id: number;
  cancelled_date: string;
  reason: string;
  created_at: string;
}

export interface DailyDeliverySchedule {
  id: number;
  customer_profile: number;
  customer_name: string;
  customer_phone?: string;
  delivery_partner: number;
  delivery_partner_name: string;
  delivery_partner_phone?: string;
  delivery_time: string; // HH:MM:SS
  notification_lead_time_minutes: number;
  weekdays: string; // e.g. "0,1,2,3,4"
  delivery_address: string;
  start_date: string;
  end_date?: string | null;
  is_active: boolean;
  notes?: string;
  created_at: string;
  updated_at: string;
  items: DailyDeliveryScheduleItem[];
  cancellation_exceptions: ScheduleCancellationException[];
  next_scheduled_delivery?: string | null;
}

export interface CreateDailySchedulePayload {
  customer_id: number;
  delivery_partner_id: number;
  delivery_time: string;
  notification_lead_time_minutes?: number;
  weekdays: string;
  delivery_address?: string;
  start_date: string;
  end_date?: string | null;
  is_active?: boolean;
  notes?: string;
  items: Array<{
    product_id: number;
    quantity: number;
    unit_price?: number | string;
  }>;
}

export default orderService;
