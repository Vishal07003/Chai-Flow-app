import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Keyboard,
  ActivityIndicator,
  Alert,
  Dimensions,
  BackHandler,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { BackendRecurringOrder } from '../../services/order.service';
import { BillingCustomer } from '../../services/billing.service';
import { DeliveryPartnerProfile } from '../../services/delivery.service';
import { BackendProduct } from '../../services/product.service';

const WEEKDAY_NAMES = [
  { day: 0, label: 'Mon' },
  { day: 1, label: 'Tue' },
  { day: 2, label: 'Wed' },
  { day: 3, label: 'Thu' },
  { day: 4, label: 'Fri' },
  { day: 5, label: 'Sat' },
  { day: 6, label: 'Sun' },
];

export interface RecurringOrderFormData {
  customer_id?: number | null;
  delivery_partner_id?: number | null;
  delivery_address: string;
  frequency: 'daily' | 'weekdays';
  weekdays?: string;
  notes?: string;
  items: Array<{
    product_id: number;
    quantity: number;
  }>;
}

export interface RecurringOrderModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (data: RecurringOrderFormData) => Promise<void> | void;
  existingTemplate?: BackendRecurringOrder | null;
  customers: BillingCustomer[];
  products: BackendProduct[];
  partners: DeliveryPartnerProfile[];
  initialCustomerId?: number | null;
}

