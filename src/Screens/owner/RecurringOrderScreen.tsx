import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';
import Header from '../../components/common/Header';
import orderService, { BackendRecurringOrder } from '../../services/order.service';
import billingService, { BillingCustomer } from '../../services/billing.service';
import productService, { BackendProduct } from '../../services/product.service';
import deliveryService, { DeliveryPartnerProfile } from '../../services/delivery.service';

const WEEKDAYS = [
  { key: '0', label: 'Mon' },
  { key: '1', label: 'Tue' },
  { key: '2', label: 'Wed' },
  { key: '3', label: 'Thu' },
  { key: '4', label: 'Fri' },
  { key: '5', label: 'Sat' },
  { key: '6', label: 'Sun' },
];

export default function RecurringOrderScreen({ route, navigation }: any) {
  const existingTemplate: BackendRecurringOrder | null = route?.params?.template || null;
  const initialCustomer: BillingCustomer | null = route?.params?.customer || null;
  const initialCustomerId = route?.params?.customerId || initialCustomer?.id || existingTemplate?.customer_profile || null;

  const isEditing = !!existingTemplate;

  const [loadingData, setLoadingData] = useState<boolean>(true);
  const [customers, setCustomers] = useState<BillingCustomer[]>([]);
  const [products, setProducts] = useState<BackendProduct[]>([]);
  const [partners, setPartners] = useState<DeliveryPartnerProfile[]>([]);

  // Form State
  const [selectedCustomerId, setSelectedCustomerId] = useState<number | null>(initialCustomerId ? Number(initialCustomerId) : null);
  const [selectedPartnerId, setSelectedPartnerId] = useState<number | null>(existingTemplate?.delivery_partner || null);
  const [deliveryAddress, setDeliveryAddress] = useState<string>(existingTemplate?.delivery_address || initialCustomer?.address || '');
  const [frequency, setFrequency] = useState<'daily' | 'weekdays'>(existingTemplate?.frequency || 'daily');
  const [selectedWeekdays, setSelectedWeekdays] = useState<string[]>(
    existingTemplate?.weekdays
      ? existingTemplate.weekdays.split(',').map(s => s.trim())
      : ['0', '1', '2', '3', '4']
  );
  const [notes, setNotes] = useState<string>(existingTemplate?.notes || '');
  const [itemQuantities, setItemQuantities] = useState<{ [productId: number]: number }>({});
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [productSearch, setProductSearch] = useState<string>('');

  useEffect(() => {
    async function loadData() {
      try {
        const [cList, pList, dList] = await Promise.all([
          billingService.getCustomers().catch(() => []),
          productService.getProductsList().catch(() => []),
          deliveryService.getDeliveryPartners().catch(() => []),
        ]);

        setCustomers(cList || []);
        setPartners(dList || []);

        const mappedProds: BackendProduct[] = (pList || []).map((p: any) => ({
          id: Number(p.id),
          name: p.name,
          price: String(p.price || '0').replace(/[^0-9.]/g, ''),
          description: p.description,
          is_available: true,
          category: p.category || 1,
          created_at: p.created_at || new Date().toISOString(),
        }));
        setProducts(mappedProds);

        if (existingTemplate && existingTemplate.items) {
          const qMap: { [id: number]: number } = {};
          existingTemplate.items.forEach(it => {
            qMap[it.product] = it.quantity;
          });
          setItemQuantities(qMap);
        } else if (route?.params?.prefilledItems && Array.isArray(route.params.prefilledItems)) {
          const qMap: { [id: number]: number } = {};
          route.params.prefilledItems.forEach((it: any) => {
            qMap[Number(it.product_id)] = it.quantity;
          });
          setItemQuantities(qMap);
        }
      } catch (err) {
        console.log('Error loading recurring template dependencies:', err);
      } finally {
        setLoadingData(false);
      }
    }
    loadData();
  }, [existingTemplate, route?.params?.prefilledItems]);

  const handleSelectCustomer = (c: BillingCustomer) => {
    setSelectedCustomerId(c.id);
    if (!deliveryAddress) {
      setDeliveryAddress(c.address || '');
    }
  };

  const toggleWeekday = (dayKey: string) => {
    setSelectedWeekdays(prev =>
      prev.includes(dayKey) ? prev.filter(d => d !== dayKey) : [...prev, dayKey].sort()
    );
  };

  const updateQuantity = (productId: number, delta: number) => {
    setItemQuantities(prev => {
      const cur = prev[productId] || 0;
      const next = Math.max(0, cur + delta);
      if (next === 0) {
        const copy = { ...prev };
        delete copy[productId];
        return copy;
      }
      return { ...prev, [productId]: next };
    });
  };

  const selectedCount = useMemo(() => {
    return Object.values(itemQuantities).reduce((s, q) => s + q, 0);
  }, [itemQuantities]);

  const estimatedTotal = useMemo(() => {
    return Object.entries(itemQuantities).reduce((sum, [pid, qty]) => {
      const prod = products.find(p => p.id === Number(pid));
      const rate = prod ? parseFloat(prod.price) || 0 : 0;
      return sum + rate * qty;
    }, 0);
  }, [itemQuantities, products]);

  const filteredProducts = useMemo(() => {
    if (!productSearch.trim()) return products;
    const q = productSearch.toLowerCase();
    return products.filter(p => p.name.toLowerCase().includes(q));
  }, [products, productSearch]);

  const handleSave = async () => {
    if (!selectedCustomerId) {
      Alert.alert('Required', 'Please select a customer.');
      return;
    }
    if (!deliveryAddress.trim()) {
      Alert.alert('Required', 'Please enter a delivery address.');
      return;
    }
    const items = Object.entries(itemQuantities).map(([pid, qty]) => ({
      product_id: Number(pid),
      quantity: qty,
    }));
    if (items.length === 0) {
      Alert.alert('Required', 'Please select at least one product quantity.');
      return;
    }
    if (frequency === 'weekdays' && selectedWeekdays.length === 0) {
      Alert.alert('Required', 'Please select at least one active weekday.');
      return;
    }

    try {
      setSubmitting(true);
      const payload = {
        customer_id: selectedCustomerId,
        delivery_partner_id: selectedPartnerId,
        delivery_address: deliveryAddress.trim(),
        frequency,
        weekdays: frequency === 'weekdays' ? selectedWeekdays.join(',') : '',
        notes: notes.trim(),
        items,
      };

      if (isEditing && existingTemplate) {
        await orderService.updateRecurringOrder(existingTemplate.id, payload);
        Alert.alert('Updated', 'Recurring order template updated successfully.');
      } else {
        await orderService.createRecurringOrder(payload);
        Alert.alert('Saved', 'New recurring order template saved.');
      }
      navigation.goBack();
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to save recurring order template.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingData) {
    return (
      <SafeAreaView style={styles.container}>
        <Header title={isEditing ? 'Edit Recurring Order' : 'New Recurring Order'} showBack />
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color="#8C331A" />
        </View>
      </SafeAreaView>
    );
  }

  const selectedCustObj = customers.find(c => c.id === selectedCustomerId) || initialCustomer;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Header title={isEditing ? 'Edit Recurring Template' : 'New Recurring Template'} showBack />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* Customer Selection */}
          <Text style={styles.sectionLabel}>CUSTOMER</Text>
          {selectedCustObj ? (
            <View style={styles.selectedCustomerCard}>
              <View style={styles.custAvatar}>
                <Ionicons name="person" size={16} color="#8C331A" />
              </View>
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={styles.custName}>{selectedCustObj.name}</Text>
                <Text style={styles.custPhone}>{selectedCustObj.phone || 'No phone'}</Text>
              </View>
              {!initialCustomerId && (
                <TouchableOpacity
                  onPress={() => setSelectedCustomerId(null)}
                  style={styles.changeBtn}
                >
                  <Text style={styles.changeBtnText}>Change</Text>
                </TouchableOpacity>
              )}
            </View>
          ) : (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={{ marginBottom: 12 }}
            >
              {customers.map(c => (
                <TouchableOpacity
                  key={c.id}
                  style={[styles.chip, selectedCustomerId === c.id && styles.chipActive]}
                  onPress={() => handleSelectCustomer(c)}
                >
                  <Text style={[styles.chipText, selectedCustomerId === c.id && styles.chipTextActive]}>
                    {c.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}

          {/* Delivery Address */}
          <Text style={styles.sectionLabel}>DELIVERY ADDRESS *</Text>
          <TextInput
            style={styles.input}
            placeholder="Delivery address / stall location"
            placeholderTextColor="#A0958D"
            value={deliveryAddress}
            onChangeText={setDeliveryAddress}
          />

          {/* Schedule Frequency */}
          <Text style={styles.sectionLabel}>FREQUENCY</Text>
          <View style={styles.freqRow}>
            <TouchableOpacity
              style={[styles.freqBtn, frequency === 'daily' && styles.freqBtnActive]}
              onPress={() => setFrequency('daily')}
            >
              <Ionicons
                name="today-outline"
                size={16}
                color={frequency === 'daily' ? '#FFFFFF' : '#6B5E55'}
                style={{ marginRight: 6 }}
              />
              <Text style={[styles.freqBtnText, frequency === 'daily' && styles.freqBtnTextActive]}>
                Every Day (Mon - Sun)
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.freqBtn, frequency === 'weekdays' && styles.freqBtnActive]}
              onPress={() => setFrequency('weekdays')}
            >
              <Ionicons
                name="calendar-outline"
                size={16}
                color={frequency === 'weekdays' ? '#FFFFFF' : '#6B5E55'}
                style={{ marginRight: 6 }}
              />
              <Text style={[styles.freqBtnText, frequency === 'weekdays' && styles.freqBtnTextActive]}>
                Selected Days Only
              </Text>
            </TouchableOpacity>
          </View>

          {frequency === 'weekdays' && (
            <View style={styles.weekdaysRow}>
              {WEEKDAYS.map(w => {
                const isSelected = selectedWeekdays.includes(w.key);
                return (
                  <TouchableOpacity
                    key={w.key}
                    style={[styles.dayChip, isSelected && styles.dayChipActive]}
                    onPress={() => toggleWeekday(w.key)}
                  >
                    <Text style={[styles.dayChipText, isSelected && styles.dayChipTextActive]}>
                      {w.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}

          {/* Assign Delivery Partner (Optional) */}
          <Text style={styles.sectionLabel}>ASSIGN DELIVERY PARTNER (OPTIONAL)</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
            <TouchableOpacity
              style={[styles.partnerChip, selectedPartnerId === null && styles.partnerChipActive]}
              onPress={() => setSelectedPartnerId(null)}
            >
              <Text style={[styles.partnerChipText, selectedPartnerId === null && styles.partnerChipTextActive]}>
                Unassigned
              </Text>
            </TouchableOpacity>
            {partners.map(p => (
              <TouchableOpacity
                key={p.id}
                style={[styles.partnerChip, selectedPartnerId === p.id && styles.partnerChipActive]}
                onPress={() => setSelectedPartnerId(p.id)}
              >
                <Ionicons
                  name="bicycle-outline"
                  size={14}
                  color={selectedPartnerId === p.id ? '#FFFFFF' : '#8C331A'}
                  style={{ marginRight: 4 }}
                />
                <Text style={[styles.partnerChipText, selectedPartnerId === p.id && styles.partnerChipTextActive]}>
                  {p.name || `Partner #${p.id}`}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Order Notes */}
          <Text style={styles.sectionLabel}>TEMPLATE NOTES (OPTIONAL)</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. Deliver before 8:00 AM without sugar"
            placeholderTextColor="#A0958D"
            value={notes}
            onChangeText={setNotes}
          />

          {/* Select Products */}
          <View style={styles.productsHeaderRow}>
            <Text style={styles.sectionLabel}>PRODUCTS & QUANTITIES</Text>
            {selectedCount > 0 && (
              <Text style={styles.selectedCountText}>
                {selectedCount} items (~₹{estimatedTotal.toLocaleString()})
              </Text>
            )}
          </View>

          <View style={styles.searchBox}>
            <Ionicons name="search-outline" size={15} color="#8E8278" style={{ marginRight: 6 }} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search products..."
              placeholderTextColor="#8E8278"
              value={productSearch}
              onChangeText={setProductSearch}
            />
          </View>

          <View style={styles.productsCard}>
            {filteredProducts.map((p, idx) => {
              const qty = itemQuantities[p.id] || 0;
              const isSelected = qty > 0;
              const isLast = idx === filteredProducts.length - 1;
              return (
                <View
                  key={p.id}
                  style={[
                    styles.prodRow,
                    isLast && { borderBottomWidth: 0 },
                    isSelected && styles.prodRowSelected,
                  ]}
                >
                  <View style={{ flex: 1, marginRight: 10 }}>
                    <Text style={styles.prodName}>{p.name}</Text>
                    <Text style={styles.prodPrice}>₹{p.price} / unit</Text>
                  </View>

                  <View style={styles.qtyControl}>
                    <TouchableOpacity
                      style={[styles.qtyBtn, qty === 0 && styles.qtyBtnDisabled]}
                      onPress={() => updateQuantity(p.id, -1)}
                      disabled={qty === 0}
                    >
                      <Ionicons name="remove" size={13} color={qty === 0 ? '#C4BCB5' : '#8C331A'} />
                    </TouchableOpacity>

                    <Text style={[styles.qtyText, isSelected && styles.qtyTextActive]}>{qty}</Text>

                    <TouchableOpacity
                      style={styles.qtyBtn}
                      onPress={() => updateQuantity(p.id, 1)}
                    >
                      <Ionicons name="add" size={13} color="#8C331A" />
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })}
          </View>

          {/* Save Button */}
          <TouchableOpacity
            style={[styles.saveBtn, (selectedCount === 0 || submitting) && styles.saveBtnDisabled]}
            onPress={handleSave}
            disabled={selectedCount === 0 || submitting}
            activeOpacity={0.8}
          >
            {submitting ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <>
                <Ionicons name="checkmark-circle" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
                <Text style={styles.saveBtnText}>
                  {isEditing ? 'Update Recurring Template' : 'Save Recurring Template'}
                </Text>
              </>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAF8F5',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  centerBox: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#8E8278',
    letterSpacing: 0.5,
    marginTop: 10,
    marginBottom: 6,
  },
  selectedCustomerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#EFEAE4',
    marginBottom: 8,
  },
  custAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F5EBE6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  custName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#2A2421',
  },
  custPhone: {
    fontSize: 11,
    color: '#8E8278',
    marginTop: 1,
  },
  changeBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: '#FAF8F5',
    borderWidth: 1,
    borderColor: '#EFEAE4',
  },
  changeBtnText: {
    fontSize: 11,
    color: '#8C331A',
    fontWeight: '700',
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#EFEAE4',
    marginRight: 6,
  },
  chipActive: {
    backgroundColor: '#8C331A',
    borderColor: '#8C331A',
  },
  chipText: {
    fontSize: 12,
    color: '#6B5E55',
    fontWeight: '600',
  },
  chipTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#EFEAE4',
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 44,
    fontSize: 13,
    color: '#2A2421',
    marginBottom: 6,
  },
  freqRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  freqBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#EFEAE4',
    borderRadius: 10,
    paddingVertical: 10,
  },
  freqBtnActive: {
    backgroundColor: '#8C331A',
    borderColor: '#8C331A',
  },
  freqBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#6B5E55',
  },
  freqBtnTextActive: {
    color: '#FFFFFF',
  },
  weekdaysRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  dayChip: {
    width: 44,
    height: 38,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#EFEAE4',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dayChipActive: {
    backgroundColor: '#8C331A',
    borderColor: '#8C331A',
  },
  dayChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#6B5E55',
  },
  dayChipTextActive: {
    color: '#FFFFFF',
  },
  partnerChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#EFEAE4',
    marginRight: 6,
  },
  partnerChipActive: {
    backgroundColor: '#8C331A',
    borderColor: '#8C331A',
  },
  partnerChipText: {
    fontSize: 11,
    color: '#6B5E55',
    fontWeight: '600',
  },
  partnerChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  productsHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 6,
    marginBottom: 4,
  },
  selectedCountText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#8C331A',
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#EFEAE4',
    borderRadius: 8,
    paddingHorizontal: 10,
    height: 38,
    marginBottom: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 12,
    color: '#2A2421',
  },
  productsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#EFEAE4',
    overflow: 'hidden',
    marginBottom: 16,
  },
  prodRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#EFEAE4',
  },
  prodRowSelected: {
    backgroundColor: '#FCFAF8',
  },
  prodName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#2A2421',
  },
  prodPrice: {
    fontSize: 11,
    color: '#8C331A',
    fontWeight: '600',
    marginTop: 2,
  },
  qtyControl: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FAF8F5',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#EFEAE4',
    padding: 2,
  },
  qtyBtn: {
    width: 24,
    height: 24,
    borderRadius: 4,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#EFEAE4',
    justifyContent: 'center',
    alignItems: 'center',
  },
  qtyBtnDisabled: {
    opacity: 0.4,
  },
  qtyText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#8E8278',
    marginHorizontal: 8,
    minWidth: 16,
    textAlign: 'center',
  },
  qtyTextActive: {
    color: '#8C331A',
    fontWeight: '800',
  },
  saveBtn: {
    flexDirection: 'row',
    backgroundColor: '#8C331A',
    borderRadius: 12,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  saveBtnDisabled: {
    backgroundColor: '#C4BCB5',
  },
  saveBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
});
