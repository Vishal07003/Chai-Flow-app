import React, { useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useNavigation } from '@react-navigation/native';

import Header from '../../components/common/Header';
import FloatingButton from '../../components/common/FloatingButton';
import { useApp } from '../../context/AppContext';

const DAY_TABS = ['Today', 'Tomorrow', 'This Week'];

export default function ScheduleScreen() {
  const navigation = useNavigation<any>();
  const { schedules, completeSchedule } = useApp();

  const [activeTab, setActiveTab] = useState('Today');

  const inProgressCount = schedules.filter(
    s => s.status === 'IN_PROGRESS',
  ).length;
  const upcomingCount = schedules.filter(s => s.status === 'UPCOMING').length;

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      {/* Fixed Header */}
      <Header title="Delivery Schedule" />

      <KeyboardAwareScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        enableOnAndroid={true}
      >
        {/* Top Stat Cards */}
        <View style={styles.topCardsRow}>
          <View style={styles.statCard}>
            <View style={styles.cardHeader}>
              <Ionicons name="time-outline" size={18} color="#3B82F6" />
              <Text style={styles.cardTitle}>In Progress</Text>
            </View>
            <Text style={styles.cardValue}>{inProgressCount} Routes</Text>
            <Text style={styles.cardSubBlue}>🚀 ACTIVE DELIVERIES</Text>
          </View>

          <View style={styles.statCard}>
            <View style={styles.cardHeader}>
              <Ionicons name="calendar-outline" size={18} color="#8C331A" />
              <Text style={styles.cardTitle}>Upcoming</Text>
            </View>
            <Text style={styles.cardValue}>{upcomingCount} Routes</Text>
            <Text style={styles.cardSubRed}>📦 SCHEDULED TODAY</Text>
          </View>
        </View>

        {/* Action Header Row with Add Schedule Button */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>DELIVERY SLOTS & RUNS</Text>
          <TouchableOpacity
            activeOpacity={0.8}
            style={styles.addScheduleHeaderBtn}
            onPress={() => navigation.navigate('AddRouteSchedule')}
          >
            <Ionicons
              name="add-circle"
              size={16}
              color="#FFFFFF"
              style={{ marginRight: 4 }}
            />
            <Text style={styles.addScheduleHeaderText}>Add Schedule</Text>
          </TouchableOpacity>
        </View>

        {/* Day Filter Tabs */}
        <View style={styles.tabsRow}>
          {DAY_TABS.map(tab => {
            const isActive = tab === activeTab;
            return (
              <TouchableOpacity
                key={tab}
                activeOpacity={0.8}
                onPress={() => setActiveTab(tab)}
                style={[
                  styles.tab,
                  isActive ? styles.activeTab : styles.inactiveTab,
                ]}
              >
                <Text
                  style={[
                    styles.tabText,
                    isActive ? styles.activeTabText : styles.inactiveTabText,
                  ]}
                >
                  {tab}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Timeline Schedule Cards List */}
        <View style={styles.scheduleList}>
          {schedules.map(item => {
            const isInProgress = item.status === 'IN_PROGRESS';
            const isCompleted = item.status === 'COMPLETED';

            return (
              <View key={item.id} style={styles.scheduleCard}>
                {/* Header Time Row */}
                <View style={styles.timeHeaderRow}>
                  <View style={styles.timeBadge}>
                    <Ionicons
                      name="alarm-outline"
                      size={14}
                      color="#8C331A"
                      style={{ marginRight: 4 }}
                    />
                    <Text style={styles.timeBadgeText}>{item.timeSlot}</Text>
                  </View>

                  <View
                    style={[
                      styles.statusBadge,
                      isInProgress && styles.inProgressBadge,
                      isCompleted && styles.completedBadge,
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusBadgeText,
                        isInProgress && styles.inProgressBadgeText,
                        isCompleted && styles.completedBadgeText,
                      ]}
                    >
                      {item.status.replace('_', ' ')}
                    </Text>
                  </View>
                </View>

                {/* Content Details */}
                <Text style={styles.routeTitle}>{item.title}</Text>

                <View style={styles.detailRow}>
                  <Ionicons
                    name="person-outline"
                    size={15}
                    color="#6E6259"
                    style={{ marginRight: 6 }}
                  />
                  <Text style={styles.detailText}>
                    {item.customerName} ({item.itemsCount} items)
                  </Text>
                </View>

                <View style={styles.detailRow}>
                  <Ionicons
                    name="location-outline"
                    size={15}
                    color="#6E6259"
                    style={{ marginRight: 6 }}
                  />
                  <Text style={styles.detailText} numberOfLines={1}>
                    {item.address}
                  </Text>
                </View>

                {/* Assigned Delivery Member Footer */}
                <View style={styles.footerRow}>
                  <View style={styles.driverTag}>
                    <Ionicons
                      name="bicycle-outline"
                      size={16}
                      color="#3B82F6"
                      style={{ marginRight: 4 }}
                    />
                    <Text style={styles.driverText}>{item.deliveryBoy}</Text>
                  </View>

                  {!isCompleted ? (
                    <TouchableOpacity
                      activeOpacity={0.8}
                      style={styles.completeBtn}
                      onPress={() => completeSchedule(item.id)}
                    >
                      <Ionicons
                        name="checkmark-circle-outline"
                        size={16}
                        color="#FFFFFF"
                        style={{ marginRight: 4 }}
                      />
                      <Text style={styles.completeBtnText}>Complete</Text>
                    </TouchableOpacity>
                  ) : (
                    <View style={styles.doneCheck}>
                      <Ionicons
                        name="checkmark-done"
                        size={18}
                        color="#10B981"
                      />
                      <Text style={styles.doneText}>Done</Text>
                    </View>
                  )}
                </View>
              </View>
            );
          })}
        </View>
      </KeyboardAwareScrollView>

      {/* Add Schedule Floating Button (Opens AddRouteSchedule Screen) */}
      <FloatingButton
        iconName="calendar-outline"
        onPress={() => navigation.navigate('AddRouteSchedule')}
      />
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
    paddingTop: 8,
    paddingBottom: 16,
  },

  /* Top Stat Cards */
  topCardsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  statCard: {
    width: '48%',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 14,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    borderWidth: 1,
    borderColor: '#EFECE8',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  cardTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#6E6259',
    marginLeft: 6,
  },
  cardValue: {
    fontSize: 20,
    fontWeight: '800',
    color: '#2C201A',
    marginBottom: 4,
  },
  cardSubBlue: {
    fontSize: 10,
    fontWeight: '800',
    color: '#3B82F6',
    letterSpacing: 0.5,
  },
  cardSubRed: {
    fontSize: 10,
    fontWeight: '800',
    color: '#8C331A',
    letterSpacing: 0.5,
  },

  /* Section Header */
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#6E6259',
    letterSpacing: 0.8,
  },
  addScheduleHeaderBtn: {
    backgroundColor: '#8C331A',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
  },
  addScheduleHeaderText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },

  /* Day Tabs */
  tabsRow: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  tab: {
    paddingHorizontal: 18,
    paddingVertical: 9,
    borderRadius: 20,
    marginRight: 8,
  },
  activeTab: {
    backgroundColor: '#8C331A',
  },
  inactiveTab: {
    backgroundColor: '#EFECE8',
  },
  tabText: {
    fontSize: 13,
    fontWeight: '700',
  },
  activeTabText: {
    color: '#FFFFFF',
  },
  inactiveTabText: {
    color: '#6E6259',
  },

  /* Schedule List Cards */
  scheduleList: {
    marginTop: 4,
  },
  scheduleCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    marginBottom: 14,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    borderWidth: 1,
    borderColor: '#EFECE9',
  },
  timeHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  timeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FDEBE4',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  timeBadgeText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#8C331A',
  },
  statusBadge: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  inProgressBadge: {
    backgroundColor: '#DBEAFE',
  },
  completedBadge: {
    backgroundColor: '#D1FAE5',
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#D97706',
  },
  inProgressBadgeText: {
    color: '#2563EB',
  },
  completedBadgeText: {
    color: '#059669',
  },
  routeTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#2C201A',
    marginBottom: 8,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  detailText: {
    fontSize: 13,
    color: '#6E6259',
    fontWeight: '500',
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F5EAE6',
  },
  driverTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  driverText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#2563EB',
  },
  completeBtn: {
    backgroundColor: '#8C331A',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
  },
  completeBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  doneCheck: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  doneText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#10B981',
    marginLeft: 4,
  },
});
