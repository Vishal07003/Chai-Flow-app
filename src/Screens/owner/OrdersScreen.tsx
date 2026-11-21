import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  FlatList,
  TextInput,
  RefreshControl,
  ActivityIndicator,
  Modal,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { Header, EmptyState, FloatingButton } from '../../components/common';
import { ReportsPagination } from '../../components/ReportsPagination';
import orderService, {
  BackendOrder,
  OrderInvoicePreview,
  BackendRecurringOrder,
  CreateRecurringOrderPayload,
} from '../../services/order.service';
import billingService, { BillingCustomer } from '../../services/billing.service';
import deliveryService, { DeliveryPartnerProfile } from '../../services/delivery.service';
import productService, { BackendProduct } from '../../services/product.service';
import draftService, { DraftInvoice, DraftStatus } from '../../services/draft.service';
import { useApp } from '../../context/AppContext';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import AppToast from '../../utils/toast';

const todayFilterTabs = [
  { key: 'ALL', label: 'All' },
  { key: 'PENDING', label: 'Pending' },
  { key: 'ASSIGNED', label: 'Assigned' },
  { key: 'ACCEPTED', label: 'Accepted' },
  { key: 'PICKED_UP', label: 'Picked Up' },
  { key: 'ON_THE_WAY', label: 'On The Way' },
  { key: 'DELIVERED', label: 'Delivered' },
  { key: 'FAILED_CANCELLED', label: 'Failed / Cancelled' },
];

const historyStatusTabs = [
  { key: 'ALL', label: 'All' },
  { key: 'DELIVERED', label: 'Delivered' },
  { key: 'CANCELLED', label: 'Cancelled' },
  { key: 'FAILED', label: 'Failed' },
];

const draftStatusTabs = [
  { key: 'ALL', label: 'All' },
  { key: 'draft', label: 'Active Drafts' },
  { key: 'finalized', label: 'Finalized' },
  { key: 'cancelled', label: 'Cancelled' },
];

