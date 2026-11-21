import { Platform, NativeModules, Share } from 'react-native';
import RNFS from 'react-native-fs';
import { API_BASE_URL } from '../constants/api.config';
import apiClient from './api';

const { NativePdfModule } = NativeModules;

export type ReportType =
  | 'overview'
  | 'sales'
  | 'collections'
  | 'outstanding'
  | 'products'
  | 'customers'
  | 'deliveries'
  | 'discounts'
  | 'profit-loss';

export type DateFilterType =
  | 'today'
  | 'yesterday'
  | 'this_week'
  | 'this_month'
  | 'last_month'
  | 'this_year'
  | 'custom';

export interface DateFilterParams {
  filter_type: DateFilterType;
  from_date?: string;
  to_date?: string;
}

export interface DateFilterMetadata {
  filter_type: string;
  from_date: string;
  to_date: string;
  label: string;
}

// ----------------- Report Data Interfaces ----------------- //

export interface OverviewReportData {
  date_filter: DateFilterMetadata;
  net_sales: string;
  invoices_count: number;
  total_collections: string;
  total_outstanding: string;
  overdue_outstanding: string;
  defaulters_count: number;
  gross_profit: string;
  operating_expenses: string;
  net_profit: string;
  profit_margin_pct: number;
  cost_coverage_status: 'complete' | 'partial' | 'unavailable';
}

export interface SalesReportData {
  date_filter: DateFilterMetadata;
  summary: {
    gross_subtotal: string;
    total_discounts: string;
    net_sales: string;
    invoice_count: number;
    quick_billing: { sales: string; count: number };
    single_order: { sales: string; count: number };
    consolidated: { sales: string; count: number };
  };
  trend: Array<{ date: string; sales: string; invoice_count: number }>;
  invoices: Array<{
    id: number;
    invoice_number: string;
    customer_name: string;
    customer_phone: string;
    subtotal: string;
    discount_amount: string;
    grand_total: string;
    status: string;
    due_date: string | null;
    created_at: string;
    source: string;
  }>;
}

export interface CollectionsReportData {
  date_filter: DateFilterMetadata;
  summary: {
    total_collections: string;
    payment_count: number;
    methods: Record<string, { total: string; count: number }>;
  };
  trend: Array<{ date: string; amount: string; count: number }>;
  payments: Array<{
    id: number;
    customer_name: string;
    amount: string;
    method: string;
    reference_number: string;
    received_at: string;
    is_advance: boolean;
    unallocated_advance: string;
  }>;
}

export interface OutstandingReportData {
  date_filter: DateFilterMetadata;
  summary: {
    total_outstanding: string;
    overdue_outstanding: string;
    overdue_invoices_count: number;
    total_advance_credits: string;
    ageing_buckets: {
      '0_15_days': string;
      '16_30_days': string;
      '31_60_days': string;
      '60_plus_days': string;
    };
  };
  customer_dues: Array<{
    customer_id: number | null;
    customer_name: string;
    customer_phone: string;
    total_pending: string;
    overdue_pending: string;
    invoices_count: number;
    oldest_invoice_date: string;
  }>;
  invoices: Array<{
    id: number;
    invoice_number: string;
    customer_name: string;
    customer_phone: string;
    grand_total: string;
    total_paid: string;
    pending_amount: string;
    status: string;
    due_date: string | null;
    is_overdue: boolean;
    days_overdue: number;
    created_at: string;
  }>;
}

export interface ProductsReportData {
  date_filter: DateFilterMetadata;
  summary: {
    total_qty_sold: number;
    total_sales_value: string;
    distinct_products_sold: number;
  };
  products: Array<{
    product_id: number | null;
    product_name: string;
    units_sold: number;
    sales_value: string;
    cost_value: string | null;
    gross_margin: string | null;
    margin_pct: number | null;
    cost_available: boolean;
  }>;
}

export interface CustomersReportData {
  date_filter: DateFilterMetadata;
  summary: {
    active_customers_count: number;
    top_customer: string | null;
  };
  customers: Array<{
    customer_id: number;
    customer_name: string;
    customer_phone: string;
    address: string;
    period_sales: string;
    period_collections: string;
    current_outstanding: string;
    period_invoices_count: number;
    last_purchase_date: string | null;
  }>;
}

export interface DeliveriesReportData {
  date_filter: DateFilterMetadata;
  summary: {
    total_deliveries: number;
    delivered: number;
    failed: number;
    in_progress: number;
    completion_rate_pct: number;
    discrepancies_count: number;
  };
  partners: Array<{
    partner_name: string;
    total_assigned: number;
    delivered: number;
    failed: number;
  }>;
  discrepancies: Array<{
    delivery_id: number;
    order_id: number;
    partner_name: string;
    product_name: string;
    ordered_qty: number;
    delivered_qty: number;
    notes: string;
  }>;
}

export interface DiscountsReportData {
  date_filter: DateFilterMetadata;
  summary: {
    total_discount_amount: string;
    discounted_invoices_count: number;
    average_discount_pct: number;
  };
  invoices: Array<{
    id: number;
    invoice_number: string;
    customer_name: string;
    subtotal: string;
    discount_amount: string;
    grand_total: string;
    discount_pct: number;
    created_at: string;
  }>;
}

export interface ProfitLossReportData {
  date_filter: DateFilterMetadata;
  summary: {
    net_sales: string;
    cogs: string;
    cost_coverage_status: 'complete' | 'partial' | 'unavailable';
    items_with_cost_count: number;
    total_items_count: number;
    gross_profit: string;
    operating_expenses: string;
    net_profit: string;
    profit_margin_pct: number;
  };
  expense_categories: Array<{
    category: string;
    category_display: string;
    total: string;
    count: number;
  }>;
}

