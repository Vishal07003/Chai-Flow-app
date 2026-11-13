import apiClient from './api';

export interface BillingCustomer {
  id: number;
  name: string;
  phone: string;
  address?: string;
  created_at: string;
  total_bills: number;
  total_billed_amount: string;
  total_pending_amount: string;
}

export interface BackendInvoiceItem {
  id: number;
  product: number | null;
  product_name: string;
  unit_price: string;
  quantity: number;
  total_price: string;
}

export interface BackendPayment {
  id: number;
  invoice: number;
  amount: string;
  method: 'cash' | 'online';
  received_at: string;
  notes?: string;
}

export interface BackendInvoice {
  id: number;
  invoice_number: string;
  customer: number | null;
  customer_name: string;
  customer_phone: string;
  subtotal: string;
  grand_total: string;
  status: 'unpaid' | 'partially_paid' | 'paid';
  notes?: string;
  created_at: string;
  items: BackendInvoiceItem[];
  payments: BackendPayment[];
  total_paid: string;
  pending_amount: string;
}

export interface CreateInvoicePayload {
  customer_id?: number | null;
  customer_name?: string;
  customer_phone?: string;
  notes?: string;
  items: Array<{
    product_id?: number | null;
    product_name?: string;
    unit_price?: number | string;
    quantity: number;
  }>;
  initial_payment_amount?: number | string;
  initial_payment_method?: 'cash' | 'online';
}

export interface DashboardStats {
  date: string;
  total_sales: string;
  invoices_count: number;
  cash_received: string;
  online_received: string;
  total_received: string;
  total_pending: string;
}

export const billingService = {
  /**
   * Search customers by name or phone, or list all
   */
  async getCustomers(search?: string): Promise<BillingCustomer[]> {
    const qs = search ? `?search=${encodeURIComponent(search)}` : '';
    return apiClient.get<BillingCustomer[]>(`/billing/customers/${qs}`);
  },

  /**
   * Create or save new customer
   */
  async createCustomer(data: { name: string; phone: string; address?: string }): Promise<BillingCustomer> {
    return apiClient.post<BillingCustomer>('/billing/customers/', data);
  },

  /**
   * Get invoices belonging to a specific customer with optional date filter
   */
  async getCustomerInvoices(customerId: number | string, date?: string): Promise<BackendInvoice[]> {
    const qs = date ? `?date=${date}` : '';
    return apiClient.get<BackendInvoice[]>(`/billing/customers/${customerId}/invoices/${qs}`);
  },

  /**
   * List invoices with optional search, status, and date filters
   */
  async getInvoices(params?: {
    search?: string;
    status?: 'unpaid' | 'partially_paid' | 'paid';
    date?: string;
    customer?: number;
  }): Promise<BackendInvoice[]> {
    const query = new URLSearchParams();
    if (params?.search) query.append('search', params.search);
    if (params?.status) query.append('status', params.status);
    if (params?.date) query.append('date', params.date);
    if (params?.customer) query.append('customer', String(params.customer));
    const qs = query.toString();
    return apiClient.get<BackendInvoice[]>(`/billing/invoices/${qs ? `?${qs}` : ''}`);
  },

  /**
   * Get single invoice detail
   */
  async getInvoiceDetail(invoiceId: number | string): Promise<BackendInvoice> {
    return apiClient.get<BackendInvoice>(`/billing/invoices/${invoiceId}/`);
  },

  /**
   * Save Quick Bill (creates invoice, line items, and optional upfront payment atomically)
   */
  async createInvoice(payload: CreateInvoicePayload): Promise<BackendInvoice> {
    return apiClient.post<BackendInvoice>('/billing/invoices/', payload);
  },

  /**
   * Add subsequent payment to invoice (Cash or Online)
   */
  async addPayment(
    invoiceId: number | string,
    data: { amount: number | string; method: 'cash' | 'online'; notes?: string },
  ): Promise<BackendInvoice> {
    return apiClient.post<BackendInvoice>(`/billing/invoices/${invoiceId}/payments/`, data);
  },

  /**
   * Get dashboard sales, cash/online collections, and pending totals
   */
  async getDashboardStats(date?: string): Promise<DashboardStats> {
    const qs = date ? `?date=${date}` : '';
    return apiClient.get<DashboardStats>(`/billing/invoices/dashboard_stats/${qs}`);
  },

  async createInvoiceLegacy(name: string, amount: number, dueDays: string, fullItem?: any): Promise<any> {
    return { id: String(Date.now()), name, amount: `₹${amount}`, due: dueDays, ...fullItem };
  },

  async createQuickBillLegacy(data: any): Promise<any> {
    return { id: String(Date.now()), ...data };
  },

  async markInvoiceAsPaidLegacy(id: string): Promise<void> {},

  async deleteInvoiceLegacy(id: string): Promise<void> {},
};

export default billingService;

