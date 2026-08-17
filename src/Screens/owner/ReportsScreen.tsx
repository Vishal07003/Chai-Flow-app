import React, { useState, useMemo } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Linking,
  Share,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';
import Header from '../../components/common/Header';
import { useApp, PaymentRecord } from '../../context/AppContext';

export default function ReportsScreen({ navigation }: any) {
  const {
    customers,
    totalOutstanding,
    outstandingCustomerCount,
    collectionsTotal,
    totalRevenue,
    revenueGrowth,
    paymentHistory,
  } = useApp();

  const [activeTab, setActiveTab] = useState<'HISTORY' | 'DELINQUENT'>(
    'HISTORY',
  );
  const [selectedMethod, setSelectedMethod] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [toastMessage, setToastMessage] = useState<string>('');

  // Overdue Defaulter List
  const overdueCustomers = customers.filter(
    c => c.isOverdue || c.amount > 1000 || c.badge?.includes('OVERDUE'),
  );

  // Filtered Payment History
  const filteredPayments = useMemo(() => {
    let list = [...paymentHistory];

    if (selectedMethod !== 'All') {
      list = list.filter(p =>
        p.method.toLowerCase().includes(selectedMethod.toLowerCase()),
      );
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        p =>
          p.customerName.toLowerCase().includes(q) ||
          p.refNo.toLowerCase().includes(q) ||
          p.method.toLowerCase().includes(q) ||
          p.amount.toString().includes(q),
      );
    }

    return list;
  }, [paymentHistory, selectedMethod, searchQuery]);

  // Calculate totals
  const totalHistorySum = useMemo(() => {
    return filteredPayments.reduce((acc, curr) => acc + curr.amount, 0);
  }, [filteredPayments]);

  const handleSendReminder = (customer: any) => {
    const message = `Hello ${
      customer.name
    }, your ChaiFlow balance of ₹${customer.amount.toLocaleString()} is pending. Please clear your outstanding amount at your earliest convenience. Thank you!`;
    const encoded = encodeURIComponent(message);
    const whatsappUrl = `whatsapp://send?text=${encoded}`;
    const smsUrl = `sms:?body=${encoded}`;

    Linking.canOpenURL(whatsappUrl)
      .then(supported => {
        if (supported) {
          return Linking.openURL(whatsappUrl);
        } else {
          return Linking.openURL(smsUrl);
        }
      })
      .catch(() => {
        setToastMessage(`Reminder draft ready for ${customer.name}`);
        setTimeout(() => setToastMessage(''), 2000);
      });
  };

  const handleShareReceipt = async (payment: PaymentRecord) => {
    try {
      const msg = `🧾 *ChaiFlow Payment Receipt*\nCustomer: ${
        payment.customerName
      }\nAmount Paid: ₹${payment.amount.toLocaleString()}\nMethod: ${
        payment.method
      }\nRef No: ${payment.refNo}\nDate: ${payment.date} at ${
        payment.time
      }\nStatus: ${payment.status}`;
      await Share.share({ message: msg });
    } catch (err) {
      console.log('Share error', err);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header with Back Button */}
      <Header
        title="Financial & Payments Report"
        showBack={true}
        showNotification={false}
      />

      {/* Toast Alert */}
      {toastMessage !== '' && (
        <View style={styles.toast}>
          <Ionicons name="information-circle" size={20} color="#FFFFFF" />
          <Text style={styles.toastText}>{toastMessage}</Text>
        </View>
      )}

      {/* Fixed Top Section: Hero Card, Tabs, Search & Method Chips */}
      <View style={styles.fixedTopContainer}>
        {/* Total Revenue & Collections Hero Banner */}
        <View style={styles.heroCard}>
          <View style={styles.heroHeaderRow}>
            <View style={styles.heroBadgeRow}>
              <Ionicons
                name="cash"
                size={16}
                color="#F7D3C6"
                style={{ marginRight: 4 }}
              />
              <Text style={styles.heroBadge}>TOTAL REVENUE AUDIT</Text>
            </View>
            <View style={styles.growthBadge}>
              <Ionicons name="trending-up" size={13} color="#D1FAE5" />
              <Text style={styles.growthText}>{revenueGrowth}</Text>
            </View>
          </View>

          <Text style={styles.heroLabel}>Total Revenue Collected (MTD)</Text>
          <Text style={styles.heroValue}>₹{totalRevenue.toLocaleString()}</Text>

          <View style={styles.heroStatsDivider} />

          <View style={styles.heroStatsRow}>
            <View style={styles.heroStatItem}>
              <Text style={styles.heroStatLabel}>Collections Total</Text>
              <Text style={styles.heroStatVal}>
                ₹{collectionsTotal.toLocaleString()}
              </Text>
            </View>
            <View style={styles.heroStatItem}>
              <Text style={styles.heroStatLabel}>Outstanding Balance</Text>
              <Text style={styles.heroStatValOrange}>
                ₹{totalOutstanding.toLocaleString()}
              </Text>
            </View>
            <View style={styles.heroStatItem}>
              <Text style={styles.heroStatLabel}>Total Transactions</Text>
              <Text style={styles.heroStatVal}>{paymentHistory.length}</Text>
            </View>
          </View>
        </View>

        {/* Navigation Tabs: Payment History vs Delinquent Accounts */}
        <View style={styles.tabsRow}>
          <TouchableOpacity
            activeOpacity={0.8}
            style={[
              styles.tabBtn,
              activeTab === 'HISTORY' && styles.tabBtnActive,
            ]}
            onPress={() => setActiveTab('HISTORY')}
          >
            <Ionicons
              name="receipt-outline"
              size={16}
              color={activeTab === 'HISTORY' ? '#FFFFFF' : '#8C331A'}
              style={{ marginRight: 6 }}
            />
            <Text
              style={[
                styles.tabBtnText,
                activeTab === 'HISTORY' && styles.tabBtnTextActive,
              ]}
            >
              Payment History ({paymentHistory.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.8}
            style={[
              styles.tabBtn,
              activeTab === 'DELINQUENT' && styles.tabBtnActive,
            ]}
            onPress={() => setActiveTab('DELINQUENT')}
          >
            <Ionicons
              name="alert-circle-outline"
              size={16}
              color={activeTab === 'DELINQUENT' ? '#FFFFFF' : '#8C331A'}
              style={{ marginRight: 6 }}
            />
            <Text
              style={[
                styles.tabBtnText,
                activeTab === 'DELINQUENT' && styles.tabBtnTextActive,
              ]}
            >
              Defaulters ({overdueCustomers.length})
            </Text>
          </TouchableOpacity>
        </View>

        {activeTab === 'HISTORY' && (
          <>
            {/* Search Input Bar */}
            <View style={styles.searchBoxContainer}>
              <Ionicons
                name="search-outline"
                size={18}
                color="#8A7E75"
                style={{ marginRight: 8 }}
              />
              <TextInput
                style={styles.searchInput}
                placeholder="Search payment by customer, ref # or mode..."
                placeholderTextColor="#A09489"
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
              {searchQuery !== '' && (
                <TouchableOpacity onPress={() => setSearchQuery('')}>
                  <Ionicons name="close-circle" size={18} color="#8A7E75" />
                </TouchableOpacity>
              )}
            </View>

            {/* Payment Method Filters Horizontal Bar */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.methodScroll}
            >
              {['All', 'UPI', 'Cash', 'Bank Transfer', 'PhonePe'].map(
                method => (
                  <TouchableOpacity
                    key={method}
                    activeOpacity={0.8}
                    style={[
                      styles.methodChip,
                      selectedMethod === method && styles.methodChipActive,
                    ]}
                    onPress={() => setSelectedMethod(method)}
                  >
                    <Text
                      style={[
                        styles.methodChipText,
                        selectedMethod === method &&
                          styles.methodChipTextActive,
                      ]}
                    >
                      {method}
                    </Text>
                  </TouchableOpacity>
                ),
              )}
            </ScrollView>
          </>
        )}
      </View>

      {/* Scrollable Content Area */}
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {activeTab === 'HISTORY' ? (
          <View>
            {/* Subtitle Summary */}
            <View style={styles.historySummaryRow}>
              <Text style={styles.sectionTitle}>PAID TRANSACTIONS HISTORY</Text>
              <Text style={styles.historySumText}>
                Total:{' '}
                <Text style={{ color: '#059669', fontWeight: '800' }}>
                  ₹{totalHistorySum.toLocaleString()}
                </Text>
              </Text>
            </View>

            {/* Payment History List Cards */}
            {filteredPayments.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Ionicons name="wallet-outline" size={48} color="#D1C7BD" />
                <Text style={styles.emptyTitle}>No Payments Found</Text>
                <Text style={styles.emptySub}>
                  No matching payment transactions found for "
                  {searchQuery || selectedMethod}".
                </Text>
              </View>
            ) : (
              filteredPayments.map(item => {
                let isUPI =
                  item.method.includes('UPI') ||
                  item.method.includes('PhonePe');
                let isCash = item.method.includes('Cash');

                return (
                  <View key={item.id} style={styles.paymentCard}>
                    <View style={styles.paymentLeft}>
                      <View
                        style={[
                          styles.payIconBox,
                          isUPI
                            ? styles.bgGreenLight
                            : isCash
                            ? styles.bgOrangeLight
                            : styles.bgBlueLight,
                        ]}
                      >
                        <Ionicons
                          name={
                            isUPI
                              ? 'phone-portrait-outline'
                              : isCash
                              ? 'cash-outline'
                              : 'card-outline'
                          }
                          size={20}
                          color={
                            isUPI ? '#059669' : isCash ? '#D97706' : '#2563EB'
                          }
                        />
                      </View>

                      <View style={styles.paymentDetails}>
                        <Text style={styles.customerName}>
                          {item.customerName}
                        </Text>
                        <View style={styles.payMetaRow}>
                          <View
                            style={[
                              styles.methodBadge,
                              isUPI
                                ? styles.bgGreenBadge
                                : isCash
                                ? styles.bgOrangeBadge
                                : styles.bgBlueBadge,
                            ]}
                          >
                            <Text
                              style={[
                                styles.methodBadgeText,
                                isUPI
                                  ? styles.textGreen
                                  : isCash
                                  ? styles.textOrange
                                  : styles.textBlue,
                              ]}
                            >
                              {item.method}
                            </Text>
                          </View>
                          <Text style={styles.refText}>• {item.refNo}</Text>
                        </View>
                        <Text style={styles.dateText}>
                          {item.date} · {item.time}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.paymentRight}>
                      <Text style={styles.paymentAmount}>
                        +₹{item.amount.toLocaleString()}
                      </Text>
                      <View style={styles.statusSuccessBadge}>
                        <Ionicons
                          name="checkmark-circle"
                          size={12}
                          color="#059669"
                        />
                        <Text style={styles.statusSuccessText}>
                          {item.status}
                        </Text>
                      </View>

                      <TouchableOpacity
                        activeOpacity={0.7}
                        style={styles.shareReceiptBtn}
                        onPress={() => handleShareReceipt(item)}
                      >
                        <Ionicons
                          name="share-social-outline"
                          size={14}
                          color="#8C331A"
                        />
                        <Text style={styles.shareReceiptText}>Receipt</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })
            )}
          </View>
        ) : (
          <View>
            {/* Overdue Defaulters Tab View */}
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>
                DELINQUENT & OVERDUE ACCOUNTS
              </Text>
              <Text style={styles.countBadge}>
                {overdueCustomers.length} Accounts
              </Text>
            </View>

            {overdueCustomers.map(item => (
              <View key={item.id} style={styles.defaulterCard}>
                <TouchableOpacity
                  activeOpacity={0.8}
                  style={styles.defaulterLeft}
                  onPress={() =>
                    navigation.navigate('CustomerDetail', { customer: item })
                  }
                >
                  <View style={styles.defaulterAvatar}>
                    <Text style={styles.defaulterAvatarText}>
                      {item.name.substring(0, 2).toUpperCase()}
                    </Text>
                  </View>
                  <View style={styles.defaulterInfo}>
                    <Text style={styles.defaulterName}>{item.name}</Text>
                    <Text style={styles.defaulterAddress}>{item.address}</Text>
                  </View>
                </TouchableOpacity>

                <View style={styles.defaulterRight}>
                  <Text style={styles.defaulterAmount}>
                    ₹{item.amount.toLocaleString()}
                  </Text>
                  <TouchableOpacity
                    activeOpacity={0.8}
                    style={styles.whatsappBtn}
                    onPress={() => handleSendReminder(item)}
                  >
                    <Ionicons name="logo-whatsapp" size={14} color="#FFFFFF" />
                    <Text style={styles.whatsappBtnText}>Remind</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
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
    backgroundColor: '#2C201A',
    borderRadius: 14,
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
    paddingTop: 8,
    paddingBottom: 40,
  },
  fixedTopContainer: {
    paddingHorizontal: 16,
    paddingTop: 12,
    backgroundColor: '#FAF8F5',
  },

  /* Hero Card */
  heroCard: {
    backgroundColor: '#7A2E19',
    borderRadius: 22,
    padding: 20,
    marginBottom: 16,
    elevation: 4,
    shadowColor: '#7A2E19',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
  },
  heroHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  heroBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  heroBadge: {
    fontSize: 10,
    fontWeight: '800',
    color: '#F7D3C6',
    letterSpacing: 0.8,
  },
  growthBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.25)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  growthText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#D1FAE5',
    marginLeft: 3,
  },
  heroLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#F7D3C6',
  },
  heroValue: {
    fontSize: 34,
    fontWeight: '800',
    color: '#FFFFFF',
    marginVertical: 4,
  },
  heroStatsDivider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    marginVertical: 14,
  },
  heroStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  heroStatItem: {
    alignItems: 'flex-start',
  },
  heroStatLabel: {
    fontSize: 11,
    color: '#F7D3C6',
    fontWeight: '500',
    marginBottom: 2,
  },
  heroStatVal: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  heroStatValOrange: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FDBA74',
  },

  /* Navigation Tabs */
  tabsRow: {
    flexDirection: 'row',
    marginBottom: 14,
    backgroundColor: '#F3EAE4',
    borderRadius: 16,
    padding: 4,
  },
  tabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 12,
  },
  tabBtnActive: {
    backgroundColor: '#8C331A',
  },
  tabBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#8C331A',
  },
  tabBtnTextActive: {
    color: '#FFFFFF',
  },

  /* Search box */
  searchBoxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#EFECE9',
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: '#2C201A',
    padding: 0,
  },

  /* Method scroll chips */
  methodScroll: {
    marginBottom: 14,
  },
  methodChip: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 12,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#EFECE9',
  },
  methodChipActive: {
    backgroundColor: '#8C331A',
    borderColor: '#8C331A',
  },
  methodChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#6E6259',
  },
  methodChipTextActive: {
    color: '#FFFFFF',
  },

  historySummaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#6E6259',
    letterSpacing: 0.8,
  },
  historySumText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6E6259',
  },

  /* Empty state */
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#2C201A',
    marginTop: 10,
    marginBottom: 4,
  },
  emptySub: {
    fontSize: 12,
    color: '#8A7E75',
    textAlign: 'center',
  },

  /* Payment Card */
  paymentCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#EFECE9',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 5,
  },
  paymentLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  payIconBox: {
    width: 42,
    height: 42,
    borderRadius: 21,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  bgGreenLight: {
    backgroundColor: '#D1FAE5',
  },
  bgOrangeLight: {
    backgroundColor: '#FEF3C7',
  },
  bgBlueLight: {
    backgroundColor: '#DBEAFE',
  },
  paymentDetails: {
    flex: 1,
  },
  customerName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#2C201A',
    marginBottom: 2,
  },
  payMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  methodBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    marginRight: 4,
  },
  bgGreenBadge: {
    backgroundColor: '#ECFDF5',
  },
  bgOrangeBadge: {
    backgroundColor: '#FFFBEB',
  },
  bgBlueBadge: {
    backgroundColor: '#EFF6FF',
  },
  methodBadgeText: {
    fontSize: 10,
    fontWeight: '800',
  },
  textGreen: {
    color: '#059669',
  },
  textOrange: {
    color: '#D97706',
  },
  textBlue: {
    color: '#2563EB',
  },
  refText: {
    fontSize: 11,
    color: '#8A7E75',
    fontWeight: '500',
  },
  dateText: {
    fontSize: 11,
    color: '#A09489',
  },

  paymentRight: {
    alignItems: 'flex-end',
    marginLeft: 10,
  },
  paymentAmount: {
    fontSize: 15,
    fontWeight: '800',
    color: '#059669',
    marginBottom: 2,
  },
  statusSuccessBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    marginBottom: 6,
  },
  statusSuccessText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#059669',
    marginLeft: 3,
  },
  shareReceiptBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FDEBE4',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  shareReceiptText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#8C331A',
    marginLeft: 3,
  },

  /* Defaulters styles */
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    marginTop: 4,
  },
  countBadge: {
    fontSize: 11,
    fontWeight: '700',
    color: '#E11D48',
    backgroundColor: '#FFE4E6',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  defaulterCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#EFECE9',
  },
  defaulterLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  defaulterAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFE4E6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  defaulterAvatarText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#E11D48',
  },
  defaulterInfo: {
    flex: 1,
  },
  defaulterName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#2C201A',
  },
  defaulterAddress: {
    fontSize: 11,
    color: '#8A7E75',
  },
  defaulterRight: {
    alignItems: 'flex-end',
  },
  defaulterAmount: {
    fontSize: 15,
    fontWeight: '800',
    color: '#E11D48',
    marginBottom: 4,
  },
  whatsappBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#25D366',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
  },
  whatsappBtnText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
    marginLeft: 4,
  },
});
