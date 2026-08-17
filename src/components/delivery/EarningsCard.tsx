import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';

interface EarningsCardProps {
  todayEarnings: number;
  totalDeliveries: number;
  codCollected: number;
  incentiveAmount?: number;
  onPressDetails?: () => void;
}

export default function EarningsCard({
  todayEarnings,
  totalDeliveries,
  codCollected,
  incentiveAmount = 150,
  onPressDetails,
}: EarningsCardProps) {
  return (
    <TouchableOpacity
      activeOpacity={0.9}
      style={styles.card}
      onPress={onPressDetails}
    >
      <View style={styles.topHeader}>
        <View>
          <Text style={styles.subText}>TODAY'S EARNINGS</Text>
          <Text style={styles.mainEarnings}>₹{todayEarnings.toLocaleString('en-IN')}</Text>
        </View>
        <View style={styles.iconCircle}>
          <Ionicons name="wallet-outline" size={24} color="#059669" />
        </View>
      </View>

      <View style={styles.divider} />

      <View style={styles.gridRow}>
        <View style={styles.gridCol}>
          <Text style={styles.colLabel}>Deliveries</Text>
          <Text style={styles.colVal}>{totalDeliveries}</Text>
        </View>
        <View style={styles.gridCol}>
          <Text style={styles.colLabel}>COD Collected</Text>
          <Text style={styles.colVal}>₹{codCollected.toLocaleString('en-IN')}</Text>
        </View>
        <View style={styles.gridCol}>
          <Text style={styles.colLabel}>Bonus / Tip</Text>
          <Text style={[styles.colVal, { color: '#059669' }]}>+₹{incentiveAmount}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 18,
    marginBottom: 14,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    borderWidth: 1,
    borderColor: '#EFECE8',
  },
  topHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  subText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#6B7280',
    letterSpacing: 0.8,
  },
  mainEarnings: {
    fontSize: 28,
    fontWeight: '800',
    color: '#111827',
    marginTop: 4,
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#ECFDF5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  divider: {
    height: 1,
    backgroundColor: '#F3F4F6',
    marginVertical: 14,
  },
  gridRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  gridCol: {
    flex: 1,
  },
  colLabel: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },
  colVal: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1F2937',
    marginTop: 3,
  },
});
