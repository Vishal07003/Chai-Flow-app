import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  FlatList,
  Modal,
  TextInput,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';
import Header from '../../components/common/Header';
import companyService, { Company, MonthlyLedgerStatement } from '../../services/company.service';
import billingService, { BackendInvoice } from '../../services/billing.service';

export default function CustomerDetailScreen({ route, navigation }: any) {
  const companyId = route.params?.companyId || route.params?.company?.id;

  const [company, setCompany] = useState<Company | null>(route.params?.company || null);
  const [loading, setLoading] = useState<boolean>(!route.params?.company);
  const [activeTab, setActiveTab] = useState<'Ledger' | 'Invoices' | 'Pricing' | 'Info'>('Ledger');

  // Ledger Statement State
  const [ledgerStatement, setLedgerStatement] = useState<MonthlyLedgerStatement | null>(null);
  const [ledgerLoading, setLedgerLoading] = useState<boolean>(false);
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());

  // Invoices List State
  const [invoices, setInvoices] = useState<BackendInvoice[]>([]);
  const [invoicesLoading, setInvoicesLoading] = useState<boolean>(false);

  // Payment Collection Modal
  const [collectModalVisible, setCollectModalVisible] = useState<boolean>(false);
  const [collectAmount, setCollectAmount] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<string>('bank_transfer');
  const [refNumber, setRefNumber] = useState<string>('');
  const [submittingPayment, setSubmittingPayment] = useState<boolean>(false);

  const fetchCompanyDetails = useCallback(async () => {
    if (!companyId) return;
    try {
      setLoading(true);
      const data = await companyService.getCompanyById(companyId);
      setCompany(data);
      setCollectAmount(data.current_outstanding || '0');
    } catch (err: any) {
      console.log('Error fetching company:', err);
    } finally {
      setLoading(false);
    }
  }, [companyId]);

  const fetchLedger = useCallback(async () => {
    if (!companyId) return;
    try {
      setLedgerLoading(true);
      const stmt = await companyService.getMonthlyLedger(companyId, selectedYear, selectedMonth);
      setLedgerStatement(stmt);
    } catch (err: any) {
      console.log('Error fetching ledger statement:', err);
    } finally {
      setLedgerLoading(false);
    }
  }, [companyId, selectedYear, selectedMonth]);

  const fetchInvoices = useCallback(async () => {
    if (!companyId) return;
    try {
      setInvoicesLoading(true);
      const invs = await billingService.getInvoices();
      // Filter for this company
      setInvoices(invs.filter(i => (i as any).company === companyId));
    } catch (err: any) {
      console.log('Error fetching invoices:', err);
    } finally {
      setInvoicesLoading(false);
    }
  }, [companyId]);

  useEffect(() => {
    fetchCompanyDetails();
  }, [fetchCompanyDetails]);

  useEffect(() => {
    if (activeTab === 'Ledger') fetchLedger();
    if (activeTab === 'Invoices') fetchInvoices();
  }, [activeTab, fetchLedger, fetchInvoices]);

  const handleCollectPayment = async () => {
    const amt = parseFloat(collectAmount);
    if (!amt || amt <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid payment amount greater than zero.');
      return;
    }

    try {
      setSubmittingPayment(true);
      const res = await companyService.collectPayment(companyId, {
        amount: amt,
        method: paymentMethod,
        reference_number: refNumber.trim(),
      });

      setCollectModalVisible(false);
      setRefNumber('');
      fetchCompanyDetails();
      fetchLedger();
      Alert.alert(
        'Payment Recorded',
        `₹${res.allocated_to_invoices} allocated to invoices via FIFO.\nAdvance Credit: ₹${res.unallocated_advance_credit}`,
      );
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to record payment.');
    } finally {
      setSubmittingPayment(false);
    }
  };

  if (loading || !company) {
    return (
      <SafeAreaView style={styles.container}>
        <Header title="Company Details" showBack />
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color="#8C331A" />
        </View>
      </SafeAreaView>
    );
  }

  const outstandingNum = parseFloat(company.current_outstanding) || 0;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Header title={company.name} showBack />

      {/* Top Company Profile Card */}
      <View style={styles.profileCard}>
        <View style={styles.avatarRow}>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarText}>{company.name.substring(0, 2).toUpperCase()}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.companyTitle}>{company.name}</Text>
            <Text style={styles.companySub}>{company.phone} • {company.billing_cycle} CYCLE</Text>
            {company.gstin ? <Text style={styles.gstinText}>GSTIN: {company.gstin}</Text> : null}
          </View>
        </View>

        {/* Financial KPI Row */}
        <View style={styles.kpiRow}>
          <View style={styles.kpiCol}>
            <Text style={styles.kpiLabel}>Total Billed</Text>
            <Text style={styles.kpiVal}>₹{parseFloat(company.total_billed || '0').toLocaleString()}</Text>
          </View>
          <View style={styles.kpiCol}>
            <Text style={styles.kpiLabel}>Total Paid</Text>
            <Text style={[styles.kpiVal, { color: '#059669' }]}>
              ₹{parseFloat(company.total_paid || '0').toLocaleString()}
            </Text>
          </View>
          <View style={styles.kpiCol}>
            <Text style={styles.kpiLabel}>Current Outstanding</Text>
            <Text style={[styles.kpiVal, { color: outstandingNum > 0 ? '#DC2626' : '#059669' }]}>
              ₹{outstandingNum.toLocaleString()}
            </Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.collectBtn}
          onPress={() => setCollectModalVisible(true)}
        >
          <Ionicons name="card-outline" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
          <Text style={styles.collectBtnText}>Collect Payment (FIFO Allocation)</Text>
        </TouchableOpacity>
      </View>

      {/* Segmented Tabs */}
      <View style={styles.tabRow}>
        {(['Ledger', 'Invoices', 'Pricing', 'Info'] as const).map(t => (
          <TouchableOpacity
            key={t}
            style={[styles.tabBtn, activeTab === t && styles.tabBtnActive]}
            onPress={() => setActiveTab(t)}
          >
            <Text style={[styles.tabText, activeTab === t && styles.tabTextActive]}>{t}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Tab Contents */}
      {activeTab === 'Ledger' && (
        <View style={{ flex: 1, paddingHorizontal: 16 }}>
          {ledgerLoading ? (
            <View style={styles.centerBox}>
              <ActivityIndicator size="large" color="#8C331A" />
            </View>
          ) : ledgerStatement ? (
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
              {/* Passbook Month Summary Banner */}
              <View style={styles.statementBox}>
                <View style={styles.stmtHeader}>
                  <Text style={styles.stmtTitle}>MONTHLY PASSBOOK LEDGER</Text>
                  <Text style={styles.stmtPeriod}>{ledgerStatement.period.start_date} to {ledgerStatement.period.end_date}</Text>
                </View>
                <View style={styles.stmtRow}>
                  <Text style={styles.stmtLabel}>Opening Balance B/F</Text>
                  <Text style={styles.stmtVal}>₹{ledgerStatement.summary.opening_balance}</Text>
                </View>
                <View style={styles.stmtRow}>
                  <Text style={styles.stmtLabel}>Total Invoiced (Debits)</Text>
                  <Text style={[styles.stmtVal, { color: '#DC2626' }]}>+ ₹{ledgerStatement.summary.total_debit}</Text>
                </View>
                <View style={styles.stmtRow}>
                  <Text style={styles.stmtLabel}>Total Collections (Credits)</Text>
                  <Text style={[styles.stmtVal, { color: '#059669' }]}>- ₹{ledgerStatement.summary.total_credit}</Text>
                </View>
                <View style={[styles.stmtRow, { borderTopWidth: 1, borderTopColor: '#EFEAE4', paddingTop: 6, marginTop: 4 }]}>
                  <Text style={styles.stmtClosingLabel}>Closing Balance</Text>
                  <Text style={styles.stmtClosingVal}>₹{ledgerStatement.summary.closing_balance}</Text>
                </View>
              </View>

              {/* Chronological Passbook Transactions */}
              <Text style={styles.sectionHeader}>TRANSACTION TIMELINE</Text>
              {ledgerStatement.transactions.length === 0 ? (
                <Text style={styles.emptyNote}>No ledger transactions recorded in this period.</Text>
              ) : (
                ledgerStatement.transactions.map((tx, idx) => {
                  const isDebit = parseFloat(tx.debit) > 0;
                  return (
                    <View key={idx} style={styles.txRow}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.txRef}>{tx.reference_no}</Text>
                        <Text style={styles.txDesc}>{tx.description}</Text>
                        <Text style={styles.txDate}>{new Date(tx.date).toLocaleDateString()}</Text>
                      </View>
                      <View style={{ alignItems: 'flex-end' }}>
                        <Text style={[styles.txAmount, isDebit ? styles.txDebit : styles.txCredit]}>
                          {isDebit ? `+ ₹${tx.debit}` : `- ₹${tx.credit}`}
                        </Text>
                        <Text style={styles.runningBal}>Bal: ₹{tx.running_balance}</Text>
                      </View>
                    </View>
                  );
                })
              )}
            </ScrollView>
          ) : null}
        </View>
      )}

      {activeTab === 'Invoices' && (
        <View style={{ flex: 1, paddingHorizontal: 16 }}>
          {invoicesLoading ? (
            <View style={styles.centerBox}>
              <ActivityIndicator size="large" color="#8C331A" />
            </View>
          ) : (
            <FlatList
              data={invoices}
              keyExtractor={i => String(i.id)}
              renderItem={({ item }) => (
                <View style={styles.invoiceItemCard}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.invNumber}>{item.invoice_number}</Text>
                    <Text style={styles.invDate}>{new Date(item.created_at).toLocaleDateString()}</Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={styles.invAmount}>₹{parseFloat(item.grand_total).toLocaleString()}</Text>
                    <Text style={[styles.invStatus, { color: item.status === 'paid' ? '#059669' : '#DC2626' }]}>
                      {item.status.toUpperCase()}
                    </Text>
                  </View>
                </View>
              )}
              ListEmptyComponent={<Text style={styles.emptyNote}>No invoices generated for this company.</Text>}
            />
          )}
        </View>
      )}

      {activeTab === 'Pricing' && (
        <ScrollView style={{ flex: 1, paddingHorizontal: 16 }}>
          <Text style={styles.sectionHeader}>CONTRACTED QUANTITY SLABS</Text>
          {company.contracted_prices && company.contracted_prices.length > 0 ? (
            company.contracted_prices.map(p => (
              <View key={p.id} style={styles.priceRow}>
                <View>
                  <Text style={styles.priceProdName}>{p.product_name}</Text>
                  <Text style={styles.priceSlabText}>Min quantity slab: {p.min_quantity} units</Text>
                </View>
                <Text style={styles.contractPriceVal}>₹{p.custom_price} / unit</Text>
              </View>
            ))
          ) : (
            <Text style={styles.emptyNote}>Standard catalog rates apply. No custom volume slabs configured.</Text>
          )}
        </ScrollView>
      )}

      {activeTab === 'Info' && (
        <ScrollView style={{ flex: 1, paddingHorizontal: 16 }}>
          <View style={styles.infoCard}>
            <Text style={styles.infoLabel}>Billing Address</Text>
            <Text style={styles.infoVal}>{company.billing_address || 'Not provided'}</Text>
            <Text style={styles.infoLabel}>GSTIN</Text>
            <Text style={styles.infoVal}>{company.gstin || 'Unregistered'}</Text>
            <Text style={styles.infoLabel}>Payment Terms</Text>
            <Text style={styles.infoVal}>{company.payment_terms_days} days</Text>
            <Text style={styles.infoLabel}>Credit Limit</Text>
            <Text style={styles.infoVal}>₹{parseFloat(company.credit_limit || '0').toLocaleString()}</Text>
          </View>
        </ScrollView>
      )}

      {/* Collect Payment Modal */}
      <Modal visible={collectModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>Collect Payment</Text>
            <Text style={styles.modalSubtitle}>Auto-allocated to oldest invoices (FIFO) • Excess recorded as advance</Text>

            <TextInput
              style={styles.modalInput}
              placeholder="Amount to Collect *"
              placeholderTextColor="#8E8278"
              keyboardType="numeric"
              value={collectAmount}
              onChangeText={setCollectAmount}
            />

            <TextInput
              style={styles.modalInput}
              placeholder="UTR / Cheque / Ref Number"
              placeholderTextColor="#8E8278"
              value={refNumber}
              onChangeText={setRefNumber}
            />

            <View style={styles.methodRow}>
              {(['bank_transfer', 'online', 'cash', 'upi'] as const).map(m => (
                <TouchableOpacity
                  key={m}
                  style={[styles.methodChip, paymentMethod === m && styles.methodChipActive]}
                  onPress={() => setPaymentMethod(m)}
                >
                  <Text style={[styles.methodText, paymentMethod === m && styles.methodTextActive]}>
                    {m.replace('_', ' ').toUpperCase()}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity
              style={styles.confirmBtn}
              onPress={handleCollectPayment}
              disabled={submittingPayment}
            >
              {submittingPayment ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.confirmBtnText}>Record & Allocate Payment</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity style={styles.cancelBtn} onPress={() => setCollectModalVisible(false)}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
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
  centerBox: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginVertical: 10,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#EFEAE4',
  },
  avatarRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F5EBE6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    color: '#8C331A',
    fontWeight: '800',
    fontSize: 18,
  },
  companyTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#2A2421',
  },
  companySub: {
    fontSize: 12,
    color: '#8E8278',
    marginTop: 2,
  },
  gstinText: {
    fontSize: 11,
    color: '#8C331A',
    fontWeight: '600',
    marginTop: 2,
  },
  kpiRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#FAF8F5',
    borderRadius: 12,
    padding: 12,
    marginVertical: 12,
  },
  kpiCol: {
    alignItems: 'center',
  },
  kpiLabel: {
    fontSize: 10,
    color: '#8E8278',
    textTransform: 'uppercase',
  },
  kpiVal: {
    fontSize: 15,
    fontWeight: '800',
    color: '#2A2421',
    marginTop: 2,
  },
  collectBtn: {
    flexDirection: 'row',
    backgroundColor: '#8C331A',
    borderRadius: 10,
    height: 42,
    justifyContent: 'center',
    alignItems: 'center',
  },
  collectBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  tabRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabBtnActive: {
    borderBottomColor: '#8C331A',
  },
  tabText: {
    fontSize: 13,
    color: '#8E8278',
    fontWeight: '600',
  },
  tabTextActive: {
    color: '#8C331A',
    fontWeight: '800',
  },
  statementBox: {
    backgroundColor: '#7A2E19',
    borderRadius: 14,
    padding: 14,
    marginBottom: 14,
  },
  stmtHeader: {
    marginBottom: 8,
  },
  stmtTitle: {
    fontSize: 11,
    color: '#FBBF24',
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  stmtPeriod: {
    fontSize: 11,
    color: '#E5D6D0',
    marginTop: 2,
  },
  stmtRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 2,
  },
  stmtLabel: {
    fontSize: 12,
    color: '#E5D6D0',
  },
  stmtVal: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  stmtClosingLabel: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  stmtClosingVal: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FBBF24',
  },
  sectionHeader: {
    fontSize: 11,
    fontWeight: '800',
    color: '#8E8278',
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  txRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#EFEAE4',
  },
  txRef: {
    fontSize: 13,
    fontWeight: '800',
    color: '#2A2421',
  },
  txDesc: {
    fontSize: 11,
    color: '#8E8278',
    marginTop: 2,
  },
  txDate: {
    fontSize: 10,
    color: '#8E8278',
    marginTop: 2,
  },
  txAmount: {
    fontSize: 14,
    fontWeight: '800',
  },
  txDebit: {
    color: '#DC2626',
  },
  txCredit: {
    color: '#059669',
  },
  runningBal: {
    fontSize: 10,
    color: '#8E8278',
    marginTop: 2,
  },
  invoiceItemCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#EFEAE4',
  },
  invNumber: {
    fontSize: 14,
    fontWeight: '800',
    color: '#2A2421',
  },
  invDate: {
    fontSize: 11,
    color: '#8E8278',
    marginTop: 2,
  },
  invAmount: {
    fontSize: 15,
    fontWeight: '800',
    color: '#2A2421',
  },
  invStatus: {
    fontSize: 10,
    fontWeight: '800',
    marginTop: 2,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#EFEAE4',
  },
  priceProdName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#2A2421',
  },
  priceSlabText: {
    fontSize: 11,
    color: '#8E8278',
    marginTop: 2,
  },
  contractPriceVal: {
    fontSize: 15,
    fontWeight: '800',
    color: '#8C331A',
  },
  infoCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#EFEAE4',
  },
  infoLabel: {
    fontSize: 11,
    color: '#8E8278',
    fontWeight: '600',
    marginTop: 8,
  },
  infoVal: {
    fontSize: 13,
    color: '#2A2421',
    fontWeight: '600',
    marginTop: 2,
  },
  emptyNote: {
    fontSize: 12,
    color: '#8E8278',
    textAlign: 'center',
    marginVertical: 16,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#2A2421',
  },
  modalSubtitle: {
    fontSize: 11,
    color: '#8E8278',
    marginVertical: 6,
  },
  modalInput: {
    backgroundColor: '#FAF8F5',
    borderWidth: 1,
    borderColor: '#EFEAE4',
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 44,
    marginBottom: 10,
    fontSize: 14,
    color: '#2A2421',
  },
  methodRow: {
    flexDirection: 'row',
    marginBottom: 14,
  },
  methodChip: {
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: '#FAF8F5',
    borderWidth: 1,
    borderColor: '#EFEAE4',
    marginRight: 6,
  },
  methodChipActive: {
    backgroundColor: '#8C331A',
    borderColor: '#8C331A',
  },
  methodText: {
    fontSize: 10,
    color: '#8E8278',
    fontWeight: '700',
  },
  methodTextActive: {
    color: '#FFFFFF',
  },
  confirmBtn: {
    backgroundColor: '#8C331A',
    borderRadius: 12,
    height: 46,
    justifyContent: 'center',
    alignItems: 'center',
  },
  confirmBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  cancelBtn: {
    marginTop: 8,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelBtnText: {
    color: '#8E8278',
    fontSize: 13,
  },
});
