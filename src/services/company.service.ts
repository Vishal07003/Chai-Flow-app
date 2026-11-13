import apiClient from './api';

export interface CompanyProductPrice {
  id: number;
  company: number;
  product: number;
  product_name: string;
  custom_price: string;
  min_quantity: number;
  valid_from: string;
  valid_to?: string | null;
  is_active: boolean;
}

export interface Company {
  id: number;
  name: string;
  trade_name?: string;
  phone: string;
  email?: string;
  gstin?: string;
  billing_address?: string;
  billing_cycle: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'BOTH';
  credit_limit: string;
  payment_terms_days: number;
  is_active: boolean;
  created_at: string;
  total_invoices_count: number;
  total_billed: string;
  total_paid: string;
  current_outstanding: string;
  contracted_prices?: CompanyProductPrice[];
}

export interface LedgerTransaction {
  date: string;
  type: string;
  reference_no: string;
  description: string;
  debit: string;
  credit: string;
  running_balance: string;
  entity_id: number;
}

export interface MonthlyLedgerStatement {
  company: {
    id: number;
    name: string;
    trade_name?: string;
    phone: string;
    gstin?: string;
    billing_cycle: string;
    credit_limit: string;
  };
  period: {
    year: number;
    month: number;
    start_date: string;
    end_date: string;
  };
  summary: {
    opening_balance: string;
    total_debit: string;
    total_credit: string;
    closing_balance: string;
  };
  transactions: LedgerTransaction[];
}

export interface PaymentCollectionResult {
  success: boolean;
  payment_id: number;
  amount: string;
  allocated_to_invoices: string;
  unallocated_advance_credit: string;
  invoices_settled: number;
}

export const companyService = {
  /**
   * List or search companies
   */
  async getCompanies(search?: string): Promise<Company[]> {
    const qs = search ? `?search=${encodeURIComponent(search)}` : '';
    return apiClient.get<Company[]>(`/billing/companies/${qs}`);
  },

  /**
   * Get company details with pricing
   */
  async getCompanyById(id: number | string): Promise<Company> {
    return apiClient.get<Company>(`/billing/companies/${id}/`);
  },

  /**
   * Create new company
   */
  async createCompany(data: Partial<Company>): Promise<Company> {
    return apiClient.post<Company>('/billing/companies/', data);
  },

  /**
   * Update company
   */
  async updateCompany(id: number | string, data: Partial<Company>): Promise<Company> {
    return apiClient.patch<Company>(`/billing/companies/${id}/`, data);
  },

  /**
   * Get dynamic monthly passbook statement
   */
  async getMonthlyLedger(companyId: number | string, year?: number, month?: number): Promise<MonthlyLedgerStatement> {
    const query = new URLSearchParams();
    if (year) query.append('year', String(year));
    if (month) query.append('month', String(month));
    const qs = query.toString();
    return apiClient.get<MonthlyLedgerStatement>(`/billing/companies/${companyId}/ledger/${qs ? `?${qs}` : ''}`);
  },

  /**
   * Collect payment with FIFO invoice allocation and advance tracking
   */
  async collectPayment(companyId: number | string, data: {
    amount: number | string;
    method?: string;
    reference_number?: string;
    notes?: string;
  }): Promise<PaymentCollectionResult> {
    return apiClient.post<PaymentCollectionResult>(`/billing/companies/${companyId}/collect-payment/`, data);
  },

  /**
   * Add authorized ledger adjustment (Owner only)
   */
  async addAdjustment(companyId: number | string, data: {
    adjustment_type: 'CREDIT' | 'DEBIT';
    amount: number | string;
    reason: string;
  }): Promise<any> {
    return apiClient.post(`/billing/companies/${companyId}/adjustments/`, data);
  },

  /**
   * List contracted rates and volume slabs for company
   */
  async getContractedPrices(companyId: number | string): Promise<CompanyProductPrice[]> {
    return apiClient.get<CompanyProductPrice[]>(`/billing/companies/${companyId}/prices/`);
  },

  /**
   * Add new contracted rate slab for company (Owner only)
   */
  async addContractedPrice(companyId: number | string, data: {
    product: number;
    custom_price: number | string;
    min_quantity: number;
    valid_from?: string;
    valid_to?: string | null;
  }): Promise<CompanyProductPrice> {
    return apiClient.post<CompanyProductPrice>(`/billing/companies/${companyId}/prices/`, data);
  },
};

export default companyService;

