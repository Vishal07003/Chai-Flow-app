import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Image,
  ScrollView,
  Linking,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import Ionicons from 'react-native-vector-icons/Ionicons';
import Header from '../../components/common/Header';
import { useApp, Customer } from '../../context/AppContext';

export default function CustomerDetailScreen({ route, navigation }: any) {
  const { customers, collectPayment } = useApp();

  // Get passed customer or default to first customer
  const passedCustomer: Customer | undefined = route.params?.customer;
  const customerId = route.params?.customerId || passedCustomer?.id || '1';

  const customer =
    customers.find(c => c.id === customerId) || passedCustomer || customers[0];

  const [activeTab, setActiveTab] = useState<'Orders' | 'Invoices' | 'Contact'>(
    'Orders',
  );

  // Collect Payment Modal state
  const [collectModalVisible, setCollectModalVisible] = useState(false);
  const [collectAmount, setCollectAmount] = useState(
    customer.amount.toString(),
  );
  const [paymentMethod, setPaymentMethod] = useState<'Cash' | 'UPI' | 'GPay' | 'PhonePe'>('UPI');
  const [showToast, setShowToast] = useState(false);

  const initials =
    customer.initials ||
    customer.name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);

  // Mock Orders Data
  const orders = [
    {
      id: 'ORD-2041',
      items: 'Masala Chai · 40 cups',
      date: '27 Jul, 07:10 AM',
      amount: '₹480',
      status: 'DELIVERED',
    },
    {
      id: 'ORD-2032',
      items: 'Masala Chai · 40 cups',
      date: '26 Jul, 07:05 AM',
      amount: '₹480',
      status: 'DELIVERED',
    },
    {
      id: 'ORD-2020',
      items: 'Ginger Chai · 35 cups',
      date: '25 Jul, 07:20 AM',
      amount: '₹420',
      status: 'DELIVERED',
    },
  ];

  const handleCall = () => {
    Linking.openURL('tel:+919876543210');
  };

  const handleMessage = () => {
    const text = `Hello ${customer.name}, your ChaiFlow pending bill balance is ₹${customer.amount.toLocaleString()}. Please clear it at your earliest convenience. Thank you!`;
    const encoded = encodeURIComponent(text);
    const whatsappUrl = `whatsapp://send?phone=+919876543210&text=${encoded}`;

    Linking.canOpenURL(whatsappUrl)
      .then(supported => {
        if (supported) {
          Linking.openURL(whatsappUrl);
        } else {
          Linking.openURL(`sms:+919876543210?body=${encoded}`);
        }
      })
      .catch(() => {
        Linking.openURL(`sms:+919876543210?body=${encoded}`);
      });
  };

  const handleCollectSubmit = () => {
    const amt = parseFloat(collectAmount) || customer.amount;
    if (amt <= 0) return;

    collectPayment(customer.id, amt);
    setCollectModalVisible(false);
    setShowToast(true);

    setTimeout(() => {
      setShowToast(false);
    }, 3000);
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Top Header */}
      <Header title="Customer" showBack={true} />

      {/* Success Toast */}
      {showToast && (
        <View style={styles.toast}>
          <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />
          <Text style={styles.toastText}>
            Payment of ₹{collectAmount} collected successfully!
          </Text>
        </View>
      )}

      <KeyboardAwareScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Top Dark Red Customer Banner Card */}
        <View style={styles.bannerCard}>
          {/* Top Row: Avatar + Name + Address */}
          <View style={styles.bannerTopRow}>
            {customer.avatarUrl ? (
              <Image
                source={{ uri: customer.avatarUrl }}
                style={styles.avatarImg}
              />
            ) : (
              <View style={styles.avatarFallback}>
                <Text style={styles.avatarText}>{initials}</Text>
              </View>
            )}

            <View style={styles.bannerInfo}>
              <Text style={styles.customerName}>{customer.name}</Text>
              <Text style={styles.customerAddress} numberOfLines={1}>
                {customer.address}
              </Text>
            </View>
          </View>

          {/* 3 Stat Boxes */}
          <View style={styles.statsRow}>
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>DUE</Text>
              <Text style={styles.statValue}>
                ₹{customer.amount.toLocaleString()}
              </Text>
            </View>

            <View style={styles.statBox}>
              <Text style={styles.statLabel}>CUPS/DAY</Text>
              <Text style={styles.statValue}>40</Text>
            </View>

            <View style={styles.statBox}>
              <Text style={styles.statLabel}>ORDERS</Text>
              <Text style={styles.statValue}>3</Text>
            </View>
          </View>

          {/* Action Buttons Row */}
          <View style={styles.actionRow}>
            <TouchableOpacity
              activeOpacity={0.8}
              style={styles.callBtn}
              onPress={handleCall}
            >
              <Ionicons
                name="call-outline"
                size={18}
                color="#8C331A"
                style={{ marginRight: 6 }}
              />
              <Text style={styles.callText}>Call</Text>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.8}
              style={styles.msgBtn}
              onPress={handleMessage}
            >
              <Ionicons
                name="chatbubble-outline"
                size={18}
                color="#FFFFFF"
                style={{ marginRight: 6 }}
              />
              <Text style={styles.msgText}>Message</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Sub-Navigation Pill Tabs */}
        <View style={styles.tabContainer}>
          {(['Orders', 'Invoices', 'Contact'] as const).map(tab => {
            const isActive = tab === activeTab;
            return (
              <TouchableOpacity
                key={tab}
                activeOpacity={0.8}
                onPress={() => setActiveTab(tab)}
                style={[
                  styles.tabItem,
                  isActive ? styles.activeTabItem : styles.inactiveTabItem,
                ]}
              >
                <Text
                  style={[
                    styles.tabText,
                    isActive ? styles.activeTabText : styles.inactiveTabText,
                  ]}
                >
                  {tab}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Tab Content */}
        {activeTab === 'Orders' && (
          <View style={styles.listSection}>
            {orders.map(ord => (
              <View key={ord.id} style={styles.orderCard}>
                <View style={styles.orderHeaderRow}>
                  <Text style={styles.orderId}>{ord.id}</Text>
                  <Text style={styles.orderAmount}>{ord.amount}</Text>
                </View>

                <Text style={styles.orderItems}>{ord.items}</Text>

                <View style={styles.orderFooterRow}>
                  <View style={styles.dateRow}>
                    <Ionicons
                      name="calendar-outline"
                      size={14}
                      color="#8A7E75"
                      style={{ marginRight: 6 }}
                    />
                    <Text style={styles.dateText}>{ord.date}</Text>
                  </View>

                  <View style={styles.deliveredBadge}>
                    <Text style={styles.deliveredText}>{ord.status}</Text>
                  </View>
                </View>
              </View>
            ))}
          </View>
        )}

        {activeTab === 'Invoices' && (
          <View style={styles.listSection}>
            <View style={styles.orderCard}>
              <View style={styles.orderHeaderRow}>
                <Text style={styles.orderId}>INV-8901</Text>
                <Text style={styles.orderAmount}>
                  ₹{customer.amount.toLocaleString()}
                </Text>
              </View>

              <Text style={styles.orderItems}>Current Pending Balance</Text>

              <View style={styles.orderFooterRow}>
                <View style={styles.dateRow}>
                  <Ionicons
                    name="alert-circle-outline"
                    size={15}
                    color="#D9381E"
                    style={{ marginRight: 6 }}
                  />
                  <Text style={{ color: '#D9381E', fontWeight: '700', fontSize: 13 }}>
                    {customer.amount > 0 ? 'Due for Payment' : 'Paid in Full'}
                  </Text>
                </View>

                {customer.amount > 0 && (
                  <TouchableOpacity
                    activeOpacity={0.8}
                    style={styles.payNowBtn}
                    onPress={() => {
                      setCollectAmount(customer.amount.toString());
                      setCollectModalVisible(true);
                    }}
                  >
                    <Text style={styles.payNowText}>Collect Payment</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </View>
        )}

        {activeTab === 'Contact' && (
          <View style={styles.listSection}>
            <View style={styles.contactCard}>
              <TouchableOpacity style={styles.contactItem} onPress={handleCall}>
                <Ionicons name="call-outline" size={18} color="#8C331A" />
                <View style={styles.contactTextGroup}>
                  <Text style={styles.contactLabel}>PHONE NUMBER</Text>
                  <Text style={styles.contactValue}>+91 98765 43210</Text>
                </View>
              </TouchableOpacity>

              <View style={styles.contactItem}>
                <Ionicons name="location-outline" size={18} color="#8C331A" />
                <View style={styles.contactTextGroup}>
                  <Text style={styles.contactLabel}>DELIVERY ADDRESS</Text>
                  <Text style={styles.contactValue}>{customer.address}</Text>
                </View>
              </View>

              <View style={styles.contactItem}>
                <Ionicons name="time-outline" size={18} color="#8C331A" />
                <View style={styles.contactTextGroup}>
                  <Text style={styles.contactLabel}>PREFERRED TIME</Text>
                  <Text style={styles.contactValue}>07:00 AM - 08:00 AM</Text>
                </View>
              </View>

              {/* Message Quick Button inside Contact Tab */}
              <TouchableOpacity
                style={styles.whatsappCardBtn}
                onPress={handleMessage}
              >
                <Ionicons name="logo-whatsapp" size={18} color="#FFFFFF" />
                <Text style={styles.whatsappBtnText}>Send WhatsApp Reminder</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </KeyboardAwareScrollView>

      {/* Collect Payment Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={collectModalVisible}
        onRequestClose={() => setCollectModalVisible(false)}
      >
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <TouchableOpacity
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={Keyboard.dismiss}
          >
            <TouchableOpacity activeOpacity={1} style={styles.modalContent}>
              <ScrollView keyboardShouldPersistTaps="handled">
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Collect Payment</Text>
                  <TouchableOpacity onPress={() => setCollectModalVisible(false)}>
                    <Ionicons name="close" size={24} color="#666" />
                  </TouchableOpacity>
                </View>

                <View style={styles.paymentCustomerBanner}>
                  <Text style={styles.paymentCustomerName}>
                    {customer.name}
                  </Text>
                  <Text style={styles.paymentDueText}>
                    Total Due: ₹{customer.amount.toLocaleString()}
                  </Text>
                </View>

                <Text style={styles.inputLabel}>Collection Amount (₹)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter amount"
                  placeholderTextColor="#999"
                  keyboardType="numeric"
                  value={collectAmount}
                  onChangeText={setCollectAmount}
                />

                <Text style={styles.inputLabel}>Payment Method</Text>
                <View style={styles.paymentMethodsRow}>
                  {(['UPI', 'Cash', 'GPay', 'PhonePe'] as const).map(m => (
                    <TouchableOpacity
                      key={m}
                      style={[
                        styles.methodChip,
                        paymentMethod === m && styles.methodChipActive,
                      ]}
                      onPress={() => setPaymentMethod(m)}
                    >
                      <Text
                        style={[
                          styles.methodText,
                          paymentMethod === m && styles.methodTextActive,
                        ]}
                      >
                        {m}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <TouchableOpacity
                  activeOpacity={0.8}
                  style={styles.submitBtn}
                  onPress={handleCollectSubmit}
                >
                  <Text style={styles.submitBtnText}>
                    Collect ₹{collectAmount || '0'}
                  </Text>
                </TouchableOpacity>
              </ScrollView>
            </TouchableOpacity>
          </TouchableOpacity>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAF8F5',
  },
  toast: {
    position: 'absolute',
    top: 50,
    left: 20,
    right: 20,
    backgroundColor: '#10B981',
    borderRadius: 12,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 999,
    elevation: 6,
  },
  toastText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
    marginLeft: 10,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 40,
  },
  backLink: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 8,
  },
  backText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#8C331A',
  },

  /* Banner Card */
  bannerCard: {
    backgroundColor: '#7A2E19',
    borderRadius: 24,
    padding: 20,
    marginVertical: 6,
    elevation: 4,
    shadowColor: '#7A2E19',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  bannerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 18,
  },
  avatarImg: {
    width: 58,
    height: 58,
    borderRadius: 29,
    borderWidth: 2,
    borderColor: '#FFA085',
    marginRight: 14,
  },
  avatarFallback: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: '#6B2310',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFA085',
    marginRight: 14,
  },
  avatarText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 20,
  },
  bannerInfo: {
    flex: 1,
  },
  customerName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  customerAddress: {
    fontSize: 13,
    color: '#F7D3C6',
    fontWeight: '400',
  },

  /* Stats Row */
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 18,
  },
  statBox: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    borderRadius: 16,
    paddingVertical: 10,
    alignItems: 'center',
    marginHorizontal: 4,
  },
  statLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#F7D3C6',
    letterSpacing: 0.6,
    marginBottom: 4,
  },
  statValue: {
    fontSize: 17,
    fontWeight: '800',
    color: '#FFFFFF',
  },

  /* Action Buttons */
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  callBtn: {
    flex: 1,
    height: 44,
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  callText: {
    color: '#8C331A',
    fontWeight: '700',
    fontSize: 15,
  },
  msgBtn: {
    flex: 1,
    height: 44,
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    borderRadius: 22,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
  },
  msgText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 15,
  },

  /* Sub-Navigation Pill Tabs */
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#EFECE9',
    borderRadius: 24,
    padding: 4,
    marginVertical: 14,
  },
  tabItem: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 20,
  },
  activeTabItem: {
    backgroundColor: '#8C331A',
  },
  inactiveTabItem: {
    backgroundColor: 'transparent',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '700',
  },
  activeTabText: {
    color: '#FFFFFF',
  },
  inactiveTabText: {
    color: '#6E6259',
  },

  /* List Section Cards */
  listSection: {
    marginTop: 4,
  },
  orderCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
  },
  orderHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  orderId: {
    fontSize: 16,
    fontWeight: '700',
    color: '#2C201A',
  },
  orderAmount: {
    fontSize: 16,
    fontWeight: '700',
    color: '#8C331A',
  },
  orderItems: {
    fontSize: 14,
    color: '#7C6E65',
    marginBottom: 12,
    fontWeight: '500',
  },
  orderFooterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dateText: {
    fontSize: 12,
    color: '#8A7E75',
    fontWeight: '500',
  },
  deliveredBadge: {
    backgroundColor: '#E6F7F0',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  deliveredText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#10B981',
    letterSpacing: 0.5,
  },
  payNowBtn: {
    backgroundColor: '#8C331A',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
  },
  payNowText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },

  /* Contact Card */
  contactCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 18,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  contactTextGroup: {
    marginLeft: 14,
  },
  contactLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#8A7E75',
    letterSpacing: 0.6,
    marginBottom: 2,
  },
  contactValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#2C201A',
  },
  whatsappCardBtn: {
    backgroundColor: '#25D366',
    borderRadius: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  whatsappBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
    marginLeft: 8,
  },

  /* Modal Styles */
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
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
  },
  paymentCustomerBanner: {
    backgroundColor: '#FFF4F0',
    padding: 14,
    borderRadius: 12,
    marginBottom: 16,
  },
  paymentCustomerName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#8C331A',
  },
  paymentDueText: {
    fontSize: 13,
    color: '#666',
    marginTop: 2,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#444',
    marginBottom: 6,
  },
  input: {
    backgroundColor: '#F5F5F5',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
    color: '#333',
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#DDD',
  },
  paymentMethodsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  methodChip: {
    flex: 1,
    paddingVertical: 10,
    backgroundColor: '#F3F4F6',
    borderRadius: 10,
    alignItems: 'center',
    marginHorizontal: 3,
  },
  methodChipActive: {
    backgroundColor: '#8C331A',
  },
  methodText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#555',
  },
  methodTextActive: {
    color: '#FFFFFF',
  },
  submitBtn: {
    backgroundColor: '#8C331A',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  submitBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});
