import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  TextInput,
  Modal,
  Alert,
  Keyboard,
  Platform,
  KeyboardAvoidingView,
  useWindowDimensions,
  BackHandler,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { Header, BillingCycleDayModal } from '../../components/common';
import { CollectPaymentModal, ReversePaymentModal, type CollectPaymentFormData } from '../../components/payment';
import billingService, {
  BillingCustomer,
} from '../../services/billing.service';
import { pdfService } from '../../services/pdf.service';
import { useApp } from '../../context/AppContext';
import AppToast from '../../utils/toast';
import { colors, fontFamilies } from '../../theme';

interface CustomerLedgerScreenProps {
  route: any;
  navigation: any;
}

const MONTH_NAMES_SHORT = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
];

const MONTH_NAMES_FULL = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

/**
 * Backend Billing Cycle Period Calculation:
 * - Cycle day 1: 1st of month to last day of same month.
 * - Cycle day N (2..31): Starts on day N of (year, month) [clamped to last day of month]
 *   and ends on the day before day N of the next month [clamped to last day of next month].
 */
function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

function clampDay(year: number, month: number, day: number): number {
  const maxDays = getDaysInMonth(year, month);
  return Math.min(Math.max(1, day), maxDays);
}

function calculateCustomerBillingPeriod(cycleDay: number, year: number, month: number) {
  const cDay = Math.max(1, Math.min(31, cycleDay || 1));
  const periodKey = `${year}-${String(month).padStart(2, '0')}`;

  if (cDay === 1) {
    const lastDay = getDaysInMonth(year, month);
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month - 1, lastDay);
    return {
      periodKey,
      startDate,
      endDate,
      startFormatted: `${1} ${MONTH_NAMES_SHORT[month - 1]} ${year}`,
      endFormatted: `${lastDay} ${MONTH_NAMES_SHORT[month - 1]} ${year}`,
      label: `${1} ${MONTH_NAMES_SHORT[month - 1]} ${year} – ${lastDay} ${MONTH_NAMES_SHORT[month - 1]} ${year}`,
    };
  }

  const startDay = clampDay(year, month, cDay);
  const startDate = new Date(year, month - 1, startDay);

  let nextYear = year;
  let nextMonth = month + 1;
  if (month === 12) {
    nextYear = year + 1;
    nextMonth = 1;
  }

  const nextStartDay = clampDay(nextYear, nextMonth, cDay);
  const nextStartDate = new Date(nextYear, nextMonth - 1, nextStartDay);
  const endDate = new Date(nextStartDate.getTime() - 24 * 60 * 60 * 1000);

  return {
    periodKey,
    startDate,
    endDate,
    startFormatted: `${startDate.getDate()} ${MONTH_NAMES_SHORT[startDate.getMonth()]} ${startDate.getFullYear()}`,
    endFormatted: `${endDate.getDate()} ${MONTH_NAMES_SHORT[endDate.getMonth()]} ${endDate.getFullYear()}`,
    label: `${startDate.getDate()} ${MONTH_NAMES_SHORT[startDate.getMonth()]} ${startDate.getFullYear()} – ${endDate.getDate()} ${MONTH_NAMES_SHORT[endDate.getMonth()]} ${endDate.getFullYear()}`,
  };
}

