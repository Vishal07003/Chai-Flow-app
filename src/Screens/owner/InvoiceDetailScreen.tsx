import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Linking,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { Header, CustomDialog } from '../../components/common';
import { useApp, InvoiceItem } from '../../context/AppContext';
import { pdfService } from '../../services/pdf.service';
import billingService, {
  BackendInvoice,
  InvoiceAuditLogEntry,
  MonthlyInvoiceBreakdown,
} from '../../services/billing.service';
import { BillReviewModal } from '../../components/billing/BillReviewModal';
import { colors, typography, radius, spacing, shadows } from '../../theme';
import AppToast from '../../utils/toast';

export default function InvoiceDetailScreen({ route, navigation }: any) {
  const { invoice } = route.params || {};
  const { userRole, markInvoiceAsPaid, customers } = useApp();

  const mapBackendInvoiceToItem = (raw: any): InvoiceItem => {
    if (!raw) return raw;
    if (raw.invoice_number) {
      const grandTotalNum = parseFloat(raw.grand_total) || 0;
      const subtotalNum = parseFloat(raw.subtotal) || grandTotalNum;
      const discountNum = parseFloat(raw.discount_amount || '0') || 0;
      const paidNum = parseFloat(raw.total_paid || '0') || 0;
      const pendingNum = parseFloat(raw.pending_amount || '0') || 0;
      const isPaidStatus = raw.status === 'paid' || pendingNum <= 0;

      return {
        id: String(raw.id),
        invoiceNo: raw.invoice_number,
        name: raw.customer_name || 'Walk-in Customer',
        customerPhone: raw.customer_phone || '',
        customerAddress: '',
        amount: `₹${grandTotalNum.toLocaleString()}`,
        numericAmount: grandTotalNum,
        subtotal: subtotalNum,
        discountAmount: discountNum,
        paidAmount: paidNum,
        pendingAmount: pendingNum,
        due: isPaidStatus ? 'Paid' : `Pending ₹${pendingNum.toLocaleString()}`,
        date: raw.created_at ? new Date(raw.created_at).toLocaleDateString() : 'Today',
        status: isPaidStatus ? 'PAID' : (paidNum > 0 || raw.status === 'partially_paid') ? 'PARTIALLY_PAID' : 'PENDING',
        isOverdue: false,
        deliveryStatus: isPaidStatus ? 'Delivered' : 'Pending',
        items: (raw.items || []).map((it: any) => ({
          id: String(it.id),
          product_id: it.product || it.product_id || null,
          name: it.product_name,
          qty: it.quantity,
          price: parseFloat(it.unit_price) || 0,
        })),
        notes: raw.notes || '',
      };
    }
    return raw;
  };

  const [currentOrder, setCurrentOrder] = useState<InvoiceItem>(
    mapBackendInvoiceToItem(invoice) || {
      id: 'inv-1',
      invoiceNo: 'ORD-2026-001',
      name: 'Customer',
      customerAddress: '',
      customerPhone: '',
      amount: '₹0',
      numericAmount: 0,
      due: 'Pending',
      date: 'Today',
      isOverdue: false,
      status: 'PENDING',
      deliveryStatus: 'Pending',
      items: [],
      subtotal: 0,
      tax: 0,
      notes: '',
    },
  );

  const [rawInvoiceData, setRawInvoiceData] = useState<BackendInvoice | null>(
    invoice && invoice.invoice_number ? invoice : null
  );
  const [monthlyBreakdown, setMonthlyBreakdown] = useState<MonthlyInvoiceBreakdown | null>(null);
  const [isEditBillVisible, setIsEditBillVisible] = useState<boolean>(false);
  const [isPdfLoading, setIsPdfLoading] = useState<boolean>(false);
  const [isExcelLoading, setIsExcelLoading] = useState<boolean>(false);
  const [pdfActionType, setPdfActionType] = useState<string>('');

  const rawInvoiceId = invoice?.id || invoice?.invoice_number || route.params?.invoiceId;

  // Custom Dialog State
  const [dialogConfig, setDialogConfig] = useState<{
    visible: boolean;
    title: string;
    message?: string;
    type?: 'confirm' | 'danger' | 'info' | 'warning' | 'success';
    buttons?: Array<{
      text: string;
      style?: 'default' | 'cancel' | 'destructive';
      onPress?: () => void;
    }>;
  }>({
    visible: false,
    title: '',
  });

  const closeDialog = () => setDialogConfig(prev => ({ ...prev, visible: false }));

  // Live fetch to prevent stale invoice status & fetch monthly breakdown if applicable
  const fetchLiveInvoice = useCallback(async () => {
    if (!rawInvoiceId) return;
    try {
      const live: BackendInvoice = await billingService.getInvoiceDetail(rawInvoiceId);
      if (live) {
        setRawInvoiceData(live);
        setCurrentOrder(mapBackendInvoiceToItem(live));

        // If it's a monthly consolidated invoice, fetch detailed breakdown
        if (live.billing_type === 'monthly') {
          billingService
            .getInvoiceBreakdown(live.id)
            .then(bd => setMonthlyBreakdown(bd))
            .catch(err => console.log('Error fetching monthly breakdown:', err));
        }
      }
    } catch (err) {
      console.log('Error fetching live invoice detail:', err);
    }
  }, [rawInvoiceId]);

  useEffect(() => {
    fetchLiveInvoice();
    const unsubscribe = navigation.addListener?.('focus', () => {
      fetchLiveInvoice();
    });
    return unsubscribe;
  }, [navigation, fetchLiveInvoice]);

  const isAdmin = userRole === 'ADMIN';
  const orderIdDisplay = currentOrder.invoiceNo || `INV-${currentOrder.id}`;
  const isPaid = currentOrder.status === 'PAID';
  const isPartiallyPaid = currentOrder.status === 'PARTIALLY_PAID';
  const isMonthly = rawInvoiceData?.billing_type === 'monthly';

  // Save edited bill handler
  const handleSaveEditedBill = async (payload: {
    items: Array<{ product_id: number | null; product_name: string; quantity: number; unit_price: string }>;
    discount_amount: string;
    notes: string;
    due_date: string | null;
    reason?: string;
  }) => {
    const cleanId = String(rawInvoiceData?.id || currentOrder.id).replace(/[^0-9]/g, '');
    await billingService.editBill(cleanId, payload);
    AppToast.success('Bill Updated', 'Invoice modifications saved successfully.');
    fetchLiveInvoice();
  };

  const handleCallCustomer = () => {
    const phone = currentOrder.customerPhone;
    if (phone) {
      Linking.openURL(`tel:${phone}`).catch(() => {
        AppToast.error('Error', 'Unable to initiate phone call.');
      });
    }
  };

  // PDF Handlers: Download, Share, Print
  const handleDownloadPdf = async () => {
    if (isPdfLoading) return;
    try {
      setIsPdfLoading(true);
      setPdfActionType('Downloading PDF...');
      const cleanId = String(currentOrder.id).replace(/[^0-9]/g, '') || currentOrder.id;
      const res = await pdfService.downloadInvoicePdf(cleanId, currentOrder.invoiceNo);
      setDialogConfig({
        visible: true,
        title: 'PDF Downloaded ✅',
        message: `Invoice saved successfully to Downloads:\n${res.filename}`,
        type: 'success',
        buttons: [
          {
            text: 'Open PDF',
            onPress: () => {
              closeDialog();
              pdfService.openInvoicePdf(cleanId, currentOrder.invoiceNo).catch(err => {
                setDialogConfig({
                  visible: true,
                  title: 'Unable to Open',
                  message: err.message || 'No app available to open PDF.',
                  type: 'warning',
                  buttons: [{ text: 'OK', onPress: closeDialog }],
                });
              });
            },
          },
          { text: 'OK', onPress: closeDialog },
        ],
      });
    } catch (err: any) {
      setDialogConfig({
        visible: true,
        title: 'Download Failed',
        message: err.message || 'Unable to download invoice PDF from server.',
        type: 'warning',
        buttons: [{ text: 'OK', onPress: closeDialog }],
      });
    } finally {
      setIsPdfLoading(false);
      setPdfActionType('');
    }
  };

  const handleSharePdf = async () => {
    if (isPdfLoading) return;
    try {
      setIsPdfLoading(true);
      setPdfActionType('Preparing PDF for Sharing...');
      const cleanId = String(currentOrder.id).replace(/[^0-9]/g, '') || currentOrder.id;
      await pdfService.shareInvoicePdf(cleanId, currentOrder.invoiceNo);
    } catch (err: any) {
      setDialogConfig({
        visible: true,
        title: 'Share Failed',
        message: err.message || 'Unable to share invoice PDF.',
        type: 'warning',
        buttons: [{ text: 'OK', onPress: closeDialog }],
      });
    } finally {
      setIsPdfLoading(false);
      setPdfActionType('');
    }
  };

  const handleExportExcel = async () => {
    if (isExcelLoading) return;
    try {
      setIsExcelLoading(true);
      const cleanId = String(currentOrder.id).replace(/[^0-9]/g, '') || currentOrder.id;
      const res = await pdfService.downloadInvoiceExcel(cleanId, currentOrder.invoiceNo);
      setDialogConfig({
        visible: true,
        title: 'Excel Exported ✅',
        message: `Monthly Invoice Excel saved successfully to Downloads:\n${res.filename}`,
        type: 'success',
        buttons: [{ text: 'OK', onPress: closeDialog }],
      });
    } catch (err: any) {
      setDialogConfig({
        visible: true,
        title: 'Export Failed',
        message: err.message || 'Unable to export Excel statement from server.',
        type: 'warning',
        buttons: [{ text: 'OK', onPress: closeDialog }],
      });
    } finally {
      setIsExcelLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      {/* Header */}
      <Header title={orderIdDisplay} showBack={true} showNotification={false} />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* 1. Summary Card */}
        <View style={styles.summaryCard}>
          <View style={styles.summaryTopRow}>
            <Text style={styles.summaryCardSubtitle}>
              {isMonthly ? `MONTHLY INVOICE (${rawInvoiceData?.billing_period || ''})` : 'BILL SUMMARY'}
            </Text>
            {isAdmin && !isMonthly && (
              <TouchableOpacity
                style={styles.editBillHeaderBtn}
                onPress={() => setIsEditBillVisible(true)}
                activeOpacity={0.75}
              >
                <Ionicons name="create-outline" size={14} color="#8C331A" style={{ marginRight: 4 }} />
                <Text style={styles.editBillHeaderBtnText}>Edit Bill</Text>
              </TouchableOpacity>
            )}
          </View>
          <Text style={styles.totalAmountText}>{currentOrder.amount}</Text>

          {/* Payment Status Badges */}
          <View style={styles.badgesContainer}>
            <View
              style={[
                styles.badge,
                isPaid
                  ? styles.badgePaid
                  : isPartiallyPaid
                  ? styles.badgePartiallyPaid
                  : styles.badgeUnpaid,
              ]}
            >
              <Text
                style={[
                  styles.badgeText,
                  isPaid
                    ? styles.badgeTextPaid
                    : isPartiallyPaid
                    ? styles.badgeTextPartiallyPaid
                    : styles.badgeTextUnpaid,
                ]}
              >
                {isPaid ? 'Paid' : isPartiallyPaid ? 'Partially Paid' : 'Unpaid'}
              </Text>
            </View>
          </View>

          {!isPaid && (
            <TouchableOpacity
              activeOpacity={0.8}
              style={styles.markPaidBtn}
              onPress={() => {
                markInvoiceAsPaid(currentOrder.id);
                setCurrentOrder(prev => ({ ...prev, status: 'PAID', isOverdue: false }));
                setDialogConfig({
                  visible: true,
                  title: 'Payment Completed 🎉',
                  message: `Payment of ${currentOrder.amount} marked as completed.`,
                  type: 'success',
                  buttons: [{ text: 'OK', onPress: closeDialog }],
                });
              }}
            >
              <Ionicons name="checkmark-done-circle" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
              <Text style={styles.markPaidBtnText}>Mark Payment Completed</Text>
            </TouchableOpacity>
          )}

          {/* Actions: PDF Download, Share, & Excel (Monthly) */}
          <View style={styles.pdfActionsRow}>
            <TouchableOpacity
              activeOpacity={0.8}
              style={[styles.pdfBtn, isPdfLoading && styles.pdfBtnDisabled]}
              onPress={handleDownloadPdf}
              disabled={isPdfLoading}
            >
              <Ionicons name="download-outline" size={17} color="#7A2E19" />
              <Text style={styles.pdfBtnText}>PDF</Text>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.8}
              style={[styles.pdfBtn, isPdfLoading && styles.pdfBtnDisabled]}
              onPress={handleSharePdf}
              disabled={isPdfLoading}
            >
              <Ionicons name="share-social-outline" size={17} color="#7A2E19" />
              <Text style={styles.pdfBtnText}>Share</Text>
            </TouchableOpacity>

            {isMonthly && (
              <TouchableOpacity
                activeOpacity={0.8}
                style={[styles.pdfBtn, isExcelLoading && styles.pdfBtnDisabled]}
                onPress={handleExportExcel}
                disabled={isExcelLoading}
              >
                <Ionicons name="document-text-outline" size={17} color="#059669" />
                <Text style={[styles.pdfBtnText, { color: '#059669' }]}>Excel</Text>
              </TouchableOpacity>
            )}
          </View>

          {isPdfLoading && (
            <Text style={styles.pdfLoadingText}>⏳ {pdfActionType}</Text>
          )}
          {isExcelLoading && (
            <Text style={styles.pdfLoadingText}>⏳ Generating Excel statement...</Text>
          )}
        </View>

        {/* 2. Customer Card */}
        <TouchableOpacity
          activeOpacity={0.88}
          style={styles.sectionCard}
          onPress={() => {
            const cust = customers.find(
              (c: any) => c.name.toLowerCase() === currentOrder.name.toLowerCase(),
            ) || {
              id: `c_${currentOrder.id}`,
              name: currentOrder.name,
              address: currentOrder.customerAddress || 'Local Market Area',
              amount: currentOrder.numericAmount || 0,
              deliveryStatus: 'Active Customer',
              hasDot: true,
              isOverdue: currentOrder.isOverdue || false,
            };
            navigation.navigate('CustomerDetail', { customer: cust });
          }}
        >
          <View style={styles.customerHeaderRow}>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Text style={styles.sectionTitleLabel}>CUSTOMER DETAILS</Text>
                <Ionicons name="chevron-forward" size={14} color="#A52A0A" style={{ marginLeft: 4 }} />
              </View>
              <Text style={styles.customerName}>{currentOrder.name}</Text>
              {Boolean(currentOrder.customerPhone) && (
                <Text style={styles.customerAddress}>📞 {currentOrder.customerPhone}</Text>
              )}
            </View>

            {Boolean(currentOrder.customerPhone) && (
              <TouchableOpacity
                activeOpacity={0.8}
                style={styles.callBtn}
                onPress={handleCallCustomer}
              >
                <Ionicons name="call" size={16} color="#FFFFFF" />
                <Text style={styles.callBtnText}>Call</Text>
              </TouchableOpacity>
            )}
          </View>
        </TouchableOpacity>

        {/* 3. Date-wise Monthly Breakdown (If Monthly Invoice) */}
        {isMonthly && monthlyBreakdown?.dates && monthlyBreakdown.dates.length > 0 ? (
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitleLabel}>DELIVERY BREAKDOWN BY DATE</Text>
            {monthlyBreakdown.dates.map((dateBlock, dIdx) => (
              <View key={dateBlock.date || dIdx} style={styles.dateBlockCard}>
                <View style={styles.dateBlockHeader}>
                  <Ionicons name="calendar-outline" size={14} color="#8C331A" style={{ marginRight: 6 }} />
                  <Text style={styles.dateBlockTitle}>{dateBlock.date_str}</Text>
                </View>

                {dateBlock.orders.map((ord, oIdx) => (
                  <View key={ord.order_id || oIdx} style={styles.orderBreakdownRow}>
                    <View style={styles.orderBadgeRow}>
                      <Text style={styles.orderNumberTag}>Order {ord.order_number}</Text>
                      {Boolean(ord.time_str) && <Text style={styles.orderTimeTag}>{ord.time_str}</Text>}
                    </View>

                    {ord.items.map((it, itIdx) => (
                      <View key={itIdx} style={styles.breakdownItemRow}>
                        <Text style={styles.breakdownItemName} numberOfLines={1}>
                          {it.product_name}
                        </Text>
                        <Text style={styles.breakdownItemQty}>
                          {it.quantity} × ₹{Number(it.unit_price).toFixed(0)}
                        </Text>
                        <Text style={styles.breakdownItemAmount}>
                          ₹{Number(it.line_amount).toFixed(0)}
                        </Text>
                      </View>
                    ))}
                  </View>
                ))}

                {/* Daily Subtotal */}
                <View style={styles.dailySubtotalRow}>
                  <Text style={styles.dailySubtotalLabel}>Daily Subtotal ({dateBlock.daily_total_quantity} units):</Text>
                  <Text style={styles.dailySubtotalValue}>₹{Number(dateBlock.daily_subtotal).toFixed(0)}</Text>
                </View>
              </View>
            ))}
          </View>
        ) : (
          /* Standard Product Items (Single Order Invoice) */
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitleLabel}>INVOICE ITEMS</Text>
            {currentOrder.items && currentOrder.items.length > 0 ? (
              currentOrder.items.map((item, idx) => (
                <View key={item.id || idx.toString()} style={styles.itemRow}>
                  <View style={styles.itemLeft}>
                    <Text style={styles.itemName}>{item.name}</Text>
                    <Text style={styles.itemQtyPrice}>
                      Qty: {item.qty} × ₹{item.price}
                    </Text>
                  </View>
                  <Text style={styles.itemTotal}>₹{(item.qty * item.price).toLocaleString()}</Text>
                </View>
              ))
            ) : (
              <View style={styles.itemRow}>
                <Text style={styles.itemName}>Consolidated Order Items</Text>
                <Text style={styles.itemTotal}>{currentOrder.amount}</Text>
              </View>
            )}
          </View>
        )}

        {/* 4. Financial Calculations Summary */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitleLabel}>PAYMENT & TOTALS</Text>

          <View style={styles.calcRow}>
            <Text style={styles.calcLabel}>Subtotal</Text>
            <Text style={styles.calcVal}>₹{(currentOrder.subtotal || currentOrder.numericAmount || 0).toLocaleString()}</Text>
          </View>

          {Boolean(currentOrder.discountAmount && currentOrder.discountAmount > 0) && (
            <View style={styles.calcRow}>
              <Text style={[styles.calcLabel, { color: '#059669', fontWeight: '700' }]}>Discount</Text>
              <Text style={[styles.calcVal, { color: '#059669', fontWeight: '800' }]}>
                - ₹{Number(currentOrder.discountAmount).toLocaleString()}
              </Text>
            </View>
          )}

          <View style={[styles.calcRow, { borderTopWidth: 1, borderTopColor: '#F3F4F6', paddingTop: 6, marginTop: 4 }]}>
            <Text style={[styles.calcLabel, { fontWeight: '800', color: '#111827' }]}>Final Bill Amount</Text>
            <Text style={[styles.calcVal, { fontWeight: '900', color: '#8C331A' }]}>
              {currentOrder.amount || `₹${(currentOrder.numericAmount || 0).toLocaleString()}`}
            </Text>
          </View>

          {currentOrder.paidAmount !== undefined && (
            <View style={styles.calcRow}>
              <Text style={styles.calcLabel}>Amount Received</Text>
              <Text style={[styles.calcVal, { color: '#059669', fontWeight: '700' }]}>
                ₹{Number(currentOrder.paidAmount).toLocaleString()}
              </Text>
            </View>
          )}

          {currentOrder.pendingAmount !== undefined && Number(currentOrder.pendingAmount) > 0 && (
            <View style={styles.calcRow}>
              <Text style={[styles.calcLabel, { color: '#DC2626', fontWeight: '700' }]}>Remaining Balance</Text>
              <Text style={[styles.calcVal, { color: '#DC2626', fontWeight: '800' }]}>
                ₹{Number(currentOrder.pendingAmount).toLocaleString()}
              </Text>
            </View>
          )}
        </View>

        {/* 5. Invoice Edit Audit History (If edited) */}
        {rawInvoiceData?.audit_logs && rawInvoiceData.audit_logs.length > 0 && (
          <View style={styles.sectionCard}>
            <View style={styles.auditHeaderRow}>
              <Ionicons name="time" size={16} color="#8C331A" style={{ marginRight: 6 }} />
              <Text style={styles.sectionTitleLabel}>BILL AUDIT HISTORY</Text>
            </View>
            <Text style={styles.auditSubtitle}>
              Immutable record of all modifications to this bill.
            </Text>

            {rawInvoiceData.audit_logs.map((log: InvoiceAuditLogEntry, idx: number) => (
              <View key={log.id || idx} style={styles.auditLogRow}>
                <View style={styles.auditLogDot} />
                <View style={styles.auditLogContent}>
                  <View style={styles.auditLogTop}>
                    <Text style={styles.auditLogUser}>{log.edited_by_name || 'Owner'}</Text>
                    <Text style={styles.auditLogTime}>
                      {log.created_at ? new Date(log.created_at).toLocaleString() : 'Recently'}
                    </Text>
                  </View>

                  <View style={styles.auditTotalChangeRow}>
                    <Text style={styles.auditPrevTotal}>₹{log.previous_total}</Text>
                    <Ionicons name="arrow-forward" size={12} color="#8C331A" style={{ marginHorizontal: 6 }} />
                    <Text style={styles.auditNextTotal}>₹{log.updated_total}</Text>
                  </View>

                  {Boolean(log.reason) && (
                    <Text style={styles.auditReasonText}>
                      Reason: <Text style={{ fontStyle: 'italic', color: '#374151' }}>"{log.reason}"</Text>
                    </Text>
                  )}
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Bill Review / Edit Modal */}
      <BillReviewModal
        visible={isEditBillVisible}
        onClose={() => setIsEditBillVisible(false)}
        mode="edit_invoice"
        invoiceId={rawInvoiceData?.id || (currentOrder?.id ? Number(currentOrder.id.replace(/[^0-9]/g, '')) : undefined)}
        invoiceNumber={rawInvoiceData?.invoice_number || currentOrder.invoiceNo}
        customerName={currentOrder.name}
        customerPhone={currentOrder.customerPhone}
        deliveryDate={currentOrder.date}
        initialItems={(currentOrder.items || []).map((it: any) => ({
          id: it.id ? Number(it.id) : undefined,
          product_id: it.product_id || null,
          product_name: it.name,
          quantity: it.qty,
          unit_price: String(it.price || '0'),
        }))}
        initialDiscount={String(currentOrder.discountAmount || 0)}
        initialNotes={currentOrder.notes || ''}
        initialDueDate={rawInvoiceData?.due_date || null}
        onSaveSuccess={() => {
          setIsEditBillVisible(false);
          fetchLiveInvoice();
        }}
        saveAction={handleSaveEditedBill}
      />

      {/* Custom Dialog Popup */}
      <CustomDialog
        visible={dialogConfig.visible}
        title={dialogConfig.title}
        message={dialogConfig.message}
        type={dialogConfig.type}
        buttons={dialogConfig.buttons}
        onClose={closeDialog}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAF8F5',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  summaryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 20,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#EFECE9',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    alignItems: 'center',
  },
  summaryTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    marginBottom: 8,
  },
  summaryCardSubtitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#8A7A70',
    letterSpacing: 0.5,
  },
  editBillHeaderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: '#FAF5F0',
    borderWidth: 1,
    borderColor: '#E8D7CE',
  },
  editBillHeaderBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#8C331A',
  },
  totalAmountText: {
    fontSize: 34,
    fontWeight: '900',
    color: '#8C331A',
    marginBottom: 10,
  },
  badgesContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  badge: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 12,
  },
  badgePaid: {
    backgroundColor: '#E8F5E9',
  },
  badgePartiallyPaid: {
    backgroundColor: '#FFFBEB',
  },
  badgeUnpaid: {
    backgroundColor: '#FFEBEE',
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '800',
  },
  badgeTextPaid: {
    color: '#2E7D32',
  },
  badgeTextPartiallyPaid: {
    color: '#B45309',
  },
  badgeTextUnpaid: {
    color: '#C62828',
  },
  markPaidBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#059669',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 12,
    width: '100%',
    marginBottom: 12,
  },
  markPaidBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  pdfActionsRow: {
    flexDirection: 'row',
    gap: 10,
    width: '100%',
    marginTop: 4,
  },
  pdfBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: '#FAF5F0',
    borderWidth: 1,
    borderColor: '#E8D7CE',
    gap: 4,
  },
  pdfBtnDisabled: {
    opacity: 0.6,
  },
  pdfBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#7A2E19',
  },
  pdfLoadingText: {
    fontSize: 11,
    color: '#7A2E19',
    fontWeight: '600',
    marginTop: 8,
  },
  sectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#EFECE9',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
  },
  customerHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitleLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#8A7A70',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  customerName: {
    fontSize: 16,
    fontWeight: '800',
    color: '#2A201A',
  },
  customerAddress: {
    fontSize: 12,
    color: '#8A7A70',
    marginTop: 2,
  },
  callBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#8C331A',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    gap: 4,
  },
  callBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  dateBlockCard: {
    backgroundColor: '#FAF5F0',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E8D7CE',
  },
  dateBlockHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#E8D7CE',
    paddingBottom: 6,
    marginBottom: 8,
  },
  dateBlockTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#8C331A',
  },
  orderBreakdownRow: {
    marginBottom: 8,
  },
  orderBadgeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  orderNumberTag: {
    fontSize: 11,
    fontWeight: '800',
    color: '#4B5563',
  },
  orderTimeTag: {
    fontSize: 10,
    color: '#9CA3AF',
    fontWeight: '600',
  },
  breakdownItemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 2,
  },
  breakdownItemName: {
    flex: 2,
    fontSize: 12,
    fontWeight: '600',
    color: '#1F2937',
  },
  breakdownItemQty: {
    flex: 1.2,
    fontSize: 11,
    color: '#6B7280',
    textAlign: 'center',
  },
  breakdownItemAmount: {
    flex: 1,
    fontSize: 12,
    fontWeight: '700',
    color: '#1F2937',
    textAlign: 'right',
  },
  dailySubtotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#E8D7CE',
    paddingTop: 6,
    marginTop: 4,
  },
  dailySubtotalLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#8C331A',
  },
  dailySubtotalValue: {
    fontSize: 13,
    fontWeight: '800',
    color: '#8C331A',
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  itemLeft: {
    flex: 1,
  },
  itemName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#2A201A',
  },
  itemQtyPrice: {
    fontSize: 11,
    color: '#8A7A70',
    marginTop: 2,
  },
  itemTotal: {
    fontSize: 13,
    fontWeight: '800',
    color: '#2A201A',
  },
  calcRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  calcLabel: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '600',
  },
  calcVal: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1F2937',
  },
  auditHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  auditSubtitle: {
    fontSize: 11,
    color: '#6B7280',
    marginBottom: 10,
  },
  auditLogRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  auditLogDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#8C331A',
    marginTop: 5,
    marginRight: 8,
  },
  auditLogContent: {
    flex: 1,
    backgroundColor: '#FAF5F0',
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E8D7CE',
  },
  auditLogTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 3,
  },
  auditLogUser: {
    fontSize: 11,
    fontWeight: '700',
    color: '#8C331A',
  },
  auditLogTime: {
    fontSize: 10,
    color: '#9CA3AF',
  },
  auditTotalChangeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 2,
  },
  auditPrevTotal: {
    fontSize: 12,
    fontWeight: '700',
    color: '#6B7280',
    textDecorationLine: 'line-through',
  },
  auditNextTotal: {
    fontSize: 12,
    fontWeight: '800',
    color: '#059669',
  },
  auditReasonText: {
    fontSize: 11,
    color: '#4B5563',
    marginTop: 2,
  },
});
