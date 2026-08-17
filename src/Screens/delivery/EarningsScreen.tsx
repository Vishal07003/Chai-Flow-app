import React from 'react';
import { StyleSheet, View, Text, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import DeliveryHeader from '../../components/delivery/DeliveryHeader';
import EarningsCard from '../../components/delivery/EarningsCard';

export default function EarningsScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <DeliveryHeader title="Earnings & Payouts" showBack={true} />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <EarningsCard
          todayEarnings={1450}
          totalDeliveries={18}
          codCollected={2700}
          incentiveAmount={150}
        />

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Weekly Summary</Text>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Base Delivery Pay</Text>
            <Text style={styles.rowVal}>₹6,800</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Performance Bonus</Text>
            <Text style={[styles.rowVal, { color: '#059669' }]}>+₹850</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Customer Tips</Text>
            <Text style={styles.rowVal}>₹320</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.row}>
            <Text style={styles.totalLabel}>Total Payout Due</Text>
            <Text style={styles.totalVal}>₹7,970</Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAF8F5',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 30,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: '#EFECE8',
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 14,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  rowLabel: {
    fontSize: 13,
    color: '#4B5563',
  },
  rowVal: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
  },
  divider: {
    height: 1,
    backgroundColor: '#F3F4F6',
    marginVertical: 12,
  },
  totalLabel: {
    fontSize: 14,
    fontWeight: '800',
    color: '#111827',
  },
  totalVal: {
    fontSize: 18,
    fontWeight: '800',
    color: '#059669',
  },
});
