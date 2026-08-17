import React from 'react';
import { Text, StyleSheet, TextStyle } from 'react-native';

export interface InvoiceAmountProps {
  amount: number | string;
  isPaid?: boolean;
  style?: TextStyle;
}

export default function InvoiceAmount({
  amount,
  isPaid = false,
  style,
}: InvoiceAmountProps) {
  const formatted =
    typeof amount === 'number' ? `₹${amount.toLocaleString()}` : amount;

  return (
    <Text style={[styles.text, isPaid ? styles.paid : styles.pending, style]}>
      {formatted}
    </Text>
  );
}

const styles = StyleSheet.create({
  text: {
    fontSize: 16,
    fontWeight: '700',
  },
  pending: {
    color: '#8C331A',
  },
  paid: {
    color: '#10B981',
  },
});
