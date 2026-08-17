import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';

export interface DeliveryPayment {
  id: string;
  customerName: string;
  amount: number;
  mode: 'COD' | 'ONLINE' | 'UPI';
  time: string;
  status: 'SETTLED' | 'PENDING_DEPOSIT';
}

interface PaymentCardProps {
  payment: DeliveryPayment;
  onPressDeposit?: () => void;
}

export default function PaymentCard({ payment, onPressDeposit }: PaymentCardProps) {
  const isSettled = payment.status === 'SETTLED';

  return (
    <View style={styles.card}>
      <View style={styles.leftCol}>
        <View style={[styles.iconBox, { backgroundColor: isSettled ? '#ECFDF5' : '#FEF3C7' }]}>
          <Ionicons
            name={payment.mode === 'COD' ? 'cash-outline' : 'card-outline'}
            size={20}
            color={isSettled ? '#059669' : '#D97706'}
          />
        </View>
        <View style={styles.infoWrapper}>
          <Text style={styles.customerName}>{payment.customerName}</Text>
          <Text style={styles.timeText}>{payment.time} • {payment.mode}</Text>
        </View>
      </View>

      <View style={styles.rightCol}>
        <Text style={styles.amountText}>₹{payment.amount.toLocaleString('en-IN')}</Text>
        <View style={[styles.badge, { backgroundColor: isSettled ? '#D1FAE5' : '#FEF3C7' }]}>
          <Text style={[styles.badgeText, { color: isSettled ? '#059669' : '#D97706' }]}>
            {isSettled ? 'Handed Over' : 'Pending Hub'}
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#EFECE8',
  },
  leftCol: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  infoWrapper: {
    flex: 1,
  },
  customerName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
  },
  timeText: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  rightCol: {
    alignItems: 'flex-end',
  },
  amountText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#111827',
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    marginTop: 4,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
});
