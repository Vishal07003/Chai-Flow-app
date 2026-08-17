import React, { useState, useMemo } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import DeliveryHeader from '../../components/delivery/DeliveryHeader';
import OrderCard, { DeliveryOrder } from '../../components/delivery/OrderCard';
import { useApp } from '../../context/AppContext';

export default function OrdersScreen({ navigation }: any) {
  const { invoices, updateOrderDeliveryStatus } = useApp();
  const [filter, setFilter] = useState<'ALL' | 'PENDING' | 'DELIVERED'>('ALL');

  const defaultMockOrders: DeliveryOrder[] = [
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
    {
      id: 'd3',
      sequence: 3,
      customerName: 'Sharma Snacks Bar',
      phone: '9890123456',
      address: 'Near Metro Gate 2, Main Market',
      items: '30x Special Elaichi Chai',
      amount: 600,
      paymentMode: 'COD',
      status: 'DELIVERED',
      timeSlot: '06:00 AM - 07:00 AM',
    },
  ];

  const orders: DeliveryOrder[] = useMemo(() => {
    if (!invoices || invoices.length === 0) return defaultMockOrders;

    const mappedFromInvoices: DeliveryOrder[] = invoices.map((inv, idx) => {
      let mappedStatus: 'PENDING' | 'EN_ROUTE' | 'DELIVERED' = 'PENDING';
      if (inv.deliveryStatus === 'Delivered') {
        mappedStatus = 'DELIVERED';
      } else if (inv.deliveryStatus === 'Out for delivery') {
        mappedStatus = 'EN_ROUTE';
      }

      const itemSummary =
        inv.items && inv.items.length > 0
          ? inv.items.map(i => `${i.qty}x ${i.name}`).join(' • ')
          : 'Chai Powder & Supplies';

      return {
        id: inv.id,
        sequence: idx + 1,
        customerName: inv.name,
        phone: inv.customerPhone || '9876543210',
        address: inv.customerAddress || 'Local Market Area',
        items: itemSummary,
        amount: inv.numericAmount || parseInt(inv.amount.replace(/[^0-9]/g, '')) || 500,
        paymentMode: inv.status === 'PAID' ? 'ONLINE' : 'COD',
        status: mappedStatus,
        timeSlot: 'Today Shift',
      };
    });

    return mappedFromInvoices;
  }, [invoices]);

  const filteredOrders = orders.filter(o => {
    if (filter === 'PENDING') return o.status !== 'DELIVERED';
    if (filter === 'DELIVERED') return o.status === 'DELIVERED';
    return true;
  });

  const handleStatusChange = (
    orderId: string,
    nextStatus: 'EN_ROUTE' | 'DELIVERED',
  ) => {
    const targetStatus = nextStatus === 'DELIVERED' ? 'Delivered' : 'Out for delivery';
    updateOrderDeliveryStatus(orderId, targetStatus);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <DeliveryHeader title="Delivery Orders" showBack={true} />

      <View style={styles.tabsRow}>
        {(['ALL', 'PENDING', 'DELIVERED'] as const).map(t => {
          const isActive = filter === t;
          return (
            <TouchableOpacity
              key={t}
              activeOpacity={0.8}
              onPress={() => setFilter(t)}
              style={[styles.tabChip, isActive && styles.activeTabChip]}
            >
              <Text style={[styles.tabText, isActive && styles.activeTabText]}>
                {t} (
                {t === 'ALL'
                  ? orders.length
                  : orders.filter(o =>
                      t === 'DELIVERED'
                        ? o.status === 'DELIVERED'
                        : o.status !== 'DELIVERED',
                    ).length}
                )
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {filteredOrders.map(order => (
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
  tabsRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#EFECE8',
  },
  tabChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    marginRight: 8,
  },
  activeTabChip: {
    backgroundColor: '#059669',
  },
  tabText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#4B5563',
  },
  activeTabText: {
    color: '#FFFFFF',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 16,
  },
});
