import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';
import DeliveryHeader from '../../components/delivery/DeliveryHeader';
import SearchBar from '../../components/common/SearchBar';
import { EmptyState, PaginationControl } from '../../components/common';
import ConfirmDialog from '../../components/ConfirmDialog';
import deliveryService, { BackendDelivery, PaginatedResponse } from '../../services/delivery.service';
import { colors, typography, radius, spacing, shadows } from '../../theme';

// Exactly 5 filter tabs as specified: Today | All | Pending | Picked Up | Delivered
type DeliveryTabFilter = 'TODAY' | 'ALL' | 'PENDING' | 'PICKED_UP' | 'DELIVERED';

const FILTER_TABS: { key: DeliveryTabFilter; label: string }[] = [
  { key: 'TODAY', label: 'Today' },
  { key: 'ALL', label: 'All' },
  { key: 'PENDING', label: 'Pending' },
  { key: 'PICKED_UP', label: 'Picked Up' },
  { key: 'DELIVERED', label: 'Delivered' },
];

/**
 * Returns YYYY-MM-DD string in device's local time zone
 */
function getLocalTodayDateString(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Extract order date string (scheduled_delivery_date or created_at slice)
 */
function getOrderDateString(item: BackendDelivery): string {
  if (item.order_details?.scheduled_delivery_date) {
    return String(item.order_details.scheduled_delivery_date);
  }
  if (item.order_details?.created_at) {
    return String(item.order_details.created_at).slice(0, 10);
  }
  return '';
}

export default function DeliveryOrdersScreen({ navigation }: any) {
  const [deliveries, setDeliveries] = useState<BackendDelivery[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  // Exact 5 tabs: Default to TODAY for quick operational focus
  const [activeTab, setActiveTab] = useState<DeliveryTabFilter>('TODAY');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Pagination states
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(20);

  // Status Action Dialog (Strict: Pending -> Picked Up -> Delivered)
  const [actionInProgress, setActionInProgress] = useState<boolean>(false);
  const [confirmAction, setConfirmAction] = useState<{
    visible: boolean;
    title: string;
    description: string;
    delivery: BackendDelivery | null;
    targetStatus: 'picked_up' | 'delivered';
  }>({
    visible: false,
    title: '',
    description: '',
    delivery: null,
    targetStatus: 'picked_up',
  });

  const [feedbackToast, setFeedbackToast] = useState<string>('');

  const fetchDeliveries = useCallback(async () => {
    try {
      setLoading(true);
      // Fetch deliveries for this delivery partner
      const res = await deliveryService.getDeliveries();

      let list: BackendDelivery[] = [];
      if (res && 'results' in res) {
        list = (res as PaginatedResponse<BackendDelivery>).results || [];
      } else if (Array.isArray(res)) {
        list = res;
      }
      setDeliveries(list);
    } catch (err: any) {
      console.log('Error fetching deliveries:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchDeliveries();
  }, [fetchDeliveries]);

  // Refresh whenever screen gains focus
  useEffect(() => {
    const unsubscribe = navigation.addListener?.('focus', () => {
      fetchDeliveries();
    });
    return unsubscribe;
  }, [navigation, fetchDeliveries]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchDeliveries();
  }, [fetchDeliveries]);

  const navigateToOrderDetails = (item: BackendDelivery) => {
    navigation.navigate('OrderDetails', {
      delivery: item,
      deliveryId: item.id,
      order: item.order_details,
    });
  };

  const handleExecuteStatusUpdate = async () => {
    const delivery = confirmAction.delivery;
    const targetStatus = confirmAction.targetStatus;
    if (!delivery) return;

    try {
      setActionInProgress(true);
      await deliveryService.updateStatus(delivery.id, targetStatus);
      setConfirmAction(prev => ({ ...prev, visible: false, delivery: null }));
      setFeedbackToast(
        `Order #${delivery.order} marked as ${targetStatus === 'picked_up' ? 'Picked Up' : 'Delivered'}.`
      );
      setTimeout(() => setFeedbackToast(''), 3000);
      fetchDeliveries();
    } catch (err: any) {
      setConfirmAction(prev => ({ ...prev, visible: false, delivery: null }));
      setFeedbackToast(err?.message || 'Failed to update delivery status.');
      setTimeout(() => setFeedbackToast(''), 3000);
    } finally {
      setActionInProgress(false);
    }
  };

  const localToday = useMemo(() => getLocalTodayDateString(), []);

  // Filter and sort items according to the active tab, search, and date-order rule
  const filteredAndSortedList = useMemo(() => {
    // 1. Filter by Active Tab
    const tabFiltered = deliveries.filter(item => {
      const st = item.status.toLowerCase();
      const itemDate = getOrderDateString(item);
      const isToday = itemDate === localToday;

      switch (activeTab) {
        case 'TODAY':
          return isToday;
        case 'ALL':
          return true;
        case 'PENDING':
          return st === 'assigned' || st === 'pending' || st === 'accepted';
        case 'PICKED_UP':
          return st === 'picked_up' || st === 'on_the_way';
        case 'DELIVERED':
          return st === 'delivered';
        default:
          return true;
      }
    });

    // 2. Filter by Search Query (Order #, customer/company, delivery address)
    const searchFiltered = tabFiltered.filter(item => {
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase().trim();
      const oNum = String(item.order_details?.order_number || item.order).toLowerCase();
      const cName = (
        item.order_details?.customer_name ||
        item.order_details?.company_name ||
        ''
      ).toLowerCase();
      const addr = (item.order_details?.delivery_address || '').toLowerCase();
      return oNum.includes(q) || cName.includes(q) || addr.includes(q);
    });

    // 3. Sorting: Today's orders ALWAYS appear first, followed by remaining orders sorted by delivery date (descending)
    return [...searchFiltered].sort((a, b) => {
      const aDate = getOrderDateString(a);
      const bDate = getOrderDateString(b);

      const aIsToday = aDate === localToday;
      const bIsToday = bDate === localToday;

      if (aIsToday && !bIsToday) return -1;
      if (!aIsToday && bIsToday) return 1;

      // Both today or both not today: sort descending by date / ID
      if (aDate !== bDate) {
        return bDate.localeCompare(aDate);
      }
      return b.id - a.id;
    });
  }, [deliveries, activeTab, searchQuery, localToday]);

  // Paginated window for the continuous single list
  const totalRecords = filteredAndSortedList.length;
  const totalPages = Math.max(1, Math.ceil(totalRecords / pageSize));
  const paginatedList = useMemo(() => {
    const startIdx = (currentPage - 1) * pageSize;
    return filteredAndSortedList.slice(startIdx, startIdx + pageSize);
  }, [filteredAndSortedList, currentPage, pageSize]);

  const renderDeliveryCard = ({ item }: { item: BackendDelivery }) => {
    const st = item.status.toLowerCase();
    const isPending = st === 'assigned' || st === 'pending' || st === 'accepted';
    const isPickedUp = st === 'picked_up' || st === 'on_the_way';
    const isDelivered = st === 'delivered';

    const itemDate = getOrderDateString(item);
    const isToday = itemDate === localToday;

    const orderNum = item.order_details?.order_number || `ORD-${item.order}`;
    const customerName =
      item.order_details?.customer_name || item.order_details?.company_name || 'Customer';
    const address = item.order_details?.delivery_address || 'No address provided';

    const schedDate = item.order_details?.scheduled_delivery_date || '';
    const schedTime = item.order_details?.scheduled_delivery_time || '';
    const dateTimeText =
      schedDate && schedTime
        ? `${schedDate} • ${schedTime}`
        : schedDate
        ? schedDate
        : item.order_details?.created_at
        ? new Date(item.order_details.created_at).toLocaleDateString('en-IN')
        : 'Standard Delivery';

    return (
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.88}
        onPress={() => navigateToOrderDetails(item)}
      >
        {/* Top: Order Number, Today Tag, and Status Pill */}
        <View style={styles.cardHeader}>
          <View style={styles.orderNumberRow}>
            <Ionicons name="receipt-outline" size={15} color={colors.primary} />
            <Text style={styles.orderNumberText}>{orderNum}</Text>
            {isToday && (
              <View style={styles.todayPill}>
                <Text style={styles.todayPillText}>TODAY</Text>
              </View>
            )}
          </View>

          <View
            style={[
              styles.statusPill,
              isPending && styles.statusPending,
              isPickedUp && styles.statusPickedUp,
              isDelivered && styles.statusDelivered,
            ]}
          >
            <Text
              style={[
                styles.statusText,
                isPending && styles.statusTextPending,
                isPickedUp && styles.statusTextPickedUp,
                isDelivered && styles.statusTextDelivered,
              ]}
            >
              {isPending ? 'Pending' : isPickedUp ? 'Picked Up' : 'Delivered'}
            </Text>
          </View>
        </View>

        {/* Customer and Delivery Address (Readable Text Only) */}
        <View style={styles.cardBody}>
          <Text style={styles.customerName} numberOfLines={1}>
            {customerName}
          </Text>

          <View style={styles.metaRow}>
            <Ionicons name="location-outline" size={14} color={colors.textSecondary} />
            <Text style={styles.addressText} numberOfLines={2}>
              {address}
            </Text>
          </View>

          <View style={styles.metaRow}>
            <Ionicons name="time-outline" size={13} color={colors.textMuted} />
            <Text style={styles.dateText}>{dateTimeText}</Text>
          </View>
        </View>

        {/* Action Controls for Delivery Partner */}
        <View style={styles.cardFooter}>
          {isPending && (
            <TouchableOpacity
              style={[styles.transitionBtn, { backgroundColor: colors.primary }]}
              onPress={() =>
                setConfirmAction({
                  visible: true,
                  title: 'Mark as Picked Up?',
                  description: `Confirm that you have picked up ${orderNum} from the store.`,
                  delivery: item,
                  targetStatus: 'picked_up',
                })
              }
              activeOpacity={0.8}
            >
              <Ionicons name="cube-outline" size={14} color="#FFFFFF" style={{ marginRight: 6 }} />
              <Text style={styles.transitionBtnText}>Mark Picked Up</Text>
            </TouchableOpacity>
          )}

          {isPickedUp && (
            <TouchableOpacity
              style={[styles.transitionBtn, { backgroundColor: '#8C331A' }]}
              onPress={() =>
                setConfirmAction({
                  visible: true,
                  title: 'Mark as Delivered?',
                  description: `Confirm that you have successfully delivered ${orderNum} to ${customerName}.`,
                  delivery: item,
                  targetStatus: 'delivered',
                })
              }
              activeOpacity={0.8}
            >
              <Ionicons
                name="checkmark-done-circle-outline"
                size={15}
                color="#FFFFFF"
                style={{ marginRight: 6 }}
              />
              <Text style={styles.transitionBtnText}>Mark Delivered</Text>
            </TouchableOpacity>
          )}

          {isDelivered && (
            <View style={styles.deliveredNotice}>
              <Ionicons name="checkmark-circle" size={15} color="#8C331A" style={{ marginRight: 4 }} />
              <Text style={styles.deliveredNoticeText}>Delivered</Text>
            </View>
          )}

          <TouchableOpacity
            style={styles.detailsLink}
            onPress={() => navigateToOrderDetails(item)}
            activeOpacity={0.7}
          >
            <Text style={styles.detailsLinkText}>Order Details</Text>
            <Ionicons name="chevron-forward" size={14} color={colors.primary} />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* 1. Header: My Deliveries */}
      <DeliveryHeader title="My Deliveries" />

      {feedbackToast !== '' && (
        <View style={styles.toast}>
          <Ionicons name="information-circle-outline" size={18} color="#FFFFFF" />
          <Text style={styles.toastText}>{feedbackToast}</Text>
        </View>
      )}

      {/* 2. Search Bar */}
      <View style={styles.searchHeader}>
        <SearchBar
          value={searchQuery}
          onChangeText={text => {
            setSearchQuery(text);
            setCurrentPage(1);
          }}
          placeholder="Search by order #, customer, address..."
          containerStyle={{ marginVertical: 0, marginBottom: 8 }}
        />

        {/* 3. Filter Tabs directly below search: Today | All | Pending | Picked Up | Delivered */}
        <View style={styles.tabsRow}>
          {FILTER_TABS.map(tab => {
            const isActive = activeTab === tab.key;
            return (
              <TouchableOpacity
                key={tab.key}
                style={[styles.tabPill, isActive && styles.tabPillActive]}
                onPress={() => {
                  setActiveTab(tab.key);
                  setCurrentPage(1);
                }}
                activeOpacity={0.7}
              >
                <Text style={[styles.tabPillText, isActive && styles.tabPillTextActive]}>
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* 4. Below Filters: ONE Continuous Order List */}
      {loading && !refreshing ? (
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading deliveries...</Text>
        </View>
      ) : paginatedList.length === 0 ? (
        <EmptyState
          icon="bicycle-outline"
          title="No Deliveries Found"
          subtitle={
            searchQuery
              ? 'No orders matched your search criteria.'
              : activeTab === 'TODAY'
              ? 'You have no deliveries scheduled for today.'
              : `No orders in ${FILTER_TABS.find(t => t.key === activeTab)?.label} status.`
          }
        />
      ) : (
        <FlatList
          data={paginatedList}
          keyExtractor={item => String(item.id)}
          renderItem={renderDeliveryCard}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[colors.primary]}
            />
          }
          ListFooterComponent={
            <PaginationControl
              currentPage={currentPage}
              totalPages={totalPages}
              totalRecords={totalRecords}
              pageSize={pageSize}
              pageSizeOptions={[10, 20, 30]}
              onPageChange={page => setCurrentPage(page)}
              onPageSizeChange={size => {
                setPageSize(size);
                setCurrentPage(1);
              }}
              isLoading={loading}
            />
          }
        />
      )}

      {/* Confirmation Dialog */}
      <ConfirmDialog
        visible={confirmAction.visible}
        title={confirmAction.title}
        description={confirmAction.description}
        confirmLabel={
          confirmAction.targetStatus === 'picked_up' ? 'Confirm Pick Up' : 'Confirm Delivered'
        }
        cancelLabel="Cancel"
        type={confirmAction.targetStatus === 'picked_up' ? 'warning' : 'success'}
        onConfirm={handleExecuteStatusUpdate}
        onCancel={() => setConfirmAction(prev => ({ ...prev, visible: false, delivery: null }))}
        loading={actionInProgress}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7F8FA',
  },
  toast: {
    backgroundColor: '#253247',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginHorizontal: 16,
    marginTop: 8,
    borderRadius: radius.md,
    gap: 8,
    ...shadows.sm,
  },
  toastText: {
    fontSize: 12,
    color: '#FFFFFF',
    fontWeight: '500',
    flex: 1,
  },
  searchHeader: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#E8EDF2',
  },
  tabsRow: {
    flexDirection: 'row',
    gap: 6,
  },
  tabPill: {
    flex: 1,
    paddingVertical: 7,
    borderRadius: radius.md,
    backgroundColor: '#F7F8FA',
    borderWidth: 1,
    borderColor: '#E8EDF2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabPillActive: {
    backgroundColor: '#8C331A',
    borderColor: '#8C331A',
  },
  tabPillText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#718096',
  },
  tabPillTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  centerBox: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 13,
    color: '#718096',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 24,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: radius.lg,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E8EDF2',
    ...shadows.sm,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  orderNumberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  orderNumberText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#253247',
  },
  todayPill: {
    backgroundColor: '#F7F8FA',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: '#E8EDF2',
  },
  todayPillText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#8C331A',
  },
  statusPill: {
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: radius.full,
    borderWidth: 1,
  },
  statusPending: {
    backgroundColor: '#FEF3C7',
    borderColor: '#FDE68A',
  },
  statusPickedUp: {
    backgroundColor: '#EFF6FF',
    borderColor: '#BFDBFE',
  },
  statusDelivered: {
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0',
  },
  statusText: {
    fontSize: 10,
    fontWeight: '700',
  },
  statusTextPending: {
    color: '#92400E',
  },
  statusTextPickedUp: {
    color: '#1D4ED8',
  },
  statusTextDelivered: {
    color: '#047857',
  },
  cardBody: {
    marginBottom: 10,
  },
  customerName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#253247',
    marginBottom: 3,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  addressText: {
    fontSize: 12,
    color: '#718096',
    flex: 1,
  },
  dateText: {
    fontSize: 11,
    color: '#718096',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F7F8FA',
  },
  transitionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.md,
  },
  transitionBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  deliveredNotice: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  deliveredNoticeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#8C331A',
  },
  detailsLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingVertical: 4,
  },
  detailsLinkText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#8C331A',
  },
});
