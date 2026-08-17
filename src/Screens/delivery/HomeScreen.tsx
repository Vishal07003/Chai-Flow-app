import React, { useState } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import DeliveryHeader from '../../components/delivery/DeliveryHeader';
import StatusCard from '../../components/delivery/StatusCard';
import EarningsCard from '../../components/delivery/EarningsCard';
import MapCard from '../../components/delivery/MapCard';
import OrderCard, { DeliveryOrder } from '../../components/delivery/OrderCard';
import { useApp } from '../../context/AppContext';

export default function HomeScreen({ navigation }: any) {
  const { schedules } = useApp();
  const [dutyStatus, setDutyStatus] = useState<'ON_DUTY' | 'EN_ROUTE' | 'OFF_DUTY'>('ON_DUTY');

  const initialOrders: DeliveryOrder[] = schedules.map((sch, idx) => ({
    id: sch.id,
    sequence: idx + 1,
    customerName: sch.customerName,
    phone: '9876543210',
    address: sch.address,
    items: `${sch.itemsCount}x Masala Chai Cups`,
    amount: sch.itemsCount * 20,
    paymentMode: 'COD',
    status: sch.status === 'COMPLETED' ? 'DELIVERED' : 'EN_ROUTE',
    timeSlot: sch.timeSlot,
  }));

  const [orders, setOrders] = useState<DeliveryOrder[]>(
    initialOrders.length > 0
      ? initialOrders
      : [
          {
            id: 'd1',
            sequence: 1,
            customerName: 'Commercial Street Store',
            phone: '9876543210',
            address: 'Shop 12, Commercial Street, Sector 4',
            items: '45x Masala Chai Cups • 10x Samosa',
            amount: 900,
            paymentMode: 'COD',
            status: 'EN_ROUTE',
            timeSlot: '07:00 AM - 08:30 AM',
          },
          {
            id: 'd2',
            sequence: 2,
            customerName: 'Chai Point Corner',
            phone: '9812345678',
            address: 'Plot 45, Tech Park Phase 2',
            items: '60x Ginger Tea Cups',
            amount: 1200,
            paymentMode: 'ONLINE',
            status: 'PENDING',
            timeSlot: '09:00 AM - 10:30 AM',
          },
        ],
  );

  const completedCount = orders.filter(o => o.status === 'DELIVERED').length;

  const handleStatusChange = (orderId: string, nextStatus: 'EN_ROUTE' | 'DELIVERED') => {
    setOrders(prev =>
      prev.map(o => (o.id === orderId ? { ...o, status: nextStatus } : o)),
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <DeliveryHeader title="Delivery Dashboard" />
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <StatusCard
          dutyStatus={dutyStatus}
          onToggleDuty={status => setDutyStatus(status)}
          completedStops={completedCount}
          totalStops={orders.length}
        />

        <EarningsCard
          todayEarnings={1450}
          totalDeliveries={completedCount}
          codCollected={900}
          onPressDetails={() => navigation.navigate('Earnings')}
        />

        <MapCard
          destinationAddress={orders.find(o => o.status !== 'DELIVERED')?.address || 'No active route'}
          onPressStartNav={() => navigation.navigate('Navigation')}
        />

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Today's Assigned Runs</Text>
          <TouchableOpacity onPress={() => navigation.navigate('Orders')}>
            <Text style={styles.seeAllText}>View All ({orders.length})</Text>
          </TouchableOpacity>
        </View>

        {orders.map(order => (
          <OrderCard
            key={order.id}
            order={order}
            onPress={() => navigation.navigate('OrderDetails', { order })}
            onStatusChange={handleStatusChange}
          />
        ))}
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
    paddingBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    marginTop: 6,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#111827',
  },
  seeAllText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#059669',
  },
});
