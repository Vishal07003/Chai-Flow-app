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
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { Header, EmptyState, FloatingButton } from '../../components/common';
import orderService, {
  BackendOrder,
  OrderInvoicePreview,
  BackendRecurringOrder,
  CreateRecurringOrderPayload,
} from '../../services/order.service';
import billingService, { BillingCustomer } from '../../services/billing.service';
import deliveryService, { DeliveryPartnerProfile } from '../../services/delivery.service';
import companyService, { Company } from '../../services/company.service';
import productService, { BackendProduct } from '../../services/product.service';
import { RecurringOrderModal, type RecurringOrderFormData } from '../../components/order';

const tabs = ['ALL', 'PENDING', 'ACCEPTED', 'OUT_FOR_DELIVERY', 'DELIVERED'];

export default function OrdersScreen({ navigation }: any) {
  const [orders, setOrders] = useState<BackendOrder[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeTab, setActiveTab] = useState<string>('ALL');

  // Top Section Mode: 'orders' or 'recurring'
  const [sectionMode, setSectionMode] = useState<'orders' | 'recurring'>('orders');

  // Recurring Orders State
  const [recurringOrders, setRecurringOrders] = useState<BackendRecurringOrder[]>([]);
  const [loadingRecurring, setLoadingRecurring] = useState<boolean>(false);
  const [recurringModalVisible, setRecurringModalVisible] = useState<boolean>(false);
  const [editingRecurring, setEditingRecurring] = useState<BackendRecurringOrder | null>(null);
  const [customers, setCustomers] = useState<BillingCustomer[]>([]);
  const [deliveryPartners, setDeliveryPartners] = useState<DeliveryPartnerProfile[]>([]);
  const [generatingRecurringId, setGeneratingRecurringId] = useState<number | null>(null);

  // Manual Invoice Preview & Generation State
  const [selectedOrder, setSelectedOrder] = useState<BackendOrder | null>(null);
  const [previewLoading, setPreviewLoading] = useState<boolean>(false);
  const [invoicePreview, setInvoicePreview] = useState<OrderInvoicePreview | null>(null);
  const [previewModalVisible, setPreviewModalVisible] = useState<boolean>(false);
  const [generating, setGenerating] = useState<boolean>(false);

  // New Commercial Order Creation State
  const [createModalVisible, setCreateModalVisible] = useState<boolean>(false);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState<number | null>(null);
  const [products, setProducts] = useState<BackendProduct[]>([]);
  const [deliveryAddress, setDeliveryAddress] = useState<string>('');
  const [orderNotes, setOrderNotes] = useState<string>('');
  const [selectedItems, setSelectedItems] = useState<{ [productId: number]: number }>({});
  const [creatingOrder, setCreatingOrder] = useState<boolean>(false);

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

  const loadCreationData = useCallback(async () => {
    try {
      const [compList, custList, partnerList, prodList] = await Promise.all([
        companyService.getCompanies(),
        billingService.getCustomers(),
        deliveryService.getDeliveryPartners(),
        productService.getProductsList(),
      ]);
      setCompanies(compList || []);
      setCustomers(custList || []);
      setDeliveryPartners(partnerList || []);

      // Map to backend products format
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
      if (compList && compList.length > 0) {
        setSelectedCompanyId(compList[0].id);
        setDeliveryAddress(compList[0].billing_address || '');
      }
    } catch (err) {
      console.log('Error loading data for order creation:', err);
    }
  }, []);

  useEffect(() => {
    fetchOrders();
    fetchRecurringOrders();
    loadCreationData();
  }, [fetchOrders, fetchRecurringOrders, loadCreationData]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchOrders();
    fetchRecurringOrders();
  }, [fetchOrders, fetchRecurringOrders]);

  const filteredOrders = useMemo(() => {
    return orders.filter(o => {
      const matchesTab =
        activeTab === 'ALL' || o.status.toUpperCase() === activeTab;
      const q = searchQuery.toLowerCase().trim();
      const matchesQuery =
        !q ||
        o.customer_name?.toLowerCase().includes(q) ||
        o.company_name?.toLowerCase().includes(q) ||
        String(o.id).includes(q) ||
        o.delivery_address?.toLowerCase().includes(q);

      return matchesTab && matchesQuery;
    });
  }, [orders, activeTab, searchQuery]);

  // Open Invoice Preview Modal (Owner review before generating official invoice)
  const handleOpenInvoicePreview = async (order: BackendOrder) => {
    try {
      setSelectedOrder(order);
      setPreviewLoading(true);
      setPreviewModalVisible(true);
      const preview = await orderService.getInvoicePreview(order.id);
      setInvoicePreview(preview);
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to load invoice preview.');
      setPreviewModalVisible(false);
    } finally {
      setPreviewLoading(false);
    }
  };

  // Confirm manual invoice generation
  const handleConfirmGenerateInvoice = async () => {
    if (!selectedOrder) return;

    try {
      setGenerating(true);
      const result = await orderService.generateManualInvoice(selectedOrder.id);
      setPreviewModalVisible(false);
      fetchOrders();
      Alert.alert(
        'Invoice Created',
        `Official Invoice #${result.invoice_number || 'Generated'} has been issued and debited to company ledger.`,
      );
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to generate invoice.');
    } finally {
      setGenerating(false);
    }
  };

  // Open Order Creation Modal
  const handleOpenCreateModal = () => {
    loadCreationData();
    setSelectedItems({});
    setOrderNotes('');
    setCreateModalVisible(true);
  };

  const handleItemQtyChange = (productId: number, delta: number) => {
    setSelectedItems(prev => {
      const current = prev[productId] || 0;
      const next = Math.max(0, current + delta);
      if (next === 0) {
        const copy = { ...prev };
        delete copy[productId];
        return copy;
      }
      return { ...prev, [productId]: next };
    });
  };

  const handleSelectCompany = (comp: Company) => {
    setSelectedCompanyId(comp.id);
    setDeliveryAddress(comp.billing_address || '');
  };

  const selectedItemCount = useMemo(() => {
    return Object.values(selectedItems).reduce((sum, q) => sum + q, 0);
  }, [selectedItems]);

  const estimatedOrderTotal = useMemo(() => {
    return Object.entries(selectedItems).reduce((sum, [pid, qty]) => {
      const prod = products.find(p => p.id === Number(pid));
      const rate = prod ? parseFloat(prod.price) || 0 : 0;
      return sum + rate * qty;
    }, 0);
  }, [selectedItems, products]);

  const handleSubmitNewOrder = async () => {
    const itemsPayload = Object.entries(selectedItems).map(([pid, qty]) => ({
      product_id: Number(pid),
      quantity: qty,
    }));

    if (itemsPayload.length === 0) {
      Alert.alert('Empty Order', 'Please select at least one product quantity.');
      return;
    }

    try {
      setCreatingOrder(true);
      await orderService.createOrder({
        company_id: selectedCompanyId,
        delivery_address: deliveryAddress.trim() || 'Direct Company Delivery',
        notes: orderNotes.trim(),
        items: itemsPayload,
      });

      setCreateModalVisible(false);
      fetchOrders();
      Alert.alert('Success', 'Commercial order created successfully. Applicable volume pricing resolved on backend.');
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to submit order.');
    } finally {
      setCreatingOrder(false);
    }
  };

  /* Recurring Orders Handlers */
  const handleOpenNewRecurring = () => {
    setEditingRecurring(null);
    setRecurringModalVisible(true);
  };

  const handleOpenEditRecurring = (template: BackendRecurringOrder) => {
    setEditingRecurring(template);
    setRecurringModalVisible(true);
  };

  const handleSaveRecurringSubmit = async (formData: RecurringOrderFormData) => {
    if (editingRecurring) {
      // Future orders only - backend updates template items & partner
      await orderService.updateRecurringOrder(editingRecurring.id, formData);
      Alert.alert('Updated', 'Recurring order template updated. Future orders will follow this configuration.');
    } else {
      await orderService.createRecurringOrder(formData as CreateRecurringOrderPayload);
      Alert.alert('Created', 'Recurring order template created successfully.');
    }
    fetchRecurringOrders();
  };

  const handleTogglePause = async (template: BackendRecurringOrder) => {
    try {
      if (template.is_paused) {
        await orderService.resumeRecurringOrder(template.id);
        Alert.alert('Resumed', `Recurring order for ${template.customer_name} is active.`);
      } else {
        await orderService.pauseRecurringOrder(template.id);
        Alert.alert('Paused', `Recurring order for ${template.customer_name} is paused.`);
      }
      fetchRecurringOrders();
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to update schedule status.');
    }
  };

  const handleToggleSkipToday = async (template: BackendRecurringOrder) => {
    const todayStr = new Date().toISOString().split('T')[0];
    const isSkipped = (template.skipped_dates || []).includes(todayStr);

    try {
      if (isSkipped) {
        await orderService.unskipRecurringDate(template.id, todayStr);
        Alert.alert('Restored', `Schedule for today (${todayStr}) restored.`);
      } else {
        await orderService.skipRecurringDate(template.id, todayStr);
        Alert.alert('Skipped', `Order generation skipped for today (${todayStr}).`);
      }
      fetchRecurringOrders();
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to update skip status.');
    }
  };

  const handleGenerateTodayOrder = async (template: BackendRecurringOrder) => {
    try {
      setGeneratingRecurringId(template.id);
      const res = await orderService.generateOrderFromRecurring(template.id);
      fetchOrders();
      fetchRecurringOrders();
      if (res.already_generated) {
        Alert.alert('Already Generated', res.message);
      } else {
        Alert.alert('Order Created', res.message);
      }
    } catch (err: any) {
      Alert.alert('Generation Error', err?.message || err?.detail || 'Failed to generate order.');
    } finally {
      setGeneratingRecurringId(null);
    }
  };

  const filteredRecurringOrders = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return recurringOrders;
    return recurringOrders.filter(r =>
      r.customer_name?.toLowerCase().includes(q) ||
      r.delivery_address?.toLowerCase().includes(q) ||
      r.delivery_partner_name?.toLowerCase().includes(q) ||
      r.notes?.toLowerCase().includes(q)
    );
  }, [recurringOrders, searchQuery]);

  const renderRecurringItem = ({ item }: { item: BackendRecurringOrder }) => {
    const todayStr = new Date().toISOString().split('T')[0];
    const isSkippedToday = (item.skipped_dates || []).includes(todayStr);
    const isPaused = item.is_paused;
    const isGeneratedToday = !!item.today_order_generated;
    const isScheduledToday = item.is_scheduled_today;
    const isGenerating = generatingRecurringId === item.id;

    // Weekdays label
    const frequencyLabel = item.frequency === 'daily'
      ? 'Daily'
      : (item.weekdays && typeof item.weekdays === 'string' && item.weekdays.trim().length > 0)
        ? item.weekdays.split(',').map(d => d.trim().slice(0, 3).toUpperCase()).join(', ')
        : 'Specific Days';

    return (
      <View style={[styles.card, isPaused && styles.cardPaused]}>
        <View style={styles.cardHeader}>
          <View style={{ flex: 1, marginRight: 8 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text style={styles.clientName} numberOfLines={1}>
                {item.customer_name}
              </Text>
              {isPaused && (
                <View style={styles.pausedBadge}>
                  <Text style={styles.pausedBadgeText}>PAUSED</Text>
                </View>
              )}
            </View>
            <View style={styles.freqTagRow}>
              <Ionicons name="repeat" size={13} color="#8C331A" style={{ marginRight: 4 }} />
              <Text style={styles.freqTagText}>{frequencyLabel}</Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.editTemplateBtn}
            onPress={() => handleOpenEditRecurring(item)}
            activeOpacity={0.7}
          >
            <Ionicons name="pencil-outline" size={15} color="#8C331A" />
            <Text style={styles.editTemplateBtnText}>Edit</Text>
          </TouchableOpacity>
        </View>

        {/* Address and Assigned Delivery Partner */}
        <View style={styles.cardBody}>
          <Text style={styles.addressText} numberOfLines={1}>
            <Ionicons name="location-outline" size={13} color="#8E8278" />{' '}
            {item.delivery_address || 'Delivery Address Not Specified'}
          </Text>

          {item.delivery_partner_name ? (
            <Text style={styles.partnerText}>
              <Ionicons name="bicycle-outline" size={13} color="#2A2421" /> Driver: {item.delivery_partner_name}
            </Text>
          ) : (
            <Text style={[styles.partnerText, { color: '#A0958D', fontStyle: 'italic' }]}>
              <Ionicons name="bicycle-outline" size={13} color="#A0958D" /> No Delivery Partner Assigned
            </Text>
          )}

          {/* Items Summary */}
          <View style={styles.recurringItemsContainer}>
            {item.items && item.items.length > 0 ? (
              item.items.map((it, idx) => (
                <View key={it.id || idx} style={styles.recurringItemChip}>
                  <Text style={styles.recurringItemChipText}>
                    {it.quantity}x {it.product_name}
                  </Text>
                </View>
              ))
            ) : (
              <Text style={styles.itemsSummary}>No items specified</Text>
            )}
          </View>
        </View>

        {/* Schedule & Generation Status Bar */}
        <View style={styles.todayStatusBar}>
          {isGeneratedToday ? (
            <View style={styles.generatedStatusRow}>
              <Ionicons name="checkmark-circle" size={14} color="#059669" />
              <Text style={styles.generatedStatusText}>
                Today's Order Generated (#{item.today_order_id})
              </Text>
            </View>
          ) : isSkippedToday ? (
            <View style={styles.skippedStatusRow}>
              <Ionicons name="calendar-outline" size={14} color="#D97706" />
              <Text style={styles.skippedStatusText}>Skipped for Today</Text>
            </View>
          ) : isPaused ? (
            <View style={styles.skippedStatusRow}>
              <Ionicons name="pause-circle-outline" size={14} color="#8E8278" />
              <Text style={[styles.skippedStatusText, { color: '#8E8278' }]}>Template Paused</Text>
            </View>
          ) : isScheduledToday ? (
            <View style={styles.scheduledStatusRow}>
              <Ionicons name="time-outline" size={14} color="#8C331A" />
              <Text style={styles.scheduledStatusText}>Scheduled for Today</Text>
            </View>
          ) : (
            <View style={styles.offScheduleStatusRow}>
              <Ionicons name="ellipse-outline" size={12} color="#8E8278" />
              <Text style={styles.offScheduleStatusText}>Not scheduled today ({new Date().toLocaleDateString('en-US', { weekday: 'short' })})</Text>
            </View>
          )}
        </View>

        {/* Action Controls Footer */}
        <View style={styles.recurringCardFooter}>
          {/* Pause / Resume Button */}
          <TouchableOpacity
            style={[styles.recActionBtn, isPaused && styles.recActionBtnActive]}
            onPress={() => handleTogglePause(item)}
            activeOpacity={0.7}
          >
            <Ionicons
              name={isPaused ? 'play' : 'pause'}
              size={13}
              color={isPaused ? '#059669' : '#6B5E55'}
              style={{ marginRight: 4 }}
            />
            <Text style={[styles.recActionBtnText, isPaused && { color: '#059669' }]}>
              {isPaused ? 'Resume' : 'Pause'}
            </Text>
          </TouchableOpacity>

          {/* Skip / Unskip Today */}
          {!isPaused && (
            <TouchableOpacity
              style={[styles.recActionBtn, isSkippedToday && styles.recActionBtnWarning]}
              onPress={() => handleToggleSkipToday(item)}
              activeOpacity={0.7}
            >
              <Ionicons
                name={isSkippedToday ? 'arrow-undo-outline' : 'close-circle-outline'}
                size={13}
                color={isSkippedToday ? '#8C331A' : '#6B5E55'}
                style={{ marginRight: 4 }}
              />
              <Text style={[styles.recActionBtnText, isSkippedToday && { color: '#8C331A', fontWeight: '700' }]}>
                {isSkippedToday ? 'Unskip Today' : 'Skip Today'}
              </Text>
            </TouchableOpacity>
          )}

          {/* Generate Today's Order Button */}
          {isGeneratedToday ? (
            <View style={styles.orderAlreadyGeneratedBtn}>
              <Ionicons name="checkmark-done" size={14} color="#059669" style={{ marginRight: 4 }} />
              <Text style={styles.orderAlreadyGeneratedText}>Order Ready</Text>
            </View>
          ) : (
            <TouchableOpacity
              style={[
                styles.generateTodayBtn,
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
                  <Ionicons name="flash" size={13} color="#FFFFFF" style={{ marginRight: 4 }} />
                  <Text style={styles.generateTodayBtnText}>Generate Today</Text>
                </>
              )}
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  const renderOrderItem = ({ item }: { item: BackendOrder }) => {
    const totalNum = parseFloat(item.total_amount) || 0;
    const hasInvoice = item.has_invoice;

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View>
            <Text style={styles.orderIdText}>Order #{item.id}</Text>
            <Text style={styles.clientName}>
              {item.company_name || item.customer_name}
            </Text>
          </View>
          <View style={styles.statusPill}>
            <Text style={styles.statusPillText}>{item.status.toUpperCase()}</Text>
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
              : 'Supply Delivery'}
          </Text>
        </View>

        <View style={styles.cardFooter}>
          <View>
            <Text style={styles.amountLabel}>Total Billable</Text>
            <Text style={styles.amountValue}>₹{totalNum.toLocaleString()}</Text>
          </View>

          {hasInvoice ? (
            <View style={styles.invoicedBadge}>
              <Ionicons name="checkmark-done" size={14} color="#059669" />
              <Text style={styles.invoicedBadgeText}>
                {item.invoice_number || 'INVOICED'}
              </Text>
            </View>
          ) : (
            <TouchableOpacity
              style={styles.generateBtn}
              onPress={() => handleOpenInvoicePreview(item)}
            >
              <Ionicons name="receipt-outline" size={14} color="#FFFFFF" style={{ marginRight: 4 }} />
              <Text style={styles.generateBtnText}>Generate Invoice</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Header title="Orders & Recurring" showBack={false} />

      {/* Segmented Top Toggle: Regular Orders vs. Recurring Templates */}
      <View style={styles.segmentedContainer}>
        <TouchableOpacity
          style={[
            styles.segmentBtn,
            sectionMode === 'orders' && styles.segmentBtnActive,
          ]}
          onPress={() => setSectionMode('orders')}
          activeOpacity={0.8}
        >
          <Ionicons
            name="cart-outline"
            size={16}
            color={sectionMode === 'orders' ? '#FFFFFF' : '#8E8278'}
            style={{ marginRight: 6 }}
          />
          <Text
            style={[
              styles.segmentBtnText,
              sectionMode === 'orders' && styles.segmentBtnTextActive,
            ]}
          >
            Regular Orders
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.segmentBtn,
            sectionMode === 'recurring' && styles.segmentBtnActive,
          ]}
          onPress={() => setSectionMode('recurring')}
          activeOpacity={0.8}
        >
          <Ionicons
            name="repeat-outline"
            size={16}
            color={sectionMode === 'recurring' ? '#FFFFFF' : '#8E8278'}
            style={{ marginRight: 6 }}
          />
          <Text
            style={[
              styles.segmentBtnText,
              sectionMode === 'recurring' && styles.segmentBtnTextActive,
            ]}
          >
            Recurring Templates
          </Text>
        </TouchableOpacity>
      </View>

      {/* Search Input */}
      <View style={styles.searchBar}>
        <Ionicons name="search-outline" size={18} color="#8E8278" style={{ marginRight: 8 }} />
        <TextInput
          style={styles.searchInput}
          placeholder={
            sectionMode === 'orders'
              ? 'Search by order ID, company, customer or address...'
              : 'Search recurring template by customer or address...'
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

      {sectionMode === 'orders' ? (
        <>
          {/* Filter Tabs for Regular Orders */}
          <View style={styles.tabContainer}>
            <FlatList
              horizontal
              showsHorizontalScrollIndicator={false}
              data={tabs}
              keyExtractor={t => t}
              renderItem={({ item: tab }) => (
                <TouchableOpacity
                  style={[styles.tabChip, activeTab === tab && styles.tabChipActive]}
                  onPress={() => setActiveTab(tab)}
                >
                  <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
                    {tab.replace(/_/g, ' ')}
                  </Text>
                </TouchableOpacity>
              )}
            />
          </View>

          {/* Orders List */}
          {loading ? (
            <View style={styles.centerBox}>
              <ActivityIndicator size="large" color="#8C331A" />
            </View>
          ) : filteredOrders.length === 0 ? (
            <EmptyState
              title="No Orders Found"
              subtitle={searchQuery ? "No orders match your search." : "No orders in this category."}
            />
          ) : (
            <FlatList
              data={filteredOrders}
              keyExtractor={item => String(item.id)}
              renderItem={renderOrderItem}
              contentContainerStyle={styles.listContent}
              refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#8C331A']} />
              }
            />
          )}
        </>
      ) : (
        <>
          {/* Recurring Orders List */}
          {loadingRecurring ? (
            <View style={styles.centerBox}>
              <ActivityIndicator size="large" color="#8C331A" />
            </View>
          ) : filteredRecurringOrders.length === 0 ? (
            <EmptyState
              title="No Recurring Orders"
              subtitle={searchQuery ? "No recurring templates match your search." : "Create a recurring order template to save daily chai & snack setups."}
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

      {/* Floating Action Button */}
      <FloatingButton
        onPress={sectionMode === 'orders' ? handleOpenCreateModal : handleOpenNewRecurring}
      />

      {/* Commercial / Customer Order Creation Bottom Sheet */}
      <Modal visible={createModalVisible} transparent animationType="slide">
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.modalSheet}>
            {/* Header: Title and Simple Close Icon */}
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>New Customer Order</Text>
                <Text style={styles.modalSubtitle}>Select customer, destination and products</Text>
              </View>
              <TouchableOpacity
                style={styles.closeIconBtn}
                onPress={() => setCreateModalVisible(false)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="close" size={20} color="#6B5E55" />
              </TouchableOpacity>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={{ paddingBottom: 16 }}
            >
              {/* Customer Selector */}
              <Text style={styles.fieldSectionLabel}>SELECT CUSTOMER</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.customerScroll}
                contentContainerStyle={{ paddingVertical: 2 }}
              >
                {companies.map(c => {
                  const isSelected = selectedCompanyId === c.id;
                  return (
                    <TouchableOpacity
                      key={c.id}
                      style={[styles.compChip, isSelected && styles.compChipActive]}
                      onPress={() => handleSelectCompany(c)}
                      activeOpacity={0.7}
                    >
                      <Ionicons
                        name="business-outline"
                        size={13}
                        color={isSelected ? '#FFFFFF' : '#8C331A'}
                        style={{ marginRight: 6 }}
                      />
                      <Text style={[styles.compChipText, isSelected && styles.compChipTextActive]}>
                        {c.name}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              {/* Delivery Address & Notes Inputs */}
              <Text style={styles.fieldSectionLabel}>DELIVERY DETAILS</Text>
              <View style={styles.inputContainer}>
                <Ionicons name="location-outline" size={16} color="#8E8278" style={styles.inputIcon} />
                <TextInput
                  style={styles.modalInput}
                  placeholder="Delivery Address *"
                  placeholderTextColor="#A0958D"
                  value={deliveryAddress}
                  onChangeText={setDeliveryAddress}
                />
              </View>

              <View style={styles.inputContainer}>
                <Ionicons name="document-text-outline" size={16} color="#8E8278" style={styles.inputIcon} />
                <TextInput
                  style={styles.modalInput}
                  placeholder="Order instructions / notes (Optional)"
                  placeholderTextColor="#A0958D"
                  value={orderNotes}
                  onChangeText={setOrderNotes}
                />
              </View>

              {/* Product Selection with Clean Compact Row */}
              <View style={styles.productSectionHeader}>
                <Text style={styles.fieldSectionLabel}>SELECT PRODUCTS</Text>
                {selectedItemCount > 0 && (
                  <Text style={styles.selectedCountBadge}>
                    {selectedItemCount} {selectedItemCount === 1 ? 'item' : 'items'}
                  </Text>
                )}
              </View>

              <View style={styles.productsCard}>
                {products.map((p, idx) => {
                  const qty = selectedItems[p.id] || 0;
                  const isSelected = qty > 0;
                  const isLast = idx === products.length - 1;
                  return (
                    <View
                      key={p.id}
                      style={[
                        styles.prodRow,
                        isLast && { borderBottomWidth: 0 },
                        isSelected && styles.prodRowSelected,
                      ]}
                    >
                      <View style={{ flex: 1, marginRight: 12 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                          <Text style={styles.prodName}>{p.name}</Text>
                          <Text style={styles.prodIdTag}>#{p.id}</Text>
                        </View>
                        <Text style={styles.prodBaseRate}>
                          ₹{p.price} / unit
                        </Text>
                      </View>

                      {/* Minimal, compact quantity controls */}
                      <View style={styles.qtyControl}>
                        <TouchableOpacity
                          style={[styles.qtyBtn, qty === 0 && styles.qtyBtnDisabled]}
                          onPress={() => handleItemQtyChange(p.id, -1)}
                          disabled={qty === 0}
                          activeOpacity={0.6}
                        >
                          <Ionicons
                            name="remove"
                            size={14}
                            color={qty === 0 ? '#C4BCB5' : '#8C331A'}
                          />
                        </TouchableOpacity>

                        <Text style={[styles.qtyText, isSelected && styles.qtyTextActive]}>
                          {qty}
                        </Text>

                        <TouchableOpacity
                          style={styles.qtyBtn}
                          onPress={() => handleItemQtyChange(p.id, 1)}
                          activeOpacity={0.6}
                        >
                          <Ionicons name="add" size={14} color="#8C331A" />
                        </TouchableOpacity>
                      </View>
                    </View>
                  );
                })}
              </View>

              {/* Compact Order Summary Bar */}
              {selectedItemCount > 0 && (
                <View style={styles.orderSummaryBar}>
                  <View>
                    <Text style={styles.summaryCountText}>
                      {selectedItemCount} {selectedItemCount === 1 ? 'unit selected' : 'units selected'}
                    </Text>
                    <Text style={styles.summarySubtext}>Volume pricing applied at generation</Text>
                  </View>
                  <Text style={styles.summaryTotalText}>
                    ~₹{estimatedOrderTotal.toLocaleString()}
                  </Text>
                </View>
              )}

              {/* Confirm / Create Order Button */}
              <TouchableOpacity
                style={[
                  styles.confirmGenerateBtn,
                  selectedItemCount === 0 && styles.confirmGenerateBtnDisabled,
                ]}
                onPress={handleSubmitNewOrder}
                disabled={creatingOrder || selectedItemCount === 0}
                activeOpacity={0.8}
              >
                {creatingOrder ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <>
                    <Ionicons name="checkmark-circle" size={17} color="#FFFFFF" style={{ marginRight: 6 }} />
                    <Text style={styles.confirmGenerateBtnText}>Create Customer Order</Text>
                  </>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Manual Invoice Review Modal */}
      <Modal visible={previewModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Manual Invoice Review</Text>
                <Text style={styles.modalSubtitle}>Order #{selectedOrder?.id} • {selectedOrder?.company_name || selectedOrder?.customer_name}</Text>
              </View>
              <TouchableOpacity onPress={() => setPreviewModalVisible(false)}>
                <Ionicons name="close" size={24} color="#2A2421" />
              </TouchableOpacity>
            </View>

            {previewLoading ? (
              <View style={[styles.centerBox, { height: 200 }]}>
                <ActivityIndicator size="large" color="#8C331A" />
                <Text style={{ marginTop: 10, color: '#8E8278' }}>Resolving company pricing & delivery actuals...</Text>
              </View>
            ) : invoicePreview ? (
              <View style={styles.previewContent}>
                <View style={styles.auditNotice}>
                  <Ionicons name="shield-checkmark" size={16} color="#059669" style={{ marginRight: 6 }} />
                  <Text style={styles.auditNoticeText}>Backend resolved rates and delivery discrepancies applied.</Text>
                </View>

                {/* Items Discrepancy Breakdown */}
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

                {/* Financial Summary */}
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

                {/* Confirm Button */}
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
      {/* Recurring Order Creation & Editing Bottom Sheet Modal */}
      <RecurringOrderModal
        visible={recurringModalVisible}
        customers={customers}
        products={products}
        partners={deliveryPartners}
        existingTemplate={editingRecurring}
        onClose={() => setRecurringModalVisible(false)}
        onSubmit={handleSaveRecurringSubmit}
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
    marginVertical: 10,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44,
    borderWidth: 1,
    borderColor: '#EFEAE4',
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: '#2A2421',
  },
  tabContainer: {
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  tabChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    marginRight: 8,
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
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#EFEAE4',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  orderIdText: {
    fontSize: 12,
    color: '#8E8278',
    fontWeight: '700',
  },
  clientName: {
    fontSize: 15,
    fontWeight: '800',
    color: '#2A2421',
    marginTop: 2,
  },
  statusPill: {
    backgroundColor: '#F5EBE6',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusPillText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#8C331A',
  },
  cardBody: {
    marginVertical: 10,
  },
  addressText: {
    fontSize: 12,
    color: '#8E8278',
    marginBottom: 4,
  },
  itemsSummary: {
    fontSize: 13,
    color: '#4B3F38',
    fontWeight: '500',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#FAF8F5',
  },
  amountLabel: {
    fontSize: 10,
    color: '#8E8278',
    textTransform: 'uppercase',
  },
  amountValue: {
    fontSize: 16,
    fontWeight: '800',
    color: '#2A2421',
    marginTop: 1,
  },
  invoicedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  invoicedBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#059669',
    marginLeft: 4,
  },
  generateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#8C331A',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
  },
  generateBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 16,
    paddingHorizontal: 20,
    maxHeight: '88%',
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
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F2EFEB',
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#2A2421',
    letterSpacing: -0.3,
  },
  modalSubtitle: {
    fontSize: 12,
    color: '#8E8278',
    marginTop: 2,
  },
  closeIconBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FAF8F5',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#EFEAE4',
  },
  fieldSectionLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#8E8278',
    marginTop: 10,
    marginBottom: 6,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  customerScroll: {
    marginBottom: 12,
  },
  compChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: '#FAF8F5',
    borderWidth: 1,
    borderColor: '#EFEAE4',
    marginRight: 8,
  },
  compChipActive: {
    backgroundColor: '#8C331A',
    borderColor: '#8C331A',
  },
  compChipText: {
    fontSize: 12,
    color: '#6B5E55',
    fontWeight: '600',
  },
  compChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FAF8F5',
    borderWidth: 1,
    borderColor: '#EFEAE4',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44,
    marginBottom: 10,
  },
  inputIcon: {
    marginRight: 8,
  },
  modalInput: {
    flex: 1,
    fontSize: 13,
    color: '#2A2421',
    paddingVertical: 0,
  },
  productSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
    marginBottom: 4,
  },
  selectedCountBadge: {
    fontSize: 11,
    fontWeight: '700',
    color: '#8C331A',
    backgroundColor: '#FDF6F3',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#F5DDD3',
  },
  productsCard: {
    backgroundColor: '#FAF8F5',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#EFEAE4',
    overflow: 'hidden',
    marginBottom: 12,
  },
  prodRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#EFEAE4',
    backgroundColor: '#FFFFFF',
  },
  prodRowSelected: {
    backgroundColor: '#FCFAF8',
  },
  prodName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#2A2421',
  },
  prodIdTag: {
    fontSize: 10,
    fontWeight: '600',
    color: '#A0958D',
    marginLeft: 6,
    backgroundColor: '#F3EFEA',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
  },
  prodBaseRate: {
    fontSize: 11,
    color: '#8C331A',
    fontWeight: '600',
    marginTop: 2,
  },
  qtyControl: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FAF8F5',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#EFEAE4',
    padding: 2,
  },
  qtyBtn: {
    width: 26,
    height: 26,
    borderRadius: 6,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#EFEAE4',
    justifyContent: 'center',
    alignItems: 'center',
  },
  qtyBtnDisabled: {
    opacity: 0.4,
    backgroundColor: '#FAF8F5',
  },
  qtyText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#8E8278',
    marginHorizontal: 8,
    minWidth: 16,
    textAlign: 'center',
  },
  qtyTextActive: {
    color: '#8C331A',
    fontWeight: '800',
  },
  orderSummaryBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FDF6F3',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#F5DDD3',
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 12,
  },
  summaryCountText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#8C331A',
  },
  summarySubtext: {
    fontSize: 10,
    color: '#A86C5B',
    marginTop: 1,
  },
  summaryTotalText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#8C331A',
  },
  confirmGenerateBtn: {
    flexDirection: 'row',
    backgroundColor: '#8C331A',
    borderRadius: 12,
    height: 46,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 4,
    marginBottom: 8,
  },
  confirmGenerateBtnDisabled: {
    backgroundColor: '#C4BCB5',
  },
  confirmGenerateBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
    letterSpacing: 0.2,
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
    fontSize: 14,
    fontWeight: '800',
    color: '#2A2421',
  },
  grandValue: {
    fontSize: 16,
    fontWeight: '800',
    color: '#8C331A',
  },
  /* Segmented Toggle Styles */
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
    paddingVertical: 8,
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
    fontSize: 12,
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
});
