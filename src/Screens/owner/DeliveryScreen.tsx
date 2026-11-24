import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Linking,
  ScrollView,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useNavigation } from '@react-navigation/native';

import Header from '../../components/common/Header';
import SearchBar from '../../components/common/SearchBar';
import FleetMap from '../../components/delivery/FleetMap';
import DeliveryBoyCard from '../../components/delivery/DeliveryBoyCard';
import DeliveryBoyDetailModal from '../../components/delivery/DeliveryBoyDetailModal';
import FloatingButton from '../../components/common/FloatingButton';
import EmptyState from '../../components/common/EmptyState';
import { useApp, DeliveryBoyItem } from '../../context/AppContext';
import deliveryService, { DeliveryPartnerProfile } from '../../services/delivery.service';
import { colors, typography, radius, spacing, shadows } from '../../theme';

const STATUS_FILTERS = ['All', 'Available', 'Busy', 'Offline'] as const;

export default function DeliveryScreen() {
  const navigation = useNavigation<any>();
  const {
    deliveryBoys,
    deleteDeliveryBoy,
    refreshBackendData,
  } = useApp();

  const [partners, setPartners] = useState<DeliveryPartnerProfile[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedFilter, setSelectedFilter] = useState<'All' | 'Available' | 'Busy' | 'Offline'>('All');

  const [selectedBoy, setSelectedBoy] = useState<DeliveryBoyItem | null>(null);
  const [isDetailModalVisible, setIsDetailModalVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  // Fetch actual backend partners directly for complete real-time sync
  const fetchPartners = useCallback(async () => {
    try {
      setLoading(true);
      const res = await deliveryService.getDeliveryPartners();
      setPartners(res || []);
    } catch (err) {
      console.log('Error loading delivery partners:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Focus-based auto-refresh
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      refreshBackendData();
      fetchPartners();
    });
    return unsubscribe;
  }, [navigation, refreshBackendData, fetchPartners]);

  useEffect(() => {
    fetchPartners();
  }, [fetchPartners]);

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([refreshBackendData(), fetchPartners()]);
    setRefreshing(false);
  };

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 2500);
  };

  const handleOpenDetailModal = (boy: DeliveryBoyItem) => {
    setSelectedBoy(boy);
    setIsDetailModalVisible(true);
  };

  const handleDeleteBoy = (boy: DeliveryBoyItem) => {
    deleteDeliveryBoy(boy.id);
    triggerToast(`Partner ${boy.name} removed from fleet.`);
    fetchPartners();
  };

  const handleMessage = (boy: any) => {
    const phone = boy.phone || '';
    if (!phone) {
      triggerToast('Mobile number not available');
      return;
    }
    const text = encodeURIComponent(`Hi ${boy.name}, regarding ChaiFlow delivery run:`);
    Linking.openURL(`whatsapp://send?phone=${phone}&text=${text}`).catch(() => {
      Linking.openURL(`sms:${phone}?body=${text}`);
    });
  };

  const handleCall = (boy: any) => {
    const phone = boy.phone || '';
    if (!phone) {
      triggerToast('Mobile number not available');
      return;
    }
    Linking.openURL(`tel:${phone}`);
  };

  // Convert either direct partners API data or AppContext deliveryBoys into unified list
  const unifiedPartnerList: DeliveryBoyItem[] = useMemo(() => {
    if (partners && partners.length > 0) {
      return partners.map(p => ({
        id: String(p.id),
        name: p.name,
        phone: p.phone,
        emergencyContact: p.emergency_phone,
        licenseNumber: p.license_number,
        vehicleType: p.vehicle_type as any,
        vehicleModel: p.vehicle_model,
        numberPlate: p.number_plate,
        status: p.status || 'READY',
        isActive: p.is_active ?? true,
        location: p.location || 'Assigned to Fleet',
        activeDeliveriesCount: p.active_deliveries_count || 0,
        avatarUrl: p.avatar_url || '',
      }));
    }
    return deliveryBoys || [];
  }, [partners, deliveryBoys]);

  // Actual backend-calculated status counters
  const counts = useMemo(() => {
    const total = unifiedPartnerList.length;
    const available = unifiedPartnerList.filter(
      p => p.isActive !== false && p.status === 'READY',
    ).length;
    const busy = unifiedPartnerList.filter(
      p => p.isActive !== false && p.status === 'BUSY',
    ).length;
    const offline = unifiedPartnerList.filter(
      p => p.isActive === false || p.status === 'OFFLINE',
    ).length;
    return { total, available, busy, offline };
  }, [unifiedPartnerList]);

  // Filter & Search
  const filteredList = useMemo(() => {
    return unifiedPartnerList.filter(p => {
      // 1. Search filter by name or phone
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        (p.name && p.name.toLowerCase().includes(q)) ||
        (p.phone && p.phone.includes(q));

      if (!matchesSearch) return false;

      // 2. Status filter
      if (selectedFilter === 'All') return true;
      if (selectedFilter === 'Available') return p.isActive !== false && p.status === 'READY';
      if (selectedFilter === 'Busy') return p.isActive !== false && p.status === 'BUSY';
      if (selectedFilter === 'Offline') return p.isActive === false || p.status === 'OFFLINE';
      return true;
    });
  }, [unifiedPartnerList, searchQuery, selectedFilter]);

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      {/* 1. Main Application Header - Renamed to Delivery Partners */}
      <Header
        title="Delivery Partners"
        showBack={true}
        showNotification={false}
      />

      {toastMessage !== '' && (
        <View style={styles.toast}>
          <Ionicons name="information-circle-outline" size={20} color="#FFFFFF" />
          <Text style={styles.toastText}>{toastMessage}</Text>
        </View>
      )}

      {/* 2. Sticky Search Bar and Status Filters */}
      <View style={styles.stickySearchHeader}>
        <SearchBar
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Search by partner name or phone..."
          containerStyle={{ marginVertical: 0, marginBottom: 8 }}
        />

        {/* Filter Pills */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.filterScroll}
          contentContainerStyle={{ paddingVertical: 2 }}
        >
          {STATUS_FILTERS.map(f => {
            const isActive = selectedFilter === f;
            const countNum =
              f === 'All'
                ? counts.total
                : f === 'Available'
                  ? counts.available
                  : f === 'Busy'
                    ? counts.busy
                    : counts.offline;

            return (
              <TouchableOpacity
                key={f}
                style={[styles.filterChip, isActive && styles.filterChipActive]}
                onPress={() => setSelectedFilter(f)}
                activeOpacity={0.7}
              >
                <Text style={[styles.filterChipText, isActive && styles.filterChipTextActive]}>
                  {f} ({countNum})
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      <KeyboardAwareScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        enableOnAndroid={true}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#8C331A']} />
        }
      >
        {/* 3. Compact 4-Card Summary Grid */}
        <View style={styles.metricsGrid}>
          {/* Total Partners */}
          <View style={styles.metricCard}>
            <View style={styles.metricRow}>
              <Ionicons name="people-outline" size={15} color="#554A42" />
              <Text style={styles.metricLabel}>Total</Text>
            </View>
            <Text style={styles.metricVal}>{counts.total}</Text>
          </View>

          {/* Available */}
          <View style={[styles.metricCard, styles.metricCardReady]}>
            <View style={styles.metricRow}>
              <View style={[styles.metricDot, { backgroundColor: '#10B981' }]} />
              <Text style={[styles.metricLabel, { color: '#047857' }]}>Available</Text>
            </View>
            <Text style={[styles.metricVal, { color: '#059669' }]}>{counts.available}</Text>
          </View>

          {/* Busy */}
          <View style={[styles.metricCard, styles.metricCardBusy]}>
            <View style={styles.metricRow}>
              <View style={[styles.metricDot, { backgroundColor: '#F59E0B' }]} />
              <Text style={[styles.metricLabel, { color: '#B45309' }]}>Busy</Text>
            </View>
            <Text style={[styles.metricVal, { color: '#D97706' }]}>{counts.busy}</Text>
          </View>

          {/* Offline */}
          <View style={[styles.metricCard, styles.metricCardOffline]}>
            <View style={styles.metricRow}>
              <View style={[styles.metricDot, { backgroundColor: '#9CA3AF' }]} />
              <Text style={[styles.metricLabel, { color: '#4B5563' }]}>Offline</Text>
            </View>
            <Text style={[styles.metricVal, { color: '#6B7280' }]}>{counts.offline}</Text>
          </View>
        </View>

        {/* 4. Compact Collapsible Live Fleet GPS View */}
        <FleetMap partners={partners} onRefresh={fetchPartners} />

        {/* 5. Team Section Header */}
        <View style={styles.teamHeaderRow}>
          <Text style={styles.teamTitle}>
            Fleet Partners ({filteredList.length})
          </Text>

          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => navigation.navigate('AddDeliveryBoy')}
            style={styles.addMemberBtn}
          >
            <Ionicons name="person-add" size={14} color="#8C331A" />
            <Text style={styles.addMemberText}>Register Partner</Text>
          </TouchableOpacity>
        </View>

        {/* 6. Compact Partner Cards List */}
        {filteredList.length === 0 ? (
          <EmptyState
            icon="bicycle-outline"
            title="No Partners Found"
            subtitle={
              searchQuery
                ? 'No fleet member matches your search.'
                : `No partners in ${selectedFilter} status. Tap + to register a delivery partner.`
            }
          />
        ) : (
          filteredList.map(boy => (
            <DeliveryBoyCard
              key={boy.id}
              boy={boy}
              onPress={handleOpenDetailModal}
              onMore={handleOpenDetailModal}
              onDelete={handleDeleteBoy}
              onMessage={handleMessage}
              onCall={handleCall}
            />
          ))
        )}

        {/* Safe bottom spacer */}
        <View style={{ height: 60 }} />
      </KeyboardAwareScrollView>

      {/* Detail, Edit & Status Management Modal */}
      <DeliveryBoyDetailModal
        visible={isDetailModalVisible}
        boy={selectedBoy}
        onClose={() => {
          setIsDetailModalVisible(false);
          fetchPartners();
        }}
      />

      {/* Floating Add Partner Action Button */}
      <FloatingButton
        iconName="person-add"
        onPress={() => navigation.navigate('AddDeliveryBoy')}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAF8F5',
  },
  toast: {
    position: 'absolute',
    top: 50,
    left: 20,
    right: 20,
    backgroundColor: '#8C331A',
    borderRadius: 14,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 999,
    elevation: 6,
  },
  toastText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
    marginLeft: 8,
  },
  stickySearchHeader: {
    backgroundColor: '#FAF8F5',
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#EFEAE4',
  },
  filterScroll: {
    flexDirection: 'row',
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E8E1D9',
    marginRight: 6,
  },
  filterChipActive: {
    backgroundColor: '#8C331A',
    borderColor: '#8C331A',
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B5E55',
  },
  filterChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 30,
  },
  metricsGrid: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  metricCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#EFEAE4',
    paddingVertical: 8,
    paddingHorizontal: 8,
    alignItems: 'center',
  },
  metricCardReady: {
    backgroundColor: '#F6FDF9',
    borderColor: '#D1FAE5',
  },
  metricCardBusy: {
    backgroundColor: '#FEFDF8',
    borderColor: '#FEF3C7',
  },
  metricCardOffline: {
    backgroundColor: '#F9FAFB',
    borderColor: '#F3F4F6',
  },
  metricRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 3,
  },
  metricDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 4,
  },
  metricLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#554A42',
    letterSpacing: 0.3,
    marginLeft: 3,
  },
  metricVal: {
    fontSize: 16,
    fontWeight: '900',
    color: '#2A2421',
  },
  teamHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 10,
  },
  teamTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#2C201A',
  },
  addMemberBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FDEEEB',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  addMemberText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#8C331A',
    marginLeft: 4,
  },
});
