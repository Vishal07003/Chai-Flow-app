import React, { useState, useMemo } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Share,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { Header } from '../../components/common';

import { useApp, InvoiceItem } from '../../context/AppContext';

export default function InvoicesScreen({ navigation }: any) {
  const { invoices, customers, markInvoiceAsPaid } = useApp();

  const [activeTab, setActiveTab] = useState<
    'PENDING' | 'OVERDUE' | 'PAID' | 'ALL'
  >('PENDING');
  const [searchQuery, setSearchQuery] = useState('');
  const [toastMessage, setToastMessage] = useState('');

  const filteredInvoices = useMemo(() => {
    let list = [...invoices];

    if (activeTab === 'PENDING') {
      list = list.filter(i => i.status !== 'PAID' && !i.isOverdue);
    } else if (activeTab === 'OVERDUE') {
      list = list.filter(i => i.isOverdue || i.status === 'OVERDUE');
    } else if (activeTab === 'PAID') {
      list = list.filter(i => i.status === 'PAID');
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        i =>
          i.name.toLowerCase().includes(q) ||
          i.amount.toLowerCase().includes(q) ||
          i.due.toLowerCase().includes(q) ||
          (i.invoiceNo && i.invoiceNo.toLowerCase().includes(q)),
      );
    }

    return list;
  }, [invoices, activeTab, searchQuery]);

  const pendingCount = invoices.filter(
    i => i.status !== 'PAID' && !i.isOverdue,
  ).length;
  const overdueCount = invoices.filter(
    i => i.isOverdue || i.status === 'OVERDUE',
  ).length;
  const paidCount = invoices.filter(i => i.status === 'PAID').length;

  const { totalOrdersVal, totalPaidVal, totalUnpaidVal } = useMemo(() => {
    let total = 0;
    let paid = 0;
    let unpaid = 0;

    invoices.forEach(i => {
      const val =
        i.numericAmount || parseInt(i.amount.replace(/[^0-9]/g, '')) || 0;
      total += val;
      if (i.status === 'PAID') {
        paid += val;
      } else {
        unpaid += val;
      }
    });

    return {
      totalOrdersVal: total,
      totalPaidVal: paid,
      totalUnpaidVal: unpaid,
    };
  }, [invoices]);

  const handleMarkPaid = (id: string) => {
    markInvoiceAsPaid(id);
    setToastMessage('Invoice marked as PAID & added to revenue collections!');
    setTimeout(() => setToastMessage(''), 2500);
  };

  return (
    <SafeAreaView style={styles.container}>
      <Header
        title="Orders Management"
        showBack={true}
        showNotification={false}
      />

      {toastMessage !== '' && (
        <View style={styles.toast}>
          <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />
          <Text style={styles.toastText}>{toastMessage}</Text>
        </View>
      )}

      {/* Fixed Top Section: Hero Card, Filter Tabs & Search Bar */}
      <View style={styles.fixedTopContainer}>
        {/* Top Header Card & New Order Action */}
        <View style={styles.heroCard}>
          <View style={styles.heroTopRow}>
            <View>
              <Text style={styles.heroSub}>Total Orders</Text>
              <Text style={styles.heroValue}>
                ₹{totalOrdersVal.toLocaleString()}
              </Text>
            </View>
            <TouchableOpacity
              activeOpacity={0.85}
              style={styles.createNewBtn}
              onPress={() => navigation.navigate('CreateInvoice')}
            >
              <Ionicons name="add-circle" size={18} color="#8C331A" />
              <Text style={styles.createNewBtnText}>New Order</Text>
            </TouchableOpacity>
          </View>

          {/* Paid & Unpaid Stats Sub-Row */}
          <View style={styles.heroStatsRow}>
            <View style={styles.heroStatCol}>
              <View style={styles.statDotPaid} />
              <Text style={styles.heroStatLabel}>Paid:</Text>
              <Text style={styles.heroStatValPaid}>
                ₹{totalPaidVal.toLocaleString()}
              </Text>
            </View>
            <View style={styles.heroStatDivider} />
            <View style={styles.heroStatCol}>
              <View style={styles.statDotUnpaid} />
              <Text style={styles.heroStatLabel}>Unpaid:</Text>
              <Text style={styles.heroStatValUnpaid}>
                ₹{totalUnpaidVal.toLocaleString()}
              </Text>
            </View>
          </View>
        </View>

        {/* Filter Tabs */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.tabsScroll}
        >
          {[
            { id: 'PENDING', label: `Pending (${pendingCount})` },
            { id: 'OVERDUE', label: `Overdue (${overdueCount})` },
            { id: 'PAID', label: `Paid (${paidCount})` },
            { id: 'ALL', label: `All (${invoices.length})` },
          ].map(tab => (
            <TouchableOpacity
              key={tab.id}
              activeOpacity={0.8}
              style={[
                styles.tabChip,
                activeTab === tab.id && styles.tabChipActive,
              ]}
              onPress={() => setActiveTab(tab.id as any)}
            >
              <Text
                style={[
                  styles.tabChipText,
                  activeTab === tab.id && styles.tabChipTextActive,
                ]}
              >
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Search Input Bar */}
        <View style={styles.searchBox}>
          <Ionicons
            name="search-outline"
            size={18}
            color="#8A7E75"
            style={{ marginRight: 8 }}
          />
          <TextInput
            style={styles.searchInput}
            placeholder="Search order by customer, ID or amount..."
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
      </View>

      {/* Scrollable List Area */}
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>
            {activeTab === 'PENDING'
              ? 'PENDING ORDERS LIST'
              : activeTab === 'OVERDUE'
              ? 'OVERDUE ORDERS LIST'
              : activeTab === 'PAID'
              ? 'PAID ORDERS LIST'
              : 'ALL ORDERS LIST'}
          </Text>
          <Text style={styles.countBadge}>{filteredInvoices.length} Items</Text>
        </View>

        {/* Invoice Cards List */}
        {filteredInvoices.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="document-text-outline" size={48} color="#D1C7BD" />
            <Text style={styles.emptyTitle}>No Orders Found</Text>
            <Text style={styles.emptySub}>
              There are no orders matching your current filter settings.
            </Text>
            <TouchableOpacity
              style={[styles.createNewBtn, { marginTop: 14 }]}
              onPress={() => navigation.navigate('CreateInvoice')}
            >
              <Text style={styles.createNewBtnText}>+ Create Order</Text>
            </TouchableOpacity>
          </View>
        ) : (
          filteredInvoices.map(item => {
            const isPaid = item.status === 'PAID';
            const isOverdue = item.isOverdue || item.status === 'OVERDUE';

            return (
              <TouchableOpacity
                key={item.id}
                activeOpacity={0.85}
                style={styles.invoiceCard}
                onPress={() =>
                  navigation.navigate('InvoiceDetail', { invoice: item })
                }
              >
                <View style={styles.cardHeader}>
                  <View style={styles.cardHeaderLeft}>
                    <View style={styles.invIconBox}>
                      <Ionicons name="receipt" size={20} color="#8C331A" />
                    </View>
                    <View>
                      <Text style={styles.invNoText}>
                        {item.invoiceNo || item.id}
                      </Text>
                      <TouchableOpacity
                        activeOpacity={0.7}
                        onPress={() => {
                          const matched = customers.find(
                            c => c.name.toLowerCase() === item.name.toLowerCase(),
                          ) || {
                            id: `c_${item.id}`,
                            name: item.name,
                            address: item.customerAddress || 'Local Market Area',
                            amount: item.numericAmount || 0,
                            deliveryStatus: 'Active Customer',
                            hasDot: true,
                            isOverdue: item.isOverdue || false,
                          };
                          navigation.navigate('CustomerDetail', { customer: matched });
                        }}
                      >
                        <Text style={styles.custNameText}>{item.name}</Text>
                      </TouchableOpacity>
                    </View>
                  </View>

                  <View
                    style={[
                      styles.statusBadge,
                      isPaid
                        ? styles.badgeGreen
                        : isOverdue
                        ? styles.badgeRed
                        : styles.badgeOrange,
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusBadgeText,
                        isPaid
                          ? styles.textGreen
                          : isOverdue
                          ? styles.textRed
                          : styles.textOrange,
                      ]}
                    >
                      {isPaid ? 'PAID' : isOverdue ? 'OVERDUE' : 'PENDING'}
                    </Text>
                  </View>
                </View>

                <View style={styles.cardDivider} />

                <View style={styles.cardBottomRow}>
                  <View>
                    <Text style={styles.dueLabel}>Terms / Due</Text>
                    <Text style={styles.dueVal}>{item.due}</Text>
                  </View>

                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={styles.amountLabel}>Total Payable</Text>
                    <Text style={styles.amountVal}>{item.amount}</Text>
                  </View>
                </View>

                {/* Card Action Buttons */}
                <View style={styles.cardActionsRow}>
                  {!isPaid && (
                    <TouchableOpacity
                      activeOpacity={0.8}
                      style={styles.cardActionPaidBtn}
                      onPress={() => handleMarkPaid(item.id)}
                    >
                      <Ionicons
                        name="checkmark-circle-outline"
                        size={14}
                        color="#059669"
                      />
                      <Text style={styles.cardActionPaidText}>Mark Paid</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </TouchableOpacity>
            );
          })
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
    backgroundColor: '#059669',
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
    paddingTop: 10,
    paddingBottom: 90,
  },
  fixedTopContainer: {
    paddingHorizontal: 16,
    paddingTop: 12,
    backgroundColor: '#FAF8F5',
  },

  heroCard: {
    backgroundColor: '#7A2E19',
    borderRadius: 20,
    padding: 18,
    marginBottom: 14,
    elevation: 4,
    shadowColor: '#7A2E19',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
  },
  heroTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  heroSub: {
    fontSize: 12,
    fontWeight: '600',
    color: '#F7D3C6',
  },
  heroValue: {
    fontSize: 28,
    fontWeight: '800',
    color: '#FFFFFF',
    marginTop: 2,
  },
  createNewBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
  },
  createNewBtnText: {
    color: '#8C331A',
    fontWeight: '800',
    fontSize: 13,
    marginLeft: 4,
  },

  heroStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.18)',
  },
  heroStatCol: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  heroStatDivider: {
    width: 1,
    height: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    marginHorizontal: 8,
  },
  statDotPaid: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#34D399',
    marginRight: 6,
  },
  statDotUnpaid: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FBBF24',
    marginRight: 6,
  },
  heroStatLabel: {
    fontSize: 11,
    color: '#F7D3C6',
    fontWeight: '600',
    marginRight: 4,
  },
  heroStatValPaid: {
    fontSize: 13,
    fontWeight: '800',
    color: '#6EE7B7',
  },
  heroStatValUnpaid: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FDE68A',
  },

  tabsScroll: {
    marginBottom: 12,
  },
  tabChip: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#EFECE9',
  },
  tabChipActive: {
    backgroundColor: '#8C331A',
    borderColor: '#8C331A',
  },
  tabChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#6E6259',
  },
  tabChipTextActive: {
    color: '#FFFFFF',
  },

  searchBox: {
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

  sectionHeaderRow: {
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
  countBadge: {
    fontSize: 11,
    fontWeight: '700',
    color: '#8C331A',
    backgroundColor: '#FDEBE4',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },

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

  /* Invoice Card */
  invoiceCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#EFECE9',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  invIconBox: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#FDEBE4',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  invNoText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#8C331A',
  },
  custNameText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#2C201A',
  },

  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  badgeGreen: { backgroundColor: '#ECFDF5' },
  badgeRed: { backgroundColor: '#FFE4E6' },
  badgeOrange: { backgroundColor: '#FFFBEB' },
  statusBadgeText: { fontSize: 10, fontWeight: '800' },
  textGreen: { color: '#059669' },
  textRed: { color: '#E11D48' },
  textOrange: { color: '#D97706' },

  cardDivider: {
    height: 1,
    backgroundColor: '#F5F2EF',
    marginVertical: 12,
  },

  cardBottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  dueLabel: {
    fontSize: 10,
    color: '#8A7E75',
    fontWeight: '600',
  },
  dueVal: {
    fontSize: 12,
    fontWeight: '700',
    color: '#6E6259',
  },
  amountLabel: {
    fontSize: 10,
    color: '#8A7E75',
    fontWeight: '600',
  },
  amountVal: {
    fontSize: 16,
    fontWeight: '800',
    color: '#8C331A',
  },

  cardActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  cardActionPaidBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
  },
  cardActionPaidText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#059669',
    marginLeft: 4,
  },
});
