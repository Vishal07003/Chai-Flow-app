import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Linking,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import DeliveryHeader from '../../components/delivery/DeliveryHeader';
import EmptyState from '../../components/common/EmptyState';
import deliveryService, { BackendDelivery, PaginatedResponse } from '../../services/delivery.service';
import { colors, typography, radius, spacing, shadows } from '../../theme';

function getLocalTodayDateString(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export default function HomeScreen({ navigation }: any) {
  const [deliveries, setDeliveries] = useState<BackendDelivery[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchDeliveries = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);

      const res = await deliveryService.getDeliveries();
      let list: BackendDelivery[] = [];
      if (res && 'results' in res) {
        list = (res as PaginatedResponse<BackendDelivery>).results || [];
      } else if (Array.isArray(res)) {
        list = res;
      }
      setDeliveries(list);
    } catch (err: any) {
      console.log('Error fetching dashboard deliveries:', err);
      setError(err?.message || 'Failed to load deliveries. Please check your connection.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchDeliveries();
    }, [fetchDeliveries])
  );

  const handleRefresh = () => {
    fetchDeliveries(true);
  };

  const localToday = useMemo(() => getLocalTodayDateString(), []);

  // Compute stats across deliveries
  const stats = useMemo(() => {
    let pending = 0;
    let pickedUp = 0;
    let delivered = 0;
    let todayOrdersCount = 0;

    deliveries.forEach(d => {
      const st = d.status.toLowerCase();
      if (st === 'assigned' || st === 'pending' || st === 'accepted') pending++;
      else if (st === 'picked_up' || st === 'on_the_way') pickedUp++;
      else if (st === 'delivered') delivered++;

      const dateStr = d.order_details?.scheduled_delivery_date || (d.order_details?.created_at ? d.order_details.created_at.slice(0, 10) : '');
      if (dateStr === localToday) {
        todayOrdersCount++;
      }
    });

    return {
      total: deliveries.length,
      pending,
      pickedUp,
      delivered,
      today: todayOrdersCount,
    };
  }, [deliveries, localToday]);

  // Today's assigned orders list for dashboard preview
  const todayOrders = useMemo(() => {
    return deliveries.filter(d => {
      const dateStr = d.order_details?.scheduled_delivery_date || (d.order_details?.created_at ? d.order_details.created_at.slice(0, 10) : '');
      return dateStr === localToday;
    });
  }, [deliveries, localToday]);

  const handleCallCustomer = (phone?: string) => {
    if (!phone) {
      Alert.alert('Notice', 'Customer phone number not available.');
      return;
    }
    Linking.openURL(`tel:${phone}`).catch(() => {
      Alert.alert('Error', 'Unable to initiate phone call.');
    });
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <DeliveryHeader title="Delivery Dashboard" />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={['#8C331A']}
            tintColor="#8C331A"
          />
        }
      >
        {/* Useful Delivery Counts Grid (Warm Chai Brown Theme) */}
        <View style={styles.metricsGrid}>
          {/* Today's Orders */}
          <View style={[styles.metricCard, styles.metricCardPrimary]}>
            <View style={styles.metricHeaderRow}>
              <Ionicons name="calendar-outline" size={16} color="#8C331A" />
              <Text style={styles.metricLabelPrimary}>TODAY</Text>
            </View>
            <Text style={styles.metricValPrimary}>{stats.today}</Text>
          </View>

          {/* Pending */}
          <View style={styles.metricCard}>
            <View style={styles.metricHeaderRow}>
              <View style={[styles.statusDot, { backgroundColor: '#D97706' }]} />
              <Text style={styles.metricLabel}>PENDING</Text>
            </View>
            <Text style={[styles.metricVal, { color: '#B45309' }]}>{stats.pending}</Text>
          </View>

          {/* Picked Up */}
          <View style={styles.metricCard}>
            <View style={styles.metricHeaderRow}>
              <View style={[styles.statusDot, { backgroundColor: '#8C331A' }]} />
              <Text style={styles.metricLabel}>PICKED UP</Text>
            </View>
            <Text style={[styles.metricVal, { color: '#8C331A' }]}>{stats.pickedUp}</Text>
          </View>

          {/* Delivered */}
          <View style={styles.metricCard}>
            <View style={styles.metricHeaderRow}>
              <View style={[styles.statusDot, { backgroundColor: '#6B5E55' }]} />
              <Text style={styles.metricLabel}>DELIVERED</Text>
            </View>
            <Text style={[styles.metricVal, { color: '#6B5E55' }]}>{stats.delivered}</Text>
          </View>
        </View>

        {/* Section Header: Today's Assigned Orders */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Today's Assigned Orders ({todayOrders.length})</Text>
          <TouchableOpacity
            onPress={() => navigation.navigate('DeliveryOrders')}
            activeOpacity={0.7}
          >
            <Text style={styles.seeAllText}>View All</Text>
          </TouchableOpacity>
        </View>

        {loading && !refreshing ? (
          <View style={styles.stateContainer}>
            <ActivityIndicator size="large" color="#8C331A" />
            <Text style={styles.stateText}>Loading today's deliveries...</Text>
          </View>
        ) : error ? (
          <View style={styles.stateContainer}>
            <Ionicons name="alert-circle-outline" size={38} color="#DC2626" />
            <Text style={styles.errorTitle}>Unable to load deliveries</Text>
            <Text style={styles.errorSubtitle}>{error}</Text>
            <TouchableOpacity
              style={styles.retryBtn}
              onPress={() => fetchDeliveries()}
              activeOpacity={0.8}
            >
              <Text style={styles.retryBtnText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : todayOrders.length === 0 ? (
          <EmptyState
            icon="bicycle-outline"
            title="No Deliveries For Today"
            subtitle="You currently have no orders scheduled for today."
          />
        ) : (
          todayOrders.map(item => {
            const st = item.status.toLowerCase();
            const isPending = st === 'assigned' || st === 'pending' || st === 'accepted';
            const isPickedUp = st === 'picked_up' || st === 'on_the_way';
            const isDelivered = st === 'delivered';

            const orderNum = item.order_details?.order_number || `ORD-${item.order}`;
            const customerName = item.order_details?.customer_name || item.order_details?.company_name || 'Customer';
            const phone = item.order_details?.customer_phone;
            const address = item.order_details?.delivery_address || 'No address provided';

            return (
              <TouchableOpacity
                key={item.id}
                style={styles.orderCard}
                activeOpacity={0.88}
                onPress={() =>
                  navigation.navigate('OrderDetails', {
                    delivery: item,
                    deliveryId: item.id,
                    order: item.order_details,
                  })
                }
              >
                <View style={styles.cardTopRow}>
                  <Text style={styles.orderNumberText}>{orderNum}</Text>
                  <View
                    style={[
                      styles.statusPill,
                      isPending && styles.pillPending,
                      isPickedUp && styles.pillPickedUp,
                      isDelivered && styles.pillDelivered,
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusPillText,
                        isPending && styles.pillTextPending,
                        isPickedUp && styles.pillTextPickedUp,
                        isDelivered && styles.pillTextDelivered,
                      ]}
                    >
                      {isPending ? 'Pending' : isPickedUp ? 'Picked Up' : 'Delivered'}
                    </Text>
                  </View>
                </View>

                <Text style={styles.customerNameText}>{customerName}</Text>

                {/* Customer Address (Readable Text Only - No Map Embed) */}
                <View style={styles.addressRow}>
                  <Ionicons name="location-outline" size={14} color="#6B5E55" />
                  <Text style={styles.addressText} numberOfLines={2}>
                    {address}
                  </Text>
                </View>

                {/* Footer with Call Action and Details */}
                <View style={styles.cardFooter}>
                  {phone ? (
                    <TouchableOpacity
                      style={styles.callButton}
                      onPress={() => handleCallCustomer(phone)}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="call" size={13} color="#8C331A" />
                      <Text style={styles.callButtonText}>Call Customer</Text>
                    </TouchableOpacity>
                  ) : (
                    <View />
                  )}

                  <View style={styles.detailsRow}>
                    <Text style={styles.detailsText}>Order Details</Text>
                    <Ionicons name="chevron-forward" size={14} color="#8C331A" />
                  </View>
                </View>
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7F8FA',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 24,
  },
  metricsGrid: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 20,
  },
  metricCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: radius.md,
    padding: 10,
    borderWidth: 1,
    borderColor: '#E8EDF2',
    ...shadows.sm,
  },
  metricCardPrimary: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E8EDF2',
  },
  metricHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  metricLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: '#718096',
  },
  metricLabelPrimary: {
    fontSize: 9,
    fontWeight: '800',
    color: '#8C331A',
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  metricVal: {
    fontSize: 16,
    fontWeight: '800',
    color: '#253247',
  },
  metricValPrimary: {
    fontSize: 16,
    fontWeight: '800',
    color: '#8C331A',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#253247',
  },
  seeAllText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#8C331A',
  },
  stateContainer: {
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stateText: {
    fontSize: 13,
    color: '#718096',
    marginTop: 10,
  },
  errorTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#253247',
    marginTop: 10,
  },
  errorSubtitle: {
    fontSize: 12,
    color: '#718096',
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 12,
  },
  retryBtn: {
    backgroundColor: '#8C331A',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: radius.md,
  },
  retryBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 12,
  },
  orderCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: radius.lg,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E8EDF2',
    ...shadows.sm,
  },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  orderNumberText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#253247',
  },
  statusPill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radius.full,
    borderWidth: 1,
  },
  pillPending: {
    backgroundColor: '#FEF3C7',
    borderColor: '#FDE68A',
  },
  pillPickedUp: {
    backgroundColor: '#EFF6FF',
    borderColor: '#BFDBFE',
  },
  pillDelivered: {
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0',
  },
  statusPillText: {
    fontSize: 10,
    fontWeight: '700',
  },
  pillTextPending: {
    color: '#92400E',
  },
  pillTextPickedUp: {
    color: '#1D4ED8',
  },
  pillTextDelivered: {
    color: '#047857',
  },
  customerNameText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#253247',
    marginBottom: 4,
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
    marginBottom: 8,
  },
  addressText: {
    fontSize: 12,
    color: '#718096',
    flex: 1,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F7F8FA',
  },
  callButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: radius.sm,
    backgroundColor: '#F7F8FA',
    borderWidth: 1,
    borderColor: '#E8EDF2',
  },
  callButtonText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#8C331A',
  },
  detailsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  detailsText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#8C331A',
  },
});
