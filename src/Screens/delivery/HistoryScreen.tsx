import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
import Header from '../../components/common/Header';
import SearchBar from '../../components/common/SearchBar';
import EmptyState from '../../components/common/EmptyState';
import PaginationControl from '../../components/common/PaginationControl';
import deliveryService, { BackendDelivery, PaginatedResponse } from '../../services/delivery.service';
import { colors, typography, radius, spacing, shadows } from '../../theme';

type HistoryStatusFilter = 'all' | 'delivered' | 'failed';

export default function DeliveryHistoryScreen({ navigation }: any) {
  const [historyList, setHistoryList] = useState<BackendDelivery[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filterStatus, setFilterStatus] = useState<HistoryStatusFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [totalRecords, setTotalRecords] = useState(0);

  const fetchHistory = useCallback(async () => {
    try {
      setLoading(true);
      const res = await deliveryService.getDeliveries({
        status: 'history',
        page: currentPage,
        page_size: pageSize,
      });

      if (res && 'results' in res) {
        const paginated = res as PaginatedResponse<BackendDelivery>;
        setHistoryList(paginated.results || []);
        setTotalRecords(paginated.count || 0);
      } else if (Array.isArray(res)) {
        setHistoryList(res);
        setTotalRecords(res.length);
      } else {
        setHistoryList([]);
        setTotalRecords(0);
      }
    } catch (err) {
      console.log('Failed to fetch delivery history:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [currentPage, pageSize]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchHistory();
  };

  // Filtered deliveries list according to status chips and search query
  const filteredItems = useMemo(() => {
    return historyList.filter(d => {
      // 1. Status filter
      if (filterStatus !== 'all' && d.status.toLowerCase() !== filterStatus) {
        return false;
      }

      // 2. Search query filter
      if (searchQuery.trim()) {
        const query = searchQuery.trim().toLowerCase();
        const orderIdStr = String(d.order_details?.order_number || d.order_details?.id || d.order || '').toLowerCase();
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
  }, [historyList, filterStatus, searchQuery]);

  const totalPages = Math.max(1, Math.ceil(totalRecords / pageSize));

  const renderHistoryCard = ({ item }: { item: BackendDelivery }) => {
    const isDelivered = item.status.toLowerCase() === 'delivered';
    const orderNum = item.order_details?.order_number || `ORD-${item.order}`;
    const customer = item.order_details?.customer_name || item.order_details?.company_name || 'Customer';
    const address = item.order_details?.delivery_address || 'No address';

    const deliveredDate = item.delivered_time
      ? new Date(item.delivered_time).toLocaleDateString('en-IN', {
          day: 'numeric',
          month: 'short',
          hour: '2-digit',
          minute: '2-digit',
        })
      : item.updated_at
      ? new Date(item.updated_at).toLocaleDateString('en-IN')
      : 'Completed';

    return (
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.85}
        onPress={() =>
          navigation?.navigate('OrderDetails', {
            delivery: item,
            deliveryId: item.id,
            order: item.order_details,
          })
        }
      >
        <View style={styles.cardHeader}>
          <View style={styles.orderTitleRow}>
            <Ionicons name="receipt-outline" size={15} color={colors.primary} />
            <Text style={styles.orderNumberText}>{orderNum}</Text>
          </View>

          <View style={[styles.statusBadge, isDelivered ? styles.badgeDelivered : styles.badgeFailed]}>
            <Text style={[styles.statusBadgeText, isDelivered ? styles.badgeTextDelivered : styles.badgeTextFailed]}>
              {isDelivered ? 'Delivered' : 'Failed'}
            </Text>
          </View>
        </View>

        <Text style={styles.customerNameText}>{customer}</Text>

        <View style={styles.metaRow}>
          <Ionicons name="location-outline" size={13} color={colors.textSecondary} />
          <Text style={styles.metaText} numberOfLines={1}>
            {address}
          </Text>
        </View>

        <View style={styles.cardFooter}>
          <View style={styles.metaRow}>
            <Ionicons name="checkmark-done" size={13} color={colors.textMuted} />
            <Text style={styles.dateText}>{deliveredDate}</Text>
          </View>

          <View style={styles.viewLinkRow}>
            <Text style={styles.viewLinkText}>Details</Text>
            <Ionicons name="chevron-forward" size={13} color={colors.primary} />
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Header title="Delivery History" showBack={false} />

      {/* Search Header */}
      <View style={styles.searchContainer}>
        <SearchBar
          value={searchQuery}
          onChangeText={text => {
            setSearchQuery(text);
            setCurrentPage(1);
          }}
          placeholder="Search by order #, customer, address..."
          containerStyle={{ marginVertical: 0, marginBottom: 8 }}
        />

        {/* Status Filters */}
        <View style={styles.filterRow}>
          {(['all', 'delivered', 'failed'] as HistoryStatusFilter[]).map(st => {
            const isActive = filterStatus === st;
            return (
              <TouchableOpacity
                key={st}
                style={[styles.filterChip, isActive && styles.filterChipActive]}
                onPress={() => {
                  setFilterStatus(st);
                  setCurrentPage(1);
                }}
                activeOpacity={0.7}
              >
                <Text style={[styles.filterChipText, isActive && styles.filterChipTextActive]}>
                  {st.charAt(0).toUpperCase() + st.slice(1)}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Main List */}
      {loading && !refreshing ? (
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading completed deliveries...</Text>
        </View>
      ) : filteredItems.length === 0 ? (
        <EmptyState
          icon="time-outline"
          title="No Delivery History"
          subtitle={
            searchQuery
              ? 'No historical deliveries matched your search.'
              : 'You have not completed any deliveries yet.'
          }
        />
      ) : (
        <FlatList
          data={filteredItems}
          keyExtractor={item => String(item.id)}
          renderItem={renderHistoryCard}
          contentContainerStyle={styles.listContent}
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
              onPageChange={setCurrentPage}
              onPageSizeChange={size => {
                setPageSize(size);
                setCurrentPage(1);
              }}
              isLoading={loading}
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
  searchContainer: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
  },
  filterChip: {
    flex: 1,
    paddingVertical: 6,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  filterChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  filterChipTextActive: {
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
    color: colors.textSecondary,
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
    borderColor: colors.border,
    ...shadows.sm,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  orderTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  orderNumberText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  statusBadge: {
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: radius.full,
    borderWidth: 1,
  },
  badgeDelivered: {
    backgroundColor: '#D1FAE5',
    borderColor: '#A7F3D0',
  },
  badgeFailed: {
    backgroundColor: '#FEE2E2',
    borderColor: '#FECACA',
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  badgeTextDelivered: {
    color: '#047857',
  },
  badgeTextFailed: {
    color: '#B91C1C',
  },
  customerNameText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 4,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  metaText: {
    fontSize: 12,
    color: colors.textSecondary,
    flex: 1,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
    marginTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.surface,
  },
  dateText: {
    fontSize: 11,
    color: colors.textMuted,
  },
  viewLinkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  viewLinkText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
  },
});
