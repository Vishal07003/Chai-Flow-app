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
import { Header, AppDatePicker, ConfirmDialog } from '../../components/common';
import { ReportsPagination } from '../../components/ReportsPagination';
import { BillReviewModal, BillReviewItem } from '../../components/billing/BillReviewModal';
import { useApp } from '../../context/AppContext';
import orderService, {
  DailyDeliverySchedule,
  BackendOrder,
} from '../../services/order.service';
import AppToast from '../../utils/toast';
import { colors } from '../../theme';

interface DailyBillsScreenProps {
  navigation?: any;
}

type MainTab = 'schedules' | 'ready_to_bill';
const FILTER_TABS = ['All', 'Active', 'Paused'] as const;
type FilterTab = (typeof FILTER_TABS)[number];

const WEEKDAYS_MAP = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export default function DailyBillsScreen({ navigation }: DailyBillsScreenProps) {
  const { refreshBackendData } = useApp();

  // Active top-level Tab: 'schedules' or 'ready_to_bill'
  const [activeMainTab, setActiveMainTab] = useState<MainTab>('ready_to_bill');

  // Search & Status Filter
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeFilter, setActiveFilter] = useState<FilterTab>('All');

  // Single expanded row state: only one row expanded at a time
  const [expandedScheduleId, setExpandedScheduleId] = useState<number | null>(null);

  // Pagination states for Schedules (20 records per page by default)
  const [schedulePage, setSchedulePage] = useState<number>(1);
  const [schedulePageSize, setSchedulePageSize] = useState<number>(20);

  // Pagination states for Ready to Bill orders
  const [readyPage, setReadyPage] = useState<number>(1);
  const [readyPageSize, setReadyPageSize] = useState<number>(20);

  // Data Loading
  const [schedules, setSchedules] = useState<DailyDeliverySchedule[]>([]);
  const [unbilledOrders, setUnbilledOrders] = useState<BackendOrder[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  // Bill Review Modal State
  const [selectedOrderForBill, setSelectedOrderForBill] = useState<BackendOrder | null>(null);
  const [billReviewModalVisible, setBillReviewModalVisible] = useState<boolean>(false);

  // Cancellation Modal State (Cancel Today / Specific Date)
  const [cancelModalVisible, setCancelModalVisible] = useState<boolean>(false);
  const [cancellingSchedule, setCancellingSchedule] = useState<DailyDeliverySchedule | null>(null);
  const [cancelDateInput, setCancelDateInput] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [cancelReasonInput, setCancelReasonInput] = useState<string>('');
  const [isCancellingDate, setIsCancellingDate] = useState<boolean>(false);

  // Delete / Cancel Entire Schedule Confirmation Dialog
  const [deleteDialogSchedule, setDeleteDialogSchedule] = useState<DailyDeliverySchedule | null>(null);
  const [isDeletingSchedule, setIsDeletingSchedule] = useState<boolean>(false);

  // Fetch Schedules and Unbilled Orders
  const fetchData = useCallback(async () => {
    try {
      const [scheduleList, unbilledList] = await Promise.all([
        orderService.getDailySchedules().catch(() => []),
        orderService.getOrders({ status: 'delivered', unbilled: true }).catch(() => []),
      ]);
      setSchedules(scheduleList || []);
      setUnbilledOrders(unbilledList || []);
    } catch (_err) {
      // Handled silently
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

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

  // Open Date Cancellation Modal
  const handleOpenCancelDate = (sched: DailyDeliverySchedule) => {
    setCancellingSchedule(sched);
    setCancelDateInput(new Date().toISOString().split('T')[0]);
    setCancelReasonInput('');
    setCancelModalVisible(true);
  };

  // Submit Date Cancellation
  const handleSubmitCancelDate = async () => {
    if (!cancellingSchedule) return;
    setIsCancellingDate(true);
    try {
      const res = await orderService.cancelDateDelivery(
        cancellingSchedule.id,
        cancelDateInput,
        cancelReasonInput.trim()
      );
      setCancelModalVisible(false);
      fetchData();
      AppToast.info(
        res.case === 'B' ? "Today's Delivery Cancelled" : 'Delivery Date Skipped',
        res.message
      );
    } catch (err: any) {
      AppToast.error('Cancellation Failed', err?.message || 'Could not cancel delivery for selected date.');
    } finally {
      setIsCancellingDate(false);
    }
  };

  // Confirm and Execute Entire Schedule Cancellation (Deletes / Cancels permanent schedule)
  const handleConfirmDeleteEntireSchedule = async () => {
    if (!deleteDialogSchedule) return;
    setIsDeletingSchedule(true);
    try {
      await orderService.deleteDailySchedule(deleteDialogSchedule.id);
      AppToast.success('Schedule Cancelled', `Schedule for ${deleteDialogSchedule.customer_name} has been cancelled.`);
      setDeleteDialogSchedule(null);
      fetchData();
    } catch (err: any) {
      AppToast.error('Failed to Cancel Schedule', err?.message || 'Could not cancel schedule.');
    } finally {
      setIsDeletingSchedule(false);
    }
  };

  // Open Bill Review Modal for an unbilled delivered order
  const handleOpenBillReview = (order: BackendOrder) => {
    setSelectedOrderForBill(order);
    setBillReviewModalVisible(true);
  };

  // Save reviewed bill directly -> Generates manual invoice
  const handleSaveReviewedBill = async (payload: {
    items: Array<{ product_id: number | null; product_name: string; quantity: number; unit_price: string }>;
    discount_amount: string;
    notes: string;
    due_date: string | null;
  }) => {
    if (!selectedOrderForBill) return;
    const itemsPayload = payload.items.map(it => ({
      product_id: it.product_id ? Number(it.product_id) : 0,
      quantity: it.quantity,
      unit_price: it.unit_price,
      product_name: it.product_name,
    }));

    const result = await orderService.generateManualInvoice(selectedOrderForBill.id, {
      items: itemsPayload,
      discount_amount: payload.discount_amount,
      notes: payload.notes,
      due_date: payload.due_date,
    });

    setBillReviewModalVisible(false);
    setSelectedOrderForBill(null);
    fetchData();
    refreshBackendData();

    if (result && result.invoice) {
      navigation?.navigate('InvoiceDetail', { invoice: result.invoice });
    }
  };

  // Filtered schedules for direct management on Billing
  const filteredSchedules = useMemo(() => {
    return schedules.filter(s => {
      // 1. Status Filter
      if (activeFilter === 'Active' && !s.is_active) return false;
      if (activeFilter === 'Paused' && s.is_active) return false;

      // 2. Search Query (Customer name, Customer ID, Delivery Partner, Delivery Area/Address)
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesName = (s.customer_name || '').toLowerCase().includes(q);
        const matchesCustomerId = String(s.customer_profile || '').includes(q) || String(s.id).includes(q);
        const matchesPartner = (s.delivery_partner_name || '').toLowerCase().includes(q);
        const matchesAddress = (s.delivery_address || '').toLowerCase().includes(q);
        if (!matchesName && !matchesCustomerId && !matchesPartner && !matchesAddress) return false;
      }

      return true;
    });
  }, [schedules, activeFilter, searchQuery]);

  // Filtered Ready to Bill Orders
  const filteredReadyOrders = useMemo(() => {
    if (!searchQuery.trim()) return unbilledOrders;
    const q = searchQuery.toLowerCase().trim();
    return unbilledOrders.filter(o => {
      const matchesOrderNo = (o.order_number || '').toLowerCase().includes(q) || String(o.id).includes(q);
      const matchesCustomer = (o.customer_name || '').toLowerCase().includes(q) || String(o.customer || '').includes(q);
      const matchesPartner = (o.delivery_partner_name || '').toLowerCase().includes(q);
      const matchesAddress = (o.delivery_address || '').toLowerCase().includes(q);
      return matchesOrderNo || matchesCustomer || matchesPartner || matchesAddress;
    });
  }, [unbilledOrders, searchQuery]);

  // Counts for live filters
  const allCount = schedules.length;
  const activeCount = useMemo(() => schedules.filter(s => s.is_active).length, [schedules]);
  const pausedCount = useMemo(() => schedules.filter(s => !s.is_active).length, [schedules]);
  const readyToBillCount = unbilledOrders.length;

  // Reset pagination when search or filter changes
  useEffect(() => {
    setSchedulePage(1);
    setReadyPage(1);
  }, [searchQuery, activeFilter, activeMainTab]);

  // Paginated Schedules
  const paginatedSchedules = useMemo(() => {
    const start = (schedulePage - 1) * schedulePageSize;
    return filteredSchedules.slice(start, start + schedulePageSize);
  }, [filteredSchedules, schedulePage, schedulePageSize]);

  // Paginated Ready to Bill orders
  const paginatedReadyOrders = useMemo(() => {
    const start = (readyPage - 1) * readyPageSize;
    return filteredReadyOrders.slice(start, start + readyPageSize);
  }, [filteredReadyOrders, readyPage, readyPageSize]);

  // Items for BillReviewModal
  const billReviewInitialItems: BillReviewItem[] = useMemo(() => {
    if (!selectedOrderForBill) return [];
    return (selectedOrderForBill.items || []).map(it => ({
      id: it.id,
      product_id: it.product,
      product_name: it.product_name || `Product #${it.product}`,
      ordered_quantity: it.ordered_quantity ?? it.quantity,
      quantity: it.delivered_quantity !== undefined && it.delivered_quantity !== null
        ? it.delivered_quantity
        : it.quantity,
      unit_price: String(it.unit_price || '0'),
      has_discrepancy: it.has_discrepancy,
    }));
  }, [selectedOrderForBill]);

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      {/* 1. Header (Standard Owner header matching Home and Customers) */}
      <Header title="Billing" showNotification={true} />

      {/* 2. ScrollView with Sticky Search Bar immediately below Header */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        stickyHeaderIndices={[1]}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />
        }
      >
        {/* INDEX 0: TOP TWO COMPACT ACTION CARDS (SIDE BY SIDE: 2 FULL-CARD BUTTONS) */}
        <View style={styles.actionCardsRow}>
          {/* Card 1: Daily Schedule (Entire card navigates DIRECTLY to CreateEditDailySchedule in CREATE mode) */}
          <TouchableOpacity
            style={styles.compactActionCard}
            onPress={() => navigation?.navigate('CreateEditDailySchedule')}
            activeOpacity={0.75}
          >
            <View style={styles.compactIconBox}>
              <Ionicons name="calendar-outline" size={24} color="#8C331A" />
            </View>
            <Text style={styles.compactCardTitle} numberOfLines={1}>Daily Schedule</Text>
          </TouchableOpacity>

          {/* Card 2: Quick Billing (Entire card navigates to QuickBilling) */}
          <TouchableOpacity
            style={styles.compactActionCard}
            onPress={() => navigation?.navigate('QuickBilling')}
            activeOpacity={0.75}
          >
            <View style={styles.compactIconBox}>
              <Ionicons name="receipt-outline" size={24} color="#8C331A" />
            </View>
            <Text style={styles.compactCardTitle} numberOfLines={1}>Quick Billing</Text>
          </TouchableOpacity>
        </View>

        {/* INDEX 1: STICKY SEARCH & TAB BAR */}
        <View style={styles.stickySearchWrapper}>
          {/* Main Segmented Tabs: Ready to Bill vs Daily Schedules */}
          <View style={styles.mainTabBar}>
            <TouchableOpacity
              style={[styles.mainTabBtn, activeMainTab === 'ready_to_bill' && styles.mainTabBtnActive]}
              onPress={() => setActiveMainTab('ready_to_bill')}
              activeOpacity={0.75}
            >
              <Ionicons
                name="checkmark-circle-outline"
                size={16}
                color={activeMainTab === 'ready_to_bill' ? '#FFFFFF' : '#8C331A'}
                style={{ marginRight: 6 }}
              />
              <Text
                style={[
                  styles.mainTabText,
                  activeMainTab === 'ready_to_bill' && styles.mainTabTextActive,
                ]}
              >
                Ready to Bill
              </Text>
              {readyToBillCount > 0 && (
                <View
                  style={[
                    styles.countPill,
                    activeMainTab === 'ready_to_bill' ? styles.countPillActive : styles.countPillInactive,
                  ]}
                >
                  <Text
                    style={[
                      styles.countPillText,
                      activeMainTab === 'ready_to_bill' ? styles.countPillTextActive : styles.countPillTextInactive,
                    ]}
                  >
                    {readyToBillCount}
                  </Text>
                </View>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.mainTabBtn, activeMainTab === 'schedules' && styles.mainTabBtnActive]}
              onPress={() => setActiveMainTab('schedules')}
              activeOpacity={0.75}
            >
              <Ionicons
                name="calendar-outline"
                size={16}
                color={activeMainTab === 'schedules' ? '#FFFFFF' : '#8C331A'}
                style={{ marginRight: 6 }}
              />
              <Text
                style={[
                  styles.mainTabText,
                  activeMainTab === 'schedules' && styles.mainTabTextActive,
                ]}
              >
                Daily Schedules
              </Text>
              <View
                style={[
                  styles.countPill,
                  activeMainTab === 'schedules' ? styles.countPillActive : styles.countPillInactive,
                ]}
              >
                <Text
                  style={[
                    styles.countPillText,
                    activeMainTab === 'schedules' ? styles.countPillTextActive : styles.countPillTextInactive,
                  ]}
                >
                  {allCount}
                </Text>
              </View>
            </TouchableOpacity>
          </View>

          {/* Search Bar */}
          <View style={styles.searchBar}>
            <Ionicons name="search-outline" size={17} color="#888" style={{ marginRight: 8 }} />
            <TextInput
              placeholder={
                activeMainTab === 'ready_to_bill'
                  ? 'Search order, customer, delivery partner...'
                  : 'Search customer, ID, partner or area...'
              }
              placeholderTextColor="#988E85"
              style={styles.searchInput}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Ionicons name="close-circle" size={17} color="#9CA3AF" />
              </TouchableOpacity>
            )}
          </View>

          {/* Sub-Filters for Daily Schedules Only */}
          {activeMainTab === 'schedules' && (
            <View style={styles.filterTabsRow}>
              {FILTER_TABS.map(tab => {
                const isSelected = activeFilter === tab;
                const count = tab === 'All' ? allCount : tab === 'Active' ? activeCount : pausedCount;
                return (
                  <TouchableOpacity
                    key={tab}
                    style={[styles.filterChip, isSelected && styles.filterChipActive]}
                    onPress={() => setActiveFilter(tab)}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.filterChipText, isSelected && styles.filterChipTextActive]}>
                      {tab} ({count})
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </View>

        {/* INDEX 2: MAIN SECTIONS CONTENT */}
        <View style={styles.mainSectionsContainer}>
          {activeMainTab === 'ready_to_bill' ? (
            /* ================= READY TO BILL TAB ================= */
            <>
              <View style={styles.sectionHeaderRow}>
                <View style={styles.sectionTitleCol}>
                  <Text style={styles.sectionHeading}>APPROVED DELIVERIES AWAITING BILLING</Text>
                  <Text style={styles.sectionSubheading}>
                    {filteredReadyOrders.length} order{filteredReadyOrders.length === 1 ? '' : 's'} ready to review & generate invoice
                  </Text>
                </View>
              </View>

              {loading ? (
                <ActivityIndicator size="large" color="#8C331A" style={{ marginVertical: 32 }} />
              ) : filteredReadyOrders.length === 0 ? (
                <View style={styles.emptyMiniCard}>
                  <Ionicons name="checkmark-done-circle-outline" size={32} color="#10B981" style={{ marginBottom: 6 }} />
                  <Text style={styles.emptyMiniTitle}>All Caught Up!</Text>
                  <Text style={styles.emptyMiniSub}>
                    {searchQuery
                      ? `No unbilled orders matching "${searchQuery}"`
                      : 'No unbilled deliveries pending review. Completed deliveries appear here for billing.'}
                  </Text>
                </View>
              ) : (
                <>
                  {paginatedReadyOrders.map(order => {
                    const deliveredTotal = (order.items || []).reduce((sum, it) => {
                      const qty = it.delivered_quantity !== undefined && it.delivered_quantity !== null
                        ? it.delivered_quantity
                        : it.quantity;
                      const price = parseFloat(String(it.unit_price || '0'));
                      return sum + price * qty;
                    }, 0);

                    const timeStr = order.scheduled_delivery_time || order.delivery_time || (order.created_at ? order.created_at.substring(11, 16) : 'Delivered');
                    const dateStr = order.scheduled_delivery_date || order.delivery_date || (order.created_at ? order.created_at.substring(0, 10) : '');

                    return (
                      <View key={order.id} style={styles.readyOrderCard}>
                        {/* Order Header */}
                        <View style={styles.readyCardHeader}>
                          <View style={{ flex: 1 }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                              <Text style={styles.readyOrderNumber}>#{order.order_number || `ORD-${order.id}`}</Text>
                              <View style={styles.readyStatusBadge}>
                                <Text style={styles.readyStatusText}>DELIVERED</Text>
                              </View>
                            </View>
                            <Text style={styles.readyCustomerName}>{order.customer_name || 'Walk-in Customer'}</Text>
                          </View>
                          <View style={{ alignItems: 'flex-end' }}>
                            <Text style={styles.readyEstimatedLabel}>Estimated Total</Text>
                            <Text style={styles.readyEstimatedAmount}>₹{deliveredTotal.toFixed(0)}</Text>
                          </View>
                        </View>

                        {/* Order Details: Partner & Delivery Timestamp */}
                        <View style={styles.readyMetaRow}>
                          <View style={styles.readyMetaItem}>
                            <Ionicons name="bicycle-outline" size={13} color="#8C331A" style={{ marginRight: 4 }} />
                            <Text style={styles.readyMetaText} numberOfLines={1}>
                              {order.delivery_partner_name || 'Unassigned'}
                            </Text>
                          </View>
                          <Text style={styles.readyMetaDot}>•</Text>
                          <View style={styles.readyMetaItem}>
                            <Ionicons name="time-outline" size={13} color="#6B7280" style={{ marginRight: 4 }} />
                            <Text style={styles.readyMetaText}>
                              {timeStr}
                              {dateStr ? ` on ${dateStr}` : ''}
                            </Text>
                          </View>
                        </View>

                        {/* Delivered Items Summary */}
                        <View style={styles.readyItemsBox}>
                          <Text style={styles.readyItemsTitle}>DELIVERED PRODUCTS</Text>
                          {(order.items || []).map(it => {
                            const actualQty = it.delivered_quantity !== undefined && it.delivered_quantity !== null
                              ? it.delivered_quantity
                              : it.quantity;
                            const isDiscrepant = it.has_discrepancy;
                            return (
                              <View key={it.id} style={styles.readyItemRow}>
                                <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center' }}>
                                  <Text style={styles.readyItemName} numberOfLines={1}>
                                    {actualQty}x {it.product_name}
                                  </Text>
                                  {isDiscrepant && (
                                    <View style={styles.discrepancyPill}>
                                      <Text style={styles.discrepancyPillText}>
                                        Ordered: {it.ordered_quantity ?? it.quantity}
                                      </Text>
                                    </View>
                                  )}
                                </View>
                                <Text style={styles.readyItemPrice}>
                                  ₹{(parseFloat(String(it.unit_price || '0')) * actualQty).toFixed(0)}
                                </Text>
                              </View>
                            );
                          })}
                        </View>

                        {/* Review & Bill Button */}
                        <TouchableOpacity
                          style={styles.reviewBillBtn}
                          onPress={() => handleOpenBillReview(order)}
                          activeOpacity={0.85}
                        >
                          <Ionicons name="receipt-outline" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
                          <Text style={styles.reviewBillBtnText}>Review & Save Bill</Text>
                        </TouchableOpacity>
                      </View>
                    );
                  })}

                  {/* Pagination for Ready to Bill */}
                  {filteredReadyOrders.length > 0 && (
                    <View style={styles.paginationWrapper}>
                      <ReportsPagination
                        currentPage={readyPage}
                        totalRecords={filteredReadyOrders.length}
                        pageSize={readyPageSize}
                        onPageChange={newPage => setReadyPage(newPage)}
                        onPageSizeChange={newSize => {
                          setReadyPageSize(newSize);
                          setReadyPage(1);
                        }}
                      />
                    </View>
                  )}
                </>
              )}
            </>
          ) : (
            /* ================= DAILY SCHEDULES TAB ================= */
            <>
              <View style={styles.sectionHeaderRow}>
                <View style={styles.sectionTitleCol}>
                  <Text style={styles.sectionHeading}>DAILY SCHEDULE CUSTOMERS</Text>
                  <Text style={styles.sectionSubheading}>
                    Showing {filteredSchedules.length} of {allCount} schedules
                  </Text>
                </View>
              </View>

              {loading ? (
                <ActivityIndicator size="large" color="#8C331A" style={{ marginVertical: 32 }} />
              ) : filteredSchedules.length === 0 ? (
                <View style={styles.emptyMiniCard}>
                  <Ionicons name="calendar-outline" size={28} color="#D1D5DB" style={{ marginBottom: 6 }} />
                  <Text style={styles.emptyMiniTitle}>No Schedules Found</Text>
                  <Text style={styles.emptyMiniSub}>
                    {searchQuery ? `No schedules matching "${searchQuery}"` : 'Tap the Daily Schedule card to create daily delivery schedules.'}
                  </Text>
                </View>
              ) : (
                <>
                  {paginatedSchedules.map(sched => {
                    const isExpanded = expandedScheduleId === sched.id;

                    const daysLabel = sched.weekdays
                      ? sched.weekdays
                        .split(',')
                        .map(d => WEEKDAYS_MAP[parseInt(d.trim(), 10)])
                        .filter(Boolean)
                        .join(', ')
                      : 'Everyday (All 7 Days)';

                    const timeDisplay = sched.delivery_time ? sched.delivery_time.substring(0, 5) : '10:00';

                    // Calculate estimated daily total
                    const estimatedDailyTotal = (sched.items || []).reduce((sum, item) => {
                      const price = parseFloat(item.unit_price) || parseFloat(item.product_price) || 0;
                      return sum + price * item.quantity;
                    }, 0);

                    return (
                      <View key={sched.id} style={styles.expandableCard}>
                        {/* Collapsed Header / Main Touch Row */}
                        <TouchableOpacity
                          activeOpacity={0.8}
                          onPress={() => setExpandedScheduleId(isExpanded ? null : sched.id)}
                          style={[styles.collapsedHeaderRow, isExpanded && styles.collapsedHeaderRowOpen]}
                        >
                          <View style={styles.collapsedLeftCol}>
                            <View style={styles.customerNameLine}>
                              <Text style={styles.customerNameText} numberOfLines={1}>
                                {sched.customer_name}
                              </Text>
                              <View
                                style={[
                                  styles.miniStatusBadge,
                                  sched.is_active ? styles.statusBadgeActive : styles.statusBadgePaused,
                                ]}
                              >
                                <View
                                  style={[
                                    styles.miniStatusDot,
                                    { backgroundColor: sched.is_active ? '#10B981' : '#9CA3AF' },
                                  ]}
                                />
                                <Text
                                  style={[
                                    styles.miniStatusText,
                                    sched.is_active ? styles.statusTextActive : styles.statusTextPaused,
                                  ]}
                                >
                                  {sched.is_active ? 'ACTIVE' : 'PAUSED'}
                                </Text>
                              </View>
                            </View>

                            {/* Delivery Area & Delivery Time & Fixed Partner */}
                            <View style={styles.collapsedMetaLine}>
                              <Ionicons name="time-outline" size={13} color="#8C331A" style={{ marginRight: 3 }} />
                              <Text style={styles.metaTimeHighlight}>{timeDisplay}</Text>
                              <Text style={styles.metaDot}>•</Text>
                              <Ionicons name="location-outline" size={13} color="#6B7280" style={{ marginRight: 2 }} />
                              <Text style={styles.metaAreaText} numberOfLines={1}>
                                {sched.delivery_address || 'Counter / Shop'}
                              </Text>
                              <Text style={styles.metaDot}>•</Text>
                              <Ionicons name="bicycle-outline" size={13} color="#6B7280" style={{ marginRight: 3 }} />
                              <Text style={styles.metaPartnerText} numberOfLines={1}>
                                {sched.delivery_partner_name || 'Unassigned'}
                              </Text>
                            </View>
                          </View>

                          {/* Chevron Toggle */}
                          <View style={styles.chevronWrap}>
                            <Ionicons
                              name={isExpanded ? 'chevron-up' : 'chevron-down'}
                              size={18}
                              color="#8C331A"
                            />
                          </View>
                        </TouchableOpacity>

                        {/* Expanded Content Section */}
                        {isExpanded && (
                          <View style={styles.expandedDetailsSection}>
                            <View style={styles.detailDivider} />

                            {/* Delivery Weekdays */}
                            <View style={styles.detailDataRow}>
                              <Text style={styles.detailLabel}>Delivery Weekdays:</Text>
                              <Text style={styles.detailValue} numberOfLines={1}>{daysLabel}</Text>
                            </View>

                            {/* Fixed Partner */}
                            <View style={styles.detailDataRow}>
                              <Text style={styles.detailLabel}>Fixed Delivery Partner:</Text>
                              <Text style={[styles.detailValue, { fontWeight: '700', color: '#8C331A' }]}>
                                {sched.delivery_partner_name || 'Auto / None'}
                              </Text>
                            </View>

                            {/* Notification Lead Time */}
                            <View style={styles.detailDataRow}>
                              <Text style={styles.detailLabel}>Notification Lead Time:</Text>
                              <Text style={styles.detailValue}>
                                {sched.notification_lead_time_minutes || 30} minutes before delivery
                              </Text>
                            </View>

                            {/* Next Delivery Date */}
                            <View style={styles.detailDataRow}>
                              <Text style={styles.detailLabel}>Next Delivery Date:</Text>
                              <Text style={styles.detailValue}>
                                {sched.next_scheduled_delivery || sched.start_date || 'Today (Active)'}
                              </Text>
                            </View>

                            {/* Products and Quantities */}
                            <View style={styles.productsBox}>
                              <Text style={styles.productsBoxTitle}>SCHEDULED PRODUCTS</Text>
                              {(sched.items || []).length === 0 ? (
                                <Text style={styles.noProductsText}>No items configured</Text>
                              ) : (
                                sched.items.map(it => (
                                  <View key={it.id} style={styles.productItemLine}>
                                    <Text style={styles.productNameAndQty} numberOfLines={1}>
                                      {it.quantity}x {it.product_name}
                                    </Text>
                                    <Text style={styles.productLinePrice}>
                                      ₹{(parseFloat(it.unit_price || it.product_price || '0') * it.quantity).toFixed(0)}
                                    </Text>
                                  </View>
                                ))
                              )}
                            </View>

                            {/* Estimated Daily Total */}
                            <View style={styles.dailyTotalRow}>
                              <Text style={styles.dailyTotalLabel}>Estimated Daily Total:</Text>
                              <Text style={styles.dailyTotalValue}>₹{estimatedDailyTotal.toFixed(0)}</Text>
                            </View>

                            {/* Action Buttons: Edit | Pause/Resume | Cancel Today | Cancel Entire Schedule */}
                            <View style={styles.actionsGrid}>
                              {/* Edit */}
                              <TouchableOpacity
                                style={[styles.actionBtn, styles.editBtn]}
                                onPress={() => navigation?.navigate('CreateEditDailySchedule', { schedule: sched })}
                                activeOpacity={0.7}
                              >
                                <Ionicons name="create-outline" size={14} color="#8C331A" style={{ marginRight: 4 }} />
                                <Text style={[styles.actionBtnText, { color: '#8C331A' }]}>Edit</Text>
                              </TouchableOpacity>

                              {/* Pause / Resume */}
                              <TouchableOpacity
                                style={[styles.actionBtn, sched.is_active ? styles.pauseBtn : styles.resumeBtn]}
                                onPress={() => handleToggleSchedulePause(sched)}
                                activeOpacity={0.7}
                              >
                                <Ionicons
                                  name={sched.is_active ? 'pause-circle-outline' : 'play-circle-outline'}
                                  size={14}
                                  color={sched.is_active ? '#D97706' : '#10B981'}
                                  style={{ marginRight: 4 }}
                                />
                                <Text
                                  style={[
                                    styles.actionBtnText,
                                    sched.is_active ? { color: '#D97706' } : { color: '#10B981' },
                                  ]}
                                >
                                  {sched.is_active ? 'Pause' : 'Resume'}
                                </Text>
                              </TouchableOpacity>

                              {/* Cancel Today */}
                              <TouchableOpacity
                                style={[styles.actionBtn, styles.cancelDateBtn]}
                                onPress={() => handleOpenCancelDate(sched)}
                                activeOpacity={0.7}
                              >
                                <Ionicons name="close-circle-outline" size={14} color="#DC2626" style={{ marginRight: 4 }} />
                                <Text style={[styles.actionBtnText, { color: '#DC2626' }]}>Cancel Today</Text>
                              </TouchableOpacity>

                              {/* Cancel Entire Schedule */}
                              <TouchableOpacity
                                style={[styles.actionBtn, styles.deleteScheduleBtn]}
                                onPress={() => setDeleteDialogSchedule(sched)}
                                activeOpacity={0.7}
                              >
                                <Ionicons name="trash-outline" size={14} color="#991B1B" style={{ marginRight: 4 }} />
                                <Text style={[styles.actionBtnText, { color: '#991B1B' }]}>Cancel Entire</Text>
                              </TouchableOpacity>
                            </View>
                          </View>
                        )}
                      </View>
                    );
                  })}

                  {/* ReportsPagination Component */}
                  {filteredSchedules.length > 0 && (
                    <View style={styles.paginationWrapper}>
                      <ReportsPagination
                        currentPage={schedulePage}
                        totalRecords={filteredSchedules.length}
                        pageSize={schedulePageSize}
                        onPageChange={newPage => setSchedulePage(newPage)}
                        onPageSizeChange={newSize => {
                          setSchedulePageSize(newSize);
                          setSchedulePage(1);
                        }}
                      />
                    </View>
                  )}
                </>
              )}
            </>
          )}
        </View>
      </ScrollView>

      {/* Bill Review Modal (Create invoice from delivered order) */}
      {selectedOrderForBill && (
        <BillReviewModal
          visible={billReviewModalVisible}
          onClose={() => {
            setBillReviewModalVisible(false);
            setSelectedOrderForBill(null);
          }}
          mode="create_from_order"
          orderId={selectedOrderForBill.id}
          customerName={selectedOrderForBill.customer_name || 'Customer'}
          deliveryPartnerName={selectedOrderForBill.delivery_partner_name || undefined}
          deliveryDate={selectedOrderForBill.scheduled_delivery_date || selectedOrderForBill.delivery_date || undefined}
          deliveryTime={selectedOrderForBill.scheduled_delivery_time || selectedOrderForBill.delivery_time || undefined}
          initialItems={billReviewInitialItems}
          initialDiscount={String(selectedOrderForBill.discount_amount || '0')}
          initialNotes={selectedOrderForBill.notes || ''}
          initialDueDate={null}
          onSaveSuccess={() => {
            setBillReviewModalVisible(false);
            setSelectedOrderForBill(null);
          }}
          saveAction={handleSaveReviewedBill}
        />
      )}

      {/* Date-Specific Cancellation Dialog */}
      <Modal
        visible={cancelModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setCancelModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.cancelBox}>
            <View style={styles.cancelHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Ionicons name="alert-circle" size={20} color="#DC2626" style={{ marginRight: 6 }} />
                <Text style={styles.cancelTitle}>Cancel Delivery Date</Text>
              </View>
              <TouchableOpacity onPress={() => setCancelModalVisible(false)}>
                <Ionicons name="close" size={20} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <Text style={styles.cancelSub}>
              Skip delivery for {cancellingSchedule?.customer_name} on a specific date. Future scheduled deliveries will remain active.
            </Text>

            <AppDatePicker
              label="TARGET DATE"
              value={cancelDateInput}
              onChange={setCancelDateInput}
              placeholder="Select Target Date"
              modalTitle="Select Cancel Date"
              style={{ marginBottom: 12 }}
            />

            <Text style={styles.inputLabel}>REASON (OPTIONAL)</Text>
            <View style={styles.dateInputWrap}>
              <TextInput
                style={styles.modalTextInput}
                value={cancelReasonInput}
                onChangeText={setCancelReasonInput}
                placeholder="e.g. Office closed / Customer holiday"
                placeholderTextColor="#9CA3AF"
              />
            </View>

            <View style={styles.cancelModalActions}>
              <TouchableOpacity
                style={styles.modalSecondaryBtn}
                onPress={() => setCancelModalVisible(false)}
                activeOpacity={0.7}
                disabled={isCancellingDate}
              >
                <Text style={styles.modalSecondaryText}>Go Back</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalDangerBtn, isCancellingDate && { opacity: 0.7 }]}
                onPress={handleSubmitCancelDate}
                activeOpacity={0.8}
                disabled={isCancellingDate}
              >
                {isCancellingDate ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.modalDangerText}>Confirm Skip</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Confirmation Dialog: Cancel Entire Schedule */}
      <ConfirmDialog
        visible={deleteDialogSchedule !== null}
        title="Cancel Entire Schedule?"
        description={`Are you sure you want to completely cancel and remove the daily delivery schedule for "${deleteDialogSchedule?.customer_name}"? This action cannot be undone.`}
        type="danger"
        confirmLabel="Cancel Schedule"
        cancelLabel="Keep Active"
        loading={isDeletingSchedule}
        onConfirm={handleConfirmDeleteEntireSchedule}
        onCancel={() => setDeleteDialogSchedule(null)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAF5F0',
  },
  scrollContent: {
    paddingBottom: 40,
  },

  /* Top 2 Compact Action Cards */
  actionCardsRow: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 10,
    backgroundColor: '#FAF5F0',
  },
  compactActionCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderWidth: 1.5,
    borderColor: '#E8D7CE',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#8C331A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  compactIconBox: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FDF2EC',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  compactCardTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#2C1810',
    textAlign: 'center',
  },

  /* Sticky Search & Tab Bar Wrapper */
  stickySearchWrapper: {
    backgroundColor: '#FAF5F0',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E8D7CE',
    zIndex: 10,
  },

  /* Segmented Main Tabs */
  mainTabBar: {
    flexDirection: 'row',
    backgroundColor: '#EFE7E0',
    borderRadius: 12,
    padding: 3,
    marginBottom: 8,
  },
  mainTabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 9,
  },
  mainTabBtnActive: {
    backgroundColor: '#8C331A',
  },
  mainTabText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#8C331A',
  },
  mainTabTextActive: {
    color: '#FFFFFF',
  },
  countPill: {
    marginLeft: 6,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 8,
  },
  countPillActive: {
    backgroundColor: '#FFFFFF',
  },
  countPillInactive: {
    backgroundColor: '#FDEBE4',
  },
  countPillText: {
    fontSize: 10,
    fontWeight: '800',
  },
  countPillTextActive: {
    color: '#8C331A',
  },
  countPillTextInactive: {
    color: '#8C331A',
  },

  /* Search Bar */
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 42,
    borderWidth: 1.5,
    borderColor: '#E8D7CE',
    shadowColor: '#8C331A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: '#2C1810',
    padding: 0,
  },

  /* Filter Tabs Row (Daily Schedules Only) */
  filterTabsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E8D7CE',
  },
  filterChipActive: {
    backgroundColor: '#8C331A',
    borderColor: '#8C331A',
  },
  filterChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#6B7280',
  },
  filterChipTextActive: {
    color: '#FFFFFF',
  },

  /* Main Sections Container */
  mainSectionsContainer: {
    paddingHorizontal: 16,
    paddingTop: 12,
  },

  /* Section Header */
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
    fontWeight: '800',
    color: '#8C331A',
    letterSpacing: 0.5,
  },
  sectionSubheading: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 1,
  },

  /* Ready to Bill Order Card */
  readyOrderCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1.5,
    borderColor: '#E8D7CE',
    shadowColor: '#8C331A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  readyCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  readyOrderNumber: {
    fontSize: 13,
    fontWeight: '800',
    color: '#8C331A',
    marginRight: 6,
  },
  readyStatusBadge: {
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 6,
  },
  readyStatusText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#059669',
  },
  readyCustomerName: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1F2937',
    marginTop: 2,
  },
  readyEstimatedLabel: {
    fontSize: 10,
    color: '#6B7280',
    fontWeight: '600',
  },
  readyEstimatedAmount: {
    fontSize: 16,
    fontWeight: '900',
    color: '#8C331A',
  },
  readyMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FAF5F0',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    marginBottom: 10,
  },
  readyMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  readyMetaText: {
    fontSize: 11,
    color: '#4B5563',
    fontWeight: '600',
  },
  readyMetaDot: {
    marginHorizontal: 8,
    color: '#D1D5DB',
  },
  readyItemsBox: {
    backgroundColor: '#FCFAF8',
    borderRadius: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: '#F3EFEA',
    marginBottom: 12,
  },
  readyItemsTitle: {
    fontSize: 9,
    fontWeight: '800',
    color: '#8C331A',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  readyItemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 3,
  },
  readyItemName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',
  },
  readyItemPrice: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1F2937',
  },
  discrepancyPill: {
    marginLeft: 6,
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
  },
  discrepancyPillText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#D97706',
  },
  reviewBillBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#8C331A',
    paddingVertical: 10,
    borderRadius: 10,
    shadowColor: '#8C331A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 2,
  },
  reviewBillBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
  },

  /* Expandable Schedule Card */
  expandableCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1.5,
    borderColor: '#E8D7CE',
    overflow: 'hidden',
    shadowColor: '#8C331A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 2,
  },
  collapsedHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#FFFFFF',
  },
  collapsedHeaderRowOpen: {
    backgroundColor: '#FCFAF8',
  },
  collapsedLeftCol: {
    flex: 1,
  },
  customerNameLine: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  customerNameText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1F2937',
    marginRight: 8,
    flexShrink: 1,
  },
  miniStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  miniStatusDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    marginRight: 4,
  },
  miniStatusText: {
    fontSize: 8,
    fontWeight: '800',
  },
  statusBadgeActive: {
    backgroundColor: '#ECFDF5',
  },
  statusBadgePaused: {
    backgroundColor: '#F3F4F6',
  },
  statusTextActive: {
    color: '#065F46',
  },
  statusTextPaused: {
    color: '#4B5563',
  },
  collapsedMetaLine: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaTimeHighlight: {
    fontSize: 11,
    fontWeight: '800',
    color: '#8C331A',
  },
  metaDot: {
    marginHorizontal: 5,
    color: '#D1D5DB',
  },
  metaAreaText: {
    fontSize: 11,
    color: '#6B7280',
    maxWidth: 110,
  },
  metaPartnerText: {
    fontSize: 11,
    color: '#4B5563',
    fontWeight: '600',
    maxWidth: 100,
  },
  chevronWrap: {
    paddingLeft: 8,
  },

  /* Expanded Details Section */
  expandedDetailsSection: {
    paddingHorizontal: 12,
    paddingBottom: 12,
    backgroundColor: '#FCFAF8',
  },
  detailDivider: {
    height: 1,
    backgroundColor: '#E8D7CE',
    marginBottom: 10,
  },
  detailDataRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  detailLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#6B7280',
  },
  detailValue: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1F2937',
  },
  productsBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 10,
    marginTop: 4,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E8D7CE',
  },
  productsBoxTitle: {
    fontSize: 9,
    fontWeight: '800',
    color: '#8C331A',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  noProductsText: {
    fontSize: 11,
    color: '#9CA3AF',
    fontStyle: 'italic',
  },
  productItemLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 2,
  },
  productNameAndQty: {
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',
    flex: 1,
  },
  productLinePrice: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1F2937',
  },
  dailyTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 4,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#E8D7CE',
    marginBottom: 10,
  },
  dailyTotalLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#2C1810',
  },
  dailyTotalValue: {
    fontSize: 15,
    fontWeight: '900',
    color: '#8C331A',
  },

  /* Action Buttons Grid */
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  actionBtn: {
    flex: 1,
    minWidth: '45%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
  },
  actionBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
  editBtn: {
    backgroundColor: '#FDF2EC',
    borderColor: '#E8D7CE',
  },
  pauseBtn: {
    backgroundColor: '#FEF3C7',
    borderColor: '#FDE68A',
  },
  resumeBtn: {
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0',
  },
  cancelDateBtn: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
  },
  deleteScheduleBtn: {
    backgroundColor: '#FEE2E2',
    borderColor: '#FCA5A5',
  },

  /* Pagination */
  paginationWrapper: {
    marginTop: 6,
    marginBottom: 16,
  },

  /* Date-Specific Cancellation Modal */
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  cancelBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    width: '100%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 8,
  },
  cancelHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  cancelTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1F2937',
  },
  cancelSub: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 14,
    lineHeight: 18,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#8C331A',
    marginBottom: 4,
    letterSpacing: 0.5,
  },
  dateInputWrap: {
    backgroundColor: '#FAF5F0',
    borderWidth: 1,
    borderColor: '#E8D7CE',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 14,
  },
  modalTextInput: {
    fontSize: 13,
    color: '#1F2937',
    padding: 0,
  },
  cancelModalActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  modalSecondaryBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    alignItems: 'center',
  },
  modalSecondaryText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#4B5563',
  },
  modalDangerBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#DC2626',
    alignItems: 'center',
  },
  modalDangerText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
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
    marginVertical: 12,
  },
  emptyMiniTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#4B5563',
  },
  emptyMiniSub: {
    fontSize: 11,
    color: '#9CA3AF',
    marginTop: 4,
    textAlign: 'center',
    lineHeight: 16,
    maxWidth: 280,
  },
});
