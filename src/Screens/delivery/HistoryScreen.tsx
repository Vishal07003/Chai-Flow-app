import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';
import deliveryService, { BackendDelivery } from '../../services/delivery.service';

type FilterStatus = 'all' | 'delivered' | 'failed';
type DateFilter = 'all' | 'today' | 'week' | 'month';

export default function DeliveryHistoryScreen() {
  const [historyList, setHistoryList] = useState<BackendDelivery[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
  const [dateFilter, setDateFilter] = useState<DateFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const fetchHistory = useCallback(async () => {
    try {
      setLoading(true);
      const data = await deliveryService.getDeliveries({ status: 'history' });
      setHistoryList(data || []);
    } catch (err) {
      console.log('Failed to fetch delivery history:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchHistory();
  };

  // Date filtering logic
  const isWithinDateFilter = (dateStr?: string | null, filter: DateFilter = 'all') => {
    if (filter === 'all' || !dateStr) return true;
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return true;

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    if (filter === 'today') {
      return date >= todayStart;
    }
    if (filter === 'week') {
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      return date >= weekAgo;
    }
    if (filter === 'month') {
      const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      return date >= monthAgo;
    }
    return true;
  };

  // Filtered deliveries list
  const filteredItems = useMemo(() => {
    return historyList.filter(d => {
      // 1. Status filter
      if (filterStatus !== 'all' && d.status !== filterStatus) {
        return false;
      }

      // 2. Date filter
      const recordDate = d.delivered_time || d.updated_at || d.order_details?.created_at;
      if (!isWithinDateFilter(recordDate, dateFilter)) {
        return false;
      }

      // 3. Search query filter (Order ID or Customer/Company Name)
      if (searchQuery.trim()) {
        const query = searchQuery.trim().toLowerCase();
        const orderIdStr = String(d.order_details?.id || d.order || '').toLowerCase();
        const customerName = (
          d.order_details?.company_name ||
          d.order_details?.customer_name ||
          ''
        ).toLowerCase();
        const address = (d.order_details?.delivery_address || '').toLowerCase();

        return (
          orderIdStr.includes(query) ||
          customerName.includes(query) ||
          address.includes(query)
        );
      }

      return true;
    });
  }, [historyList, filterStatus, dateFilter, searchQuery]);

  const renderHistoryItem = ({ item }: { item: BackendDelivery }) => {
    const isDelivered = item.status === 'delivered';
    const customerName =
      item.order_details?.company_name ||
      item.order_details?.customer_name ||
      'Direct Customer';
    const address = item.order_details?.delivery_address || 'Address not specified';

    const timestamp = item.delivered_time || item.updated_at;
    const formattedDateTime = timestamp
      ? new Date(timestamp).toLocaleString('en-IN', {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          hour12: true,
          timeZone: 'Asia/Kolkata',
        })
      : 'Date unavailable';

    // Build operational items list
    const orderItems = item.order_details?.items || [];
    const deliveredItems = item.delivered_items || [];

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={{ flex: 1, marginRight: 8 }}>
            <Text style={styles.orderNumber}>
              Order #{item.order_details?.id || item.order}
            </Text>
            <Text style={styles.companyName}>{customerName}</Text>
          </View>
          <View
            style={[
              styles.badge,
              isDelivered ? styles.deliveredBadge : styles.failedBadge,
            ]}
          >
            <Ionicons
              name={isDelivered ? 'checkmark-circle' : 'close-circle'}
              size={14}
              color={isDelivered ? '#059669' : '#DC2626'}
            />
            <Text
              style={[
                styles.badgeText,
                { color: isDelivered ? '#059669' : '#DC2626' },
              ]}
            >
              {isDelivered ? 'DELIVERED' : 'FAILED'}
            </Text>
          </View>
        </View>

        <View style={styles.infoRow}>
          <Ionicons name="calendar-outline" size={15} color="#6B7280" />
          <Text style={styles.infoText}>{formattedDateTime}</Text>
        </View>

        <View style={styles.infoRow}>
          <Ionicons name="location-outline" size={15} color="#6B7280" />
          <Text style={styles.infoText} numberOfLines={2}>
            {address}
          </Text>
        </View>

        {item.failure_reason ? (
          <View style={styles.failureBox}>
            <Text style={styles.failureLabel}>Failure Reason:</Text>
            <Text style={styles.failureText}>{item.failure_reason}</Text>
          </View>
        ) : null}

        {/* Operational Items & Delivery Quantity Reconciliation */}
        <View style={styles.itemsContainer}>
          <Text style={styles.itemsHeader}>Items & Quantities:</Text>
          {deliveredItems.length > 0 ? (
            deliveredItems.map(di => (
              <View key={di.id} style={styles.itemRow}>
                <Text style={styles.itemProductName} numberOfLines={1}>
                  {di.product_name}
                </Text>
                <View style={styles.qtyContainer}>
                  <Text style={styles.itemQty}>
                    Delivered: {di.delivered_quantity} / Ordered: {di.ordered_quantity}
                  </Text>
                  {di.has_discrepancy && (
                    <View style={styles.discrepancyTag}>
                      <Text style={styles.discrepancyTagText}>Discrepancy</Text>
                    </View>
                  )}
                </View>
              </View>
            ))
          ) : orderItems.length > 0 ? (
            orderItems.map(oi => (
              <View key={oi.id} style={styles.itemRow}>
                <Text style={styles.itemProductName} numberOfLines={1}>
                  {oi.product_details?.name || 'Item'}
                </Text>
                <Text style={styles.itemQty}>
                  Qty: {oi.quantity}
                </Text>
              </View>
            ))
          ) : (
            <Text style={styles.noItemsText}>Package details recorded</Text>
          )}
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Delivery History</Text>
        <Text style={styles.headerSub}>Operational delivery records & logs</Text>
      </View>

      {/* Search Input */}
      <View style={styles.searchSection}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={18} color="#9CA3AF" style={{ marginRight: 8 }} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search order ID, customer or address..."
            placeholderTextColor="#9CA3AF"
            value={searchQuery}
            onChangeText={setSearchQuery}
            clearButtonMode="while-editing"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="close-circle" size={18} color="#9CA3AF" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Filter Rows */}
      <View style={styles.filterSection}>
        {/* Status Chips */}
        <View style={styles.chipRow}>
          {(['all', 'delivered', 'failed'] as const).map(f => (
            <TouchableOpacity
              key={f}
              style={[
                styles.filterChip,
                filterStatus === f && styles.activeFilterChip,
              ]}
              onPress={() => setFilterStatus(f)}
            >
              <Text
                style={[
                  styles.filterChipText,
                  filterStatus === f && styles.activeFilterChipText,
                ]}
              >
                {f.toUpperCase()}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Date Filter Chips */}
        <View style={[styles.chipRow, { marginTop: 6 }]}>
          {(
            [
              { id: 'all', label: 'All Dates' },
              { id: 'today', label: 'Today' },
              { id: 'week', label: 'Past 7 Days' },
              { id: 'month', label: 'Past 30 Days' },
            ] as const
          ).map(df => (
            <TouchableOpacity
              key={df.id}
              style={[
                styles.dateChip,
                dateFilter === df.id && styles.activeDateChip,
              ]}
              onPress={() => setDateFilter(df.id)}
            >
              <Text
                style={[
                  styles.dateChipText,
                  dateFilter === df.id && styles.activeDateChipText,
                ]}
              >
                {df.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Content */}
      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#059669" />
          <Text style={styles.loadingText}>Loading delivery records...</Text>
        </View>
      ) : filteredItems.length === 0 ? (
        <View style={styles.centerContainer}>
          <Ionicons name="file-tray-outline" size={54} color="#D1D5DB" />
          <Text style={styles.emptyTitle}>No Delivery Records Found</Text>
          <Text style={styles.emptySub}>
            Completed and failed deliveries matching your filters will appear here.
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredItems}
          keyExtractor={item => String(item.id)}
          renderItem={renderHistoryItem}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={['#059669']}
              tintColor="#059669"
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
    backgroundColor: '#FAF8F5',
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#EFEAE4',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1F2937',
  },
  headerSub: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  searchSection: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 6,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 40,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: '#1F2937',
    paddingVertical: 0,
  },
  filterSection: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#EFEAE4',
  },
  chipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
  },
  activeFilterChip: {
    backgroundColor: '#059669',
  },
  filterChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#4B5563',
  },
  activeFilterChipText: {
    color: '#FFFFFF',
  },
  dateChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: '#FAF8F5',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  activeDateChip: {
    borderColor: '#059669',
    backgroundColor: '#ECFDF5',
  },
  dateChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#6B7280',
  },
  activeDateChipText: {
    color: '#059669',
    fontWeight: '700',
  },
  listContainer: {
    padding: 16,
    paddingBottom: 32,
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '600',
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#374151',
    marginTop: 14,
  },
  emptySub: {
    fontSize: 13,
    color: '#9CA3AF',
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 18,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  orderNumber: {
    fontSize: 15,
    fontWeight: '800',
    color: '#111827',
  },
  companyName: {
    fontSize: 13,
    color: '#4B5563',
    marginTop: 2,
    fontWeight: '600',
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
  },
  deliveredBadge: {
    backgroundColor: '#ECFDF5',
  },
  failedBadge: {
    backgroundColor: '#FEF2F2',
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '800',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    gap: 8,
  },
  infoText: {
    fontSize: 13,
    color: '#4B5563',
    flex: 1,
  },
  failureBox: {
    marginTop: 10,
    padding: 10,
    backgroundColor: '#FEF2F2',
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#DC2626',
  },
  failureLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#991B1B',
  },
  failureText: {
    fontSize: 12,
    color: '#DC2626',
    marginTop: 2,
  },
  itemsContainer: {
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  itemsHeader: {
    fontSize: 12,
    fontWeight: '700',
    color: '#6B7280',
    marginBottom: 6,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  itemProductName: {
    fontSize: 13,
    color: '#374151',
    fontWeight: '500',
    flex: 1,
  },
  qtyContainer: {
    alignItems: 'flex-end',
  },
  itemQty: {
    fontSize: 12,
    fontWeight: '600',
    color: '#111827',
  },
  noItemsText: {
    fontSize: 12,
    color: '#9CA3AF',
    fontStyle: 'italic',
  },
  discrepancyTag: {
    marginTop: 2,
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  discrepancyTagText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#92400E',
  },
});
