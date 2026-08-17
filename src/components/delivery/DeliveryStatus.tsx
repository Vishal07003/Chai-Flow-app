import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';

export interface DeliveryStatusProps {
  status: 'BUSY' | 'READY' | 'OFFLINE' | string;
  style?: ViewStyle;
}

export default function DeliveryStatus({ status, style }: DeliveryStatusProps) {
  const isBusy = status === 'BUSY';
  const isReady = status === 'READY';

  const bgColor = isBusy ? '#FEF3C7' : isReady ? '#D1FAE5' : '#F1F5F9';
  const textColor = isBusy ? '#D97706' : isReady ? '#059669' : '#64748B';

  return (
    <View style={[styles.badge, { backgroundColor: bgColor }, style]}>
      <Text style={[styles.text, { color: textColor }]}>{status}</Text>
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
