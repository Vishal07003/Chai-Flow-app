import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
  RefreshControl,
  Modal,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { Header, FloatingButton } from '../../components/common';
import orderService, {
  DailyDeliverySchedule,
} from '../../services/order.service';
import AppToast from '../../utils/toast';
import { colors, typography, radius, spacing, shadows } from '../../theme';

interface DailyScheduleScreenProps {
  navigation: any;
  route?: any;
}

const FILTER_TABS = ['All', 'Active', 'Paused'] as const;
type FilterTab = typeof FILTER_TABS[number];

export default function DailyScheduleScreen({ navigation }: DailyScheduleScreenProps) {
  const [schedules, setSchedules] = useState<DailyDeliverySchedule[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeFilter, setActiveFilter] = useState<FilterTab>('All');

  // Cancellation Modal State
  const [cancelModalVisible, setCancelModalVisible] = useState<boolean>(false);
  const [cancellingSchedule, setCancellingSchedule] = useState<DailyDeliverySchedule | null>(null);
  const [cancelDateInput, setCancelDateInput] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [cancelReasonInput, setCancelReasonInput] = useState<string>('');

  // Fetch Schedules from backend
  const fetchSchedules = useCallback(async () => {
    try {
      const data = await orderService.getDailySchedules();
      setSchedules(data || []);
    } catch (_err) {
      // Handled silently
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    const unsubscribe = navigation?.addListener?.('focus', () => {
      fetchSchedules();
    });
    fetchSchedules();
    return unsubscribe;
  }, [navigation, fetchSchedules]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchSchedules();
    setRefreshing(false);
  }, [fetchSchedules]);

  // Toggle Active / Pause
  const handleTogglePauseResume = async (sched: DailyDeliverySchedule) => {
    try {
      const nextActive = !sched.is_active;
      await orderService.updateDailySchedule(sched.id, { is_active: nextActive });
      AppToast.success(
        nextActive ? 'Schedule Resumed' : 'Schedule Paused',
        `Schedule for ${sched.customer_name} is now ${nextActive ? 'Active' : 'Paused'}.`
      );
      fetchSchedules();
    } catch (err: any) {
      AppToast.error('Action Failed', err?.message || 'Could not update status.');
    }
  };

  // Open Cancel Date Dialog
  const handleOpenCancelDate = (sched: DailyDeliverySchedule) => {
    setCancellingSchedule(sched);
    setCancelDateInput(new Date().toISOString().split('T')[0]);
    setCancelReasonInput('');
    setCancelModalVisible(true);
  };

  // Confirm Date Cancellation
  const handleConfirmCancelDate = async () => {
    if (!cancellingSchedule) return;
    try {
      const res = await orderService.cancelDateDelivery(
        cancellingSchedule.id,
        cancelDateInput,
        cancelReasonInput.trim()
      );
      setCancelModalVisible(false);
      fetchSchedules();
      AppToast.info(
        res.case === 'B' ? "Today's Delivery Cancelled" : 'Delivery Date Skipped',
        res.message
      );
    } catch (err: any) {
      AppToast.error('Cancellation Failed', err?.message || 'Could not cancel delivery for selected date.');
    }
  };

  // Filtered List
  const filteredSchedules = useMemo(() => {
    return schedules.filter(s => {
      // 1. Status Filter
      if (activeFilter === 'Active' && !s.is_active) return false;
      if (activeFilter === 'Paused' && s.is_active) return false;

      // 2. Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = (s.customer_name || '').toLowerCase().includes(q);
        const matchesPartner = (s.delivery_partner_name || '').toLowerCase().includes(q);
        const matchesAddress = (s.delivery_address || '').toLowerCase().includes(q);
        if (!matchesName && !matchesPartner && !matchesAddress) return false;
      }

      return true;
    });
  }, [schedules, activeFilter, searchQuery]);

  // Metrics
  const activeCount = useMemo(() => schedules.filter(s => s.is_active).length, [schedules]);
  const pausedCount = useMemo(() => schedules.filter(s => !s.is_active).length, [schedules]);

  // Total daily scheduled estimated value
  const totalDailyValue = useMemo(() => {
    return schedules
      .filter(s => s.is_active)
      .reduce((sum, sched) => {
        const schedTotal = (sched.items || []).reduce((itemSum, item) => {
          const price = parseFloat(item.unit_price) || parseFloat(item.product_price) || 0;
          return itemSum + price * item.quantity;
        }, 0);
        return sum + schedTotal;
      }, 0);
  }, [schedules]);

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      {/* 1. Header (Shared header style matching Home and Customers) */}
      <Header title="Daily Schedule" showBack={true} />

      {/* 2. Sticky Search Bar and Filter Tabs Container (Exact Customers screen pattern) */}
      <View style={styles.stickySearchContainer}>
        {/* Search Bar */}
        <View style={styles.searchBar}>
          <Ionicons
            name="search-outline"
            size={18}
            color="#888"
            style={styles.searchIcon}
          />
          <TextInput
            placeholder="Search by customer, partner or area..."
            placeholderTextColor="#988E85"
            style={styles.searchInput}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={18} color="#999" />
            </TouchableOpacity>
          )}
        </View>

        {/* Filter Chips */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterRow}
        >
          {FILTER_TABS.map(tab => {
            const isActive = activeFilter === tab;
            const count =
              tab === 'All' ? schedules.length : tab === 'Active' ? activeCount : pausedCount;
            return (
              <TouchableOpacity
                key={tab}
                activeOpacity={0.8}
                onPress={() => setActiveFilter(tab)}
                style={[
                  styles.filterChip,
                  isActive ? styles.activeChip : styles.inactiveChip,
                ]}
              >
                <Text
                  style={[
                    styles.chipText,
                    isActive ? styles.activeChipText : styles.inactiveChipText,
                  ]}
                >
                  {tab} ({count})
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
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#8C331A"
            colors={['#8C331A']}
          />
        }
      >
        {/* 3. Top Overview Hero Card (Matching Home & Customers screen KPI style) */}
        <View style={styles.overviewHeroCard}>
          <View style={styles.heroTopRow}>
            <View>
              <Text style={styles.heroLabel}>CONFIGURED SCHEDULES</Text>
              <View style={styles.heroValueRow}>
                <Text style={styles.heroMainValue}>{schedules.length}</Text>
                <Text style={styles.heroSubValueText}>
                  {' '}
                  • {activeCount} active, {pausedCount} paused
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.heroDivider} />

          <View style={styles.heroBottomRow}>
            <View style={styles.heroSubCol}>
              <View style={styles.dotLabelRow}>
                <View style={[styles.dot, { backgroundColor: '#10B981' }]} />
                <Text style={styles.heroSubLabel}>ACTIVE ROUTES</Text>
              </View>
              <Text style={styles.heroSubValueGreen}>{activeCount} routes</Text>
            </View>

            <View style={styles.verticalDivider} />

            <View style={styles.heroSubCol}>
              <View style={styles.dotLabelRow}>
                <View style={[styles.dot, { backgroundColor: '#8C331A' }]} />
                <Text style={styles.heroSubLabel}>EST. DAILY VALUE</Text>
              </View>
              <Text style={styles.heroSubValueChai}>₹{totalDailyValue.toLocaleString('en-IN')}</Text>
            </View>
          </View>
        </View>

        {/* 4. Schedule Cards Listing */}
        {loading ? (
          <View style={styles.centerBox}>
            <ActivityIndicator size="large" color="#8C331A" />
            <Text style={styles.loadingText}>Loading delivery schedules...</Text>
          </View>
        ) : filteredSchedules.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="calendar-outline" size={48} color="#D1D5DB" style={{ marginBottom: 12 }} />
            <Text style={styles.emptyTitle}>No Schedules Found</Text>
            <Text style={styles.emptySubtitle}>
              {searchQuery.trim()
                ? `No schedule matching "${searchQuery}"`
                : activeFilter !== 'All'
                ? `No ${activeFilter.toLowerCase()} delivery schedules`
                : 'Configure automated recurring daily deliveries with fixed partners.'}
            </Text>
          </View>
        ) : (
          filteredSchedules.map(sched => {
            const weekdaysMap = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
            const daysLabel = sched.weekdays
              ? sched.weekdays
                  .split(',')
                  .map(d => weekdaysMap[parseInt(d.trim(), 10)])
                  .filter(Boolean)
                  .join(', ')
              : 'Everyday';
            const timeDisplay = sched.delivery_time ? sched.delivery_time.substring(0, 5) : '10:00';
            const itemsList = (sched.items || [])
              .map(i => `${i.quantity}x ${i.product_name}`)
              .join('  •  ');

            // Calculate schedule total amount
            const schedTotal = (sched.items || []).reduce((sum, item) => {
              const p = parseFloat(item.unit_price) || parseFloat(item.product_price) || 0;
              return sum + p * item.quantity;
            }, 0);

            return (
              <View key={sched.id} style={styles.scheduleCard}>
                {/* Card Top Row: Customer Name, Status Badge */}
                <View style={styles.cardHeaderRow}>
                  <View style={{ flex: 1, marginRight: 8 }}>
                    <TouchableOpacity
                      onPress={() =>
                        navigation.navigate('CustomerDetail', { customerId: sched.customer_profile })
                      }
                      activeOpacity={0.7}
                    >
                      <Text style={styles.customerNameText} numberOfLines={1}>
                        {sched.customer_name}
                      </Text>
                    </TouchableOpacity>
                    <Text style={styles.customerAddressText} numberOfLines={1}>
                      {sched.delivery_address || 'Store Route / Counter'}
                    </Text>
                  </View>

                  <View
                    style={[
                      styles.statusPill,
                      sched.is_active ? styles.statusPillActive : styles.statusPillPaused,
                    ]}
                  >
                    <View
                      style={[
                        styles.statusDot,
                        { backgroundColor: sched.is_active ? '#10B981' : '#9CA3AF' },
                      ]}
                    />
                    <Text
                      style={[
                        styles.statusPillText,
                        sched.is_active ? styles.statusPillTextActive : styles.statusPillTextPaused,
                      ]}
                    >
                      {sched.is_active ? 'ACTIVE' : 'PAUSED'}
                    </Text>
                  </View>
                </View>

                {/* Timing & Weekdays Badge Strip */}
                <View style={styles.timeStrip}>
                  <View style={styles.timeStripItem}>
                    <Ionicons name="time" size={14} color="#8C331A" style={{ marginRight: 5 }} />
                    <Text style={styles.timeStripValue}>{timeDisplay}</Text>
                  </View>
                  <View style={styles.timeStripDivider} />
                  <View style={styles.timeStripItem}>
                    <Ionicons name="calendar-outline" size={13} color="#6B7280" style={{ marginRight: 5 }} />
                    <Text style={styles.timeStripDays} numberOfLines={1}>{daysLabel}</Text>
                  </View>
                </View>

                {/* Fixed Delivery Partner */}
                <View style={styles.partnerRow}>
                  <Ionicons name="bicycle-outline" size={15} color="#8C331A" style={{ marginRight: 6 }} />
                  <Text style={styles.partnerText}>
                    Fixed Partner: <Text style={styles.partnerTextBold}>{sched.delivery_partner_name}</Text>
                  </Text>
                </View>

                {/* Scheduled Product Items Summary */}
                <View style={styles.itemsBox}>
                  <Ionicons name="cafe-outline" size={14} color="#8C331A" style={{ marginRight: 6, marginTop: 1 }} />
                  <Text style={styles.itemsText} numberOfLines={2}>
                    {itemsList || 'No products configured'}
                  </Text>
                </View>

                {/* Financial Total & Next Delivery Info */}
                <View style={styles.cardFinancialRow}>
                  <View>
                    <Text style={styles.nextDeliveryLabel}>
                      Next Delivery:{' '}
                      <Text style={{ fontWeight: '700', color: '#1F2937' }}>
                        {sched.next_scheduled_delivery || 'Not scheduled'}
                      </Text>
                    </Text>
                    <Text style={styles.leadTimeLabel}>
                      Alert Lead: {sched.notification_lead_time_minutes || 30}m before
                    </Text>
                  </View>

                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={styles.scheduleTotalLabel}>SCHEDULE TOTAL</Text>
                    <Text style={styles.scheduleTotalAmount}>₹{schedTotal.toFixed(2)}</Text>
                  </View>
                </View>

                {/* Card Action Buttons: 2x2 grid to prevent overflow */}
                <View style={styles.actionsGrid}>
                  <View style={styles.actionsGridRow}>
                    <TouchableOpacity
                      style={styles.actionBtn}
                      onPress={() =>
                        navigation.navigate('CustomerDetail', { customerId: sched.customer_profile })
                      }
                      activeOpacity={0.7}
                    >
                      <Ionicons name="eye-outline" size={13} color="#4B5563" style={{ marginRight: 4 }} />
                      <Text style={styles.actionBtnText}>View</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.actionBtn}
                      onPress={() =>
                        navigation.navigate('CreateEditDailySchedule', { schedule: sched })
                      }
                      activeOpacity={0.7}
                    >
                      <Ionicons name="create-outline" size={13} color="#8C331A" style={{ marginRight: 4 }} />
                      <Text style={[styles.actionBtnText, { color: '#8C331A' }]}>Edit</Text>
                    </TouchableOpacity>
                  </View>

                  <View style={styles.actionsGridRow}>
                    <TouchableOpacity
                      style={styles.actionBtn}
                      onPress={() => handleTogglePauseResume(sched)}
                      activeOpacity={0.7}
                    >
                      <Ionicons
                        name={sched.is_active ? 'pause-circle-outline' : 'play-circle-outline'}
                        size={13}
                        color={sched.is_active ? '#D97706' : '#10B981'}
                        style={{ marginRight: 4 }}
                      />
                      <Text
                        style={[
                          styles.actionBtnText,
                          sched.is_active ? { color: '#D97706' } : { color: '#10B981' },
                        ]}
                      >
                        {sched.is_active ? 'Pause' : 'Resume'}
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.actionBtn, styles.cancelActionBtn]}
                      onPress={() => handleOpenCancelDate(sched)}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="close-circle-outline" size={13} color="#EF4444" style={{ marginRight: 4 }} />
                      <Text style={[styles.actionBtnText, { color: '#EF4444' }]}>Cancel Today</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            );
          })
        )}
      </KeyboardAwareScrollView>

      {/* Floating Action Button (FAB) for Add Schedule */}
      <FloatingButton
        iconName="add"
        onPress={() => navigation.navigate('CreateEditDailySchedule')}
      />

      {/* Date-Specific Cancellation Dialog */}
      <Modal
        visible={cancelModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setCancelModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.cancelBox}>
            <View style={styles.cancelHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Ionicons name="alert-circle" size={20} color="#EF4444" style={{ marginRight: 6 }} />
                <Text style={styles.cancelTitle}>Cancel Delivery Date</Text>
              </View>
              <TouchableOpacity onPress={() => setCancelModalVisible(false)}>
                <Ionicons name="close" size={20} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <Text style={styles.cancelSub}>
              Skip delivery for {cancellingSchedule?.customer_name} on a specific date. Future scheduled deliveries will remain active.
            </Text>

            <Text style={styles.inputLabel}>TARGET DATE (YYYY-MM-DD)</Text>
            <View style={styles.dateInputWrap}>
              <TextInput
                style={styles.modalTextInput}
                value={cancelDateInput}
                onChangeText={setCancelDateInput}
                placeholder="YYYY-MM-DD"
                placeholderTextColor="#9CA3AF"
              />
            </View>

            <Text style={styles.inputLabel}>REASON (OPTIONAL)</Text>
            <View style={styles.dateInputWrap}>
              <TextInput
                style={styles.modalTextInput}
                value={cancelReasonInput}
                onChangeText={setCancelReasonInput}
                placeholder="e.g. Office closed / Customer holiday"
                placeholderTextColor="#9CA3AF"
              />
            </View>

            <View style={styles.cancelModalActions}>
              <TouchableOpacity
                style={styles.modalSecondaryBtn}
                onPress={() => setCancelModalVisible(false)}
                activeOpacity={0.7}
              >
                <Text style={styles.modalSecondaryText}>Go Back</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalDangerBtn}
                onPress={handleConfirmCancelDate}
                activeOpacity={0.7}
              >
                <Text style={styles.modalDangerText}>Confirm Skip</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAF8F5',
  },
  stickySearchContainer: {
    backgroundColor: '#FAF8F5',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F3EFEA',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44,
    borderWidth: 1,
    borderColor: '#EFEAE4',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#1F2937',
    fontFamily: 'Inter-Regular',
    padding: 0,
  },
  filterRow: {
    flexDirection: 'row',
    paddingTop: 10,
    paddingBottom: 2,
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  activeChip: {
    backgroundColor: '#8C331A',
  },
  inactiveChip: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#EFEAE4',
  },
  chipText: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
  },
  activeChipText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  inactiveChipText: {
    color: '#6B7280',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 40,
  },
  overviewHeroCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#EFEAE4',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  heroTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  heroLabel: {
    fontSize: 10,
    fontFamily: 'Inter-Bold',
    fontWeight: '800',
    color: '#9CA3AF',
    letterSpacing: 0.5,
  },
  heroValueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginTop: 2,
  },
  heroMainValue: {
    fontSize: 24,
    fontFamily: 'Inter-Bold',
    fontWeight: '800',
    color: '#1F2937',
  },
  heroSubValueText: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    color: '#6B7280',
  },
  primaryAddBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#8C331A',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    shadowColor: '#8C331A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 2,
  },
  primaryAddBtnText: {
    fontSize: 12,
    fontFamily: 'Inter-Bold',
    fontWeight: '700',
    color: '#FFFFFF',
  },
  heroDivider: {
    height: 1,
    backgroundColor: '#F3EFEA',
    marginVertical: 12,
  },
  heroBottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  heroSubCol: {
    flex: 1,
  },
  dotLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  heroSubLabel: {
    fontSize: 9,
    fontFamily: 'Inter-Bold',
    fontWeight: '800',
    color: '#9CA3AF',
    letterSpacing: 0.4,
  },
  heroSubValueGreen: {
    fontSize: 14,
    fontFamily: 'Inter-Bold',
    fontWeight: '700',
    color: '#10B981',
  },
  heroSubValueChai: {
    fontSize: 14,
    fontFamily: 'Inter-Bold',
    fontWeight: '700',
    color: '#8C331A',
  },
  verticalDivider: {
    width: 1,
    height: 24,
    backgroundColor: '#F3EFEA',
    marginHorizontal: 16,
  },
  scheduleCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#EFEAE4',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  customerNameText: {
    fontSize: 15,
    fontFamily: 'Inter-Bold',
    fontWeight: '800',
    color: '#1F2937',
  },
  customerAddressText: {
    fontSize: 11,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    marginTop: 1,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  statusPillActive: {
    backgroundColor: '#ECFDF5',
  },
  statusPillPaused: {
    backgroundColor: '#F3F4F6',
  },
  statusDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    marginRight: 4,
  },
  statusPillText: {
    fontSize: 9,
    fontFamily: 'Inter-Bold',
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  statusPillTextActive: {
    color: '#065F46',
  },
  statusPillTextPaused: {
    color: '#4B5563',
  },
  timeStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FAF8F5',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#F3EFEA',
    marginBottom: 8,
  },
  timeStripItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  timeStripDivider: {
    width: 1,
    height: 12,
    backgroundColor: '#E5E7EB',
    marginHorizontal: 8,
  },
  timeStripValue: {
    fontSize: 13,
    fontFamily: 'Inter-Bold',
    fontWeight: '700',
    color: '#8C331A',
  },
  timeStripDays: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    color: '#4B5563',
  },
  partnerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  partnerText: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#4B5563',
  },
  partnerTextBold: {
    fontFamily: 'Inter-SemiBold',
    fontWeight: '700',
    color: '#1F2937',
  },
  itemsBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FCFAF8',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#F3EFEA',
    marginBottom: 10,
  },
  itemsText: {
    flex: 1,
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    color: '#374151',
    lineHeight: 16,
  },
  cardFinancialRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingTop: 2,
  },
  nextDeliveryLabel: {
    fontSize: 11,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
  },
  leadTimeLabel: {
    fontSize: 10,
    fontFamily: 'Inter-Regular',
    color: '#9CA3AF',
    marginTop: 2,
  },
  scheduleTotalLabel: {
    fontSize: 9,
    fontFamily: 'Inter-Bold',
    fontWeight: '800',
    color: '#9CA3AF',
    letterSpacing: 0.4,
  },
  scheduleTotalAmount: {
    fontSize: 15,
    fontFamily: 'Inter-Bold',
    fontWeight: '800',
    color: '#8C331A',
  },
  actionsGrid: {
    borderTopWidth: 1,
    borderTopColor: '#F3EFEA',
    paddingTop: 8,
    gap: 6,
  },
  actionsGridRow: {
    flexDirection: 'row',
    gap: 8,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 7,
    borderRadius: 8,
    backgroundColor: '#FAF8F5',
    borderWidth: 1,
    borderColor: '#EFEAE4',
  },
  cancelActionBtn: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FEE2E2',
  },
  actionBtnText: {
    fontSize: 11,
    fontFamily: 'Inter-SemiBold',
    fontWeight: '700',
    color: '#374151',
  },
  centerBox: {
    paddingVertical: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    color: '#6B7280',
    marginTop: 10,
  },
  emptyContainer: {
    paddingVertical: 60,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  emptyTitle: {
    fontSize: 16,
    fontFamily: 'Inter-Bold',
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 4,
  },
  emptySubtitle: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 16,
  },
  emptyAddBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#8C331A',
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 20,
  },
  emptyAddBtnText: {
    fontSize: 12,
    fontFamily: 'Inter-Bold',
    fontWeight: '700',
    color: '#FFFFFF',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  cancelBox: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 8,
  },
  cancelHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  cancelTitle: {
    fontSize: 15,
    fontFamily: 'Inter-Bold',
    fontWeight: '800',
    color: '#1F2937',
  },
  cancelSub: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#4B5563',
    lineHeight: 16,
    marginBottom: 12,
  },
  inputLabel: {
    fontSize: 10,
    fontFamily: 'Inter-Bold',
    fontWeight: '800',
    color: '#6B7280',
    marginBottom: 4,
  },
  dateInputWrap: {
    backgroundColor: '#FAF8F5',
    borderWidth: 1,
    borderColor: '#EFEAE4',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 7,
    marginBottom: 12,
  },
  modalTextInput: {
    fontSize: 13,
    fontFamily: 'Inter-Medium',
    color: '#1F2937',
    padding: 0,
  },
  cancelModalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 4,
  },
  modalSecondaryBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
  },
  modalSecondaryText: {
    fontSize: 12,
    fontFamily: 'Inter-SemiBold',
    fontWeight: '600',
    color: '#4B5563',
  },
  modalDangerBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#EF4444',
  },
  modalDangerText: {
    fontSize: 12,
    fontFamily: 'Inter-Bold',
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
