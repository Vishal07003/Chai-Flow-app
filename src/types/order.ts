export interface InvoiceLineItem {
  id: string;
  name: string;
  qty: number;
  price: number;
}

export interface InvoiceItem {
  id: string;
  invoiceNo?: string;
  name: string;
  customerAddress?: string;
  customerPhone?: string;
  amount: string;
  numericAmount?: number;
  due: string;
  date?: string;
  isOverdue?: boolean;
  status?: 'PENDING' | 'OVERDUE' | 'PAID';
  items?: InvoiceLineItem[];
  subtotal?: number;
  tax?: number;
  notes?: string;
}

export interface ActivityItem {
  id: string;
  color: string;
  title: string;
  subtitle: string;
  time: string;
}

export interface PaymentRecord {
  id: string;
  customerName: string;
  amount: number;
  method: 'UPI / GPay' | 'Cash' | 'Bank Transfer' | 'PhonePe';
  date: string;
  time: string;
  status: 'SUCCESS' | 'SETTLED';
  refNo: string;
}
