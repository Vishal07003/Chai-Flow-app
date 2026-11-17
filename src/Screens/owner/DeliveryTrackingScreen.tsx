import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';
import deliveryService, { BackendDelivery } from '../../services/delivery.service';

interface OwnerDeliveryTrackingProps {
  route: {
    params: {
      deliveryId: number | string;
    };
  };
  navigation: any;
}

export default function OwnerDeliveryTrackingScreen({ route, navigation }: OwnerDeliveryTrackingProps) {
  const { deliveryId } = route.params || {};

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [trackingData, setTrackingData] = useState<any>(null);

  const fetchTracking = useCallback(async () => {
    if (!deliveryId) return;
    try {
      setLoading(true);
      const data = await deliveryService.getTrackingHistory(deliveryId);
      setTrackingData(data);
    } catch (err) {
      console.log('Failed to fetch tracking history:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [deliveryId]);

  useEffect(() => {
    fetchTracking();
  }, [fetchTracking]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchTracking();
  };

  const getStatusColor = (st: string) => {
    switch (st) {
      case 'on_the_way':
        return '#059669';
      case 'delivered':
        return '#2563EB';
      case 'failed':
        return '#DC2626';
      case 'picked_up':
      case 'accepted':
        return '#D97706';
      default:
        return '#6B7280';
    }
  };

  // Determine if location ping is fresh (within 3 minutes) or stale
  const isLocationFresh = (isoTime?: string) => {
    if (!isoTime) return false;
    const diffSeconds = (new Date().getTime() - new Date(isoTime).getTime()) / 1000;
    return diffSeconds < 180;
  };

  const handleOpenCoordinates = (lat: number, lng: number) => {
    Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${lat},${lng}`).catch(() => {});
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={22} color="#111827" />
        </TouchableOpacity>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={styles.headerTitle}>Live Trip & Audit Log</Text>
          <Text style={styles.headerSub}>Delivery #{deliveryId}</Text>
        </View>
        <TouchableOpacity style={styles.refreshIconBtn} onPress={onRefresh}>
          <Ionicons name="refresh" size={20} color="#8C331A" />
        </TouchableOpacity>
      </View>

      {loading && !trackingData ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#8C331A" />
          <Text style={styles.loadingText}>Fetching live coordinates & history...</Text>
        </View>
      ) : !trackingData ? (
        <View style={styles.centerContainer}>
          <Ionicons name="alert-circle-outline" size={48} color="#9CA3AF" />
          <Text style={styles.emptyTitle}>Delivery Not Found</Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#8C331A']} />
          }
        >
          {/* Driver & Status Banner */}
          <View style={styles.statusCard}>
            <View style={styles.statusRow}>
              <View>
                <Text style={styles.driverLabel}>ASSIGNED PARTNER</Text>
                <Text style={styles.driverName}>
                  {trackingData.driver?.name || 'Unassigned / Not Picked'}
                </Text>
                {trackingData.driver?.phone ? (
                  <Text style={styles.driverPhone}>📞 {trackingData.driver.phone}</Text>
                ) : null}
              </View>
              <View
                style={[
                  styles.statusBadge,
                  { backgroundColor: `${getStatusColor(trackingData.status)}15` },
                ]}
              >
                <Text
                  style={[
                    styles.statusBadgeText,
                    { color: getStatusColor(trackingData.status) },
                  ]}
                >
                  {trackingData.status.replace('_', ' ').toUpperCase()}
                </Text>
              </View>
            </View>
          </View>

          {/* GPS Coordinates Section (Strictly Real - No Mock) */}
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeaderRow}>
              <Ionicons name="locate" size={20} color="#8C331A" />
              <Text style={styles.sectionTitle}>Latest GPS Coordinates</Text>
            </View>

            {trackingData.current_lat && trackingData.current_lng ? (
              <View style={styles.gpsContainer}>
                <View style={styles.gpsPillRow}>
                  <View
                    style={[
                      styles.indicatorDot,
                      isLocationFresh(trackingData.updated_at)
                        ? styles.liveDot
                        : styles.staleDot,
                    ]}
                  />
                  <Text
                    style={[
                      styles.indicatorText,
                      isLocationFresh(trackingData.updated_at)
                        ? styles.liveText
                        : styles.staleText,
                    ]}
                  >
                    {isLocationFresh(trackingData.updated_at)
                      ? 'LIVE LOCATION (Active)'
                      : 'STALE LOCATION (> 3 mins ago)'}
                  </Text>
                </View>

                <View style={styles.coordsBox}>
                  <Text style={styles.coordsValue}>
                    {trackingData.current_lat.toFixed(6)}, {trackingData.current_lng.toFixed(6)}
                  </Text>
                  <Text style={styles.timestampValue}>
                    Last pinged: {new Date(trackingData.updated_at).toLocaleTimeString('en-IN')}
                  </Text>
                </View>

                <TouchableOpacity
                  style={styles.mapActionBtn}
                  onPress={() =>
                    handleOpenCoordinates(trackingData.current_lat, trackingData.current_lng)
                  }
                >
                  <Ionicons name="map-outline" size={16} color="#FFFFFF" />
                  <Text style={styles.mapActionText}>View on External Map</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.noCoordsBox}>
                <Ionicons name="radio-outline" size={24} color="#9CA3AF" />
                <Text style={styles.noCoordsTitle}>No GPS Coordinates Recorded</Text>
                <Text style={styles.noCoordsSub}>
                  Coordinates are captured only while delivery is active in "On The Way" status.
                </Text>
              </View>
            )}
          </View>

          {/* Location History Breadcrumbs */}
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeaderRow}>
              <Ionicons name="trail-sign-outline" size={20} color="#8C331A" />
              <Text style={styles.sectionTitle}>Recent GPS Breadcrumbs ({trackingData.location_logs?.length || 0})</Text>
            </View>

            {trackingData.location_logs && trackingData.location_logs.length > 0 ? (
              <View style={styles.logsList}>
                {trackingData.location_logs.map((log: any, idx: number) => (
                  <View key={log.id || idx} style={styles.logRow}>
                    <View style={styles.logDot} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.logCoords}>
                        {log.latitude.toFixed(5)}, {log.longitude.toFixed(5)}
                      </Text>
                      <Text style={styles.logTime}>
                        {new Date(log.recorded_at).toLocaleTimeString('en-IN', {
                          hour: '2-digit',
                          minute: '2-digit',
                          second: '2-digit',
                        })}
                        {log.speed ? ` • ${log.speed.toFixed(1)} km/h` : ''}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            ) : (
              <Text style={styles.emptyListText}>No route breadcrumbs logged yet.</Text>
            )}
          </View>

          {/* Status Timeline History */}
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeaderRow}>
              <Ionicons name="git-commit-outline" size={20} color="#8C331A" />
              <Text style={styles.sectionTitle}>Status Transition Timeline</Text>
            </View>

            {trackingData.status_history && trackingData.status_history.length > 0 ? (
              <View style={styles.timelineList}>
                {trackingData.status_history.map((hist: any, idx: number) => (
                  <View key={hist.id || idx} style={styles.timelineItem}>
                    <View style={styles.timelineIconWrapper}>
                      <Ionicons name="checkmark-circle" size={16} color="#059669" />
                      {idx < trackingData.status_history.length - 1 && (
                        <View style={styles.timelineLine} />
                      )}
                    </View>
                    <View style={styles.timelineContent}>
                      <Text style={styles.timelineTitle}>
                        {hist.to_status.replace('_', ' ').toUpperCase()}
                      </Text>
                      <Text style={styles.timelineMeta}>
                        Changed by {hist.changed_by_name || 'System'} at{' '}
                        {new Date(hist.created_at).toLocaleTimeString('en-IN', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </Text>
                      {hist.notes ? (
                        <Text style={styles.timelineNotes}>Note: {hist.notes}</Text>
                      ) : null}
                    </View>
                  </View>
                ))}
              </View>
            ) : (
              <Text style={styles.emptyListText}>Initial status assigned. Awaiting driver progression.</Text>
            )}
          </View>
        </ScrollView>
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
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#EFEAE4',
  },
  backBtn: {
    padding: 6,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#111827',
  },
  headerSub: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  refreshIconBtn: {
    padding: 6,
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
    fontSize: 16,
    fontWeight: '700',
    color: '#4B5563',
    marginTop: 10,
  },
  scrollContent: {
    padding: 16,
    gap: 14,
  },
  statusCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#EFECE8',
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  driverLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#9CA3AF',
    letterSpacing: 0.5,
  },
  driverName: {
    fontSize: 16,
    fontWeight: '800',
    color: '#111827',
    marginTop: 2,
  },
  driverPhone: {
    fontSize: 12,
    color: '#4B5563',
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '800',
  },
  sectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#EFECE8',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1F2937',
  },
  gpsContainer: {
    gap: 12,
  },
  gpsPillRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  indicatorDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  liveDot: {
    backgroundColor: '#059669',
  },
  staleDot: {
    backgroundColor: '#D97706',
  },
  indicatorText: {
    fontSize: 11,
    fontWeight: '800',
  },
  liveText: {
    color: '#059669',
  },
  staleText: {
    color: '#D97706',
  },
  coordsBox: {
    backgroundColor: '#F9FAFB',
    borderRadius: 10,
    padding: 12,
  },
  coordsValue: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
    fontFamily: 'monospace',
  },
  timestampValue: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
  },
  mapActionBtn: {
    backgroundColor: '#8C331A',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6,
  },
  mapActionText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
  noCoordsBox: {
    alignItems: 'center',
    paddingVertical: 16,
    backgroundColor: '#F9FAFB',
    borderRadius: 10,
    paddingHorizontal: 16,
  },
  noCoordsTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#4B5563',
    marginTop: 6,
  },
  noCoordsSub: {
    fontSize: 12,
    color: '#9CA3AF',
    textAlign: 'center',
    marginTop: 2,
  },
  logsList: {
    gap: 10,
  },
  logRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 4,
  },
  logDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#8C331A',
  },
  logCoords: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
    fontFamily: 'monospace',
  },
  logTime: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 2,
  },
  emptyListText: {
    fontSize: 13,
    color: '#9CA3AF',
    fontStyle: 'italic',
  },
  timelineList: {
    gap: 0,
  },
  timelineItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    minHeight: 48,
  },
  timelineIconWrapper: {
    alignItems: 'center',
    width: 16,
  },
  timelineLine: {
    width: 2,
    flex: 1,
    backgroundColor: '#E5E7EB',
    marginVertical: 4,
  },
  timelineContent: {
    flex: 1,
    paddingBottom: 16,
  },
  timelineTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#111827',
  },
  timelineMeta: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 2,
  },
  timelineNotes: {
    fontSize: 12,
    color: '#374151',
    marginTop: 4,
    fontStyle: 'italic',
  },
});

