import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';
import deliveryService, { BackendDelivery } from '../../services/delivery.service';

export default function DeliveryHistoryScreen() {
  const [historyList, setHistoryList] = useState<BackendDelivery[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filterStatus, setFilterStatus] = useState<'all' | 'delivered' | 'failed'>('all');

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

  const filteredItems = historyList.filter(d => {
    if (filterStatus === 'all') return true;
    return d.status === filterStatus;
  });

  const renderHistoryItem = ({ item }: { item: BackendDelivery }) => {
    const isDelivered = item.status === 'delivered';
    const companyName = item.order_details?.company_name || 'Walk-in / Direct';
    const address = item.order_details?.delivery_address || 'Address not specified';
    const completionTime = item.delivered_time
      ? new Date(item.delivered_time).toLocaleString('en-IN', {
          day: 'numeric',
          month: 'short',
          hour: '2-digit',
          minute: '2-digit',
        })
      : new Date(item.updated_at).toLocaleString('en-IN', {
          day: 'numeric',
          month: 'short',
          hour: '2-digit',
          minute: '2-digit',
        });

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={{ flex: 1 }}>
            <Text style={styles.orderNumber}>Order #{item.order_details?.id || item.order}</Text>
            <Text style={styles.companyName}>{companyName}</Text>
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
          <Ionicons name="location-outline" size={16} color="#6B7280" />
          <Text style={styles.infoText} numberOfLines={2}>
            {address}
          </Text>
        </View>

        <View style={styles.infoRow}>
          <Ionicons name="time-outline" size={16} color="#6B7280" />
          <Text style={styles.infoText}>Completed: {completionTime}</Text>
        </View>

        {item.failure_reason ? (
          <View style={styles.failureBox}>
            <Text style={styles.failureLabel}>Failure Reason:</Text>
            <Text style={styles.failureText}>{item.failure_reason}</Text>
          </View>
        ) : null}

        {item.delivered_items && item.delivered_items.length > 0 && (
          <View style={styles.itemsContainer}>
            <Text style={styles.itemsHeader}>Delivered Quantities:</Text>
            {item.delivered_items.map(di => (
              <View key={di.id} style={styles.itemRow}>
                <Text style={styles.itemProductName}>{di.product_name}</Text>
                <Text style={styles.itemQty}>
                  {di.delivered_quantity} / {di.ordered_quantity} pcs
                </Text>
                {di.has_discrepancy && (
                  <View style={styles.discrepancyTag}>
                    <Text style={styles.discrepancyTagText}>Diff</Text>
                  </View>
                )}
              </View>
            ))}
          </View>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Delivery History</Text>
        <Text style={styles.headerSub}>Past fulfilled runs & reports</Text>
      </View>

      {/* Filter Chips */}
      <View style={styles.filterRow}>
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

      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#059669" />
          <Text style={styles.loadingText}>Loading history...</Text>
        </View>
      ) : filteredItems.length === 0 ? (
        <View style={styles.centerContainer}>
          <Ionicons name="archive-outline" size={54} color="#D1D5DB" />
          <Text style={styles.emptyTitle}>No Deliveries Found</Text>
          <Text style={styles.emptySub}>
            Completed and failed runs will be permanently archived here.
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredItems}
          keyExtractor={item => String(item.id)}
          renderItem={renderHistoryItem}
          contentContainerStyle={styles.listContainer}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={['#059669']}
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
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#FFFFFF',
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
  },
  activeFilterChip: {
    backgroundColor: '#059669',
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#4B5563',
  },
  activeFilterChipText: {
    color: '#FFFFFF',
  },
  listContainer: {
    padding: 16,
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
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#374151',
    marginTop: 14,
  },
  emptySub: {
    fontSize: 13,
    color: '#9CA3AF',
    textAlign: 'center',
    marginTop: 4,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
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
    paddingVertical: 3,
  },
  itemProductName: {
    fontSize: 13,
    color: '#374151',
    flex: 1,
  },
  itemQty: {
    fontSize: 13,
    fontWeight: '600',
    color: '#111827',
  },
  discrepancyTag: {
    marginLeft: 8,
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