export default function OrdersScreen({ navigation }: any) {
  const { refreshBackendData } = useApp();
  // Main Top Section: 'today' | 'recurring' | 'history' | 'drafts'
  const [sectionMode, setSectionMode] = useState<'today' | 'recurring' | 'history' | 'drafts'>('today');

  // Orders State
  const [orders, setOrders] = useState<BackendOrder[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Filters
  const [todayFilter, setTodayFilter] = useState<string>('ALL');
  const [historyStatusFilter, setHistoryStatusFilter] = useState<string>('ALL');
  const [historyPartnerFilter, setHistoryPartnerFilter] = useState<number | null>(null);
  const [historyCustomerFilter, setHistoryCustomerFilter] = useState<number | null>(null);

  // History Pagination
  const [historyPage, setHistoryPage] = useState<number>(1);
  const [historyPageSize, setHistoryPageSize] = useState<number>(10);

  // Reset history page when filters, query, or page size change
  useEffect(() => {
    setHistoryPage(1);
  }, [historyStatusFilter, historyPartnerFilter, historyCustomerFilter, searchQuery, historyPageSize]);

  // Recurring Orders State
  const [recurringOrders, setRecurringOrders] = useState<BackendRecurringOrder[]>([]);
  const [loadingRecurring, setLoadingRecurring] = useState<boolean>(false);
  const [generatingRecurringId, setGeneratingRecurringId] = useState<number | null>(null);

  // Draft Bills State
  const [drafts, setDrafts] = useState<DraftInvoice[]>([]);
  const [loadingDrafts, setLoadingDrafts] = useState<boolean>(false);
  const [draftStatusFilter, setDraftStatusFilter] = useState<string>('draft');
  const [selectedDraft, setSelectedDraft] = useState<DraftInvoice | null>(null);
  const [draftModalVisible, setDraftModalVisible] = useState<boolean>(false);
  const [finalizingDraftId, setFinalizingDraftId] = useState<number | null>(null);

  // Modal creation datasets
  const [customers, setCustomers] = useState<BillingCustomer[]>([]);
  const [deliveryPartners, setDeliveryPartners] = useState<DeliveryPartnerProfile[]>([]);
  const [products, setProducts] = useState<BackendProduct[]>([]);

  // Manual Invoice Preview & Generation State
  const [selectedOrder, setSelectedOrder] = useState<BackendOrder | null>(null);
  const [previewLoading, setPreviewLoading] = useState<boolean>(false);
  const [invoicePreview, setInvoicePreview] = useState<OrderInvoicePreview | null>(null);
  const [previewModalVisible, setPreviewModalVisible] = useState<boolean>(false);
  const [generating, setGenerating] = useState<boolean>(false);

  // Centralized Confirm Dialog State
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
    onConfirm: () => { },
  });

  const fetchOrders = useCallback(async () => {
    try {
      const data = await orderService.getOrders();
      setOrders(data || []);
    } catch (err: any) {
      console.log('Error fetching orders:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const fetchRecurringOrders = useCallback(async () => {
    try {
      setLoadingRecurring(true);
      const data = await orderService.getRecurringOrders();
      setRecurringOrders(data || []);
    } catch (err: any) {
      console.log('Error fetching recurring orders:', err);
    } finally {
      setLoadingRecurring(false);
    }
  }, []);

  const fetchDrafts = useCallback(async () => {
    try {
      setLoadingDrafts(true);
      const res = await draftService.getDrafts();
      setDrafts(Array.isArray(res) ? res : (res as any).results || []);
    } catch (err: any) {
      console.log('Error fetching drafts:', err);
    } finally {
      setLoadingDrafts(false);
    }
  }, []);

  const loadCreationData = useCallback(async () => {
    try {
      const [custList, partnerList, prodList] = await Promise.all([
        billingService.getCustomers(),
        deliveryService.getDeliveryPartners(),
        productService.getProductsList(),
      ]);
      setCustomers(custList || []);
      setDeliveryPartners(partnerList || []);

      const mappedProds: BackendProduct[] = (prodList || []).map((p: any) => ({
        id: Number(p.id),
        name: p.name,
        price: String(p.price || '0').replace(/[^0-9.]/g, ''),
        description: p.description,
        is_available: true,
        category: p.category || 1,
        created_at: p.created_at || new Date().toISOString(),
      }));
      setProducts(mappedProds);
    } catch (err) {
      console.log('Error loading data for order creation:', err);
    }
  }, []);

  useEffect(() => {
    const unsubscribe = navigation.addListener?.('focus', () => {
      fetchOrders();
      fetchRecurringOrders();
      fetchDrafts();
      loadCreationData();
    });
    fetchOrders();
    fetchRecurringOrders();
    fetchDrafts();
    loadCreationData();
    return unsubscribe;
  }, [navigation, fetchOrders, fetchRecurringOrders, fetchDrafts, loadCreationData]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchOrders();
    fetchRecurringOrders();
    fetchDrafts();
    loadCreationData();
  }, [fetchOrders, fetchRecurringOrders, fetchDrafts, loadCreationData]);

  // Date partition helper: Is an order created today?
  const isOrderFromToday = (orderDateStr: string) => {
    if (!orderDateStr) return false;
    const orderDate = new Date(orderDateStr);
    const today = new Date();
    return (
      orderDate.getFullYear() === today.getFullYear() &&
      orderDate.getMonth() === today.getMonth() &&
      orderDate.getDate() === today.getDate()
    );
  };

  // 1. Today's Orders Filtered
  const filteredTodayOrders = useMemo(() => {
    return orders.filter(o => {
      // Must be created today
      if (!isOrderFromToday(o.created_at)) return false;

      // Status Filter
      if (todayFilter !== 'ALL') {
        const orderStatus = o.status.toUpperCase();
        const deliveryStatus = (o.delivery_status || '').toUpperCase();

        if (todayFilter === 'PENDING') {
          if (orderStatus !== 'PENDING' || o.delivery_partner_id) return false;
        } else if (todayFilter === 'ASSIGNED') {
          if (deliveryStatus !== 'ASSIGNED' && !o.delivery_partner_id) return false;
        } else if (todayFilter === 'ACCEPTED') {
          if (deliveryStatus !== 'ACCEPTED' && orderStatus !== 'ACCEPTED') return false;
        } else if (todayFilter === 'PICKED_UP') {
          if (deliveryStatus !== 'PICKED_UP' && orderStatus !== 'PREPARING') return false;
        } else if (todayFilter === 'ON_THE_WAY') {
          if (deliveryStatus !== 'ON_THE_WAY' && orderStatus !== 'OUT_FOR_DELIVERY') return false;
        } else if (todayFilter === 'DELIVERED') {
          if (orderStatus !== 'DELIVERED' && deliveryStatus !== 'DELIVERED') return false;
        } else if (todayFilter === 'FAILED_CANCELLED') {
          if (orderStatus !== 'CANCELLED' && deliveryStatus !== 'FAILED') return false;
        }
      }

      // Search Query
      const q = searchQuery.toLowerCase().trim();
      if (!q) return true;
      return (
        String(o.id).includes(q) ||
        o.customer_name?.toLowerCase().includes(q) ||
        o.company_name?.toLowerCase().includes(q) ||
        o.delivery_address?.toLowerCase().includes(q) ||
        o.delivery_partner_name?.toLowerCase().includes(q)
      );
    });
  }, [orders, todayFilter, searchQuery]);

  // 2. Order History Filtered (All orders or prior orders with full filter support)
  const filteredHistoryOrders = useMemo(() => {
    return orders.filter(o => {
      // Status Filter
      if (historyStatusFilter !== 'ALL') {
        const st = o.status.toUpperCase();
        const dst = (o.delivery_status || '').toUpperCase();
        if (historyStatusFilter === 'DELIVERED') {
          if (st !== 'DELIVERED' && dst !== 'DELIVERED') return false;
        } else if (historyStatusFilter === 'CANCELLED') {
          if (st !== 'CANCELLED') return false;
        } else if (historyStatusFilter === 'FAILED') {
          if (dst !== 'FAILED') return false;
        }
      }

      // Customer Filter
      if (historyCustomerFilter && o.customer_profile !== historyCustomerFilter && o.customer !== historyCustomerFilter) {
        return false;
      }

      // Partner Filter
      if (historyPartnerFilter && o.delivery_partner_id !== historyPartnerFilter) {
        return false;
      }

      // Search Query
      const q = searchQuery.toLowerCase().trim();
      if (!q) return true;
      return (
        String(o.id).includes(q) ||
        o.customer_name?.toLowerCase().includes(q) ||
        o.company_name?.toLowerCase().includes(q) ||
        o.delivery_address?.toLowerCase().includes(q) ||
        o.delivery_partner_name?.toLowerCase().includes(q) ||
        (o.invoice_number && o.invoice_number.toLowerCase().includes(q))
      );
    });
  }, [orders, historyStatusFilter, historyCustomerFilter, historyPartnerFilter, searchQuery]);

  // Paginated History Orders
  const paginatedHistoryOrders = useMemo(() => {
    const start = (historyPage - 1) * historyPageSize;
    return filteredHistoryOrders.slice(start, start + historyPageSize);
  }, [filteredHistoryOrders, historyPage, historyPageSize]);

  // 3. Recurring Orders Filtered
  const filteredRecurringOrders = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return recurringOrders;
    return recurringOrders.filter(
      r =>
        r.customer_name?.toLowerCase().includes(q) ||
        r.delivery_address?.toLowerCase().includes(q) ||
        r.delivery_partner_name?.toLowerCase().includes(q) ||
        r.notes?.toLowerCase().includes(q)
    );
  }, [recurringOrders, searchQuery]);

  // 4. Draft Bills Filtered
  const filteredDrafts = useMemo(() => {
    return drafts.filter(d => {
      // Status Filter
      if (draftStatusFilter !== 'ALL') {
        if (d.status !== draftStatusFilter) return false;
      }

      // Search Query
      const q = searchQuery.toLowerCase().trim();
      if (!q) return true;
      return (
        d.draft_number?.toLowerCase().includes(q) ||
        d.customer_name?.toLowerCase().includes(q) ||
        d.delivery_partner_name?.toLowerCase().includes(q) ||
        d.notes?.toLowerCase().includes(q)
      );
    });
  }, [drafts, draftStatusFilter, searchQuery]);

  // Order Details Navigation
  const handleOpenOrderDetails = (order: BackendOrder) => {
    navigation.navigate('OrderDetails', {
      orderId: order.id,
      order,
    });
  };

  // Draft Actions
  const handleOpenDraftDetails = (draft: DraftInvoice) => {
    setSelectedDraft(draft);
    setDraftModalVisible(true);
  };

  const handleEditDraft = (draft: DraftInvoice) => {
    navigation.navigate('QuickBilling', {
      draftId: draft.id,
    });
  };

  const handleCancelDraft = (draft: DraftInvoice) => {
    setConfirmDialogConfig({
      visible: true,
      title: 'Cancel Draft Bill?',
      description: `Are you sure you want to cancel draft ${draft.draft_number}? Any attached orders will be unlinked and restored to unbilled status.`,
      confirmLabel: 'Cancel Draft',
      cancelLabel: 'Keep Draft',
      type: 'danger',
      icon: 'close-circle-outline',
      onConfirm: async () => {
        try {
          await draftService.cancelDraft(draft.id);
          AppToast.success('Draft Cancelled', `Draft ${draft.draft_number} has been cancelled.`);
          fetchDrafts();
          fetchOrders();
          setDraftModalVisible(false);
        } catch (err: any) {
          AppToast.error('Cancellation Failed', err?.message || 'Failed to cancel draft bill.');
        } finally {
          setConfirmDialogConfig(prev => ({ ...prev, visible: false }));
        }
      },
    });
  };

  const handleFinalizeDraft = (draft: DraftInvoice) => {
    setConfirmDialogConfig({
      visible: true,
      title: 'Finalize Official Invoice?',
      description: `Convert draft ${draft.draft_number} into an official tax invoice? This will post debits to the customer ledger and automatically apply available customer advance balances.`,
      confirmLabel: 'Finalize Invoice',
      cancelLabel: 'Keep Draft',
      type: 'info',
      icon: 'checkmark-circle-outline',
      onConfirm: async () => {
        try {
          setFinalizingDraftId(draft.id);
          const res = await draftService.finalizeDraft(draft.id);
          AppToast.success('Invoice Finalized', res.message || `Invoice ${res.invoice?.invoice_number || ''} generated successfully.`);
          setDraftModalVisible(false);
          await Promise.all([
            fetchDrafts(),
            fetchOrders(),
            refreshBackendData?.(),
          ]);
          if (res.invoice) {
            navigation.navigate('InvoiceDetail', { invoice: res.invoice });
          }
        } catch (err: any) {
          AppToast.error('Finalization Failed', err?.message || 'Failed to finalize draft into official invoice.');
        } finally {
          setFinalizingDraftId(null);
          setConfirmDialogConfig(prev => ({ ...prev, visible: false }));
        }
      },
    });
  };

  // Floating Action Button Handler
  const handleOpenCreateFlow = () => {
    if (sectionMode === 'recurring') {
      handleOpenNewRecurring();
    } else if (sectionMode === 'drafts') {
      navigation.navigate('QuickBilling');
    } else {
      navigation.navigate('CreateOrder', { mode: 'order' });
    }
  };

  // Open Invoice Preview Modal
  const handleOpenInvoicePreview = async (order: BackendOrder) => {
    try {
      setSelectedOrder(order);
      setPreviewLoading(true);
      setPreviewModalVisible(true);
      const preview = await orderService.getInvoicePreview(order.id);
      setInvoicePreview(preview);
    } catch (err: any) {
      AppToast.error('Preview Failed', err?.message || 'Failed to load invoice preview.');
      setPreviewModalVisible(false);
    } finally {
      setPreviewLoading(false);
    }
  };

  // Confirm Manual Invoice Generation
  const handleConfirmGenerateInvoice = async () => {
    if (!selectedOrder) return;

    setConfirmDialogConfig({
      visible: true,
      title: 'Generate Official Invoice?',
      description: `Issue official tax invoice for Order #${selectedOrder.id} (${selectedOrder.company_name || selectedOrder.customer_name}) and debit customer ledger?`,
      confirmLabel: 'Issue Invoice',
      cancelLabel: 'Cancel',
      type: 'info',
      icon: 'receipt-outline',
      onConfirm: async () => {
        try {
          setGenerating(true);
          const result = await orderService.generateManualInvoice(selectedOrder.id);
          setPreviewModalVisible(false);
          fetchOrders();
          AppToast.success(
            'Invoice Issued',
            `Official Invoice #${result.invoice_number || 'Generated'} debited to customer ledger.`
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

  // Recurring Order Handlers
  const handleOpenNewRecurring = () => {
    navigation.navigate('RecurringOrder', { template: null });
  };

  const handleOpenEditRecurring = (template: BackendRecurringOrder) => {
    navigation.navigate('RecurringOrder', { template });
  };

  const handleTogglePause = (template: BackendRecurringOrder) => {
    const willPause = !template.is_paused;
    setConfirmDialogConfig({
      visible: true,
      title: willPause ? 'Pause Recurring Order?' : 'Resume Recurring Order?',
      description: willPause
        ? `Pause daily recurring order generation for ${template.customer_name}?`
        : `Resume daily recurring order generation for ${template.customer_name}?`,
      confirmLabel: willPause ? 'Pause Schedule' : 'Resume Schedule',
      cancelLabel: 'Cancel',
      type: willPause ? 'warning' : 'info',
      icon: willPause ? 'pause-circle-outline' : 'play-circle-outline',
      onConfirm: async () => {
        try {
          if (template.is_paused) {
            await orderService.resumeRecurringOrder(template.id);
            AppToast.success('Schedule Resumed', `Schedule for ${template.customer_name} is active.`);
          } else {
            await orderService.pauseRecurringOrder(template.id);
            AppToast.info('Schedule Paused', `Schedule for ${template.customer_name} is paused.`);
          }
          fetchRecurringOrders();
        } catch (err: any) {
          AppToast.error('Update Failed', err?.message || 'Failed to update schedule status.');
        } finally {
          setConfirmDialogConfig(prev => ({ ...prev, visible: false }));
        }
      },
    });
  };

  const handleToggleSkipToday = (template: BackendRecurringOrder) => {
    const todayStr = new Date().toISOString().split('T')[0];
    const isSkipped = (template.skipped_dates || []).includes(todayStr);

    setConfirmDialogConfig({
      visible: true,
      title: isSkipped ? "Restore Today's Order?" : "Skip Today's Order?",
      description: isSkipped
        ? `Re-enable automated order generation for ${template.customer_name} for today (${todayStr})?`
        : `Skip generating the order for ${template.customer_name} for today (${todayStr})?`,
      confirmLabel: isSkipped ? 'Restore Today' : 'Skip Today',
      cancelLabel: 'Cancel',
      type: isSkipped ? 'info' : 'warning',
      icon: isSkipped ? 'refresh-outline' : 'close-circle-outline',
      onConfirm: async () => {
        try {
          if (isSkipped) {
            await orderService.unskipRecurringDate(template.id, todayStr);
            AppToast.success('Restored', `Schedule for today (${todayStr}) restored.`);
          } else {
            await orderService.skipRecurringDate(template.id, todayStr);
            AppToast.info('Skipped', `Order generation skipped for today (${todayStr}).`);
          }
          fetchRecurringOrders();
        } catch (err: any) {
          AppToast.error('Skip Failed', err?.message || 'Failed to update skip status.');
        } finally {
          setConfirmDialogConfig(prev => ({ ...prev, visible: false }));
        }
      },
    });
  };

  const handleGenerateTodayOrder = (template: BackendRecurringOrder) => {
    setConfirmDialogConfig({
      visible: true,
      title: "Generate Today's Order?",
      description: `Generate today's commercial order for ${template.customer_name}?`,
      confirmLabel: 'Generate Now',
      cancelLabel: 'Cancel',
      type: 'info',
      icon: 'flash-outline',
      onConfirm: async () => {
        try {
          setGeneratingRecurringId(template.id);
          const res = await orderService.generateOrderFromRecurring(template.id);
          fetchOrders();
          fetchRecurringOrders();
          if (res.already_generated) {
            AppToast.info('Already Generated', res.message);
          } else {
            AppToast.success('Order Created', res.message);
          }
        } catch (err: any) {
          AppToast.error('Generation Error', err?.message || err?.detail || 'Failed to generate order.');
        } finally {
          setGeneratingRecurringId(null);
          setConfirmDialogConfig(prev => ({ ...prev, visible: false }));
        }
      },
    });
  };

  // Render Order Card (Reusable for Today & History)
  const renderOrderCard = ({ item }: { item: BackendOrder }) => {
    const totalNum = parseFloat(item.total_amount) || 0;
    const hasInvoice = item.has_invoice;
    const deliveryPartner = item.delivery_partner_name;
    const deliveryStatus = item.delivery_status || 'assigned';

    // Status colors
    const getBadgeColor = (status: string) => {
      switch (status.toLowerCase()) {
        case 'delivered':
          return '#059669';
        case 'out_for_delivery':
        case 'on_the_way':
          return '#3B82F6';
        case 'preparing':
        case 'accepted':
        case 'picked_up':
          return '#D97706';
        case 'cancelled':
        case 'failed':
          return '#DC2626';
        default:
          return '#8C331A';
      }
    };

    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => handleOpenOrderDetails(item)}
        activeOpacity={0.7}
      >
        <View style={styles.cardHeader}>
          <View>
            <Text style={styles.orderIdText}>Order #{item.id}</Text>
            <Text style={styles.clientName}>
              {item.company_name || item.customer_name}
            </Text>
            <Text style={styles.orderDateText}>
              {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} •{' '}
              {new Date(item.created_at).toLocaleDateString()}
            </Text>
          </View>

          <View style={[styles.statusPill, { backgroundColor: `${getBadgeColor(item.status)}15` }]}>
            <Text style={[styles.statusPillText, { color: getBadgeColor(item.status) }]}>
              {item.status.replace(/_/g, ' ').toUpperCase()}
            </Text>
          </View>
        </View>

        <View style={styles.cardBody}>
          <Text style={styles.addressText} numberOfLines={1}>
            <Ionicons name="location-outline" size={13} color="#8E8278" />{' '}
            {item.delivery_address || 'Shop delivery'}
          </Text>

          <Text style={styles.itemsSummary}>
            {item.items && item.items.length > 0
              ? item.items.map(i => `${i.quantity}x ${i.product_details?.name || 'Item'}`).join(' • ')
              : 'Commercial supply order'}
          </Text>

          {deliveryPartner ? (
            <View style={styles.driverTagRow}>
              <Ionicons name="bicycle-outline" size={13} color="#2A2421" />
              <Text style={styles.driverTagText}>
                Driver: {deliveryPartner} ({deliveryStatus.replace(/_/g, ' ')})
              </Text>
            </View>
          ) : (
            <View style={styles.driverTagRow}>
              <Ionicons name="alert-circle-outline" size={13} color="#D97706" />
              <Text style={[styles.driverTagText, { color: '#D97706' }]}>
                Unassigned Driver
              </Text>
            </View>
          )}
        </View>

        <View style={styles.cardFooter}>
          <View>
            <Text style={styles.amountLabel}>Total Billable</Text>
            <Text style={styles.amountValue}>₹{totalNum.toLocaleString()}</Text>
          </View>

          <View style={styles.cardFooterActions}>
            {hasInvoice ? (
              <View style={styles.invoicedBadge}>
                <Ionicons name="checkmark-done" size={13} color="#059669" />
                <Text style={styles.invoicedBadgeText}>
                  {item.invoice_number || 'INVOICED'}
                </Text>
              </View>
            ) : (
              <TouchableOpacity
                style={styles.generateBtn}
                onPress={() => handleOpenInvoicePreview(item)}
                activeOpacity={0.8}
              >
                <Ionicons name="receipt-outline" size={13} color="#FFFFFF" style={{ marginRight: 4 }} />
                <Text style={styles.generateBtnText}>Invoice</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={styles.viewDetailsBtn}
              onPress={() => handleOpenOrderDetails(item)}
              activeOpacity={0.7}
            >
              <Text style={styles.viewDetailsBtnText}>Details →</Text>
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  // Render Recurring Order Item (Compact Card Layout)
  const renderRecurringItem = ({ item }: { item: BackendRecurringOrder }) => {
    const todayStr = new Date().toISOString().split('T')[0];
    const isSkippedToday = (item.skipped_dates || []).includes(todayStr);
    const isPaused = item.is_paused;
    const isGeneratedToday = !!item.today_order_generated;
    const isScheduledToday = item.is_scheduled_today;
    const isGenerating = generatingRecurringId === item.id;

    const frequencyLabel =
      item.frequency === 'daily'
        ? 'Daily'
        : item.weekdays && typeof item.weekdays === 'string' && item.weekdays.trim().length > 0
          ? item.weekdays
            .split(',')
            .map(d => d.trim().slice(0, 3).toUpperCase())
            .join(', ')
          : 'Specific Days';

    // Total products & total units count
    const productCount = (item.items || []).length;
    const totalScheduledUnits = (item.items || []).reduce((acc, it) => acc + (it.quantity || 0), 0);

    // Calculate estimated recurring amount based on unit_price or product_price
    const estimatedAmount = (item.items || []).reduce((acc, it) => {
      const priceVal = it.unit_price ? parseFloat(it.unit_price) : parseFloat(it.product_price || '0');
      return acc + ((isNaN(priceVal) ? 0 : priceVal) * (it.quantity || 0));
    }, 0);

    // Next scheduled date calculation text
    const nextDateText = isPaused
      ? 'Schedule Paused'
      : isSkippedToday
        ? 'Tomorrow'
        : isScheduledToday
          ? 'Today'
          : 'Next Scheduled Day';

    return (
      <View style={[styles.compactRecCard, isPaused && styles.cardPaused]}>
        {/* Top Header Row: Customer Name, Status Badge & Edit Action */}
        <View style={styles.compactRecTopRow}>
          <View style={{ flex: 1, marginRight: 8 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text style={styles.compactRecCustName} numberOfLines={1}>
                {item.customer_name}
              </Text>
              <View
                style={[
                  styles.compactStatusPill,
                  isPaused ? styles.compactStatusPaused : styles.compactStatusActive,
                ]}
              >
                <Text
                  style={[
                    styles.compactStatusText,
                    isPaused ? styles.compactStatusTextPaused : styles.compactStatusTextActive,
                  ]}
                >
                  {isPaused ? 'PAUSED' : 'ACTIVE'}
                </Text>
              </View>
            </View>
            <View style={styles.compactSubInfoRow}>
              <Ionicons name="repeat" size={11} color="#8C331A" style={{ marginRight: 3 }} />
              <Text style={styles.compactFreqText}>{frequencyLabel}</Text>
              <Text style={styles.compactDotDivider}>•</Text>
              <Ionicons name="bicycle-outline" size={12} color="#4B5563" style={{ marginRight: 3 }} />
              <Text style={styles.compactPartnerText} numberOfLines={1}>
                {item.delivery_partner_name || 'Unassigned'}
              </Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.compactEditBtn}
            onPress={() => handleOpenEditRecurring(item)}
            activeOpacity={0.7}
          >
            <Ionicons name="pencil" size={12} color="#8C331A" style={{ marginRight: 3 }} />
            <Text style={styles.compactEditBtnText}>Edit</Text>
          </TouchableOpacity>
        </View>

        {/* Metric Badges Grid: Products, Units, Est. Amount, Next Scheduled Date */}
        <View style={styles.compactMetricsGrid}>
          <View style={styles.compactMetricItem}>
            <Text style={styles.compactMetricLabel}>Products</Text>
            <Text style={styles.compactMetricVal}>{productCount} items</Text>
          </View>
          <View style={styles.compactMetricItem}>
            <Text style={styles.compactMetricLabel}>Units</Text>
            <Text style={styles.compactMetricVal}>{totalScheduledUnits} units</Text>
          </View>
          <View style={styles.compactMetricItem}>
            <Text style={styles.compactMetricLabel}>Est. Amount</Text>
            <Text style={styles.compactMetricVal}>₹{estimatedAmount.toLocaleString()}</Text>
          </View>
          <View style={styles.compactMetricItem}>
            <Text style={styles.compactMetricLabel}>Next Date</Text>
            <Text style={[styles.compactMetricVal, isScheduledToday && !isSkippedToday && !isPaused && { color: '#059669' }]}>
              {nextDateText}
            </Text>
          </View>
        </View>

        {/* Compact Footer Actions: Pause/Resume, Skip Today, Generate Today */}
        <View style={styles.compactRecFooter}>
          <TouchableOpacity
            style={[styles.compactActionBtn, isPaused && styles.compactActionBtnActive]}
            onPress={() => handleTogglePause(item)}
            activeOpacity={0.7}
          >
            <Ionicons
              name={isPaused ? 'play' : 'pause'}
              size={12}
              color={isPaused ? '#059669' : '#4B5563'}
              style={{ marginRight: 4 }}
            />
            <Text style={[styles.compactActionBtnText, isPaused && { color: '#059669', fontWeight: '700' }]}>
              {isPaused ? 'Resume' : 'Pause'}
            </Text>
          </TouchableOpacity>

          {!isPaused && (
            <TouchableOpacity
              style={[styles.compactActionBtn, isSkippedToday && styles.compactActionBtnWarning]}
              onPress={() => handleToggleSkipToday(item)}
              activeOpacity={0.7}
            >
              <Ionicons
                name={isSkippedToday ? 'arrow-undo-outline' : 'close-circle-outline'}
                size={12}
                color={isSkippedToday ? '#8C331A' : '#4B5563'}
                style={{ marginRight: 4 }}
              />
              <Text style={[styles.compactActionBtnText, isSkippedToday && { color: '#8C331A', fontWeight: '700' }]}>
                {isSkippedToday ? 'Unskip' : 'Skip Today'}
              </Text>
            </TouchableOpacity>
          )}

          {isGeneratedToday ? (
            <View style={styles.compactGeneratedBadge}>
              <Ionicons name="checkmark-done" size={12} color="#059669" style={{ marginRight: 3 }} />
              <Text style={styles.compactGeneratedText}>Order Ready</Text>
            </View>
          ) : (
            <TouchableOpacity
              style={[
                styles.compactGenerateBtn,
                (isPaused || isSkippedToday) && styles.generateTodayBtnDisabled,
              ]}
              onPress={() => handleGenerateTodayOrder(item)}
              disabled={isGenerating || isPaused || isSkippedToday}
              activeOpacity={0.8}
            >
              {isGenerating ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Ionicons name="flash" size={11} color="#FFFFFF" style={{ marginRight: 3 }} />
                  <Text style={styles.compactGenerateBtnText}>Generate</Text>
                </>
              )}
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  // Render Draft Card
  const renderDraftCard = ({ item }: { item: DraftInvoice }) => {
    const isDraft = item.status === 'draft';
    const isFinalized = item.status === 'finalized';
    const isCancelled = item.status === 'cancelled';
    const itemCount = item.items?.length || 0;
    const orderCount = item.draft_orders?.length || 0;
    const isFinalizing = finalizingDraftId === item.id;
    const isQuickBilling = item.billing_source === 'quick_billing';

    const getStatusStyle = () => {
      switch (item.status) {
        case 'finalized':
          return { bg: '#ECFDF5', text: '#059669', label: 'FINALIZED' };
        case 'cancelled':
          return { bg: '#FEF2F2', text: '#DC2626', label: 'CANCELLED' };
        default:
          return { bg: '#FEF3C7', text: '#D97706', label: 'ACTIVE DRAFT' };
      }
    };

    const statusInfo = getStatusStyle();

    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => handleOpenDraftDetails(item)}
        activeOpacity={0.7}
      >
        <View style={styles.cardHeader}>
          <View style={{ flex: 1, marginRight: 8 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text style={styles.orderIdText}>{item.draft_number}</Text>
              <View
                style={[
                  styles.draftTypeBadge,
                  isQuickBilling ? styles.draftTypeQuick : styles.draftTypeOrder,
                ]}
              >
                <Text
                  style={[
                    styles.draftTypeBadgeText,
                    isQuickBilling ? styles.draftTypeQuickText : styles.draftTypeOrderText,
                  ]}
                >
                  {isQuickBilling ? 'Quick Bill' : 'Order Bill'}
                </Text>
              </View>
            </View>
            <Text style={styles.clientName}>{item.customer_name || 'Walk-in Customer'}</Text>
            <Text style={styles.orderDateText}>
              Created {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} •{' '}
              {new Date(item.created_at).toLocaleDateString()}
            </Text>
          </View>

          <View style={[styles.statusPill, { backgroundColor: statusInfo.bg }]}>
            <Text style={[styles.statusPillText, { color: statusInfo.text }]}>{statusInfo.label}</Text>
          </View>
        </View>

        <View style={styles.cardBody}>
          <View style={styles.draftMetaRow}>
            <View style={styles.draftMetaItem}>
              <Ionicons name="cart-outline" size={13} color="#8E8278" style={{ marginRight: 3 }} />
              <Text style={styles.draftMetaText}>
                {itemCount} {itemCount === 1 ? 'item' : 'items'}
                {orderCount > 0 ? ` • ${orderCount} ${orderCount === 1 ? 'order' : 'orders'}` : ''}
              </Text>
            </View>

            {item.delivery_partner_name ? (
              <View style={styles.draftMetaItem}>
                <Ionicons name="bicycle-outline" size={13} color="#8E8278" style={{ marginRight: 3 }} />
                <Text style={styles.draftMetaText}>{item.delivery_partner_name}</Text>
              </View>
            ) : null}

            {item.due_date ? (
              <View style={styles.draftMetaItem}>
                <Ionicons name="calendar-outline" size={13} color="#8E8278" style={{ marginRight: 3 }} />
                <Text style={styles.draftMetaText}>Due: {item.due_date}</Text>
              </View>
            ) : null}
          </View>

          {item.notes ? (
            <Text style={styles.draftNotesText} numberOfLines={1}>
              Note: {item.notes}
            </Text>
          ) : null}
        </View>

        <View style={styles.cardFooter}>
          <View>
            <Text style={styles.amountLabel}>Estimated Total</Text>
            <Text style={styles.amountValue}>₹{Number(item.grand_total || 0).toLocaleString()}</Text>
          </View>

          <View style={styles.cardFooterActions}>
            <TouchableOpacity
              style={styles.compactActionBtn}
              onPress={() => handleOpenDraftDetails(item)}
              activeOpacity={0.7}
            >
              <Ionicons name="eye-outline" size={13} color="#4B5563" style={{ marginRight: 3 }} />
              <Text style={styles.compactActionBtnText}>View</Text>
            </TouchableOpacity>

            {isDraft && (
              <>
                <TouchableOpacity
                  style={styles.compactActionBtn}
                  onPress={() => handleEditDraft(item)}
                  activeOpacity={0.7}
                >
                  <Ionicons name="pencil" size={13} color="#8C331A" style={{ marginRight: 3 }} />
                  <Text style={[styles.compactActionBtnText, { color: '#8C331A' }]}>Edit</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.compactActionBtn, styles.compactActionBtnDanger]}
                  onPress={() => handleCancelDraft(item)}
                  activeOpacity={0.7}
                >
                  <Ionicons name="close" size={13} color="#DC2626" style={{ marginRight: 2 }} />
                  <Text style={[styles.compactActionBtnText, { color: '#DC2626' }]}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.compactGenerateBtn, isFinalizing && { opacity: 0.6 }]}
                  onPress={() => handleFinalizeDraft(item)}
                  disabled={isFinalizing}
                  activeOpacity={0.8}
                >
                  {isFinalizing ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <>
                      <Ionicons name="checkmark-done" size={12} color="#FFFFFF" style={{ marginRight: 3 }} />
                      <Text style={styles.compactGenerateBtnText}>Finalize</Text>
                    </>
                  )}
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Header title="Orders Hub" showBack={false} />

      {/* Sticky Top Header Section (Segmented Toggle, Search Input Bar & Filter Row) */}
      <View style={styles.stickyHeaderSection}>
        {/* 4-Section Premium Segmented Control */}
        <View style={styles.segmentedContainer}>
          <TouchableOpacity
            style={[styles.segmentBtn, sectionMode === 'today' && styles.segmentBtnActive]}
            onPress={() => setSectionMode('today')}
            activeOpacity={0.8}
          >
            <Ionicons
              name="today-outline"
              size={14}
              color={sectionMode === 'today' ? '#FFFFFF' : '#8E8278'}
              style={{ marginRight: 4 }}
            />
            <Text style={[styles.segmentBtnText, sectionMode === 'today' && styles.segmentBtnTextActive]}>
              Today
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.segmentBtn, sectionMode === 'recurring' && styles.segmentBtnActive]}
            onPress={() => setSectionMode('recurring')}
            activeOpacity={0.8}
          >
            <Ionicons
              name="repeat-outline"
              size={14}
              color={sectionMode === 'recurring' ? '#FFFFFF' : '#8E8278'}
              style={{ marginRight: 4 }}
            />
            <Text style={[styles.segmentBtnText, sectionMode === 'recurring' && styles.segmentBtnTextActive]}>
              Recurring
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.segmentBtn, sectionMode === 'history' && styles.segmentBtnActive]}
            onPress={() => setSectionMode('history')}
            activeOpacity={0.8}
          >
            <Ionicons
              name="time-outline"
              size={14}
              color={sectionMode === 'history' ? '#FFFFFF' : '#8E8278'}
              style={{ marginRight: 4 }}
            />
            <Text style={[styles.segmentBtnText, sectionMode === 'history' && styles.segmentBtnTextActive]}>
              History
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.segmentBtn, sectionMode === 'drafts' && styles.segmentBtnActive]}
            onPress={() => setSectionMode('drafts')}
            activeOpacity={0.8}
          >
            <Ionicons
              name="receipt-outline"
              size={14}
              color={sectionMode === 'drafts' ? '#FFFFFF' : '#8E8278'}
              style={{ marginRight: 4 }}
            />
            <Text style={[styles.segmentBtnText, sectionMode === 'drafts' && styles.segmentBtnTextActive]}>
              Draft Bills
            </Text>
          </TouchableOpacity>
        </View>

        {/* Search Input Bar */}
        <View style={styles.searchBar}>
          <Ionicons name="search-outline" size={18} color="#8E8278" style={{ marginRight: 8 }} />
          <TextInput
            style={styles.searchInput}
            placeholder={
              sectionMode === 'today'
                ? "Search today's orders by ID, customer, driver..."
                : sectionMode === 'recurring'
                  ? 'Search recurring templates by customer or address...'
                  : sectionMode === 'history'
                    ? 'Search historical orders by ID, client, driver...'
                    : 'Search drafts by number, customer, partner...'
            }
            placeholderTextColor="#8E8278"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery ? (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={18} color="#8E8278" />
            </TouchableOpacity>
          ) : null}
        </View>

        {/* Filters according to sectionMode */}
        {sectionMode === 'today' && (
          <View style={styles.tabContainer}>
            <FlatList
              horizontal
              showsHorizontalScrollIndicator={false}
              data={todayFilterTabs}
              keyExtractor={t => t.key}
              renderItem={({ item: tab }) => {
                const isActive = todayFilter === tab.key;
                return (
                  <TouchableOpacity
                    style={[styles.tabChip, isActive && styles.tabChipActive]}
                    onPress={() => setTodayFilter(tab.key)}
                  >
                    <Text style={[styles.tabText, isActive && styles.tabTextActive]}>
                      {tab.label}
                    </Text>
                  </TouchableOpacity>
                );
              }}
            />
          </View>
        )}

        {sectionMode === 'history' && (
          <>
            <View style={styles.tabContainer}>
              <FlatList
                horizontal
                showsHorizontalScrollIndicator={false}
                data={historyStatusTabs}
                keyExtractor={t => t.key}
                renderItem={({ item: tab }) => {
                  const isActive = historyStatusFilter === tab.key;
                  return (
                    <TouchableOpacity
                      style={[styles.tabChip, isActive && styles.tabChipActive]}
                      onPress={() => setHistoryStatusFilter(tab.key)}
                    >
                      <Text style={[styles.tabText, isActive && styles.tabTextActive]}>
                        {tab.label}
                      </Text>
                    </TouchableOpacity>
                  );
                }}
              />
            </View>

            {/* Partner & Customer Filter Pickers (Compact Row) */}
            <View style={styles.historyFiltersRow}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16 }}>
                {deliveryPartners.map(part => {
                  const isSelected = historyPartnerFilter === part.id;
                  return (
                    <TouchableOpacity
                      key={part.id}
                      style={[styles.filterPill, isSelected && styles.filterPillSelected]}
                      onPress={() => setHistoryPartnerFilter(isSelected ? null : part.id)}
                    >
                      <Ionicons
                        name="bicycle"
                        size={12}
                        color={isSelected ? '#FFFFFF' : '#8E8278'}
                        style={{ marginRight: 4 }}
                      />
                      <Text style={[styles.filterPillText, isSelected && styles.filterPillTextSelected]}>
                        {part.name}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>
          </>
        )}

        {sectionMode === 'drafts' && (
          <View style={styles.tabContainer}>
            <FlatList
              horizontal
              showsHorizontalScrollIndicator={false}
              data={draftStatusTabs}
              keyExtractor={t => t.key}
              renderItem={({ item: tab }) => {
                const isActive = draftStatusFilter === tab.key;
                return (
                  <TouchableOpacity
                    style={[styles.tabChip, isActive && styles.tabChipActive]}
                    onPress={() => setDraftStatusFilter(tab.key)}
                  >
                    <Text style={[styles.tabText, isActive && styles.tabTextActive]}>
                      {tab.label}
                    </Text>
                  </TouchableOpacity>
                );
              }}
            />
          </View>
        )}
      </View>

      {/* SECTION 1: TODAY'S ORDERS */}
      {sectionMode === 'today' && (
        <>
          {loading ? (
            <View style={styles.centerBox}>
              <ActivityIndicator size="large" color="#8C331A" />
            </View>
          ) : filteredTodayOrders.length === 0 ? (
            <EmptyState
              title="No Orders for Today"
              subtitle={
                searchQuery
                  ? "No today's orders match your search."
                  : "No orders found for today in this filter. Tap + below to create a new order."
              }
            />
          ) : (
            <FlatList
              data={filteredTodayOrders}
              keyExtractor={item => String(item.id)}
              renderItem={renderOrderCard}
              contentContainerStyle={styles.listContent}
              refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#8C331A']} />
              }
            />
          )}
        </>
      )}

      {/* SECTION 2: RECURRING ORDERS */}
      {sectionMode === 'recurring' && (
        <>
          {loadingRecurring ? (
            <View style={styles.centerBox}>
              <ActivityIndicator size="large" color="#8C331A" />
            </View>
          ) : filteredRecurringOrders.length === 0 ? (
            <EmptyState
              title="No Recurring Orders"
              subtitle={
                searchQuery
                  ? 'No recurring templates match your search.'
                  : 'Create recurring order templates to automate daily chai & snack supply.'
              }
            />
          ) : (
            <FlatList
              data={filteredRecurringOrders}
              keyExtractor={item => String(item.id)}
              renderItem={renderRecurringItem}
              contentContainerStyle={styles.listContent}
              refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#8C331A']} />
              }
            />
          )}
        </>
      )}

      {/* SECTION 3: ORDER HISTORY */}
      {sectionMode === 'history' && (
        <>
          {loading ? (
            <View style={styles.centerBox}>
              <ActivityIndicator size="large" color="#8C331A" />
            </View>
          ) : filteredHistoryOrders.length === 0 ? (
            <EmptyState
              title="No Historical Orders"
              subtitle={searchQuery ? 'No orders match your filter criteria.' : 'Completed and prior orders will appear here.'}
            />
          ) : (
            <FlatList
              data={paginatedHistoryOrders}
              keyExtractor={item => String(item.id)}
              renderItem={renderOrderCard}
              contentContainerStyle={styles.listContent}
              refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#8C331A']} />
              }
              ListFooterComponent={
                filteredHistoryOrders.length > 0 ? (
                  <View style={styles.historyPaginationWrapper}>
                    <ReportsPagination
                      currentPage={historyPage}
                      totalRecords={filteredHistoryOrders.length}
                      pageSize={historyPageSize}
                      onPageChange={setHistoryPage}
                      onPageSizeChange={setHistoryPageSize}
                    />
                  </View>
                ) : null
              }
            />
          )}
        </>
      )}

      {/* SECTION 4: DRAFT BILLS */}
      {sectionMode === 'drafts' && (
        <>
          {loadingDrafts ? (
            <View style={styles.centerBox}>
              <ActivityIndicator size="large" color="#8C331A" />
            </View>
          ) : filteredDrafts.length === 0 ? (
            <EmptyState
              title="No Draft Bills"
              subtitle={
                searchQuery
                  ? 'No drafts match your search or filter.'
                  : draftStatusFilter === 'draft'
                    ? 'No active draft bills found. Tap + below to create a quick bill or order bill.'
                    : 'No draft bills in this status.'
              }
            />
          ) : (
            <FlatList
              data={filteredDrafts}
              keyExtractor={item => String(item.id)}
              renderItem={renderDraftCard}
              contentContainerStyle={styles.listContent}
              refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#8C331A']} />
              }
            />
          )}
        </>
      )}

      {/* Floating Action Button */}
      <FloatingButton onPress={handleOpenCreateFlow} />

      {/* Draft Details Modal */}
      <Modal visible={draftModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalTitle}>{selectedDraft?.draft_number}</Text>
                <Text style={styles.modalSubtitle}>
                  {selectedDraft?.customer_name || 'Walk-in Customer'} • {selectedDraft?.billing_source === 'quick_billing' ? 'Quick Bill' : 'Order Bill'}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setDraftModalVisible(false)}>
                <Ionicons name="close" size={24} color="#2A2421" />
              </TouchableOpacity>
            </View>

            {selectedDraft && (
              <ScrollView style={{ maxHeight: 420 }} showsVerticalScrollIndicator={false}>
                {/* Status and Partner Info */}
                <View style={styles.draftDetailInfoBox}>
                  <View style={styles.draftDetailRow}>
                    <Text style={styles.draftDetailLabel}>Status</Text>
                    <Text
                      style={[
                        styles.draftDetailValue,
                        {
                          fontWeight: '800',
                          color:
                            selectedDraft.status === 'finalized'
                              ? '#059669'
                              : selectedDraft.status === 'cancelled'
                                ? '#DC2626'
                                : '#D97706',
                        },
                      ]}
                    >
                      {selectedDraft.status.toUpperCase()}
                    </Text>
                  </View>

                  <View style={styles.draftDetailRow}>
                    <Text style={styles.draftDetailLabel}>Created</Text>
                    <Text style={styles.draftDetailValue}>
                      {new Date(selectedDraft.created_at).toLocaleString()}
                    </Text>
                  </View>

                  {selectedDraft.delivery_partner_name ? (
                    <View style={styles.draftDetailRow}>
                      <Text style={styles.draftDetailLabel}>Delivery Partner</Text>
                      <Text style={styles.draftDetailValue}>{selectedDraft.delivery_partner_name}</Text>
                    </View>
                  ) : null}

                  {selectedDraft.due_date ? (
                    <View style={styles.draftDetailRow}>
                      <Text style={styles.draftDetailLabel}>Payment Due Date</Text>
                      <Text style={styles.draftDetailValue}>{selectedDraft.due_date}</Text>
                    </View>
                  ) : null}

                  {selectedDraft.notes ? (
                    <View style={styles.draftDetailRow}>
                      <Text style={styles.draftDetailLabel}>Notes</Text>
                      <Text style={[styles.draftDetailValue, { flex: 1, textAlign: 'right' }]}>
                        {selectedDraft.notes}
                      </Text>
                    </View>
                  ) : null}
                </View>

                {/* Attached Line Items */}
                <Text style={styles.draftSectionTitle}>Items ({selectedDraft.items?.length || 0})</Text>
                {(selectedDraft.items || []).map((it, idx) => (
                  <View key={it.id || idx} style={styles.previewItemRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.previewItemName}>{it.product_name || `Product #${it.product}`}</Text>
                      <Text style={styles.previewItemQty}>Qty: {it.quantity} units</Text>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={styles.previewItemPrice}>₹{it.total_price}</Text>
                      <Text style={styles.previewItemRate}>@ ₹{it.unit_price}/ea</Text>
                    </View>
                  </View>
                ))}

                {/* Financial Summary */}
                <View style={styles.financialSummaryBox}>
                  <View style={styles.sumRow}>
                    <Text style={styles.sumLabel}>Subtotal</Text>
                    <Text style={styles.sumValue}>₹{selectedDraft.subtotal}</Text>
                  </View>
                  {parseFloat(selectedDraft.discount_amount || '0') > 0 && (
                    <View style={styles.sumRow}>
                      <Text style={[styles.sumLabel, { color: '#059669' }]}>Discount</Text>
                      <Text style={[styles.sumValue, { color: '#059669' }]}>- ₹{selectedDraft.discount_amount}</Text>
                    </View>
                  )}
                  <View style={[styles.sumRow, { borderTopWidth: 1, borderTopColor: '#EFEAE4', paddingTop: 6, marginTop: 4 }]}>
                    <Text style={styles.grandLabel}>Grand Total</Text>
                    <Text style={styles.grandValue}>₹{selectedDraft.grand_total}</Text>
                  </View>
                </View>

                {/* Action Buttons if Active Draft */}
                {selectedDraft.status === 'draft' && (
                  <View style={styles.draftModalActionsRow}>
                    <TouchableOpacity
                      style={[styles.draftModalBtn, styles.draftModalBtnSecondary]}
                      onPress={() => {
                        setDraftModalVisible(false);
                        handleEditDraft(selectedDraft);
                      }}
                    >
                      <Ionicons name="pencil" size={15} color="#8C331A" style={{ marginRight: 4 }} />
                      <Text style={styles.draftModalBtnSecondaryText}>Edit</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.draftModalBtn, styles.draftModalBtnDanger]}
                      onPress={() => handleCancelDraft(selectedDraft)}
                    >
                      <Ionicons name="close-circle-outline" size={15} color="#DC2626" style={{ marginRight: 4 }} />
                      <Text style={styles.draftModalBtnDangerText}>Cancel Draft</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.draftModalBtn, styles.draftModalBtnPrimary]}
                      onPress={() => handleFinalizeDraft(selectedDraft)}
                    >
                      <Ionicons name="checkmark-done" size={15} color="#FFFFFF" style={{ marginRight: 4 }} />
                      <Text style={styles.draftModalBtnPrimaryText}>Finalize</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {/* Manual Invoice Review Modal */}
      <Modal visible={previewModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Manual Invoice Review</Text>
                <Text style={styles.modalSubtitle}>
                  Order #{selectedOrder?.id} • {selectedOrder?.company_name || selectedOrder?.customer_name}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setPreviewModalVisible(false)}>
                <Ionicons name="close" size={24} color="#2A2421" />
              </TouchableOpacity>
            </View>

            {previewLoading ? (
              <View style={[styles.centerBox, { height: 200 }]}>
                <ActivityIndicator size="large" color="#8C331A" />
                <Text style={{ marginTop: 10, color: '#8E8278' }}>Resolving pricing & delivery actuals...</Text>
              </View>
            ) : invoicePreview ? (
              <View style={styles.previewContent}>
                <View style={styles.auditNotice}>
                  <Ionicons name="shield-checkmark" size={16} color="#059669" style={{ marginRight: 6 }} />
                  <Text style={styles.auditNoticeText}>Backend resolved rates and delivery discrepancies applied.</Text>
                </View>

                <FlatList
                  data={invoicePreview.items}
                  keyExtractor={it => String(it.product_id)}
                  style={{ maxHeight: 220, marginVertical: 10 }}
                  renderItem={({ item: it }) => (
                    <View style={styles.previewItemRow}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.previewItemName}>{it.product_name}</Text>
                        <Text style={styles.previewItemQty}>
                          Ordered: {it.ordered_quantity} • Delivered: {it.delivered_quantity}
                        </Text>
                        {it.has_discrepancy && (
                          <Text style={styles.discrepancyAlert}>
                            ⚠️ Discrepancy: Invoicing confirmed actuals ({it.recommended_quantity} units)
                          </Text>
                        )}
                      </View>
                      <View style={{ alignItems: 'flex-end' }}>
                        <Text style={styles.previewItemPrice}>₹{it.line_total}</Text>
                        <Text style={styles.previewItemRate}>@ ₹{it.effective_rate}/ea</Text>
                      </View>
                    </View>
                  )}
                />

                <View style={styles.financialSummaryBox}>
                  <View style={styles.sumRow}>
                    <Text style={styles.sumLabel}>Subtotal</Text>
                    <Text style={styles.sumValue}>₹{invoicePreview.subtotal}</Text>
                  </View>
                  {parseFloat(invoicePreview.discount_total) > 0 && (
                    <View style={styles.sumRow}>
                      <Text style={[styles.sumLabel, { color: '#059669' }]}>Approved Discount</Text>
                      <Text style={[styles.sumValue, { color: '#059669' }]}>- ₹{invoicePreview.discount_total}</Text>
                    </View>
                  )}
                  <View style={[styles.sumRow, { borderTopWidth: 1, borderTopColor: '#EFEAE4', paddingTop: 6, marginTop: 4 }]}>
                    <Text style={styles.grandLabel}>Final Invoiced Total</Text>
                    <Text style={styles.grandValue}>₹{invoicePreview.grand_total}</Text>
                  </View>
                </View>

                <TouchableOpacity
                  style={styles.confirmGenerateBtn}
                  onPress={handleConfirmGenerateInvoice}
                  disabled={generating}
                >
                  {generating ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <>
                      <Ionicons name="checkmark-circle" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
                      <Text style={styles.confirmGenerateBtnText}>Confirm & Issue Official Invoice</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            ) : null}
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAF8F5',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 42,
    borderWidth: 1,
    borderColor: '#EFEAE4',
  },
  searchInput: {
    flex: 1,
    fontSize: 12,
    color: '#2A2421',
  },
  tabContainer: {
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  tabChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    marginRight: 6,
    borderWidth: 1,
    borderColor: '#EFEAE4',
  },
  tabChipActive: {
    backgroundColor: '#8C331A',
    borderColor: '#8C331A',
  },
  tabText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#8E8278',
  },
  tabTextActive: {
    color: '#FFFFFF',
  },
  historyFiltersRow: {
    marginBottom: 8,
  },
  filterPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FAF8F5',
    borderWidth: 1,
    borderColor: '#EFEAE4',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 16,
    marginRight: 6,
  },
  filterPillSelected: {
    backgroundColor: '#8C331A',
    borderColor: '#8C331A',
  },
  filterPillText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#6B5E55',
  },
  filterPillTextSelected: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  centerBox: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 80,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingVertical: 11,
    paddingHorizontal: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#EFEAE4',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  orderIdText: {
    fontSize: 11,
    color: '#8E8278',
    fontWeight: '700',
  },
  clientName: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#2A2421',
    marginTop: 1,
  },
  orderDateText: {
    fontSize: 10,
    color: '#A0958D',
    marginTop: 1,
  },
  statusPill: {
    paddingHorizontal: 7,
    paddingVertical: 2.5,
    borderRadius: 6,
  },
  statusPillText: {
    fontSize: 9,
    fontWeight: '800',
  },
  cardBody: {
    marginVertical: 6,
  },
  addressText: {
    fontSize: 11,
    color: '#8E8278',
    marginBottom: 3,
  },
  itemsSummary: {
    fontSize: 11.5,
    color: '#4B3F38',
    fontWeight: '600',
  },
  driverTagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 3,
  },
  driverTagText: {
    fontSize: 11,
    color: '#2A2421',
    fontWeight: '600',
    marginLeft: 4,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: '#FAF8F5',
  },
  cardFooterActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  amountLabel: {
    fontSize: 9,
    color: '#8E8278',
    textTransform: 'uppercase',
  },
  amountValue: {
    fontSize: 14.5,
    fontWeight: '800',
    color: '#2A2421',
    marginTop: 1,
  },
  invoicedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 7,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  invoicedBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#059669',
    marginLeft: 3,
  },
  generateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#8C331A',
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 7,
  },
  generateBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  viewDetailsBtn: {
    backgroundColor: '#FAF8F5',
    borderWidth: 1,
    borderColor: '#EFEAE4',
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 7,
  },
  viewDetailsBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#8C331A',
  },
  historyPaginationWrapper: {
    paddingVertical: 10,
    paddingBottom: 20,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 16,
    paddingHorizontal: 20,
    maxHeight: '88%',
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 16,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F2EFEB',
    marginBottom: 10,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#2A2421',
    letterSpacing: -0.3,
  },
  modalSubtitle: {
    fontSize: 11,
    color: '#8E8278',
    marginTop: 2,
  },
  confirmGenerateBtn: {
    flexDirection: 'row',
    backgroundColor: '#8C331A',
    borderRadius: 12,
    height: 46,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 4,
    marginBottom: 14,
  },
  confirmGenerateBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
  previewContent: {
    marginTop: 4,
  },
  auditNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    padding: 10,
    borderRadius: 8,
    marginBottom: 8,
  },
  auditNoticeText: {
    fontSize: 11,
    color: '#065F46',
    fontWeight: '600',
    flex: 1,
  },
  previewItemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#FAF8F5',
  },
  previewItemName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#2A2421',
  },
  previewItemQty: {
    fontSize: 11,
    color: '#8E8278',
    marginTop: 2,
  },
  discrepancyAlert: {
    fontSize: 11,
    color: '#DC2626',
    fontWeight: '600',
    marginTop: 2,
  },
  previewItemPrice: {
    fontSize: 14,
    fontWeight: '800',
    color: '#2A2421',
  },
  previewItemRate: {
    fontSize: 10,
    color: '#8E8278',
  },
  financialSummaryBox: {
    backgroundColor: '#FAF8F5',
    borderRadius: 12,
    padding: 12,
    marginVertical: 12,
  },
  sumRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  sumLabel: {
    fontSize: 12,
    color: '#8E8278',
  },
  sumValue: {
    fontSize: 13,
    fontWeight: '700',
    color: '#2A2421',
  },
  grandLabel: {
    fontSize: 13,
    fontWeight: '800',
    color: '#2A2421',
  },
  grandValue: {
    fontSize: 16,
    fontWeight: '800',
    color: '#8C331A',
  },
  /* 3-Section Segmented Toggle Styles */
  segmentedContainer: {
    flexDirection: 'row',
    backgroundColor: '#EDE8E3',
    borderRadius: 12,
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 4,
    padding: 3,
  },
  segmentBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 7,
    borderRadius: 9,
  },
  segmentBtnActive: {
    backgroundColor: '#8C331A',
    shadowColor: '#8C331A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 2,
  },
  segmentBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#6B5E55',
  },
  segmentBtnTextActive: {
    color: '#FFFFFF',
  },
  /* Recurring Card Custom Styles */
  cardPaused: {
    opacity: 0.78,
    backgroundColor: '#FAFAF9',
  },
  pausedBadge: {
    backgroundColor: '#F3EFEA',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: 8,
    borderWidth: 1,
    borderColor: '#E2DBD3',
  },
  pausedBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#8E8278',
    letterSpacing: 0.4,
  },
  freqTagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 3,
  },
  freqTagText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#8C331A',
  },
  editTemplateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FAF8F5',
    borderWidth: 1,
    borderColor: '#EFEAE4',
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 8,
  },
  editTemplateBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#8C331A',
    marginLeft: 3,
  },
  partnerText: {
    fontSize: 12,
    color: '#2A2421',
    fontWeight: '600',
    marginBottom: 6,
  },
  recurringItemsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 4,
  },
  recurringItemChip: {
    backgroundColor: '#FAF8F5',
    borderWidth: 1,
    borderColor: '#EFEAE4',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  recurringItemChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#2A2421',
  },
  todayStatusBar: {
    backgroundColor: '#FAF8F5',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginVertical: 8,
    borderWidth: 1,
    borderColor: '#F0ECE6',
  },
  generatedStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  generatedStatusText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#059669',
    marginLeft: 5,
  },
  skippedStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  skippedStatusText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#D97706',
    marginLeft: 5,
  },
  scheduledStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  scheduledStatusText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#8C331A',
    marginLeft: 5,
  },
  offScheduleStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  offScheduleStatusText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#8E8278',
    marginLeft: 5,
  },
  recurringCardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 8,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#FAF8F5',
  },
  recActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FAF8F5',
    borderWidth: 1,
    borderColor: '#EFEAE4',
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 8,
  },
  recActionBtnActive: {
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0',
  },
  recActionBtnWarning: {
    backgroundColor: '#FEF3C7',
    borderColor: '#FDE68A',
  },
  recActionBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#6B5E55',
  },
  generateTodayBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#8C331A',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
  },
  generateTodayBtnDisabled: {
    backgroundColor: '#D1C7BD',
  },
  generateTodayBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  orderAlreadyGeneratedBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  orderAlreadyGeneratedText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#059669',
  },
  // Compact Recurring Orders Styles
  compactRecCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#EFEAE4',
    padding: 12,
    marginBottom: 10,
    shadowColor: '#2A2421',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  compactRecTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  compactRecCustName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#2A2421',
    maxWidth: '75%',
  },
  compactStatusPill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    marginLeft: 6,
  },
  compactStatusActive: {
    backgroundColor: '#ECFDF5',
  },
  compactStatusPaused: {
    backgroundColor: '#F3F4F6',
  },
  compactStatusText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  compactStatusTextActive: {
    color: '#059669',
  },
  compactStatusTextPaused: {
    color: '#6B7280',
  },
  compactSubInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  compactFreqText: {
    fontSize: 12,
    color: '#8C331A',
    fontWeight: '600',
  },
  compactDotDivider: {
    fontSize: 12,
    color: '#9CA3AF',
    marginHorizontal: 5,
  },
  compactPartnerText: {
    fontSize: 12,
    color: '#4B5563',
    fontWeight: '500',
    flexShrink: 1,
  },
  compactEditBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FAF8F5',
    borderWidth: 1,
    borderColor: '#EFEAE4',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  compactEditBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#8C331A',
  },
  compactMetricsGrid: {
    flexDirection: 'row',
    backgroundColor: '#FAF8F5',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 6,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#F3EFEA',
  },
  compactMetricItem: {
    flex: 1,
    alignItems: 'center',
  },
  compactMetricLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#8E8278',
    marginBottom: 2,
    textTransform: 'uppercase',
  },
  compactMetricVal: {
    fontSize: 12,
    fontWeight: '700',
    color: '#2A2421',
  },
  compactRecFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#FAF8F5',
  },
  compactActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FAF8F5',
    borderWidth: 1,
    borderColor: '#EFEAE4',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  compactActionBtnActive: {
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0',
  },
  compactActionBtnWarning: {
    backgroundColor: '#FEF3C7',
    borderColor: '#FDE68A',
  },
  compactActionBtnText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#4B5563',
  },
  compactGeneratedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 6,
  },
  compactGeneratedText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#059669',
  },
  compactGenerateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#8C331A',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  compactGenerateBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  stickyHeaderSection: {
    backgroundColor: '#FAF8F5',
    zIndex: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#EDE8E3',
    paddingBottom: 8,
  },
  /* Draft Bills Custom Styles */
  draftTypeBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
    marginLeft: 6,
  },
  draftTypeBadgeText: {
    fontSize: 9,
    fontWeight: '700',
  },
  draftTypeQuick: {
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  draftTypeQuickText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#2563EB',
  },
  draftTypeOrder: {
    backgroundColor: '#F3E8FF',
    borderWidth: 1,
    borderColor: '#E9D5FF',
  },
  draftTypeOrderText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#7C3AED',
  },
  draftMetaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 4,
  },
  draftMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  draftMetaText: {
    fontSize: 11,
    color: '#6B5E55',
    fontWeight: '500',
  },
  draftNotesText: {
    fontSize: 11,
    color: '#8E8278',
    fontStyle: 'italic',
    marginTop: 2,
  },
  compactActionBtnDanger: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
  },
  draftDetailInfoBox: {
    backgroundColor: '#FAF8F5',
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
  },
  draftDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  draftDetailLabel: {
    fontSize: 12,
    color: '#8E8278',
    fontWeight: '600',
  },
  draftDetailValue: {
    fontSize: 12,
    color: '#2A2421',
    fontWeight: '600',
  },
  draftSectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#2A2421',
    marginBottom: 8,
    marginTop: 4,
  },
  draftModalActionsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 16,
    marginBottom: 8,
  },
  draftModalBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 8,
  },
  draftModalBtnSecondary: {
    backgroundColor: '#FAF8F5',
    borderWidth: 1,
    borderColor: '#EFEAE4',
  },
  draftModalBtnSecondaryText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#8C331A',
  },
  draftModalBtnDanger: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  draftModalBtnDangerText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#DC2626',
  },
  draftModalBtnPrimary: {
    backgroundColor: '#8C331A',
  },
  draftModalBtnPrimaryText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
