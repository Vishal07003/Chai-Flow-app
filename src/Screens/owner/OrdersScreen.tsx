import React, { useState, useMemo } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  FlatList,
  TextInput,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { Header, EmptyState } from '../../components/common';
import { useApp, InvoiceItem } from '../../context/AppContext';

export default function OrdersScreen({ navigation }: any) {
  const { invoices, customers } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'ALL' | 'PENDING' | 'DELIVERED'>(
    'ALL',
  );
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    setTimeout(() => {
      setRefreshing(false);
    }, 1000);
  }, []);

  // Filtered list
  const filteredOrders = useMemo(() => {
    let list = [...invoices];

    if (activeTab === 'PENDING') {
      list = list.filter(i => (i.deliveryStatus || 'Pending') !== 'Delivered');
    } else if (activeTab === 'DELIVERED') {
      list = list.filter(i => i.deliveryStatus === 'Delivered');
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        i =>
          i.name.toLowerCase().includes(q) ||
          i.amount.toLowerCase().includes(q) ||
          (i.invoiceNo && i.invoiceNo.toLowerCase().includes(q)) ||
          (i.deliveryPartnerName &&
            i.deliveryPartnerName.toLowerCase().includes(q)),
      );
    }

    return list;
  }, [invoices, activeTab, searchQuery]);

  // Order statistics: "X open · Y unpaid"
  const openOrdersCount = useMemo(() => {
    return invoices.filter(i => (i.deliveryStatus || 'Pending') !== 'Delivered')
      .length;
  }, [invoices]);

  const unpaidOrdersCount = useMemo(() => {
    return invoices.filter(i => i.status !== 'PAID').length;
  }, [invoices]);

  const renderOrderItem = ({ item }: { item: InvoiceItem }) => {
    const isPaid = item.status === 'PAID';
    const isOverdue = item.isOverdue || item.status === 'OVERDUE';
    const delStatus =
      item.deliveryStatus || (item.status === 'PAID' ? 'Delivered' : 'Pending');
    const partnerName = item.deliveryPartnerName || 'Rahul Sharma';
    const orderIdDisplay = item.invoiceNo || `ORD-${item.id}`;

    return (
      <TouchableOpacity
        activeOpacity={0.88}
        style={styles.card}
        onPress={() => navigation.navigate('InvoiceDetail', { invoice: item })}
      >
        {/* Card Header Row */}
        <View style={styles.cardHeader}>
          <View style={styles.orderIdBadge}>
            <Ionicons name="receipt-outline" size={14} color="#A52A0A" />
            <Text style={styles.orderIdText}>{orderIdDisplay}</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color="#A09489" />
        </View>

        {/* Customer & Partner Info */}
        <View style={styles.cardBody}>
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
            <Text style={styles.customerName}>{item.name}</Text>
          </TouchableOpacity>
          <View style={styles.partnerRow}>
            <Ionicons name="bicycle-outline" size={14} color="#6E6259" />
            <Text style={styles.partnerText}>Partner: {partnerName}</Text>
          </View>
        </View>

        {/* Badges and Price Footer */}
        <View style={styles.cardFooter}>
          <View style={styles.badgesRow}>
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

          <Text style={styles.totalAmount}>{item.amount}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      {/* Header */}
      <Header title="Orders" showBack={false} showNotification={false} />

      {/* Hero Stats & Create Order Action Bar */}
      <View style={styles.statsBar}>
        <View>
          <Text style={styles.statsSubtitle}>TOTAL STATS</Text>
          <Text style={styles.statsText}>
            {openOrdersCount} open · {unpaidOrdersCount} unpaid
          </Text>
        </View>

        <TouchableOpacity
          activeOpacity={0.85}
          style={styles.createBtn}
          onPress={() => navigation.navigate('CreateInvoice')}
        >
          <Ionicons name="add-circle" size={18} color="#FFFFFF" />
          <Text style={styles.createBtnText}>Create Order</Text>
        </TouchableOpacity>
      </View>

      {/* Filter Tabs */}
      <View style={styles.tabsRow}>
        {[
          { id: 'ALL', label: `All (${invoices.length})` },
          { id: 'PENDING', label: `Open (${openOrdersCount})` },
          {
            id: 'DELIVERED',
            label: `Delivered (${invoices.length - openOrdersCount})`,
          },
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
      </View>

      {/* Search Input */}
      <View style={styles.searchBox}>
        <Ionicons
          name="search-outline"
          size={18}
          color="#8A7A70"
          style={styles.searchIcon}
        />
        <TextInput
          style={styles.searchInput}
          placeholder="Search customer, order ID, or partner..."
          placeholderTextColor="#A09489"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery !== '' && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Ionicons name="close-circle" size={18} color="#999" />
          </TouchableOpacity>
        )}
      </View>

      {/* Orders List with FlatList */}
      <FlatList
        data={filteredOrders}
        keyExtractor={item => item.id}
        renderItem={renderOrderItem}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#A52A0A"
            colors={['#A52A0A']}
          />
        }
        ListEmptyComponent={
          <EmptyState
            title="No Orders Found"
            subtitle="No orders match your current search or filter query."
          />
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAF8F5',
  },
  statsBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 8,
    padding: 16,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#EFECE9',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
  },
  statsSubtitle: {
    fontSize: 10,
    fontWeight: '800',
    color: '#8A7A70',
    letterSpacing: 0.8,
  },
  statsText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1F1511',
    marginTop: 2,
  },
  createBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#A52A0A',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
    elevation: 2,
  },
  createBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
    marginLeft: 6,
  },
  tabsRow: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginVertical: 4,
  },
  tabChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#EFECE9',
  },
  tabChipActive: {
    backgroundColor: '#A52A0A',
    borderColor: '#A52A0A',
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
    marginHorizontal: 16,
    marginVertical: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#EFECE9',
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: '#1F1511',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 90,
    paddingTop: 4,
  },
  card: {
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
    marginBottom: 8,
  },
  orderIdBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FDEBE4',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  orderIdText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#A52A0A',
    marginLeft: 4,
  },
  cardBody: {
    marginBottom: 12,
  },
  customerName: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1F1511',
  },
  partnerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  partnerText: {
    fontSize: 12,
    color: '#6E6259',
    fontWeight: '600',
    marginLeft: 4,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F3EFEA',
  },
  badgesRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    marginRight: 6,
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
    fontSize: 11,
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
  totalAmount: {
    fontSize: 16,
    fontWeight: '900',
    color: '#A52A0A',
  },
});
