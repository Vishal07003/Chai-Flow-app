import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { NotificationItem } from '../../types/auth';

export interface NotificationTileProps {
  notification: NotificationItem;
  onPress?: (notification: NotificationItem) => void;
  onDelete?: (id: string) => void;
}

export default function NotificationTile({
  notification,
  onPress,
  onDelete,
}: NotificationTileProps) {
  const { id, title, message, time, type, isRead } = notification;

  const getIconInfo = () => {
    switch (type) {
      case 'payment':
        return { name: 'cash-outline', color: '#10B981', bg: '#D1FAE5' };
      case 'order':
        return { name: 'cart-outline', color: '#3B82F6', bg: '#DBEAFE' };
      case 'overdue':
        return { name: 'warning-outline', color: '#EF4444', bg: '#FEE2E2' };
      default:
        return { name: 'notifications-outline', color: '#8C331A', bg: '#F7EFE9' };
    }
  };

  const iconInfo = getIconInfo();

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      style={[styles.card, !isRead && styles.unreadCard]}
      onPress={onPress ? () => onPress(notification) : undefined}
      disabled={!onPress}
    >
      <View style={[styles.iconCircle, { backgroundColor: iconInfo.bg }]}>
        <Ionicons name={iconInfo.name} size={20} color={iconInfo.color} />
      </View>

      <View style={styles.content}>
        <View style={styles.headerRow}>
          <Text style={styles.title} numberOfLines={1}>{title}</Text>
          <Text style={styles.time}>{time}</Text>
        </View>
        <Text style={styles.message} numberOfLines={2}>{message}</Text>
      </View>

      {onDelete ? (
        <TouchableOpacity
          onPress={() => onDelete(id)}
          style={styles.deleteBtn}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="close" size={18} color="#94A3B8" />
        </TouchableOpacity>
      ) : null}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 14,
    borderRadius: 14,
    marginBottom: 10,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 3,
  },
  unreadCard: {
    backgroundColor: '#FAF5F0',
    borderLeftWidth: 3,
    borderLeftColor: '#8C331A',
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  content: {
    flex: 1,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1E293B',
    flex: 1,
    marginRight: 8,
  },
  time: {
    fontSize: 11,
    color: '#94A3B8',
  },
  message: {
    fontSize: 13,
    color: '#64748B',
    lineHeight: 18,
  },
  deleteBtn: {
    marginLeft: 8,
    padding: 4,
  },
});
