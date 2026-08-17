import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Linking,
  Alert,
  Modal,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { Header } from '../../components/common';
import { useApp, InvoiceItem, DeliveryBoyItem } from '../../context/AppContext';

export default function InvoiceDetailScreen({ route, navigation }: any) {
  const { invoice } = route.params || {};
  const {
    userRole,
    updateOrderDeliveryStatus,
    markInvoiceAsPaid,
    customers,
    deliveryBoys,
    assignOrderPartner,
  } = useApp();

  const [currentOrder, setCurrentOrder] = useState<InvoiceItem>(
    invoice || {
      id: 'inv-1',
      invoiceNo: 'ORD-2026-001',
      name: 'Ankit Sharma',
      customerAddress: 'Plot 45, Industrial Area, Phase 2, New Delhi',
      customerPhone: '+91 98765 12345',
      amount: '₹1,240',
      numericAmount: 1240,
      due: 'Due in 2 days',
      date: '27 Jul 2026',
      isOverdue: false,
      status: 'PENDING',
      deliveryPartnerName: 'Rahul Sharma',
      deliveryStatus: 'Out for delivery',
      currentLocation: 'Sector 14, Near Metro Station',
      items: [
        { id: '1', name: 'Premium CTC Tea Dust (5kg)', qty: 2, price: 500 },
        { id: '2', name: 'Special Masala Spices (250g)', qty: 1, price: 240 },
      ],
      subtotal: 1240,
      tax: 0,
      notes: 'Thank you for ordering with ChaiFlow!',
    },
  );

  const [isPartnerModalVisible, setIsPartnerModalVisible] = useState(false);

  const isAdmin = userRole === 'ADMIN';

  const orderIdDisplay = currentOrder.invoiceNo || `ORD-${currentOrder.id}`;
  const isPaid = currentOrder.status === 'PAID';
  const isOverdue = currentOrder.isOverdue || currentOrder.status === 'OVERDUE';
  const delStatus = currentOrder.deliveryStatus || (isPaid ? 'Delivered' : 'Pending');
  const partnerName = currentOrder.deliveryPartnerName || 'Rahul Sharma';
  const currentLocationText =
    currentOrder.currentLocation ||
    (delStatus === 'Delivered'
      ? 'Delivered to Customer'
      : delStatus === 'Out for delivery'
      ? 'In Transit (Sector 14, Near Metro)'
      : 'At Central Warehouse / Store Hub');

  const handleCallCustomer = () => {
    const phone = currentOrder.customerPhone || '+919876512345';
    Linking.openURL(`tel:${phone}`).catch(() => {
      Alert.alert('Error', 'Unable to initiate phone call.');
    });
  };

  const handleUpdateStatusByDeliveryPartner = (
    newStatus: 'Pending' | 'Out for delivery' | 'Delivered',
  ) => {
    if (isAdmin) {
      Alert.alert(
        'Access Denied',
        'Admin can only view the order status and delivery location. Only delivery partners can update the delivery status.',
      );
      return;
    }

    updateOrderDeliveryStatus(currentOrder.id, newStatus);
    setCurrentOrder(prev => ({
      ...prev,
      deliveryStatus: newStatus,
      currentLocation:
        newStatus === 'Delivered'
          ? 'Delivered to Customer'
          : newStatus === 'Out for delivery'
          ? 'In Transit (Near Destination)'
          : 'At Central Warehouse',
    }));
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      {/* Header with Order ID */}
      <Header title={orderIdDisplay} showBack={true} showNotification={false} />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* 1. Summary Card */}
        <View style={styles.summaryCard}>
          <Text style={styles.summaryCardSubtitle}>ORDER SUMMARY</Text>
          <Text style={styles.totalAmountText}>{currentOrder.amount}</Text>

          <View style={styles.badgesContainer}>
            {/* Delivery Status Badge */}
            <View
              style={[
                styles.badge,
                delStatus === 'Delivered'
                  ? styles.badgeDelivered
                  : delStatus === 'Out for delivery'
                  ? styles.badgeTransit
                  : styles.badgePending,
              ]}
            >
              <Text
                style={[
                  styles.badgeText,
                  delStatus === 'Delivered'
                    ? styles.badgeTextDelivered
                    : delStatus === 'Out for delivery'
                    ? styles.badgeTextTransit
                    : styles.badgeTextPending,
                ]}
              >
                {delStatus}
              </Text>
            </View>

            {/* Payment Status Badge */}
            <View
              style={[
                styles.badge,
                isPaid
                  ? styles.badgePaid
                  : isOverdue
                  ? styles.badgeOverdue
                  : styles.badgeUnpaid,
              ]}
            >
              <Text
                style={[
                  styles.badgeText,
                  isPaid
                    ? styles.badgeTextPaid
                    : isOverdue
                    ? styles.badgeTextOverdue
                    : styles.badgeTextUnpaid,
                ]}
              >
                {isPaid ? 'Paid' : isOverdue ? 'Overdue' : 'Unpaid'}
              </Text>
            </View>
          </View>

          {!isPaid && (
            <TouchableOpacity
              activeOpacity={0.8}
              style={styles.markPaidBtn}
              onPress={() => {
                markInvoiceAsPaid(currentOrder.id);
                setCurrentOrder(prev => ({ ...prev, status: 'PAID', isOverdue: false }));
                Alert.alert('Payment Completed 🎉', `Payment of ${currentOrder.amount} marked as completed.`);
              }}
            >
              <Ionicons name="checkmark-done-circle" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
              <Text style={styles.markPaidBtnText}>Mark Payment Completed</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* 2. Customer Card */}
        <TouchableOpacity
          activeOpacity={0.88}
          style={styles.sectionCard}
          onPress={() => {
            const cust = customers.find(
              (c: any) => c.name.toLowerCase() === currentOrder.name.toLowerCase(),
            ) || {
              id: `c_${currentOrder.id}`,
              name: currentOrder.name,
              address: currentOrder.customerAddress || 'Local Market Area',
              amount: currentOrder.numericAmount || 0,
              deliveryStatus: 'Active Customer',
              hasDot: true,
              isOverdue: currentOrder.isOverdue || false,
            };
            navigation.navigate('CustomerDetail', { customer: cust });
          }}
        >
          <View style={styles.customerHeaderRow}>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Text style={styles.sectionTitleLabel}>CUSTOMER DETAILS</Text>
                <Ionicons name="chevron-forward" size={14} color="#A52A0A" style={{ marginLeft: 4 }} />
              </View>
              <Text style={styles.customerName}>{currentOrder.name}</Text>
              {currentOrder.customerAddress && (
                <Text style={styles.customerAddress}>📍 {currentOrder.customerAddress}</Text>
              )}
            </View>

            <TouchableOpacity
              activeOpacity={0.8}
              style={styles.callBtn}
              onPress={handleCallCustomer}
            >
              <Ionicons name="call" size={16} color="#FFFFFF" />
              <Text style={styles.callBtnText}>Call</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>

        {/* 3. Items Section */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitleLabel}>ORDER ITEMS</Text>
          {currentOrder.items && currentOrder.items.length > 0 ? (
            currentOrder.items.map((item, idx) => (
              <View key={item.id || idx.toString()} style={styles.itemRow}>
                <View style={styles.itemLeft}>
                  <Text style={styles.itemName}>{item.name}</Text>
                  <Text style={styles.itemQtyPrice}>
                    Qty: {item.qty} × ₹{item.price}
                  </Text>
                </View>
                <Text style={styles.itemTotal}>₹{(item.qty * item.price).toLocaleString()}</Text>
              </View>
            ))
          ) : (
            <View style={styles.itemRow}>
              <Text style={styles.itemName}>Commercial Chai Powder & Supplies</Text>
              <Text style={styles.itemTotal}>{currentOrder.amount}</Text>
            </View>
          )}

          {/* Subtotal & GST */}
          <View style={styles.calcRow}>
            <Text style={styles.calcLabel}>Subtotal</Text>
            <Text style={styles.calcVal}>₹{(currentOrder.subtotal || currentOrder.numericAmount || 1240).toLocaleString()}</Text>
          </View>
          {currentOrder.tax ? (
            <View style={styles.calcRow}>
              <Text style={styles.calcLabel}>GST (5%)</Text>
              <Text style={styles.calcVal}>₹{currentOrder.tax.toLocaleString()}</Text>
            </View>
          ) : null}
        </View>

        {/* 4. Delivery Partner Section */}
        <View style={styles.sectionCard}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <Text style={styles.sectionTitleLabel}>DELIVERY PARTNER</Text>
            {isAdmin && (
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => setIsPartnerModalVisible(true)}
                style={{ flexDirection: 'row', alignItems: 'center' }}
              >
                <Ionicons name="swap-horizontal" size={14} color="#A52A0A" style={{ marginRight: 4 }} />
                <Text style={{ fontSize: 12, fontWeight: '700', color: '#A52A0A' }}>Re-assign</Text>
              </TouchableOpacity>
            )}
          </View>
          <View style={styles.partnerInfoRow}>
            <View style={styles.partnerAvatar}>
              <Ionicons name="bicycle" size={22} color="#A52A0A" />
            </View>
            <View style={{ marginLeft: 12, flex: 1 }}>
              <Text style={styles.partnerNameText}>{partnerName}</Text>
              <Text style={styles.partnerSubText}>Assigned Fleet Member • Active</Text>
            </View>
          </View>
        </View>

        {/* Delivery Partner Selection Modal */}
        <Modal
          visible={isPartnerModalVisible}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setIsPartnerModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Assign Delivery Partner</Text>
                <TouchableOpacity onPress={() => setIsPartnerModalVisible(false)}>
                  <Ionicons name="close-circle" size={24} color="#9CA3AF" />
                </TouchableOpacity>
              </View>

              <FlatList
                data={deliveryBoys}
                keyExtractor={item => item.id}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={[
                      styles.partnerModalItem,
                      item.name === partnerName && styles.partnerModalItemActive,
                    ]}
                    onPress={() => {
                      assignOrderPartner(currentOrder.id, item.name);
                      setCurrentOrder(prev => ({ ...prev, deliveryPartnerName: item.name }));
                      setIsPartnerModalVisible(false);
                      Alert.alert('Partner Assigned', `Order assigned to ${item.name}`);
                    }}
                  >
                    <View style={styles.partnerItemAvatar}>
                      <Ionicons name="person" size={18} color="#8C331A" />
                    </View>
                    <View style={{ flex: 1, marginLeft: 12 }}>
                      <Text style={styles.partnerItemName}>{item.name}</Text>
                      <Text style={styles.partnerItemStatus}>
                        {item.status === 'READY' ? '🟢 Ready / Available' : item.status === 'BUSY' ? '🔵 Busy on Delivery' : '🔴 Offline'}
                      </Text>
                    </View>
                    {item.name === partnerName && (
                      <Ionicons name="checkmark-circle" size={20} color="#059669" />
                    )}
                  </TouchableOpacity>
                )}
              />
            </View>
          </View>
        </Modal>

        {/* 5. Live Status Section */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitleLabel}>LIVE DELIVERY STATUS</Text>

          <View style={styles.liveStatusBox}>
            <View style={styles.liveStatusHeader}>
              <View
                style={[
                  styles.badge,
                  delStatus === 'Delivered'
                    ? styles.badgeDelivered
                    : delStatus === 'Out for delivery'
                    ? styles.badgeTransit
                    : styles.badgePending,
                ]}
              >
                <Text
                  style={[
                    styles.badgeText,
                    delStatus === 'Delivered'
                      ? styles.badgeTextDelivered
                      : delStatus === 'Out for delivery'
                      ? styles.badgeTextTransit
                      : styles.badgeTextPending,
                  ]}
                >
                  {delStatus}
                </Text>
              </View>

              <View style={styles.livePulseBox}>
                <Ionicons name="navigate-circle" size={18} color="#A52A0A" />
                <Text style={styles.livePulseText}>GPS Tracking</Text>
              </View>
            </View>

            <View style={styles.locationRow}>
              <Ionicons name="location" size={18} color="#A52A0A" style={{ marginTop: 2 }} />
              <View style={{ marginLeft: 8, flex: 1 }}>
                <Text style={styles.locationTitle}>Current Location</Text>
                <Text style={styles.locationAddress}>{currentLocationText}</Text>
              </View>
            </View>
          </View>

          {/* Admin vs Delivery Partner Rule Notice / Controls */}
          {isAdmin ? (
            <View style={styles.adminNoticeBox}>
              <Ionicons name="shield-checkmark-outline" size={18} color="#8A7A70" />
              <Text style={styles.adminNoticeText}>
                Admin View Only: You can monitor order status and GPS location. Only assigned delivery partners can update delivery status.
              </Text>
            </View>
          ) : (
            <View style={styles.partnerControlsBox}>
              <Text style={styles.partnerControlsTitle}>Update Delivery Status (Partner Action)</Text>
              <View style={styles.statusButtonsRow}>
                <TouchableOpacity
                  style={[styles.statusActionBtn, delStatus === 'Pending' && styles.statusActionBtnActive]}
                  onPress={() => handleUpdateStatusByDeliveryPartner('Pending')}
                >
                  <Text style={styles.statusActionBtnText}>Pending</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.statusActionBtn, delStatus === 'Out for delivery' && styles.statusActionBtnActive]}
                  onPress={() => handleUpdateStatusByDeliveryPartner('Out for delivery')}
                >
                  <Text style={styles.statusActionBtnText}>Out for Delivery</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.statusActionBtn, delStatus === 'Delivered' && styles.statusActionBtnActive]}
                  onPress={() => handleUpdateStatusByDeliveryPartner('Delivered')}
                >
                  <Text style={styles.statusActionBtnText}>Delivered</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
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
    padding: 16,
    paddingBottom: 40,
  },
  summaryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 20,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#EFECE9',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    alignItems: 'center',
  },
  summaryCardSubtitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#8A7A70',
    letterSpacing: 0.8,
  },
  totalAmountText: {
    fontSize: 32,
    fontWeight: '900',
    color: '#A52A0A',
    marginVertical: 6,
  },
  badgesContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  markPaidBtn: {
    marginTop: 14,
    backgroundColor: '#059669',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  markPaidBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  sectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#EFECE9',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
  },
  sectionTitleLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#A52A0A',
    letterSpacing: 0.8,
    marginBottom: 12,
  },
  customerHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  customerName: {
    fontSize: 17,
    fontWeight: '900',
    color: '#1F1511',
  },
  customerAddress: {
    fontSize: 12,
    color: '#6E6259',
    marginTop: 4,
    fontWeight: '500',
  },
  callBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#059669',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    marginLeft: 10,
  },
  callBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
    marginLeft: 4,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F3EFEA',
  },
  itemLeft: {
    flex: 1,
    paddingRight: 10,
  },
  itemName: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1F1511',
  },
  itemQtyPrice: {
    fontSize: 12,
    color: '#7C6E65',
    marginTop: 2,
  },
  itemTotal: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1F1511',
  },
  calcRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
  },
  calcLabel: {
    fontSize: 13,
    color: '#6E6259',
    fontWeight: '600',
  },
  calcVal: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1F1511',
  },
  partnerInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  partnerAvatar: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#FDEBE4',
    justifyContent: 'center',
    alignItems: 'center',
  },
  partnerNameText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1F1511',
  },
  partnerSubText: {
    fontSize: 12,
    color: '#7C6E65',
    marginTop: 2,
  },
  liveStatusBox: {
    backgroundColor: '#FAF8F5',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E8E3DF',
  },
  liveStatusHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  livePulseBox: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  livePulseText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#A52A0A',
    marginLeft: 4,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 4,
  },
  locationTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#8A7A70',
  },
  locationAddress: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1F1511',
    marginTop: 2,
  },
  adminNoticeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3EFEA',
    borderRadius: 12,
    padding: 12,
    marginTop: 14,
  },
  adminNoticeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#6E6259',
    marginLeft: 8,
    flex: 1,
  },
  partnerControlsBox: {
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3EFEA',
  },
  partnerControlsTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#1F1511',
    marginBottom: 8,
  },
  statusButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statusActionBtn: {
    flex: 1,
    backgroundColor: '#FAF8F5',
    paddingVertical: 8,
    borderRadius: 10,
    alignItems: 'center',
    marginHorizontal: 3,
    borderWidth: 1,
    borderColor: '#E8E3DF',
  },
  statusActionBtnActive: {
    backgroundColor: '#A52A0A',
    borderColor: '#A52A0A',
  },
  statusActionBtnText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#1F1511',
  },
  badge: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 10,
    marginHorizontal: 4,
  },
  badgePending: {
    backgroundColor: '#FEF3C7',
  },
  badgeTransit: {
    backgroundColor: '#E0F2FE',
  },
  badgeDelivered: {
    backgroundColor: '#ECFDF5',
  },
  badgePaid: {
    backgroundColor: '#ECFDF5',
  },
  badgeUnpaid: {
    backgroundColor: '#FFFBEB',
  },
  badgeOverdue: {
    backgroundColor: '#FEE2E2',
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '800',
  },
  badgeTextPending: {
    color: '#D97706',
  },
  badgeTextTransit: {
    color: '#0284C7',
  },
  badgeTextDelivered: {
    color: '#059669',
  },
  badgeTextPaid: {
    color: '#059669',
  },
  badgeTextUnpaid: {
    color: '#B45309',
  },
  badgeTextOverdue: {
    color: '#DC2626',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: '60%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3EFEA',
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1F1511',
  },
  partnerModalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 14,
    marginBottom: 8,
    backgroundColor: '#FAF8F5',
    borderWidth: 1,
    borderColor: '#EFECE8',
  },
  partnerModalItemActive: {
    backgroundColor: '#ECFDF5',
    borderColor: '#059669',
  },
  partnerItemAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F5EBE6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  partnerItemName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
  },
  partnerItemStatus: {
    fontSize: 11,
    fontWeight: '600',
    color: '#6B7280',
    marginTop: 2,
  },
});