export default function CustomerLedgerScreen({ route, navigation }: CustomerLedgerScreenProps) {
  const { refreshBackendData } = useApp();
  const { height: windowHeight } = useWindowDimensions();

  const initialCustomerId = route.params?.customerId || route.params?.customer?.id;
  const initialCustomer = route.params?.customer;

  // Selected Customer State
  const [selectedCustomerId, setSelectedCustomerId] = useState<number | null>(
    initialCustomerId ? Number(initialCustomerId) : null
  );
  const [selectedCustomer, setSelectedCustomer] = useState<BillingCustomer | null>(
    initialCustomer || null
  );

  // Selected Billing Period Navigation State (Defaults to current year/month)
  const now = new Date();
  const [selectedYear, setSelectedYear] = useState<number>(now.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number>(now.getMonth() + 1); // 1-12
  const [monthPickerVisible, setMonthPickerVisible] = useState(false);
  const [cycleDayModalVisible, setCycleDayModalVisible] = useState(false);

  // Customer Selector Modal State
  const [customerModalVisible, setCustomerModalVisible] = useState(false);
  const [customerSearchQuery, setCustomerSearchQuery] = useState('');
  const [allCustomers, setAllCustomers] = useState<BillingCustomer[]>([]);
  const [loadingCustomers, setLoadingCustomers] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState<number>(0);

  // Ledger Data State
  const [loadingLedger, setLoadingLedger] = useState(false);
  const [monthlyRecords, setMonthlyRecords] = useState<any[]>([]);
  const [paymentHistory, setPaymentHistory] = useState<any[]>([]);
  const [totalOutstanding, setTotalOutstanding] = useState<string>('0.00');

  // Record Payment Modal
  const [showCollectPaymentModal, setShowCollectPaymentModal] = useState(false);
  const [reverseModalVisible, setReverseModalVisible] = useState(false);
  const [selectedPaymentForReverse, setSelectedPaymentForReverse] = useState<{
    id: number;
    amount: string | number;
    received_at?: string;
  } | null>(null);

  // Export State
  const [exporting, setExporting] = useState<'pdf' | 'excel' | null>(null);

  // Keyboard and BackHandler management for customer switcher modal
  useEffect(() => {
    if (!customerModalVisible) {
      setKeyboardHeight(0);
      return;
    }

    const showSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      e => setKeyboardHeight(e.endCoordinates.height)
    );
    const hideSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => setKeyboardHeight(0)
    );

    const backAction = () => {
      if (keyboardHeight > 0) {
        Keyboard.dismiss();
        return true;
      }
      setCustomerModalVisible(false);
      return true;
    };
    const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);

    return () => {
      showSub.remove();
      hideSub.remove();
      backHandler.remove();
    };
  }, [customerModalVisible, keyboardHeight]);

  // 1. Fetch All Customers for switching
  const fetchCustomers = useCallback(async () => {
    try {
      setLoadingCustomers(true);
      const list = await billingService.getCustomers('');
      setAllCustomers(list || []);
      if (!selectedCustomer && initialCustomerId) {
        const found = (list || []).find(c => c.id === Number(initialCustomerId));
        if (found) setSelectedCustomer(found);
      }
    } catch (_err) {
      // Ignore silently
    } finally {
      setLoadingCustomers(false);
    }
  }, [initialCustomerId, selectedCustomer]);

  // 2. Fetch Customer Monthly Ledger Overview
  const fetchCustomerLedgerData = useCallback(async (custId: number) => {
    try {
      setLoadingLedger(true);
      const data = await billingService.getCustomerMonthlyLedger(custId);
      if (data) {
        setMonthlyRecords(data.monthly_records || []);
        setPaymentHistory(data.payment_history || []);
        setTotalOutstanding(data.total_outstanding || '0.00');
      }
    } catch (err: any) {
      AppToast.error('Ledger Error', err?.message || 'Could not load ledger data.');
    } finally {
      setLoadingLedger(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  useEffect(() => {
    if (selectedCustomerId) {
      fetchCustomerLedgerData(selectedCustomerId);
    }
  }, [selectedCustomerId, fetchCustomerLedgerData]);

  // Customer Switch Handler
  const handleSelectCustomer = (cust: BillingCustomer) => {
    Keyboard.dismiss();
    setSelectedCustomerId(cust.id);
    setSelectedCustomer(cust);
    setCustomerModalVisible(false);
    // When customer changes, update to their cycle and current period
    const today = new Date();
    setSelectedYear(today.getFullYear());
    setSelectedMonth(today.getMonth() + 1);
  };

  // Change Billing Cycle Day Handler
  const handleSaveBillingCycleDay = async (newDay: number) => {
    if (!selectedCustomerId || !selectedCustomer) return;
    try {
      const updated = await billingService.updateCustomer(selectedCustomerId, {
        billing_cycle_day: newDay,
      });
      // Update selected customer state
      const refreshedCustomer: BillingCustomer = {
        ...selectedCustomer,
        billing_cycle_day: newDay,
        ...(updated || {}),
      };
      setSelectedCustomer(refreshedCustomer);
      // Update customer in allCustomers list
      setAllCustomers(prev =>
        prev.map(c => (c.id === selectedCustomerId ? { ...c, billing_cycle_day: newDay } : c))
      );
      // Refresh ledger data and global app context
      await fetchCustomerLedgerData(selectedCustomerId);
      refreshBackendData();
      AppToast.success(
        'Billing Day Updated',
        `Cycle day set to ${newDay}${newDay === 1 ? 'st' : newDay === 2 ? 'nd' : newDay === 3 ? 'rd' : 'th'} of every month.`
      );
    } catch (err: any) {
      AppToast.error('Update Failed', err?.message || 'Could not update billing cycle day.');
      throw err;
    }
  };

  // Filtered customer list for modal
  const filteredCustomers = useMemo(() => {
    if (!customerSearchQuery.trim()) return allCustomers;
    const q = customerSearchQuery.toLowerCase();
    return allCustomers.filter(
      c => c.name.toLowerCase().includes(q) || (c.phone && c.phone.includes(q))
    );
  }, [allCustomers, customerSearchQuery]);

  // Active Billing Cycle Day & Period Calculation
  const cycleDay = selectedCustomer?.billing_cycle_day || 1;
  const currentPeriodInfo = useMemo(() => {
    return calculateCustomerBillingPeriod(cycleDay, selectedYear, selectedMonth);
  }, [cycleDay, selectedYear, selectedMonth]);

  // Previous Period Navigation
  const handlePrevPeriod = () => {
    if (selectedMonth === 1) {
      setSelectedMonth(12);
      setSelectedYear(prev => prev - 1);
    } else {
      setSelectedMonth(prev => prev - 1);
    }
  };

  // Next Period Navigation
  const handleNextPeriod = () => {
    if (selectedMonth === 12) {
      setSelectedMonth(1);
      setSelectedYear(prev => prev + 1);
    } else {
      setSelectedMonth(prev => prev + 1);
    }
  };

  // Filter invoices for the selected billing period
  const periodInvoices = useMemo(() => {
    if (!selectedCustomerId) return [];
    const targetKey = currentPeriodInfo.periodKey;
    return monthlyRecords.filter(r => {
      // Check billing_month format (e.g. "2026-11" or contains matching YYYY-MM)
      if (r.billing_month && r.billing_month.includes(targetKey)) {
        return true;
      }
      // Or check created_at date falls within the period
      if (r.created_at) {
        const d = new Date(r.created_at);
        return d >= currentPeriodInfo.startDate && d <= currentPeriodInfo.endDate;
      }
      return false;
    });
  }, [monthlyRecords, currentPeriodInfo, selectedCustomerId]);

  // Filter payment history for the selected billing period
  const periodPayments = useMemo(() => {
    if (!selectedCustomerId) return [];
    return paymentHistory.filter(p => {
      if (!p.received_at) return true;
      const d = new Date(p.received_at);
      return d >= currentPeriodInfo.startDate && d <= currentPeriodInfo.endDate;
    });
  }, [paymentHistory, currentPeriodInfo, selectedCustomerId]);

  // Compute Period-Specific Financial Summary
  const financialSummary = useMemo(() => {
    if (!selectedCustomerId) {
      return {
        openingBalance: '0',
        totalInvoiced: '0',
        totalCollections: '0',
        outstandingBalance: '0',
        paymentStatus: 'Unpaid' as const,
      };
    }

    // Invoices strictly for the selected period
    const totalInvoiced = periodInvoices.reduce(
      (sum, r) => sum + (parseFloat(r.total_bill) || 0),
      0
    );

    // Collections strictly for the selected period
    const totalCollections = periodPayments.reduce(
      (sum, p) => sum + (parseFloat(p.amount) || 0),
      0
    );

    // Outstanding balance for the period's invoices
    const periodRemaining = periodInvoices.reduce(
      (sum, r) => sum + (parseFloat(r.remaining_balance) || 0),
      0
    );

    // Cumulative historical calculation prior to this period
    const priorInvoiced = monthlyRecords.filter(r => {
      if (r.created_at) {
        return new Date(r.created_at) < currentPeriodInfo.startDate;
      }
      return false;
    }).reduce((sum, r) => sum + (parseFloat(r.total_bill) || 0), 0);

    const priorPaid = paymentHistory.filter(p => {
      if (p.received_at) {
        return new Date(p.received_at) < currentPeriodInfo.startDate;
      }
      return false;
    }).reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);

    const openingBalance = Math.max(0, priorInvoiced - priorPaid);
    const outstanding = periodInvoices.length > 0 ? periodRemaining : Math.max(0, totalInvoiced - totalCollections);

    let paymentStatus: 'Paid' | 'Partially Paid' | 'Unpaid' = 'Unpaid';
    if (outstanding <= 0 && totalInvoiced > 0) {
      paymentStatus = 'Paid';
    } else if (totalCollections > 0 && outstanding > 0) {
      paymentStatus = 'Partially Paid';
    }

    return {
      openingBalance: openingBalance.toFixed(0),
      totalInvoiced: totalInvoiced.toFixed(0),
      totalCollections: totalCollections.toFixed(0),
      outstandingBalance: outstanding.toFixed(0),
      paymentStatus,
    };
  }, [periodInvoices, periodPayments, monthlyRecords, paymentHistory, currentPeriodInfo, selectedCustomerId]);

  // Record Payment Confirmation via existing FIFO endpoint
  const handleConfirmPayment = async (data: CollectPaymentFormData) => {
    if (!selectedCustomerId) return;
    try {
      const res = await billingService.collectCustomerPayment(selectedCustomerId, {
        amount: data.amount,
        notes: data.notes,
      });
      AppToast.success(
        'Payment Recorded',
        `₹${data.amount} received. Allocated: ₹${res.amount_allocated || data.amount}.`
      );
      setShowCollectPaymentModal(false);
      fetchCustomerLedgerData(selectedCustomerId);
      refreshBackendData();
    } catch (err: any) {
      AppToast.error('Payment Failed', err?.message || 'Could not record payment.');
    }
  };

  // Reverse Payment Handler
  const handleConfirmReversePayment = async (reason: string) => {
    if (!selectedPaymentForReverse) return;
    try {
      await billingService.reversePayment(selectedPaymentForReverse.id, reason);
      setReverseModalVisible(false);
      setSelectedPaymentForReverse(null);
      AppToast.success('Payment Reversed', 'Payment allocation safely undone and balances updated.');
      if (selectedCustomerId) {
        fetchCustomerLedgerData(selectedCustomerId);
      }
      refreshBackendData();
    } catch (err: any) {
      AppToast.error('Reversal Failed', err?.message || 'Could not reverse payment.');
      throw err;
    }
  };

  // Export handlers
  const handleExportPdf = async () => {
    if (!selectedCustomerId) {
      AppToast.warning('Select Customer', 'Please select a customer first.');
      return;
    }
    const targetInvoice = periodInvoices[0] || monthlyRecords[0];
    if (!targetInvoice?.invoice_id) {
      Alert.alert(
        'Multi-Month Ledger Export Gap',
        'A dedicated complete all-time multi-month customer ledger PDF endpoint is not yet implemented on the backend. You can export individual monthly invoices from the invoice list below.',
        [{ text: 'Understood' }]
      );
      return;
    }

    try {
      setExporting('pdf');
      await pdfService.openInvoicePdf(
        targetInvoice.invoice_id,
        targetInvoice.invoice_number
      );
      AppToast.success('PDF Ready', `Opened ${targetInvoice.invoice_number} PDF.`);
    } catch (err: any) {
      AppToast.error('PDF Failed', err?.message || 'Could not export invoice PDF.');
    } finally {
      setExporting(null);
    }
  };

  const handleExportExcel = async () => {
    if (!selectedCustomerId) {
      AppToast.warning('Select Customer', 'Please select a customer first.');
      return;
    }
    const targetInvoice = periodInvoices[0] || monthlyRecords[0];
    if (!targetInvoice?.invoice_id) {
      Alert.alert(
        'Multi-Month Ledger Export Gap',
        'A dedicated complete all-time multi-month customer ledger Excel endpoint is not yet implemented on the backend. You can export individual monthly invoice Excel workbooks below.',
        [{ text: 'Understood' }]
      );
      return;
    }

    try {
      setExporting('excel');
      await pdfService.downloadInvoiceExcel(
        targetInvoice.invoice_id,
        targetInvoice.invoice_number
      );
      AppToast.success('Excel Saved', `Downloaded ${targetInvoice.invoice_number} Excel file.`);
    } catch (err: any) {
      AppToast.error('Excel Failed', err?.message || 'Could not export invoice Excel.');
    } finally {
      setExporting(null);
    }
  };

  const isKeyboardOpen = keyboardHeight > 0;
  const modalMaxHeight = isKeyboardOpen
    ? Math.max(windowHeight - keyboardHeight - 32, 280)
    : Math.min(windowHeight * 0.85, 480);

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      {/* Top Header */}
      <Header
        title="Customer Ledger"
        showBack={true}
        showNotification={false}
      />

      <FlatList
        data={periodInvoices}
        keyExtractor={item => String(item.invoice_id)}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <>
            {/* 1. Searchable Customer Selector Card */}
            <View style={styles.customerSelectorCard}>
              <View style={styles.customerSelectorInfo}>
                <Text style={styles.customerSelectorLabel}>CUSTOMER</Text>
                <Text style={styles.customerSelectorName} numberOfLines={1}>
                  {selectedCustomer?.name || 'Select Customer'}
                </Text>
                {selectedCustomer?.phone && (
                  <Text style={styles.customerSelectorPhone}>{selectedCustomer.phone}</Text>
                )}
              </View>
              <TouchableOpacity
                style={styles.switchCustomerBtn}
                onPress={() => {
                  setCustomerSearchQuery('');
                  setCustomerModalVisible(true);
                }}
                activeOpacity={0.7}
              >
                <Ionicons name="swap-horizontal" size={14} color="#8C331A" style={{ marginRight: 4 }} />
                <Text style={styles.switchCustomerBtnText}>Switch</Text>
              </TouchableOpacity>
            </View>

            {/* 2. Customer Billing Cycle & Period Navigation Card */}
            <View style={styles.cycleCard}>
              <View style={styles.cycleHeaderRow}>
                <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: 8 }}>
                  <Ionicons name="calendar-outline" size={16} color="#8C331A" style={{ marginRight: 6 }} />
                  <Text style={styles.cycleTitle}>
                    Cycle Day {cycleDay} of month
                  </Text>
                  {selectedCustomerId ? (
                    <TouchableOpacity
                      style={styles.changeCycleBtn}
                      onPress={() => setCycleDayModalVisible(true)}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="create-outline" size={12} color="#8C331A" style={{ marginRight: 3 }} />
                      <Text style={styles.changeCycleBtnText}>Change Billing Day</Text>
                    </TouchableOpacity>
                  ) : null}
                </View>
                <TouchableOpacity
                  style={styles.monthPickPill}
                  onPress={() => setMonthPickerVisible(true)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.monthPickPillText}>
                    {MONTH_NAMES_SHORT[selectedMonth - 1]} {selectedYear}
                  </Text>
                  <Ionicons name="chevron-down" size={12} color="#8C331A" style={{ marginLeft: 3 }} />
                </TouchableOpacity>
              </View>

              {/* Period Date Range with Previous/Next Controls */}
              <View style={styles.periodNavigatorRow}>
                <TouchableOpacity
                  style={styles.periodNavArrowBtn}
                  onPress={handlePrevPeriod}
                  activeOpacity={0.7}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons name="chevron-back" size={18} color="#8C331A" />
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.periodDisplayCenter}
                  onPress={() => setMonthPickerVisible(true)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.periodDateRangeText}>
                    {currentPeriodInfo.label}
                  </Text>
                  <Text style={styles.periodSubHint}>Tap to pick month</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.periodNavArrowBtn}
                  onPress={handleNextPeriod}
                  activeOpacity={0.7}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons name="chevron-forward" size={18} color="#8C331A" />
                </TouchableOpacity>
              </View>
            </View>

            {/* 3. 4-Value Financial Summary */}
            <View style={styles.financialSummaryCard}>
              <View style={styles.summaryRow}>
                <View style={styles.summaryCol}>
                  <Text style={styles.summaryColLabel}>Opening Balance</Text>
                  <Text style={styles.summaryColValue}>₹{financialSummary.openingBalance}</Text>
                </View>
                <View style={styles.summaryCol}>
                  <Text style={styles.summaryColLabel}>Total Invoiced</Text>
                  <Text style={styles.summaryColValue}>₹{financialSummary.totalInvoiced}</Text>
                </View>
              </View>

              <View style={styles.summaryDivider} />

              <View style={styles.summaryRow}>
                <View style={styles.summaryCol}>
                  <Text style={styles.summaryColLabel}>Total Collections</Text>
                  <Text style={[styles.summaryColValue, { color: '#059669' }]}>
                    ₹{financialSummary.totalCollections}
                  </Text>
                </View>
                <View style={styles.summaryCol}>
                  <Text style={styles.summaryColLabel}>Outstanding Balance</Text>
                  <Text
                    style={[
                      styles.summaryColValue,
                      { color: parseFloat(financialSummary.outstandingBalance) > 0 ? '#DC2626' : '#059669' },
                    ]}
                  >
                    ₹{financialSummary.outstandingBalance}
                  </Text>
                </View>
              </View>

              <View style={styles.statusRow}>
                <Text style={styles.statusRowLabel}>Period Payment Status:</Text>
                <View
                  style={[
                    styles.statusPill,
                    financialSummary.paymentStatus === 'Paid'
                      ? styles.statusPaid
                      : financialSummary.paymentStatus === 'Partially Paid'
                      ? styles.statusPartial
                      : styles.statusUnpaid,
                  ]}
                >
                  <Text
                    style={[
                      styles.statusPillText,
                      financialSummary.paymentStatus === 'Paid'
                        ? styles.statusPaidText
                        : financialSummary.paymentStatus === 'Partially Paid'
                        ? styles.statusPartialText
                        : styles.statusUnpaidText,
                    ]}
                  >
                    {financialSummary.paymentStatus.toUpperCase()}
                  </Text>
                </View>
              </View>
            </View>

            {/* Actions Bar: Record Payment, PDF, Excel */}
            <View style={styles.actionButtonsRow}>
              <TouchableOpacity
                style={styles.recordPaymentPrimaryBtn}
                onPress={() => {
                  if (!selectedCustomerId) {
                    setCustomerSearchQuery('');
                    setCustomerModalVisible(true);
                  } else {
                    setShowCollectPaymentModal(true);
                  }
                }}
                activeOpacity={0.8}
              >
                <Ionicons name="cash" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
                <Text style={styles.recordPaymentPrimaryBtnText}>Record Payment</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.exportBtn}
                onPress={handleExportPdf}
                disabled={exporting !== null}
                activeOpacity={0.7}
              >
                {exporting === 'pdf' ? (
                  <ActivityIndicator size="small" color="#8C331A" />
                ) : (
                  <>
                    <Ionicons name="document-text-outline" size={15} color="#8C331A" style={{ marginRight: 4 }} />
                    <Text style={styles.exportBtnText}>PDF</Text>
                  </>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.exportBtn}
                onPress={handleExportExcel}
                disabled={exporting !== null}
                activeOpacity={0.7}
              >
                {exporting === 'excel' ? (
                  <ActivityIndicator size="small" color="#059669" />
                ) : (
                  <>
                    <Ionicons name="grid-outline" size={15} color="#059669" style={{ marginRight: 4 }} />
                    <Text style={[styles.exportBtnText, { color: '#059669' }]}>Excel</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>

            {/* Monthly Invoices Section Header */}
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>
                PERIOD INVOICES ({currentPeriodInfo.startFormatted} – {currentPeriodInfo.endFormatted})
              </Text>
              <Text style={styles.sectionSubtitle}>
                {periodInvoices.length} {periodInvoices.length === 1 ? 'invoice' : 'invoices'} in this billing cycle
              </Text>
            </View>

            {loadingLedger && (
              <View style={styles.centerBox}>
                <ActivityIndicator size="small" color="#8C331A" />
                <Text style={styles.loadingText}>Loading ledger records...</Text>
              </View>
            )}

            {!loadingLedger && !selectedCustomerId && (
              <View style={styles.emptyCard}>
                <Ionicons name="people-outline" size={32} color="#8C331A" />
                <Text style={styles.emptyTitle}>No Customer Selected</Text>
                <Text style={styles.emptySubtitle}>Tap "Switch" above to search and select any customer.</Text>
                <TouchableOpacity
                  style={[styles.switchCustomerBtn, { marginTop: 10 }]}
                  onPress={() => {
                    setCustomerSearchQuery('');
                    setCustomerModalVisible(true);
                  }}
                  activeOpacity={0.7}
                >
                  <Ionicons name="search" size={14} color="#8C331A" style={{ marginRight: 4 }} />
                  <Text style={styles.switchCustomerBtnText}>Select Customer</Text>
                </TouchableOpacity>
              </View>
            )}

            {!loadingLedger && selectedCustomerId && periodInvoices.length === 0 && (
              <View style={styles.emptyCard}>
                <Ionicons name="document-text-outline" size={28} color="#D8CEC4" />
                <Text style={styles.emptyTitle}>No Invoices For This Period</Text>
                <Text style={styles.emptySubtitle}>
                  No invoices recorded for {currentPeriodInfo.label}. Use the arrows to navigate previous or next cycles.
                </Text>
              </View>
            )}
          </>
        }
        renderItem={({ item }) => {
          const isPaid = item.status === 'PAID';
          const isPartial = item.status === 'PARTIALLY_PAID';
          return (
            <TouchableOpacity
              style={styles.invoiceCard}
              activeOpacity={0.7}
              onPress={() => {
                navigation.navigate('InvoiceDetail', {
                  invoice: {
                    id: item.invoice_id,
                    invoice_number: item.invoice_number,
                    billing_period: item.billing_month,
                    grand_total: item.total_bill,
                    total_paid: item.amount_received,
                    pending_amount: item.remaining_balance,
                    status: item.status.toLowerCase(),
                    customer_name: selectedCustomer?.name,
                    customer: selectedCustomer,
                  },
                });
              }}
            >
              <View style={styles.invoiceCardHeader}>
                <View>
                  <Text style={styles.invoiceNumber}>{item.invoice_number}</Text>
                  <Text style={styles.invoicePeriod}>Period: {item.billing_month}</Text>
                </View>
                <View
                  style={[
                    styles.invStatusBadge,
                    isPaid ? styles.statusPaid : isPartial ? styles.statusPartial : styles.statusUnpaid,
                  ]}
                >
                  <Text
                    style={[
                      styles.invStatusBadgeText,
                      isPaid ? styles.statusPaidText : isPartial ? styles.statusPartialText : styles.statusUnpaidText,
                    ]}
                  >
                    {item.status}
                  </Text>
                </View>
              </View>

              <View style={styles.invoiceAmountsRow}>
                <View style={styles.amountCol}>
                  <Text style={styles.amountColLabel}>Invoiced</Text>
                  <Text style={styles.amountColVal}>₹{parseFloat(item.total_bill || 0).toLocaleString('en-IN')}</Text>
                </View>
                <View style={styles.amountCol}>
                  <Text style={styles.amountColLabel}>Received</Text>
                  <Text style={[styles.amountColVal, { color: '#059669' }]}>
                    ₹{parseFloat(item.amount_received || 0).toLocaleString('en-IN')}
                  </Text>
                </View>
                <View style={styles.amountCol}>
                  <Text style={styles.amountColLabel}>Remaining</Text>
                  <Text
                    style={[
                      styles.amountColVal,
                      { color: parseFloat(item.remaining_balance) > 0 ? '#DC2626' : '#059669' },
                    ]}
                  >
                    ₹{parseFloat(item.remaining_balance || 0).toLocaleString('en-IN')}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color="#9CA3AF" />
              </View>
            </TouchableOpacity>
          );
        }}
        ListFooterComponent={
          <>
            {/* Payment History Section */}
            <View style={[styles.sectionHeaderRow, { marginTop: 20 }]}>
              <Text style={styles.sectionTitle}>PERIOD COLLECTIONS (CASH FIFO)</Text>
              <Text style={styles.sectionSubtitle}>
                {periodPayments.length} {periodPayments.length === 1 ? 'payment' : 'payments'} in this billing period
              </Text>
            </View>

            {periodPayments.length === 0 ? (
              <View style={styles.emptyCard}>
                <Ionicons name="wallet-outline" size={28} color="#D8CEC4" />
                <Text style={styles.emptyTitle}>No Collections in This Period</Text>
                <Text style={styles.emptySubtitle}>No cash payments recorded between {currentPeriodInfo.startFormatted} and {currentPeriodInfo.endFormatted}.</Text>
              </View>
            ) : (
              periodPayments.map((p, idx) => {
                const isReversed = Boolean(p.is_reversed || (p.notes && p.notes.toLowerCase().includes('reversed')));
                const dateStr = p.received_at ? new Date(p.received_at).toLocaleDateString('en-IN') : 'Date N/A';
                return (
                  <View key={p.payment_id || idx} style={[styles.paymentCard, isReversed && styles.paymentCardReversed]}>
                    <View style={styles.paymentTopRow}>
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <View style={[styles.paymentIconBadge, isReversed && styles.paymentIconBadgeReversed]}>
                          <Ionicons name={isReversed ? "arrow-undo" : "cash"} size={14} color={isReversed ? "#DC2626" : "#059669"} />
                        </View>
                        <View>
                          <Text style={[styles.paymentAmount, isReversed && styles.paymentAmountReversed]}>
                            {isReversed ? '-' : '+'}₹{parseFloat(p.amount || 0).toLocaleString('en-IN')}
                          </Text>
                          <Text style={styles.paymentDate}>{dateStr}</Text>
                        </View>
                      </View>

                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        {isReversed ? (
                          <View style={styles.reversedBadge}>
                            <Text style={styles.reversedBadgeText}>Reversed</Text>
                          </View>
                        ) : (
                          <TouchableOpacity
                            style={styles.reverseBtnMini}
                            onPress={() => {
                              setSelectedPaymentForReverse({
                                id: p.payment_id,
                                amount: p.amount,
                                received_at: p.received_at,
                              });
                              setReverseModalVisible(true);
                            }}
                            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                          >
                            <Ionicons name="arrow-undo-outline" size={13} color="#DC2626" />
                            <Text style={styles.reverseBtnMiniText}>Reverse</Text>
                          </TouchableOpacity>
                        )}
                        {p.reference_number ? (
                          <Text style={[styles.paymentRef, { marginLeft: 8 }]}>Ref: {p.reference_number}</Text>
                        ) : null}
                      </View>
                    </View>
                    {p.notes ? <Text style={styles.paymentNotes}>"{p.notes}"</Text> : null}
                  </View>
                );
              })
            )}

            <View style={{ height: 32 }} />
          </>
        }
      />

      {/* 4. Keyboard-Aware Searchable Customer Selector Modal */}
      <Modal
        visible={customerModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setCustomerModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalBackdrop}
        >
          <View
            style={[
              styles.modalCard,
              {
                maxHeight: modalMaxHeight,
                ...(Platform.OS === 'android' && isKeyboardOpen ? { marginBottom: keyboardHeight } : {}),
              },
            ]}
          >
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Customer</Text>
              <TouchableOpacity
                onPress={() => {
                  Keyboard.dismiss();
                  setCustomerModalVisible(false);
                }}
                style={styles.modalCloseBtn}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="close" size={20} color="#6B7280" />
              </TouchableOpacity>
            </View>

            {/* Search Input Box */}
            <View style={styles.searchBarContainer}>
              <Ionicons name="search" size={16} color="#9CA3AF" style={{ marginRight: 6 }} />
              <TextInput
                style={styles.searchBarInput}
                placeholder="Search name or phone..."
                placeholderTextColor="#9CA3AF"
                value={customerSearchQuery}
                onChangeText={setCustomerSearchQuery}
                autoFocus={true}
                returnKeyType="done"
                onSubmitEditing={() => Keyboard.dismiss()}
              />
              {customerSearchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setCustomerSearchQuery('')}>
                  <Ionicons name="close-circle" size={16} color="#9CA3AF" />
                </TouchableOpacity>
              )}
            </View>

            {loadingCustomers ? (
              <View style={styles.centerBox}>
                <ActivityIndicator size="small" color="#8C331A" />
              </View>
            ) : (
              <FlatList
                data={filteredCustomers}
                keyExtractor={item => String(item.id)}
                style={styles.customerListScroll}
                keyboardShouldPersistTaps="handled"
                keyboardDismissMode="none"
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={[
                      styles.customerPickItem,
                      item.id === selectedCustomerId && styles.customerPickItemActive,
                    ]}
                    onPress={() => handleSelectCustomer(item)}
                    activeOpacity={0.7}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={styles.customerPickName}>{item.name}</Text>
                      <Text style={styles.customerPickPhone}>
                        {item.phone || 'No phone'} • Cycle: Day {item.billing_cycle_day || 1}
                      </Text>
                    </View>
                    {item.id === selectedCustomerId && (
                      <Ionicons name="checkmark-circle" size={18} color="#8C331A" />
                    )}
                  </TouchableOpacity>
                )}
                ListEmptyComponent={
                  <View style={styles.emptyCard}>
                    <Text style={styles.emptySubtitle}>No matching customers found</Text>
                  </View>
                }
              />
            )}
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* 5. Month & Year Direct Selector Modal */}
      <Modal
        visible={monthPickerVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setMonthPickerVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.monthPickerCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Billing Month</Text>
              <TouchableOpacity
                onPress={() => setMonthPickerVisible(false)}
                style={styles.modalCloseBtn}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="close" size={20} color="#6B7280" />
              </TouchableOpacity>
            </View>

            {/* Year Selector */}
            <View style={styles.yearSelectorRow}>
              <TouchableOpacity
                onPress={() => setSelectedYear(prev => prev - 1)}
                style={styles.yearArrowBtn}
              >
                <Ionicons name="chevron-back" size={18} color="#8C331A" />
              </TouchableOpacity>
              <Text style={styles.yearDisplayText}>{selectedYear}</Text>
              <TouchableOpacity
                onPress={() => setSelectedYear(prev => prev + 1)}
                style={styles.yearArrowBtn}
              >
                <Ionicons name="chevron-forward" size={18} color="#8C331A" />
              </TouchableOpacity>
            </View>

            {/* 12 Months Grid */}
            <View style={styles.monthsGrid}>
              {MONTH_NAMES_FULL.map((mName, idx) => {
                const monthNum = idx + 1;
                const isSelected = selectedMonth === monthNum;
                return (
                  <TouchableOpacity
                    key={mName}
                    style={[styles.monthGridItem, isSelected && styles.monthGridItemActive]}
                    onPress={() => {
                      setSelectedMonth(monthNum);
                      setMonthPickerVisible(false);
                    }}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.monthGridItemText,
                        isSelected && styles.monthGridItemTextActive,
                      ]}
                    >
                      {MONTH_NAMES_SHORT[idx]}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </View>
      </Modal>

      {/* Reverse Payment Modal */}
      <ReversePaymentModal
        visible={reverseModalVisible}
        onClose={() => {
          setReverseModalVisible(false);
          setSelectedPaymentForReverse(null);
        }}
        onSubmit={handleConfirmReversePayment}
        customerName={selectedCustomer?.name || 'Customer'}
        paymentId={selectedPaymentForReverse?.id}
        amount={selectedPaymentForReverse?.amount || 0}
        paymentDate={
          selectedPaymentForReverse?.received_at
            ? new Date(selectedPaymentForReverse.received_at).toLocaleDateString('en-IN')
            : 'Date N/A'
        }
      />

      {/* Record Payment FIFO Modal */}
      <CollectPaymentModal
        visible={showCollectPaymentModal}
        onClose={() => setShowCollectPaymentModal(false)}
        onSubmit={handleConfirmPayment}
        customerName={selectedCustomer?.name || 'Customer'}
        totalPendingAmount={parseFloat(financialSummary.outstandingBalance) || 0}
        invoices={periodInvoices.map(r => ({
          id: r.invoice_id,
          invoice_number: r.invoice_number,
          pending_amount: parseFloat(r.remaining_balance) || 0,
          created_at: r.created_at || '',
        }))}
      />

      {/* Billing Cycle Day Setting Modal */}
      <BillingCycleDayModal
        visible={cycleDayModalVisible}
        currentDay={cycleDay}
        customerName={selectedCustomer?.name}
        onClose={() => setCycleDayModalVisible(false)}
        onSave={handleSaveBillingCycleDay}
      />
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
    paddingTop: 12,
    paddingBottom: 24,
  },
  customerSelectorCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#EFEAE4',
    marginBottom: 10,
  },
  customerSelectorInfo: {
    flex: 1,
    marginRight: 10,
  },
  customerSelectorLabel: {
    fontSize: 10,
    fontWeight: '800',
    fontFamily: fontFamilies.bold,
    color: '#8C331A',
    letterSpacing: 0.5,
  },
  customerSelectorName: {
    fontSize: 16,
    fontWeight: '800',
    fontFamily: fontFamilies.bold,
    color: '#1E1E1E',
    marginTop: 2,
  },
  customerSelectorPhone: {
    fontSize: 12,
    fontFamily: fontFamilies.regular,
    color: '#6B5E55',
    marginTop: 1,
  },
  switchCustomerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FDEBE4',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#F5C6B8',
  },
  switchCustomerBtnText: {
    fontSize: 12,
    fontWeight: '700',
    fontFamily: fontFamilies.bold,
    color: '#8C331A',
  },
  cycleCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#EFEAE4',
    marginBottom: 12,
  },
  cycleHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  cycleTitle: {
    fontSize: 12,
    fontWeight: '700',
    fontFamily: fontFamilies.bold,
    color: '#8C331A',
  },
  changeCycleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FDEBE4',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
    marginLeft: 8,
    borderWidth: 1,
    borderColor: '#F5C6B8',
  },
  changeCycleBtnText: {
    fontSize: 10,
    fontWeight: '700',
    fontFamily: fontFamilies.bold,
    color: '#8C331A',
  },
  monthPickPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FAF5F0',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#EFEAE4',
  },
  monthPickPillText: {
    fontSize: 11,
    fontWeight: '700',
    fontFamily: fontFamilies.bold,
    color: '#8C331A',
  },
  periodNavigatorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FAF8F5',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 6,
    borderWidth: 1,
    borderColor: '#F5EFE9',
  },
  periodNavArrowBtn: {
    padding: 6,
    borderRadius: 6,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#EFEAE4',
  },
  periodDisplayCenter: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  periodDateRangeText: {
    fontSize: 13,
    fontWeight: '800',
    fontFamily: fontFamilies.bold,
    color: '#2A2421',
    textAlign: 'center',
  },
  periodSubHint: {
    fontSize: 10,
    fontFamily: fontFamilies.regular,
    color: '#8E8278',
    marginTop: 1,
  },
  financialSummaryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#EFEAE4',
    marginBottom: 12,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  summaryCol: {
    flex: 1,
  },
  summaryColLabel: {
    fontSize: 11,
    fontFamily: fontFamilies.regular,
    color: '#6B5E55',
  },
  summaryColValue: {
    fontSize: 15,
    fontWeight: '800',
    fontFamily: fontFamilies.bold,
    color: '#1E1E1E',
    marginTop: 2,
  },
  summaryDivider: {
    height: 1,
    backgroundColor: '#F5EFE9',
    marginVertical: 10,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F5EFE9',
  },
  statusRowLabel: {
    fontSize: 12,
    fontFamily: fontFamilies.regular,
    color: '#6B5E55',
  },
  statusPill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  statusPillText: {
    fontSize: 10,
    fontWeight: '800',
    fontFamily: fontFamilies.bold,
  },
  statusPaid: { backgroundColor: '#ECFDF5' },
  statusPaidText: { color: '#059669', fontSize: 10, fontWeight: '800' },
  statusPartial: { backgroundColor: '#FFFBEB' },
  statusPartialText: { color: '#D97706', fontSize: 10, fontWeight: '800' },
  statusUnpaid: { backgroundColor: '#FEF2F2' },
  statusUnpaidText: { color: '#DC2626', fontSize: 10, fontWeight: '800' },
  actionButtonsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  recordPaymentPrimaryBtn: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#8C331A',
    borderRadius: 10,
    paddingVertical: 10,
  },
  recordPaymentPrimaryBtnText: {
    fontSize: 13,
    fontWeight: '700',
    fontFamily: fontFamilies.bold,
    color: '#FFFFFF',
  },
  exportBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#EFEAE4',
    paddingVertical: 10,
  },
  exportBtnText: {
    fontSize: 12,
    fontWeight: '700',
    fontFamily: fontFamilies.bold,
    color: '#8C331A',
  },
  sectionHeaderRow: {
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '800',
    fontFamily: fontFamilies.bold,
    color: '#8C331A',
    letterSpacing: 0.5,
  },
  sectionSubtitle: {
    fontSize: 11,
    fontFamily: fontFamilies.regular,
    color: '#6B5E55',
    marginTop: 1,
  },
  invoiceCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#EFEAE4',
    marginBottom: 8,
  },
  invoiceCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  invoiceNumber: {
    fontSize: 13,
    fontWeight: '800',
    fontFamily: fontFamilies.bold,
    color: '#1E1E1E',
  },
  invoicePeriod: {
    fontSize: 11,
    fontFamily: fontFamilies.regular,
    color: '#6B5E55',
    marginTop: 1,
  },
  invStatusBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  invStatusBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    fontFamily: fontFamilies.bold,
  },
  invoiceAmountsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: '#F5EFE9',
  },
  amountCol: {
    flex: 1,
  },
  amountColLabel: {
    fontSize: 10,
    fontFamily: fontFamilies.regular,
    color: '#8E8278',
  },
  amountColVal: {
    fontSize: 12,
    fontWeight: '700',
    fontFamily: fontFamilies.bold,
    color: '#1E1E1E',
    marginTop: 1,
  },
  paymentCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: '#EFEAE4',
    marginBottom: 6,
  },
  paymentTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  paymentIconBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#ECFDF5',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  paymentAmount: {
    fontSize: 13,
    fontWeight: '800',
    fontFamily: fontFamilies.bold,
    color: '#059669',
  },
  paymentDate: {
    fontSize: 10,
    fontFamily: fontFamilies.regular,
    color: '#8E8278',
  },
  paymentRef: {
    fontSize: 10,
    fontFamily: fontFamilies.regular,
    color: '#6B5E55',
  },
  paymentNotes: {
    fontSize: 11,
    fontFamily: fontFamilies.regular,
    color: '#4B5563',
    fontStyle: 'italic',
    marginTop: 4,
    marginLeft: 36,
  },
  centerBox: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 12,
    fontFamily: fontFamilies.regular,
    color: '#6B5E55',
    marginTop: 6,
  },
  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#EFEAE4',
    marginTop: 4,
  },
  emptyTitle: {
    fontSize: 13,
    fontWeight: '700',
    fontFamily: fontFamilies.bold,
    color: '#6B5E55',
    marginTop: 6,
  },
  emptySubtitle: {
    fontSize: 11,
    fontFamily: fontFamilies.regular,
    color: '#8E8278',
    textAlign: 'center',
    marginTop: 2,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  modalCard: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#2A2421',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
    fontFamily: fontFamilies.bold,
    color: '#8C331A',
  },
  modalCloseBtn: {
    padding: 4,
  },
  searchBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FAF8F5',
    borderWidth: 1,
    borderColor: '#EFEAE4',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginBottom: 10,
  },
  searchBarInput: {
    flex: 1,
    fontSize: 13,
    fontFamily: fontFamilies.regular,
    color: '#1E1E1E',
    padding: 0,
  },
  customerListScroll: {
    flexShrink: 1,
  },
  customerPickItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F5EFE9',
  },
  customerPickItemActive: {
    backgroundColor: '#FDEBE4',
  },
  customerPickName: {
    fontSize: 13,
    fontWeight: '700',
    fontFamily: fontFamilies.bold,
    color: '#1E1E1E',
  },
  customerPickPhone: {
    fontSize: 11,
    fontFamily: fontFamilies.regular,
    color: '#6B5E55',
    marginTop: 1,
  },
  monthPickerCard: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    maxWidth: 360,
  },
  yearSelectorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FAF5F0',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#EFEAE4',
    marginBottom: 12,
  },
  yearArrowBtn: {
    padding: 4,
  },
  yearDisplayText: {
    fontSize: 15,
    fontWeight: '800',
    fontFamily: fontFamilies.bold,
    color: '#8C331A',
  },
  monthsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'space-between',
  },
  monthGridItem: {
    width: '30%',
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#FAF8F5',
    borderWidth: 1,
    borderColor: '#EFEAE4',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 4,
  },
  monthGridItemActive: {
    backgroundColor: '#8C331A',
    borderColor: '#8C331A',
  },
  monthGridItemText: {
    fontSize: 13,
    fontWeight: '700',
    fontFamily: fontFamilies.semiBold,
    color: '#2A2421',
  },
  monthGridItemTextActive: {
    color: '#FFFFFF',
    fontFamily: fontFamilies.bold,
  },
  paymentCardReversed: {
    opacity: 0.75,
    backgroundColor: '#FFF5F5',
    borderColor: '#FED7D7',
  },
  paymentIconBadgeReversed: {
    backgroundColor: '#FEE2E2',
  },
  paymentAmountReversed: {
    color: '#DC2626',
    textDecorationLine: 'line-through',
  },
  reversedBadge: {
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  reversedBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#DC2626',
  },
  reverseBtnMini: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FCA5A5',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  reverseBtnMiniText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#DC2626',
    marginLeft: 3,
  },
});
