import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Modal,
  TextInput,
  ActivityIndicator,
  Linking,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';
import billingService, { BackendInvoice, BillingCustomer } from '../../services/billing.service';
import orderService, {
  BackendOrder,
  BackendRecurringOrder,
} from '../../services/order.service';
import { useApp } from '../../context/AppContext';
import { AddCustomerModal, type AddCustomerFormData } from '../../components/customer';
import { CollectPaymentModal, type CollectPaymentFormData } from '../../components/payment';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import AppToast from '../../utils/toast';

export default function CustomerDetailScreen({ route, navigation }: any) {
  const { refreshBackendData } = useApp();
  // Support either customer object, customerId, or companyId passed in route params
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
  const [selectedMonth] = useState<number>(new Date().getMonth() + 1);
  const [selectedYear] = useState<number>(new Date().getFullYear());

  const [invoices, setInvoices] = useState<BackendInvoice[]>([]);

  // Orders & Recurring Orders
  const [recentOrders, setRecentOrders] = useState<BackendOrder[]>([]);
  const [ordersLoading, setOrdersLoading] = useState<boolean>(false);

  const [recurringTemplates, setRecurringTemplates] = useState<BackendRecurringOrder[]>([]);
  const [recurringLoading, setRecurringLoading] = useState<boolean>(false);

  // Modals State
  const [editCustomerModalVisible, setEditCustomerModalVisible] = useState<boolean>(false);
  const [collectModalVisible, setCollectModalVisible] = useState<boolean>(false);
  const [collectAmount, setCollectAmount] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'online' | 'upi' | 'bank_transfer'>('cash');
  const [paymentNotes, setPaymentNotes] = useState<string>('');
  const [submittingPayment, setSubmittingPayment] = useState<boolean>(false);

  // Repeat Order Selection Modal State
  const [repeatOrderModalVisible, setRepeatOrderModalVisible] = useState<boolean>(false);

  // Full Ledger Timeline Modal
  const [ledgerModalVisible, setLedgerModalVisible] = useState<boolean>(false);

  // Custom Confirm Dialog State
  const [confirmDialogConfig, setConfirmDialogConfig] = useState<{
    visible: boolean;
    title: string;
    description?: string;
    confirmLabel?: string;
    cancelLabel?: string;
    type?: 'danger' | 'warning' | 'info' | 'success';
    icon?: string;
    onConfirm: () => void;
  }>({
    visible: false,
    title: '',
    onConfirm: () => {},
  });

  // 1. Fetch Customer Profile & Summary
  const fetchCustomerData = useCallback(async () => {
    if (!customerId) {
      setLoading(false);
      return;
    }
    try {
      const [cust, summary] = await Promise.all([
        billingService.getCustomerById(customerId).catch(() => null),
        billingService.getCustomerSummary(customerId).catch(() => null),
      ]);

      if (cust) {
        setCustomer(cust);
      } else if (initialCustomer) {
        setCustomer({
          id: customerId,
          name: initialCustomer.name || 'Customer',
          phone: initialCustomer.phone || '',
          address: initialCustomer.address || '',
          created_at: new Date().toISOString(),
          total_bills: 0,
          total_billed_amount: '0.00',
          total_pending_amount: String(initialCustomer.amount || '0'),
        });
      }

      if (summary) {
        setCustomerSummary(summary);
        setCollectAmount(summary.total_pending || '0');
      } else if (cust) {
        setCollectAmount(cust.total_pending_amount || '0');
      }
    } catch (err) {
      console.log('Error fetching customer profile:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [customerId, initialCustomer]);

  // 2. Fetch Customer Invoices & Ledger
  const fetchLedgerAndInvoices = useCallback(async () => {
    if (!customerId) return;
    try {
      setLedgerLoading(true);
      const [stmt, invList] = await Promise.all([
        billingService.getCustomerLedger(customerId, selectedYear, selectedMonth).catch(() => null),
        billingService.getCustomerInvoices(customerId).catch(() => []),
      ]);
      setLedgerStatement(stmt);
      setInvoices(invList || []);
    } catch (err) {
      console.log('Error loading customer ledger & invoices:', err);
    } finally {
      setLedgerLoading(false);
    }
  }, [customerId, selectedYear, selectedMonth]);

  // 3. Fetch Customer Orders
  const fetchOrders = useCallback(async () => {
    if (!customerId) return;
    try {
      setOrdersLoading(true);
      const orders = await orderService.getOrders({ customer: customerId });
      setRecentOrders(orders || []);
    } catch (err) {
      console.log('Error fetching customer orders:', err);
    } finally {
      setOrdersLoading(false);
    }
  }, [customerId]);

  // 4. Fetch Customer Recurring Templates
  const fetchRecurringTemplates = useCallback(async () => {
    if (!customerId) return;
    try {
      setRecurringLoading(true);
      const templates = await orderService.getRecurringOrders({ customer: customerId });
      setRecurringTemplates(templates || []);
    } catch (err) {
      console.log('Error fetching recurring templates:', err);
    } finally {
      setRecurringLoading(false);
    }
  }, [customerId]);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      fetchCustomerData();
      fetchLedgerAndInvoices();
      fetchOrders();
      fetchRecurringTemplates();
    });
    fetchCustomerData();
    fetchLedgerAndInvoices();
    fetchOrders();
    fetchRecurringTemplates();
    return unsubscribe;
  }, [navigation, fetchCustomerData, fetchLedgerAndInvoices, fetchOrders, fetchRecurringTemplates]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchCustomerData();
    fetchLedgerAndInvoices();
    fetchOrders();
    fetchRecurringTemplates();
  }, [fetchCustomerData, fetchLedgerAndInvoices, fetchOrders, fetchRecurringTemplates]);

  // --- Actions ---

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
      AppToast.success('Profile Updated', 'Customer details have been saved.');
    } catch (err: any) {
      AppToast.error('Update Failed', err?.message || 'Failed to update customer.');
    }
  };

  // Collect Payment with FIFO Allocation
  const handleConfirmCollectPayment = async (data: CollectPaymentFormData) => {
    if (!customerId) return;

    try {
      setSubmittingPayment(true);
      const res = await billingService.collectCustomerPayment(customerId, {
        amount: data.amount,
        method: data.paymentMethod,
        notes: data.notes || `Payment collection for ${customer?.name || 'Customer'}`,
      });

      setCollectModalVisible(false);
      fetchCustomerData();
      fetchLedgerAndInvoices();
      refreshBackendData();
      AppToast.success(
        'Payment Recorded Successfully',
        `₹${res.amount_allocated} allocated via FIFO.${parseFloat(String(res.unallocated_credit)) > 0 ? ` Advance Credit: ₹${res.unallocated_credit}` : ''}`
      );
    } catch (err: any) {
      AppToast.error('Failed to Collect Payment', err?.message || 'Please check connection.');
      throw err;
    } finally {
      setSubmittingPayment(false);
    }
  };

  // Quick Action 1: New Order -> Navigate directly to QuickBillingScreen
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

  // Recurring Order Templates
  const handleOpenCreateRecurring = () => {
    navigation.navigate('RecurringOrder', {
      customer: customer || initialCustomer,
      customerId,
    });
  };

  const handleOpenEditRecurring = (template: BackendRecurringOrder) => {
    navigation.navigate('RecurringOrder', {
      template,
      customer: customer || initialCustomer,
      customerId,
    });
  };

  const handleTogglePauseRecurring = (template: BackendRecurringOrder) => {
    const willPause = !template.is_paused;
    setConfirmDialogConfig({
      visible: true,
      title: willPause ? 'Pause Recurring Template?' : 'Resume Recurring Template?',
      description: willPause
        ? `Are you sure you want to pause auto-generating daily orders for ${template.customer_name || displayName}?`
        : `Resume daily order generation for ${template.customer_name || displayName}?`,
      confirmLabel: willPause ? 'Pause Template' : 'Resume Template',
      cancelLabel: 'Cancel',
      type: willPause ? 'warning' : 'info',
      icon: willPause ? 'pause-circle-outline' : 'play-circle-outline',
      onConfirm: async () => {
        try {
          if (template.is_paused) {
            await orderService.resumeRecurringOrder(template.id);
            AppToast.success('Schedule Resumed', 'Recurring order template is now active.');
          } else {
            await orderService.pauseRecurringOrder(template.id);
            AppToast.info('Schedule Paused', 'Recurring order template has been paused.');
          }
          fetchRecurringTemplates();
        } catch (err: any) {
          AppToast.error('Error', err?.message || 'Failed to update recurring status.');
        } finally {
          setConfirmDialogConfig(prev => ({ ...prev, visible: false }));
        }
      },
    });
  };

  // Header More Options Menu
  const [headerMenuVisible, setHeaderMenuVisible] = useState(false);
  const handleHeaderMore = () => {
    setHeaderMenuVisible(true);
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
        <View style={styles.customHeaderBar}>
          <TouchableOpacity
            style={styles.headerBackBtn}
            onPress={() => navigation.goBack()}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={22} color="#8C331A" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Customer Profile</Text>
        </View>
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color="#8C331A" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* 1. Header with Back button, Title: Customer Profile, and More Options */}
      <View style={styles.customHeaderBar}>
        <View style={styles.headerLeftGroup}>
          <TouchableOpacity
            style={styles.headerBackBtn}
            onPress={() => navigation.goBack()}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={20} color="#8C331A" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Customer Profile</Text>
        </View>

        <TouchableOpacity
          style={styles.headerMoreBtn}
          onPress={handleHeaderMore}
          activeOpacity={0.7}
        >
          <Ionicons name="ellipsis-vertical" size={19} color="#2A2421" />
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#8C331A']} />
        }
      >
        {/* 2. Customer Profile Card */}
        <View style={styles.profileCard}>
          <View style={styles.profileMainRow}>
            {/* Circular initials avatar */}
            <View style={styles.avatarCircle}>
              <Text style={styles.avatarInitials}>
                {displayName.substring(0, 2).toUpperCase()}
              </Text>
            </View>

            {/* Profile Info */}
            <View style={styles.profileInfoCol}>
              <Text style={styles.profileName} numberOfLines={1}>
                {displayName}
              </Text>

              {displayPhone ? (
                <TouchableOpacity
                  style={styles.phonePill}
                  onPress={() => Linking.openURL(`tel:${displayPhone}`).catch(() => {})}
                  activeOpacity={0.7}
                >
                  <Ionicons name="call" size={11} color="#8C331A" style={{ marginRight: 4 }} />
                  <Text style={styles.phonePillText}>{displayPhone}</Text>
                </TouchableOpacity>
              ) : (
                <Text style={styles.noPhoneText}>No mobile number</Text>
              )}

              <View style={styles.addressRow}>
                <Ionicons name="location-outline" size={13} color="#8E8278" style={{ marginRight: 3, marginTop: 1 }} />
                <Text style={styles.addressText} numberOfLines={1}>
                  {displayAddress}
                </Text>
              </View>
            </View>

            {/* Edit Customer Action */}
            <TouchableOpacity
              style={styles.editCustomerBtn}
              onPress={() => setEditCustomerModalVisible(true)}
              activeOpacity={0.7}
            >
              <Ionicons name="pencil-outline" size={14} color="#8C331A" />
              <Text style={styles.editCustomerBtnText}>Edit</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* 3. Account Overview (Two balanced cards) */}
        <View style={styles.overviewContainer}>
          <View style={[styles.overviewCard, styles.overviewDueCard]}>
            <View style={styles.overviewIconBox}>
              <Ionicons name="alert-circle-outline" size={18} color="#8C331A" />
            </View>
            <Text style={styles.overviewCardLabel}>AMOUNT DUE</Text>
            <Text style={[styles.overviewCardValue, amountDue > 0 ? styles.dueHighlight : styles.clearHighlight]}>
              ₹{amountDue.toLocaleString()}
            </Text>
            <Text style={styles.overviewCardSubtext}>
              {amountDue > 0 ? 'Pending Collection' : 'All Clear / Settled'}
            </Text>
          </View>

          <View style={styles.overviewCard}>
            <View style={[styles.overviewIconBox, { backgroundColor: '#F3EFEA' }]}>
              <Ionicons name="receipt-outline" size={18} color="#6B5E55" />
            </View>
            <Text style={styles.overviewCardLabel}>TOTAL ORDERS</Text>
            <Text style={styles.overviewCardValue}>{totalOrdersCount}</Text>
            <Text style={styles.overviewCardSubtext}>
              {customerSummary ? `Billed: ₹${parseFloat(customerSummary.total_billed).toLocaleString()}` : 'Recorded Orders'}
            </Text>
          </View>
        </View>

        {/* 4. Quick Actions (3 compact actions) */}
        <View style={styles.actionsContainer}>
          <TouchableOpacity
            style={[styles.actionBtn, styles.actionPrimaryBtn]}
            onPress={handleOpenNewOrder}
            activeOpacity={0.8}
          >
            <Ionicons name="cart" size={16} color="#FFFFFF" style={{ marginRight: 5 }} />
            <Text style={styles.actionPrimaryText}>New Order</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionBtn}
            onPress={handleOpenCollectPayment}
            activeOpacity={0.8}
          >
            <Ionicons name="wallet-outline" size={16} color="#8C331A" style={{ marginRight: 5 }} />
            <Text style={styles.actionBtnText}>Collect Payment</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionBtn}
            onPress={handleRepeatOrder}
            activeOpacity={0.8}
          >
            <Ionicons name="repeat" size={16} color="#8C331A" style={{ marginRight: 5 }} />
            <Text style={styles.actionBtnText}>Repeat Order</Text>
          </TouchableOpacity>
        </View>

        {/* 5. Recurring Orders */}
        <View style={styles.sectionWrap}>
          <View style={styles.sectionTitleRow}>
            <View style={styles.titleWithIcon}>
              <Ionicons name="repeat-outline" size={16} color="#8C331A" style={{ marginRight: 5 }} />
              <Text style={styles.sectionHeading}>RECURRING ORDERS</Text>
            </View>
            <TouchableOpacity
              style={styles.headerActionPill}
              onPress={handleOpenCreateRecurring}
              activeOpacity={0.7}
            >
              <Ionicons name="add" size={14} color="#8C331A" />
              <Text style={styles.headerActionPillText}>Add Template</Text>
            </TouchableOpacity>
          </View>

          {recurringLoading ? (
            <ActivityIndicator size="small" color="#8C331A" style={{ marginVertical: 12 }} />
          ) : recurringTemplates.length === 0 ? (
            <View style={styles.emptyCard}>
              <Ionicons name="calendar-outline" size={24} color="#C4BCB5" />
              <Text style={styles.emptyCardTitle}>No Recurring Templates</Text>
              <Text style={styles.emptyCardSub}>Save daily or weekday orders to automate delivery.</Text>
            </View>
          ) : (
            recurringTemplates.map(template => {
              const freqLabel = template.frequency === 'daily'
                ? 'Daily'
                : (template.weekdays
                    ? template.weekdays.split(',').map(d => d.trim().slice(0, 3).toUpperCase()).join(', ')
                    : 'Specific Days');

              return (
                <View key={template.id} style={[styles.compactTemplateCard, template.is_paused && styles.cardPaused]}>
                  <View style={styles.templateTopRow}>
                    <View style={{ flex: 1, marginRight: 8 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <Text style={styles.templateFreqTitle}>{freqLabel}</Text>
                        {template.is_paused ? (
                          <View style={styles.pausedTag}>
                            <Text style={styles.pausedTagText}>PAUSED</Text>
                          </View>
                        ) : (
                          <View style={styles.activeTag}>
                            <Text style={styles.activeTagText}>ACTIVE</Text>
                          </View>
                        )}
                      </View>
                      <Text style={styles.templatePartnerLine} numberOfLines={1}>
                        <Ionicons name="bicycle-outline" size={12} color="#8E8278" />{' '}
                        {template.delivery_partner_name ? `Driver: ${template.delivery_partner_name}` : 'Unassigned driver'}
                      </Text>
                    </View>

                    <TouchableOpacity
                      style={styles.templateManageBtn}
                      onPress={() => handleOpenEditRecurring(template)}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="pencil-outline" size={13} color="#8C331A" />
                      <Text style={styles.templateManageText}>Edit</Text>
                    </TouchableOpacity>
                  </View>

                  {/* Items Summary */}
                  <View style={styles.templatePillsRow}>
                    {template.items && template.items.length > 0 ? (
                      template.items.map((it, idx) => (
                        <View key={it.id || idx} style={styles.templateProductPill}>
                          <Text style={styles.templateProductText}>
                            {it.quantity}x {it.product_name}
                          </Text>
                        </View>
                      ))
                    ) : (
                      <Text style={styles.emptyItemText}>No products specified</Text>
                    )}
                  </View>

                  {/* Quick Toggle Pause/Resume */}
                  <View style={styles.templateBottomBar}>
                    <Text style={styles.templateSubAddress} numberOfLines={1}>
                      {template.delivery_address || 'Standard Delivery'}
                    </Text>
                    <TouchableOpacity
                      style={[styles.pauseToggleBtn, template.is_paused && styles.pauseToggleActive]}
                      onPress={() => handleTogglePauseRecurring(template)}
                      activeOpacity={0.7}
                    >
                      <Ionicons
                        name={template.is_paused ? 'play' : 'pause'}
                        size={11}
                        color={template.is_paused ? '#059669' : '#6B5E55'}
                        style={{ marginRight: 3 }}
                      />
                      <Text style={[styles.pauseToggleText, template.is_paused && { color: '#059669' }]}>
                        {template.is_paused ? 'Resume' : 'Pause'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })
          )}
        </View>

        {/* 6. Recent Orders */}
        <View style={styles.sectionWrap}>
          <View style={styles.sectionTitleRow}>
            <View style={styles.titleWithIcon}>
              <Ionicons name="bag-check-outline" size={16} color="#8C331A" style={{ marginRight: 5 }} />
              <Text style={styles.sectionHeading}>RECENT ORDERS ({recentOrders.length})</Text>
            </View>

            {recentOrders.length > 0 && (
              <TouchableOpacity
                onPress={() => navigation.navigate('Orders')}
                activeOpacity={0.7}
              >
                <Text style={styles.viewLinkText}>View All Orders →</Text>
              </TouchableOpacity>
            )}
          </View>

          {ordersLoading ? (
            <ActivityIndicator size="small" color="#8C331A" style={{ marginVertical: 12 }} />
          ) : recentOrders.length === 0 ? (
            <View style={styles.emptyCard}>
              <Ionicons name="receipt-outline" size={24} color="#C4BCB5" />
              <Text style={styles.emptyCardTitle}>No Orders Yet</Text>
              <Text style={styles.emptyCardSub}>Tap 'New Order' above to start billing.</Text>
            </View>
          ) : (
            recentOrders.slice(0, 4).map(order => (
              <TouchableOpacity
                key={order.id}
                style={styles.cleanOrderCard}
                onPress={() => {
                  if (order.has_invoice && order.invoice_number) {
                    navigation.navigate('InvoiceDetail', {
                      invoice: {
                        id: String(order.id),
                        invoiceNo: order.invoice_number,
                        name: order.customer_name,
                        amount: `₹${parseFloat(order.total_amount).toLocaleString()}`,
                        numericAmount: parseFloat(order.total_amount),
                        deliveryStatus: order.status,
                        items: order.items.map(it => ({
                          id: String(it.id),
                          name: it.product_details?.name || 'Item',
                          qty: it.quantity,
                          price: parseFloat(it.price),
                        })),
                      },
                    });
                  } else {
                    navigation.navigate('Orders');
                  }
                }}
                activeOpacity={0.7}
              >
                <View style={styles.orderCardHeader}>
                  <View>
                    <Text style={styles.orderIdTitle}>Order #{order.id}</Text>
                    <Text style={styles.orderDateSubtitle}>
                      {new Date(order.created_at).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </Text>
                  </View>

                  <View style={styles.orderStatusBadge}>
                    <Text style={styles.orderStatusText}>{order.status.toUpperCase()}</Text>
                  </View>
                </View>

                <Text style={styles.orderItemsPreview} numberOfLines={1}>
                  {order.items && order.items.length > 0
                    ? order.items.map(i => `${i.quantity}x ${i.product_details?.name || 'Item'}`).join(' • ')
                    : 'Order Delivery'}
                </Text>

                <View style={styles.orderCardFooter}>
                  <Text style={styles.orderTotalAmount}>
                    ₹{parseFloat(order.total_amount || '0').toLocaleString()}
                  </Text>

                  {order.has_invoice ? (
                    <View style={styles.invoicedTag}>
                      <Ionicons name="checkmark-done" size={12} color="#059669" style={{ marginRight: 2 }} />
                      <Text style={styles.invoicedTagText}>{order.invoice_number || 'INVOICED'}</Text>
                    </View>
                  ) : (
                    <Text style={styles.pendingInvoiceTag}>Pending Invoicing</Text>
                  )}
                </View>
              </TouchableOpacity>
            ))
          )}
        </View>

        {/* 7. Customer Ledger (Compact Financial Summary) */}
        <View style={styles.sectionWrap}>
          <View style={styles.sectionTitleRow}>
            <View style={styles.titleWithIcon}>
              <Ionicons name="book-outline" size={16} color="#8C331A" style={{ marginRight: 5 }} />
              <Text style={styles.sectionHeading}>CUSTOMER LEDGER</Text>
            </View>

            <TouchableOpacity
              onPress={() => setLedgerModalVisible(true)}
              activeOpacity={0.7}
            >
              <Text style={styles.viewLinkText}>View Full Ledger →</Text>
            </TouchableOpacity>
          </View>

          {ledgerLoading ? (
            <ActivityIndicator size="small" color="#8C331A" style={{ marginVertical: 12 }} />
          ) : ledgerStatement ? (
            <View style={styles.ledgerCompactCard}>
              <View style={styles.ledgerGrid}>
                <View style={styles.ledgerGridCol}>
                  <Text style={styles.ledgerColLabel}>OPENING BAL</Text>
                  <Text style={styles.ledgerColValue}>
                    ₹{parseFloat(ledgerStatement.summary.opening_balance || '0').toLocaleString()}
                  </Text>
                </View>

                <View style={styles.ledgerGridCol}>
                  <Text style={styles.ledgerColLabel}>TOTAL INVOICED</Text>
                  <Text style={[styles.ledgerColValue, { color: '#DC2626' }]}>
                    +₹{parseFloat(ledgerStatement.summary.total_debit || '0').toLocaleString()}
                  </Text>
                </View>

                <View style={styles.ledgerGridCol}>
                  <Text style={styles.ledgerColLabel}>COLLECTIONS</Text>
                  <Text style={[styles.ledgerColValue, { color: '#059669' }]}>
                    -₹{parseFloat(ledgerStatement.summary.total_credit || '0').toLocaleString()}
                  </Text>
                </View>

                <View style={[styles.ledgerGridCol, { borderRightWidth: 0 }]}>
                  <Text style={styles.ledgerColLabel}>AMOUNT DUE</Text>
                  <Text style={[styles.ledgerColValue, { color: '#8C331A', fontWeight: '800' }]}>
                    ₹{parseFloat(ledgerStatement.summary.closing_balance || '0').toLocaleString()}
                  </Text>
                </View>
              </View>

              <View style={styles.ledgerFooterRow}>
                <Text style={styles.ledgerPeriodText}>
                  Passbook: {new Date(ledgerStatement.period.start_date).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}
                </Text>
                <TouchableOpacity
                  style={styles.collectMiniBtn}
                  onPress={handleOpenCollectPayment}
                  activeOpacity={0.7}
                >
                  <Ionicons name="wallet-outline" size={12} color="#8C331A" style={{ marginRight: 4 }} />
                  <Text style={styles.collectMiniBtnText}>Collect Payment</Text>
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

      {/* --- MODALS --- */}

      {/* 1. Edit Customer Modal */}
      <AddCustomerModal
        visible={editCustomerModalVisible}
        title="Edit Customer"
        isEditing={true}
        initialData={{
          name: customer?.name || '',
          phone: customer?.phone || '',
          address: customer?.address || '',
          openingBalance: 0,
        }}
        onClose={() => setEditCustomerModalVisible(false)}
        onSubmit={handleEditCustomerSubmit}
      />

      {/* 2. Select Order to Repeat Modal */}
      <Modal visible={repeatOrderModalVisible} transparent animationType="fade" onRequestClose={() => setRepeatOrderModalVisible(false)} statusBarTranslucent={true}>
        <View style={styles.modalOverlay}>
          <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={() => setRepeatOrderModalVisible(false)} />
          <View style={styles.modalCenterCard}>
            <View style={styles.modalSheetHeader}>
              <View>
                <Text style={styles.modalSheetTitle}>Repeat Previous Order</Text>
                <Text style={styles.modalSheetSubtitle}>
                  Choose an order to prefill items into Quick Billing
                </Text>
              </View>
              <TouchableOpacity onPress={() => setRepeatOrderModalVisible(false)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Ionicons name="close" size={20} color="#6B5E55" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={true} style={{ maxHeight: 380 }} bounces={false}>
              {recentOrders.map(ord => (
                <TouchableOpacity
                  key={ord.id}
                  style={styles.repeatOrderCard}
                  onPress={() => repeatSpecificOrder(ord)}
                  activeOpacity={0.7}
                >
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <Text style={styles.repeatOrderId}>Order #{ord.id}</Text>
                      <Text style={styles.repeatOrderDate}>
                        • {new Date(ord.created_at).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                        })}
                      </Text>
                    </View>
                    <Text style={styles.repeatOrderSummary} numberOfLines={2}>
                      {ord.items && ord.items.length > 0
                        ? ord.items.map(i => `${i.quantity}x ${i.product_details?.name || 'Item'}`).join(', ')
                        : 'No item summary'}
                    </Text>
                  </View>

                  <View style={{ alignItems: 'flex-end', marginLeft: 10 }}>
                    <Text style={styles.repeatOrderTotal}>
                      ₹{parseFloat(ord.total_amount).toLocaleString()}
                    </Text>
                    <View style={styles.repeatSelectBtn}>
                      <Text style={styles.repeatSelectText}>Select</Text>
                      <Ionicons name="arrow-forward" size={11} color="#8C331A" />
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* 3. Collect Payment Modal */}
      <CollectPaymentModal
        visible={collectModalVisible}
        onClose={() => setCollectModalVisible(false)}
        onSubmit={handleConfirmCollectPayment}
        customerName={displayName}
        totalPendingAmount={amountDue}
      />

      {/* 4. Full Ledger Passbook Modal */}
      <Modal visible={ledgerModalVisible} transparent animationType="fade" onRequestClose={() => setLedgerModalVisible(false)} statusBarTranslucent={true}>
        <View style={styles.modalOverlay}>
          <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={() => setLedgerModalVisible(false)} />
          <View style={[styles.modalCenterCard, { maxHeight: '85%' }]}>
            <View style={styles.modalSheetHeader}>
              <View>
                <Text style={styles.modalSheetTitle}>Customer Ledger Passbook</Text>
                <Text style={styles.modalSheetSubtitle}>
                  Chronological financial transactions for {displayName}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setLedgerModalVisible(false)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Ionicons name="close" size={20} color="#6B5E55" />
              </TouchableOpacity>
            </View>

            {ledgerStatement ? (
              <ScrollView showsVerticalScrollIndicator={false}>
                {/* Ledger Period Summary Box */}
                <View style={styles.modalLedgerSummary}>
                  <View style={styles.summaryLine}>
                    <Text style={styles.sumLineLabel}>Opening Balance</Text>
                    <Text style={styles.sumLineValue}>₹{ledgerStatement.summary.opening_balance}</Text>
                  </View>
                  <View style={styles.summaryLine}>
                    <Text style={styles.sumLineLabel}>Total Invoiced (Debits)</Text>
                    <Text style={[styles.sumLineValue, { color: '#DC2626' }]}>+₹{ledgerStatement.summary.total_debit}</Text>
                  </View>
                  <View style={styles.summaryLine}>
                    <Text style={styles.sumLineLabel}>Total Collections (Credits)</Text>
                    <Text style={[styles.sumLineValue, { color: '#059669' }]}>-₹{ledgerStatement.summary.total_credit}</Text>
                  </View>
                  <View style={[styles.summaryLine, { borderTopWidth: 1, borderTopColor: '#EFEAE4', paddingTop: 6, marginTop: 4 }]}>
                    <Text style={styles.sumLineClosingLabel}>Current Balance</Text>
                    <Text style={styles.sumLineClosingValue}>₹{ledgerStatement.summary.closing_balance}</Text>
                  </View>
                </View>

                <Text style={styles.timelineHeader}>TRANSACTION TIMELINE</Text>
                {ledgerStatement.transactions.length === 0 ? (
                  <Text style={styles.emptyNote}>No transactions recorded in this period.</Text>
                ) : (
                  ledgerStatement.transactions.map((tx: any, idx: number) => {
                    const isDebit = parseFloat(tx.debit) > 0;
                    return (
                      <View key={idx} style={styles.timelineRow}>
                        <View style={{ flex: 1, marginRight: 8 }}>
                          <Text style={styles.timelineRef}>{tx.reference_no}</Text>
                          <Text style={styles.timelineDesc} numberOfLines={1}>{tx.description}</Text>
                          <Text style={styles.timelineDate}>{new Date(tx.date).toLocaleDateString()}</Text>
                        </View>
                        <View style={{ alignItems: 'flex-end' }}>
                          <Text style={[styles.timelineAmount, isDebit ? styles.txDebit : styles.txCredit]}>
                            {isDebit ? `+ ₹${tx.debit}` : `- ₹${tx.credit}`}
                          </Text>
                          <Text style={styles.timelineBal}>Bal: ₹{tx.running_balance}</Text>
                        </View>
                      </View>
                    );
                  })
                )}
              </ScrollView>
            ) : (
              <ActivityIndicator size="small" color="#8C331A" style={{ marginVertical: 20 }} />
            )}
          </View>
        </View>
      </Modal>

      {/* Centralized Reusable Confirm Dialog */}
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

      {/* Header Quick Menu Modal */}
      <Modal visible={headerMenuVisible} transparent animationType="fade">
        <TouchableOpacity
          style={styles.menuBackdrop}
          activeOpacity={1}
          onPress={() => setHeaderMenuVisible(false)}
        >
          <View style={styles.menuCard}>
            <View style={styles.menuHeader}>
              <Text style={styles.menuTitle} numberOfLines={1}>{displayName}</Text>
              <Text style={styles.menuSubtitle}>Quick Actions</Text>
            </View>
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => {
                setHeaderMenuVisible(false);
                setEditCustomerModalVisible(true);
              }}
            >
              <Ionicons name="pencil-outline" size={18} color="#8C331A" style={{ marginRight: 12 }} />
              <Text style={styles.menuItemText}>Edit Profile</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => {
                setHeaderMenuVisible(false);
                handleOpenCollectPayment();
              }}
            >
              <Ionicons name="wallet-outline" size={18} color="#8C331A" style={{ marginRight: 12 }} />
              <Text style={styles.menuItemText}>Collect Payment</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => {
                setHeaderMenuVisible(false);
                handleOpenCreateRecurring();
              }}
            >
              <Ionicons name="repeat-outline" size={18} color="#8C331A" style={{ marginRight: 12 }} />
              <Text style={styles.menuItemText}>Create Recurring Template</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.menuItem, { borderBottomWidth: 0 }]}
              onPress={() => setHeaderMenuVisible(false)}
            >
              <Ionicons name="close-circle-outline" size={18} color="#8E8278" style={{ marginRight: 12 }} />
              <Text style={[styles.menuItemText, { color: '#8E8278' }]}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAF8F5',
  },
  scrollContent: {
    paddingBottom: 36,
  },
  centerBox: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  /* 1. Header */
  customHeaderBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#FAF8F5',
    borderBottomWidth: 1,
    borderBottomColor: '#EFEAE4',
  },
  headerLeftGroup: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerBackBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F5EBE6',
    borderWidth: 1,
    borderColor: '#EFE3D9',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#2A2421',
    letterSpacing: -0.3,
  },
  headerMoreBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#EFEAE4',
    justifyContent: 'center',
    alignItems: 'center',
  },

  /* 2. Customer Profile Card */
  profileCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#EFEAE4',
    shadowColor: '#2A2421',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  profileMainRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F5EBE6',
    borderWidth: 1,
    borderColor: '#EFE3D9',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarInitials: {
    fontSize: 18,
    fontWeight: '800',
    color: '#8C331A',
  },
  profileInfoCol: {
    flex: 1,
  },
  profileName: {
    fontSize: 16,
    fontWeight: '800',
    color: '#2A2421',
    letterSpacing: -0.2,
  },
  phonePill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: '#FDF6F3',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
    marginTop: 3,
  },
  phonePillText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#8C331A',
  },
  noPhoneText: {
    fontSize: 11,
    color: '#A0958D',
    fontStyle: 'italic',
    marginTop: 2,
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 3,
  },
  addressText: {
    fontSize: 11,
    color: '#8E8278',
    flex: 1,
  },
  editCustomerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FAF8F5',
    borderWidth: 1,
    borderColor: '#EFEAE4',
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 8,
  },
  editCustomerBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#8C331A',
    marginLeft: 3,
  },

  /* 3. Account Overview (Balanced Cards) */
  overviewContainer: {
    flexDirection: 'row',
    gap: 10,
    marginHorizontal: 16,
    marginTop: 10,
  },
  overviewCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#EFEAE4',
    shadowColor: '#2A2421',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  overviewDueCard: {
    backgroundColor: '#FDF6F3',
    borderColor: '#F5DDD3',
  },
  overviewIconBox: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#F5EBE6',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  overviewCardLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: '#8E8278',
    letterSpacing: 0.5,
  },
  overviewCardValue: {
    fontSize: 18,
    fontWeight: '800',
    color: '#2A2421',
    marginTop: 2,
    letterSpacing: -0.3,
  },
  dueHighlight: {
    color: '#8C331A',
  },
  clearHighlight: {
    color: '#059669',
  },
  overviewCardSubtext: {
    fontSize: 10,
    color: '#8E8278',
    marginTop: 2,
  },

  /* 4. Quick Actions */
  actionsContainer: {
    flexDirection: 'row',
    gap: 8,
    marginHorizontal: 16,
    marginTop: 10,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#EFEAE4',
    borderRadius: 12,
    paddingVertical: 10,
    shadowColor: '#2A2421',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  actionPrimaryBtn: {
    backgroundColor: '#8C331A',
    borderColor: '#8C331A',
  },
  actionPrimaryText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  actionBtnText: {
    color: '#8C331A',
    fontSize: 12,
    fontWeight: '700',
  },

  /* Section Structure */
  sectionWrap: {
    marginHorizontal: 16,
    marginTop: 14,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  titleWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sectionHeading: {
    fontSize: 11,
    fontWeight: '800',
    color: '#8E8278',
    letterSpacing: 0.6,
  },
  headerActionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#EFEAE4',
  },
  headerActionPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#8C331A',
    marginLeft: 2,
  },
  viewLinkText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#8C331A',
  },

  /* Empty State */
  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#EFEAE4',
  },
  emptyCardTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#2A2421',
    marginTop: 5,
  },
  emptyCardSub: {
    fontSize: 11,
    color: '#8E8278',
    textAlign: 'center',
    marginTop: 2,
  },

  /* 5. Recurring Orders (Compact Cards) */
  compactTemplateCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#EFEAE4',
    shadowColor: '#2A2421',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 2,
    elevation: 1,
  },
  cardPaused: {
    opacity: 0.8,
    backgroundColor: '#FAFAF9',
  },
  templateTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  templateFreqTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#8C331A',
  },
  activeTag: {
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
    marginLeft: 6,
  },
  activeTagText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#059669',
  },
  pausedTag: {
    backgroundColor: '#F3EFEA',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
    marginLeft: 6,
  },
  pausedTagText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#8E8278',
  },
  templatePartnerLine: {
    fontSize: 11,
    color: '#8E8278',
    marginTop: 2,
  },
  templateManageBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FAF8F5',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#EFEAE4',
  },
  templateManageText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#8C331A',
    marginLeft: 2,
  },
  templatePillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 5,
    marginVertical: 7,
  },
  templateProductPill: {
    backgroundColor: '#FAF8F5',
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: '#EFEAE4',
  },
  templateProductText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#2A2421',
  },
  emptyItemText: {
    fontSize: 11,
    color: '#8E8278',
    fontStyle: 'italic',
  },
  templateBottomBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: '#FAF8F5',
  },
  templateSubAddress: {
    fontSize: 10,
    color: '#8E8278',
    flex: 1,
    marginRight: 6,
  },
  pauseToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FAF8F5',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: '#EFEAE4',
  },
  pauseToggleActive: {
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0',
  },
  pauseToggleText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#6B5E55',
  },

  /* 6. Recent Orders */
  cleanOrderCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#EFEAE4',
    shadowColor: '#2A2421',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 2,
    elevation: 1,
  },
  orderCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  orderIdTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#2A2421',
  },
  orderDateSubtitle: {
    fontSize: 10,
    color: '#8E8278',
    marginTop: 1,
  },
  orderStatusBadge: {
    backgroundColor: '#F5EBE6',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  orderStatusText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#8C331A',
  },
  orderItemsPreview: {
    fontSize: 12,
    color: '#4B3F38',
    marginVertical: 5,
  },
  orderCardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: '#FAF8F5',
  },
  orderTotalAmount: {
    fontSize: 14,
    fontWeight: '800',
    color: '#2A2421',
  },
  invoicedTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 5,
  },
  invoicedTagText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#059669',
  },
  pendingInvoiceTag: {
    fontSize: 10,
    color: '#8E8278',
    fontStyle: 'italic',
  },

  /* 7. Customer Ledger */
  ledgerCompactCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#EFEAE4',
    shadowColor: '#2A2421',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  ledgerGrid: {
    flexDirection: 'row',
    backgroundColor: '#FAF8F5',
    borderRadius: 10,
    padding: 8,
  },
  ledgerGridCol: {
    flex: 1,
    alignItems: 'center',
    borderRightWidth: 1,
    borderRightColor: '#EFEAE4',
    paddingHorizontal: 2,
  },
  ledgerColLabel: {
    fontSize: 8,
    fontWeight: '800',
    color: '#8E8278',
    textAlign: 'center',
  },
  ledgerColValue: {
    fontSize: 11,
    fontWeight: '700',
    color: '#2A2421',
    marginTop: 2,
    textAlign: 'center',
  },
  ledgerFooterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#FAF8F5',
  },
  ledgerPeriodText: {
    fontSize: 10,
    color: '#8E8278',
    fontWeight: '600',
  },
  collectMiniBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FDF6F3',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#F5DDD3',
  },
  collectMiniBtnText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#8C331A',
  },

  /* Modals */
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalCenterCard: {
    width: '92%',
    maxWidth: 420,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 18,
    shadowColor: '#2A2421',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.16,
    shadowRadius: 12,
    elevation: 10,
    overflow: 'hidden',
  },
  modalSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 18,
    maxHeight: '90%',
  },
  modalSheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  modalSheetTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#2A2421',
  },
  modalSheetSubtitle: {
    fontSize: 11,
    color: '#8E8278',
    marginTop: 2,
  },
  fieldLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#8E8278',
    letterSpacing: 0.5,
    marginTop: 8,
    marginBottom: 4,
  },
  modalInput: {
    backgroundColor: '#FAF8F5',
    borderWidth: 1,
    borderColor: '#EFEAE4',
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 42,
    fontSize: 13,
    color: '#2A2421',
  },
  methodChipsRow: {
    flexDirection: 'row',
    gap: 6,
  },
  methodChip: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 7,
    borderRadius: 8,
    backgroundColor: '#FAF8F5',
    borderWidth: 1,
    borderColor: '#EFEAE4',
  },
  methodChipActive: {
    backgroundColor: '#8C331A',
    borderColor: '#8C331A',
  },
  methodChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#6B5E55',
  },
  methodChipTextActive: {
    color: '#FFFFFF',
  },
  primarySubmitBtn: {
    backgroundColor: '#8C331A',
    borderRadius: 12,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 14,
  },
  primarySubmitText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },

  /* Repeat Order Modal */
  repeatOrderCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FAF8F5',
    borderWidth: 1,
    borderColor: '#EFEAE4',
    borderRadius: 12,
    padding: 10,
    marginBottom: 8,
  },
  repeatOrderId: {
    fontSize: 13,
    fontWeight: '800',
    color: '#2A2421',
  },
  repeatOrderDate: {
    fontSize: 11,
    color: '#8E8278',
    marginLeft: 4,
  },
  repeatOrderSummary: {
    fontSize: 11,
    color: '#4B3F38',
    marginTop: 2,
  },
  repeatOrderTotal: {
    fontSize: 13,
    fontWeight: '800',
    color: '#2A2421',
  },
  repeatSelectBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FDF6F3',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: '#F5DDD3',
    marginTop: 3,
  },
  repeatSelectText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#8C331A',
    marginRight: 2,
  },

  /* Ledger Modal Timeline */
  modalLedgerSummary: {
    backgroundColor: '#FAF8F5',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#EFEAE4',
    marginBottom: 12,
  },
  summaryLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 2,
  },
  sumLineLabel: {
    fontSize: 12,
    color: '#8E8278',
  },
  sumLineValue: {
    fontSize: 12,
    fontWeight: '700',
    color: '#2A2421',
  },
  sumLineClosingLabel: {
    fontSize: 13,
    fontWeight: '800',
    color: '#2A2421',
  },
  sumLineClosingValue: {
    fontSize: 14,
    fontWeight: '800',
    color: '#8C331A',
  },
  timelineHeader: {
    fontSize: 10,
    fontWeight: '800',
    color: '#8E8278',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  emptyNote: {
    fontSize: 11,
    color: '#8E8278',
    textAlign: 'center',
    marginVertical: 12,
  },
  timelineRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#FAF8F5',
  },
  timelineRef: {
    fontSize: 12,
    fontWeight: '700',
    color: '#2A2421',
  },
  timelineDesc: {
    fontSize: 11,
    color: '#8E8278',
    marginTop: 1,
  },
  timelineDate: {
    fontSize: 9,
    color: '#A0958D',
    marginTop: 1,
  },
  timelineAmount: {
    fontSize: 12,
    fontWeight: '800',
  },
  txDebit: {
    color: '#DC2626',
  },
  txCredit: {
    color: '#059669',
  },
  timelineBal: {
    fontSize: 9,
    color: '#8E8278',
    marginTop: 1,
  },
  menuBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(17, 24, 39, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  menuCard: {
    width: '100%',
    maxWidth: 320,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 8,
  },
  menuHeader: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3EFEA',
    backgroundColor: '#FAF8F5',
  },
  menuTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#2A2421',
  },
  menuSubtitle: {
    fontSize: 11,
    color: '#8E8278',
    marginTop: 2,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#FAF8F5',
  },
  menuItemText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2A2421',
  },
});
