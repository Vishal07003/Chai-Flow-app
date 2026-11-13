import React, { useState, useMemo } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Modal,
  Linking,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { Header, CustomDialog } from '../../components/common';
import { useApp, InvoiceItem } from '../../context/AppContext';

export default function PendingPaymentsScreen({ navigation }: any) {
  const { invoices, customers, collectInvoicePayment } = useApp();

  const [activeTab, setActiveTab] = useState<'ALL' | 'PENDING' | 'OVERDUE'>(
    'ALL',
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [toastMessage, setToastMessage] = useState('');

  // Custom Dialog State
  const [dialogConfig, setDialogConfig] = useState<{
    visible: boolean;
    title: string;
    message?: string;
    type?: 'confirm' | 'danger' | 'info' | 'warning' | 'success';
    buttons?: Array<{
      text: string;
      style?: 'default' | 'cancel' | 'destructive';
      onPress?: () => void;
    }>;
  }>({
    visible: false,
    title: '',
  });

  const closeDialog = () => setDialogConfig(prev => ({ ...prev, visible: false }));

  // Bottom Sheet State
  const [selectedInvoice, setSelectedInvoice] = useState<InvoiceItem | null>(
    null,
  );
  const [isCollectModalVisible, setIsCollectModalVisible] = useState(false);
  const [paidAmountInput, setPaidAmountInput] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<
    'Cash' | 'UPI' | 'Card' | 'Bank Transfer'
  >('UPI');

  // Filter invoices to only show unpaid/pending invoices
  const pendingInvoices = useMemo(() => {
    let list = invoices.filter(i => {
      const numVal =
        i.numericAmount !== undefined
          ? i.numericAmount
          : parseInt((i.amount || '').replace(/[^0-9]/g, '')) || 0;
      return i.status !== 'PAID' && numVal > 0;
    });

    if (activeTab === 'PENDING') {
      list = list.filter(i => !i.isOverdue && i.status !== 'OVERDUE');
    } else if (activeTab === 'OVERDUE') {
      list = list.filter(i => i.isOverdue || i.status === 'OVERDUE');
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        i =>
          i.name.toLowerCase().includes(q) ||
          (i.invoiceNo && i.invoiceNo.toLowerCase().includes(q)) ||
          i.amount.toLowerCase().includes(q) ||
          i.due.toLowerCase().includes(q),
      );
    }

    return list;
  }, [invoices, activeTab, searchQuery]);

  const totalOutstandingSum = useMemo(() => {
    return pendingInvoices.reduce((acc, curr) => {
      const val =
        curr.numericAmount !== undefined
          ? curr.numericAmount
          : parseInt((curr.amount || '').replace(/[^0-9]/g, '')) || 0;
      return acc + val;
    }, 0);
  }, [pendingInvoices]);

  const overdueCount = useMemo(() => {
    return invoices.filter(
      i => (i.isOverdue || i.status === 'OVERDUE') && i.status !== 'PAID',
    ).length;
  }, [invoices]);

  // Open Payment Collection Bottom Sheet
  const handleOpenCollectModal = (invoice: InvoiceItem) => {
    const numVal =
      invoice.numericAmount !== undefined
        ? invoice.numericAmount
        : parseInt((invoice.amount || '').replace(/[^0-9]/g, '')) || 0;
    setSelectedInvoice(invoice);
    setPaidAmountInput(numVal.toString());
    setPaymentMethod('UPI');
    setIsCollectModalVisible(true);
  };

  const handleCloseCollectModal = () => {
    setIsCollectModalVisible(false);
    setSelectedInvoice(null);
    setPaidAmountInput('');
  };

  // Call Customer Handler
  const handleCallCustomer = (invoice: InvoiceItem) => {
    let phone = invoice.customerPhone;
    if (!phone) {
      const cust = customers.find(
        c => c.name.toLowerCase() === invoice.name.toLowerCase(),
      );
      phone = cust ? '+91 98765 43210' : '+91 98765 43210';
    }
    const cleanPhone = phone.replace(/[^0-9+]/g, '');
    Linking.openURL(`tel:${cleanPhone}`).catch(() => {
      setDialogConfig({
        visible: true,
        title: 'Call Failed',
        message: `Could not initiate call to ${phone}`,
        type: 'warning',
        buttons: [{ text: 'OK', onPress: closeDialog }],
      });
    });
  };

  // Process Payment Collection
  const handleConfirmCollection = () => {
    if (!selectedInvoice) return;

    const currentNumVal =
      selectedInvoice.numericAmount !== undefined
        ? selectedInvoice.numericAmount
        : parseInt((selectedInvoice.amount || '').replace(/[^0-9]/g, '')) || 0;

    const paidVal = parseFloat(paidAmountInput.trim());

    if (isNaN(paidVal) || paidVal <= 0) {
      setDialogConfig({
        visible: true,
        title: 'Invalid Amount',
        message: 'Please enter a valid payment amount greater than zero.',
        type: 'warning',
        buttons: [{ text: 'OK', onPress: closeDialog }],
      });
      return;
    }

    if (paidVal > currentNumVal) {
      setDialogConfig({
        visible: true,
        title: 'Overpayment Warning',
        message: `Entered amount (₹${paidVal}) is greater than invoice balance (₹${currentNumVal}).`,
        type: 'warning',
        buttons: [{ text: 'OK', onPress: closeDialog }],
      });
      return;
    }

    collectInvoicePayment(selectedInvoice.id, paidVal, paymentMethod);

    const isFull = paidVal >= currentNumVal;
    setToastMessage(
      isFull
        ? `✅ Full payment of ₹${paidVal.toLocaleString()} collected! Invoice marked as PAID.`
        : `✅ Partial payment of ₹${paidVal.toLocaleString()} collected! Remaining balance updated.`,
    );

    handleCloseCollectModal();
    setTimeout(() => setToastMessage(''), 3000);
  };

  // Live calculation of remaining amount for bottom sheet
  const selectedNumVal = selectedInvoice
    ? selectedInvoice.numericAmount !== undefined
      ? selectedInvoice.numericAmount
      : parseInt((selectedInvoice.amount || '').replace(/[^0-9]/g, '')) || 0
    : 0;

  const currentPaidInputVal = parseFloat(paidAmountInput.trim()) || 0;
  const calculatedRemaining = Math.max(0, selectedNumVal - currentPaidInputVal);

  return (
    <SafeAreaView style={styles.container}>
      <Header
        title="Pending Payments"
        showBack={true}
        showNotification={false}
      />

      {toastMessage !== '' && (
        <View style={styles.toast}>
          <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />
          <Text style={styles.toastText}>{toastMessage}</Text>
        </View>
      )}

      {/* Single Vertical ScrollView with Sticky Header (tabs + search) */}
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        stickyHeaderIndices={[1]}
      >
        {/* Index 0: Top Summary Section - Scrolls away naturally */}
        <View style={styles.heroCardContainer}>
          {/* Outstanding Total Banner */}
          <View style={styles.heroCard}>
            <View style={styles.heroRow}>
              <View>
                <Text style={styles.heroSub}>Total Outstanding Due</Text>
                <Text style={styles.heroValue}>
                  ₹{totalOutstandingSum.toLocaleString()}
                </Text>
              </View>
              <View style={styles.heroBadgeBox}>
                <Ionicons name="time-outline" size={16} color="#DC2626" />
                <Text style={styles.heroBadgeText}>
                  {pendingInvoices.length} Pending
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Index 1: Sticky Header Section (Filter Tabs & Search Input) */}
        <View style={styles.stickyHeaderContainer}>
          {/* Filter Tabs */}
          <View style={styles.tabContainer}>
            {[
              { id: 'ALL', label: `All Unpaid (${pendingInvoices.length})` },
              {
                id: 'PENDING',
                label: `Regular (${
                  pendingInvoices.filter(i => !i.isOverdue).length
                })`,
              },
              { id: 'OVERDUE', label: `Overdue (${overdueCount})` },
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

          {/* Search Bar */}
          <View style={styles.searchBox}>
            <Ionicons
              name="search-outline"
              size={18}
              color="#8A7E75"
              style={{ marginRight: 8 }}
            />
            <TextInput
              style={styles.searchInput}
              placeholder="Search customer, invoice no, or amount..."
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

        {/* Index 2: Scrollable Pending Invoices List */}
        <View style={styles.tabContentContainer}>
          {/* Section Header */}
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>
              CUSTOMERS WITH PENDING INVOICES
            </Text>
            <Text style={styles.countBadge}>
              {pendingInvoices.length} Invoices
            </Text>
          </View>

          {/* List of Unpaid Invoices */}
          {pendingInvoices.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons
                name="checkmark-done-circle-outline"
                size={54}
                color="#10B981"
              />
              <Text style={styles.emptyTitle}>No Pending Payments!</Text>
              <Text style={styles.emptySub}>
                All customers in this category have cleared their balances.
              </Text>
            </View>
          ) : (
            pendingInvoices.map(item => {
              const isOverdue = item.isOverdue || item.status === 'OVERDUE';
              const numVal =
                item.numericAmount !== undefined
                  ? item.numericAmount
                  : parseInt((item.amount || '').replace(/[^0-9]/g, '')) || 0;

              return (
                <View key={item.id} style={styles.paymentCard}>
                  {/* Card Top Header */}
                  <View style={styles.cardHeaderRow}>
                    <View style={styles.cardHeaderLeft}>
                      <View
                        style={[
                          styles.avatarBox,
                          isOverdue
                            ? styles.avatarBoxRed
                            : styles.avatarBoxOrange,
                        ]}
                      >
                        <Text
                          style={[
                            styles.avatarText,
                            isOverdue
                              ? styles.avatarTextRed
                              : styles.avatarTextOrange,
                          ]}
                        >
                          {item.name.charAt(0).toUpperCase()}
                        </Text>
                      </View>
                      <TouchableOpacity
                        style={{ flex: 1 }}
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
                      <Text style={styles.invoiceNoText}>
                        {item.invoiceNo || item.id} • {item.date || 'Recent'}
                      </Text>
                    </TouchableOpacity>
                  </View>

                  <View
                    style={[
                      styles.statusBadge,
                      isOverdue ? styles.badgeRed : styles.badgeOrange,
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusBadgeText,
                        isOverdue ? styles.textRed : styles.textOrange,
                      ]}
                    >
                      {isOverdue ? 'OVERDUE' : 'PENDING'}
                    </Text>
                  </View>
                </View>

                {/* Amount & Due Row */}
                <View style={styles.cardInfoBox}>
                  <View>
                    <Text style={styles.infoLabel}>Due Date / Terms</Text>
                    <Text
                      style={[
                        styles.infoVal,
                        isOverdue && { color: '#DC2626' },
                      ]}
                    >
                      {item.due}
                    </Text>
                  </View>

                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={styles.infoLabel}>Outstanding Amount</Text>
                    <Text style={styles.amountVal}>
                      ₹{numVal.toLocaleString()}
                    </Text>
                  </View>
                </View>

                {/* Card Actions */}
                <View style={styles.actionsRow}>
                  <TouchableOpacity
                    activeOpacity={0.8}
                    style={styles.actionCallBtn}
                    onPress={() => handleCallCustomer(item)}
                  >
                    <Ionicons name="call-outline" size={15} color="#2563EB" />
                    <Text style={styles.actionCallText}>Call</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    activeOpacity={0.8}
                    style={styles.actionViewBtn}
                    onPress={() =>
                      navigation.navigate('InvoiceDetail', { invoice: item })
                    }
                  >
                    <Ionicons name="eye-outline" size={15} color="#8C331A" />
                    <Text style={styles.actionViewText}>View Invoice</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    activeOpacity={0.85}
                    style={styles.actionCollectBtn}
                    onPress={() => handleOpenCollectModal(item)}
                  >
                    <Ionicons name="cash-outline" size={16} color="#FFFFFF" />
                    <Text style={styles.actionCollectText}>
                      Collect Payment
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })
        )}
        </View>
      </ScrollView>

      {/* Payment Collection Bottom Sheet Modal */}
      <Modal
        visible={isCollectModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={handleCloseCollectModal}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={styles.modalDismissArea}
            activeOpacity={1}
            onPress={handleCloseCollectModal}
          />

          <View style={styles.bottomSheetContainer}>
            {/* Sheet Handle Indicator */}
            <View style={styles.sheetHandle} />

            {/* Sheet Header */}
            <View style={styles.sheetHeader}>
              <View>
                <Text style={styles.sheetTitle}>Collect Payment</Text>
                <Text style={styles.sheetSubtitle}>
                  {selectedInvoice?.name} (
                  {selectedInvoice?.invoiceNo || selectedInvoice?.id})
                </Text>
              </View>
              <TouchableOpacity
                style={styles.closeBtn}
                onPress={handleCloseCollectModal}
              >
                <Ionicons name="close" size={22} color="#6E6259" />
              </TouchableOpacity>
            </View>

            {/* Current Balance Banner */}
            <View style={styles.balanceBanner}>
              <Text style={styles.balanceLabel}>
                Current Invoice Outstanding
              </Text>
              <Text style={styles.balanceValue}>
                ₹{selectedNumVal.toLocaleString()}
              </Text>
            </View>

            {/* Enter Paid Amount */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>ENTER PAID AMOUNT (₹)</Text>
              <View style={styles.amountInputRow}>
                <Text style={styles.currencySymbol}>₹</Text>
                <TextInput
                  style={styles.amountInput}
                  keyboardType="numeric"
                  value={paidAmountInput}
                  onChangeText={setPaidAmountInput}
                  placeholder="Enter amount"
                  placeholderTextColor="#A09489"
                />
                <TouchableOpacity
                  style={styles.fullAmountChip}
                  onPress={() => setPaidAmountInput(selectedNumVal.toString())}
                >
                  <Text style={styles.fullAmountChipText}>Full Amount</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Payment Method Selection */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>PAYMENT METHOD</Text>
              <View style={styles.methodsRow}>
                {[
                  { id: 'UPI', label: 'UPI / GPay', icon: 'qr-code-outline' },
                  { id: 'Cash', label: 'Cash', icon: 'cash-outline' },
                  { id: 'Card', label: 'Card', icon: 'card-outline' },
                  {
                    id: 'Bank Transfer',
                    label: 'Bank',
                    icon: 'business-outline',
                  },
                ].map(m => (
                  <TouchableOpacity
                    key={m.id}
                    activeOpacity={0.8}
                    style={[
                      styles.methodCard,
                      paymentMethod === m.id && styles.methodCardActive,
                    ]}
                    onPress={() => setPaymentMethod(m.id as any)}
                  >
                    <Ionicons
                      name={m.icon}
                      size={18}
                      color={paymentMethod === m.id ? '#8C331A' : '#6E6259'}
                    />
                    <Text
                      style={[
                        styles.methodLabel,
                        paymentMethod === m.id && styles.methodLabelActive,
                      ]}
                    >
                      {m.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Remaining Amount Calculation Summary */}
            <View style={styles.summaryCard}>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>
                  Remaining Balance After Payment:
                </Text>
                <Text
                  style={[
                    styles.summaryVal,
                    calculatedRemaining === 0
                      ? styles.textSuccess
                      : styles.textWarning,
                  ]}
                >
                  ₹{calculatedRemaining.toLocaleString()}
                </Text>
              </View>
              <Text style={styles.summaryNotice}>
                {calculatedRemaining === 0
                  ? '✨ This invoice will be marked as FULLY PAID and removed from pending lists.'
                  : 'ℹ️ Invoice status will update to Partially Paid with remaining due balance.'}
              </Text>
            </View>

            {/* Confirm Collection Action Button */}
            <TouchableOpacity
              activeOpacity={0.88}
              style={styles.confirmBtn}
              onPress={handleConfirmCollection}
            >
              <Ionicons
                name="checkmark-circle-outline"
                size={20}
                color="#FFFFFF"
              />
              <Text style={styles.confirmBtnText}>
                Confirm Collection (₹{currentPaidInputVal.toLocaleString()})
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* CUSTOM DIALOG POPUP */}
      <CustomDialog
        visible={dialogConfig.visible}
        title={dialogConfig.title}
        message={dialogConfig.message}
        type={dialogConfig.type}
        buttons={dialogConfig.buttons}
        onClose={closeDialog}
      />
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
    fontSize: 13,
    marginLeft: 10,
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  heroCardContainer: {
    paddingHorizontal: 16,
    paddingTop: 12,
    backgroundColor: '#FAF8F5',
  },
  stickyHeaderContainer: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 2,
    backgroundColor: '#FAF8F5',
    zIndex: 10,
  },
  tabContentContainer: {
    paddingHorizontal: 16,
    paddingTop: 8,
    backgroundColor: '#FAF8F5',
  },

  /* Hero Banner */
  heroCard: {
    backgroundColor: '#7A2E19',
    borderRadius: 20,
    padding: 20,
    marginBottom: 14,
    elevation: 4,
    shadowColor: '#7A2E19',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
  },
  heroRow: {
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
    marginTop: 4,
  },
  heroBadgeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFE4E6',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
  },
  heroBadgeText: {
    color: '#DC2626',
    fontWeight: '800',
    fontSize: 12,
    marginLeft: 6,
  },

  /* Tabs */
  tabContainer: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  tabChip: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: 'center',
    marginRight: 6,
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

  /* Search */
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#EFECE9',
    marginBottom: 14,
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
    marginBottom: 12,
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
    paddingVertical: 50,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#2C201A',
    marginTop: 10,
  },
  emptySub: {
    fontSize: 12,
    color: '#8A7E75',
    textAlign: 'center',
    marginTop: 4,
  },

  /* Customer Payment Card */
  paymentCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#EFECE9',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatarBox: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarBoxOrange: { backgroundColor: '#FDEBE4' },
  avatarBoxRed: { backgroundColor: '#FEE2E2' },
  avatarText: { fontSize: 16, fontWeight: '800' },
  avatarTextOrange: { color: '#8C331A' },
  avatarTextRed: { color: '#DC2626' },

  customerName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#2C201A',
  },
  invoiceNoText: {
    fontSize: 12,
    color: '#8A7E75',
    marginTop: 2,
  },

  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
  },
  badgeRed: { backgroundColor: '#FFE4E6' },
  badgeOrange: { backgroundColor: '#FFFBEB' },
  statusBadgeText: { fontSize: 10, fontWeight: '800' },
  textRed: { color: '#E11D48' },
  textOrange: { color: '#D97706' },

  cardInfoBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FAF8F5',
    borderRadius: 12,
    padding: 12,
    marginBottom: 14,
  },
  infoLabel: {
    fontSize: 11,
    color: '#8A7E75',
    fontWeight: '600',
  },
  infoVal: {
    fontSize: 13,
    fontWeight: '700',
    color: '#2C201A',
    marginTop: 2,
  },
  amountVal: {
    fontSize: 18,
    fontWeight: '800',
    color: '#8C331A',
    marginTop: 2,
  },

  /* Action Buttons */
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  actionCallBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 12,
  },
  actionCallText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#2563EB',
    marginLeft: 4,
  },
  actionViewBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FDEBE4',
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 12,
  },
  actionViewText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#8C331A',
    marginLeft: 4,
  },
  actionCollectBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#059669',
    paddingVertical: 9,
    borderRadius: 12,
    elevation: 1,
  },
  actionCollectText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FFFFFF',
    marginLeft: 6,
  },

  /* Bottom Sheet Modal */
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'flex-end',
  },
  modalDismissArea: {
    flex: 1,
  },
  bottomSheetContainer: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 34,
  },
  sheetHandle: {
    width: 40,
    height: 4,
    backgroundColor: '#E5E0DA',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 14,
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#2C201A',
  },
  sheetSubtitle: {
    fontSize: 12,
    color: '#8A7E75',
    marginTop: 2,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F5F2EF',
    justifyContent: 'center',
    alignItems: 'center',
  },

  balanceBanner: {
    backgroundColor: '#7A2E19',
    borderRadius: 16,
    padding: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  balanceLabel: {
    fontSize: 12,
    color: '#F7D3C6',
    fontWeight: '600',
  },
  balanceValue: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFFFFF',
  },

  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#6E6259',
    letterSpacing: 0.6,
    marginBottom: 8,
  },
  amountInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FAF8F5',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#EFECE9',
    paddingHorizontal: 14,
    height: 48,
  },
  currencySymbol: {
    fontSize: 18,
    fontWeight: '800',
    color: '#8C331A',
    marginRight: 8,
  },
  amountInput: {
    flex: 1,
    fontSize: 18,
    fontWeight: '700',
    color: '#2C201A',
    padding: 0,
  },
  fullAmountChip: {
    backgroundColor: '#FDEBE4',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
  },
  fullAmountChipText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#8C331A',
  },

  methodsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  methodCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FAF8F5',
    borderRadius: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#EFECE9',
  },
  methodCardActive: {
    backgroundColor: '#FDEBE4',
    borderColor: '#8C331A',
  },
  methodLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#6E6259',
    marginLeft: 4,
  },
  methodLabelActive: {
    color: '#8C331A',
  },

  summaryCard: {
    backgroundColor: '#FAF8F5',
    borderRadius: 14,
    padding: 14,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: '#EFECE9',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  summaryLabel: {
    fontSize: 12,
    color: '#6E6259',
    fontWeight: '600',
  },
  summaryVal: {
    fontSize: 15,
    fontWeight: '800',
  },
  textSuccess: { color: '#059669' },
  textWarning: { color: '#D97706' },
  summaryNotice: {
    fontSize: 11,
    color: '#8A7E75',
    marginTop: 2,
  },

  confirmBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#059669',
    borderRadius: 16,
    paddingVertical: 14,
    elevation: 3,
  },
  confirmBtnText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
    marginLeft: 8,
  },
});
