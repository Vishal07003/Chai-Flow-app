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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { Header } from '../../components/common';
import { useApp } from '../../context/AppContext';
import orderService, {
  BackendOrder,
  OrderInvoicePreview,
  DailyDeliverySchedule,
} from '../../services/order.service';
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

  // Active Billing Tab
  const [activeTab, setActiveTab] = useState<BillingTab>('READY_TO_BILL');

  // Search
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Data Loading
  const [orders, setOrders] = useState<BackendOrder[]>([]);
  const [invoices, setInvoices] = useState<BackendInvoice[]>([]);
  const [schedules, setSchedules] = useState<DailyDeliverySchedule[]>([]);
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

  // Fetch Daily Orders, Invoices, and Schedules
  const fetchData = useCallback(async () => {
    try {
      const [orderList, invList, scheduleList] = await Promise.all([
        orderService.getOrders().catch(() => []),
        billingService.getInvoices({ date: selectedDate }).catch(() => []),
        orderService.getDailySchedules().catch(() => []),
      ]);
      setOrders(orderList || []);
      setInvoices(invList || []);
      setSchedules(scheduleList || []);
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

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([fetchData(), refreshBackendData()]);
    setRefreshing(false);
  }, [fetchData, refreshBackendData]);

  // Toggle Schedule Pause / Resume directly on screen
  const handleToggleSchedulePause = async (sched: DailyDeliverySchedule) => {
    try {
      const nextActive = !sched.is_active;
      await orderService.updateDailySchedule(sched.id, { is_active: nextActive });
      AppToast.success(
        nextActive ? 'Schedule Resumed' : 'Schedule Paused',
        `Schedule for ${sched.customer_name} is now ${nextActive ? 'Active' : 'Paused'}.`
      );
      fetchData();
    } catch (err: any) {
      AppToast.error('Action Failed', err?.message || 'Could not update status.');
    }
  };

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
      const isOwnerDelivered = o.status === 'delivered';
      const hasInvoice = Boolean(o.has_invoice || o.invoice_number);
      return isOwnerDelivered && !hasInvoice;
    });
  }, [dateOrders]);

  // 2. Generated Bills: Invoices generated for this date
  const generatedInvoices = useMemo(() => {
    if (invoices.length > 0) return invoices;
    return contextInvoices.filter(i => isDateMatching(i.createdAt || i.date));
  }, [invoices, contextInvoices, selectedDate]);

  // 3. Pending Approval: STRICTLY orders with submitted delivery actuals awaiting Owner review/approval
  const pendingApprovalOrders = useMemo(() => {
    return dateOrders.filter(o => {
      const isDelivered = o.status === 'delivered';
      const hasInvoice = Boolean(o.has_invoice || o.invoice_number);
      const hasSubmittedActuals = o.delivery_status === 'delivered' && !isDelivered;
      return hasSubmittedActuals && !hasInvoice;
    });
  }, [dateOrders]);

  // Tab Item Lists Filtered by Search
  const filteredBillingList = useMemo(() => {
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

    if (!q) return pendingApprovalOrders;
    return pendingApprovalOrders.filter(
      o =>
        String(o.id).includes(q) ||
        o.customer_name?.toLowerCase().includes(q) ||
        o.company_name?.toLowerCase().includes(q)
    );
  }, [activeTab, searchQuery, readyToBillOrders, generatedInvoices, pendingApprovalOrders]);

  // Filtered schedules for direct management on Billing
  const displayedSchedules = useMemo(() => {
    if (!searchQuery.trim()) return schedules;
    const q = searchQuery.toLowerCase().trim();
    return schedules.filter(
      s =>
        (s.customer_name || '').toLowerCase().includes(q) ||
        (s.delivery_partner_name || '').toLowerCase().includes(q) ||
        (s.delivery_address || '').toLowerCase().includes(q)
    );
  }, [schedules, searchQuery]);

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
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      {/* 1. Header (Shared header style matching Home and Customers) */}
      <Header title="Billing" showNotification={true} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />
        }
      >
        {/* 2. TWO PROMINENT ACTION CARDS (SIDE BY SIDE): DAILY SCHEDULE & DAILY BILLING */}
        <View style={styles.actionCardsRow}>
          {/* Card A: Daily Schedule */}
          <View style={styles.prominentCard}>
            <View style={[styles.cardIconBox, { backgroundColor: '#FDEBE4' }]}>
              <Ionicons name="calendar" size={20} color="#8C331A" />
            </View>
            <Text style={styles.cardMainTitle}>Daily Schedule</Text>
            <Text style={styles.cardMainSub}>Manage automated customer deliveries</Text>

            <TouchableOpacity
              style={styles.cardActionButton}
              onPress={() => navigation?.navigate('CreateEditDailySchedule')}
              activeOpacity={0.85}
            >
              <Ionicons name="add" size={15} color="#FFFFFF" style={{ marginRight: 3 }} />
              <Text style={styles.cardActionButtonText}>+ Add Schedule</Text>
            </TouchableOpacity>
          </View>

          {/* Card B: Daily Billing */}
          <View style={styles.prominentCard}>
            <View style={[styles.cardIconBox, { backgroundColor: '#ECFDF5' }]}>
              <Ionicons name="receipt" size={20} color="#059669" />
            </View>
            <Text style={styles.cardMainTitle}>Daily Billing</Text>
            <Text style={styles.cardMainSub}>Manage daily bills and approvals</Text>

            <TouchableOpacity
              style={[styles.cardActionButton, { backgroundColor: '#059669' }]}
              onPress={() => {
                // Focus on ready to bill workflow or trigger instant daily bill
                if (readyToBillOrders.length > 0) {
                  setActiveTab('READY_TO_BILL');
                  handleOpenInvoicePreview(readyToBillOrders[0]);
                } else {
                  setActiveTab('READY_TO_BILL');
                  AppToast.info('Daily Bills', 'Select an approved delivered order below to generate bill.');
                }
              }}
              activeOpacity={0.85}
            >
              <Ionicons name="add" size={15} color="#FFFFFF" style={{ marginRight: 3 }} />
              <Text style={styles.cardActionButtonText}>+ Add Daily Bill</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* 3. SHARED SEARCH INPUT */}
        <View style={styles.searchBar}>
          <Ionicons name="search-outline" size={17} color="#888" style={{ marginRight: 8 }} />
          <TextInput
            placeholder="Search schedules or daily orders by customer/id..."
            placeholderTextColor="#988E85"
            style={styles.searchInput}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={17} color="#9CA3AF" />
            </TouchableOpacity>
          )}
        </View>

        {/* 4. SECTION: DAILY SCHEDULE MANAGEMENT DIRECTLY ON SCREEN */}
        <View style={styles.sectionHeaderRow}>
          <View style={styles.sectionTitleCol}>
            <Text style={styles.sectionHeading}>DAILY SCHEDULE</Text>
            <Text style={styles.sectionSubheading}>
              {displayedSchedules.length} active recurring customer route{displayedSchedules.length === 1 ? '' : 's'}
            </Text>
          </View>

          <TouchableOpacity
            style={styles.sectionActionPill}
            onPress={() => navigation?.navigate('DailySchedule')}
            activeOpacity={0.7}
          >
            <Text style={styles.sectionActionPillText}>View All ({schedules.length})</Text>
            <Ionicons name="chevron-forward" size={13} color="#8C331A" />
          </TouchableOpacity>
        </View>

        {displayedSchedules.length === 0 ? (
          <View style={styles.emptyMiniCard}>
            <Ionicons name="calendar-outline" size={28} color="#D1D5DB" style={{ marginBottom: 6 }} />
            <Text style={styles.emptyMiniTitle}>No Daily Schedules</Text>
            <Text style={styles.emptyMiniSub}>Tap "+ Add Schedule" above to configure automated routes.</Text>
          </View>
        ) : (
          displayedSchedules.slice(0, 3).map(sched => {
            const weekdaysMap = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
            const daysLabel = sched.weekdays
              ? sched.weekdays
                  .split(',')
                  .map(d => weekdaysMap[parseInt(d.trim(), 10)])
                  .filter(Boolean)
                  .join(', ')
              : 'Everyday';
            const timeDisplay = sched.delivery_time ? sched.delivery_time.substring(0, 5) : '10:00';

            return (
              <View key={sched.id} style={styles.managementCard}>
                <View style={styles.cardHeaderTop}>
                  <View style={{ flex: 1, marginRight: 8 }}>
                    <Text style={styles.cardTitle} numberOfLines={1}>{sched.customer_name}</Text>
                    <Text style={styles.cardSub} numberOfLines={1}>{sched.delivery_address || 'Store Route'}</Text>
                  </View>
                  <View style={[styles.statusBadge, sched.is_active ? styles.statusBadgeActive : styles.statusBadgePaused]}>
                    <Text style={[styles.statusBadgeText, sched.is_active ? styles.statusBadgeTextActive : styles.statusBadgeTextPaused]}>
                      {sched.is_active ? 'ACTIVE' : 'PAUSED'}
                    </Text>
                  </View>
                </View>

                {/* Timing & Weekdays Strip */}
                <View style={styles.inlineMetaStrip}>
                  <Ionicons name="time-outline" size={13} color="#8C331A" style={{ marginRight: 4 }} />
                  <Text style={styles.inlineMetaHighlight}>{timeDisplay}</Text>
                  <Text style={styles.inlineMetaDivider}>•</Text>
                  <Ionicons name="calendar-outline" size={12} color="#6B7280" style={{ marginRight: 4 }} />
                  <Text style={styles.inlineMetaText}>{daysLabel}</Text>
                </View>

                <View style={styles.partnerRow}>
                  <Ionicons name="bicycle-outline" size={14} color="#8C331A" style={{ marginRight: 5 }} />
                  <Text style={styles.partnerText}>
                    Fixed Partner: <Text style={styles.partnerTextBold}>{sched.delivery_partner_name}</Text>
                  </Text>
                </View>

                {/* Schedule Actions */}
                <View style={styles.managementActionRow}>
                  <TouchableOpacity
                    style={styles.miniActionBtn}
                    onPress={() => navigation?.navigate('CreateEditDailySchedule', { schedule: sched })}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="create-outline" size={13} color="#8C331A" style={{ marginRight: 4 }} />
                    <Text style={[styles.miniActionBtnText, { color: '#8C331A' }]}>Edit</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.miniActionBtn}
                    onPress={() => handleToggleSchedulePause(sched)}
                    activeOpacity={0.7}
                  >
                    <Ionicons
                      name={sched.is_active ? 'pause-circle-outline' : 'play-circle-outline'}
                      size={13}
                      color={sched.is_active ? '#D97706' : '#10B981'}
                      style={{ marginRight: 4 }}
                    />
                    <Text
                      style={[
                        styles.miniActionBtnText,
                        sched.is_active ? { color: '#D97706' } : { color: '#10B981' },
                      ]}
                    >
                      {sched.is_active ? 'Pause' : 'Resume'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })
        )}

        {/* 5. SECTION: DAILY BILLING MANAGEMENT DIRECTLY ON SCREEN */}
        <View style={[styles.sectionHeaderRow, { marginTop: 20 }]}>
          <View style={styles.sectionTitleCol}>
            <Text style={styles.sectionHeading}>DAILY BILLING</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 2 }}>
              <TouchableOpacity
                style={styles.dateChip}
                onPress={() => setShowDatePickerModal(true)}
                activeOpacity={0.7}
              >
                <Ionicons name="calendar-outline" size={12} color="#8C331A" style={{ marginRight: 4 }} />
                <Text style={styles.dateChipText}>{formattedDisplayDate}</Text>
                <Ionicons name="chevron-down" size={12} color="#8C331A" style={{ marginLeft: 2 }} />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Compact Filters for Daily Billing: Ready to Bill / Generated / Pending Approval */}
        <View style={styles.filterTabsRow}>
          <TouchableOpacity
            style={[styles.filterTab, activeTab === 'READY_TO_BILL' && styles.filterTabActive]}
            onPress={() => setActiveTab('READY_TO_BILL')}
            activeOpacity={0.7}
          >
            <Text style={[styles.filterTabText, activeTab === 'READY_TO_BILL' && styles.filterTabTextActive]}>
              Ready to Bill ({readyToBillOrders.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterTab, activeTab === 'GENERATED_BILLS' && styles.filterTabActive]}
            onPress={() => setActiveTab('GENERATED_BILLS')}
            activeOpacity={0.7}
          >
            <Text style={[styles.filterTabText, activeTab === 'GENERATED_BILLS' && styles.filterTabTextActive]}>
              Generated ({generatedInvoices.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterTab, activeTab === 'PENDING_APPROVAL' && styles.filterTabActive]}
            onPress={() => setActiveTab('PENDING_APPROVAL')}
            activeOpacity={0.7}
          >
            <Text style={[styles.filterTabText, activeTab === 'PENDING_APPROVAL' && styles.filterTabTextActive]}>
              Pending Approval ({pendingApprovalOrders.length})
            </Text>
          </TouchableOpacity>
        </View>

        {/* Daily Bills Content */}
        {loading ? (
          <ActivityIndicator size="large" color="#8C331A" style={{ marginVertical: 32 }} />
        ) : filteredBillingList.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons
              name={
                activeTab === 'READY_TO_BILL'
                  ? 'checkmark-done-circle-outline'
                  : activeTab === 'GENERATED_BILLS'
                  ? 'receipt-outline'
                  : 'time-outline'
              }
              size={36}
              color="#D1D5DB"
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
                ? 'Issued invoices for this date will appear here.'
                : 'No pending partner delivery actuals.'}
            </Text>
          </View>
        ) : (
          filteredBillingList.map((item: any) => {
            // TAB 1: Ready to Bill Card
            if (activeTab === 'READY_TO_BILL') {
              const order = item as BackendOrder;
              const itemsText = (order.items || [])
                .map(i => `${i.quantity}x ${i.product_details?.name || 'Item'}`)
                .join(' • ');

              return (
                <View key={order.id} style={styles.managementCard}>
                  <View style={styles.cardHeaderTop}>
                    <View>
                      <Text style={styles.cardIdText}>Order #{order.id}</Text>
                      <Text style={styles.cardTitle}>{order.company_name || order.customer_name}</Text>
                    </View>
                    <View style={styles.deliveredBadge}>
                      <Ionicons name="checkmark-circle" size={12} color="#059669" style={{ marginRight: 3 }} />
                      <Text style={styles.deliveredBadgeText}>DELIVERED</Text>
                    </View>
                  </View>

                  <Text style={styles.itemsSummaryText} numberOfLines={2}>
                    {itemsText || 'Delivered products ready for invoicing'}
                  </Text>

                  <View style={styles.billFooterRow}>
                    <View>
                      <Text style={styles.amountLabel}>Billable Amount</Text>
                      <Text style={styles.amountValue}>
                        ₹{parseFloat(order.total_amount || '0').toLocaleString('en-IN')}
                      </Text>
                    </View>

                    <TouchableOpacity
                      style={styles.primaryBillBtn}
                      onPress={() => handleOpenInvoicePreview(order)}
                      activeOpacity={0.85}
                    >
                      <Ionicons name="receipt-outline" size={14} color="#FFFFFF" style={{ marginRight: 4 }} />
                      <Text style={styles.primaryBillBtnText}>Generate Invoice</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            }

            // TAB 2: Generated Invoices Card
            if (activeTab === 'GENERATED_BILLS') {
              const invoice = item as BackendInvoice;
              const custName = invoice.customer_name || (invoice as any).name || 'Customer';
              const invNum = invoice.invoice_number || (invoice as any).invoiceNo || `INV-${invoice.id}`;
              const amountStr = invoice.grand_total || (invoice as any).amount || '0';
              const cleanAmount = parseFloat(String(amountStr).replace(/[^0-9.]/g, '') || '0');
              const isPaid = invoice.status === 'paid' || (invoice as any).status === 'PAID';

              return (
                <View key={invoice.id} style={styles.managementCard}>
                  <View style={styles.cardHeaderTop}>
                    <View>
                      <Text style={styles.cardIdText}>{invNum}</Text>
                      <Text style={styles.cardTitle}>{custName}</Text>
                    </View>
                    <View style={[styles.statusBadge, isPaid ? styles.statusBadgeActive : styles.statusBadgePaused]}>
                      <Text style={[styles.statusBadgeText, isPaid ? styles.statusBadgeTextActive : styles.statusBadgeTextPaused]}>
                        {isPaid ? 'PAID' : 'ISSUED'}
                      </Text>
                    </View>
                  </View>

                  <Text style={styles.itemsSummaryText}>
                    {invoice.notes || `Daily Invoice debited to ${custName}`}
                  </Text>

                  <View style={styles.billFooterRow}>
                    <View>
                      <Text style={styles.amountLabel}>Invoiced Amount</Text>
                      <Text style={styles.amountValue}>₹{cleanAmount.toLocaleString('en-IN')}</Text>
                    </View>

                    <TouchableOpacity
                      style={styles.viewInvoiceBtn}
                      onPress={() => navigation?.navigate('InvoiceDetail', { invoice })}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="eye-outline" size={14} color="#8C331A" style={{ marginRight: 4 }} />
                      <Text style={styles.viewInvoiceBtnText}>View Invoice</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            }

            // TAB 3: Pending Approval Order Card
            const order = item as BackendOrder;
            const itemsText = (order.items || [])
              .map(i => `${i.quantity}x ${i.product_details?.name || 'Item'}`)
              .join(' • ');

            return (
              <View key={order.id} style={styles.managementCard}>
                <View style={styles.cardHeaderTop}>
                  <View>
                    <Text style={styles.cardIdText}>Order #{order.id}</Text>
                    <Text style={styles.cardTitle}>{order.company_name || order.customer_name}</Text>
                  </View>
                  <View style={styles.pendingBadge}>
                    <Ionicons name="time-outline" size={12} color="#D97706" style={{ marginRight: 3 }} />
                    <Text style={styles.pendingBadgeText}>{order.status.replace(/_/g, ' ').toUpperCase()}</Text>
                  </View>
                </View>

                <Text style={styles.itemsSummaryText} numberOfLines={2}>
                  {itemsText || 'Order submitted • Pending Owner review & approval'}
                </Text>

                <View style={styles.billFooterRow}>
                  <View>
                    <Text style={styles.amountLabel}>Estimated Value</Text>
                    <Text style={styles.amountValue}>
                      ₹{parseFloat(order.total_amount || '0').toLocaleString('en-IN')}
                    </Text>
                  </View>

                  <TouchableOpacity
                    style={styles.reviewApproveBtn}
                    onPress={() => navigation?.navigate('OrderDetails', { orderId: order.id, order })}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="checkmark-done-circle-outline" size={14} color="#FFFFFF" style={{ marginRight: 4 }} />
                    <Text style={styles.reviewApproveBtnText}>Review & Approve</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>

      {/* Date Picker Modal */}
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
            ].map(item => (
              <TouchableOpacity
                key={item.offset}
                style={styles.dateOptionBtn}
                onPress={() => handleDateSelect(item.offset)}
                activeOpacity={0.7}
              >
                <Text style={styles.dateOptionText}>{item.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </Modal>

      {/* Invoice Preview Modal */}
      <Modal visible={previewModalVisible} transparent animationType="slide" onRequestClose={() => setPreviewModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.previewCard}>
            <View style={styles.previewHeader}>
              <View>
                <Text style={styles.previewTitle}>Review Daily Invoice</Text>
                <Text style={styles.previewSub}>
                  Order #{selectedOrder?.id} • {selectedOrder?.company_name || selectedOrder?.customer_name}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setPreviewModalVisible(false)}>
                <Ionicons name="close" size={22} color="#6B7280" />
              </TouchableOpacity>
            </View>

            {previewLoading ? (
              <ActivityIndicator size="large" color="#8C331A" style={{ marginVertical: 30 }} />
            ) : invoicePreview ? (
              <ScrollView style={{ maxHeight: 320 }} showsVerticalScrollIndicator={false}>
                <View style={styles.previewItemsTable}>
                  {(invoicePreview.items || []).map((it, idx) => (
                    <View key={idx} style={styles.previewItemRow}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.previewItemName}>{it.product_name}</Text>
                        <Text style={styles.previewItemSub}>
                          Delivered: {it.delivered_quantity} units @ ₹{it.effective_rate}
                        </Text>
                      </View>
                      <Text style={styles.previewItemTotal}>₹{it.line_total}</Text>
                    </View>
                  ))}
                </View>

                <View style={styles.previewTotalsRow}>
                  <Text style={styles.previewTotalsLabel}>Invoice Grand Total</Text>
                  <Text style={styles.previewTotalsValue}>₹{invoicePreview.grand_total}</Text>
                </View>
              </ScrollView>
            ) : null}

            <View style={styles.previewActions}>
              <TouchableOpacity
                style={styles.previewCancelBtn}
                onPress={() => setPreviewModalVisible(false)}
                activeOpacity={0.7}
              >
                <Text style={styles.previewCancelText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.previewConfirmBtn}
                onPress={handleConfirmGenerateInvoice}
                disabled={generating || previewLoading}
                activeOpacity={0.85}
              >
                {generating ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.previewConfirmText}>Confirm & Issue</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Confirmation Dialog */}
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
    backgroundColor: '#FAF8F5',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 40,
  },

  /* 2 Prominent Side-by-Side Action Cards */
  actionCardsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  prominentCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#EFEAE4',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
    justifyContent: 'space-between',
  },
  cardIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  cardMainTitle: {
    fontSize: 14,
    fontFamily: 'Inter-Bold',
    fontWeight: '800',
    color: '#1F2937',
  },
  cardMainSub: {
    fontSize: 10,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    marginTop: 2,
    lineHeight: 14,
    minHeight: 28,
  },
  cardActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#8C331A',
    paddingVertical: 7,
    borderRadius: 8,
    marginTop: 10,
  },
  cardActionButtonText: {
    fontSize: 11,
    fontFamily: 'Inter-Bold',
    fontWeight: '700',
    color: '#FFFFFF',
  },

  /* Search Bar */
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44,
    borderWidth: 1,
    borderColor: '#EFEAE4',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 2,
    elevation: 1,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    fontFamily: 'Inter-Regular',
    color: '#1F2937',
    padding: 0,
  },

  /* Section Header Rows */
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  sectionTitleCol: {
    flex: 1,
  },
  sectionHeading: {
    fontSize: 11,
    fontFamily: 'Inter-Bold',
    fontWeight: '800',
    color: '#8C331A',
    letterSpacing: 0.5,
  },
  sectionSubheading: {
    fontSize: 11,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    marginTop: 1,
  },
  sectionActionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FAF8F5',
    borderWidth: 1,
    borderColor: '#EFEAE4',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  sectionActionPillText: {
    fontSize: 11,
    fontFamily: 'Inter-SemiBold',
    color: '#8C331A',
    fontWeight: '700',
    marginRight: 2,
  },
  dateChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FAF8F5',
    borderWidth: 1,
    borderColor: '#F5C6B8',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  dateChipText: {
    fontSize: 11,
    fontFamily: 'Inter-SemiBold',
    fontWeight: '700',
    color: '#8C331A',
  },

  /* Management Card Styles */
  managementCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#EFEAE4',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 2,
    elevation: 1,
  },
  cardHeaderTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  cardIdText: {
    fontSize: 10,
    fontFamily: 'Inter-Bold',
    color: '#9CA3AF',
    marginBottom: 1,
  },
  cardTitle: {
    fontSize: 14,
    fontFamily: 'Inter-Bold',
    fontWeight: '700',
    color: '#1F2937',
  },
  cardSub: {
    fontSize: 11,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    marginTop: 1,
  },
  statusBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 10,
  },
  statusBadgeActive: {
    backgroundColor: '#ECFDF5',
  },
  statusBadgePaused: {
    backgroundColor: '#F3F4F6',
  },
  statusBadgeText: {
    fontSize: 9,
    fontFamily: 'Inter-Bold',
    fontWeight: '800',
  },
  statusBadgeTextActive: {
    color: '#065F46',
  },
  statusBadgeTextPaused: {
    color: '#4B5563',
  },
  deliveredBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 10,
  },
  deliveredBadgeText: {
    fontSize: 9,
    fontFamily: 'Inter-Bold',
    fontWeight: '800',
    color: '#065F46',
  },
  pendingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 10,
  },
  pendingBadgeText: {
    fontSize: 9,
    fontFamily: 'Inter-Bold',
    fontWeight: '800',
    color: '#92400E',
  },
  inlineMetaStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FAF8F5',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 6,
    marginBottom: 6,
  },
  inlineMetaHighlight: {
    fontSize: 12,
    fontFamily: 'Inter-Bold',
    color: '#8C331A',
    fontWeight: '700',
  },
  inlineMetaDivider: {
    marginHorizontal: 6,
    color: '#D1D5DB',
  },
  inlineMetaText: {
    fontSize: 11,
    fontFamily: 'Inter-Medium',
    color: '#4B5563',
  },
  partnerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  partnerText: {
    fontSize: 11,
    fontFamily: 'Inter-Regular',
    color: '#4B5563',
  },
  partnerTextBold: {
    fontFamily: 'Inter-SemiBold',
    fontWeight: '700',
    color: '#1F2937',
  },
  managementActionRow: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#F3EFEA',
    paddingTop: 8,
    gap: 8,
  },
  miniActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FAF8F5',
    borderWidth: 1,
    borderColor: '#EFEAE4',
    paddingVertical: 6,
    borderRadius: 6,
  },
  miniActionBtnText: {
    fontSize: 11,
    fontFamily: 'Inter-SemiBold',
    fontWeight: '700',
  },
  itemsSummaryText: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#4B5563',
    lineHeight: 16,
    marginBottom: 8,
  },
  billFooterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#F3EFEA',
    paddingTop: 8,
  },
  amountLabel: {
    fontSize: 10,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
  },
  amountValue: {
    fontSize: 14,
    fontFamily: 'Inter-Bold',
    fontWeight: '800',
    color: '#8C331A',
  },
  primaryBillBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#8C331A',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  primaryBillBtnText: {
    fontSize: 11,
    fontFamily: 'Inter-Bold',
    fontWeight: '700',
    color: '#FFFFFF',
  },
  viewInvoiceBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FAF8F5',
    borderWidth: 1,
    borderColor: '#EFEAE4',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  viewInvoiceBtnText: {
    fontSize: 11,
    fontFamily: 'Inter-SemiBold',
    fontWeight: '700',
    color: '#8C331A',
  },
  reviewApproveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#D97706',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  reviewApproveBtnText: {
    fontSize: 11,
    fontFamily: 'Inter-Bold',
    fontWeight: '700',
    color: '#FFFFFF',
  },

  /* Compact Filter Tabs for Daily Billing */
  filterTabsRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 10,
  },
  filterTab: {
    flex: 1,
    paddingVertical: 6,
    borderRadius: 8,
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#EFEAE4',
  },
  filterTabActive: {
    backgroundColor: '#8C331A',
    borderColor: '#8C331A',
  },
  filterTabText: {
    fontSize: 10,
    fontFamily: 'Inter-Medium',
    color: '#6B7280',
  },
  filterTabTextActive: {
    color: '#FFFFFF',
    fontFamily: 'Inter-Bold',
    fontWeight: '700',
  },

  /* Empty States */
  emptyMiniCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#EFEAE4',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  emptyMiniTitle: {
    fontSize: 12,
    fontFamily: 'Inter-Bold',
    fontWeight: '700',
    color: '#4B5563',
  },
  emptyMiniSub: {
    fontSize: 10,
    fontFamily: 'Inter-Regular',
    color: '#9CA3AF',
    marginTop: 2,
  },
  emptyContainer: {
    paddingVertical: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    fontSize: 14,
    fontFamily: 'Inter-Bold',
    fontWeight: '700',
    color: '#1F2937',
  },
  emptySub: {
    fontSize: 11,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 3,
  },

  /* Modals */
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  datePickerCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    width: '80%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 8,
  },
  datePickerTitle: {
    fontSize: 14,
    fontFamily: 'Inter-Bold',
    fontWeight: '800',
    color: '#1F2937',
    marginBottom: 12,
    textAlign: 'center',
  },
  dateOptionBtn: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F3EFEA',
  },
  dateOptionText: {
    fontSize: 13,
    fontFamily: 'Inter-Medium',
    color: '#1F2937',
    textAlign: 'center',
  },
  previewCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 8,
  },
  previewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  previewTitle: {
    fontSize: 16,
    fontFamily: 'Inter-Bold',
    fontWeight: '800',
    color: '#1F2937',
  },
  previewSub: {
    fontSize: 11,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    marginTop: 1,
  },
  previewItemsTable: {
    borderTopWidth: 1,
    borderTopColor: '#F3EFEA',
  },
  previewItemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F3EFEA',
  },
  previewItemName: {
    fontSize: 13,
    fontFamily: 'Inter-Bold',
    color: '#1F2937',
  },
  previewItemSub: {
    fontSize: 11,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    marginTop: 2,
  },
  previewItemTotal: {
    fontSize: 13,
    fontFamily: 'Inter-Bold',
    fontWeight: '700',
    color: '#8C331A',
  },
  previewTotalsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 10,
    marginTop: 6,
  },
  previewTotalsLabel: {
    fontSize: 14,
    fontFamily: 'Inter-Bold',
    fontWeight: '800',
    color: '#1F2937',
  },
  previewTotalsValue: {
    fontSize: 17,
    fontFamily: 'Inter-Bold',
    fontWeight: '800',
    color: '#8C331A',
  },
  previewActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 16,
  },
  previewCancelBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
  },
  previewCancelText: {
    fontSize: 12,
    fontFamily: 'Inter-SemiBold',
    fontWeight: '600',
    color: '#4B5563',
  },
  previewConfirmBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#8C331A',
    alignItems: 'center',
  },
  previewConfirmText: {
    fontSize: 12,
    fontFamily: 'Inter-Bold',
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
