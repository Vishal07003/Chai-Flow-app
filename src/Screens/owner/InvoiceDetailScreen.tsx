import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
import { CollectPaymentModal, ReversePaymentModal, type CollectPaymentFormData } from '../../components/payment';
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
  const { userRole, customers, collectInvoicePayment, refreshBackendData } = useApp();

  const mapBackendInvoiceToItem = (raw: any): InvoiceItem => {
    if (!raw) return raw;
    if (raw.invoice_number) {
      const grandTotalNum = parseFloat(raw.grand_total) || 0;
      const subtotalNum = parseFloat(raw.subtotal) || grandTotalNum;
      const discountNum = parseFloat(raw.discount_amount || '0') || 0;
      const paidNum = parseFloat(raw.total_paid || '0') || 0;
      const pendingNum = parseFloat(raw.pending_amount || '0') || 0;
      const isPaidStatus = raw.status === 'paid' || pendingNum <= 0;
      const isPartiallyPaidStatus = !isPaidStatus && (paidNum > 0 || raw.status === 'partially_paid');

      return {
        id: String(raw.id),
        invoiceNo: raw.invoice_number,
        name: raw.customer_name || 'Walk-in Customer',
        customerPhone: raw.customer_phone || '',
        customerAddress: raw.customer_address || raw.address || '',
        amount: `₹${grandTotalNum.toLocaleString('en-IN')}`,
        numericAmount: grandTotalNum,
        subtotal: subtotalNum,
        discountAmount: discountNum,
        paidAmount: paidNum,
        pendingAmount: pendingNum,
        due: isPaidStatus ? 'Paid' : `Pending ₹${pendingNum.toLocaleString('en-IN')}`,
        date: raw.created_at ? new Date(raw.created_at).toLocaleDateString() : 'Today',
        createdAt: raw.finalized_at || raw.created_at || undefined,
        status: isPaidStatus ? 'PAID' : isPartiallyPaidStatus ? 'PARTIALLY_PAID' : 'PENDING',
        isOverdue: Boolean(raw.is_overdue),
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
  const [isCollectPaymentVisible, setIsCollectPaymentVisible] = useState<boolean>(false);
  const [reverseModalVisible, setReverseModalVisible] = useState<boolean>(false);
  const [selectedPaymentForReverse, setSelectedPaymentForReverse] = useState<{
    id: number;
    amount: string | number;
    received_at?: string;
    allocations?: any[];
  } | null>(null);
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
      const cleanId = String(rawInvoiceId).replace(/[^0-9]/g, '');
      const live: BackendInvoice = await billingService.getInvoiceDetail(cleanId || rawInvoiceId);
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

  // Derived Financials directly from authoritative backend data
  const billTotalNum = rawInvoiceData
    ? parseFloat(rawInvoiceData.grand_total) || 0
    : currentOrder.numericAmount || 0;
  const receivedNum = rawInvoiceData
    ? parseFloat(rawInvoiceData.total_paid) || 0
    : currentOrder.paidAmount || 0;
  const remainingNum = rawInvoiceData
    ? parseFloat(rawInvoiceData.pending_amount) || 0
    : currentOrder.pendingAmount !== undefined
    ? currentOrder.pendingAmount
    : Math.max(0, billTotalNum - receivedNum);

  const subtotalNum = rawInvoiceData
    ? parseFloat(rawInvoiceData.subtotal) || billTotalNum
    : currentOrder.subtotal || billTotalNum;
  const discountNum = rawInvoiceData
    ? parseFloat(rawInvoiceData.discount_amount || '0') || 0
    : currentOrder.discountAmount || 0;

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
    refreshBackendData();
  };

  const handleCallCustomer = () => {
    const phone = currentOrder.customerPhone;
    if (phone) {
      Linking.openURL(`tel:${phone}`).catch(() => {
        AppToast.error('Error', 'Unable to initiate phone call.');
      });
    }
  };

  // Record Payment Confirmation via Reusable CollectPaymentModal
  const handleConfirmRecordPayment = async (data: CollectPaymentFormData) => {
    const cleanId = String(rawInvoiceData?.id || currentOrder.id).replace(/[^0-9]/g, '');
    try {
      await collectInvoicePayment(cleanId, data.amount, 'Cash');
      setIsCollectPaymentVisible(false);
      AppToast.success(
        'Payment Recorded',
        `₹${data.amount.toLocaleString('en-IN')} cash payment recorded successfully.`
      );
      await fetchLiveInvoice();
      refreshBackendData();
    } catch (err: any) {
      AppToast.error('Payment Failed', err?.message || 'Could not record payment.');
    }
  };

  // Reverse Payment Handler
  const handleConfirmReversePayment = async (reason: string) => {
    if (!selectedPaymentForReverse) return;
    try {
      await billingService.reversePayment(selectedPaymentForReverse.id, reason);
      setReverseModalVisible(false);
      setSelectedPaymentForReverse(null);
      AppToast.success('Payment Reversed', 'Payment allocation safely undone and invoice balance updated.');
      await fetchLiveInvoice();
      refreshBackendData();
    } catch (err: any) {
      AppToast.error('Reversal Failed', err?.message || 'Could not reverse payment.');
      throw err;
    }
  };

  // PDF Handlers: Download, Share, & Excel
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
      {/* 1. INVOICE HEADER (Back Button, Invoice Number, Payment Status Pill) */}
      <Header
        title={orderIdDisplay}
        showBack={true}
        showNotification={false}
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* 2. BILL SUMMARY CARD (Final Bill Amount, Amount Received, Remaining Balance, Payment Status) */}
        <View style={styles.summaryCard}>
          <View style={styles.summaryTopRow}>
            <View style={{ flex: 1, marginRight: 8 }}>
              <Text style={styles.summaryCardSubtitle}>
                {isMonthly ? `MONTHLY INVOICE (${rawInvoiceData?.billing_period || ''})` : 'BILL SUMMARY'}
              </Text>
              <Text style={styles.invoiceNumberHeading}>{orderIdDisplay}</Text>
            </View>

            {/* Payment Status Pill */}
            <View
              style={[
                styles.statusBadge,
                isPaid
                  ? styles.badgePaid
                  : isPartiallyPaid
                  ? styles.badgePartiallyPaid
                  : styles.badgeUnpaid,
              ]}
            >
              <Text
                style={[
                  styles.statusBadgeText,
                  isPaid
                    ? styles.badgeTextPaid
                    : isPartiallyPaid
                    ? styles.badgeTextPartiallyPaid
                    : styles.badgeTextUnpaid,
                ]}
              >
                {isPaid ? 'PAID' : isPartiallyPaid ? 'PARTIALLY PAID' : 'UNPAID'}
              </Text>
            </View>
          </View>

          {/* 3 Metric Summary Grid */}
          <View style={styles.summaryMetricsGrid}>
            <View style={styles.summaryMetricCol}>
              <Text style={styles.summaryMetricLabel}>FINAL BILL AMOUNT</Text>
              <Text style={styles.summaryMetricVal}>
                ₹{billTotalNum.toLocaleString('en-IN')}
              </Text>
            </View>

            <View style={styles.summaryMetricCol}>
              <Text style={styles.summaryMetricLabel}>AMOUNT RECEIVED</Text>
              <Text style={[styles.summaryMetricVal, { color: '#059669' }]}>
                ₹{receivedNum.toLocaleString('en-IN')}
              </Text>
            </View>

            <View style={[styles.summaryMetricCol, { borderRightWidth: 0 }]}>
              <Text style={styles.summaryMetricLabel}>REMAINING BALANCE</Text>
              <Text
                style={[
                  styles.summaryMetricVal,
                  { color: remainingNum > 0 ? '#DC2626' : '#059669', fontWeight: '800' },
                ]}
              >
                ₹{remainingNum.toLocaleString('en-IN')}
              </Text>
            </View>
          </View>

          {/* ACTION BUTTONS: Edit Invoice | Record Payment | Download PDF | Share Invoice */}
          <View style={styles.actionButtonsContainer}>
            {/* Row 1: Primary Action Buttons */}
            <View style={styles.primaryActionsRow}>
              {isAdmin && !isMonthly && (
                <TouchableOpacity
                  style={styles.editBillBtn}
                  onPress={() => setIsEditBillVisible(true)}
                  activeOpacity={0.8}
                >
                  <Ionicons name="create-outline" size={15} color="#8C331A" style={{ marginRight: 4 }} />
                  <Text style={styles.editBillBtnText}>Edit Invoice</Text>
                </TouchableOpacity>
              )}

              {!isPaid && (
                <TouchableOpacity
                  style={styles.recordPaymentBtn}
                  onPress={() => setIsCollectPaymentVisible(true)}
                  activeOpacity={0.85}
                >
                  <Ionicons name="cash-outline" size={15} color="#FFFFFF" style={{ marginRight: 5 }} />
                  <Text style={styles.recordPaymentBtnText}>Record Payment</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Row 2: Document / Export Actions */}
            <View style={styles.pdfActionsRow}>
              <TouchableOpacity
                activeOpacity={0.8}
                style={[styles.pdfBtn, isPdfLoading && styles.pdfBtnDisabled]}
                onPress={handleDownloadPdf}
                disabled={isPdfLoading}
              >
                <Ionicons name="download-outline" size={15} color="#8C331A" />
                <Text style={styles.pdfBtnText}>Download PDF</Text>
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.8}
                style={[styles.pdfBtn, isPdfLoading && styles.pdfBtnDisabled]}
                onPress={handleSharePdf}
                disabled={isPdfLoading}
              >
                <Ionicons name="share-social-outline" size={15} color="#8C331A" />
                <Text style={styles.pdfBtnText}>Share Invoice</Text>
              </TouchableOpacity>

              {isMonthly && (
                <TouchableOpacity
                  activeOpacity={0.8}
                  style={[styles.pdfBtn, isExcelLoading && styles.pdfBtnDisabled]}
                  onPress={handleExportExcel}
                  disabled={isExcelLoading}
                >
                  <Ionicons name="document-text-outline" size={15} color="#059669" />
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
        </View>

        {/* 3. CUSTOMER DETAILS */}
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
              amount: remainingNum,
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
                <Ionicons name="chevron-forward" size={13} color="#8C331A" style={{ marginLeft: 3 }} />
              </View>
              <Text style={styles.customerName}>{currentOrder.name}</Text>
              {Boolean(currentOrder.customerPhone) && (
                <Text style={styles.customerAddress}>📞 {currentOrder.customerPhone}</Text>
              )}
              {Boolean(currentOrder.customerAddress) && (
                <Text style={styles.customerAddress}>📍 {currentOrder.customerAddress}</Text>
              )}
            </View>

            {Boolean(currentOrder.customerPhone) && (
              <TouchableOpacity
                activeOpacity={0.8}
                style={styles.callBtn}
                onPress={handleCallCustomer}
              >
                <Ionicons name="call" size={14} color="#FFFFFF" />
                <Text style={styles.callBtnText}>Call</Text>
              </TouchableOpacity>
            )}
          </View>
        </TouchableOpacity>

        {/* 4. INVOICE ITEMS */}
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
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitleLabel}>INVOICE ITEMS</Text>
            {currentOrder.items && currentOrder.items.length > 0 ? (
              currentOrder.items.map((item, idx) => (
                <View key={item.id || idx.toString()} style={styles.itemRow}>
                  <View style={styles.itemLeft}>
                    <Text style={styles.itemName}>{item.name}</Text>
                    <Text style={styles.itemQtyPrice}>
                      {item.qty} × ₹{item.price}
                    </Text>
                  </View>
                  <Text style={styles.itemTotal}>
                    ₹{(item.qty * item.price).toLocaleString('en-IN')}
                  </Text>
                </View>
              ))
            ) : (
              <View style={styles.itemRow}>
                <Text style={styles.itemName}>Consolidated Order Items</Text>
                <Text style={styles.itemTotal}>₹{billTotalNum.toLocaleString('en-IN')}</Text>
              </View>
            )}
          </View>
        )}

        {/* 5. PAYMENT SUMMARY */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitleLabel}>PAYMENT SUMMARY</Text>

          <View style={styles.calcRow}>
            <Text style={styles.calcLabel}>Subtotal</Text>
            <Text style={styles.calcVal}>₹{subtotalNum.toLocaleString('en-IN')}</Text>
          </View>

          {discountNum > 0 ? (
            <View style={styles.calcRow}>
              <Text style={[styles.calcLabel, { color: '#059669', fontWeight: '700' }]}>Discount</Text>
              <Text style={[styles.calcVal, { color: '#059669', fontWeight: '800' }]}>
                - ₹{discountNum.toLocaleString('en-IN')}
              </Text>
            </View>
          ) : null}

          <View style={[styles.calcRow, { borderTopWidth: 1, borderTopColor: '#F3F4F6', paddingTop: 6, marginTop: 4 }]}>
            <Text style={[styles.calcLabel, { fontWeight: '800', color: '#111827' }]}>Final Bill Amount</Text>
            <Text style={[styles.calcVal, { fontWeight: '900', color: '#8C331A' }]}>
              ₹{billTotalNum.toLocaleString('en-IN')}
            </Text>
          </View>

          <View style={styles.calcRow}>
            <Text style={styles.calcLabel}>Amount Received</Text>
            <Text style={[styles.calcVal, { color: '#059669', fontWeight: '700' }]}>
              ₹{receivedNum.toLocaleString('en-IN')}
            </Text>
          </View>

          <View style={[styles.calcRow, { borderTopWidth: 1, borderTopColor: '#F3F4F6', paddingTop: 6, marginTop: 4 }]}>
            <Text style={[styles.calcLabel, { color: remainingNum > 0 ? '#DC2626' : '#059669', fontWeight: '800' }]}>
              Remaining Balance
            </Text>
            <Text style={[styles.calcVal, { color: remainingNum > 0 ? '#DC2626' : '#059669', fontWeight: '900' }]}>
              ₹{remainingNum.toLocaleString('en-IN')}
            </Text>
          </View>
        </View>

        {/* 6. PAYMENT HISTORY (Payment date/time, amount, allocations, and reversal status) */}
        {((rawInvoiceData?.allocations && rawInvoiceData.allocations.length > 0) ||
          (rawInvoiceData?.payments && rawInvoiceData.payments.length > 0)) && (
          <View style={styles.sectionCard}>
            <View style={styles.sectionTitleRow}>
              <Ionicons name="receipt-outline" size={15} color="#8C331A" style={{ marginRight: 5 }} />
              <Text style={styles.sectionTitleLabel}>PAYMENT HISTORY</Text>
            </View>

            {/* If PaymentAllocations exist (authoritative invoice allocations) */}
            {rawInvoiceData?.allocations && rawInvoiceData.allocations.length > 0 ? (
              rawInvoiceData.allocations.map((alloc, idx) => {
                const isReversed = Boolean(
                  (alloc as any).is_reversed ||
                  (alloc as any).status === 'reversed' ||
                  (alloc.notes && alloc.notes.toLowerCase().includes('reversed'))
                );

                return (
                  <View key={alloc.id || idx} style={styles.paymentHistoryItem}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <View style={[styles.paymentDot, isReversed && styles.paymentDotReversed]} />
                      <View>
                        <Text style={[styles.paymentHistoryAmount, isReversed && styles.paymentAmountReversed]}>
                          {isReversed ? '-' : '+'} ₹{parseFloat(alloc.allocated_amount || '0').toLocaleString('en-IN')}
                        </Text>
                        <Text style={styles.paymentHistoryDate}>
                          {alloc.allocated_at ? new Date(alloc.allocated_at).toLocaleString() : 'Date N/A'}
                        </Text>
                      </View>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <View
                        style={[
                          styles.allocationPill,
                          isReversed ? styles.allocationPillReversed : styles.allocationPillActive,
                        ]}
                      >
                        <Text
                          style={[
                            styles.allocationPillText,
                            isReversed ? styles.allocationTextReversed : styles.allocationTextActive,
                          ]}
                        >
                          {isReversed ? 'Reversed' : `Allocated to ${alloc.invoice_number || orderIdDisplay}`}
                        </Text>
                      </View>

                      {/* Reverse Payment Action: Only shown for active non-reversed payments */}
                      {!isReversed && (
                        <TouchableOpacity
                          style={styles.reverseActionBtn}
                          onPress={() => {
                            setSelectedPaymentForReverse({
                              id: alloc.payment,
                              amount: alloc.allocated_amount,
                              received_at: alloc.allocated_at,
                              allocations: [
                                {
                                  invoice_number: alloc.invoice_number || orderIdDisplay,
                                  allocated_amount: alloc.allocated_amount,
                                },
                              ],
                            });
                            setReverseModalVisible(true);
                          }}
                          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        >
                          <Ionicons name="arrow-undo-outline" size={13} color="#DC2626" />
                          <Text style={styles.reverseActionBtnText}>Reverse</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                );
              })
            ) : (
              /* Fallback direct payments */
              rawInvoiceData?.payments.map((p, idx) => {
                const isReversed = Boolean(
                  (p as any).is_reversed ||
                  (p as any).status === 'reversed' ||
                  (p.notes && p.notes.toLowerCase().includes('reversed'))
                );

                return (
                  <View key={p.id || idx} style={styles.paymentHistoryItem}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <View style={[styles.paymentDot, isReversed && styles.paymentDotReversed]} />
                      <View>
                        <Text style={[styles.paymentHistoryAmount, isReversed && styles.paymentAmountReversed]}>
                          {isReversed ? '-' : '+'} ₹{parseFloat(p.amount || '0').toLocaleString('en-IN')}
                        </Text>
                        <Text style={styles.paymentHistoryDate}>
                          {p.received_at ? new Date(p.received_at).toLocaleString() : 'Date N/A'}
                        </Text>
                      </View>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <View
                        style={[
                          styles.allocationPill,
                          isReversed ? styles.allocationPillReversed : styles.allocationPillActive,
                        ]}
                      >
                        <Text
                          style={[
                            styles.allocationPillText,
                            isReversed ? styles.allocationTextReversed : styles.allocationTextActive,
                          ]}
                        >
                          {isReversed ? 'Reversed' : `Allocated to ${orderIdDisplay}`}
                        </Text>
                      </View>

                      {/* Reverse Payment Action: Only shown for active non-reversed payments */}
                      {!isReversed && (
                        <TouchableOpacity
                          style={styles.reverseActionBtn}
                          onPress={() => {
                            setSelectedPaymentForReverse({
                              id: p.id,
                              amount: p.amount,
                              received_at: p.received_at,
                              allocations: [
                                {
                                  invoice_number: orderIdDisplay,
                                  allocated_amount: p.amount,
                                },
                              ],
                            });
                            setReverseModalVisible(true);
                          }}
                          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        >
                          <Ionicons name="arrow-undo-outline" size={13} color="#DC2626" />
                          <Text style={styles.reverseActionBtnText}>Reverse</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                );
              })
            )}
          </View>
        )}

        {/* 7. EXISTING AUDIT HISTORY (Immutable modification record) */}
        {rawInvoiceData?.audit_logs && rawInvoiceData.audit_logs.length > 0 && (
          <View style={styles.sectionCard}>
            <View style={styles.auditHeaderRow}>
              <Ionicons name="time" size={15} color="#8C331A" style={{ marginRight: 6 }} />
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
        initialDiscount={String(discountNum || 0)}
        initialNotes={currentOrder.notes || ''}
        initialDueDate={rawInvoiceData?.due_date || null}
        onSaveSuccess={() => {
          setIsEditBillVisible(false);
          fetchLiveInvoice();
        }}
        saveAction={handleSaveEditedBill}
      />

      {/* Reverse Payment Modal */}
      <ReversePaymentModal
        visible={reverseModalVisible}
        onClose={() => {
          setReverseModalVisible(false);
          setSelectedPaymentForReverse(null);
        }}
        onSubmit={handleConfirmReversePayment}
        customerName={currentOrder.name}
        paymentId={selectedPaymentForReverse?.id}
        amount={selectedPaymentForReverse?.amount || 0}
        paymentDate={
          selectedPaymentForReverse?.received_at
            ? new Date(selectedPaymentForReverse.received_at).toLocaleString()
            : 'Date N/A'
        }
        allocations={selectedPaymentForReverse?.allocations || []}
      />

      {/* Record Payment Reusable CollectPaymentModal */}
      <CollectPaymentModal
        visible={isCollectPaymentVisible}
        onClose={() => setIsCollectPaymentVisible(false)}
        onSubmit={handleConfirmRecordPayment}
        customerName={currentOrder.name}
        totalPendingAmount={remainingNum}
        initialAmount={remainingNum}
        invoices={rawInvoiceData ? [rawInvoiceData] : []}
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
    borderRadius: 18,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#EFECE9',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
  },
  summaryTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  summaryCardSubtitle: {
    fontSize: 10,
    fontWeight: '800',
    color: '#8A7A70',
    letterSpacing: 0.5,
  },
  invoiceNumberHeading: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1F2937',
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  badgePaid: {
    backgroundColor: '#ECFDF5',
  },
  badgePartiallyPaid: {
    backgroundColor: '#FFFBEB',
  },
  badgeUnpaid: {
    backgroundColor: '#FEF2F2',
  },
  badgeTextPaid: {
    color: '#059669',
  },
  badgeTextPartiallyPaid: {
    color: '#D97706',
  },
  badgeTextUnpaid: {
    color: '#DC2626',
  },
  summaryMetricsGrid: {
    flexDirection: 'row',
    backgroundColor: '#FAF8F5',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 6,
    borderWidth: 1,
    borderColor: '#F0EBE5',
    marginBottom: 14,
  },
  summaryMetricCol: {
    flex: 1,
    alignItems: 'center',
    borderRightWidth: 1,
    borderRightColor: '#EAE3DC',
    paddingHorizontal: 4,
  },
  summaryMetricLabel: {
    fontSize: 8.5,
    fontWeight: '800',
    color: '#8A7A70',
    letterSpacing: 0.3,
    marginBottom: 4,
    textAlign: 'center',
  },
  summaryMetricVal: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1F2937',
    textAlign: 'center',
  },
  actionButtonsContainer: {
    marginTop: 2,
  },
  primaryActionsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  editBillBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#FAF5F0',
    borderWidth: 1,
    borderColor: '#E8D7CE',
  },
  editBillBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#8C331A',
  },
  recordPaymentBtn: {
    flex: 1.3,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#059669',
  },
  recordPaymentBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  pdfActionsRow: {
    flexDirection: 'row',
    gap: 8,
    width: '100%',
  },
  pdfBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 9,
    borderRadius: 10,
    backgroundColor: '#FAF5F0',
    borderWidth: 1,
    borderColor: '#E8D7CE',
    gap: 4,
  },
  pdfBtnDisabled: {
    opacity: 0.6,
  },
  pdfBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#8C331A',
  },
  pdfLoadingText: {
    fontSize: 11,
    color: '#8C331A',
    fontWeight: '600',
    marginTop: 8,
    textAlign: 'center',
  },
  sectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
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
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
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
    marginBottom: 6,
  },
  customerName: {
    fontSize: 15,
    fontWeight: '800',
    color: '#2A201A',
  },
  customerAddress: {
    fontSize: 11,
    color: '#8A7A70',
    marginTop: 2,
  },
  callBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#8C331A',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
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
  paymentHistoryItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  paymentDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#059669',
    marginRight: 8,
  },
  paymentDotReversed: {
    backgroundColor: '#DC2626',
  },
  paymentHistoryAmount: {
    fontSize: 13,
    fontWeight: '800',
    color: '#059669',
  },
  paymentAmountReversed: {
    color: '#DC2626',
    textDecorationLine: 'line-through',
  },
  paymentHistoryDate: {
    fontSize: 10,
    color: '#8A7A70',
    marginTop: 2,
  },
  allocationPill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  allocationPillActive: {
    backgroundColor: '#FAF5F0',
    borderWidth: 1,
    borderColor: '#E8D7CE',
  },
  allocationPillReversed: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  allocationPillText: {
    fontSize: 10,
    fontWeight: '700',
  },
  allocationTextActive: {
    color: '#8C331A',
  },
  allocationTextReversed: {
    color: '#DC2626',
  },
  reverseActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FCA5A5',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginLeft: 8,
  },
  reverseActionBtnText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#DC2626',
    marginLeft: 3,
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
