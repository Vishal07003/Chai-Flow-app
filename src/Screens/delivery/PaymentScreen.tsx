import React from 'react';
import { StyleSheet, View, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';
import DeliveryHeader from '../../components/delivery/DeliveryHeader';

export default function PaymentScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <DeliveryHeader title="Payments & Settlements" showBack={true} />
      <View style={styles.content}>
        <Ionicons name="lock-closed-outline" size={48} color="#9CA3AF" />
        <Text style={styles.title}>Payment Collection Managed by Owner</Text>
        <Text style={styles.sub}>
          Financial accounting and client ledger settlements are maintained directly by the business owner.
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAF8F5',
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: '#374151',
    marginTop: 12,
    textAlign: 'center',
  },
  sub: {
    fontSize: 13,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 18,
  },
});
