import React, { useState } from 'react';
import {
  StyleSheet,
  ScrollView,
  View,
  Text,
  TouchableOpacity,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { Header } from '../../components/common';
import {
  RevenueCard,
  StatCard,
  QuickAction,
  InvoiceCard,
  ActivityTimeline,
} from '../../components/owner';

import { useApp } from '../../context/AppContext';

export default function DashboardScreen() {
  const navigation = useNavigation<any>();
  const {
    collectionsTotal,
    totalOutstanding,
    invoices,
    addCustomer,
    addInvoice,
  } = useApp();

  const [modalVisible, setModalVisible] = useState(false);
  const [modalType, setModalType] = useState<'lead' | 'invoice'>('lead');

  // Pull to refresh state
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    setTimeout(() => {
      setRefreshing(false);
    }, 1000);
  }, []);

  // Form states
  const [nameInput, setNameInput] = useState('');
  const [addressInput, setAddressInput] = useState('');
  const [amountInput, setAmountInput] = useState('');
  const [dueInput, setDueInput] = useState('Due in 3 days');

  const formattedCollections = `₹${(collectionsTotal / 1000).toFixed(1)}k`;
  const formattedOutstanding = `₹${(totalOutstanding / 1000).toFixed(1)}k`;

  const handleOpenModal = (type: 'lead' | 'invoice') => {
    setModalType(type);
    setNameInput('');
    setAddressInput('');
    setAmountInput('');
    setModalVisible(true);
  };

  const handleFormSubmit = () => {
    if (!nameInput.trim()) return;

    const parsedAmount = parseFloat(amountInput) || 0;

    if (modalType === 'lead') {
      addCustomer({
        name: nameInput,
        address: addressInput || 'Local Market Area',
        amount: parsedAmount,
        deliveryStatus: 'Last delivery: Just now',
        hasDot: true,
        isOverdue: false,
      });
    } else {
      addInvoice(nameInput, parsedAmount || 1200, dueInput || 'Due in 2 days');
    }

    setModalVisible(false);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      {/* Header Component */}
      <Header title="Dashboard" />

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
        {/* Live Overview + Revenue Card */}
        <RevenueCard />

        {/* Financial KPI Cards */}
        <View style={styles.statsContainer}>
          <StatCard
            title="Collections"
            amount={`₹${collectionsTotal.toLocaleString()}`}
            subtitle="MTD Received"
            iconName="wallet-outline"
            iconColor="#3B82F6"
            iconBgColor="#EDF4FE"
            onPress={() => navigation.navigate('Reports')}
          />
          <StatCard
            title="Outstanding"
            amount={`₹${totalOutstanding.toLocaleString()}`}
            subtitle="Tap to Collect →"
            color="#DC2626"
            iconName="alert-circle-outline"
            iconColor="#DC2626"
            iconBgColor="#FEE2E2"
            onPress={() => navigation.navigate('PendingPayments')}
          />
        </View>

        {/* Quick Actions */}
        <Text style={styles.sectionHeader}>QUICK ACTIONS</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.quickActionsScroll}
        >
          <QuickAction
            title="Add Customer"
            icon="person-add-outline"
            iconColor="#435585"
            bgColor="#E7EEFF"
            onPress={() => navigation.navigate('AddLead')}
          />
          <QuickAction
            title="Quick Bill"
            icon="cafe-outline"
            iconColor="#059669"
            bgColor="#ECFDF5"
            onPress={() => navigation.navigate('QuickBilling')}
          />
          <QuickAction
            title="Create Order"
            icon="receipt-outline"
            iconColor="#4D3880"
            bgColor="#EFE7FF"
            onPress={() => navigation.navigate('CreateInvoice')}
          />
          <QuickAction
            title="Add Product"
            icon="cube-outline"
            iconColor="#2563EB"
            bgColor="#EFF6FF"
            onPress={() => navigation.navigate('ProductDetail', { mode: 'add' })}
          />
          <QuickAction
            title="Collect Payment"
            icon="cash-outline"
            iconColor="#DC2626"
            bgColor="#FEE2E2"
            onPress={() => navigation.navigate('PendingPayments')}
          />
          <QuickAction
            title="Add Delivery Boy"
            icon="bicycle-outline"
            iconColor="#8C331A"
            bgColor="#FDEBE4"
            onPress={() => navigation.navigate('AddDeliveryBoy')}
          />
          <QuickAction
            title="Add Schedule"
            icon="calendar-outline"
            iconColor="#D97706"
            bgColor="#FEF3C7"
            onPress={() => navigation.navigate('AddRouteSchedule')}
          />
          <QuickAction
            title="More"
            icon="grid-outline"
            iconColor="#8C331A"
            bgColor="#FDEBE4"
            onPress={() => navigation.navigate('More')}
          />
        </ScrollView>

        {/* Pending Invoices */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionHeader}>PENDING INVOICES</Text>
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => navigation.navigate('PendingPayments')}
          >
            <Text style={styles.viewAllText}>
              View All ({invoices.filter(i => i.status !== 'PAID').length})
            </Text>
          </TouchableOpacity>
        </View>

        {invoices.filter(i => i.status !== 'PAID').length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>No pending invoices</Text>
          </View>
        ) : (
          invoices
            .filter(i => i.status !== 'PAID')
            .slice(0, 5)
            .map(inv => (
              <InvoiceCard
                key={inv.id}
                name={inv.name}
                amount={inv.amount}
                due={inv.due}
                isOverdue={inv.isOverdue}
                onPress={() => navigation.navigate('PendingPayments')}
              />
            ))
        )}

        {/* Recent Activity */}
        <Text style={styles.sectionHeader}>RECENT ACTIVITY</Text>
        <ActivityTimeline />
      </KeyboardAwareScrollView>

      {/* Add Lead / Add Invoice Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
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
              <ScrollView
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
                bounces={false}
              >
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>
                    {modalType === 'lead'
                      ? 'Add New Customer'
                      : 'Create Order'}
                  </Text>
                  <TouchableOpacity onPress={() => setModalVisible(false)}>
                    <Ionicons name="close" size={24} color="#666" />
                  </TouchableOpacity>
                </View>

                <Text style={styles.inputLabel}>
                  Full Name / Business Name *
                </Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. Ramesh Tea Stall"
                  placeholderTextColor="#999"
                  value={nameInput}
                  onChangeText={setNameInput}
                />

                <Text style={styles.inputLabel}>
                  {modalType === 'lead'
                    ? 'Address / Location Area'
                    : 'Due Status'}
                </Text>
                <TextInput
                  style={styles.input}
                  placeholder={
                    modalType === 'lead'
                      ? 'e.g. Shop 14, Main Market'
                      : 'e.g. Due in 3 days'
                  }
                  placeholderTextColor="#999"
                  value={modalType === 'lead' ? addressInput : dueInput}
                  onChangeText={
                    modalType === 'lead' ? setAddressInput : setDueInput
                  }
                />

                <Text style={styles.inputLabel}>Amount (₹)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. 1500"
                  placeholderTextColor="#999"
                  keyboardType="numeric"
                  value={amountInput}
                  onChangeText={setAmountInput}
                />

                <TouchableOpacity
                  activeOpacity={0.8}
                  style={styles.submitBtn}
                  onPress={handleFormSubmit}
                >
                  <Text style={styles.submitBtnText}>
                    {modalType === 'lead' ? 'Add Customer' : 'Create Order'}
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
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 16,
  },
  statsContainer: {
    flexDirection: 'row',
    marginHorizontal: -4,
    marginVertical: 12,
  },
  sectionHeader: {
    fontSize: 12,
    fontWeight: '700',
    color: '#6E6259',
    letterSpacing: 0.8,
    marginTop: 18,
    marginBottom: 12,
    textTransform: 'uppercase',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 18,
    marginBottom: 12,
  },
  viewAllText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#8C331A',
  },
  quickActionsScroll: {
    paddingVertical: 4,
  },
  emptyCard: {
    backgroundColor: '#FFF',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  emptyText: {
    color: '#888',
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
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#8C331A',
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
});