// ----------------- Service Implementation ----------------- //

const buildQueryString = (params: DateFilterParams): string => {
  const parts: string[] = [`filter_type=${params.filter_type}`];
  if (params.filter_type === 'custom') {
    if (params.from_date) parts.push(`from_date=${params.from_date}`);
    if (params.to_date) parts.push(`to_date=${params.to_date}`);
  }
  return parts.join('&');
};

export const reportsService = {
  getOverview(params: DateFilterParams): Promise<OverviewReportData> {
    return apiClient.get<OverviewReportData>(`/reports/overview/?${buildQueryString(params)}`);
  },

  getSales(params: DateFilterParams): Promise<SalesReportData> {
    return apiClient.get<SalesReportData>(`/reports/sales/?${buildQueryString(params)}`);
  },

  getCollections(params: DateFilterParams): Promise<CollectionsReportData> {
    return apiClient.get<CollectionsReportData>(`/reports/collections/?${buildQueryString(params)}`);
  },

  getOutstanding(params: DateFilterParams): Promise<OutstandingReportData> {
    return apiClient.get<OutstandingReportData>(`/reports/outstanding/?${buildQueryString(params)}`);
  },

  getProducts(params: DateFilterParams): Promise<ProductsReportData> {
    return apiClient.get<ProductsReportData>(`/reports/products/?${buildQueryString(params)}`);
  },

  getCustomers(params: DateFilterParams): Promise<CustomersReportData> {
    return apiClient.get<CustomersReportData>(`/reports/customers/?${buildQueryString(params)}`);
  },

  getDeliveries(params: DateFilterParams): Promise<DeliveriesReportData> {
    return apiClient.get<DeliveriesReportData>(`/reports/deliveries/?${buildQueryString(params)}`);
  },

  getDiscounts(params: DateFilterParams): Promise<DiscountsReportData> {
    return apiClient.get<DiscountsReportData>(`/reports/discounts/?${buildQueryString(params)}`);
  },

  getProfitLoss(params: DateFilterParams): Promise<ProfitLossReportData> {
    return apiClient.get<ProfitLossReportData>(`/reports/profit-loss/?${buildQueryString(params)}`);
  },

  /**
   * Downloads and saves either PDF or Excel report file to device storage.
   */
  async exportReport(
    format: 'pdf' | 'excel',
    reportType: ReportType,
    params: DateFilterParams
  ): Promise<{ filePath: string; filename: string; size: number }> {
    const token = await apiClient.getAccessToken();
    const qs = buildQueryString(params);
    const endpoint = format === 'pdf' ? '/reports/export/pdf/' : '/reports/export/excel/';
    const downloadUrl = `${API_BASE_URL}${endpoint}?report_type=${reportType}&${qs}`;

    const ext = format === 'pdf' ? 'pdf' : 'xlsx';
    const cleanType = reportType.replace(/[^a-zA-Z0-9_-]/g, '_');
    const timestamp = new Date().toISOString().slice(0, 10);
    const filename = `ChaiFlow_${cleanType}_${timestamp}.${ext}`;
    const filePath = `${RNFS.DocumentDirectoryPath}/${filename}`;

    const headers: Record<string, string> = {
      Accept: format === 'pdf' ? 'application/pdf' : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    };
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const downloadResult = await RNFS.downloadFile({
      fromUrl: downloadUrl,
      toFile: filePath,
      headers,
    }).promise;

    if (downloadResult.statusCode !== 200) {
      if (await RNFS.exists(filePath)) {
        await RNFS.unlink(filePath).catch(() => {});
      }
      throw new Error(`Export download failed with status ${downloadResult.statusCode}`);
    }

    const exists = await RNFS.exists(filePath);
    if (!exists) {
      throw new Error('Downloaded report file was not found.');
    }

    const stat = await RNFS.stat(filePath);
    if (stat.size <= 0) {
      await RNFS.unlink(filePath).catch(() => {});
      throw new Error('Downloaded report file is empty (0 bytes).');
    }

    return { filePath, filename, size: stat.size };
  },

  /**
   * Opens Android native share sheet allowing Excel and all installed file viewers
   * to open, view, or share the exported .xlsx spreadsheet file with actual binary attachment.
   */
  async shareExcelFile(filePath: string, filename: string): Promise<boolean> {
    const mimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    if (Platform.OS === 'android' && NativePdfModule?.shareFile) {
      return await NativePdfModule.shareFile(filePath, `Share ${filename}`, mimeType);
    }

    // Fallback using React Native Share API with file URI (no text message that overrides file attachment)
    const fileUri = Platform.OS === 'android' ? `file://${filePath}` : filePath;
    await Share.share({
      title: filename,
      url: fileUri,
    });
    return true;
  },

  /**
   * Copies an exported file (PDF or Excel) into public Android Downloads using MediaStore.
   */
  async saveToPublicDownloads(filePath: string, filename: string): Promise<string> {
    if (Platform.OS === 'android' && NativePdfModule?.saveToPublicDownloads) {
      return await NativePdfModule.saveToPublicDownloads(filePath, filename);
    }
    return filePath;
  },

  /**
   * Directly opens the spreadsheet file with an installed spreadsheet app (e.g. Google Sheets, Microsoft Excel)
   * or falls back to the native chooser.
   */
  async openExcelFile(filePath: string, filename: string): Promise<boolean> {
    const mimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    if (Platform.OS === 'android' && NativePdfModule?.openFile) {
      return await NativePdfModule.openFile(filePath, `Spreadsheet: ${filename}`, mimeType);
    }
    return this.shareExcelFile(filePath, filename);
  },
};

export default reportsService;
