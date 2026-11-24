import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
  RefreshControl,
  Modal,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useApp } from '../../context/AppContext';
import orderService, { BackendOrder, OrderInvoicePreview } from '../../services/order.service';
import billingService, { BackendInvoice } from '../../services/billing.service';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import AppToast from '../../utils/toast';
import { colors, typography, radius, spacing, shadows } from '../../theme';

type BillingTab = 'READY_TO_BILL' | 'GENERATED_BILLS' | 'PENDING_APPROVAL';

interface DailyBillsScreenProps {
  navigation?: any;
}

export default function DailyBillsScreen({ navigation }: DailyBillsScreenProps) {
  const { invoices: contextInvoices, refreshBackendData } = useApp();

  // Selected Date State (Defaults to Today YYYY-MM-DD)
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [showDatePickerModal, setShowDatePickerModal] = useState<boolean>(false);

  // Active Tab
  const [activeTab, setActiveTab] = useState<BillingTab>('READY_TO_BILL');

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Data Loading
  const [orders, setOrders] = useState<BackendOrder[]>([]);
  const [invoices, setInvoices] = useState<BackendInvoice[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  // Manual Invoice Preview & Generation State
  const [selectedOrder, setSelectedOrder] = useState<BackendOrder | null>(null);
  const [invoicePreview, setInvoicePreview] = useState<OrderInvoicePreview | null>(null);
  const [previewLoading, setPreviewLoading] = useState<boolean>(false);
  const [previewModalVisible, setPreviewModalVisible] = useState<boolean>(false);
  const [generating, setGenerating] = useState<boolean>(false);

  // Reusable Confirm Dialog
  const [confirmDialogConfig, setConfirmDialogConfig] = useState<{
    visible: boolean;
    title: string;
    description?: string;
    confirmLabel?: string;
    cancelLabel?: string;
    type?: 'danger' | 'warning' | 'info' | 'success';
    icon?: string;
    onConfirm: () => void | Promise<void>;
  }>({
    visible: false,
    title: '',
    onConfirm: () => {},
  });

  // Fetch Daily Orders and Invoices
  const fetchData = useCallback(async () => {
    try {
      const [orderList, invList] = await Promise.all([
        orderService.getOrders().catch(() => []),
        billingService.getInvoices({ date: selectedDate }).catch(() => []),
      ]);
      setOrders(orderList || []);
      setInvoices(invList || []);
    } catch (_err) {
      // Handled silently
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedDate]);

  useEffect(() => {
    const unsubscribe = navigation?.addListener?.('focus', () => {
      fetchData();
      refreshBackendData();
    });
    fetchData();
    return unsubscribe;
  }, [navigation, fetchData, refreshBackendData]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchData();
    refreshBackendData();
  }, [fetchData, refreshBackendData]);

  // Date partition helper
  const isDateMatching = (dateStr?: string) => {
    if (!dateStr) return false;
    return dateStr.startsWith(selectedDate);
  };

  // Filter orders by date
  const dateOrders = useMemo(() => {
    return orders.filter(o => isDateMatching(o.created_at));
  }, [orders, selectedDate]);

  // 1. Ready to Bill: Delivered / Owner-approved, but NO invoice issued yet
  const readyToBillOrders = useMemo(() => {
    return dateOrders.filter(o => {
      const isDelivered = o.status === 'delivered' || o.delivery_status === 'delivered';
      const hasInvoice = Boolean(o.has_invoice || o.invoice_number);
      return isDelivered && !hasInvoice;
    });
  }, [dateOrders]);

  // 2. Generated Bills: Invoices generated for this date
  const generatedInvoices = useMemo(() => {
    // If backend invoices for the date are available, prioritize them; else use orders with invoices
    if (invoices.length > 0) return invoices;
    // Fallback to contextInvoices matching date
    return contextInvoices.filter(i => isDateMatching(i.createdAt || i.date));
  }, [invoices, contextInvoices, selectedDate]);

  // 3. Pending Approval: In-progress / Pending / Out for delivery (Not yet delivered/approved)
  const pendingApprovalOrders = useMemo(() => {
    return dateOrders.filter(o => {
      const isDelivered = o.status === 'delivered' || o.delivery_status === 'delivered';
      const isCancelled = o.status === 'cancelled';
      return !isDelivered && !isCancelled;
    });
  }, [dateOrders]);

  // Summary Metrics
  const summaryMetrics = useMemo(() => {
    const totalApproved = readyToBillOrders.length + generatedInvoices.length;
    const billsGenerated = generatedInvoices.length;
    const billsRemaining = readyToBillOrders.length;

    let totalAmount = 0;
    generatedInvoices.forEach((inv: any) => {
      const amt = parseFloat(inv.grand_total || inv.numericAmount || inv.amount?.replace(/[^0-9.]/g, '') || '0');
      totalAmount += amt;
    });
    readyToBillOrders.forEach(ord => {
      totalAmount += parseFloat(ord.total_amount || '0');
    });

    return {
      totalApproved,
      billsGenerated,
      billsRemaining,
      totalAmount,
    };
  }, [readyToBillOrders, generatedInvoices]);

  // Tab Item Lists Filtered by Search
  const filteredList = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();

    if (activeTab === 'READY_TO_BILL') {
      if (!q) return readyToBillOrders;
      return readyToBillOrders.filter(
        o =>
          String(o.id).includes(q) ||
          o.customer_name?.toLowerCase().includes(q) ||
          o.company_name?.toLowerCase().includes(q)
      );
    }

    if (activeTab === 'GENERATED_BILLS') {
      if (!q) return generatedInvoices;
      return generatedInvoices.filter((inv: any) => {
        const name = (inv.customer_name || inv.name || '').toLowerCase();
        const invNo = (inv.invoice_number || inv.invoiceNo || String(inv.id)).toLowerCase();
        return name.includes(q) || invNo.includes(q);
      });
    }

    // PENDING_APPROVAL
    if (!q) return pendingApprovalOrders;
    return pendingApprovalOrders.filter(
      o =>
        String(o.id).includes(q) ||
        o.customer_name?.toLowerCase().includes(q) ||
        o.company_name?.toLowerCase().includes(q)
    );
  }, [activeTab, searchQuery, readyToBillOrders, generatedInvoices, pendingApprovalOrders]);

  // Invoice Generation Handlers
  const handleOpenInvoicePreview = async (order: BackendOrder) => {
    try {
      setSelectedOrder(order);
      setPreviewLoading(true);
      setPreviewModalVisible(true);
      const preview = await orderService.getInvoicePreview(order.id);
      setInvoicePreview(preview);
    } catch (err: any) {
      AppToast.error('Preview Failed', err?.message || 'Failed to load delivered products preview.');
      setPreviewModalVisible(false);
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleConfirmGenerateInvoice = async () => {
    if (!selectedOrder) return;
    setConfirmDialogConfig({
      visible: true,
      title: 'Generate Daily Invoice?',
      description: `Issue official invoice for Order #${selectedOrder.id} (${selectedOrder.company_name || selectedOrder.customer_name}) based on approved delivered actuals?`,
      confirmLabel: 'Issue Invoice',
      cancelLabel: 'Cancel',
      type: 'info',
      icon: 'receipt-outline',
      onConfirm: async () => {
        try {
          setGenerating(true);
          const result = await orderService.generateManualInvoice(selectedOrder.id);
          setPreviewModalVisible(false);
          fetchData();
          refreshBackendData();
          AppToast.success(
            'Invoice Generated',
            `Daily Invoice #${result.invoice_number || 'Issued'} debited to customer ledger.`
          );
        } catch (err: any) {
          AppToast.error('Invoice Failed', err?.message || 'Failed to generate invoice.');
        } finally {
          setGenerating(false);
          setConfirmDialogConfig(prev => ({ ...prev, visible: false }));
        }
      },
    });
  };

  const handleDateSelect = (offsetDays: number) => {
    const d = new Date();
    d.setDate(d.getDate() + offsetDays);
    setSelectedDate(d.toISOString().split('T')[0]);
    setShowDatePickerModal(false);
  };

  const formattedDisplayDate = useMemo(() => {
    try {
      const today = new Date().toISOString().split('T')[0];
      if (selectedDate === today) return 'Today';
      const d = new Date(selectedDate);
      return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
    } catch {
      return selectedDate;
    }
  }, [selectedDate]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* 1. HEADER WITH DATE SELECTION */}
      <View style={styles.topHeader}>
        <View style={styles.headerLeft}>
          <Text style={styles.screenTitle}>Daily Bills</Text>
          <TouchableOpacity
            style={styles.dateSelectorBtn}
            onPress={() => setShowDatePickerModal(true)}
            activeOpacity={0.7}
          >
            <Ionicons name="calendar-outline" size={14} color={colors.primary} style={{ marginRight: 4 }} />
            <Text style={styles.dateSelectorText}>{formattedDisplayDate}</Text>
            <Ionicons name="chevron-down" size={14} color={colors.primary} style={{ marginLeft: 2 }} />
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={styles.newBillBtn}
          onPress={() => navigation?.navigate('QuickBilling')}
          activeOpacity={0.8}
        >
          <Ionicons name="add" size={18} color={colors.white} style={{ marginRight: 3 }} />
          <Text style={styles.newBillBtnText}>New Bill</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />
        }
      >
        {/* 2. COMPACT BILLING SUMMARY CARDS */}
        <View style={styles.summaryGrid}>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>TOTAL APPROVED</Text>
            <Text style={styles.summaryValue}>{summaryMetrics.totalApproved}</Text>
            <Text style={styles.summarySub}>Orders ready & billed</Text>
          </View>

          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>BILLS GENERATED</Text>
            <Text style={[styles.summaryValue, { color: colors.success }]}>{summaryMetrics.billsGenerated}</Text>
            <Text style={styles.summarySub}>Invoiced & debited</Text>
          </View>

          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>BILLS REMAINING</Text>
            <Text style={[styles.summaryValue, summaryMetrics.billsRemaining > 0 ? { color: colors.warning } : {}]}>
              {summaryMetrics.billsRemaining}
            </Text>
            <Text style={styles.summarySub}>Awaiting invoice</Text>
          </View>

          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>TOTAL AMOUNT</Text>
            <Text style={[styles.summaryValue, { color: colors.primary }]}>
              ₹{summaryMetrics.totalAmount.toLocaleString('en-IN')}
            </Text>
            <Text style={styles.summarySub}>Commercial total</Text>
          </View>
        </View>

        {/* 3. SEARCH INPUT */}
        <View style={styles.searchBarWrapper}>
          <Ionicons name="search-outline" size={17} color={colors.textSecondary} style={{ marginRight: 8 }} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by customer name or order ID..."
            placeholderTextColor={colors.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
            clearButtonMode="while-editing"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="close-circle" size={16} color={colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>

        {/* 4. BILLING SECTIONS TABS */}
        <View style={styles.tabsContainer}>
          <TouchableOpacity
            style={[styles.tabButton, activeTab === 'READY_TO_BILL' && styles.tabButtonActive]}
            onPress={() => setActiveTab('READY_TO_BILL')}
            activeOpacity={0.7}
          >
            <Text style={[styles.tabText, activeTab === 'READY_TO_BILL' && styles.tabTextActive]}>
              Ready to Bill ({readyToBillOrders.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabButton, activeTab === 'GENERATED_BILLS' && styles.tabButtonActive]}
            onPress={() => setActiveTab('GENERATED_BILLS')}
            activeOpacity={0.7}
          >
            <Text style={[styles.tabText, activeTab === 'GENERATED_BILLS' && styles.tabTextActive]}>
              Generated ({generatedInvoices.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabButton, activeTab === 'PENDING_APPROVAL' && styles.tabButtonActive]}
            onPress={() => setActiveTab('PENDING_APPROVAL')}
            activeOpacity={0.7}
          >
            <Text style={[styles.tabText, activeTab === 'PENDING_APPROVAL' && styles.tabTextActive]}>
              Pending Approval ({pendingApprovalOrders.length})
            </Text>
          </TouchableOpacity>
        </View>

        {/* 5. LIST CONTENT */}
        {loading ? (
          <ActivityIndicator size="large" color={colors.primary} style={{ marginVertical: 32 }} />
        ) : filteredList.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons
              name={
                activeTab === 'READY_TO_BILL'
                  ? 'checkmark-done-circle-outline'
                  : activeTab === 'GENERATED_BILLS'
                  ? 'receipt-outline'
                  : 'time-outline'
              }
              size={42}
              color={colors.gray300}
              style={{ marginBottom: 8 }}
            />
            <Text style={styles.emptyTitle}>
              {activeTab === 'READY_TO_BILL'
                ? 'No Orders Ready to Bill'
                : activeTab === 'GENERATED_BILLS'
                ? 'No Generated Bills Yet'
                : 'No Orders Pending Approval'}
            </Text>
            <Text style={styles.emptySub}>
              {activeTab === 'READY_TO_BILL'
                ? 'Orders delivered by partners will appear here for one-click invoice generation.'
                : activeTab === 'GENERATED_BILLS'
                ? 'Issued invoices for this date will be listed here with receipts and PDF access.'
                : 'All orders for this date are approved or delivered.'}
            </Text>
          </View>
        ) : (
          filteredList.map((item: any) => {
            // Render Ready to Bill Order Card
            if (activeTab === 'READY_TO_BILL') {
              const order = item as BackendOrder;
              const itemsText = (order.items || [])
                .map(i => `${i.quantity}x ${i.product_details?.name || 'Item'}`)
                .join(' • ');

              return (
                <View key={order.id} style={styles.orderCard}>
                  <View style={styles.cardHeaderRow}>
                    <View>
                      <Text style={styles.cardIdText}>Order #{order.id}</Text>
                      <Text style={styles.customerNameText}>{order.company_name || order.customer_name}</Text>
                    </View>
                    <View style={styles.approvedBadge}>
                      <Ionicons name="checkmark-circle" size={13} color={colors.approved} style={{ marginRight: 3 }} />
                      <Text style={styles.approvedBadgeText}>DELIVERED</Text>
                    </View>
                  </View>

                  <Text style={styles.quantitiesSummary} numberOfLines={2}>
                    {itemsText || 'Approved products delivered'}
                  </Text>

                  <View style={styles.cardFooterRow}>
                    <View>
                      <Text style={styles.billAmountLabel}>Billable Amount</Text>
                      <Text style={styles.billAmountValue}>₹{parseFloat(order.total_amount || '0').toLocaleString('en-IN')}</Text>
                    </View>

                    <TouchableOpacity
                      style={styles.generateInvoiceBtn}
                      onPress={() => handleOpenInvoicePreview(order)}
                      activeOpacity={0.85}
                    >
                      <Ionicons name="receipt-outline" size={15} color={colors.white} style={{ marginRight: 5 }} />
                      <Text style={styles.generateInvoiceBtnText}>Generate Invoice</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            }

            // Render Generated Bills Card
            if (activeTab === 'GENERATED_BILLS') {
              const invoice = item as BackendInvoice;
              const custName = invoice.customer_name || (invoice as any).name || 'Customer';
              const invNum = invoice.invoice_number || (invoice as any).invoiceNo || `INV-${invoice.id}`;
              const amountStr = invoice.grand_total || (invoice as any).amount || '0';
              const cleanAmount = parseFloat(String(amountStr).replace(/[^0-9.]/g, '') || '0');
              const isPaid = invoice.status === 'paid' || (invoice as any).status === 'PAID';

              return (
                <View key={invoice.id} style={styles.orderCard}>
                  <View style={styles.cardHeaderRow}>
                    <View>
                      <Text style={styles.cardIdText}>{invNum}</Text>
                      <Text style={styles.customerNameText}>{custName}</Text>
                    </View>
                    <View style={[styles.statusBadge, isPaid ? styles.statusBadgePaid : styles.statusBadgePending]}>
                      <Text style={[styles.statusBadgeText, isPaid ? styles.statusBadgeTextPaid : styles.statusBadgeTextPending]}>
                        {isPaid ? 'PAID' : 'ISSUED'}
                      </Text>
                    </View>
                  </View>

                  <Text style={styles.quantitiesSummary}>
                    {invoice.notes || `Daily Invoice debited to ${custName}`}
                  </Text>

                  <View style={styles.cardFooterRow}>
                    <View>
                      <Text style={styles.billAmountLabel}>Invoiced Amount</Text>
                      <Text style={styles.billAmountValue}>₹{cleanAmount.toLocaleString('en-IN')}</Text>
                    </View>

                    <TouchableOpacity
                      style={styles.viewInvoiceBtn}
                      onPress={() => navigation?.navigate('InvoiceDetail', { invoice })}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="eye-outline" size={15} color={colors.primary} style={{ marginRight: 4 }} />
                      <Text style={styles.viewInvoiceBtnText}>View Invoice</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            }

            // Render Pending Approval Order Card
            const order = item as BackendOrder;
            const itemsText = (order.items || [])
              .map(i => `${i.quantity}x ${i.product_details?.name || 'Item'}`)
              .join(' • ');

            return (
              <View key={order.id} style={styles.orderCard}>
                <View style={styles.cardHeaderRow}>
                  <View>
                    <Text style={styles.cardIdText}>Order #{order.id}</Text>
                    <Text style={styles.customerNameText}>{order.company_name || order.customer_name}</Text>
                  </View>
                  <View style={styles.pendingBadge}>
                    <Ionicons name="time-outline" size={13} color={colors.warning} style={{ marginRight: 3 }} />
                    <Text style={styles.pendingBadgeText}>{order.status.replace(/_/g, ' ').toUpperCase()}</Text>
                  </View>
                </View>

                <Text style={styles.quantitiesSummary} numberOfLines={2}>
                  {itemsText || 'Order placed • Pending delivery & approval'}
                </Text>

                <View style={styles.cardFooterRow}>
                  <View>
                    <Text style={styles.billAmountLabel}>Estimated Value</Text>
                    <Text style={styles.billAmountValue}>₹{parseFloat(order.total_amount || '0').toLocaleString('en-IN')}</Text>
                  </View>

                  <View style={styles.awaitingApprovalTag}>
                    <Text style={styles.awaitingApprovalText}>Awaiting Delivery Actuals</Text>
                  </View>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>

      {/* --- DATE PICKER QUICK MODAL --- */}
      <Modal visible={showDatePickerModal} transparent animationType="fade" onRequestClose={() => setShowDatePickerModal(false)}>
        <View style={styles.modalOverlay}>
          <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={() => setShowDatePickerModal(false)} />
          <View style={styles.datePickerCard}>
            <Text style={styles.datePickerTitle}>Select Billing Date</Text>
            {[
              { label: 'Today', offset: 0 },
              { label: 'Yesterday', offset: -1 },
              { label: '2 Days Ago', offset: -2 },
              { label: '3 Days Ago', offset: -3 },
            ].map(d => (
              <TouchableOpacity
                key={d.label}
                style={styles.datePickerOption}
                onPress={() => handleDateSelect(d.offset)}
                activeOpacity={0.7}
              >
                <Text style={styles.datePickerOptionText}>{d.label}</Text>
                <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </Modal>

      {/* --- MANUAL INVOICE REVIEW MODAL --- */}
      <Modal visible={previewModalVisible} transparent animationType="slide" onRequestClose={() => setPreviewModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalSheetHeader}>
              <View>
                <Text style={styles.modalSheetTitle}>Daily Invoice Review</Text>
                <Text style={styles.modalSheetSubtitle}>
                  Order #{selectedOrder?.id} • {selectedOrder?.company_name || selectedOrder?.customer_name}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setPreviewModalVisible(false)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Ionicons name="close" size={22} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {previewLoading ? (
              <View style={{ height: 180, justifyContent: 'center', alignItems: 'center' }}>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={{ marginTop: 8, color: colors.textSecondary, fontSize: 12 }}>Resolving approved quantities...</Text>
              </View>
            ) : invoicePreview ? (
              <View>
                <View style={styles.auditNotice}>
                  <Ionicons name="shield-checkmark" size={15} color={colors.approved} style={{ marginRight: 6 }} />
                  <Text style={styles.auditNoticeText}>Invoicing confirmed delivery actuals & resolved product rates.</Text>
                </View>

                <FlatList
                  data={invoicePreview.items}
                  keyExtractor={it => String(it.product_id)}
                  style={{ maxHeight: 200, marginVertical: 8 }}
                  renderItem={({ item: it }) => (
                    <View style={styles.previewItemRow}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.previewItemName}>{it.product_name}</Text>
                        <Text style={styles.previewItemQty}>
                          Delivered: {it.delivered_quantity} units @ ₹{it.effective_rate}/ea
                        </Text>
                      </View>
                      <Text style={styles.previewItemTotal}>₹{it.line_total}</Text>
                    </View>
                  )}
                />

                <View style={styles.modalTotalBox}>
                  <View style={styles.modalTotalRow}>
                    <Text style={styles.modalTotalLabel}>Subtotal</Text>
                    <Text style={styles.modalTotalVal}>₹{invoicePreview.subtotal}</Text>
                  </View>
                  {parseFloat(invoicePreview.discount_total || '0') > 0 && (
                    <View style={styles.modalTotalRow}>
                      <Text style={[styles.modalTotalLabel, { color: colors.approved }]}>Approved Discount</Text>
                      <Text style={[styles.modalTotalVal, { color: colors.approved }]}>-₹{invoicePreview.discount_total}</Text>
                    </View>
                  )}
                  <View style={[styles.modalTotalRow, { borderTopWidth: 1, borderTopColor: colors.borderLight, paddingTop: 6, marginTop: 4 }]}>
                    <Text style={styles.modalGrandLabel}>Final Invoiced Total</Text>
                    <Text style={styles.modalGrandVal}>₹{invoicePreview.grand_total}</Text>
                  </View>
                </View>

                <TouchableOpacity
                  style={styles.confirmIssueBtn}
                  onPress={handleConfirmGenerateInvoice}
                  disabled={generating}
                  activeOpacity={0.85}
                >
                  {generating ? (
                    <ActivityIndicator color={colors.white} />
                  ) : (
                    <>
                      <Ionicons name="checkmark-circle" size={18} color={colors.white} style={{ marginRight: 6 }} />
                      <Text style={styles.confirmIssueBtnText}>Confirm & Issue Invoice</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            ) : null}
          </View>
        </View>
      </Modal>

      {/* --- CONFIRM DIALOG --- */}
      <ConfirmDialog
        visible={confirmDialogConfig.visible}
        title={confirmDialogConfig.title}
        description={confirmDialogConfig.description}
        confirmLabel={confirmDialogConfig.confirmLabel}
        cancelLabel={confirmDialogConfig.cancelLabel}
        type={confirmDialogConfig.type}
        icon={confirmDialogConfig.icon}
        onConfirm={confirmDialogConfig.onConfirm}
        onCancel={() => setConfirmDialogConfig(prev => ({ ...prev, visible: false }))}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  topHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.cardBackground,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  screenTitle: {
    ...typography.heading1,
    color: colors.textPrimary,
  },
  dateSelectorBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F7EFE9',
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: '#F5C6B8',
  },
  dateSelectorText: {
    ...typography.caption,
    fontFamily: 'Inter-SemiBold',
    color: colors.primary,
    fontWeight: '700',
  },
  newBillBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: 7,
    borderRadius: radius.md,
    ...shadows.sm,
  },
  newBillBtnText: {
    ...typography.badge,
    color: colors.white,
    fontWeight: '700',
  },
  scrollContent: {
    padding: spacing.md,
    paddingBottom: spacing.xxl,
  },

  /* Summary Grid */
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  summaryCard: {
    width: '48.5%',
    backgroundColor: colors.cardBackground,
    borderRadius: radius.md,
    padding: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.sm,
  },
  summaryLabel: {
    fontSize: 10,
    fontFamily: 'Inter-Bold',
    fontWeight: '800',
    color: colors.textMuted,
    marginBottom: 2,
    letterSpacing: 0.5,
  },
  summaryValue: {
    fontSize: 18,
    fontFamily: 'Inter-Bold',
    fontWeight: '800',
    color: colors.textPrimary,
    marginBottom: 1,
  },
  summarySub: {
    fontSize: 10,
    color: colors.textSecondary,
  },

  /* Search Bar */
  searchBarWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.cardBackground,
    borderRadius: radius.md,
    paddingHorizontal: spacing.sm,
    height: 40,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.sm,
  },
  searchInput: {
    flex: 1,
    ...typography.body,
    fontSize: 13,
    color: colors.textPrimary,
    padding: 0,
  },

  /* Tabs */
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: colors.cardBackground,
    borderRadius: radius.md,
    padding: 3,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.md,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 7,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.sm,
  },
  tabButtonActive: {
    backgroundColor: colors.primary,
  },
  tabText: {
    ...typography.badge,
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  tabTextActive: {
    color: colors.white,
    fontWeight: '700',
  },

  /* Cards */
  orderCard: {
    backgroundColor: colors.cardBackground,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.sm,
    marginBottom: spacing.sm,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  cardIdText: {
    ...typography.caption,
    fontFamily: 'Inter-SemiBold',
    color: colors.textMuted,
  },
  customerNameText: {
    ...typography.body,
    fontFamily: 'Inter-Bold',
    fontWeight: '700',
    color: colors.textPrimary,
  },
  approvedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.approvedBackground,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: radius.sm,
  },
  approvedBadgeText: {
    fontSize: 10,
    fontFamily: 'Inter-Bold',
    color: colors.approved,
    fontWeight: '800',
  },
  pendingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.warningBg,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: radius.sm,
  },
  pendingBadgeText: {
    fontSize: 10,
    fontFamily: 'Inter-Bold',
    color: colors.warning,
    fontWeight: '800',
  },
  statusBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: radius.sm,
  },
  statusBadgePaid: {
    backgroundColor: colors.approvedBackground,
  },
  statusBadgePending: {
    backgroundColor: '#FAF4ED',
    borderWidth: 1,
    borderColor: '#F5C6B8',
  },
  statusBadgeText: {
    fontSize: 10,
    fontFamily: 'Inter-Bold',
    fontWeight: '800',
  },
  statusBadgeTextPaid: {
    color: colors.approved,
  },
  statusBadgeTextPending: {
    color: colors.primary,
  },
  quantitiesSummary: {
    ...typography.caption,
    color: colors.textSecondary,
    marginVertical: 4,
  },
  cardFooterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  billAmountLabel: {
    fontSize: 10,
    color: colors.textMuted,
  },
  billAmountValue: {
    ...typography.body,
    fontFamily: 'Inter-Bold',
    fontWeight: '800',
    color: colors.textPrimary,
  },
  generateInvoiceBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: radius.sm,
    ...shadows.sm,
  },
  generateInvoiceBtnText: {
    ...typography.badge,
    fontSize: 11,
    color: colors.white,
    fontWeight: '700',
  },
  viewInvoiceBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FAF4ED',
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: '#F5C6B8',
  },
  viewInvoiceBtnText: {
    ...typography.badge,
    fontSize: 11,
    color: colors.primary,
    fontWeight: '700',
  },
  awaitingApprovalTag: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    backgroundColor: '#F9FAFB',
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  awaitingApprovalText: {
    fontSize: 10,
    color: colors.textMuted,
    fontStyle: 'italic',
  },

  /* Empty state */
  emptyContainer: {
    padding: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.cardBackground,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: 'dashed',
    marginTop: spacing.sm,
  },
  emptyTitle: {
    ...typography.body,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 4,
  },
  emptySub: {
    ...typography.caption,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
  },

  /* Date Picker Modal */
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  datePickerCard: {
    width: '100%',
    backgroundColor: colors.cardBackground,
    borderRadius: radius.lg,
    padding: spacing.md,
    ...shadows.lg,
  },
  datePickerTitle: {
    ...typography.heading2,
    color: colors.textPrimary,
    fontWeight: '800',
    marginBottom: spacing.sm,
  },
  datePickerOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  datePickerOptionText: {
    ...typography.body,
    color: colors.textPrimary,
    fontWeight: '600',
  },

  /* Invoice Review Modal */
  modalSheet: {
    width: '100%',
    backgroundColor: colors.cardBackground,
    borderRadius: radius.lg,
    padding: spacing.md,
    ...shadows.lg,
    maxHeight: '85%',
  },
  modalSheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
    paddingBottom: spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  modalSheetTitle: {
    ...typography.heading2,
    color: colors.textPrimary,
    fontWeight: '800',
  },
  modalSheetSubtitle: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 2,
  },
  auditNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.approvedBackground,
    padding: spacing.xs,
    borderRadius: radius.sm,
    marginBottom: spacing.xs,
  },
  auditNoticeText: {
    ...typography.caption,
    fontSize: 11,
    color: colors.approved,
    flex: 1,
  },
  previewItemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  previewItemName: {
    ...typography.caption,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  previewItemQty: {
    fontSize: 10,
    color: colors.textSecondary,
  },
  previewItemTotal: {
    ...typography.caption,
    fontFamily: 'Inter-Bold',
    fontWeight: '700',
    color: colors.textPrimary,
  },
  modalTotalBox: {
    backgroundColor: '#FAF8F5',
    padding: spacing.sm,
    borderRadius: radius.md,
    marginVertical: spacing.xs,
  },
  modalTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 2,
  },
  modalTotalLabel: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  modalTotalVal: {
    ...typography.caption,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  modalGrandLabel: {
    ...typography.body,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  modalGrandVal: {
    ...typography.body,
    fontWeight: '800',
    color: colors.primary,
  },
  confirmIssueBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: 12,
    marginTop: spacing.xs,
    ...shadows.sm,
  },
  confirmIssueBtnText: {
    ...typography.badge,
    fontSize: 13,
    color: colors.white,
    fontWeight: '800',
  },
});
