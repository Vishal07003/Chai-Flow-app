import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Modal,
  ActivityIndicator,
  Linking,
  RefreshControl,
  Platform,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';
import billingService, { BackendInvoice, BillingCustomer } from '../../services/billing.service';
import orderService, {
  BackendOrder,
  DailyDeliverySchedule,
  CreateDailySchedulePayload,
} from '../../services/order.service';
import { useApp } from '../../context/AppContext';
import { AddCustomerModal, type AddCustomerFormData } from '../../components/customer';
import { CollectPaymentModal, type CollectPaymentFormData } from '../../components/payment';
import { DailyScheduleModal } from '../../components/schedule';
import { ConfirmDialog } from '../../components/ConfirmDialog';
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
  const [scheduleModalVisible, setScheduleModalVisible] = useState<boolean>(false);
  const [editingSchedule, setEditingSchedule] = useState<DailyDeliverySchedule | null>(null);
  const [cancellingDateSchedule, setCancellingDateSchedule] = useState<DailyDeliverySchedule | null>(null);
  const [cancelDateInput, setCancelDateInput] = useState<string>(new Date().toISOString().split('T')[0]);
  const [cancelModalVisible, setCancelModalVisible] = useState<boolean>(false);
  const [cancelReasonInput, setCancelReasonInput] = useState<string>('');

  // Modals & Action States
  const [editCustomerModalVisible, setEditCustomerModalVisible] = useState<boolean>(false);
  const [collectModalVisible, setCollectModalVisible] = useState<boolean>(false);
  const [collectAmount, setCollectAmount] = useState<string>('');
  const [submittingPayment, setSubmittingPayment] = useState<boolean>(false);
  const [repeatOrderModalVisible, setRepeatOrderModalVisible] = useState<boolean>(false);
  const [ledgerModalVisible, setLedgerModalVisible] = useState<boolean>(false);

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
    if (!customerId) {
      if (initialCustomer) {
        setCustomer(initialCustomer);
        setLoading(false);
      }
      return;
    }
    try {
      const [cust, summary] = await Promise.all([
        billingService.getCustomerById(customerId).catch(() => null),
        billingService.getCustomerSummary(customerId).catch(() => null),
      ]);
      if (cust) setCustomer(cust);
      else if (initialCustomer) setCustomer(initialCustomer);
      if (summary) setCustomerSummary(summary);
    } catch (_err) {
      if (initialCustomer) setCustomer(initialCustomer);
    } finally {
      setLoading(false);
    }
  }, [customerId, initialCustomer]);

  // 2. Fetch Customer Invoices & Ledger
  const fetchLedgerAndInvoices = useCallback(async () => {
    if (!customerId) return;
    try {
      setLedgerLoading(true);
      const [stmt, invList] = await Promise.all([
        billingService.getCustomerLedger(customerId).catch(() => null),
        billingService.getCustomerInvoices(customerId).catch(() => []),
      ]);
      setLedgerStatement(stmt);
      setInvoices(invList || []);
    } catch (_err) {
      // Handled silently
    } finally {
      setLedgerLoading(false);
    }
  }, [customerId]);

  // 3. Fetch Recent Orders
  const fetchOrders = useCallback(async () => {
    if (!customerId) return;
    try {
      setOrdersLoading(true);
      const orderList = await orderService.getOrders({ customer: customerId }).catch(() => []);
      setRecentOrders(orderList || []);
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

  // Collect Payment with FIFO Allocation (Strictly Cash Only)
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
      AppToast.error('Failed to Collect Payment', err?.message || 'Please check connection.');
      throw err;
    } finally {
      setSubmittingPayment(false);
    }
  };

  // Quick Action 1: New Order -> Navigate directly to QuickBilling
  const handleOpenNewOrder = () => {
    const custToPass = customer || initialCustomer || {
      id: customerId,
      name: displayName,
      phone: displayPhone,
      address: displayAddress,
    };
    navigation.navigate('QuickBilling', {
      customer: custToPass,
    });
  };

  // Quick Action 2: Collect Payment
  const handleOpenCollectPayment = () => {
    setCollectAmount(String(amountDue > 0 ? amountDue : ''));
    setCollectModalVisible(true);
  };

  // Quick Action 3: Repeat Order
  const handleRepeatOrder = () => {
    if (recentOrders.length === 0) {
      setConfirmDialogConfig({
        visible: true,
        title: 'No Prior Orders',
        description: 'This customer has no prior orders to repeat. Would you like to open Quick Billing to create a fresh order?',
        confirmLabel: 'Open Quick Billing',
        cancelLabel: 'Cancel',
        type: 'info',
        icon: 'cart-outline',
        onConfirm: () => {
          setConfirmDialogConfig(prev => ({ ...prev, visible: false }));
          navigation.navigate('QuickBilling', {
            customer: customer || initialCustomer,
          });
        },
      });
      return;
    }

    if (recentOrders.length === 1) {
      repeatSpecificOrder(recentOrders[0]);
    } else {
      setRepeatOrderModalVisible(true);
    }
  };

  const repeatSpecificOrder = (order: BackendOrder) => {
    setRepeatOrderModalVisible(false);
    const prefilledItems = (order.items || []).map(it => ({
      product_id: Number(it.product || it.product_details?.id),
      product_name: it.product_details?.name || 'Item',
      quantity: it.quantity,
    }));
    navigation.navigate('QuickBilling', {
      customer: customer || initialCustomer,
      prefilledItems,
    });
  };

  // Schedule Actions
  const handleOpenCreateSchedule = () => {
    navigation.navigate('CreateEditDailySchedule', {
      customerId,
      customer: customer || initialCustomer,
    });
  };

  const handleOpenEditSchedule = (sched: DailyDeliverySchedule) => {
    navigation.navigate('CreateEditDailySchedule', {
      schedule: sched,
      customerId,
      customer: customer || initialCustomer,
    });
  };

  const handleSaveSchedule = async (payload: CreateDailySchedulePayload) => {
    if (editingSchedule) {
      await orderService.updateDailySchedule(editingSchedule.id, payload);
      AppToast.success('Schedule Updated', 'Customer delivery schedule updated successfully.');
    } else {
      await orderService.createDailySchedule(payload);
      AppToast.success('Schedule Created', 'Daily delivery schedule activated for this customer.');
    }
    fetchSchedules();
  };

  const handleOpenCancelDateModal = (sched: DailyDeliverySchedule) => {
    setCancellingDateSchedule(sched);
    setCancelDateInput(new Date().toISOString().split('T')[0]);
    setCancelReasonInput('');
    setCancelModalVisible(true);
  };

  const handleConfirmCancelDate = async () => {
    if (!cancellingDateSchedule) return;
    try {
      const res = await orderService.cancelDateDelivery(
        cancellingDateSchedule.id,
        cancelDateInput,
        cancelReasonInput.trim()
      );
      setCancelModalVisible(false);
      fetchSchedules();
      fetchOrders();
      AppToast.info(
        res.case === 'B' ? "Today's Delivery Cancelled" : 'Delivery Date Skipped',
        res.message
      );
    } catch (err: any) {
      AppToast.error('Cancellation Failed', err?.message || 'Could not cancel delivery for selected date.');
    }
  };

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
            <Ionicons name="arrow-back" size={22} color={colors.primary} />
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
      {/* 1. TOP HEADER */}
      <View style={styles.topHeader}>
        <View style={styles.topHeaderLeft}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={22} color={colors.primary} />
          </TouchableOpacity>
          <Text style={styles.screenTitle}>Customer Profile</Text>
        </View>

        <TouchableOpacity
          style={styles.editActionHeaderBtn}
          onPress={() => setEditCustomerModalVisible(true)}
          activeOpacity={0.7}
        >
          <Ionicons name="create-outline" size={18} color={colors.primary} style={{ marginRight: 4 }} />
          <Text style={styles.editActionHeaderText}>Edit</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />
        }
      >
        {/* 2. CUSTOMER IDENTITY CARD */}
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
                  <Ionicons name="call" size={12} color={colors.primary} style={{ marginRight: 5 }} />
                  <Text style={styles.phoneChipText}>{displayPhone}</Text>
                </TouchableOpacity>
              ) : (
                <Text style={styles.noPhoneText}>No mobile number registered</Text>
              )}
            </View>
          </View>

          <View style={styles.addressRow}>
            <Ionicons name="location-outline" size={15} color={colors.textSecondary} style={{ marginRight: 6, marginTop: 1 }} />
            <Text style={styles.addressText} numberOfLines={2}>
              {displayAddress}
            </Text>
          </View>
        </View>

        {/* 3. OVERVIEW METRICS CARDS */}
        <View style={styles.overviewRow}>
          <View style={[styles.overviewMetricCard, amountDue > 0 && styles.overviewMetricDueCard]}>
            <View style={styles.overviewCardTop}>
              <Text style={styles.overviewCardLabel}>AMOUNT DUE</Text>
              <View style={[styles.overviewIconWrap, { backgroundColor: amountDue > 0 ? '#FEF2F2' : '#ECFDF5' }]}>
                <Ionicons
                  name={amountDue > 0 ? 'alert-circle' : 'checkmark-circle'}
                  size={16}
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
                <Ionicons name="cart-outline" size={16} color={colors.primary} />
              </View>
            </View>
            <Text style={styles.overviewCardAmount}>{totalOrdersCount}</Text>
            <Text style={styles.overviewCardSub}>
              {customerSummary?.total_invoices ? `${customerSummary.total_invoices} invoices billed` : 'Lifetime orders'}
            </Text>
          </View>
        </View>

        {/* 4. MAIN ACTION BUTTONS */}
        <View style={styles.actionsBar}>
          <TouchableOpacity
            style={styles.primaryActionBtn}
            onPress={handleOpenNewOrder}
            activeOpacity={0.85}
          >
            <Ionicons name="add-circle" size={18} color={colors.white} style={{ marginRight: 6 }} />
            <Text style={styles.primaryActionText}>New Order</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryActionBtn}
            onPress={handleRepeatOrder}
            activeOpacity={0.7}
          >
            <Ionicons name="repeat" size={17} color={colors.primary} style={{ marginRight: 5 }} />
            <Text style={styles.secondaryActionText}>Repeat Order</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryActionBtn}
            onPress={handleOpenCollectPayment}
            activeOpacity={0.7}
          >
            <Ionicons name="cash-outline" size={17} color={colors.primary} style={{ marginRight: 5 }} />
            <Text style={styles.secondaryActionText}>Collect Cash</Text>
          </TouchableOpacity>
        </View>

        {/* 5. DAILY DELIVERY SCHEDULE */}
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeaderRow}>
            <View style={styles.sectionHeaderLeft}>
              <Ionicons name="time-outline" size={18} color={colors.primary} style={{ marginRight: 6 }} />
              <Text style={styles.sectionTitle}>DAILY DELIVERY SCHEDULE</Text>
            </View>
            <TouchableOpacity
              style={styles.addTemplatePill}
              onPress={handleOpenCreateSchedule}
              activeOpacity={0.7}
            >
              <Ionicons name="add" size={15} color={colors.primary} />
              <Text style={styles.addTemplatePillText}>Create Schedule</Text>
            </TouchableOpacity>
          </View>

          {schedulesLoading ? (
            <ActivityIndicator size="small" color={colors.primary} style={{ marginVertical: 16 }} />
          ) : schedules.length === 0 ? (
            <View style={styles.emptyCard}>
              <Ionicons name="calendar-outline" size={32} color={colors.gray300} style={{ marginBottom: 6 }} />
              <Text style={styles.emptyCardTitle}>No Daily Delivery Schedule</Text>
              <Text style={styles.emptyCardSub}>Configure automated daily orders, delivery time and dedicated partner.</Text>
            </View>
          ) : (
            schedules.map(sched => {
              const weekdaysMap = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
              const daysLabel = sched.weekdays
                ? sched.weekdays
                    .split(',')
                    .map(d => weekdaysMap[parseInt(d.trim(), 10)])
                    .filter(Boolean)
                    .join(', ')
                : 'Everyday';
              const timeDisplay = sched.delivery_time ? sched.delivery_time.substring(0, 5) : '10:00';
              const itemsList = (sched.items || []).map(i => `${i.quantity}x ${i.product_name}`).join(' • ');

              return (
                <View key={sched.id} style={styles.scheduleCard}>
                  {/* Card Header */}
                  <View style={styles.scheduleCardHeader}>
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Text style={styles.scheduleTimeText}>{timeDisplay}</Text>
                        <View style={[styles.statusTag, sched.is_active ? styles.statusTagActive : styles.statusTagPaused]}>
                          <Text style={[styles.statusTagText, sched.is_active ? styles.statusTagTextActive : styles.statusTagTextPaused]}>
                            {sched.is_active ? 'ACTIVE' : 'INACTIVE'}
                          </Text>
                        </View>
                      </View>
                      <Text style={styles.scheduleDaysText}>{daysLabel}</Text>
                    </View>

                    <TouchableOpacity
                      style={styles.scheduleEditBtn}
                      onPress={() => handleOpenEditSchedule(sched)}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.scheduleEditText}>Edit</Text>
                    </TouchableOpacity>
                  </View>

                  {/* Fixed Partner */}
                  <View style={styles.schedulePartnerRow}>
                    <Ionicons name="bicycle-outline" size={15} color={colors.primary} style={{ marginRight: 6 }} />
                    <Text style={styles.schedulePartnerName} numberOfLines={1}>
                      Fixed Partner: <Text style={{ fontWeight: '700', color: colors.textPrimary }}>{sched.delivery_partner_name}</Text>
                    </Text>
                  </View>

                  {/* Products */}
                  <View style={styles.scheduleItemsBox}>
                    <Text style={styles.scheduleItemsText} numberOfLines={2}>
                      {itemsList || 'No products configured'}
                    </Text>
                  </View>

                  {/* Next Scheduled Delivery & Lead Time */}
                  <View style={styles.scheduleFooterRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.scheduleNextLabel}>
                        Next: {sched.next_scheduled_delivery || 'Not scheduled'}
                      </Text>
                      <Text style={styles.scheduleLeadLabel}>
                        Alert Lead: {sched.notification_lead_time_minutes || 30} mins
                      </Text>
                    </View>

                    <TouchableOpacity
                      style={styles.cancelDateBtn}
                      onPress={() => handleOpenCancelDateModal(sched)}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="close-circle-outline" size={13} color={colors.danger} style={{ marginRight: 4 }} />
                      <Text style={styles.cancelDateBtnText}>Cancel Today</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })
          )}
        </View>

        {/* 6. RECENT ORDERS */}
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeaderRow}>
            <View style={styles.sectionHeaderLeft}>
              <Ionicons name="receipt-outline" size={18} color={colors.primary} style={{ marginRight: 6 }} />
              <Text style={styles.sectionTitle}>RECENT ORDERS ({recentOrders.length})</Text>
            </View>
            <TouchableOpacity
              onPress={() => navigation.navigate('Orders')}
              activeOpacity={0.7}
            >
              <Text style={styles.viewAllLink}>View All →</Text>
            </TouchableOpacity>
          </View>

          {ordersLoading ? (
            <ActivityIndicator size="small" color={colors.primary} style={{ marginVertical: 16 }} />
          ) : recentOrders.length === 0 ? (
            <View style={styles.emptyCard}>
              <Ionicons name="cart-outline" size={32} color={colors.gray300} style={{ marginBottom: 6 }} />
              <Text style={styles.emptyCardTitle}>No Prior Orders</Text>
              <Text style={styles.emptyCardSub}>Tap 'New Order' above to start billing.</Text>
            </View>
          ) : (
            recentOrders.slice(0, 5).map(order => {
              const orderDate = new Date(order.created_at).toLocaleDateString('en-IN', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
              });
              const itemsSummary = (order.items || [])
                .map(i => `${i.quantity}x ${i.product_details?.name || 'Item'}`)
                .join(' • ');

              return (
                <TouchableOpacity
                  key={order.id}
                  style={styles.orderCard}
                  onPress={() => navigation.navigate('OrderDetails', { orderId: order.id, order })}
                  activeOpacity={0.7}
                >
                  <View style={styles.orderCardTop}>
                    <View>
                      <Text style={styles.orderCardId}>Order #{order.id}</Text>
                      <Text style={styles.orderCardDate}>{orderDate}</Text>
                    </View>
                    <View style={styles.orderStatusBadge}>
                      <Text style={styles.orderStatusBadgeText}>{order.status.toUpperCase()}</Text>
                    </View>
                  </View>

                  <Text style={styles.orderCardItems} numberOfLines={1}>
                    {itemsSummary || 'Standard Daily Delivery'}
                  </Text>

                  <View style={styles.orderCardBottom}>
                    <Text style={styles.orderCardTotal}>₹{parseFloat(order.total_amount || '0').toLocaleString('en-IN')}</Text>
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

        {/* 7. CUSTOMER LEDGER STATEMENT */}
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeaderRow}>
            <View style={styles.sectionHeaderLeft}>
              <Ionicons name="book-outline" size={18} color={colors.primary} style={{ marginRight: 6 }} />
              <Text style={styles.sectionTitle}>CUSTOMER LEDGER</Text>
            </View>
            <TouchableOpacity
              onPress={() => setLedgerModalVisible(true)}
              activeOpacity={0.7}
            >
              <Text style={styles.viewAllLink}>View Full Ledger →</Text>
            </TouchableOpacity>
          </View>

          {ledgerLoading ? (
            <ActivityIndicator size="small" color={colors.primary} style={{ marginVertical: 16 }} />
          ) : ledgerStatement ? (
            <View style={styles.ledgerCard}>
              <View style={styles.ledgerGrid}>
                <View style={styles.ledgerCol}>
                  <Text style={styles.ledgerColLabel}>OPENING BAL</Text>
                  <Text style={styles.ledgerColValue}>
                    ₹{parseFloat(ledgerStatement.summary?.opening_balance || '0').toLocaleString('en-IN')}
                  </Text>
                </View>

                <View style={styles.ledgerCol}>
                  <Text style={styles.ledgerColLabel}>TOTAL INVOICED</Text>
                  <Text style={[styles.ledgerColValue, { color: colors.danger }]}>
                    +₹{parseFloat(ledgerStatement.summary?.total_debit || '0').toLocaleString('en-IN')}
                  </Text>
                </View>

                <View style={styles.ledgerCol}>
                  <Text style={styles.ledgerColLabel}>COLLECTIONS</Text>
                  <Text style={[styles.ledgerColValue, { color: colors.success }]}>
                    -₹{parseFloat(ledgerStatement.summary?.total_credit || '0').toLocaleString('en-IN')}
                  </Text>
                </View>

                <View style={[styles.ledgerCol, { borderRightWidth: 0 }]}>
                  <Text style={styles.ledgerColLabel}>AMOUNT DUE</Text>
                  <Text style={[styles.ledgerColValue, { color: colors.primary, fontWeight: '800' }]}>
                    ₹{parseFloat(ledgerStatement.summary?.closing_balance || '0').toLocaleString('en-IN')}
                  </Text>
                </View>
              </View>

              <View style={styles.ledgerCardFooter}>
                <Text style={styles.ledgerPeriodText}>
                  Passbook: {ledgerStatement.period?.start_date ? new Date(ledgerStatement.period.start_date).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' }) : 'Current Month'}
                </Text>
                <TouchableOpacity
                  style={styles.collectMiniBtn}
                  onPress={handleOpenCollectPayment}
                  activeOpacity={0.7}
                >
                  <Ionicons name="cash-outline" size={13} color={colors.white} style={{ marginRight: 4 }} />
                  <Text style={styles.collectMiniBtnText}>Collect Cash</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyCardSub}>No ledger passbook entries recorded yet.</Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* --- MODALS & DIALOGS --- */}

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

      {/* 2. Select Order to Repeat Modal */}
      <Modal visible={repeatOrderModalVisible} transparent animationType="fade" onRequestClose={() => setRepeatOrderModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={() => setRepeatOrderModalVisible(false)} />
          <View style={styles.modalCenterBox}>
            <View style={styles.modalHeaderRow}>
              <View>
                <Text style={styles.modalSheetTitle}>Repeat Order</Text>
                <Text style={styles.modalSheetSub}>Choose an order to duplicate products</Text>
              </View>
              <TouchableOpacity onPress={() => setRepeatOrderModalVisible(false)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Ionicons name="close" size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 320 }} showsVerticalScrollIndicator={false}>
              {recentOrders.map(ord => (
                <TouchableOpacity
                  key={ord.id}
                  style={styles.repeatOrderOptionCard}
                  onPress={() => repeatSpecificOrder(ord)}
                  activeOpacity={0.7}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={styles.repeatOptionId}>Order #{ord.id}</Text>
                    <Text style={styles.repeatOptionItems} numberOfLines={1}>
                      {(ord.items || []).map(i => `${i.quantity}x ${i.product_details?.name || 'Item'}`).join(', ')}
                    </Text>
                  </View>
                  <Text style={styles.repeatOptionTotal}>₹{parseFloat(ord.total_amount || '0').toLocaleString('en-IN')}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* 3. Cash Payment Modal (Strictly Cash Only) */}
      <CollectPaymentModal
        visible={collectModalVisible}
        onClose={() => setCollectModalVisible(false)}
        onSubmit={handleConfirmCollectPayment}
        customerName={displayName}
        totalPendingAmount={amountDue}
        initialAmount={collectAmount}
      />

      {/* 4. Full Ledger Passbook Modal */}
      <Modal visible={ledgerModalVisible} transparent animationType="fade" onRequestClose={() => setLedgerModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={() => setLedgerModalVisible(false)} />
          <View style={[styles.modalCenterBox, { maxHeight: '82%' }]}>
            <View style={styles.modalHeaderRow}>
              <View>
                <Text style={styles.modalSheetTitle}>Customer Ledger Passbook</Text>
                <Text style={styles.modalSheetSub}>{displayName} • Detailed Statement</Text>
              </View>
              <TouchableOpacity onPress={() => setLedgerModalVisible(false)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Ionicons name="close" size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {ledgerStatement ? (
              <ScrollView showsVerticalScrollIndicator={false}>
                <View style={styles.ledgerStatementSummary}>
                  <View style={styles.stmtSummaryRow}>
                    <Text style={styles.stmtLabel}>Opening Balance</Text>
                    <Text style={styles.stmtValue}>₹{ledgerStatement.summary?.opening_balance || '0'}</Text>
                  </View>
                  <View style={styles.stmtSummaryRow}>
                    <Text style={styles.stmtLabel}>Total Invoiced (Debits)</Text>
                    <Text style={[styles.stmtValue, { color: colors.danger }]}>+₹{ledgerStatement.summary?.total_debit || '0'}</Text>
                  </View>
                  <View style={styles.stmtSummaryRow}>
                    <Text style={styles.stmtLabel}>Total Collections (Credits)</Text>
                    <Text style={[styles.stmtValue, { color: colors.success }]}>-₹{ledgerStatement.summary?.total_credit || '0'}</Text>
                  </View>
                  <View style={[styles.stmtSummaryRow, { borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 6 }]}>
                    <Text style={[styles.stmtLabel, { fontWeight: '700' }]}>Net Closing Balance</Text>
                    <Text style={[styles.stmtValue, { fontWeight: '800', color: colors.primary }]}>₹{ledgerStatement.summary?.closing_balance || '0'}</Text>
                  </View>
                </View>

                <Text style={styles.transactionsHeader}>TRANSACTION TIMELINE</Text>
                {(!ledgerStatement.transactions || ledgerStatement.transactions.length === 0) ? (
                  <Text style={styles.emptyNote}>No transactions recorded in this period.</Text>
                ) : (
                  ledgerStatement.transactions.map((tx: any, idx: number) => {
                    const isDebit = parseFloat(tx.debit) > 0;
                    return (
                      <View key={idx} style={styles.txRow}>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.txDesc}>{tx.description}</Text>
                          <Text style={styles.txDate}>{tx.date}</Text>
                        </View>
                        <View style={{ alignItems: 'flex-end' }}>
                          <Text style={[styles.txAmount, isDebit ? { color: colors.danger } : { color: colors.success }]}>
                            {isDebit ? `+₹${tx.debit}` : `-₹${tx.credit}`}
                          </Text>
                          <Text style={styles.txRunningBal}>Bal: ₹{tx.running_balance}</Text>
                        </View>
                      </View>
                    );
                  })
                )}
              </ScrollView>
            ) : (
              <ActivityIndicator size="small" color={colors.primary} style={{ marginVertical: 30 }} />
            )}
          </View>
        </View>
      </Modal>

      {/* 5. Daily Schedule Modal */}
      <DailyScheduleModal
        visible={scheduleModalVisible}
        onClose={() => setScheduleModalVisible(false)}
        onSubmit={handleSaveSchedule}
        customerId={customerId || 0}
        customerName={displayName}
        customerAddress={displayAddress}
        existingSchedule={editingSchedule}
      />

      {/* 6. Cancel Date Modal */}
      <Modal visible={cancelModalVisible} transparent animationType="fade" onRequestClose={() => setCancelModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={() => setCancelModalVisible(false)} />
          <View style={styles.modalCenterBox}>
            <View style={styles.modalHeaderRow}>
              <View>
                <Text style={styles.modalSheetTitle}>Cancel Delivery for Date</Text>
                <Text style={styles.modalSheetSub}>{displayName} • Skip Date Exception</Text>
              </View>
              <TouchableOpacity onPress={() => setCancelModalVisible(false)}>
                <Ionicons name="close" size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <View style={{ marginVertical: spacing.md }}>
              <Text style={styles.inputSubLabel}>Select Date to Cancel (YYYY-MM-DD):</Text>
              <TextInput
                style={styles.cancelDateInput}
                value={cancelDateInput}
                onChangeText={setCancelDateInput}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={colors.textMuted}
              />

              <Text style={[styles.inputSubLabel, { marginTop: spacing.sm }]}>Reason for Cancellation:</Text>
              <TextInput
                style={[styles.cancelDateInput, { height: 48 }]}
                value={cancelReasonInput}
                onChangeText={setCancelReasonInput}
                placeholder="e.g. Office closed for public holiday"
                placeholderTextColor={colors.textMuted}
                multiline
              />

              <Text style={styles.cancelNoticeNote}>
                • If an order is already generated for this date, it will be marked cancelled and the partner notified.{'\n'}
                • If not generated yet, the scheduler will skip this date.{'\n'}
                • Future scheduled deliveries remain completely active.
              </Text>
            </View>

            <View style={styles.cancelModalActions}>
              <TouchableOpacity
                style={styles.cancelModalCancelBtn}
                onPress={() => setCancelModalVisible(false)}
              >
                <Text style={styles.cancelModalCancelText}>Back</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.cancelModalConfirmBtn}
                onPress={handleConfirmCancelDate}
              >
                <Text style={styles.cancelModalConfirmText}>Confirm Cancellation</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* 7. Centralized Reusable Confirm Dialog */}
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
  centerBox: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.cardBackground,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  topHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    padding: spacing.xs,
    marginRight: spacing.xs,
  },
  screenTitle: {
    ...typography.heading1,
    color: colors.textPrimary,
  },
  editActionHeaderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F7EFE9',
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: '#F5C6B8',
  },
  editActionHeaderText: {
    ...typography.badge,
    color: colors.primary,
    fontWeight: '700',
  },
  scrollContent: {
    padding: spacing.md,
    paddingBottom: spacing.xxl,
  },

  /* 2. Customer Identity Card */
  identityCard: {
    backgroundColor: colors.cardBackground,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.sm,
    marginBottom: spacing.md,
  },
  identityTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  avatarBox: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FDEBE4',
    borderWidth: 1.5,
    borderColor: '#F5C6B8',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  avatarInitials: {
    ...typography.heading2,
    color: colors.primary,
    fontWeight: '800',
  },
  identityInfoCol: {
    flex: 1,
  },
  customerName: {
    ...typography.heading1,
    color: colors.textPrimary,
    marginBottom: 4,
  },
  phoneChip: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: '#FAF4ED',
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: '#F5C6B8',
  },
  phoneChipText: {
    ...typography.caption,
    fontFamily: 'Inter-SemiBold',
    color: colors.primary,
    fontWeight: '600',
  },
  noPhoneText: {
    ...typography.caption,
    color: colors.textMuted,
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingTop: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  addressText: {
    ...typography.caption,
    color: colors.textSecondary,
    flex: 1,
    lineHeight: 18,
  },

  /* 3. Overview Metrics */
  overviewRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  overviewMetricCard: {
    flex: 1,
    backgroundColor: colors.cardBackground,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.sm,
  },
  overviewMetricDueCard: {
    borderColor: '#FCA5A5',
  },
  overviewCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  overviewCardLabel: {
    ...typography.badge,
    color: colors.textMuted,
    letterSpacing: 0.5,
  },
  overviewIconWrap: {
    width: 26,
    height: 26,
    borderRadius: 13,
    justifyContent: 'center',
    alignItems: 'center',
  },
  overviewCardAmount: {
    ...typography.heading1,
    fontSize: 22,
    fontWeight: '800',
    color: colors.textPrimary,
    marginBottom: 2,
  },
  dueText: {
    color: colors.danger,
  },
  settledText: {
    color: colors.success,
  },
  overviewCardSub: {
    ...typography.caption,
    fontSize: 11,
    color: colors.textSecondary,
  },

  /* 4. Action Buttons */
  actionsBar: {
    flexDirection: 'row',
    gap: spacing.xs,
    marginBottom: spacing.lg,
  },
  primaryActionBtn: {
    flex: 1.2,
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.sm,
  },
  primaryActionText: {
    ...typography.badge,
    fontSize: 13,
    color: colors.white,
    fontWeight: '700',
  },
  secondaryActionBtn: {
    flex: 1,
    backgroundColor: colors.cardBackground,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.sm,
  },
  secondaryActionText: {
    ...typography.badge,
    fontSize: 12,
    color: colors.primary,
    fontWeight: '700',
  },

  /* Common Section Header */
  sectionContainer: {
    marginBottom: spacing.lg,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  sectionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sectionTitle: {
    ...typography.caption,
    fontFamily: 'Inter-Bold',
    fontWeight: '800',
    color: colors.textMuted,
    letterSpacing: 0.6,
  },
  viewAllLink: {
    ...typography.caption,
    fontFamily: 'Inter-SemiBold',
    fontWeight: '600',
    color: colors.primary,
  },
  addTemplatePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F7EFE9',
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: '#F5C6B8',
  },
  addTemplatePillText: {
    ...typography.badge,
    fontSize: 11,
    color: colors.primary,
    fontWeight: '700',
    marginLeft: 2,
  },

  /* Empty state */
  emptyCard: {
    backgroundColor: colors.cardBackground,
    borderRadius: radius.lg,
    padding: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: 'dashed',
  },
  emptyCardTitle: {
    ...typography.body,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 2,
  },
  emptyCardSub: {
    ...typography.caption,
    color: colors.textSecondary,
    textAlign: 'center',
  },

  /* Daily Schedule Styles */
  scheduleCard: {
    backgroundColor: colors.cardBackground,
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.sm,
  },
  scheduleCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  scheduleTimeText: {
    fontSize: 16,
    fontFamily: 'Inter-Bold',
    fontWeight: '800',
    color: colors.textPrimary,
  },
  scheduleDaysText: {
    ...typography.caption,
    fontFamily: 'Inter-Medium',
    color: colors.textSecondary,
    marginTop: 2,
  },
  scheduleEditBtn: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.sm,
    backgroundColor: '#FAF4ED',
    borderWidth: 1,
    borderColor: '#F5C6B8',
  },
  scheduleEditText: {
    fontSize: 11,
    fontFamily: 'Inter-Bold',
    fontWeight: '700',
    color: colors.primary,
  },
  schedulePartnerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  schedulePartnerName: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: colors.textSecondary,
  },
  scheduleItemsBox: {
    backgroundColor: colors.background,
    padding: spacing.xs,
    borderRadius: radius.sm,
    marginVertical: spacing.xs,
  },
  scheduleItemsText: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    color: colors.textPrimary,
    lineHeight: 18,
  },
  scheduleFooterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  scheduleNextLabel: {
    fontSize: 11,
    fontFamily: 'Inter-SemiBold',
    color: colors.primary,
    fontWeight: '700',
  },
  scheduleLeadLabel: {
    fontSize: 10,
    fontFamily: 'Inter-Regular',
    color: colors.textMuted,
    marginTop: 1,
  },
  cancelDateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.sm,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  cancelDateBtnText: {
    fontSize: 11,
    fontFamily: 'Inter-Bold',
    fontWeight: '700',
    color: colors.danger,
  },
  cancelDateInput: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.sm,
    fontSize: 13,
    color: colors.textPrimary,
    height: 38,
    marginTop: 4,
  },
  cancelNoticeNote: {
    fontSize: 11,
    fontFamily: 'Inter-Regular',
    color: colors.textSecondary,
    lineHeight: 16,
    marginTop: spacing.sm,
  },
  cancelModalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  cancelModalCancelBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    borderRadius: radius.md,
    backgroundColor: colors.background,
  },
  cancelModalCancelText: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    color: colors.textSecondary,
  },
  cancelModalConfirmBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    borderRadius: radius.md,
    backgroundColor: colors.danger,
  },
  cancelModalConfirmText: {
    fontSize: 12,
    fontFamily: 'Inter-Bold',
    color: colors.white,
    fontWeight: '700',
  },

  /* Order Cards */
  orderCard: {
    backgroundColor: colors.cardBackground,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.sm,
    marginBottom: spacing.sm,
  },
  orderCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  orderCardId: {
    ...typography.body,
    fontFamily: 'Inter-Bold',
    fontWeight: '700',
    color: colors.textPrimary,
  },
  orderCardDate: {
    ...typography.caption,
    color: colors.textMuted,
  },
  orderStatusBadge: {
    backgroundColor: '#FAF4ED',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: '#F5C6B8',
  },
  orderStatusBadgeText: {
    fontSize: 10,
    fontFamily: 'Inter-Bold',
    color: colors.primary,
    fontWeight: '800',
  },
  orderCardItems: {
    ...typography.caption,
    color: colors.textSecondary,
    marginVertical: 4,
  },
  orderCardBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  orderCardTotal: {
    ...typography.body,
    fontFamily: 'Inter-Bold',
    fontWeight: '800',
    color: colors.textPrimary,
  },
  invoicedTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.approvedBackground,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: radius.sm,
  },
  invoicedTagText: {
    fontSize: 11,
    fontFamily: 'Inter-Bold',
    color: colors.approved,
    fontWeight: '700',
  },
  unbilledTag: {
    fontSize: 11,
    color: colors.textMuted,
    fontStyle: 'italic',
  },

  /* Ledger Card */
  ledgerCard: {
    backgroundColor: colors.cardBackground,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.sm,
    overflow: 'hidden',
  },
  ledgerGrid: {
    flexDirection: 'row',
    paddingVertical: spacing.md,
  },
  ledgerCol: {
    flex: 1,
    alignItems: 'center',
    borderRightWidth: 1,
    borderRightColor: colors.borderLight,
    paddingHorizontal: 4,
  },
  ledgerColLabel: {
    fontSize: 9,
    fontFamily: 'Inter-Bold',
    fontWeight: '800',
    color: colors.textMuted,
    marginBottom: 4,
    textAlign: 'center',
  },
  ledgerColValue: {
    fontSize: 13,
    fontFamily: 'Inter-Bold',
    fontWeight: '700',
    color: colors.textPrimary,
  },
  ledgerCardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FAF8F5',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  ledgerPeriodText: {
    ...typography.caption,
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  collectMiniBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: radius.sm,
  },
  collectMiniBtnText: {
    ...typography.caption,
    fontSize: 11,
    fontWeight: '700',
    color: colors.white,
  },

  /* Modals Overlay */
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  modalCenterBox: {
    width: '100%',
    backgroundColor: colors.cardBackground,
    borderRadius: radius.lg,
    padding: spacing.lg,
    ...shadows.lg,
  },
  modalHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
    paddingBottom: spacing.sm,
  },
  modalSheetTitle: {
    ...typography.heading2,
    color: colors.textPrimary,
    fontWeight: '800',
  },
  modalSheetSub: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 2,
  },
  repeatOrderOptionCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  repeatOptionId: {
    ...typography.body,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  repeatOptionItems: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 2,
  },
  repeatOptionTotal: {
    ...typography.body,
    fontWeight: '800',
    color: colors.primary,
    marginLeft: spacing.sm,
  },

  /* Ledger Statement Modal */
  ledgerStatementSummary: {
    backgroundColor: '#FAF8F5',
    padding: spacing.md,
    borderRadius: radius.md,
    marginBottom: spacing.md,
  },
  stmtSummaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 3,
  },
  stmtLabel: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  stmtValue: {
    ...typography.caption,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  transactionsHeader: {
    fontSize: 11,
    fontFamily: 'Inter-Bold',
    fontWeight: '800',
    color: colors.textMuted,
    marginVertical: spacing.sm,
    letterSpacing: 0.5,
  },
  emptyNote: {
    ...typography.caption,
    color: colors.textMuted,
    textAlign: 'center',
    marginVertical: spacing.md,
  },
  txRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  txDesc: {
    ...typography.caption,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  txDate: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 2,
  },
  txAmount: {
    ...typography.body,
    fontWeight: '700',
  },
  txRunningBal: {
    fontSize: 10,
    color: colors.textSecondary,
    marginTop: 2,
  },
  statusTag: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.sm,
  },
  statusTagActive: {
    backgroundColor: colors.approvedBackground,
  },
  statusTagPaused: {
    backgroundColor: '#F3F4F6',
  },
  statusTagText: {
    fontSize: 10,
    fontFamily: 'Inter-Bold',
    fontWeight: '800',
  },
  statusTagTextActive: {
    color: colors.approved,
  },
  statusTagTextPaused: {
    color: colors.gray500,
  },
  inputSubLabel: {
    fontSize: 11,
    fontFamily: 'Inter-Medium',
    color: colors.textSecondary,
    marginBottom: 4,
  },
});
