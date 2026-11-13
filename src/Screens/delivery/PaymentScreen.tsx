import React, { useState } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import DeliveryHeader from '../../components/delivery/DeliveryHeader';
import PaymentCard, { DeliveryPayment } from '../../components/delivery/PaymentCard';
import { CustomDialog } from '../../components/common';

export default function PaymentScreen() {
  const [dialogConfig, setDialogConfig] = useState<{
    visible: boolean;
    title: string;
    message?: string;
    type?: 'confirm' | 'danger' | 'info' | 'warning' | 'success';
    buttons?: Array<{
      text: string;
      style?: 'default' | 'cancel' | 'destructive';
      onPress?: () => void;
    }>;
  }>({
    visible: false,
    title: '',
  });

  const closeDialog = () => setDialogConfig(prev => ({ ...prev, visible: false }));
  const payments: DeliveryPayment[] = [
    {
      id: 'p1',
      customerName: 'Commercial Street Store',
      amount: 900,
      mode: 'COD',
      time: '08:15 AM',
      status: 'PENDING_DEPOSIT',
    },
    {
      id: 'p2',
      customerName: 'Sharma Snacks Bar',
      amount: 600,
      mode: 'COD',
      time: '07:30 AM',
      status: 'SETTLED',
    },
    {
      id: 'p3',
      customerName: 'Chai Point Corner',
      amount: 1200,
      mode: 'UPI',
      time: '09:10 AM',
      status: 'SETTLED',
    },
  ];

  const totalCashCollected = payments
    .filter(p => p.mode === 'COD')
    .reduce((sum, p) => sum + p.amount, 0);

  const handleDepositToHub = () => {
    setDialogConfig({
      visible: true,
      title: 'Cash Handover',
      message: 'Requested cash handover confirmation from Hub Manager.',
      type: 'info',
      buttons: [{ text: 'OK', onPress: closeDialog }],
    });
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <DeliveryHeader title="COD Collections & Cash" showBack={true} />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>CASH IN HAND (TO HANDOVER)</Text>
          <Text style={styles.summaryValue}>₹{totalCashCollected.toLocaleString('en-IN')}</Text>

          <TouchableOpacity activeOpacity={0.85} style={styles.depositBtn} onPress={handleDepositToHub}>
            <Text style={styles.depositBtnText}>Confirm Handover to Hub</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.sectionTitle}>Today's Payment Ledger</Text>

        {payments.map(payment => (
          <PaymentCard key={payment.id} payment={payment} />
        ))}
      </ScrollView>

      {/* CUSTOM DIALOG POPUP */}
      <CustomDialog
        visible={dialogConfig.visible}
        title={dialogConfig.title}
        message={dialogConfig.message}
        type={dialogConfig.type}
        buttons={dialogConfig.buttons}
        onClose={closeDialog}
      />
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
    paddingBottom: 16,
  },
  summaryCard: {
    backgroundColor: '#059669',
    borderRadius: 20,
    padding: 18,
    marginBottom: 20,
  },
  summaryLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#D1FAE5',
    letterSpacing: 0.8,
  },
  summaryValue: {
    fontSize: 32,
    fontWeight: '800',
    color: '#FFFFFF',
    marginVertical: 6,
  },
  depositBtn: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    height: 42,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  depositBtnText: {
    color: '#059669',
    fontWeight: '800',
    fontSize: 13,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 12,
  },
});
