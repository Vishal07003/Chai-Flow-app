import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import DeliveryHeader from '../../components/delivery/DeliveryHeader';
import StatusCard from '../../components/delivery/StatusCard';
import MapCard from '../../components/delivery/MapCard';
import OrderCard, { DeliveryOrder } from '../../components/delivery/OrderCard';
import EmptyState from '../../components/common/EmptyState';
import deliveryService, { BackendDelivery } from '../../services/delivery.service';

/**
 * Format timestamp or ISO date to display time/slot string
 */
function formatDeliveryTimeSlot(dateStr?: string | null): string {
  if (!dateStr) return 'Morning Shift • 07:00 AM';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return 'Morning Shift • 07:00 AM';
    return d.toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
      timeZone: 'Asia/Kolkata',
    });
  } catch {
    return 'Morning Shift • 07:00 AM';
  }
}

/**
 * Maps BackendDelivery to the UI model expected by OrderCard
 */
function mapBackendDeliveryToUI(
  delivery: BackendDelivery,
  index: number
): DeliveryOrder {
  const orderDetails = delivery.order_details;

  // Determine items description
  let itemsDesc = 'Delivery Package';
  if (orderDetails?.items && orderDetails.items.length > 0) {
    itemsDesc = orderDetails.items
      .map(i => `${i.quantity}x ${i.product_details?.name || 'Item'}`)
      .join(' • ');
  }

  // Parse amount
  const amount = orderDetails?.total_amount
    ? parseFloat(orderDetails.total_amount) || 0
    : 0;

  // Map backend status to DeliveryOrder status ('PENDING' | 'EN_ROUTE' | 'DELIVERED' | 'FAILED')
  let uiStatus: 'PENDING' | 'EN_ROUTE' | 'DELIVERED' | 'FAILED' = 'PENDING';
  if (delivery.status === 'delivered') {
    uiStatus = 'DELIVERED';
  } else if (delivery.status === 'failed') {
    uiStatus = 'FAILED';
  } else if (delivery.status === 'on_the_way' || delivery.status === 'picked_up') {
    uiStatus = 'EN_ROUTE';
  } else {
    // 'assigned', 'accepted'
    uiStatus = 'PENDING';
  }

  const customerName =
    orderDetails?.company_name || orderDetails?.customer_name || 'Counter Order';

  const phone = orderDetails?.customer_phone || '';
  const address = orderDetails?.delivery_address || 'Shop delivery';
  const timeSlot = formatDeliveryTimeSlot(delivery.updated_at || orderDetails?.created_at);

  return {
    id: String(delivery.id),
    sequence: index + 1,
    customerName,
    phone,
    address,
    items: itemsDesc,
    amount,
    paymentMode: 'COD',
    status: uiStatus,
    timeSlot,
  };
}

export default function HomeScreen({ navigation }: any) {
  const [dutyStatus, setDutyStatus] = useState<'ON_DUTY' | 'EN_ROUTE' | 'OFF_DUTY'>('ON_DUTY');
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

      const data = await deliveryService.getDeliveries();
      setDeliveries(Array.isArray(data) ? data : []);
    } catch (err: any) {
      console.log('Error fetching dashboard deliveries:', err);
      setError(err?.message || 'Failed to load deliveries. Please check your connection.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Fetch when screen focuses or becomes active
  useFocusEffect(
    useCallback(() => {
      fetchDeliveries();
    }, [fetchDeliveries])
  );

  const handleRefresh = () => {
    fetchDeliveries(true);
  };

  // Map deliveries to UI order models
  const mappedOrders: DeliveryOrder[] = deliveries.map((d, idx) =>
    mapBackendDeliveryToUI(d, idx)
  );

  // Completed stops count based on backend status
  const completedCount = deliveries.filter(d => d.status === 'delivered').length;
  const totalStops = deliveries.length;

  // Active / next destination address (first non-terminal delivery)
  const nextActiveDelivery = deliveries.find(
    d => d.status !== 'delivered' && d.status !== 'failed'
  );
  const nextDestinationAddress =
    nextActiveDelivery?.order_details?.delivery_address || 'No active route';

  // Automatically sync duty status display if active deliveries exist
  const effectiveDutyStatus: 'ON_DUTY' | 'EN_ROUTE' | 'OFF_DUTY' =
    dutyStatus === 'OFF_DUTY'
      ? 'OFF_DUTY'
      : deliveries.some(d => d.status === 'on_the_way')
        ? 'EN_ROUTE'
        : dutyStatus;

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
            colors={['#059669']}
            tintColor="#059669"
          />
        }
      >
        <StatusCard
          dutyStatus={effectiveDutyStatus}
          onToggleDuty={status => setDutyStatus(status)}
          completedStops={completedCount}
          totalStops={totalStops}
        />

        <MapCard
          destinationAddress={nextDestinationAddress}
          onPressStartNav={() => navigation.navigate('Navigation')}
        />

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Today's Assigned Runs</Text>
          <TouchableOpacity
            onPress={() => {
              // Navigate to DeliveryOrders tab in BottomTabs
              navigation.navigate('DeliveryOrders');
            }}
          >
            <Text style={styles.seeAllText}>View All ({deliveries.length})</Text>
          </TouchableOpacity>
        </View>

        {loading && !refreshing ? (
          <View style={styles.stateContainer}>
            <ActivityIndicator size="large" color="#059669" />
            <Text style={styles.stateText}>Loading today's deliveries...</Text>
          </View>
        ) : error ? (
          <View style={styles.stateContainer}>
            <Ionicons name="alert-circle-outline" size={40} color="#EF4444" />
            <Text style={styles.errorTitle}>Unable to load deliveries</Text>
            <Text style={styles.errorSubtitle}>{error}</Text>
            <TouchableOpacity
              style={styles.retryBtn}
              onPress={() => fetchDeliveries()}
              activeOpacity={0.8}
            >
              <Ionicons name="refresh" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
              <Text style={styles.retryBtnText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : mappedOrders.length === 0 ? (
          <EmptyState
            icon="bicycle-outline"
            title="No Deliveries Assigned"
            subtitle="You have no assigned deliveries for today yet."
          />
        ) : (
          mappedOrders.map((order, index) => {
            const rawDelivery = deliveries[index];
            return (
              <OrderCard
                key={order.id}
                order={order}
                onPress={() =>
                  navigation.navigate('OrderDetails', {
                    order,
                    deliveryId: rawDelivery?.id,
                    delivery: rawDelivery,
                  })
                }
              />
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
    backgroundColor: '#FAF8F5',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    marginTop: 6,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#111827',
  },
  seeAllText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#059669',
  },
  stateContainer: {
    paddingVertical: 36,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#EFECE8',
    marginTop: 4,
    marginBottom: 16,
  },
  stateText: {
    marginTop: 12,
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '600',
  },
  errorTitle: {
    marginTop: 10,
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
  },
  errorSubtitle: {
    marginTop: 4,
    fontSize: 13,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 16,
  },
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#059669',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
});
