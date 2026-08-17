import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Linking, Alert } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';

export interface DeliveryOrder {
  id: string;
  sequence?: number;
  customerName: string;
  phone: string;
  address: string;
  items: string;
  amount: number;
  paymentMode: 'COD' | 'ONLINE' | 'PAID';
  status: 'PENDING' | 'EN_ROUTE' | 'DELIVERED' | 'FAILED';
  distance?: string;
  timeSlot?: string;
}

interface OrderCardProps {
  order: DeliveryOrder;
  onPress?: () => void;
  onStatusChange?: (orderId: string, nextStatus: 'EN_ROUTE' | 'DELIVERED') => void;
}

export default function OrderCard({ order, onPress, onStatusChange }: OrderCardProps) {
  const handleCall = () => {
    if (order.phone) {
      Linking.openURL(`tel:${order.phone}`).catch(() => {
        Alert.alert('Error', 'Unable to initiate phone call.');
      });
    }
  };

  const handleNavigate = () => {
    const query = encodeURIComponent(order.address);
    Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${query}`).catch(() => {
      Alert.alert('Error', 'Unable to open maps application.');
    });
  };

  const getStatusColor = () => {
    switch (order.status) {
      case 'DELIVERED':
        return '#10B981';
      case 'EN_ROUTE':
        return '#3B82F6';
      case 'FAILED':
        return '#EF4444';
      default:
        return '#F59E0B';
    }
  };

  return (
    <TouchableOpacity
      activeOpacity={0.9}
      style={styles.card}
      onPress={onPress}
    >
      <View style={styles.headerRow}>
        <View style={styles.seqBadge}>
          <Text style={styles.seqText}>#{order.sequence || 1}</Text>
        </View>
        <View style={styles.titleWrapper}>
          <Text style={styles.customerName}>{order.customerName}</Text>
          <Text style={styles.timeSlot}>{order.timeSlot || 'Morning Shift • 07:00 AM'}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor() + '18' }]}>
          <View style={[styles.statusDot, { backgroundColor: getStatusColor() }]} />
          <Text style={[styles.statusText, { color: getStatusColor() }]}>
            {order.status}
          </Text>
        </View>
      </View>

      <View style={styles.addressRow}>
        <Ionicons name="location" size={18} color="#059669" style={styles.iconMargin} />
        <Text style={styles.addressText} numberOfLines={2}>
          {order.address}
        </Text>
      </View>

      <View style={styles.itemsRow}>
        <Ionicons name="cube-outline" size={16} color="#6B7280" style={styles.iconMargin} />
        <Text style={styles.itemsText} numberOfLines={1}>
          {order.items}
        </Text>
      </View>

      <View style={styles.footerRow}>
        <View>
          <Text style={styles.amountLabel}>Collect Payment ({order.paymentMode})</Text>
          <Text style={styles.amountValue}>₹{order.amount.toLocaleString('en-IN')}</Text>
        </View>

        <View style={styles.actionsGroup}>
          <TouchableOpacity activeOpacity={0.8} style={styles.iconBtn} onPress={handleCall}>
            <Ionicons name="call" size={18} color="#059669" />
          </TouchableOpacity>
          <TouchableOpacity activeOpacity={0.8} style={styles.iconBtn} onPress={handleNavigate}>
            <Ionicons name="navigate" size={18} color="#3B82F6" />
          </TouchableOpacity>
          {order.status !== 'DELIVERED' && onStatusChange && (
            <TouchableOpacity
              activeOpacity={0.8}
              style={styles.deliverBtn}
              onPress={() => onStatusChange(order.id, 'DELIVERED')}
            >
              <Text style={styles.deliverBtnText}>Deliver</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    borderWidth: 1,
    borderColor: '#EFECE8',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  seqBadge: {
    backgroundColor: '#ECFDF5',
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  seqText: {
    color: '#059669',
    fontWeight: '800',
    fontSize: 13,
  },
  titleWrapper: {
    flex: 1,
  },
  customerName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
  },
  timeSlot: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.4,
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  iconMargin: {
    marginRight: 8,
    marginTop: 2,
  },
  addressText: {
    flex: 1,
    fontSize: 13,
    color: '#374151',
    lineHeight: 18,
  },
  itemsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    padding: 8,
    borderRadius: 10,
    marginBottom: 12,
  },
  itemsText: {
    fontSize: 12,
    color: '#4B5563',
    fontWeight: '500',
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    paddingTop: 10,
  },
  amountLabel: {
    fontSize: 11,
    color: '#6B7280',
    fontWeight: '600',
  },
  amountValue: {
    fontSize: 16,
    fontWeight: '800',
    color: '#059669',
    marginTop: 2,
  },
  actionsGroup: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  deliverBtn: {
    backgroundColor: '#059669',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 14,
    marginLeft: 10,
  },
  deliverBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
});
