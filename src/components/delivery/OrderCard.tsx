import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Linking, Alert } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { colors, radius, spacing, typography } from '../../theme';

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
        return colors.approved;
      case 'EN_ROUTE':
        return colors.info;
      case 'FAILED':
        return colors.correction;
      default:
        return colors.pending;
    }
  };

  const getStatusBgColor = () => {
    switch (order.status) {
      case 'DELIVERED':
        return colors.approvedBackground;
      case 'EN_ROUTE':
        return colors.infoBackground;
      case 'FAILED':
        return colors.correctionBackground;
      default:
        return colors.pendingBackground;
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
        <View style={[styles.statusBadge, { backgroundColor: getStatusBgColor() }]}>
          <View style={[styles.statusDot, { backgroundColor: getStatusColor() }]} />
          <Text style={[styles.statusText, { color: getStatusColor() }]}>
            {order.status}
          </Text>
        </View>
      </View>

      <View style={styles.addressRow}>
        <Ionicons name="location" size={18} color={colors.approved} style={styles.iconMargin} />
        <Text style={styles.addressText} numberOfLines={2}>
          {order.address}
        </Text>
      </View>

      <View style={styles.itemsRow}>
        <Ionicons name="cart-outline" size={18} color={colors.secondaryText} style={styles.iconMargin} />
        <Text style={styles.itemsText} numberOfLines={1}>
          {order.items}
        </Text>
      </View>

      <View style={styles.footerDivider} />

      <View style={styles.footerRow}>
        <View style={styles.paymentInfo}>
          <Text style={styles.amountLabel}>Total Amount</Text>
          <Text style={styles.amountValue}>₹{order.amount}</Text>
        </View>

        <View style={styles.actionsContainer}>
          <TouchableOpacity
            style={styles.actionIconBtn}
            onPress={handleCall}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="call" size={20} color={colors.primary} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionIconBtn}
            onPress={handleNavigate}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="navigate" size={20} color={colors.approved} />
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surfaceContainer,
    borderRadius: radius.LG,
    padding: spacing.LG,
    marginBottom: spacing.MD,
    borderWidth: 1,
    borderColor: colors.border,
    elevation: 2,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  seqBadge: {
    backgroundColor: colors.surfaceContainerLow,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.SM,
    marginRight: 8,
  },
  seqText: {
    ...typography.badge,
    color: colors.primary,
  },
  titleWrapper: {
    flex: 1,
  },
  customerName: {
    ...typography.heading2,
    color: colors.primary,
  },
  timeSlot: {
    ...typography.caption,
    color: colors.secondaryText,
    marginTop: 2,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.SM,
    paddingVertical: spacing.XS,
    borderRadius: radius.FULL,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 5,
  },
  statusText: {
    ...typography.badge,
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  itemsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  iconMargin: {
    marginRight: 8,
    marginTop: 1,
  },
  addressText: {
    ...typography.body,
    color: colors.secondaryText,
    flex: 1,
  },
  itemsText: {
    ...typography.body,
    color: colors.primary,
    flex: 1,
    fontWeight: '500',
  },
  footerDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginBottom: 12,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  paymentInfo: {
    justifyContent: 'center',
  },
  amountLabel: {
    ...typography.caption,
    color: colors.secondaryText,
  },
  amountValue: {
    ...typography.heading1,
    color: colors.primary,
  },
  actionsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionIconBtn: {
    width: 40,
    height: 40,
    borderRadius: radius.FULL,
    backgroundColor: colors.surfaceContainerLow,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
});
