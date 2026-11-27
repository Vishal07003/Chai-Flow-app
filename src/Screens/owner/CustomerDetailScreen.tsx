import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Linking,
  RefreshControl,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';
import billingService, { BackendInvoice, BillingCustomer } from '../../services/billing.service';
import orderService, {
  BackendOrder,
  DailyDeliverySchedule,
} from '../../services/order.service';
import { useApp } from '../../context/AppContext';
import { AddCustomerModal, type AddCustomerFormData } from '../../components/customer';
import { CollectPaymentModal, type CollectPaymentFormData } from '../../components/payment';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { BillingCycleDayModal } from '../../components/common';
import AppToast from '../../utils/toast';
import { colors, typography, radius, spacing, shadows } from '../../theme';

export default function CustomerDetailScreen({ route, navigation }: any) {
  const { refreshBackendData } = useApp();

  // Support route params: customer, customerId, companyId, company
  const initialCustomer = route.params?.customer || null;
  const rawId = route.params?.customerId || initialCustomer?.id || route.params?.companyId || route.params?.company?.id;
  const customerId = rawId ? Number(rawId) : null;

  // Screen State
  const [customer, setCustomer] = useState<BillingCustomer | null>(null);
  const [customerSummary, setCustomerSummary] = useState<{
    customer_id: number;
    name: string;
    phone: string;
    address: string;
    total_invoices: number;
    total_orders: number;
    total_billed: string;
    total_paid: string;
    total_pending: string;
    last_purchase_date: string | null;
  } | null>(null);

  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  // Financial Ledger & Invoices
  const [ledgerStatement, setLedgerStatement] = useState<any | null>(null);
  const [ledgerLoading, setLedgerLoading] = useState<boolean>(false);
  const [invoices, setInvoices] = useState<BackendInvoice[]>([]);

  // Recent Orders
  const [recentOrders, setRecentOrders] = useState<BackendOrder[]>([]);
  const [ordersLoading, setOrdersLoading] = useState<boolean>(false);

  // Daily Delivery Schedule State
  const [schedules, setSchedules] = useState<DailyDeliverySchedule[]>([]);
  const [schedulesLoading, setSchedulesLoading] = useState<boolean>(false);

  // 3-Tab Navigation State ('ORDERS' | 'SCHEDULE' | 'LEDGER')
  const [activeTab, setActiveTab] = useState<'ORDERS' | 'SCHEDULE' | 'LEDGER'>('ORDERS');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Modals & Action States
  const [editCustomerModalVisible, setEditCustomerModalVisible] = useState<boolean>(false);
  const [billingCycleModalVisible, setBillingCycleModalVisible] = useState<boolean>(false);
  const [collectModalVisible, setCollectModalVisible] = useState<boolean>(false);
  const [submittingPayment, setSubmittingPayment] = useState<boolean>(false);

  // Centralized Confirmation Dialog State
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

  // 1. Fetch Customer Detail & Summary
  const fetchCustomerData = useCallback(async () => {
    if (!customerId) return;
    try {
      setLoading(true);
      const [custDetail, summary] = await Promise.all([
        billingService.getCustomerById(customerId).catch(() => null),
        billingService.getCustomerSummary(customerId).catch(() => null),
      ]);
      if (custDetail) setCustomer(custDetail);
      if (summary) setCustomerSummary(summary);
    } catch (_err) {
      // Handled silently
    } finally {
      setLoading(false);
    }
  }, [customerId]);

  // 2. Fetch Customer Invoices & Ledger Overview
  const fetchLedgerAndInvoices = useCallback(async () => {
    if (!customerId) return;
    try {
      setLedgerLoading(true);
      const [invList, stmt] = await Promise.all([
        billingService.getCustomerInvoices(customerId).catch(() => []),
        billingService.getCustomerLedger(customerId).catch(() => null),
      ]);
      setInvoices(invList || []);
      setLedgerStatement(stmt);
    } catch (_err) {
      // Handled silently
    } finally {
      setLedgerLoading(false);
    }
  }, [customerId]);

  // 3. Fetch Customer Orders
  const fetchOrders = useCallback(async () => {
    if (!customerId) return;
    try {
      setOrdersLoading(true);
      const list = await orderService.getOrders({ customer: customerId }).catch(() => []);
      setRecentOrders(list || []);
    } catch (_err) {
      // Handled silently
    } finally {
      setOrdersLoading(false);
    }
  }, [customerId]);

  // 4. Fetch Daily Delivery Schedules
  const fetchSchedules = useCallback(async () => {
    if (!customerId) return;
    try {
      setSchedulesLoading(true);
      const list = await orderService.getDailySchedules({ customer: customerId }).catch(() => []);
      setSchedules(list || []);
    } catch (_err) {
      // Handled silently
    } finally {
      setSchedulesLoading(false);
    }
  }, [customerId]);

  // Initial and Focus-based Loading
  useEffect(() => {
    const unsubscribe = navigation.addListener?.('focus', () => {
      fetchCustomerData();
      fetchLedgerAndInvoices();
      fetchOrders();
      fetchSchedules();
    });
    fetchCustomerData();
    fetchLedgerAndInvoices();
    fetchOrders();
    fetchSchedules();
    return unsubscribe;
  }, [navigation, fetchCustomerData, fetchLedgerAndInvoices, fetchOrders, fetchSchedules]);

  // Pull to refresh
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    Promise.all([
      fetchCustomerData(),
      fetchLedgerAndInvoices(),
      fetchOrders(),
      fetchSchedules(),
    ]).finally(() => setRefreshing(false));
  }, [fetchCustomerData, fetchLedgerAndInvoices, fetchOrders, fetchSchedules]);

  // Reset search when tab changes
  const handleTabChange = (tab: 'ORDERS' | 'SCHEDULE' | 'LEDGER') => {
    setActiveTab(tab);
    setSearchQuery('');
  };

  // Edit Customer
  const handleEditCustomerSubmit = async (formData: AddCustomerFormData) => {
    if (!customerId) return;
    try {
      const updated = await billingService.updateCustomer(customerId, {
        name: formData.name,
        phone: formData.phone,
        address: formData.address,
      });
      setCustomer(updated);
      setEditCustomerModalVisible(false);
      refreshBackendData();
      AppToast.success('Profile Updated', 'Customer details saved successfully.');
    } catch (err: any) {
      AppToast.error('Update Failed', err?.message || 'Failed to update customer.');
    }
  };

  // Change Billing Cycle Day Handler
  const handleSaveBillingCycleDay = async (newDay: number) => {
    if (!customerId) return;
    try {
      const updated = await billingService.updateCustomer(customerId, {
        billing_cycle_day: newDay,
      });
      setCustomer(prev => (prev ? { ...prev, billing_cycle_day: newDay, ...(updated || {}) } : updated));
      setBillingCycleModalVisible(false);
      await Promise.all([fetchCustomerData(), fetchLedgerAndInvoices()]);
      refreshBackendData();
      AppToast.success(
        'Billing Day Updated',
        `Cycle day set to ${newDay}${newDay === 1 ? 'st' : newDay === 2 ? 'nd' : newDay === 3 ? 'rd' : 'th'} of every month.`
      );
    } catch (err: any) {
      AppToast.error('Update Failed', err?.message || 'Failed to update billing cycle day.');
      throw err;
    }
  };

  // Record Payment with FIFO Allocation (Strictly Cash Only)
  const handleConfirmCollectPayment = async (data: CollectPaymentFormData) => {
    if (!customerId) return;
    try {
      setSubmittingPayment(true);
      const res = await billingService.collectCustomerPayment(customerId, {
        amount: data.amount,
        method: 'cash',
        notes: data.notes || `Cash payment collection for ${customer?.name || 'Customer'}`,
      });
      setCollectModalVisible(false);
      fetchCustomerData();
      fetchLedgerAndInvoices();
      refreshBackendData();
      AppToast.success(
        'Payment Recorded Successfully',
        `₹${res.amount_allocated} cash allocated via FIFO.${parseFloat(String(res.unallocated_credit)) > 0 ? ` Advance Credit: ₹${res.unallocated_credit}` : ''}`
      );
    } catch (err: any) {
      AppToast.error('Failed to Record Payment', err?.message || 'Please check connection.');
      throw err;
    } finally {
      setSubmittingPayment(false);
    }
  };

  // Quick Action 1: New Order -> QuickBillingScreen in order mode
  const handleOpenNewOrder = () => {
    const custToPass = customer || initialCustomer || {
      id: customerId,
      name: displayName,
      phone: displayPhone,
      address: displayAddress,
    };
    navigation.navigate('QuickBilling', {
      customer: custToPass,
      customerId: customerId,
      mode: 'order',
    });
  };

  // Quick Action 2: New Schedule -> Open existing CreateEditDailyScheduleScreen in Create Mode
  const handleOpenCreateSchedule = () => {
    const custToPass = customer || {
      id: customerId,
      name: displayName,
      phone: displayPhone,
      address: displayAddress,
    };
    navigation.navigate('CreateEditDailySchedule', {
      customer: custToPass,
      customerId: customerId,
    });
  };

  // Quick Action 3: Record Payment
  const handleOpenCollectPayment = () => {
    setCollectModalVisible(true);
  };

  // Navigate to Dedicated Full-Screen Customer Ledger
  const handleOpenDedicatedLedger = () => {
    navigation.navigate('CustomerLedger', {
      customerId: customerId,
      customer: customer || initialCustomer || { id: customerId, name: displayName, phone: displayPhone },
    });
  };

  const handleToggleScheduleActive = async (sched: DailyDeliverySchedule) => {
    try {
      await orderService.updateDailySchedule(sched.id, { is_active: !sched.is_active });
      AppToast.info(
        sched.is_active ? 'Schedule Paused' : 'Schedule Resumed',
        `Schedule is now ${sched.is_active ? 'paused' : 'active'}.`
      );
      fetchSchedules();
      refreshBackendData();
    } catch (err: any) {
      AppToast.error('Error', err?.message || 'Could not toggle schedule status.');
    }
  };

  const handleOpenCancelDateModal = (sched: DailyDeliverySchedule) => {
    const todayStr = new Date().toISOString().split('T')[0];
    const isAlreadyCancelled = (sched.cancellation_exceptions || []).some(
      ex => ex.cancelled_date === todayStr
    );

    setConfirmDialogConfig({
      visible: true,
      title: 'Cancel Today?',
      description: `Skip automated delivery generation for today (${todayStr})?`,
      confirmLabel: 'Cancel for Today',
      cancelLabel: 'Keep',
      type: 'warning',
      icon: 'close-circle-outline',
      onConfirm: async () => {
        try {
          await orderService.cancelDateDelivery(sched.id, todayStr, 'Owner cancellation');
          AppToast.info('Cancelled', 'Delivery skipped for today.');
          fetchSchedules();
          refreshBackendData();
        } catch (err: any) {
          AppToast.error('Action Failed', err?.message || 'Could not update cancellation.');
        } finally {
          setConfirmDialogConfig(prev => ({ ...prev, visible: false }));
        }
      },
    });
  };

  // Filtered Orders for Tab 1
  const filteredCustomerOrders = useMemo(() => {
    if (!searchQuery.trim()) return recentOrders;
    const q = searchQuery.toLowerCase().trim();
    return recentOrders.filter(o => {
      const matchId = String(o.id).includes(q);
      const matchStatus = (o.status || '').toLowerCase().includes(q);
      const matchItems = (o.items || []).some(
        it => (it.product_details?.name || (it as any).product_name || '').toLowerCase().includes(q)
      );
      return matchId || matchStatus || matchItems;
    });
  }, [recentOrders, searchQuery]);

  // Filtered Schedules for Tab 2
  const filteredCustomerSchedules = useMemo(() => {
    if (!searchQuery.trim()) return schedules;
    const q = searchQuery.toLowerCase().trim();
    return schedules.filter(sched => {
      const matchPartner = (sched.delivery_partner_name || '').toLowerCase().includes(q);
      const matchTime = (sched.delivery_time || '').includes(q);
      const matchDays = (sched.weekdays || '').includes(q);
      const matchProduct = (sched.items || []).some(it =>
        (it.product_name || '').toLowerCase().includes(q)
      );
      return matchPartner || matchTime || matchDays || matchProduct;
    });
  }, [schedules, searchQuery]);

  // Filtered Invoices for Tab 3
  const filteredInvoices = useMemo(() => {
    if (!searchQuery.trim()) return invoices;
    const q = searchQuery.toLowerCase().trim();
    return invoices.filter(inv => {
      const matchNum = (inv.invoice_number || '').toLowerCase().includes(q);
      const matchPeriod = (inv.billing_period || '').includes(q);
      const matchStatus = (inv.status || '').toLowerCase().includes(q);
      return matchNum || matchPeriod || matchStatus;
    });
  }, [invoices, searchQuery]);

  // Derived Values
  const displayName = customer?.name || initialCustomer?.name || 'Customer';
  const displayPhone = customer?.phone || initialCustomer?.phone || '';
  const displayAddress = customer?.address || initialCustomer?.address || 'No Address Provided';
  const amountDue = parseFloat(customerSummary?.total_pending || customer?.total_pending_amount || '0') || 0;
  const totalOrdersCount = customerSummary?.total_orders ?? recentOrders.length;

  if (loading && !customer) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.topHeader}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={20} color={colors.primary} />
          </TouchableOpacity>
          <Text style={styles.screenTitle}>Customer Profile</Text>
        </View>
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* 1. TOP COMPACT HEADER */}
      <View style={styles.topHeader}>
        <View style={styles.topHeaderLeft}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={20} color={colors.primary} />
          </TouchableOpacity>
          <Text style={styles.screenTitle}>Customer Profile</Text>
        </View>

        <TouchableOpacity
          style={styles.editActionHeaderBtn}
          onPress={() => setEditCustomerModalVisible(true)}
          activeOpacity={0.7}
        >
          <Ionicons name="create-outline" size={16} color={colors.primary} style={{ marginRight: 4 }} />
          <Text style={styles.editActionHeaderText}>Edit</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        stickyHeaderIndices={[3]}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />
        }
      >
        {/* 2. COMPACT CUSTOMER IDENTITY CARD */}
        <View style={styles.identityCard}>
          <View style={styles.identityTopRow}>
            <View style={styles.avatarBox}>
              <Text style={styles.avatarInitials}>
                {displayName.substring(0, 2).toUpperCase()}
              </Text>
            </View>

            <View style={styles.identityInfoCol}>
              <Text style={styles.customerName} numberOfLines={1}>
                {displayName}
              </Text>

              {displayPhone ? (
                <TouchableOpacity
                  style={styles.phoneChip}
                  onPress={() => Linking.openURL(`tel:${displayPhone}`).catch(() => {})}
                  activeOpacity={0.7}
                >
                  <Ionicons name="call" size={11} color={colors.primary} style={{ marginRight: 4 }} />
                  <Text style={styles.phoneChipText}>{displayPhone}</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          </View>

          <View style={styles.addressRow}>
            <Ionicons name="location-outline" size={13} color={colors.textSecondary} style={{ marginRight: 5, marginTop: 1 }} />
            <Text style={styles.addressText} numberOfLines={2}>
              {displayAddress}
            </Text>
          </View>

          {/* Billing Cycle Day Shortcut / Indicator */}
          <View style={styles.cycleDayRow}>
            <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
              <Ionicons name="calendar-outline" size={13} color="#8C331A" style={{ marginRight: 5 }} />
              <Text style={styles.cycleDayLabel}>
                Billing Cycle: <Text style={styles.cycleDayValue}>Day {customer?.billing_cycle_day || 1} of every month</Text>
              </Text>
            </View>
            <TouchableOpacity
              style={styles.changeCycleBtn}
              onPress={() => setBillingCycleModalVisible(true)}
              activeOpacity={0.7}
            >
              <Ionicons name="create-outline" size={12} color="#8C331A" style={{ marginRight: 3 }} />
              <Text style={styles.changeCycleBtnText}>Change</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* 3. EXACTLY TWO SUMMARY CARDS: AMOUNT DUE & TOTAL ORDERS */}
        <View style={styles.overviewRow}>
          <View style={[styles.overviewMetricCard, amountDue > 0 && styles.overviewMetricDueCard]}>
            <View style={styles.overviewCardTop}>
              <Text style={styles.overviewCardLabel}>AMOUNT DUE</Text>
              <View style={[styles.overviewIconWrap, { backgroundColor: amountDue > 0 ? '#FEF2F2' : '#ECFDF5' }]}>
                <Ionicons
                  name={amountDue > 0 ? 'alert-circle' : 'checkmark-circle'}
                  size={14}
                  color={amountDue > 0 ? colors.danger : colors.success}
                />
              </View>
            </View>
            <Text style={[styles.overviewCardAmount, amountDue > 0 ? styles.dueText : styles.settledText]}>
              ₹{amountDue.toLocaleString('en-IN')}
            </Text>
            <Text style={styles.overviewCardSub}>
              {amountDue > 0 ? 'Pending collection' : 'All clear • No dues'}
            </Text>
          </View>

          <View style={styles.overviewMetricCard}>
            <View style={styles.overviewCardTop}>
              <Text style={styles.overviewCardLabel}>TOTAL ORDERS</Text>
              <View style={[styles.overviewIconWrap, { backgroundColor: '#F5EFEA' }]}>
                <Ionicons name="cart-outline" size={14} color={colors.primary} />
              </View>
            </View>
            <Text style={styles.overviewCardAmount}>{totalOrdersCount}</Text>
            <Text style={styles.overviewCardSub}>
              {customerSummary?.total_invoices ? `${customerSummary.total_invoices} invoices billed` : 'Lifetime orders'}
            </Text>
          </View>
        </View>

        {/* 4. EXACTLY THREE QUICK ACTIONS: 1. New Order, 2. New Schedule, 3. Record Payment */}
        <View style={styles.actionsBar}>
          <TouchableOpacity
            style={styles.primaryActionBtn}
            onPress={handleOpenNewOrder}
            activeOpacity={0.85}
          >
            <Ionicons name="cart-outline" size={15} color={colors.white} style={{ marginRight: 4 }} />
            <Text style={styles.primaryActionText}>New Order</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryActionBtn}
            onPress={handleOpenCreateSchedule}
            activeOpacity={0.7}
          >
            <Ionicons name="calendar-outline" size={15} color={colors.primary} style={{ marginRight: 4 }} />
            <Text style={styles.secondaryActionText}>New Schedule</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryActionBtn}
            onPress={handleOpenCollectPayment}
            activeOpacity={0.7}
          >
            <Ionicons name="cash-outline" size={15} color={colors.primary} style={{ marginRight: 4 }} />
            <Text style={styles.secondaryActionText}>Record Payment</Text>
          </TouchableOpacity>
        </View>

        {/* 5. STICKY SEARCH BAR & 3 TABS: Orders | Daily Schedule | Customer Ledger */}
        <View style={styles.stickySectionWrapper}>
          {/* Search Bar */}
          <View style={styles.searchBar}>
            <Ionicons name="search-outline" size={16} color="#888" style={{ marginRight: 6 }} />
            <TextInput
              placeholder={
                activeTab === 'ORDERS'
                  ? "Search orders by ID, product, status..."
                  : activeTab === 'SCHEDULE'
                  ? "Search schedule by partner, time, product..."
                  : "Search invoices by number, period..."
              }
              placeholderTextColor="#988E85"
              style={styles.searchInput}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Ionicons name="close-circle" size={16} color="#9CA3AF" />
              </TouchableOpacity>
            )}
          </View>

          {/* Segmented 3-Tab Bar */}
          <View style={styles.tabBarRow}>
            <TouchableOpacity
              style={[styles.segmentTab, activeTab === 'ORDERS' && styles.segmentTabActive]}
              onPress={() => handleTabChange('ORDERS')}
              activeOpacity={0.75}
            >
              <Ionicons
                name="receipt-outline"
                size={13}
                color={activeTab === 'ORDERS' ? '#FFFFFF' : '#6B7280'}
                style={{ marginRight: 4 }}
              />
              <Text style={[styles.segmentTabText, activeTab === 'ORDERS' && styles.segmentTabTextActive]}>
                Orders ({recentOrders.length})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.segmentTab, activeTab === 'SCHEDULE' && styles.segmentTabActive]}
              onPress={() => handleTabChange('SCHEDULE')}
              activeOpacity={0.75}
            >
              <Ionicons
                name="calendar-outline"
                size={13}
                color={activeTab === 'SCHEDULE' ? '#FFFFFF' : '#6B7280'}
                style={{ marginRight: 4 }}
              />
              <Text style={[styles.segmentTabText, activeTab === 'SCHEDULE' && styles.segmentTabTextActive]}>
                Daily Schedule ({schedules.length})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.segmentTab, activeTab === 'LEDGER' && styles.segmentTabActive]}
              onPress={() => handleTabChange('LEDGER')}
              activeOpacity={0.75}
            >
              <Ionicons
                name="book-outline"
                size={13}
                color={activeTab === 'LEDGER' ? '#FFFFFF' : '#6B7280'}
                style={{ marginRight: 4 }}
              />
              <Text style={[styles.segmentTabText, activeTab === 'LEDGER' && styles.segmentTabTextActive]}>
                Ledger
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* TAB 1: ORDERS */}
        {activeTab === 'ORDERS' && (
          <View style={styles.tabContentContainer}>
            {ordersLoading ? (
              <ActivityIndicator size="small" color={colors.primary} style={{ marginVertical: 20 }} />
            ) : filteredCustomerOrders.length === 0 ? (
              <View style={styles.emptyCard}>
                <Ionicons name="cart-outline" size={32} color={colors.gray300} style={{ marginBottom: 6 }} />
                <Text style={styles.emptyCardTitle}>No Orders Found</Text>
                <Text style={styles.emptyCardSub}>
                  {searchQuery ? `No orders matching "${searchQuery}"` : 'Customer has not placed any orders yet.'}
                </Text>
              </View>
            ) : (
              filteredCustomerOrders.map(order => {
                const orderDate = new Date(order.created_at).toLocaleDateString('en-IN', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                });
                const orderTime = new Date(order.created_at).toLocaleTimeString('en-IN', {
                  hour: '2-digit',
                  minute: '2-digit',
                });

                const itemsSummary = (order.items || [])
                  .map(it => `${it.quantity}x ${it.product_details?.name || (it as any).product_name || 'Item'}`)
                  .join(', ');

                return (
                  <TouchableOpacity
                    key={order.id}
                    style={styles.orderCard}
                    onPress={() => navigation.navigate('OrderDetails', { orderId: order.id, order })}
                    activeOpacity={0.7}
                  >
                    <View style={styles.orderCardTop}>
                      <View>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <Text style={styles.orderCardId}>Order #{order.id}</Text>
                          <View style={[
                            styles.orderTypeBadge,
                            order.order_type === 'Scheduled' ? styles.orderTypeScheduled : styles.orderTypeOneTime
                          ]}>
                            <Text style={[
                              styles.orderTypeBadgeText,
                              order.order_type === 'Scheduled' ? styles.orderTypeScheduledText : styles.orderTypeOneTimeText
                            ]}>
                              {order.order_type || (order.scheduled_delivery_date ? 'Scheduled' : 'One-Time')}
                            </Text>
                          </View>
                        </View>
                        <Text style={styles.orderCardDate}>
                          {orderDate} • {order.scheduled_delivery_time ? order.scheduled_delivery_time.substring(0, 5) : orderTime}
                        </Text>
                      </View>
                      <View style={styles.orderStatusBadge}>
                        <Text style={styles.orderStatusBadgeText}>{order.status.toUpperCase()}</Text>
                      </View>
                    </View>

                    <Text style={styles.orderCardItems} numberOfLines={2}>
                      {itemsSummary || 'Standard Daily Delivery'}
                    </Text>

                    <View style={styles.orderCardBottom}>
                      <View>
                        <Text style={styles.orderAmountLabel}>Amount</Text>
                        <Text style={styles.orderCardTotal}>
                          ₹{parseFloat(order.total_amount || '0').toLocaleString('en-IN')}
                        </Text>
                      </View>

                      {order.has_invoice ? (
                        <View style={styles.invoicedTag}>
                          <Ionicons name="checkmark-done" size={13} color={colors.success} style={{ marginRight: 4 }} />
                          <Text style={styles.invoicedTagText}>{order.invoice_number || 'INVOICED'}</Text>
                        </View>
                      ) : (
                        <Text style={styles.unbilledTag}>Pending Invoice</Text>
                      )}
                    </View>
                  </TouchableOpacity>
                );
              })
            )}
          </View>
        )}

        {/* TAB 2: DAILY SCHEDULE */}
        {activeTab === 'SCHEDULE' && (
          <View style={styles.tabContentContainer}>
            <View style={styles.sectionHeaderRow}>
              <View style={styles.sectionHeaderLeft}>
                <Ionicons name="calendar-outline" size={15} color={colors.primary} style={{ marginRight: 6 }} />
                <Text style={styles.sectionTitle}>
                  SCHEDULES ({filteredCustomerSchedules.length})
                </Text>
              </View>
              <TouchableOpacity
                style={styles.addTemplatePill}
                onPress={handleOpenCreateSchedule}
                activeOpacity={0.7}
              >
                <Ionicons name="add" size={14} color={colors.primary} />
                <Text style={styles.addTemplatePillText}>+ Add</Text>
              </TouchableOpacity>
            </View>

            {schedulesLoading ? (
              <ActivityIndicator size="small" color={colors.primary} style={{ marginVertical: 20 }} />
            ) : filteredCustomerSchedules.length === 0 ? (
              <View style={styles.emptyCard}>
                <Ionicons name="calendar-outline" size={32} color={colors.gray300} style={{ marginBottom: 6 }} />
                <Text style={styles.emptyCardTitle}>No Schedules Configured</Text>
                <Text style={styles.emptyCardSub}>
                  {searchQuery ? `No schedules matching "${searchQuery}"` : "Configure automated daily orders and delivery time."}
                </Text>
              </View>
            ) : (
              filteredCustomerSchedules.map(sched => {
                const weekdaysMap = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
                const daysLabel = sched.weekdays
                  ? sched.weekdays
                      .split(',')
                      .map(d => weekdaysMap[parseInt(d.trim(), 10)])
                      .filter(Boolean)
                      .join(', ')
                  : 'Everyday';

                const timeStr = sched.delivery_time ? sched.delivery_time.substring(0, 5) : '09:00';
                const itemsList = (sched.items || []).map(i => `${i.quantity}x ${i.product_name}`).join(', ');

                return (
                  <View key={sched.id} style={styles.schedCard}>
                    <View style={styles.schedTopRow}>
                      <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <Text style={styles.schedTitle}>{timeStr}</Text>
                          <View style={[styles.schedBadge, sched.is_active ? styles.schedBadgeActive : styles.schedBadgeInactive]}>
                            <Text style={[styles.schedBadgeText, sched.is_active ? styles.schedBadgeActiveText : styles.schedBadgeInactiveText]}>
                              {sched.is_active ? 'ACTIVE' : 'PAUSED'}
                            </Text>
                          </View>
                        </View>
                        <Text style={styles.schedDays}>{daysLabel}</Text>
                      </View>
                    </View>

                    <Text style={styles.schedItems} numberOfLines={2}>
                      {itemsList || 'Daily tea order'}
                    </Text>

                    <View style={styles.schedActionsRow}>
                      <TouchableOpacity
                        style={styles.schedActionMiniBtn}
                        onPress={() => {
                          const custToPass = customer || {
                            id: customerId,
                            name: displayName,
                            phone: displayPhone,
                            address: displayAddress,
                          };
                          navigation.navigate('CreateEditDailySchedule', {
                            schedule: sched,
                            customer: custToPass,
                            customerId: customerId,
                          });
                        }}
                      >
                        <Ionicons name="create-outline" size={13} color="#8C331A" style={{ marginRight: 3 }} />
                        <Text style={styles.schedActionMiniBtnText}>Edit</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.schedActionMiniBtn}
                        onPress={() => handleToggleScheduleActive(sched)}
                      >
                        <Ionicons
                          name={sched.is_active ? 'pause-outline' : 'play-outline'}
                          size={13}
                          color={sched.is_active ? '#D97706' : '#10B981'}
                          style={{ marginRight: 3 }}
                        />
                        <Text style={[styles.schedActionMiniBtnText, { color: sched.is_active ? '#D97706' : '#10B981' }]}>
                          {sched.is_active ? 'Pause' : 'Resume'}
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.schedActionMiniBtn}
                        onPress={() => handleOpenCancelDateModal(sched)}
                      >
                        <Ionicons name="close-circle-outline" size={13} color={colors.danger} style={{ marginRight: 3 }} />
                        <Text style={[styles.schedActionMiniBtnText, { color: colors.danger }]}>Skip Today</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })
            )}
          </View>
        )}

        {/* TAB 3: COMPACT MONTHLY BILLING SUMMARY (WITH SINGLE "VIEW LEDGER" ACTION) */}
        {activeTab === 'LEDGER' && (
          <View style={styles.tabContentContainer}>
            <View style={styles.ledgerCompactCard}>
              <View style={styles.ledgerCompactHeader}>
                <View style={{ flex: 1, marginRight: 8 }}>
                  <Text style={styles.ledgerCompactTitle}>Monthly Billing Summary</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 2 }}>
                    <Text style={styles.ledgerCompactPeriod}>
                      Billing Cycle: Day {customer?.billing_cycle_day || 1} of every month
                    </Text>
                    <TouchableOpacity
                      style={styles.changeCycleMiniLink}
                      onPress={() => setBillingCycleModalVisible(true)}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.changeCycleMiniLinkText}>• Change</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Single View Ledger Action Button */}
                <TouchableOpacity
                  style={styles.viewLedgerPrimaryBtn}
                  onPress={handleOpenDedicatedLedger}
                  activeOpacity={0.8}
                >
                  <Text style={styles.viewLedgerPrimaryBtnText}>View Ledger →</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.ledgerMetricsGrid}>
                <View style={styles.ledgerMetricCol}>
                  <Text style={styles.ledgerMetricLabel}>AMOUNT INVOICED</Text>
                  <Text style={styles.ledgerMetricVal}>
                    ₹{parseFloat(customerSummary?.total_billed || customer?.total_billed_amount || '0').toLocaleString('en-IN')}
                  </Text>
                </View>

                <View style={styles.ledgerMetricCol}>
                  <Text style={styles.ledgerMetricLabel}>AMOUNT RECEIVED</Text>
                  <Text style={[styles.ledgerMetricVal, { color: '#059669' }]}>
                    ₹{parseFloat(customerSummary?.total_paid || '0').toLocaleString('en-IN')}
                  </Text>
                </View>

                <View style={[styles.ledgerMetricCol, { borderRightWidth: 0 }]}>
                  <Text style={styles.ledgerMetricLabel}>OUTSTANDING</Text>
                  <Text style={[styles.ledgerMetricVal, { color: amountDue > 0 ? '#DC2626' : '#059669', fontWeight: '800' }]}>
                    ₹{amountDue.toLocaleString('en-IN')}
                  </Text>
                </View>
              </View>
            </View>
          </View>
        )}
      </ScrollView>

      {/* --- MODALS --- */}
      {/* 1. Edit Customer Modal */}
      <AddCustomerModal
        visible={editCustomerModalVisible}
        onClose={() => setEditCustomerModalVisible(false)}
        onSubmit={handleEditCustomerSubmit}
        initialData={
          customer
            ? {
                name: customer.name,
                phone: customer.phone,
                address: customer.address,
              }
            : undefined
        }
        title="Edit Customer Details"
      />

      {/* 2. Record Payment Modal (Single Workflow with FIFO Allocation) */}
      <CollectPaymentModal
        visible={collectModalVisible}
        onClose={() => setCollectModalVisible(false)}
        onSubmit={handleConfirmCollectPayment}
        customerName={displayName}
        totalPendingAmount={amountDue}
        invoices={invoices}
      />

      {/* 3. Confirmation Dialog */}
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

      {/* 4. Billing Cycle Day Modal */}
      <BillingCycleDayModal
        visible={billingCycleModalVisible}
        currentDay={customer?.billing_cycle_day || 1}
        customerName={displayName}
        onClose={() => setBillingCycleModalVisible(false)}
        onSave={handleSaveBillingCycleDay}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAF8F5',
  },
  topHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#EFECE9',
  },
  topHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    width: 34,
    height: 34,
    borderRadius: 8,
    backgroundColor: '#FAF5F0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  screenTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#8C331A',
  },
  editActionHeaderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: '#FAF5F0',
    borderWidth: 1,
    borderColor: '#E8D7CE',
  },
  editActionHeaderText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#8C331A',
  },
  scrollContent: {
    padding: 14,
    paddingBottom: 32,
  },
  identityCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#EFECE9',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
  },
  identityTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarBox: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: '#FAF5F0',
    borderWidth: 1,
    borderColor: '#E8D7CE',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarInitials: {
    fontSize: 15,
    fontWeight: '800',
    color: '#8C331A',
  },
  identityInfoCol: {
    flex: 1,
  },
  customerName: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1F2937',
  },
  phoneChip: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: '#FAF5F0',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
    marginTop: 4,
  },
  phoneChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#8C331A',
  },
  noPhoneText: {
    fontSize: 11,
    color: '#9CA3AF',
    marginTop: 2,
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    paddingTop: 6,
  },
  addressText: {
    fontSize: 11,
    color: '#6B7280',
    flex: 1,
    lineHeight: 15,
  },
  cycleDayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  cycleDayLabel: {
    fontSize: 11,
    color: '#6B7280',
  },
  cycleDayValue: {
    fontWeight: '700',
    color: '#8C331A',
  },
  changeCycleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FDEBE4',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#F5C6B8',
  },
  changeCycleBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#8C331A',
  },
  changeCycleMiniLink: {
    marginLeft: 6,
    paddingVertical: 1,
  },
  changeCycleMiniLinkText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#8C331A',
  },
  overviewRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 10,
  },
  overviewMetricCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#EFECE9',
  },
  overviewMetricDueCard: {
    borderColor: '#FECACA',
    backgroundColor: '#FEFDFD',
  },
  overviewCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  overviewCardLabel: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#8A7A70',
    letterSpacing: 0.5,
  },
  overviewIconWrap: {
    width: 22,
    height: 22,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  overviewCardAmount: {
    fontSize: 18,
    fontWeight: '900',
    color: '#1F2937',
    marginVertical: 2,
  },
  dueText: {
    color: '#DC2626',
  },
  settledText: {
    color: '#059669',
  },
  overviewCardSub: {
    fontSize: 10,
    color: '#8A7A70',
  },
  actionsBar: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  primaryActionBtn: {
    flex: 1.1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#8C331A',
    paddingVertical: 10,
    borderRadius: 10,
  },
  primaryActionText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  secondaryActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FAF5F0',
    borderWidth: 1,
    borderColor: '#E8D7CE',
    paddingVertical: 10,
    borderRadius: 10,
  },
  secondaryActionText: {
    color: '#8C331A',
    fontSize: 12,
    fontWeight: '700',
  },
  stickySectionWrapper: {
    backgroundColor: '#FAF8F5',
    paddingBottom: 6,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#EFECE9',
    marginBottom: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 12,
    color: '#1F2937',
    padding: 0,
  },
  tabBarRow: {
    flexDirection: 'row',
    backgroundColor: '#FAF5F0',
    borderRadius: 10,
    padding: 3,
    borderWidth: 1,
    borderColor: '#E8D7CE',
  },
  segmentTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 7,
    borderRadius: 8,
  },
  segmentTabActive: {
    backgroundColor: '#8C331A',
  },
  segmentTabText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#6B7280',
  },
  segmentTabTextActive: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  tabContentContainer: {
    marginTop: 6,
  },
  orderCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#EFECE9',
  },
  orderCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  orderCardId: {
    fontSize: 13,
    fontWeight: '800',
    color: '#1F2937',
  },
  orderTypeBadge: {
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
  },
  orderTypeBadgeText: {
    fontSize: 9,
    fontWeight: '700',
  },
  orderTypeScheduled: {
    backgroundColor: '#EFF6FF',
  },
  orderTypeScheduledText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#2563EB',
  },
  orderTypeOneTime: {
    backgroundColor: '#FEF3C7',
  },
  orderTypeOneTimeText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#D97706',
  },
  orderCardDate: {
    fontSize: 10,
    color: '#6B7280',
    marginTop: 2,
  },
  orderStatusBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    backgroundColor: '#FAF5F0',
    borderWidth: 1,
    borderColor: '#E8D7CE',
  },
  orderStatusBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#8C331A',
  },
  orderCardItems: {
    fontSize: 11,
    color: '#4B5563',
    lineHeight: 15,
    marginBottom: 6,
  },
  orderCardBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    paddingTop: 6,
  },
  orderAmountLabel: {
    fontSize: 9,
    color: '#9CA3AF',
  },
  orderCardTotal: {
    fontSize: 13,
    fontWeight: '800',
    color: '#8C331A',
  },
  invoicedTag: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  invoicedTagText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#059669',
  },
  unbilledTag: {
    fontSize: 10,
    color: '#D97706',
    fontWeight: '600',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    paddingHorizontal: 2,
  },
  sectionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 10,
    fontWeight: '800',
    color: '#8A7A70',
    letterSpacing: 0.5,
  },
  addTemplatePill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: '#FAF5F0',
    borderWidth: 1,
    borderColor: '#E8D7CE',
  },
  addTemplatePillText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#8C331A',
  },
  schedCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#EFECE9',
  },
  schedTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  schedTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1F2937',
  },
  schedBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  schedBadgeText: {
    fontSize: 9,
    fontWeight: '700',
  },
  schedBadgeActive: {
    backgroundColor: '#ECFDF5',
  },
  schedBadgeActiveText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#059669',
  },
  schedBadgeInactive: {
    backgroundColor: '#F3F4F6',
  },
  schedBadgeInactiveText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#6B7280',
  },
  schedDays: {
    fontSize: 10,
    color: '#6B7280',
    marginTop: 2,
  },
  schedItems: {
    fontSize: 11,
    color: '#4B5563',
    marginVertical: 4,
  },
  schedActionsRow: {
    flexDirection: 'row',
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    paddingTop: 6,
    marginTop: 2,
  },
  schedActionMiniBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: '#FAF5F0',
    borderWidth: 1,
    borderColor: '#E8D7CE',
  },
  schedActionMiniBtnText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#8C331A',
  },
  ledgerCompactCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#EFECE9',
    marginBottom: 12,
  },
  ledgerCompactHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    paddingBottom: 10,
    marginBottom: 10,
  },
  ledgerCompactTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#1F2937',
  },
  ledgerCompactPeriod: {
    fontSize: 10,
    color: '#6B7280',
    marginTop: 2,
  },
  viewLedgerPrimaryBtn: {
    backgroundColor: '#8C331A',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  viewLedgerPrimaryBtnText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  ledgerMetricsGrid: {
    flexDirection: 'row',
  },
  ledgerMetricCol: {
    flex: 1,
    alignItems: 'center',
    borderRightWidth: 1,
    borderRightColor: '#EFECE9',
  },
  ledgerMetricLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: '#8A7A70',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  ledgerMetricVal: {
    fontSize: 13,
    fontWeight: '800',
    color: '#1F2937',
  },
  recentInvoicesHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    marginTop: 4,
    paddingHorizontal: 2,
  },
  viewAllLedgerLink: {
    fontSize: 11,
    fontWeight: '700',
    color: '#8C331A',
  },
  invoiceListItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 10,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: '#EFECE9',
  },
  invoiceListNum: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1F2937',
  },
  invoiceListDate: {
    fontSize: 10,
    color: '#6B7280',
    marginTop: 2,
  },
  invoiceListTotal: {
    fontSize: 12,
    fontWeight: '800',
    color: '#8C331A',
  },
  invStatusPill: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
    marginTop: 2,
  },
  invStatusPillText: {
    fontSize: 9,
    fontWeight: '700',
  },
  invStatusPaid: {
    backgroundColor: '#ECFDF5',
  },
  invStatusPaidText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#059669',
  },
  invStatusUnpaid: {
    backgroundColor: '#FEF2F2',
  },
  invStatusUnpaidText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#DC2626',
  },
  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#EFECE9',
    marginTop: 4,
  },
  emptyCardTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#4B5563',
  },
  emptyCardSub: {
    fontSize: 11,
    color: '#9CA3AF',
    textAlign: 'center',
    marginTop: 4,
  },
  centerBox: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
