import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Linking,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';
import DeliveryHeader from '../../components/delivery/DeliveryHeader';
import { useApp } from '../../context/AppContext';

export default function OrderDetailsScreen({ route, navigation }: any) {
  const { addCupRecord, updateOrderDeliveryStatus, markInvoiceAsPaid } =
    useApp();
  const order = route.params?.order || {
    id: 'd1',
    sequence: 1,
    customerName: 'Commercial Street Store',
    phone: '9876543210',
    address: 'Shop 12, Commercial Street, Sector 4',
    items: '45x Masala Chai Cups',
    amount: 900,
    paymentMode: 'COD',
    status: 'EN_ROUTE',
    timeSlot: '07:00 AM - 08:30 AM',
  };

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [isConfirmModalVisible, setIsConfirmModalVisible] = useState(false);

  const handleCall = () => {
    Linking.openURL(`tel:${order.phone}`).catch(() => {});
  };

  const handleNavigate = () => {
    const query = encodeURIComponent(order.address);
    Linking.openURL(
      `https://www.google.com/maps/search/?api=1&query=${query}`,
    ).catch(() => {});
  };

  const handleMarkDelivered = () => {
    if (isSubmitting || order.status === 'DELIVERED') return;
    setIsSubmitting(true);

    updateOrderDeliveryStatus(order.id, 'Delivered');
    markInvoiceAsPaid(order.id);
    addCupRecord(order.customerName, 45, 'Masala Chai');

    setToastMessage('Order Delivered & Payment Recorded Successfully! 🎉');

    setTimeout(() => {
      navigation.goBack();
    }, 1800);
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Top Banner Toast Message */}
      {toastMessage ? (
        <View style={styles.topToastContainer}>
          <Ionicons
            name="checkmark-circle"
            size={22}
            color="#FFFFFF"
            style={{ marginRight: 8 }}
          />
          <Text style={styles.topToastText}>{toastMessage}</Text>
        </View>
      ) : null}

      <DeliveryHeader title="Order Details" showBack={true} />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.card}>
          <View style={styles.badgeRow}>
            <Text style={styles.seqText}>STOP #{order.sequence || 1}</Text>
            <View style={styles.statusBadge}>
              <Text style={styles.statusBadgeText}>{order.status}</Text>
            </View>
          </View>

          <Text style={styles.customerName}>{order.customerName}</Text>
          <Text style={styles.timeSlot}>Scheduled Shift: {order.timeSlot}</Text>

          <View style={styles.divider} />

          <Text style={styles.sectionLabel}>DELIVERY LOCATION</Text>
          <Text style={styles.addressText}>{order.address}</Text>

          <View style={styles.actionRow}>
            <TouchableOpacity
              activeOpacity={0.8}
              style={styles.actionBtn}
              onPress={handleCall}
            >
              <Ionicons name="call" size={18} color="#059669" />
              <Text style={styles.actionBtnText}>Call Customer</Text>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.8}
              style={[styles.actionBtn, styles.navBtn]}
              onPress={handleNavigate}
            >
              <Ionicons name="navigate" size={18} color="#3B82F6" />
              <Text style={[styles.actionBtnText, { color: '#3B82F6' }]}>
                Open Maps
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionLabel}>ORDER SUMMARY</Text>
          <View style={styles.itemRow}>
            <Text style={styles.itemName}>{order.items}</Text>
            <Text style={styles.itemPrice}>₹{order.amount}</Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>
              Collect Payment ({order.paymentMode})
            </Text>
            <Text style={styles.totalVal}>₹{order.amount}</Text>
          </View>
        </View>

        <TouchableOpacity
          activeOpacity={0.85}
          style={[
            styles.deliverBtn,
            (isSubmitting || order.status === 'DELIVERED') &&
              styles.deliverBtnDisabled,
          ]}
          onPress={() => setIsConfirmModalVisible(true)}
          disabled={isSubmitting || order.status === 'DELIVERED'}
        >
          {isSubmitting ? (
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <ActivityIndicator
                size="small"
                color="#FFFFFF"
                style={{ marginRight: 8 }}
              />
              <Text style={styles.deliverBtnText}>Delivering Order...</Text>
            </View>
          ) : order.status === 'DELIVERED' ? (
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Ionicons
                name="checkmark-done"
                size={20}
                color="#FFFFFF"
                style={{ marginRight: 8 }}
              />
              <Text style={styles.deliverBtnText}>Order Delivered</Text>
            </View>
          ) : (
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Ionicons
                name="checkmark-circle"
                size={20}
                color="#FFFFFF"
                style={{ marginRight: 8 }}
              />
              <Text style={styles.deliverBtnText}>Confirm Order Delivery</Text>
            </View>
          )}
        </TouchableOpacity>
      </ScrollView>

      {/* Confirmation Dialog Modal */}
      <Modal
        visible={isConfirmModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setIsConfirmModalVisible(false)}
      >
        <View style={styles.confirmModalOverlay}>
          <View style={styles.confirmModalBox}>
            <View style={styles.confirmModalIconContainer}>
              <Ionicons
                name="checkmark-done-circle"
                size={42}
                color="#059669"
              />
            </View>

            <Text style={styles.confirmModalTitle}>Confirm Order Delivery</Text>
            <Text style={styles.confirmModalSub}>
              Are you sure you want to mark this order for{' '}
              <Text style={{ fontWeight: '800', color: '#111827' }}>
                {order.customerName}
              </Text>{' '}
              as delivered and collect{' '}
              <Text style={{ fontWeight: '800', color: '#059669' }}>
                ₹{order.amount}
              </Text>
              ?
            </Text>

            <View style={styles.confirmModalBtnRow}>
              <TouchableOpacity
                activeOpacity={0.8}
                style={styles.cancelModalBtn}
                onPress={() => setIsConfirmModalVisible(false)}
              >
                <Text style={styles.cancelModalBtnText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.85}
                style={styles.confirmModalBtn}
                onPress={() => {
                  setIsConfirmModalVisible(false);
                  handleMarkDelivered();
                }}
              >
                <Text style={styles.confirmModalBtnText}>Confirm</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#EFECE8',
  },
  badgeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  seqText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#059669',
  },
  statusBadge: {
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusBadgeText: {
    color: '#059669',
    fontSize: 11,
    fontWeight: '700',
  },
  customerName: {
    fontSize: 20,
    fontWeight: '800',
    color: '#111827',
  },
  timeSlot: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 4,
  },
  divider: {
    height: 1,
    backgroundColor: '#F3F4F6',
    marginVertical: 14,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#9CA3AF',
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  addressText: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
  },
  actionRow: {
    flexDirection: 'row',
    marginTop: 14,
  },
  actionBtn: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#ECFDF5',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  navBtn: {
    backgroundColor: '#EFF6FF',
    marginRight: 0,
  },
  actionBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#059669',
    marginLeft: 6,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 8,
  },
  itemName: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '600',
  },
  itemPrice: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#4B5563',
  },
  totalVal: {
    fontSize: 18,
    fontWeight: '800',
    color: '#059669',
  },
  deliverBtn: {
    backgroundColor: '#059669',
    borderRadius: 18,
    height: 52,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  deliverBtnDisabled: {
    backgroundColor: '#9CA3AF',
    opacity: 0.85,
  },
  deliverBtnText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 15,
  },
  topToastContainer: {
    position: 'absolute',
    top: 10,
    left: 16,
    right: 16,
    zIndex: 999,
    backgroundColor: '#059669',
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 8,
  },
  topToastText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
    flex: 1,
  },
  confirmModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  confirmModalBox: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 10,
  },
  confirmModalIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#ECFDF5',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  confirmModalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 8,
    textAlign: 'center',
  },
  confirmModalSub: {
    fontSize: 14,
    color: '#4B5563',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  confirmModalBtnRow: {
    flexDirection: 'row',
    width: '100%',
  },
  cancelModalBtn: {
    flex: 1,
    height: 48,
    borderRadius: 14,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  cancelModalBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#4B5563',
  },
  confirmModalBtn: {
    flex: 1,
    height: 48,
    borderRadius: 14,
    backgroundColor: '#059669',
    justifyContent: 'center',
    alignItems: 'center',
  },
  confirmModalBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
  },
});
