import apiClient from './api';
import { BackendInvoice } from './billing.service';

export type DraftBillingSource = 'quick_billing' | 'single_order' | 'consolidated_orders' | 'recurring_order';

export type DraftStatus = 'draft' | 'finalized' | 'cancelled';

export interface DraftInvoiceItem {
  id: number;
  product: number | null;
  product_name: string;
  unit: string;
  quantity: number;
  unit_price: string;
  total_price: string;
}

export interface DraftInvoiceOrder {
  id: number;
  order_id: number;
  order_total: string;
  order_status: string;
  order_date: string;
  reserved_at: string;
}

export interface DraftInvoice {
  id: number;
  draft_number: string;
  customer: number | null;
  customer_name: string;
  customer_phone: string;
  billing_source: DraftBillingSource;
  status: DraftStatus;
  subtotal: string;
  discount_amount: string;
  grand_total: string;
  due_date: string | null;
  notes: string;
  expires_at: string | null;
  created_by: number | null;
  created_by_name?: string | null;
  official_invoice: number | null;
  official_invoice_number?: string | null;
  created_at: string;
  updated_at: string;
  items: DraftInvoiceItem[];
  draft_orders: DraftInvoiceOrder[];
}

export interface DraftItemInput {
  product_id?: number | null;
  product_name?: string;
  unit?: string;
  quantity: number;
  unit_price: number | string;
}

export interface CreateDraftPayload {
  customer_id?: number | null;
  billing_source?: DraftBillingSource;
  items?: DraftItemInput[];
  order_ids?: number[];
  discount_amount?: number | string;
  due_date?: string | null;
  notes?: string;
}

export interface UpdateDraftPayload {
  customer_id?: number | null;
  items?: DraftItemInput[];
  order_ids?: number[];
  discount_amount?: number | string;
  due_date?: string | null;
  notes?: string;
}

export interface FinalizeDraftPayload {
  notes?: string;
}

export interface FinalizeDraftResponse {
  success: boolean;
  message: string;
  invoice: BackendInvoice;
  draft: DraftInvoice;
}

export interface DraftListFilters {
  status?: DraftStatus;
  billing_source?: DraftBillingSource;
  customer?: number | string;
  search?: string;
}

export const draftService = {
  /**
   * List drafts with optional filters (status, billing_source, customer, search)
   * GET /api/v1/billing/drafts/
   */
  async getDrafts(filters?: DraftListFilters): Promise<DraftInvoice[]> {
    const params = new URLSearchParams();
    if (filters?.status) params.append('status', filters.status);
    if (filters?.billing_source) params.append('billing_source', filters.billing_source);
    if (filters?.customer) params.append('customer', String(filters.customer));
    if (filters?.search) params.append('search', filters.search);

    const qs = params.toString();
    return apiClient.get<DraftInvoice[]>(`/billing/drafts/${qs ? `?${qs}` : ''}`);
  },

  /**
   * Get draft detail by ID
   * GET /api/v1/billing/drafts/{id}/
   */
  async getDraftDetail(id: number | string): Promise<DraftInvoice> {
    return apiClient.get<DraftInvoice>(`/billing/drafts/${id}/`);
  },

  /**
   * Create a new draft invoice
   * POST /api/v1/billing/drafts/
   */
  async createDraft(payload: CreateDraftPayload): Promise<DraftInvoice> {
    return apiClient.post<DraftInvoice>('/billing/drafts/', payload);
  },

  /**
   * Partially update an existing draft invoice
   * PATCH /api/v1/billing/drafts/{id}/
   */
  async updateDraft(id: number | string, payload: UpdateDraftPayload): Promise<DraftInvoice> {
    return apiClient.patch<DraftInvoice>(`/billing/drafts/${id}/`, payload);
  },

  /**
   * Cancel draft and release all order reservations
   * POST /api/v1/billing/drafts/{id}/cancel/
   */
  async cancelDraft(id: number | string): Promise<DraftInvoice> {
    return apiClient.post<DraftInvoice>(`/billing/drafts/${id}/cancel/`, {});
  },

  /**
   * Atomically finalize draft into official invoice with auto-allocation of advances
   * POST /api/v1/billing/drafts/{id}/finalize/
   */
  async finalizeDraft(id: number | string, payload?: FinalizeDraftPayload): Promise<FinalizeDraftResponse> {
    return apiClient.post<FinalizeDraftResponse>(`/billing/drafts/${id}/finalize/`, payload || {});
  },
};

export default draftService;
