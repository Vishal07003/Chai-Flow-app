import React from 'react';
import { StyleSheet, View, Text, Switch, TouchableOpacity } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';

interface StatusCardProps {
  dutyStatus: 'ON_DUTY' | 'EN_ROUTE' | 'OFF_DUTY';
  onToggleDuty: (nextStatus: 'ON_DUTY' | 'OFF_DUTY') => void;
  completedStops: number;
  totalStops: number;
  distanceKm?: string;
}

export default function StatusCard({
  dutyStatus,
  onToggleDuty,
  completedStops,
  totalStops,
  distanceKm = '18.4 km',
}: StatusCardProps) {
  const isOnline = dutyStatus !== 'OFF_DUTY';

  return (
    <View style={styles.card}>
      <View style={styles.topRow}>
        <View style={styles.statusInfo}>
          <View style={[styles.indicatorDot, { backgroundColor: isOnline ? '#10B981' : '#EF4444' }]} />
          <Text style={styles.statusTitle}>
            {dutyStatus === 'EN_ROUTE'
              ? 'On Active Route'
              : dutyStatus === 'ON_DUTY'
              ? 'Online & Available'
              : 'Off Duty'}
          </Text>
        </View>

        <View style={styles.dutyPillToggle}>
          <TouchableOpacity
            activeOpacity={0.8}
            style={[
              styles.dutyPillBtn,
              isOnline && styles.dutyPillOnActive,
            ]}
            onPress={() => onToggleDuty('ON_DUTY')}
          >
            <View style={[styles.statusDotSmall, { backgroundColor: isOnline ? '#10B981' : 'rgba(255,255,255,0.6)' }]} />
            <Text style={[styles.dutyPillText, isOnline ? styles.dutyTextOnActive : styles.dutyTextInactive]}>
              ON DUTY
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.8}
            style={[
              styles.dutyPillBtn,
              !isOnline && styles.dutyPillOffActive,
            ]}
            onPress={() => onToggleDuty('OFF_DUTY')}
          >
            <View style={[styles.statusDotSmall, { backgroundColor: !isOnline ? '#EF4444' : 'rgba(255,255,255,0.6)' }]} />
            <Text style={[styles.dutyPillText, !isOnline ? styles.dutyTextOffActive : styles.dutyTextInactive]}>
              OFF DUTY
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.progressContainer}>
        <View style={styles.progressLabelRow}>
          <Text style={styles.progressLabel}>Delivery Route Progress</Text>
          <Text style={styles.progressValue}>
            {completedStops} / {totalStops} Stops
          </Text>
        </View>
        <View style={styles.progressBarTrack}>
          <View
            style={[
              styles.progressBarFill,
              {
                width: `${totalStops > 0 ? (completedStops / totalStops) * 100 : 0}%`,
              },
            ]}
          />
        </View>
      </View>

      <View style={styles.statsRow}>
        <View style={styles.statItem}>
          <Ionicons name="speedometer-outline" size={18} color="#059669" />
          <Text style={styles.statNumber}>{distanceKm}</Text>
          <Text style={styles.statSub}>Distance</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Ionicons name="checkmark-done-circle-outline" size={18} color="#10B981" />
          <Text style={styles.statNumber}>{completedStops}</Text>
          <Text style={styles.statSub}>Delivered</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Ionicons name="time-outline" size={18} color="#F59E0B" />
          <Text style={styles.statNumber}>{totalStops - completedStops}</Text>
          <Text style={styles.statSub}>Remaining</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#059669',
    borderRadius: 22,
    padding: 18,
    marginBottom: 16,
    elevation: 4,
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  statusInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 6,
  },
  indicatorDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 8,
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  statusTitle: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 15,
  },
  dutyPillToggle: {
    flexDirection: 'row',
    backgroundColor: 'rgba(0, 0, 0, 0.25)',
    borderRadius: 20,
    padding: 3,
  },
  dutyPillBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 16,
  },
  dutyPillOnActive: {
    backgroundColor: '#FFFFFF',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
  },
  dutyPillOffActive: {
    backgroundColor: '#FEE2E2',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
  },
  statusDotSmall: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 5,
  },
  dutyPillText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  dutyTextOnActive: {
    color: '#065F46',
  },
  dutyTextOffActive: {
    color: '#991B1B',
  },
  dutyTextInactive: {
    color: 'rgba(255, 255, 255, 0.85)',
  },
  progressContainer: {
    marginBottom: 16,
  },
  progressLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  progressLabel: {
    color: '#D1FAE5',
    fontSize: 12,
    fontWeight: '600',
  },
  progressValue: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  progressBarTrack: {
    height: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 4,
  },
  statsRow: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
    marginTop: 2,
  },
  statSub: {
    color: '#ECFDF5',
    fontSize: 11,
    fontWeight: '500',
    marginTop: 1,
  },
  statDivider: {
    width: 1,
    height: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
});
