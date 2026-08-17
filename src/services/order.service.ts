import apiClient from './api';
import { InvoiceItem } from '../types/order';

export const orderService = {
  async getInvoices(initialData?: InvoiceItem[]): Promise<InvoiceItem[]> {
    return apiClient.get<InvoiceItem[]>('/orders/invoices', initialData || []);
  },

  async createInvoice(
    name: string,
    amount: number,
    dueDays: string,
    fullItem?: Partial<InvoiceItem>,
  ): Promise<InvoiceItem> {
    const invId = fullItem?.id || `inv-${Date.now()}`;
    const invNo =
      fullItem?.invoiceNo ||
      `INV-2026-${Math.floor(100 + Math.random() * 900)}`;

    const newInv: InvoiceItem = {
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

    return apiClient.post<InvoiceItem>('/orders/invoices', newInv, newInv);
  },

  async createQuickBill(billData: Partial<InvoiceItem>): Promise<InvoiceItem> {
    const invId = `inv-${Date.now()}`;
    const invNo = `QBILL-2026-${Math.floor(1000 + Math.random() * 9000)}`;

    const newInv: InvoiceItem = {
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

    return apiClient.post<InvoiceItem>('/orders/quick-bill', newInv, newInv);
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
