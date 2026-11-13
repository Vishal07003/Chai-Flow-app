import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  Modal,
  RefreshControl,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { Header, FloatingButton, EmptyState } from '../../components/common';
import companyService, { Company } from '../../services/company.service';

const filterTabs = ['All', 'With Dues', 'Daily Cycle', 'Monthly Statement'];

export default function CompaniesScreen() {
  const navigation = useNavigation<any>();

  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeFilter, setActiveFilter] = useState<string>('All');

  // Modal State for Add Company
  const [addModalVisible, setAddModalVisible] = useState<boolean>(false);
  const [nameInput, setNameInput] = useState<string>('');
  const [phoneInput, setPhoneInput] = useState<string>('');
  const [addressInput, setAddressInput] = useState<string>('');
  const [gstinInput, setGstinInput] = useState<string>('');
  const [cycleInput, setCycleInput] = useState<'DAILY' | 'MONTHLY' | 'BOTH'>('BOTH');
  const [saving, setSaving] = useState<boolean>(false);

  const fetchCompanies = useCallback(async (query?: string) => {
    try {
      const data = await companyService.getCompanies(query);
      setCompanies(data || []);
    } catch (err: any) {
      console.log('Error fetching companies:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchCompanies(searchQuery);
  }, [fetchCompanies, searchQuery]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchCompanies(searchQuery);
  }, [fetchCompanies, searchQuery]);

  // Aggregate KPI summary
  const summary = useMemo(() => {
    let totalDues = 0;
    let companiesWithDues = 0;

    companies.forEach(c => {
      const due = parseFloat(c.current_outstanding) || 0;
      if (due > 0) {
        totalDues += due;
        companiesWithDues += 1;
      }
    });

    return { totalDues, companiesWithDues, totalCount: companies.length };
  }, [companies]);

  // Filtered list
  const filteredList = useMemo(() => {
    return companies.filter(c => {
      const due = parseFloat(c.current_outstanding) || 0;
      if (activeFilter === 'With Dues') return due > 0;
      if (activeFilter === 'Daily Cycle') return c.billing_cycle === 'DAILY' || c.billing_cycle === 'BOTH';
      if (activeFilter === 'Monthly Statement') return c.billing_cycle === 'MONTHLY' || c.billing_cycle === 'BOTH';
      return true;
    });
  }, [companies, activeFilter]);

  const handleCreateCompany = async () => {
    if (!nameInput.trim() || !phoneInput.trim()) {
      Alert.alert('Required Fields', 'Company name and contact phone are required.');
      return;
    }

    try {
      setSaving(true);
      await companyService.createCompany({
        name: nameInput.trim(),
        phone: phoneInput.trim(),
        billing_address: addressInput.trim(),
        gstin: gstinInput.trim(),
        billing_cycle: cycleInput,
      });

      setAddModalVisible(false);
      setNameInput('');
      setPhoneInput('');
      setAddressInput('');
      setGstinInput('');
      fetchCompanies();
      Alert.alert('Success', 'Company profile created successfully.');
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to create company.');
    } finally {
      setSaving(false);
    }
  };

  const renderCompanyCard = ({ item }: { item: Company }) => {
    const dueNum = parseFloat(item.current_outstanding) || 0;
    const hasDue = dueNum > 0;

    return (
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.85}
        onPress={() => navigation.navigate('CustomerDetail', { companyId: item.id, company: item })}
      >
        <View style={styles.cardHeader}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {item.name.substring(0, 2).toUpperCase()}
            </Text>
          </View>
          <View style={styles.cardMainInfo}>
            <Text style={styles.companyName} numberOfLines={1}>{item.name}</Text>
            <Text style={styles.contactPhone}>{item.phone}</Text>
          </View>
          <View style={styles.balanceContainer}>
            <Text style={[styles.balanceAmount, hasDue && styles.balanceDue]}>
              ₹{dueNum.toLocaleString()}
            </Text>
            <Text style={styles.balanceLabel}>{hasDue ? 'Pending Due' : 'All Clear'}</Text>
          </View>
        </View>

        <View style={styles.cardFooter}>
          <View style={styles.tagBadge}>
            <Text style={styles.tagText}>{item.billing_cycle} CYCLE</Text>
          </View>
          <Text style={styles.invoicesCount}>{item.total_invoices_count} Bills</Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Header
        title="Companies"
        showBack={false}
      />

      {/* KPI Audit Card */}
      <View style={styles.heroSummaryCard}>
        <View style={styles.heroRow}>
          <View>
            <Text style={styles.heroLabel}>Total Outstanding Dues</Text>
            <Text style={styles.heroAmount}>₹{summary.totalDues.toLocaleString()}</Text>
          </View>
          <View style={styles.heroSubStat}>
            <Text style={styles.heroSubValue}>{summary.companiesWithDues}</Text>
            <Text style={styles.heroSubLabel}>With Pending Due</Text>
          </View>
        </View>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Ionicons name="search-outline" size={18} color="#8E8278" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search by company name, phone or GSTIN..."
          placeholderTextColor="#8E8278"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery ? (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Ionicons name="close-circle" size={18} color="#8E8278" />
          </TouchableOpacity>
        ) : null}
      </View>

      {/* Filter Tabs */}
      <View style={styles.tabsRow}>
        {filterTabs.map(tab => (
          <TouchableOpacity
            key={tab}
            style={[styles.tabChip, activeFilter === tab && styles.tabChipActive]}
            onPress={() => setActiveFilter(tab)}
          >
            <Text style={[styles.tabText, activeFilter === tab && styles.tabTextActive]}>
              {tab}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Main List */}
      {loading ? (
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color="#8C331A" />
        </View>
      ) : filteredList.length === 0 ? (
        <EmptyState
          title="No Companies Found"
          subtitle={searchQuery ? "No companies match your search." : "No registered companies yet. Tap + to add one."}
        />
      ) : (
        <FlatList
          data={filteredList}
          keyExtractor={item => String(item.id)}
          renderItem={renderCompanyCard}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#8C331A']} />
          }
        />
      )}

      {/* Floating Action Button */}
      <FloatingButton onPress={() => setAddModalVisible(true)} />

      {/* Add Company Modal */}
      <Modal visible={addModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add New Company</Text>
              <TouchableOpacity onPress={() => setAddModalVisible(false)}>
                <Ionicons name="close" size={24} color="#2A2421" />
              </TouchableOpacity>
            </View>

            <TextInput
              style={styles.modalInput}
              placeholder="Company Name *"
              placeholderTextColor="#8E8278"
              value={nameInput}
              onChangeText={setNameInput}
            />

            <TextInput
              style={styles.modalInput}
              placeholder="Phone Number *"
              placeholderTextColor="#8E8278"
              keyboardType="phone-pad"
              value={phoneInput}
              onChangeText={setPhoneInput}
            />

            <TextInput
              style={styles.modalInput}
              placeholder="GSTIN (Optional)"
              placeholderTextColor="#8E8278"
              value={gstinInput}
              onChangeText={setGstinInput}
            />

            <TextInput
              style={[styles.modalInput, { height: 70 }]}
              placeholder="Billing Address"
              placeholderTextColor="#8E8278"
              multiline
              value={addressInput}
              onChangeText={setAddressInput}
            />

            <View style={styles.cyclePickerRow}>
              <Text style={styles.cyclePickerLabel}>Billing Cycle:</Text>
              {(['DAILY', 'MONTHLY', 'BOTH'] as const).map(c => (
                <TouchableOpacity
                  key={c}
                  style={[styles.cycleBtn, cycleInput === c && styles.cycleBtnActive]}
                  onPress={() => setCycleInput(c)}
                >
                  <Text style={[styles.cycleBtnText, cycleInput === c && styles.cycleBtnTextActive]}>
                    {c}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity
              style={styles.submitBtn}
              onPress={handleCreateCompany}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.submitBtnText}>Save Company</Text>
              )}
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
  heroSummaryCard: {
    backgroundColor: '#7A2E19',
    marginHorizontal: 16,
    marginVertical: 10,
    borderRadius: 16,
    padding: 16,
  },
  heroRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  heroLabel: {
    fontSize: 12,
    color: '#E5D6D0',
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  heroAmount: {
    fontSize: 26,
    fontWeight: '800',
    color: '#FFFFFF',
    marginTop: 4,
  },
  heroSubStat: {
    alignItems: 'flex-end',
  },
  heroSubValue: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FBBF24',
  },
  heroSubLabel: {
    fontSize: 11,
    color: '#E5D6D0',
    marginTop: 2,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginBottom: 10,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44,
    borderWidth: 1,
    borderColor: '#EFEAE4',
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#2A2421',
  },
  tabsRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  tabChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#EFEAE4',
  },
  tabChipActive: {
    backgroundColor: '#8C331A',
    borderColor: '#8C331A',
  },
  tabText: {
    fontSize: 12,
    color: '#8E8278',
    fontWeight: '600',
  },
  tabTextActive: {
    color: '#FFFFFF',
  },
  centerBox: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 80,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#EFEAE4',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F5EBE6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    color: '#8C331A',
    fontWeight: '800',
    fontSize: 16,
  },
  cardMainInfo: {
    flex: 1,
  },
  companyName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#2A2421',
  },
  contactPhone: {
    fontSize: 12,
    color: '#8E8278',
    marginTop: 2,
  },
  balanceContainer: {
    alignItems: 'flex-end',
  },
  balanceAmount: {
    fontSize: 16,
    fontWeight: '800',
    color: '#059669',
  },
  balanceDue: {
    color: '#DC2626',
  },
  balanceLabel: {
    fontSize: 10,
    color: '#8E8278',
    marginTop: 2,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#FAF8F5',
  },
  tagBadge: {
    backgroundColor: '#FAF8F5',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#EFEAE4',
  },
  tagText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#8C331A',
  },
  invoicesCount: {
    fontSize: 12,
    color: '#8E8278',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#2A2421',
  },
  modalInput: {
    backgroundColor: '#FAF8F5',
    borderWidth: 1,
    borderColor: '#EFEAE4',
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 44,
    marginBottom: 12,
    fontSize: 14,
    color: '#2A2421',
  },
  cyclePickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  cyclePickerLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#2A2421',
    marginRight: 10,
  },
  cycleBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#FAF8F5',
    borderWidth: 1,
    borderColor: '#EFEAE4',
    marginRight: 6,
  },
  cycleBtnActive: {
    backgroundColor: '#8C331A',
    borderColor: '#8C331A',
  },
  cycleBtnText: {
    fontSize: 11,
    color: '#8E8278',
    fontWeight: '600',
  },
  cycleBtnTextActive: {
    color: '#FFFFFF',
  },
  submitBtn: {
    backgroundColor: '#8C331A',
    borderRadius: 12,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  submitBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 15,
  },
});
