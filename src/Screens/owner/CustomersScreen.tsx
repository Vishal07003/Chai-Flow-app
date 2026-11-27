import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  ScrollView,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  Modal,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
  Linking,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { Header, FloatingButton, EmptyState } from '../../components/common';
import { AddCustomerModal, type AddCustomerFormData } from '../../components/customer';
import { CollectPaymentModal, type CollectPaymentFormData } from '../../components/payment';
import AppToast from '../../utils/toast';

import { useApp, Customer } from '../../context/AppContext';
import { colors, typography, radius, spacing, shadows } from '../../theme';

const filterTabs = ['All', 'Due Today', 'Defaulters'];

export default function CustomersScreen() {
  const navigation = useNavigation<any>();
  const {
    customers,
    filteredCustomers,
    totalOutstanding,
    outstandingCustomerCount,
    collectionsTotal,
    searchQuery,
    setSearchQuery,
    activeFilter,
    setActiveFilter,
    sortBy,
    setSortBy,
    refreshBackendData,
    addCustomer,
    collectPayment,
  } = useApp();

  // Pull to refresh state
  const [refreshing, setRefreshing] = useState(false);

  // Sync on screen focus
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      refreshBackendData();
    });
    return unsubscribe;
  }, [navigation, refreshBackendData]);

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    await refreshBackendData();
    setRefreshing(false);
  }, [refreshBackendData]);

  // Modal State for Add Customer
  const [addModalVisible, setAddModalVisible] = useState(false);

  // Modal State for Collect Payment
  const [collectModalVisible, setCollectModalVisible] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(
    null,
  );
  const [payAmountInput, setPayAmountInput] = useState('');
  const [payMethod, setPayMethod] = useState<
    'UPI' | 'Cash' | 'Bank Transfer' | 'Cheque'
  >('UPI');

  // Modal State for Financial Reports
  const [reportsModalVisible, setReportsModalVisible] = useState(false);

  const handleAddCustomerSubmit = async (data: AddCustomerFormData) => {
    await addCustomer({
      name: data.name,
      phone: data.phone,
      address: data.address || 'Local Area',
      amount: data.openingBalance || 0,
      openingBalance: data.openingBalance || 0,
      deliveryStatus: 'Last delivery: Just now',
      hasDot: (data.openingBalance || 0) > 0,
      isOverdue: false,
    });
    setAddModalVisible(false);
  };

  const handleOpenCollectModal = (customer?: Customer) => {
    if (customer) {
      setSelectedCustomer(customer);
      setPayAmountInput(customer.amount.toString());
    } else {
      const firstDue = filteredCustomers.find(c => c.amount > 0);
      if (firstDue) {
        setSelectedCustomer(firstDue);
        setPayAmountInput(firstDue.amount.toString());
      }
    }
    setCollectModalVisible(true);
  };

  const handleCollectSubmit = async (data: CollectPaymentFormData) => {
    if (!selectedCustomer) return;
    setCollectModalVisible(false);
    try {
      await collectPayment(selectedCustomer.id, data.amount, undefined, data.notes);
      AppToast.success(
        'Payment Recorded',
        `₹${data.amount} recorded for ${selectedCustomer.name}`
      );
    } catch (err: any) {
      AppToast.error('Payment Error', err?.message || 'Failed to record payment.');
    }
  };

  const toggleSortBy = () => {
    setSortBy(sortBy === 'Name' ? 'Amount' : 'Name');
  };

  const handleViewReports = () => {
    navigation.navigate('Reports');
  };

  const handleSendReminder = (customer: Customer) => {
    const text = `Hello ${
      customer.name
    }, your pending balance is ₹${customer.amount.toLocaleString()}. Please clear it via ChaiFlow. Thank you!`;
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

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      {/* Fixed Header */}
      <Header title="Customers" />

      {/* Sticky Top Filter & Search Bar Container */}
      <View style={styles.stickySearchContainer}>
        {/* Dynamic Search Bar */}
        <View style={styles.searchBar}>
          <Ionicons
            name="search-outline"
            size={18}
            color="#888"
            style={styles.searchIcon}
          />
          <TextInput
            placeholder="Search customers by name or area..."
            placeholderTextColor="#988E85"
            style={styles.searchInput}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={18} color="#999" />
            </TouchableOpacity>
          )}
        </View>

        {/* Dynamic Filter Chips */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterRow}
        >
          {filterTabs.map(tab => {
            const isActive = activeFilter === tab;
            return (
              <TouchableOpacity
                key={tab}
                activeOpacity={0.8}
                onPress={() => setActiveFilter(tab)}
                style={[
                  styles.filterChip,
                  isActive ? styles.activeChip : styles.inactiveChip,
                ]}
              >
                <Text
                  style={[
                    styles.chipText,
                    isActive ? styles.activeChipText : styles.inactiveChipText,
                  ]}
                >
                  {tab}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      <KeyboardAwareScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        enableOnAndroid={true}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#8C331A"
            colors={['#8C331A']}
          />
        }
      >
        {/* Dynamic Total Outstanding Card */}
        <View style={styles.outstandingCard}>
          <Text style={styles.cardHeaderTitle}>TOTAL AMOUNT DUE</Text>
          <View style={styles.amountRow}>
            <Text style={styles.amountText}>
              ₹{totalOutstanding.toLocaleString()}
            </Text>
            <Text style={styles.subAmountText}>
              {' '}
              from {outstandingCustomerCount} customers
            </Text>
          </View>

          {/* Action Buttons inside Card */}
          <View style={styles.cardActionsRow}>
            <TouchableOpacity
              activeOpacity={0.85}
              style={styles.collectBtn}
              onPress={() => navigation.navigate('PendingPayments')}
            >
              <Text style={styles.collectBtnText}>Collect Payments</Text>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.85}
              style={styles.reportsBtn}
              onPress={handleViewReports}
            >
              <Text style={styles.reportsBtnText}>View Reports</Text>
            </TouchableOpacity>
          </View>

          {/* Decorative graphic background bubble */}
          <View style={styles.cardBubbleGraphic} />
        </View>

        {/* Section Header Row */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>
            CUSTOMERS LIST ({filteredCustomers.length})
          </Text>
          <TouchableOpacity
            activeOpacity={0.7}
            style={styles.sortButton}
            onPress={toggleSortBy}
          >
            <Text style={styles.sortText}>Sort by: </Text>
            <Text style={styles.sortValueText}>{sortBy}</Text>
          </TouchableOpacity>
        </View>

        {/* Dynamic Customers List */}
        {filteredCustomers.length === 0 ? (
          <EmptyState
            icon="people-outline"
            title="No Matching Customers"
            subtitle="Try adjusting your search query or filter."
          />
        ) : (
          filteredCustomers.map(item => (
            <TouchableOpacity
              key={item.id}
              activeOpacity={0.8}
              style={styles.customerCard}
              onPress={() =>
                navigation.navigate('CustomerDetail', { customer: item })
              }
            >
              {/* Avatar */}
              {item.avatarUrl ? (
                <Image
                  source={{ uri: item.avatarUrl }}
                  style={styles.avatarImage}
                />
              ) : (
                <View style={styles.avatarFallback}>
                  <Text style={styles.avatarInitials}>{item.initials}</Text>
                </View>
              )}

              {/* Middle Info */}
              <View style={styles.infoContainer}>
                <Text style={styles.customerName}>{item.name}</Text>
                <Text style={styles.customerAddress} numberOfLines={1}>
                  {item.address}
                </Text>

                {/* Delivery / Overdue Status */}
                <View style={styles.statusRow}>
                  {item.badge && (
                    <View style={styles.overdueBadge}>
                      <Text style={styles.overdueBadgeText}>{item.badge}</Text>
                    </View>
                  )}
                  {item.hasDot && <View style={styles.statusDot} />}
                  <Text style={styles.statusText}>{item.deliveryStatus}</Text>
                </View>
              </View>

              {/* Right Info: Amount & Status Badge */}
              <View style={styles.rightContainer}>
                <Text
                  style={[
                    styles.customerAmount,
                    item.amount === 0
                      ? styles.zeroAmount
                      : styles.highlightAmount,
                  ]}
                >
                  ₹{item.amount.toLocaleString()}
                </Text>
                <View
                  style={[
                    styles.paymentStatusPill,
                    item.amount === 0
                      ? styles.statusPillPaid
                      : item.isOverdue || item.badge === 'OVERDUE'
                      ? styles.statusPillOverdue
                      : styles.statusPillUnpaid,
                  ]}
                >
                  <Text
                    style={[
                      styles.paymentStatusPillText,
                      item.amount === 0
                        ? styles.statusTextPaid
                        : item.isOverdue || item.badge === 'OVERDUE'
                        ? styles.statusTextOverdue
                        : styles.statusTextUnpaid,
                    ]}
                  >
                    {item.amount === 0 ? 'PAID' : item.isOverdue || item.badge === 'OVERDUE' ? 'OVERDUE' : 'UNPAID'}
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          ))
        )}
      </KeyboardAwareScrollView>

      {/* Floating Add Customer Button */}
      <FloatingButton
        iconName="person-add-outline"
        onPress={() => setAddModalVisible(true)}
      />

      {/* Unified Add Customer Modal */}
      <AddCustomerModal
        visible={addModalVisible}
        onClose={() => setAddModalVisible(false)}
        onSubmit={handleAddCustomerSubmit}
      />

      {/* Modal 2: Collect Payment */}
      <CollectPaymentModal
        visible={collectModalVisible}
        onClose={() => setCollectModalVisible(false)}
        onSubmit={handleCollectSubmit}
        customerName={selectedCustomer?.name || 'Customer'}
        totalPendingAmount={selectedCustomer?.amount || 0}
      />

      {/* Modal 3: Financial Reports */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={reportsModalVisible}
        onRequestClose={() => setReportsModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setReportsModalVisible(false)}
        >
          <TouchableOpacity activeOpacity={1} style={styles.modalContent}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.modalHeader}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Ionicons
                    name="analytics"
                    size={22}
                    color="#963819"
                    style={{ marginRight: 8 }}
                  />
                  <Text style={styles.modalTitle}>
                    Financial & Credit Reports
                  </Text>
                </View>
                <TouchableOpacity onPress={() => setReportsModalVisible(false)}>
                  <Ionicons name="close" size={24} color="#666" />
                </TouchableOpacity>
              </View>

              {/* Summary Cards Grid */}
              <View style={styles.reportGrid}>
                <View style={styles.reportCard}>
                  <Text style={styles.reportLabel}>TOTAL AMOUNT DUE</Text>
                  <Text style={styles.reportVal}>
                    ₹{totalOutstanding.toLocaleString()}
                  </Text>
                  <Text style={styles.reportSub}>
                    {outstandingCustomerCount} Active Accounts
                  </Text>
                </View>

                <View
                  style={[styles.reportCard, { backgroundColor: '#F0FDF4' }]}
                >
                  <Text style={[styles.reportLabel, { color: '#047857' }]}>
                    COLLECTIONS TOTAL
                  </Text>
                  <Text style={[styles.reportVal, { color: '#047857' }]}>
                    ₹{collectionsTotal.toLocaleString()}
                  </Text>
                  <Text style={[styles.reportSub, { color: '#059669' }]}>
                    Received this month
                  </Text>
                </View>
              </View>

              {/* Overdue Accounts Summary */}
              <Text style={styles.reportSectionHeader}>
                TOP ACCOUNTS BY AMOUNT DUE
              </Text>
              {customers
                .filter(c => c.amount > 0)
                .sort((a, b) => b.amount - a.amount)
                .slice(0, 5)
                .map(cust => (
                  <View key={cust.id} style={styles.reportItemRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.reportCustName}>{cust.name}</Text>
                      <Text style={styles.reportCustAddress}>
                        {cust.address}
                      </Text>
                    </View>

                    <View style={{ alignItems: 'flex-end', marginRight: 10 }}>
                      <Text style={styles.reportCustDue}>
                        ₹{cust.amount.toLocaleString()}
                      </Text>
                      <Text style={styles.reportCustStatus}>
                        {cust.deliveryStatus}
                      </Text>
                    </View>

                    <TouchableOpacity
                      style={styles.remindSmallBtn}
                      onPress={() => handleSendReminder(cust)}
                    >
                      <Ionicons name="logo-whatsapp" size={16} color="#FFF" />
                    </TouchableOpacity>
                  </View>
                ))}

              <TouchableOpacity
                activeOpacity={0.8}
                style={[styles.submitBtn, { marginTop: 20 }]}
                onPress={() => setReportsModalVisible(false)}
              >
                <Text style={styles.submitBtnText}>Close Report</Text>
              </TouchableOpacity>
            </ScrollView>
          </TouchableOpacity>
        </TouchableOpacity>
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
    paddingTop: 8,
    paddingBottom: 16,
  },
  stickySearchContainer: {
    backgroundColor: '#FAF8F5',
    paddingHorizontal: 16,
    paddingTop: 6,
    paddingBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#EFECE8',
    zIndex: 10,
  },

  /* Total Outstanding Card */
  outstandingCard: {
    backgroundColor: '#963819',
    borderRadius: 16,
    padding: 20,
    marginVertical: 10,
    position: 'relative',
    overflow: 'hidden',
    elevation: 3,
    shadowColor: '#963819',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
  },
  cardHeaderTitle: {
    color: 'rgba(255, 255, 255, 0.82)',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  amountRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 18,
  },
  amountText: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  subAmountText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.85)',
    marginLeft: 4,
  },
  cardActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  collectBtn: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    paddingHorizontal: 18,
    paddingVertical: 10,
    marginRight: 10,
    flex: 1,
    alignItems: 'center',
  },
  collectBtnText: {
    color: '#963819',
    fontWeight: '700',
    fontSize: 14,
  },
  reportsBtn: {
    backgroundColor: 'rgba(255, 255, 255, 0.22)',
    borderRadius: 22,
    paddingHorizontal: 18,
    paddingVertical: 10,
    flex: 1,
    alignItems: 'center',
  },
  reportsBtnText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
  },
  cardBubbleGraphic: {
    position: 'absolute',
    right: -25,
    top: -25,
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },

  /* Search Bar */
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0ECE7',
    borderRadius: 14,
    paddingHorizontal: 14,
    height: 46,
    marginVertical: 12,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#2C201A',
    paddingVertical: 0,
  },

  /* Filter Chips */
  filterRow: {
    paddingVertical: 4,
    marginBottom: 10,
  },
  filterChip: {
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 10,
  },
  activeChip: {
    backgroundColor: '#963819',
  },
  inactiveChip: {
    backgroundColor: '#EBE6E1',
  },
  chipText: {
    fontSize: 13,
    fontWeight: '600',
  },
  activeChipText: {
    color: '#FFFFFF',
  },
  inactiveChipText: {
    color: '#4A3D36',
  },

  /* Section Header Row */
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 14,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#6E6259',
    letterSpacing: 0.8,
  },
  sortButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sortText: {
    fontSize: 13,
    color: '#6E6259',
  },
  sortValueText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#8C331A',
  },

  /* Customer Cards */
  customerCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
  },
  avatarImage: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 14,
    backgroundColor: '#EBE6E1',
  },
  avatarFallback: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 14,
    backgroundColor: '#8C331A',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInitials: {
    color: '#FFF',
    fontWeight: '700',
    fontSize: 16,
  },
  infoContainer: {
    flex: 1,
    paddingRight: 8,
  },
  customerName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#2C201A',
  },
  customerAddress: {
    fontSize: 13,
    color: '#6E6259',
    marginTop: 2,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#8C331A',
    marginRight: 6,
  },
  statusText: {
    fontSize: 12,
    color: '#7C6E65',
  },
  overdueBadge: {
    backgroundColor: '#FDEEEB',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginRight: 6,
  },
  overdueBadgeText: {
    color: '#D9381E',
    fontSize: 10,
    fontWeight: '700',
  },

  /* Right Container */
  rightContainer: {
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  customerAmount: {
    fontSize: 15,
    fontWeight: '700',
  },
  highlightAmount: {
    color: '#8C331A',
  },
  zeroAmount: {
    color: '#059669',
  },
  paymentStatusPill: {
    marginTop: 4,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  statusPillPaid: {
    backgroundColor: '#D1FAE5',
  },
  statusPillOverdue: {
    backgroundColor: '#FEE2E2',
  },
  statusPillUnpaid: {
    backgroundColor: '#FEF3C7',
  },
  paymentStatusPillText: {
    fontSize: 10,
    fontWeight: '800',
  },
  statusTextPaid: {
    color: '#059669',
  },
  statusTextOverdue: {
    color: '#DC2626',
  },
  statusTextUnpaid: {
    color: '#D97706',
  },
  emptyCard: {
    backgroundColor: '#FFF',
    padding: 30,
    borderRadius: 16,
    alignItems: 'center',
    marginTop: 10,
  },
  emptyText: {
    color: '#999',
    marginTop: 10,
    fontSize: 14,
  },

  /* Modal Styles */
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    elevation: 10,
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
    color: '#8C331A',
  },
  customerPaymentBanner: {
    backgroundColor: '#F7F5F2',
    padding: 14,
    borderRadius: 12,
    marginBottom: 10,
  },
  paymentCustomerName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#2C201A',
  },
  paymentDueText: {
    fontSize: 13,
    color: '#8C331A',
    fontWeight: '600',
    marginTop: 4,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#4A3D36',
    marginBottom: 6,
    marginTop: 10,
  },
  input: {
    backgroundColor: '#F7F5F2',
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 48,
    fontSize: 14,
    color: '#2C201A',
  },
  submitBtn: {
    backgroundColor: '#8C331A',
    borderRadius: 14,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 10,
  },
  submitBtnText: {
    color: '#FFF',
    fontWeight: '700',
    fontSize: 16,
  },

  /* Report Modal Styles */
  reportGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 12,
  },
  reportCard: {
    flex: 1,
    backgroundColor: '#FEF2F2',
    borderRadius: 14,
    padding: 14,
    marginHorizontal: 4,
  },
  reportLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#991B1B',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  reportVal: {
    fontSize: 18,
    fontWeight: '800',
    color: '#991B1B',
    marginBottom: 2,
  },
  reportSub: {
    fontSize: 11,
    color: '#B91C1C',
    fontWeight: '500',
  },
  reportSectionHeader: {
    fontSize: 12,
    fontWeight: '800',
    color: '#6E6259',
    letterSpacing: 0.6,
    marginTop: 16,
    marginBottom: 10,
  },
  reportItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FBF9F7',
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#EFECE9',
  },
  reportCustName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#2C201A',
  },
  reportCustAddress: {
    fontSize: 12,
    color: '#7C6E65',
    marginTop: 2,
  },
  reportCustDue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#8C331A',
  },
  reportCustStatus: {
    fontSize: 10,
    color: '#8A7E75',
    marginTop: 2,
  },
  remindSmallBtn: {
    backgroundColor: '#25D366',
    width: 34,
    height: 34,
    borderRadius: 17,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
