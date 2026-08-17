import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { ScheduleItem } from '../../types/delivery';

export interface ScheduleTileProps {
  schedule: ScheduleItem;
  onPress?: (schedule: ScheduleItem) => void;
}

export default function ScheduleTile({ schedule, onPress }: ScheduleTileProps) {
  const { timeSlot, title, customerName, address, status, itemsCount } = schedule;

  const isCompleted = status === 'COMPLETED';
  const isInProgress = status === 'IN_PROGRESS';

  const badgeBg = isCompleted ? '#D1FAE5' : isInProgress ? '#DBEAFE' : '#FEF3C7';
  const badgeText = isCompleted ? '#059669' : isInProgress ? '#2563EB' : '#D97706';

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      style={styles.tile}
      onPress={onPress ? () => onPress(schedule) : undefined}
      disabled={!onPress}
    >
      <View style={styles.timeBadge}>
        <Ionicons name="time-outline" size={14} color="#8C331A" />
        <Text style={styles.timeText}>{timeSlot}</Text>
      </View>

      <View style={styles.info}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.customer}>{customerName} • {itemsCount} items</Text>
        <Text style={styles.address} numberOfLines={1}>{address}</Text>
      </View>

      <View style={[styles.statusBadge, { backgroundColor: badgeBg }]}>
        <Text style={[styles.statusText, { color: badgeText }]}>{status}</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  tile: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
  },
  timeBadge: {
    backgroundColor: '#F7EFE9',
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 8,
    alignItems: 'center',
    marginRight: 12,
  },
  timeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#8C331A',
    marginTop: 2,
  },
  info: {
    flex: 1,
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1E293B',
  },
  customer: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  address: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginLeft: 8,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '700',
  },
});
