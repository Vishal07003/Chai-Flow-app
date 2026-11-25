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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { Header } from '../../components/common';
import { useApp } from '../../context/AppContext';
import orderService, {
  DailyDeliverySchedule,
} from '../../services/order.service';
import AppToast from '../../utils/toast';
import { colors } from '../../theme';

interface DailyBillsScreenProps {
  navigation?: any;
}

export default function DailyBillsScreen({ navigation }: DailyBillsScreenProps) {
  const { refreshBackendData } = useApp();

  // Search
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Pagination states
  const [schedulePage, setSchedulePage] = useState<number>(1);
  const schedulePageSize = 4;

  // Data Loading
  const [schedules, setSchedules] = useState<DailyDeliverySchedule[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  // Fetch Schedules
  const fetchData = useCallback(async () => {
    try {
      const scheduleList = await orderService.getDailySchedules().catch(() => []);
      setSchedules(scheduleList || []);
    } catch (_err) {
      // Handled silently
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    const unsubscribe = navigation?.addListener?.('focus', () => {
      fetchData();
      refreshBackendData();
    });
    fetchData();
    return unsubscribe;
  }, [navigation, fetchData, refreshBackendData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([fetchData(), refreshBackendData()]);
    setRefreshing(false);
  }, [fetchData, refreshBackendData]);

  // Toggle Schedule Pause / Resume directly on screen
  const handleToggleSchedulePause = async (sched: DailyDeliverySchedule) => {
    try {
      const nextActive = !sched.is_active;
      await orderService.updateDailySchedule(sched.id, { is_active: nextActive });
      AppToast.success(
        nextActive ? 'Schedule Resumed' : 'Schedule Paused',
        `Schedule for ${sched.customer_name} is now ${nextActive ? 'Active' : 'Paused'}.`
      );
      fetchData();
    } catch (err: any) {
      AppToast.error('Action Failed', err?.message || 'Could not update status.');
    }
  };

  // Filtered schedules for direct management on Billing
  const filteredSchedules = useMemo(() => {
    if (!searchQuery.trim()) return schedules;
    const q = searchQuery.toLowerCase().trim();
    return schedules.filter(
      s =>
        (s.customer_name || '').toLowerCase().includes(q) ||
        String(s.customer_profile).includes(q) ||
        String(s.id).includes(q) ||
        (s.delivery_partner_name || '').toLowerCase().includes(q) ||
        (s.delivery_address || '').toLowerCase().includes(q)
    );
  }, [schedules, searchQuery]);

  // Reset pagination when search changes
  useEffect(() => {
    setSchedulePage(1);
  }, [searchQuery]);

  // Paginated Schedules
  const totalSchedulePages = Math.max(1, Math.ceil(filteredSchedules.length / schedulePageSize));
  const paginatedSchedules = useMemo(() => {
    const start = (schedulePage - 1) * schedulePageSize;
    return filteredSchedules.slice(start, start + schedulePageSize);
  }, [filteredSchedules, schedulePage, schedulePageSize]);

  // Active schedules count
  const activeSchedulesCount = useMemo(() => schedules.filter(s => s.is_active).length, [schedules]);

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      {/* 1. Header (Standard Owner header matching Home and Customers) */}
      <Header title="Billing" showNotification={true} />

      {/* 2. ScrollView with Sticky Search Bar immediately below Header */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        stickyHeaderIndices={[1]}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />
        }
      >
        {/* INDEX 0: TOP TWO COMPACT ACTION CARDS (SIDE BY SIDE: 2 COLUMNS) */}
        <View style={styles.actionCardsRow}>
          {/* Card A: Daily Schedule (Brown / Chai theme) */}
          <View style={styles.compactActionCard}>
            <View style={styles.cardHeaderArea}>
              <View style={[styles.compactIconBox, { backgroundColor: '#FDEBE4' }]}>
                <Ionicons name="calendar" size={17} color="#8C331A" />
              </View>
              <View style={styles.countBadgeBrown}>
                <Text style={styles.countBadgeBrownText}>{activeSchedulesCount} Active</Text>
              </View>
            </View>

            <View style={styles.cardTextArea}>
              <Text style={styles.compactCardTitle} numberOfLines={1}>Daily Schedule</Text>
              <Text style={styles.compactCardSub} numberOfLines={2}>Automated customer delivery routes</Text>
            </View>

            <TouchableOpacity
              style={styles.compactActionButtonBrown}
              onPress={() => navigation?.navigate('CreateEditDailySchedule')}
              activeOpacity={0.85}
            >
              <Ionicons name="add" size={14} color="#FFFFFF" style={{ marginRight: 2 }} />
              <Text style={styles.compactActionBtnText}> Add Schedule</Text>
            </TouchableOpacity>
          </View>

          {/* Card B: Quick Billing (Replaces old Daily Billing card) */}
          <View style={styles.compactActionCard}>
            <View style={styles.cardHeaderArea}>
              <View style={[styles.compactIconBox, { backgroundColor: '#FDEBE4' }]}>
                <Ionicons name="flash-outline" size={17} color="#8C331A" />
              </View>
              <View style={styles.countBadgeBrown}>
                <Text style={styles.countBadgeBrownText}>Instant</Text>
              </View>
            </View>

            <View style={styles.cardTextArea}>
              <Text style={styles.compactCardTitle} numberOfLines={1}>Quick Billing</Text>
              <Text style={styles.compactCardSub} numberOfLines={2}>Instant counter orders & cash billing</Text>
            </View>

            <TouchableOpacity
              style={styles.compactActionButtonBrown}
              onPress={() => navigation?.navigate('QuickBilling')}
              activeOpacity={0.85}
            >
              <Ionicons name="flash" size={13} color="#FFFFFF" style={{ marginRight: 3 }} />
              <Text style={styles.compactActionBtnText}>Quick Billing</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* INDEX 1: STICKY SEARCH BAR (Sticks under Header on scroll) */}
        <View style={styles.stickySearchWrapper}>
          <View style={styles.searchBar}>
            <Ionicons name="search-outline" size={17} color="#888" style={{ marginRight: 8 }} />
            <TextInput
              placeholder="Search by customer name, ID, partner or area..."
              placeholderTextColor="#988E85"
              style={styles.searchInput}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Ionicons name="close-circle" size={17} color="#9CA3AF" />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* INDEX 2: MAIN SECTIONS CONTENT (Daily Schedule Management Only) */}
        <View style={styles.mainSectionsContainer}>
          {/* SECTION: DAILY SCHEDULE LIST & ACTIONS */}
          <View style={styles.sectionHeaderRow}>
            <View style={styles.sectionTitleCol}>
              <Text style={styles.sectionHeading}>DAILY SCHEDULE</Text>
              <Text style={styles.sectionSubheading}>
                {activeSchedulesCount} active routes • {filteredSchedules.length} total
              </Text>
            </View>

            <TouchableOpacity
              style={styles.sectionActionPill}
              onPress={() => navigation?.navigate('DailySchedule')}
              activeOpacity={0.7}
            >
              <Text style={styles.sectionActionPillText}>View All ({schedules.length})</Text>
              <Ionicons name="chevron-forward" size={12} color="#8C331A" />
            </TouchableOpacity>
          </View>

          {loading ? (
            <ActivityIndicator size="large" color="#8C331A" style={{ marginVertical: 32 }} />
          ) : filteredSchedules.length === 0 ? (
            <View style={styles.emptyMiniCard}>
              <Ionicons name="calendar-outline" size={28} color="#D1D5DB" style={{ marginBottom: 6 }} />
              <Text style={styles.emptyMiniTitle}>No Schedules Found</Text>
              <Text style={styles.emptyMiniSub}>
                {searchQuery ? `No schedules matching "${searchQuery}"` : 'Tap "+ Add Schedule" to configure daily routes.'}
              </Text>
            </View>
          ) : (
            <>
              {paginatedSchedules.map(sched => {
                const weekdaysMap = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
                const daysLabel = sched.weekdays
                  ? sched.weekdays
                    .split(',')
                    .map(d => weekdaysMap[parseInt(d.trim(), 10)])
                    .filter(Boolean)
                    .join(', ')
                  : 'Everyday';
                const timeDisplay = sched.delivery_time ? sched.delivery_time.substring(0, 5) : '10:00';
                const itemsSummary = (sched.items || [])
                  .map(it => `${it.quantity}x ${it.product_name}`)
                  .join(' • ');

                return (
                  <View key={sched.id} style={styles.managementCard}>
                    {/* Header Row */}
                    <View style={styles.cardHeaderTop}>
                      <View style={{ flex: 1, marginRight: 8 }}>
                        <Text style={styles.cardTitle} numberOfLines={1}>{sched.customer_name}</Text>
                        <Text style={styles.cardSub} numberOfLines={1}>
                          {sched.delivery_address || 'Store Route / Counter'}
                        </Text>
                      </View>
                      <View style={[styles.statusBadge, sched.is_active ? styles.statusBadgeActive : styles.statusBadgePaused]}>
                        <View style={[styles.statusDot, { backgroundColor: sched.is_active ? '#10B981' : '#9CA3AF' }]} />
                        <Text style={[styles.statusBadgeText, sched.is_active ? styles.statusBadgeTextActive : styles.statusBadgeTextPaused]}>
                          {sched.is_active ? 'ACTIVE' : 'PAUSED'}
                        </Text>
                      </View>
                    </View>

                    {/* Timing & Weekdays */}
                    <View style={styles.inlineMetaStrip}>
                      <Ionicons name="time-outline" size={13} color="#8C331A" style={{ marginRight: 4 }} />
                      <Text style={styles.inlineMetaHighlight}>{timeDisplay}</Text>
                      <Text style={styles.inlineMetaDivider}>•</Text>
                      <Ionicons name="calendar-outline" size={12} color="#6B7280" style={{ marginRight: 4 }} />
                      <Text style={styles.inlineMetaText} numberOfLines={1}>{daysLabel}</Text>
                    </View>

                    {/* Fixed Partner */}
                    <View style={styles.partnerRow}>
                      <Ionicons name="bicycle-outline" size={13} color="#8C331A" style={{ marginRight: 5 }} />
                      <Text style={styles.partnerText}>
                        Fixed Partner: <Text style={styles.partnerTextBold}>{sched.delivery_partner_name}</Text>
                      </Text>
                    </View>

                    {/* Product & Quantity Summary */}
                    {itemsSummary ? (
                      <View style={styles.productSummaryBox}>
                        <Ionicons name="cafe-outline" size={12} color="#6B7280" style={{ marginRight: 5, marginTop: 1 }} />
                        <Text style={styles.productSummaryText} numberOfLines={1}>
                          {itemsSummary}
                        </Text>
                      </View>
                    ) : null}

                    {/* Actions Row: View, Edit, Pause/Resume */}
                    <View style={styles.managementActionRow}>
                      <TouchableOpacity
                        style={styles.miniActionBtn}
                        onPress={() => navigation?.navigate('CustomerDetail', { customerId: sched.customer_profile })}
                        activeOpacity={0.7}
                      >
                        <Ionicons name="eye-outline" size={12} color="#4B5563" style={{ marginRight: 3 }} />
                        <Text style={styles.miniActionBtnText}>View</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.miniActionBtn}
                        onPress={() => navigation?.navigate('CreateEditDailySchedule', { schedule: sched })}
                        activeOpacity={0.7}
                      >
                        <Ionicons name="create-outline" size={12} color="#8C331A" style={{ marginRight: 3 }} />
                        <Text style={[styles.miniActionBtnText, { color: '#8C331A' }]}>Edit</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.miniActionBtn}
                        onPress={() => handleToggleSchedulePause(sched)}
                        activeOpacity={0.7}
                      >
                        <Ionicons
                          name={sched.is_active ? 'pause-circle-outline' : 'play-circle-outline'}
                          size={12}
                          color={sched.is_active ? '#D97706' : '#10B981'}
                          style={{ marginRight: 3 }}
                        />
                        <Text
                          style={[
                            styles.miniActionBtnText,
                            sched.is_active ? { color: '#D97706' } : { color: '#10B981' },
                          ]}
                        >
                          {sched.is_active ? 'Pause' : 'Resume'}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })}

              {/* Schedule Pagination Controls */}
              {totalSchedulePages > 1 && (
                <View style={styles.paginationRow}>
                  <TouchableOpacity
                    style={[styles.pageNavBtn, schedulePage <= 1 && styles.pageNavBtnDisabled]}
                    disabled={schedulePage <= 1}
                    onPress={() => setSchedulePage(p => Math.max(1, p - 1))}
                  >
                    <Ionicons name="chevron-back" size={14} color={schedulePage <= 1 ? '#D1D5DB' : '#8C331A'} />
                    <Text style={[styles.pageNavBtnText, schedulePage <= 1 && styles.pageNavBtnTextDisabled]}>Prev</Text>
                  </TouchableOpacity>

                  <Text style={styles.pageIndicatorText}>
                    Page <Text style={{ fontWeight: '700', color: '#1F2937' }}>{schedulePage}</Text> of {totalSchedulePages}
                  </Text>

                  <TouchableOpacity
                    style={[styles.pageNavBtn, schedulePage >= totalSchedulePages && styles.pageNavBtnDisabled]}
                    disabled={schedulePage >= totalSchedulePages}
                    onPress={() => setSchedulePage(p => Math.min(totalSchedulePages, p + 1))}
                  >
                    <Text style={[styles.pageNavBtnText, schedulePage >= totalSchedulePages && styles.pageNavBtnTextDisabled]}>Next</Text>
                    <Ionicons name="chevron-forward" size={14} color={schedulePage >= totalSchedulePages ? '#D1D5DB' : '#8C331A'} />
                  </TouchableOpacity>
                </View>
              )}
            </>
          )}
        </View>
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
    paddingBottom: 40,
  },

  /* Two Compact Side-by-Side Action Cards (150-160px height) */
  actionCardsRow: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 10,
  },
  compactActionCard: {
    flex: 1,
    height: 154,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#EFEAE4',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 2,
    justifyContent: 'space-between',
  },
  cardHeaderArea: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  compactIconBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  countBadgeBrown: {
    backgroundColor: '#FDEBE4',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
  },
  countBadgeBrownText: {
    fontSize: 9,
    fontFamily: 'Inter-Bold',
    fontWeight: '800',
    color: '#8C331A',
  },
  cardTextArea: {
    marginTop: 4,
  },
  compactCardTitle: {
    fontSize: 13,
    fontFamily: 'Inter-Bold',
    fontWeight: '800',
    color: '#1F2937',
  },
  compactCardSub: {
    fontSize: 10,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    marginTop: 2,
    lineHeight: 14,
  },
  compactActionButtonBrown: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#8C331A',
    paddingVertical: 6,
    borderRadius: 8,
    marginTop: 4,
  },
  compactActionBtnText: {
    fontSize: 11,
    fontFamily: 'Inter-Bold',
    fontWeight: '700',
    color: '#FFFFFF',
  },

  /* Sticky Search Bar Container */
  stickySearchWrapper: {
    backgroundColor: '#FAF8F5',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F3EFEA',
    zIndex: 10,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 42,
    borderWidth: 1,
    borderColor: '#EFEAE4',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 2,
    elevation: 1,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    fontFamily: 'Inter-Regular',
    color: '#1F2937',
    padding: 0,
  },

  /* Main Sections Container */
  mainSectionsContainer: {
    paddingHorizontal: 16,
    paddingTop: 12,
  },

  /* Section Header Rows */
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  sectionTitleCol: {
    flex: 1,
  },
  sectionHeading: {
    fontSize: 11,
    fontFamily: 'Inter-Bold',
    fontWeight: '800',
    color: '#8C331A',
    letterSpacing: 0.5,
  },
  sectionSubheading: {
    fontSize: 11,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    marginTop: 1,
  },
  sectionActionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#EFEAE4',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  sectionActionPillText: {
    fontSize: 10,
    fontFamily: 'Inter-SemiBold',
    color: '#8C331A',
    fontWeight: '700',
    marginRight: 2,
  },

  /* Management Card Styles */
  managementCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#EFEAE4',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 2,
    elevation: 1,
  },
  cardHeaderTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 5,
  },
  cardTitle: {
    fontSize: 13,
    fontFamily: 'Inter-Bold',
    fontWeight: '700',
    color: '#1F2937',
  },
  cardSub: {
    fontSize: 10,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    marginTop: 1,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
  },
  statusBadgeActive: {
    backgroundColor: '#ECFDF5',
  },
  statusBadgePaused: {
    backgroundColor: '#F3F4F6',
  },
  statusDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    marginRight: 4,
  },
  statusBadgeText: {
    fontSize: 8,
    fontFamily: 'Inter-Bold',
    fontWeight: '800',
  },
  statusBadgeTextActive: {
    color: '#065F46',
  },
  statusBadgeTextPaused: {
    color: '#4B5563',
  },
  inlineMetaStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FAF8F5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginBottom: 5,
  },
  inlineMetaHighlight: {
    fontSize: 11,
    fontFamily: 'Inter-Bold',
    color: '#8C331A',
    fontWeight: '700',
  },
  inlineMetaDivider: {
    marginHorizontal: 5,
    color: '#D1D5DB',
  },
  inlineMetaText: {
    fontSize: 10,
    fontFamily: 'Inter-Medium',
    color: '#4B5563',
  },
  partnerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
  },
  partnerText: {
    fontSize: 10,
    fontFamily: 'Inter-Regular',
    color: '#4B5563',
  },
  partnerTextBold: {
    fontFamily: 'Inter-SemiBold',
    fontWeight: '700',
    color: '#1F2937',
  },
  productSummaryBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FCFAF8',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#F3EFEA',
    marginBottom: 6,
  },
  productSummaryText: {
    fontSize: 10,
    fontFamily: 'Inter-Medium',
    color: '#4B5563',
  },
  managementActionRow: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#F3EFEA',
    paddingTop: 6,
    gap: 6,
  },
  miniActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FAF8F5',
    borderWidth: 1,
    borderColor: '#EFEAE4',
    paddingVertical: 5,
    borderRadius: 6,
  },
  miniActionBtnText: {
    fontSize: 10,
    fontFamily: 'Inter-SemiBold',
    fontWeight: '700',
    color: '#374151',
  },

  /* Pagination Bar */
  paginationRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#EFEAE4',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginTop: 4,
    marginBottom: 6,
  },
  pageNavBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: '#FAF8F5',
    borderWidth: 1,
    borderColor: '#EFEAE4',
  },
  pageNavBtnDisabled: {
    opacity: 0.5,
    backgroundColor: '#F3F4F6',
  },
  pageNavBtnText: {
    fontSize: 11,
    fontFamily: 'Inter-SemiBold',
    color: '#8C331A',
  },
  pageNavBtnTextDisabled: {
    color: '#9CA3AF',
  },
  pageIndicatorText: {
    fontSize: 11,
    fontFamily: 'Inter-Medium',
    color: '#6B7280',
  },

  /* Empty States */
  emptyMiniCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#EFEAE4',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  emptyMiniTitle: {
    fontSize: 12,
    fontFamily: 'Inter-Bold',
    fontWeight: '700',
    color: '#4B5563',
  },
  emptyMiniSub: {
    fontSize: 10,
    fontFamily: 'Inter-Regular',
    color: '#9CA3AF',
    marginTop: 2,
    textAlign: 'center',
  },
});
