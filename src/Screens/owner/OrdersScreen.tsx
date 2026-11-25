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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { Header, EmptyState } from '../../components/common';
import orderService, { BackendOrder } from '../../services/order.service';
import { useApp } from '../../context/AppContext';
import { colors, typography, radius, spacing, shadows } from '../../theme';

type StatusFilter = 'ALL' | 'PENDING' | 'ASSIGNED' | 'IN_PROGRESS' | 'DELIVERED';

const FILTER_TABS: { key: StatusFilter; label: string }[] = [
  { key: 'ALL', label: 'All' },
  { key: 'PENDING', label: 'Pending' },
  { key: 'ASSIGNED', label: 'Assigned' },
  { key: 'IN_PROGRESS', label: 'In Progress' },
  { key: 'DELIVERED', label: 'Delivered' },
];

type DateFilter = 'all' | 'today' | 'yesterday';

export default function OrdersScreen({ navigation }: any) {
  const { refreshBackendData } = useApp();

  const [orders, setOrders] = useState<BackendOrder[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');
  const [dateFilter, setDateFilter] = useState<DateFilter>('all');

  // Fetch all orders from backend
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

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  // Focus listener to refresh when returning to Orders tab
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      fetchOrders();
    });
    return unsubscribe;
  }, [navigation, fetchOrders]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchOrders();
    refreshBackendData();
  }, [fetchOrders, refreshBackendData]);

  // Helper date matching
  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);
  const yesterdayStr = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return d.toISOString().split('T')[0];
  }, []);

  // Filter and Search Logic
  const filteredOrders = useMemo(() => {
    return orders.filter(order => {
      // 1. Date Filter
      if (dateFilter === 'today') {
        if (!order.created_at || !order.created_at.startsWith(todayStr)) return false;
      } else if (dateFilter === 'yesterday') {
        if (!order.created_at || !order.created_at.startsWith(yesterdayStr)) return false;
      }

      // 2. Status Filter
      if (statusFilter === 'PENDING') {
        const isPending = order.status === 'pending' && !order.delivery_partner_id;
        if (!isPending) return false;
      } else if (statusFilter === 'ASSIGNED') {
        const isAssigned =
          order.delivery_status === 'assigned' ||
          (Boolean(order.delivery_partner_id) && order.status === 'pending');
        if (!isAssigned) return false;
      } else if (statusFilter === 'IN_PROGRESS') {
        const inProgressStatuses = ['accepted', 'preparing', 'out_for_delivery', 'picked_up', 'on_the_way'];
        const isInProgress =
          inProgressStatuses.includes(order.status) ||
          (order.delivery_status ? inProgressStatuses.includes(order.delivery_status) : false);
        if (!isInProgress) return false;
      } else if (statusFilter === 'DELIVERED') {
        const isDelivered = order.status === 'delivered' || order.delivery_status === 'delivered';
        if (!isDelivered) return false;
      }

      // 3. Search query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesId = `#${order.id}`.includes(query) || String(order.id).includes(query);
        const matchesCustomer = (order.customer_name || '').toLowerCase().includes(query);
        const matchesCompany = (order.company_name || '').toLowerCase().includes(query);
        const matchesPartner = (order.delivery_partner_name || '').toLowerCase().includes(query);
        const matchesProduct = (order.items || []).some(it =>
          (it.product_details?.name || (it as any).product_name || '').toLowerCase().includes(query)
        );

        if (!matchesId && !matchesCustomer && !matchesCompany && !matchesPartner && !matchesProduct) {
          return false;
        }
      }

      return true;
    });
  }, [orders, dateFilter, statusFilter, searchQuery, todayStr, yesterdayStr]);

  // Order counts per status tab for badges
  const statusCounts = useMemo(() => {
    let pending = 0;
    let assigned = 0;
    let inProgress = 0;
    let delivered = 0;

    orders.forEach(o => {
      // Date filter applies to badge count as well if not 'all'
      if (dateFilter === 'today' && (!o.created_at || !o.created_at.startsWith(todayStr))) return;
      if (dateFilter === 'yesterday' && (!o.created_at || !o.created_at.startsWith(yesterdayStr))) return;

      if (o.status === 'pending' && !o.delivery_partner_id) {
        pending++;
      } else if (
        o.delivery_status === 'assigned' ||
        (Boolean(o.delivery_partner_id) && o.status === 'pending')
      ) {
        assigned++;
      } else if (
        ['accepted', 'preparing', 'out_for_delivery', 'picked_up', 'on_the_way'].includes(o.status) ||
        (o.delivery_status && ['accepted', 'picked_up', 'on_the_way'].includes(o.delivery_status))
      ) {
        inProgress++;
      } else if (o.status === 'delivered' || o.delivery_status === 'delivered') {
        delivered++;
      }
    });

    return {
      ALL: dateFilter === 'all' ? orders.length : orders.filter(o => {
        if (dateFilter === 'today') return o.created_at?.startsWith(todayStr);
        if (dateFilter === 'yesterday') return o.created_at?.startsWith(yesterdayStr);
        return true;
      }).length,
      PENDING: pending,
      ASSIGNED: assigned,
      IN_PROGRESS: inProgress,
      DELIVERED: delivered,
    };
  }, [orders, dateFilter, todayStr, yesterdayStr]);

  // Helper for Status Badge Display
  const getStatusBadge = (order: BackendOrder) => {
    if (order.status === 'delivered' || order.delivery_status === 'delivered') {
      return { label: 'Delivered', bg: '#ECFDF5', text: '#059669', border: '#A7F3D0', icon: 'checkmark-circle' };
    }
    if (order.status === 'cancelled') {
      return { label: 'Cancelled', bg: '#FEF2F2', text: '#DC2626', border: '#FECACA', icon: 'close-circle' };
    }
    if (
      ['out_for_delivery', 'picked_up', 'on_the_way'].includes(order.status) ||
      (order.delivery_status && ['picked_up', 'on_the_way'].includes(order.delivery_status))
    ) {
      return { label: 'Out for Delivery', bg: '#EFF6FF', text: '#2563EB', border: '#BFDBFE', icon: 'bicycle' };
    }
    if (order.status === 'preparing' || order.status === 'accepted' || order.delivery_status === 'accepted') {
      return { label: 'In Progress', bg: '#FDF4FF', text: '#9333EA', border: '#F5D0FE', icon: 'time' };
    }
    if (order.delivery_status === 'assigned' || (order.delivery_partner_id && order.status === 'pending')) {
      return { label: 'Assigned', bg: '#FEF3C7', text: '#D97706', border: '#FDE68A', icon: 'person' };
    }
    return { label: 'Pending', bg: '#FFFBEB', text: '#B45309', border: '#FDE68A', icon: 'hourglass-outline' };
  };

  // Format Date and Time
  const formatDateTime = (dateStr: string) => {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      const today = new Date();
      const isToday = d.toDateString() === today.toDateString();

      const timeStr = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      if (isToday) {
        return `Today, ${timeStr}`;
      }
      return `${d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}, ${timeStr}`;
    } catch {
      return dateStr;
    }
  };

  // Compact Order Card Item
  const renderOrderItem = ({ item }: { item: BackendOrder }) => {
    const badge = getStatusBadge(item);
    const customerTitle = item.customer_name || 'Walk-in Customer';
    const companyTitle = item.company_name;
    const partnerName = item.delivery_partner_name;
    const totalAmount = parseFloat(item.total_amount || '0').toFixed(0);

    // Products and quantities formatted string
    const itemsSummary = (item.items || [])
      .map(it => {
        const pName = it.product_details?.name || (it as any).product_name || 'Item';
        return `${it.quantity}x ${pName}`;
      })
      .join('  •  ');

    return (
      <View style={styles.orderCard}>
        {/* Card Header: Order ID, Date/Time and Status Pill */}
        <View style={styles.cardHeader}>
          <View style={styles.orderIdGroup}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={styles.orderIdText}>#{item.id}</Text>
              {(item.scheduled_delivery_date || item.scheduled_delivery_time) && (
                <View style={{ backgroundColor: '#F3E8E2', paddingHorizontal: 6, paddingVertical: 1, borderRadius: 4 }}>
                  <Text style={{ fontSize: 10, fontFamily: 'Inter-Bold', color: colors.primary, fontWeight: '700' }}>
                    DAILY {item.scheduled_delivery_time ? item.scheduled_delivery_time.slice(0, 5) : ''}
                  </Text>
                </View>
              )}
            </View>
            <Text style={styles.dateTimeText}>
              {item.scheduled_delivery_date
                ? `Delivery: ${item.scheduled_delivery_date} ${item.scheduled_delivery_time ? item.scheduled_delivery_time.slice(0, 5) : ''}`
                : formatDateTime(item.created_at)}
            </Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: badge.bg, borderColor: badge.border }]}>
            <Ionicons name={badge.icon as any} size={12} color={badge.text} style={{ marginRight: 4 }} />
            <Text style={[styles.statusBadgeText, { color: badge.text }]}>{badge.label}</Text>
          </View>
        </View>

        {/* Card Customer Info */}
        <View style={styles.customerRow}>
          <Ionicons name="person-outline" size={15} color={colors.textSecondary} style={{ marginRight: 6 }} />
          <Text style={styles.customerNameText} numberOfLines={1}>
            {customerTitle}
            {companyTitle ? ` (${companyTitle})` : ''}
          </Text>
        </View>

        {/* Items Summary */}
        <View style={styles.itemsSummaryBox}>
          <Ionicons name="cafe-outline" size={14} color={colors.primary} style={{ marginRight: 6, marginTop: 2 }} />
          <Text style={styles.itemsSummaryText} numberOfLines={2}>
            {itemsSummary || 'No items listed'}
          </Text>
        </View>

        {/* Card Footer: Delivery Partner, Amount and Details button */}
        <View style={styles.cardFooter}>
          <View style={styles.partnerInfoGroup}>
            <Ionicons
              name={partnerName ? 'bicycle-outline' : 'alert-circle-outline'}
              size={14}
              color={partnerName ? colors.textSecondary : colors.warning}
              style={{ marginRight: 4 }}
            />
            <Text
              style={[styles.partnerNameText, !partnerName && styles.partnerUnassignedText]}
              numberOfLines={1}
            >
              {partnerName ? partnerName : 'Unassigned'}
            </Text>
          </View>

          <View style={styles.footerRight}>
            <Text style={styles.amountText}>₹{totalAmount}</Text>
            <TouchableOpacity
              style={styles.detailsBtn}
              onPress={() => navigation.navigate('OrderDetails', { orderId: item.id, order: item })}
              activeOpacity={0.7}
            >
              <Text style={styles.detailsBtnText}>Details</Text>
              <Ionicons name="chevron-forward" size={13} color={colors.primary} />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* 1. Header Bar with Add Order Action */}
      <View style={styles.topHeader}>
        <View>
          <Text style={styles.headerTitle}>Orders</Text>
          <Text style={styles.headerSubtitle}>
            {filteredOrders.length} order{filteredOrders.length === 1 ? '' : 's'}
          </Text>
        </View>
        <TouchableOpacity
          style={styles.addOrderBtn}
          onPress={() => navigation.navigate('QuickBilling', { mode: 'order' })}
          activeOpacity={0.8}
        >
          <Ionicons name="add" size={18} color={colors.white} style={{ marginRight: 4 }} />
          <Text style={styles.addOrderBtnText}>Add Order</Text>
        </TouchableOpacity>
      </View>

      {/* 2. Search Bar & Date Filter Row */}
      <View style={styles.searchAndDateRow}>
        <View style={styles.searchContainer}>
          <Ionicons name="search-outline" size={17} color={colors.textMuted} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search order #, customer, item..."
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

        {/* Date Filter Pills */}
        <View style={styles.datePillsRow}>
          <TouchableOpacity
            style={[styles.datePill, dateFilter === 'all' && styles.datePillActive]}
            onPress={() => setDateFilter('all')}
            activeOpacity={0.7}
          >
            <Text style={[styles.datePillText, dateFilter === 'all' && styles.datePillTextActive]}>All Time</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.datePill, dateFilter === 'today' && styles.datePillActive]}
            onPress={() => setDateFilter('today')}
            activeOpacity={0.7}
          >
            <Text style={[styles.datePillText, dateFilter === 'today' && styles.datePillTextActive]}>Today</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.datePill, dateFilter === 'yesterday' && styles.datePillActive]}
            onPress={() => setDateFilter('yesterday')}
            activeOpacity={0.7}
          >
            <Text style={[styles.datePillText, dateFilter === 'yesterday' && styles.datePillTextActive]}>Yesterday</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* 3. Five Status Filter Chips */}
      <View style={styles.statusChipsContainer}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={FILTER_TABS}
          keyExtractor={item => item.key}
          contentContainerStyle={styles.statusChipsContent}
          renderItem={({ item }) => {
            const isActive = statusFilter === item.key;
            const count = (statusCounts as any)[item.key] || 0;
            return (
              <TouchableOpacity
                style={[styles.statusChip, isActive && styles.statusChipActive]}
                onPress={() => setStatusFilter(item.key)}
                activeOpacity={0.7}
              >
                <Text style={[styles.statusChipText, isActive && styles.statusChipTextActive]}>
                  {item.label}
                </Text>
                <View style={[styles.statusChipBadge, isActive && styles.statusChipBadgeActive]}>
                  <Text style={[styles.statusChipBadgeText, isActive && styles.statusChipBadgeTextActive]}>
                    {count}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          }}
        />
      </View>

      {/* 4. Orders List or Empty State */}
      {loading ? (
        <View style={styles.centeredLoading}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading orders...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredOrders}
          keyExtractor={item => String(item.id)}
          renderItem={renderOrderItem}
          contentContainerStyle={[
            styles.listContent,
            filteredOrders.length === 0 && { flex: 1, justifyContent: 'center' },
          ]}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />
          }
          ListEmptyComponent={
            <EmptyState
              icon="cart-outline"
              title="No Orders Found"
              subtitle={
                searchQuery.trim()
                  ? `No orders matching "${searchQuery}"`
                  : `No ${statusFilter === 'ALL' ? '' : statusFilter.toLowerCase()} orders found.`
              }
            />
          }
        />
      )}
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
    borderBottomColor: colors.borderLight,
  },
  headerTitle: {
    ...typography.heading1,
    fontFamily: 'Inter-Bold',
    color: colors.textPrimary,
  },
  headerSubtitle: {
    ...typography.caption,
    fontFamily: 'Inter-Medium',
    color: colors.textSecondary,
    marginTop: 1,
  },
  addOrderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: 7,
    borderRadius: radius.md,
    ...shadows.sm,
  },
  addOrderBtnText: {
    ...typography.badge,
    fontFamily: 'Inter-Bold',
    color: colors.white,
    fontWeight: '700',
  },
  searchAndDateRow: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.xs,
    paddingBottom: spacing.sm,
    backgroundColor: colors.cardBackground,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.sm,
    height: 40,
    marginBottom: spacing.xs,
  },
  searchIcon: {
    marginRight: spacing.xs,
  },
  searchInput: {
    flex: 1,
    ...typography.body,
    fontFamily: 'Inter-Regular',
    color: colors.textPrimary,
    paddingVertical: 0,
  },
  datePillsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  datePill: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 5,
    borderRadius: radius.full,
    backgroundColor: colors.background,
    marginRight: spacing.xs,
    borderWidth: 1,
    borderColor: colors.border,
  },
  datePillActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  datePillText: {
    ...typography.caption,
    fontFamily: 'Inter-Medium',
    color: colors.textSecondary,
  },
  datePillTextActive: {
    color: colors.white,
    fontFamily: 'Inter-SemiBold',
    fontWeight: '700',
  },
  statusChipsContainer: {
    backgroundColor: colors.cardBackground,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  statusChipsContent: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.xs,
  },
  statusChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radius.full,
    backgroundColor: colors.surfaceContainerLow,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  statusChipActive: {
    backgroundColor: '#F7EDE8',
    borderColor: colors.primary,
  },
  statusChipText: {
    ...typography.body,
    fontSize: 13,
    fontFamily: 'Inter-Medium',
    color: colors.textSecondary,
    marginRight: 6,
  },
  statusChipTextActive: {
    color: colors.primary,
    fontFamily: 'Inter-SemiBold',
    fontWeight: '700',
  },
  statusChipBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: radius.full,
    backgroundColor: colors.gray200,
  },
  statusChipBadgeActive: {
    backgroundColor: colors.primary,
  },
  statusChipBadgeText: {
    fontSize: 10,
    fontFamily: 'Inter-Bold',
    color: colors.textSecondary,
  },
  statusChipBadgeTextActive: {
    color: colors.white,
    fontWeight: '800',
  },
  centeredLoading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: spacing.sm,
    ...typography.body,
    fontFamily: 'Inter-Regular',
    color: colors.textSecondary,
  },
  listContent: {
    padding: spacing.md,
    paddingBottom: spacing.xxl,
  },
  orderCard: {
    backgroundColor: colors.cardBackground,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.sm,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.xs,
  },
  orderIdGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  orderIdText: {
    ...typography.heading2,
    fontFamily: 'Inter-Bold',
    color: colors.textPrimary,
  },
  dateTimeText: {
    ...typography.caption,
    fontFamily: 'Inter-Regular',
    color: colors.textMuted,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.full,
    borderWidth: 1,
  },
  statusBadgeText: {
    fontSize: 11,
    fontFamily: 'Inter-SemiBold',
    fontWeight: '700',
  },
  customerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
    marginBottom: spacing.xs,
  },
  customerNameText: {
    ...typography.body,
    fontFamily: 'Inter-SemiBold',
    color: colors.textPrimary,
    fontWeight: '700',
    flex: 1,
  },
  itemsSummaryBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.background,
    padding: spacing.xs,
    borderRadius: radius.sm,
    marginBottom: spacing.sm,
  },
  itemsSummaryText: {
    ...typography.caption,
    fontFamily: 'Inter-Regular',
    color: colors.textSecondary,
    flex: 1,
    lineHeight: 18,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  partnerInfoGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: spacing.sm,
  },
  partnerNameText: {
    ...typography.caption,
    fontFamily: 'Inter-Medium',
    color: colors.textSecondary,
  },
  partnerUnassignedText: {
    color: colors.warning,
    fontStyle: 'italic',
  },
  footerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  amountText: {
    ...typography.heading2,
    fontFamily: 'Inter-Bold',
    color: colors.primary,
    fontWeight: '800',
  },
  detailsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F7EDE8',
    paddingHorizontal: spacing.sm,
    paddingVertical: 5,
    borderRadius: radius.md,
  },
  detailsBtnText: {
    ...typography.caption,
    fontFamily: 'Inter-SemiBold',
    color: colors.primary,
    marginRight: 2,
    fontWeight: '700',
  },
});
