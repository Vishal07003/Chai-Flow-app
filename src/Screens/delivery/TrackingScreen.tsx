import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Linking,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';
import deliveryService, { BackendDelivery } from '../../services/delivery.service';
import locationTrackingService from '../../services/location.service';

export default function TrackingScreen() {
  const [activeDeliveries, setActiveDeliveries] = useState<BackendDelivery[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isTrackingActive, setIsTrackingActive] = useState(false);

  const fetchActiveDeliveries = useCallback(async () => {
    try {
      setLoading(true);
      const data = await deliveryService.getDeliveries();
      // Filter runs that are in progress or accepted
      const inProgress = (data || []).filter(d =>
        ['accepted', 'picked_up', 'on_the_way'].includes(d.status)
      );
      setActiveDeliveries(inProgress);

      const activeTrackedId = locationTrackingService.getActiveTrackingDeliveryId();
      const status = await locationTrackingService.getTrackingStatus();
      setIsTrackingActive(!!activeTrackedId || status.isActive);
    } catch (err) {
      console.log('Error fetching active tracking deliveries:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchActiveDeliveries();
  }, [fetchActiveDeliveries]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchActiveDeliveries();
  };

  const handleOpenNavigation = (address: string) => {
    const query = encodeURIComponent(address || 'Client Address');
    const url = Platform.select({
      ios: `maps:0,0?q=${query}`,
      android: `geo:0,0?q=${query}`,
    }) || `https://www.google.com/maps/search/?api=1&query=${query}`;

    Linking.openURL(url).catch(() => {
      Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${query}`);
    });
  };

  const renderActiveDelivery = ({ item }: { item: BackendDelivery }) => {
    const company = item.order_details?.company_name || 'Walk-in Delivery';
    const address = item.order_details?.delivery_address || 'Address not provided';
    const isOnTheWay = item.status === 'on_the_way';

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={{ flex: 1 }}>
            <Text style={styles.orderTitle}>Order #{item.order_details?.id || item.order}</Text>
            <Text style={styles.companyTitle}>{company}</Text>
          </View>
          <View
            style={[
              styles.statusTag,
              isOnTheWay ? styles.onTheWayTag : styles.activeTag,
            ]}
          >
            <Ionicons
              name={isOnTheWay ? 'navigate' : 'time'}
              size={12}
              color={isOnTheWay ? '#059669' : '#D97706'}
            />
            <Text
              style={[
                styles.statusTagText,
                { color: isOnTheWay ? '#059669' : '#D97706' },
              ]}
            >
              {item.status.replace('_', ' ').toUpperCase()}
            </Text>
          </View>
        </View>

        <View style={styles.addressBox}>
          <Ionicons name="location" size={18} color="#059669" />
          <Text style={styles.addressText}>{address}</Text>
        </View>

        {item.current_lat && item.current_lng ? (
          <View style={styles.gpsRow}>
            <Ionicons name="radio" size={14} color="#059669" />
            <Text style={styles.gpsText}>
              Last GPS: {item.current_lat.toFixed(4)}, {item.current_lng.toFixed(4)}
            </Text>
          </View>
        ) : (
          <View style={styles.gpsRow}>
            <Ionicons name="radio-outline" size={14} color="#9CA3AF" />
            <Text style={styles.noGpsText}>Awaiting first GPS coordinate ping</Text>
          </View>
        )}

        <View style={styles.actionRow}>
          <TouchableOpacity
            style={styles.navBtn}
            onPress={() => handleOpenNavigation(address)}
          >
            <Ionicons name="map-outline" size={16} color="#FFFFFF" />
            <Text style={styles.navBtnText}>Open Turn-by-Turn GPS</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      {/* Header */}
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Active Delivery Tracking</Text>
          <Text style={styles.headerSub}>Live GPS updates and destination routes</Text>
        </View>
        <View style={[styles.trackingPill, isTrackingActive ? styles.trackingOn : styles.trackingOff]}>
          <View style={[styles.pulseDot, isTrackingActive ? styles.pulseOn : styles.pulseOff]} />
          <Text style={[styles.trackingPillText, isTrackingActive ? styles.textOn : styles.textOff]}>
            {isTrackingActive ? 'GPS ACTIVE' : 'GPS STANDBY'}
          </Text>
        </View>
      </View>

      {/* Info Notice */}
      <View style={styles.noticeBar}>
        <Ionicons name="shield-checkmark-outline" size={18} color="#065F46" />
        <Text style={styles.noticeText}>
          GPS location transmits exclusively during "On The Way" deliveries and immediately terminates upon completion.
        </Text>
      </View>

      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#059669" />
          <Text style={styles.loadingText}>Fetching routes...</Text>
        </View>
      ) : activeDeliveries.length === 0 ? (
        <View style={styles.centerContainer}>
          <Ionicons name="navigate-circle-outline" size={60} color="#D1D5DB" />
          <Text style={styles.emptyTitle}>No In-Transit Runs</Text>
          <Text style={styles.emptySub}>
            When an assigned delivery enters "On The Way", active route guidance and live tracking appear here.
          </Text>
        </View>
      ) : (
        <FlatList
          data={activeDeliveries}
          keyExtractor={item => String(item.id)}
          renderItem={renderActiveDelivery}
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
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#EFEAE4',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1F2937',
  },
  headerSub: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  trackingPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 6,
  },
  trackingOn: {
    backgroundColor: '#ECFDF5',
  },
  trackingOff: {
    backgroundColor: '#F3F4F6',
  },
  pulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  pulseOn: {
    backgroundColor: '#059669',
  },
  pulseOff: {
    backgroundColor: '#9CA3AF',
  },
  trackingPillText: {
    fontSize: 10,
    fontWeight: '800',
  },
  textOn: {
    color: '#059669',
  },
  textOff: {
    color: '#6B7280',
  },
  noticeBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 10,
    gap: 8,
  },
  noticeText: {
    flex: 1,
    fontSize: 12,
    color: '#065F46',
    fontWeight: '500',
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
    lineHeight: 18,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  orderTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#111827',
  },
  companyTitle: {
    fontSize: 13,
    color: '#4B5563',
    fontWeight: '600',
    marginTop: 2,
  },
  statusTag: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
  },
  onTheWayTag: {
    backgroundColor: '#ECFDF5',
  },
  activeTag: {
    backgroundColor: '#FEF3C7',
  },
  statusTagText: {
    fontSize: 11,
    fontWeight: '800',
  },
  addressBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#F9FAFB',
    padding: 10,
    borderRadius: 8,
    gap: 8,
    marginBottom: 10,
  },
  addressText: {
    flex: 1,
    fontSize: 13,
    color: '#374151',
    fontWeight: '500',
  },
  gpsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
  },
  gpsText: {
    fontSize: 12,
    color: '#059669',
    fontWeight: '600',
  },
  noGpsText: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  actionRow: {
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    paddingTop: 10,
  },
  navBtn: {
    backgroundColor: '#059669',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6,
  },
  navBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
});
