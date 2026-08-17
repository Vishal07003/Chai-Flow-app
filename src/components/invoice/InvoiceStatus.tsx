import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';

export interface InvoiceStatusProps {
  status: 'PAID' | 'PENDING' | 'OVERDUE' | string;
  style?: ViewStyle;
}

export default function InvoiceStatus({ status, style }: InvoiceStatusProps) {
  const normalized = status.toUpperCase();

  const isPaid = normalized === 'PAID';
  const isOverdue = normalized === 'OVERDUE' || normalized.includes('OVERDUE');

  const bgColor = isPaid ? '#D1FAE5' : isOverdue ? '#FEE2E2' : '#FEF3C7';
  const textColor = isPaid ? '#059669' : isOverdue ? '#DC2626' : '#D97706';

  return (
    <View style={[styles.badge, { backgroundColor: bgColor }, style]}>
      <Text style={[styles.text, { color: textColor }]}>{normalized}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  text: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.4,
  },
});