export default function RecurringOrderModal({
  visible,
  onClose,
  onSubmit,
  existingTemplate,
  customers,
  products,
  partners,
  initialCustomerId,
}: RecurringOrderModalProps) {
  const isEditing = !!existingTemplate;

  const [selectedCustomerId, setSelectedCustomerId] = useState<number | null>(null);
  const [selectedPartnerId, setSelectedPartnerId] = useState<number | null>(null);
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [frequency, setFrequency] = useState<'daily' | 'weekdays'>('daily');
  const [selectedWeekdays, setSelectedWeekdays] = useState<number[]>([0, 1, 2, 3, 4]); // Mon-Fri by default
  const [notes, setNotes] = useState('');
  const [itemQuantities, setItemQuantities] = useState<{ [productId: number]: number }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [productSearch, setProductSearch] = useState('');
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);

  const scrollViewRef = useRef<ScrollView>(null);

  // Keyboard and Android back listener
  useEffect(() => {
    if (!visible) return;

    const showSub = Keyboard.addListener(
      Platform.OS === 'android' ? 'keyboardDidShow' : 'keyboardWillShow',
      () => setIsKeyboardVisible(true)
    );
    const hideSub = Keyboard.addListener(
      Platform.OS === 'android' ? 'keyboardDidHide' : 'keyboardWillHide',
      () => setIsKeyboardVisible(false)
    );

    const backAction = () => {
      if (isKeyboardVisible) {
        Keyboard.dismiss();
        return true;
      }
      onClose();
      return true;
    };

    const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);

    return () => {
      showSub.remove();
      hideSub.remove();
      backHandler.remove();
    };
  }, [visible, isKeyboardVisible, onClose]);

  // Initialize form state
  useEffect(() => {
    if (existingTemplate) {
      setSelectedCustomerId(existingTemplate.customer_profile || null);
      setSelectedPartnerId(existingTemplate.delivery_partner || null);
      setDeliveryAddress(existingTemplate.delivery_address || '');
      setFrequency(existingTemplate.frequency || 'daily');
      if (existingTemplate.weekdays) {
        const parsed = existingTemplate.weekdays
          .split(',')
          .map(w => parseInt(w.trim(), 10))
          .filter(n => !isNaN(n));
        setSelectedWeekdays(parsed);
      } else {
        setSelectedWeekdays([0, 1, 2, 3, 4]);
      }
      setNotes(existingTemplate.notes || '');

      const qtys: { [id: number]: number } = {};
      (existingTemplate.items || []).forEach(it => {
        qtys[it.product] = it.quantity;
      });
      setItemQuantities(qtys);
    } else {
      const targetCustId = initialCustomerId || (customers.length > 0 ? customers[0].id : null);
      setSelectedCustomerId(targetCustId);
      setSelectedPartnerId(null);
      const targetCust = customers.find(c => c.id === targetCustId);
      setDeliveryAddress(targetCust?.address || (customers.length > 0 ? customers[0].address || '' : ''));
      setFrequency('daily');
      setSelectedWeekdays([0, 1, 2, 3, 4]);
      setNotes('');
      setItemQuantities({});
    }
  }, [existingTemplate, customers, visible, initialCustomerId]);

  const handleSelectCustomer = (c: BillingCustomer) => {
    setSelectedCustomerId(c.id);
    if (!deliveryAddress || !isEditing) {
      setDeliveryAddress(c.address || '');
    }
  };

  const handleToggleWeekday = (day: number) => {
    setSelectedWeekdays(prev => {
      if (prev.includes(day)) {
        if (prev.length === 1) {
          Alert.alert('Required', 'Please select at least one weekday.');
          return prev;
        }
        return prev.filter(d => d !== day);
      } else {
        return [...prev, day].sort();
      }
    });
  };

  const handleItemQtyChange = (productId: number, delta: number) => {
    setItemQuantities(prev => {
      const current = prev[productId] || 0;
      const next = Math.max(0, current + delta);
      if (next === 0) {
        const copy = { ...prev };
        delete copy[productId];
        return copy;
      }
      return { ...prev, [productId]: next };
    });
  };

  const handleDirectQtyChange = (productId: number, text: string) => {
    const cleanText = text.replace(/[^0-9]/g, '');
    if (cleanText === '') {
      setItemQuantities(prev => {
        const copy = { ...prev };
        delete copy[productId];
        return copy;
      });
      return;
    }
    const val = parseInt(cleanText, 10);
    if (isNaN(val) || val <= 0) {
      setItemQuantities(prev => {
        const copy = { ...prev };
        delete copy[productId];
        return copy;
      });
    } else {
      setItemQuantities(prev => ({ ...prev, [productId]: val }));
    }
  };

  const selectedCount = Object.keys(itemQuantities).length;
  const totalUnits = Object.values(itemQuantities).reduce((a, b) => a + b, 0);

  // Calculate estimated total based on product rates
  const estimatedTotal = useMemo(() => {
    return Object.entries(itemQuantities).reduce((sum, [pid, qty]) => {
      const prod = products.find(p => p.id === Number(pid));
      const rate = prod ? parseFloat(String(prod.price)) || 0 : 0;
      return sum + rate * qty;
    }, 0);
  }, [itemQuantities, products]);

  const filteredProducts = products.filter(p =>
    !productSearch.trim() || p.name.toLowerCase().includes(productSearch.toLowerCase().trim())
  );

  const handleSubmit = async () => {
    if (!isEditing && !selectedCustomerId) {
      Alert.alert('Validation Error', 'Please select a customer for this recurring order.');
      return;
    }

    if (!deliveryAddress.trim()) {
      Alert.alert('Validation Error', 'Delivery address is required.');
      return;
    }

    const itemsPayload = Object.entries(itemQuantities)
      .filter(([_, qty]) => qty > 0)
      .map(([pid, qty]) => ({
        product_id: Number(pid),
        quantity: qty,
      }));

    if (itemsPayload.length === 0) {
      Alert.alert('Validation Error', 'Please add at least one product with a quantity.');
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit({
        customer_id: selectedCustomerId,
        delivery_partner_id: selectedPartnerId,
        delivery_address: deliveryAddress.trim(),
        frequency,
        weekdays: frequency === 'weekdays' ? selectedWeekdays.join(',') : '',
        notes: notes.trim(),
        items: itemsPayload,
      });
      onClose();
    } catch (err: any) {
      Alert.alert('Error', err?.message || err?.detail || 'Failed to save recurring order template.');
    } finally {
      setIsSubmitting(false);
    }
  };

    return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent={true}
    >
      <View style={styles.modalOverlay}>
        <TouchableOpacity
          style={StyleSheet.absoluteFill}
          activeOpacity={1}
          onPress={() => {
            if (isKeyboardVisible) {
              Keyboard.dismiss();
            } else {
              onClose();
            }
          }}
        />

        <KeyboardAvoidingView
          style={[
            styles.keyboardContainer,
            isKeyboardVisible && styles.keyboardContainerLifted,
          ]}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          pointerEvents="box-none"
        >
          <View
            style={[
              styles.modalCard,
              { maxHeight: isKeyboardVisible ? Dimensions.get('window').height * 0.76 : Dimensions.get('window').height * 0.86 },
            ]}
          >
            {/* Header */}
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>
                  {isEditing ? 'Edit Recurring Order' : 'New Recurring Order'}
                </Text>
                <Text style={styles.modalSubtitle}>
                  {isEditing ? 'Edits will apply to future scheduled orders only' : 'Create an automated order template'}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.closeBtn}
                onPress={onClose}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="close" size={20} color="#6B5E55" />
              </TouchableOpacity>
            </View>

            <ScrollView
              ref={scrollViewRef}
              showsVerticalScrollIndicator={true}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={styles.scrollContent}
              bounces={false}
            >
              {/* Customer Selector (Read-only on edit to protect identity) */}
              {!isEditing ? (
                <>
                  <Text style={styles.sectionLabel}>SELECT CUSTOMER *</Text>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    style={styles.chipScroll}
                    contentContainerStyle={{ paddingVertical: 2 }}
                  >
                    {customers.map(c => {
                      const isSelected = selectedCustomerId === c.id;
                      return (
                        <TouchableOpacity
                          key={c.id}
                          style={[styles.chip, isSelected && styles.chipActive]}
                          onPress={() => handleSelectCustomer(c)}
                          activeOpacity={0.7}
                        >
                          <Ionicons
                            name="person-outline"
                            size={13}
                            color={isSelected ? '#FFFFFF' : '#8C331A'}
                            style={{ marginRight: 6 }}
                          />
                          <Text style={[styles.chipText, isSelected && styles.chipTextActive]}>
                            {c.name}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                </>
              ) : (
                <View style={styles.readOnlyCustBox}>
                  <Ionicons name="person-circle-outline" size={18} color="#8C331A" style={{ marginRight: 6 }} />
                  <Text style={styles.readOnlyCustName}>
                    Customer: <Text style={{ fontWeight: '800' }}>{existingTemplate?.customer_name}</Text>
                  </Text>
                </View>
              )}

              {/* Delivery Address */}
              <Text style={styles.sectionLabel}>DELIVERY ADDRESS *</Text>
              <View style={styles.inputContainer}>
                <Ionicons name="location-outline" size={16} color="#8E8278" style={styles.inputIcon} />
                <TextInput
                  style={styles.textInput}
                  placeholder="Enter delivery address *"
                  placeholderTextColor="#A0958D"
                  value={deliveryAddress}
                  onChangeText={setDeliveryAddress}
                />
              </View>

              {/* Frequency Selector: Daily or Specific Weekdays */}
              <Text style={styles.sectionLabel}>FREQUENCY & SCHEDULE</Text>
              <View style={styles.frequencyRow}>
                <TouchableOpacity
                  style={[styles.freqBtn, frequency === 'daily' && styles.freqBtnActive]}
                  onPress={() => setFrequency('daily')}
                >
                  <Ionicons
                    name="calendar-outline"
                    size={15}
                    color={frequency === 'daily' ? '#FFFFFF' : '#8C331A'}
                    style={{ marginRight: 6 }}
                  />
                  <Text style={[styles.freqBtnText, frequency === 'daily' && styles.freqBtnTextActive]}>
                    Daily (All 7 Days)
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.freqBtn, frequency === 'weekdays' && styles.freqBtnActive]}
                  onPress={() => setFrequency('weekdays')}
                >
                  <Ionicons
                    name="repeat-outline"
                    size={15}
                    color={frequency === 'weekdays' ? '#FFFFFF' : '#8C331A'}
                    style={{ marginRight: 6 }}
                  />
                  <Text style={[styles.freqBtnText, frequency === 'weekdays' && styles.freqBtnTextActive]}>
                    Select Weekdays
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Weekday Picker if frequency is weekdays */}
              {frequency === 'weekdays' && (
                <View style={styles.weekdayPickerRow}>
                  {WEEKDAY_NAMES.map(w => {
                    const isChecked = selectedWeekdays.includes(w.day);
                    return (
                      <TouchableOpacity
                        key={w.day}
                        style={[styles.dayChip, isChecked && styles.dayChipActive]}
                        onPress={() => handleToggleWeekday(w.day)}
                      >
                        <Text style={[styles.dayChipText, isChecked && styles.dayChipTextActive]}>
                          {w.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}

              {/* Optional Assigned Delivery Partner */}
              <Text style={styles.sectionLabel}>ASSIGN DELIVERY PARTNER (OPTIONAL)</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.chipScroll}
                contentContainerStyle={{ paddingVertical: 2 }}
              >
                <TouchableOpacity
                  style={[styles.chip, selectedPartnerId === null && styles.chipActive]}
                  onPress={() => setSelectedPartnerId(null)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.chipText, selectedPartnerId === null && styles.chipTextActive]}>
                    None (Auto-Unassigned)
                  </Text>
                </TouchableOpacity>
                {partners.map(p => {
                  const isSelected = selectedPartnerId === p.id;
                  return (
                    <TouchableOpacity
                      key={p.id}
                      style={[styles.chip, isSelected && styles.chipActive]}
                      onPress={() => setSelectedPartnerId(p.id)}
                      activeOpacity={0.7}
                    >
                      <Ionicons
                        name="bicycle-outline"
                        size={13}
                        color={isSelected ? '#FFFFFF' : '#8C331A'}
                        style={{ marginRight: 6 }}
                      />
                      <Text style={[styles.chipText, isSelected && styles.chipTextActive]}>
                        {p.name}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              {/* Product Quantities & Items */}
              <View style={styles.productHeader}>
                <View>
                  <Text style={styles.sectionLabel}>SELECT PRODUCTS & QUANTITIES</Text>
                  {estimatedTotal > 0 && (
                    <Text style={styles.estimatedTotalText}>
                      Est. Total: <Text style={styles.estimatedTotalBold}>₹{estimatedTotal}</Text>
                    </Text>
                  )}
                </View>
                {selectedCount > 0 && (
                  <View style={styles.countBadgeContainer}>
                    <Text style={styles.countBadge}>
                      {selectedCount} {selectedCount === 1 ? 'item' : 'items'} ({totalUnits} units)
                    </Text>
                  </View>
                )}
              </View>

              {/* Filter products */}
              <View style={styles.productSearchRow}>
                <Ionicons name="search-outline" size={14} color="#8E8278" style={{ marginRight: 6 }} />
                <TextInput
                  style={styles.productSearchInput}
                  placeholder="Search products..."
                  placeholderTextColor="#A0958D"
                  value={productSearch}
                  onChangeText={setProductSearch}
                />
                {productSearch.length > 0 && (
                  <TouchableOpacity onPress={() => setProductSearch('')}>
                    <Ionicons name="close-circle" size={15} color="#8E8278" />
                  </TouchableOpacity>
                )}
              </View>

              <View style={styles.productTable}>
                {filteredProducts.map(prod => {
                  const qty = itemQuantities[prod.id] || 0;
                  return (
                    <View key={prod.id} style={[styles.prodRow, qty > 0 && styles.prodRowSelected]}>
                      <View style={{ flex: 1, marginRight: 8 }}>
                        <Text style={styles.prodName}>{prod.name}</Text>
                        <Text style={styles.prodPrice}>₹{prod.price} / unit</Text>
                      </View>

                      <View style={styles.stepperContainer}>
                        <TouchableOpacity
                          style={[styles.stepBtn, qty === 0 && styles.stepBtnDisabled]}
                          onPress={() => handleItemQtyChange(prod.id, -1)}
                          disabled={qty === 0}
                        >
                          <Ionicons name="remove" size={14} color={qty === 0 ? '#C4BBB5' : '#8C331A'} />
                        </TouchableOpacity>

                        <TextInput
                          style={styles.qtyInput}
                          keyboardType="numeric"
                          value={qty > 0 ? String(qty) : '0'}
                          onChangeText={text => handleDirectQtyChange(prod.id, text)}
                          selectTextOnFocus={true}
                        />

                        <TouchableOpacity
                          style={styles.stepBtn}
                          onPress={() => handleItemQtyChange(prod.id, 1)}
                        >
                          <Ionicons name="add" size={14} color="#8C331A" />
                        </TouchableOpacity>
                      </View>
                    </View>
                  );
                })}
              </View>

              {/* Notes */}
              <Text style={styles.sectionLabel}>ORDER INSTRUCTIONS (OPTIONAL)</Text>
              <View style={styles.inputContainer}>
                <Ionicons name="document-text-outline" size={16} color="#8E8278" style={styles.inputIcon} />
                <TextInput
                  style={styles.textInput}
                  placeholder="e.g. Deliver before 10:30 AM"
                  placeholderTextColor="#A0958D"
                  value={notes}
                  onChangeText={setNotes}
                />
              </View>
            </ScrollView>

            {/* Fixed Footer Save Button */}
            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={[styles.saveBtn, selectedCount === 0 && styles.saveBtnDisabled]}
                onPress={handleSubmit}
                disabled={isSubmitting || selectedCount === 0}
                activeOpacity={0.85}
              >
                {isSubmitting ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <>
                    <Ionicons name="checkmark-circle" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
                    <Text style={styles.saveBtnText}>
                      {isEditing
                        ? `Update Recurring Template ${estimatedTotal > 0 ? `(₹${estimatedTotal})` : ''}`
                        : `Create Recurring Order ${estimatedTotal > 0 ? `(₹${estimatedTotal})` : ''}`}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  keyboardContainer: {
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  keyboardContainerLifted: {
    justifyContent: 'flex-start',
    paddingTop: Platform.OS === 'android' ? 24 : 44,
  },
  modalCard: {
    width: '100%',
    maxWidth: 460,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    overflow: 'hidden',
    shadowColor: '#2A2421',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.16,
    shadowRadius: 12,
    elevation: 10,
    flexDirection: 'column',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F0EBE6',
    backgroundColor: '#FFFFFF',
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#2A2421',
  },
  modalSubtitle: {
    fontSize: 11,
    color: '#8E8278',
    marginTop: 1,
  },
  closeBtn: {
    padding: 6,
    borderRadius: 16,
    backgroundColor: '#FAF7F4',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 16,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#8E8278',
    letterSpacing: 0.5,
    marginTop: 10,
    marginBottom: 6,
  },
  estimatedTotalText: {
    fontSize: 12,
    color: '#6B5E55',
    marginTop: 1,
  },
  estimatedTotalBold: {
    fontWeight: '800',
    color: '#8C331A',
  },
  countBadgeContainer: {
    backgroundColor: '#F7EBE4',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  chipScroll: {
    marginBottom: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FAF7F4',
    borderWidth: 1,
    borderColor: '#E6DDD5',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 7,
    marginRight: 8,
  },
  chipActive: {
    backgroundColor: '#8C331A',
    borderColor: '#8C331A',
  },
  chipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#3B302A',
  },
  chipTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  readOnlyCustBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FAF7F4',
    padding: 10,
    borderRadius: 8,
    marginVertical: 4,
    borderWidth: 1,
    borderColor: '#EFEAE4',
  },
  readOnlyCustName: {
    fontSize: 13,
    color: '#3B302A',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FAF7F4',
    borderWidth: 1,
    borderColor: '#E6DDD5',
    borderRadius: 8,
    paddingHorizontal: 10,
    marginBottom: 8,
  },
  inputIcon: {
    marginRight: 8,
  },
  textInput: {
    flex: 1,
    fontSize: 13,
    color: '#2A2421',
    paddingVertical: 7,
  },
  frequencyRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  freqBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FAF7F4',
    borderWidth: 1,
    borderColor: '#E6DDD5',
    borderRadius: 8,
    paddingVertical: 8,
  },
  freqBtnActive: {
    backgroundColor: '#8C331A',
    borderColor: '#8C331A',
  },
  freqBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#8C331A',
  },
  freqBtnTextActive: {
    color: '#FFFFFF',
  },
  weekdayPickerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  dayChip: {
    width: 38,
    height: 34,
    borderRadius: 8,
    backgroundColor: '#FAF7F4',
    borderWidth: 1,
    borderColor: '#E6DDD5',
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
    color: '#8E8278',
  },
  dayChipTextActive: {
    color: '#FFFFFF',
  },
  productHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 4,
  },
  countBadge: {
    fontSize: 11,
    fontWeight: '700',
    color: '#8C331A',
  },
  productSearchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FAF7F4',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#E6DDD5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginBottom: 8,
  },
  productSearchInput: {
    flex: 1,
    fontSize: 12,
    color: '#2A2421',
    paddingVertical: 3,
  },
  productTable: {
    backgroundColor: '#FAF7F4',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E6DDD5',
    overflow: 'hidden',
    marginBottom: 8,
  },
  prodRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderBottomWidth: 0.5,
    borderBottomColor: '#EFEAE4',
  },
  prodRowSelected: {
    backgroundColor: '#F7EFE9',
  },
  prodName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#2A2421',
  },
  prodPrice: {
    fontSize: 11,
    color: '#8E8278',
    marginTop: 1,
  },
  stepperContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E6DDD5',
    borderRadius: 6,
    paddingHorizontal: 2,
    paddingVertical: 2,
  },
  stepBtn: {
    padding: 4,
  },
  stepBtnDisabled: {
    opacity: 0.3,
  },
  qtyInput: {
    fontSize: 13,
    fontWeight: '800',
    color: '#2A2421',
    minWidth: 32,
    textAlign: 'center',
    paddingVertical: 0,
    paddingHorizontal: 2,
  },
  modalFooter: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#F0EBE6',
    backgroundColor: '#FFFFFF',
  },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#8C331A',
    borderRadius: 10,
    paddingVertical: 12,
  },
  saveBtnDisabled: {
    opacity: 0.5,
  },
  saveBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
  },
});
