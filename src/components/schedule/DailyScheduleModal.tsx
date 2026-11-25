import React, { useState, useEffect, useMemo } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Modal,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Platform,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { colors, typography, radius, spacing, shadows } from '../../theme';
import productService, { BackendProduct } from '../../services/product.service';
import deliveryService, { DeliveryPartnerProfile } from '../../services/delivery.service';
import { customerService } from '../../services/customer.service';
import { Customer } from '../../types/customer';
import { DailyDeliverySchedule, CreateDailySchedulePayload } from '../../services/order.service';
import { AppDatePicker, AppTimePicker } from '../common';
import AppToast from '../../utils/toast';

interface DailyScheduleModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (payload: CreateDailySchedulePayload) => Promise<void>;
  customerId?: number | null;
  customerName?: string;
  customerAddress?: string;
  existingSchedule?: DailyDeliverySchedule | null;
}

const WEEKDAYS = [
  { day: 0, label: 'M', name: 'Mon' },
  { day: 1, label: 'T', name: 'Tue' },
  { day: 2, label: 'W', name: 'Wed' },
  { day: 3, label: 'T', name: 'Thu' },
  { day: 4, label: 'F', name: 'Fri' },
  { day: 5, label: 'S', name: 'Sat' },
  { day: 6, label: 'S', name: 'Sun' },
];

export const DailyScheduleModal: React.FC<DailyScheduleModalProps> = ({
  visible,
  onClose,
  onSubmit,
  customerId: initialCustomerId,
  customerName: initialCustomerName,
  customerAddress = '',
  existingSchedule,
}) => {
  const [products, setProducts] = useState<BackendProduct[]>([]);
  const [partners, setPartners] = useState<DeliveryPartnerProfile[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loadingDatasets, setLoadingDatasets] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);

  // Customer Selection state
  const [selectedCustomerId, setSelectedCustomerId] = useState<number | null>(
    initialCustomerId || (existingSchedule ? existingSchedule.customer_profile : null)
  );
  const [customerSearchQuery, setCustomerSearchQuery] = useState<string>('');

  // Form Fields
  const [selectedPartnerId, setSelectedPartnerId] = useState<number | null>(null);
  const [deliveryTime, setDeliveryTime] = useState<string>('10:00');
  const [leadTime, setLeadTime] = useState<string>('30');
  const [selectedDays, setSelectedDays] = useState<number[]>([0, 1, 2, 3, 4, 5, 6]);
  const [startDate, setStartDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState<string>('');
  const [isActive, setIsActive] = useState<boolean>(true);
  const [notes, setNotes] = useState<string>('');
  const [address, setAddress] = useState<string>(customerAddress);

  // Products and Quantities: { [productId: number]: number }
  const [quantities, setQuantities] = useState<{ [productId: number]: number }>({});

  useEffect(() => {
    if (!visible) return;
    setLoadingDatasets(true);
    Promise.all([
      productService.getProducts().catch(() => []),
      deliveryService.getDeliveryPartners().catch(() => []),
      customerService.getCustomers().catch(() => []),
    ])
      .then(([prods, parts, custs]) => {
        setProducts(prods || []);
        setPartners(parts || []);
        setCustomers(custs || []);

        if (existingSchedule) {
          setSelectedCustomerId(existingSchedule.customer_profile);
          setSelectedPartnerId(existingSchedule.delivery_partner);
          setDeliveryTime(existingSchedule.delivery_time.substring(0, 5) || '10:00');
          setLeadTime(String(existingSchedule.notification_lead_time_minutes || 30));
          const days = existingSchedule.weekdays
            ? existingSchedule.weekdays.split(',').map(s => parseInt(s.trim(), 10)).filter(n => !isNaN(n))
            : [0, 1, 2, 3, 4, 5, 6];
          setSelectedDays(days);
          setStartDate(existingSchedule.start_date || new Date().toISOString().split('T')[0]);
          setEndDate(existingSchedule.end_date || '');
          setIsActive(existingSchedule.is_active);
          setNotes(existingSchedule.notes || '');
          setAddress(existingSchedule.delivery_address || customerAddress);

          const qMap: { [pId: number]: number } = {};
          (existingSchedule.items || []).forEach(it => {
            qMap[it.product] = it.quantity;
          });
          setQuantities(qMap);
        } else {
          // Defaults for new schedule
          setSelectedCustomerId(initialCustomerId || (custs && custs.length > 0 ? Number(custs[0].id) : null));
          setSelectedPartnerId(parts && parts.length > 0 ? parts[0].id : null);
          setDeliveryTime('10:00');
          setLeadTime('30');
          setSelectedDays([0, 1, 2, 3, 4, 5, 6]);
          setStartDate(new Date().toISOString().split('T')[0]);
          setEndDate('');
          setIsActive(true);
          setNotes('');
          setAddress(customerAddress);
          if (prods && prods.length > 0) {
            setQuantities({ [prods[0].id]: 2 });
          } else {
            setQuantities({});
          }
        }
      })
      .finally(() => setLoadingDatasets(false));
  }, [visible, existingSchedule, customerAddress, initialCustomerId]);

  // Derived current customer info
  const activeCustomer = useMemo(() => {
    if (!selectedCustomerId) return null;
    return customers.find(c => Number(c.id) === Number(selectedCustomerId));
  }, [customers, selectedCustomerId]);

  const activeCustomerName = initialCustomerName || activeCustomer?.name || existingSchedule?.customer_name || 'Select Customer';

  const filteredCustomerList = useMemo(() => {
    if (!customerSearchQuery.trim()) return customers.slice(0, 8);
    const q = customerSearchQuery.toLowerCase();
    return customers.filter(c => c.name.toLowerCase().includes(q) || (c.phone && c.phone.includes(q))).slice(0, 8);
  }, [customers, customerSearchQuery]);

  const toggleDay = (day: number) => {
    if (selectedDays.includes(day)) {
      if (selectedDays.length === 1) {
        AppToast.warning('Validation', 'Please select at least one delivery day.');
        return;
      }
      setSelectedDays(selectedDays.filter(d => d !== day));
    } else {
      setSelectedDays([...selectedDays, day].sort());
    }
  };

  const updateQuantity = (productId: number, delta: number) => {
    setQuantities(prev => {
      const current = prev[productId] || 0;
      const next = Math.max(0, current + delta);
      const updated = { ...prev };
      if (next === 0) {
        delete updated[productId];
      } else {
        updated[productId] = next;
      }
      return updated;
    });
  };

  const handleSave = async () => {
    if (!selectedCustomerId) {
      AppToast.warning('Required Field', 'Please select a customer for this delivery schedule.');
      return;
    }
    if (!selectedPartnerId) {
      AppToast.warning('Required Field', 'Please assign a fixed Delivery Partner.');
      return;
    }
    const itemEntries = Object.entries(quantities).filter(([_, qty]) => qty > 0);
    if (itemEntries.length === 0) {
      AppToast.warning('Required Field', 'Please select at least one product with quantity.');
      return;
    }
    if (selectedDays.length === 0) {
      AppToast.warning('Required Field', 'Please select delivery weekdays.');
      return;
    }

    // Time validation (HH:MM)
    const timeMatch = deliveryTime.match(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/);
    if (!timeMatch) {
      AppToast.warning('Invalid Time', 'Please enter time in 24-hour format HH:MM (e.g. 10:00 or 15:30).');
      return;
    }

    const payload: CreateDailySchedulePayload = {
      customer_id: selectedCustomerId,
      delivery_partner_id: selectedPartnerId,
      delivery_time: `${deliveryTime}:00`,
      notification_lead_time_minutes: parseInt(leadTime || '30', 10) || 30,
      weekdays: selectedDays.join(','),
      delivery_address: address,
      start_date: startDate,
      end_date: endDate.trim() ? endDate.trim() : null,
      is_active: isActive,
      notes: notes.trim(),
      items: itemEntries.map(([pId, qty]) => {
        const prod = products.find(p => p.id === Number(pId));
        return {
          product_id: Number(pId),
          quantity: qty,
          unit_price: prod?.price || '0.00',
        };
      }),
    };

    try {
      setSubmitting(true);
      await onSubmit(payload);
      onClose();
    } catch (err: any) {
      AppToast.error('Save Failed', err?.message || 'Could not save schedule.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={onClose} />
        <View style={styles.modalSheet}>
          <View style={styles.sheetHeader}>
            <View style={{ flex: 1 }}>
              <Text style={styles.sheetTitle}>
                {existingSchedule ? 'Edit Daily Delivery Schedule' : 'Create Daily Schedule'}
              </Text>
              <Text style={styles.sheetSubtitle}>{activeCustomerName} • Dedicated Route</Text>
            </View>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="close" size={22} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {loadingDatasets ? (
            <View style={styles.loadingBox}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={styles.loadingText}>Loading products & fleet...</Text>
            </View>
          ) : (
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
              {/* 0. Customer Selector (Shown when customerId is not pre-fixed or when creating new) */}
              {!initialCustomerId && (
                <View style={styles.section}>
                  <Text style={styles.sectionLabel}>CUSTOMER</Text>
                  <Text style={styles.sectionHint}>Select the customer for this daily scheduled delivery.</Text>
                  
                  {/* Search box if list is large */}
                  <View style={[styles.textInputBox, { marginBottom: 8 }]}>
                    <Ionicons name="search-outline" size={16} color={colors.textMuted} style={{ marginRight: 6 }} />
                    <TextInput
                      style={styles.textInput}
                      value={customerSearchQuery}
                      onChangeText={setCustomerSearchQuery}
                      placeholder="Search customer name or phone..."
                      placeholderTextColor={colors.textMuted}
                    />
                    {customerSearchQuery.length > 0 && (
                      <TouchableOpacity onPress={() => setCustomerSearchQuery('')}>
                        <Ionicons name="close-circle" size={16} color={colors.textMuted} />
                      </TouchableOpacity>
                    )}
                  </View>

                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingVertical: 4 }}>
                    {filteredCustomerList.map(c => {
                      const isSelected = selectedCustomerId === Number(c.id);
                      return (
                        <TouchableOpacity
                          key={c.id}
                          style={[styles.partnerChip, isSelected && styles.partnerChipSelected]}
                          onPress={() => {
                            setSelectedCustomerId(Number(c.id));
                            if (c.address && (!address || address === customerAddress)) {
                              setAddress(c.address);
                            }
                          }}
                          activeOpacity={0.7}
                        >
                          <Ionicons
                            name="person"
                            size={13}
                            color={isSelected ? colors.white : colors.primary}
                            style={{ marginRight: 5 }}
                          />
                          <Text style={[styles.partnerChipText, isSelected && styles.partnerChipTextSelected]}>
                            {c.name}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                </View>
              )}

              {/* 1. Fixed Assigned Delivery Partner */}
              <View style={styles.section}>
                <Text style={styles.sectionLabel}>FIXED DELIVERY PARTNER (ASSIGNED ONCE)</Text>
                <Text style={styles.sectionHint}>The same partner receives this order every scheduled day.</Text>
                <View style={styles.partnersList}>
                  {partners.map(p => {
                    const isSelected = selectedPartnerId === p.id;
                    return (
                      <TouchableOpacity
                        key={p.id}
                        style={[styles.partnerChip, isSelected && styles.partnerChipSelected]}
                        onPress={() => setSelectedPartnerId(p.id)}
                        activeOpacity={0.7}
                      >
                        <Ionicons
                          name="bicycle"
                          size={14}
                          color={isSelected ? colors.white : colors.primary}
                          style={{ marginRight: 6 }}
                        />
                        <Text style={[styles.partnerChipText, isSelected && styles.partnerChipTextSelected]}>
                          {p.name}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* 2. Delivery Time & Lead Time */}
              <View style={styles.section}>
                <Text style={styles.sectionLabel}>CUSTOMER DELIVERY TIME & NOTIFICATION LEAD</Text>
                <View style={styles.row}>
                  <View style={{ flex: 1, marginRight: spacing.sm }}>
                    <AppTimePicker
                      label="Delivery Time"
                      value={deliveryTime}
                      onChange={setDeliveryTime}
                      placeholder="Select Time"
                      outputFormat="HH:MM"
                    />
                  </View>

                  <View style={{ flex: 1 }}>
                    <Text style={styles.inputSubLabel}>FCM Lead Time (Minutes)</Text>
                    <View style={styles.textInputBox}>
                      <Ionicons name="notifications-outline" size={16} color={colors.textMuted} style={{ marginRight: 6 }} />
                      <TextInput
                        style={styles.textInput}
                        value={leadTime}
                        onChangeText={setLeadTime}
                        keyboardType="numeric"
                        placeholder="30"
                        placeholderTextColor={colors.textMuted}
                        maxLength={3}
                      />
                    </View>
                  </View>
                </View>
                <Text style={styles.sectionHint}>Partner is notified {leadTime || 30} mins before scheduled delivery.</Text>
              </View>

              {/* 3. Delivery Days (Monday - Sunday) */}
              <View style={styles.section}>
                <Text style={styles.sectionLabel}>SELECTED DELIVERY WEEKDAYS</Text>
                <View style={styles.daysRow}>
                  {WEEKDAYS.map(w => {
                    const isSelected = selectedDays.includes(w.day);
                    return (
                      <TouchableOpacity
                        key={w.day}
                        style={[styles.dayCircle, isSelected && styles.dayCircleSelected]}
                        onPress={() => toggleDay(w.day)}
                        activeOpacity={0.7}
                      >
                        <Text style={[styles.dayText, isSelected && styles.dayTextSelected]}>
                          {w.name}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* 4. Products & Quantities */}
              <View style={styles.section}>
                <Text style={styles.sectionLabel}>SCHEDULED PRODUCTS & QUANTITIES</Text>
                {products.map(prod => {
                  const qty = quantities[prod.id] || 0;
                  return (
                    <View key={prod.id} style={styles.productRow}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.productName}>{prod.name}</Text>
                        <Text style={styles.productPrice}>₹{parseFloat(prod.price).toFixed(0)} standard rate</Text>
                      </View>

                      <View style={styles.qtyControl}>
                        <TouchableOpacity
                          style={styles.qtyBtn}
                          onPress={() => updateQuantity(prod.id, -1)}
                          activeOpacity={0.7}
                        >
                          <Ionicons name="remove" size={14} color={qty > 0 ? colors.primary : colors.textMuted} />
                        </TouchableOpacity>
                        <Text style={styles.qtyValue}>{qty}</Text>
                        <TouchableOpacity
                          style={styles.qtyBtn}
                          onPress={() => updateQuantity(prod.id, 1)}
                          activeOpacity={0.7}
                        >
                          <Ionicons name="add" size={14} color={colors.primary} />
                        </TouchableOpacity>
                      </View>
                    </View>
                  );
                })}
              </View>

              {/* 5. Start and End Dates */}
              <View style={styles.section}>
                <Text style={styles.sectionLabel}>DATE RANGE & ACTIVE SWITCH</Text>
                <View style={styles.row}>
                  <View style={{ flex: 1, marginRight: spacing.sm }}>
                    <AppDatePicker
                      label="Start Date"
                      value={startDate}
                      onChange={setStartDate}
                      placeholder="Select Date"
                      maxDate={endDate || undefined}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <AppDatePicker
                      label="End Date (Optional)"
                      value={endDate}
                      onChange={setEndDate}
                      placeholder="Indefinite"
                      minDate={startDate || undefined}
                      clearable={true}
                    />
                  </View>
                </View>

                {/* Active Switch */}
                <TouchableOpacity
                  style={styles.toggleRow}
                  onPress={() => setIsActive(!isActive)}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name={isActive ? 'checkbox' : 'square-outline'}
                    size={20}
                    color={isActive ? colors.primary : colors.textMuted}
                    style={{ marginRight: 8 }}
                  />
                  <Text style={styles.toggleLabel}>Schedule is Active</Text>
                </TouchableOpacity>
              </View>

              {/* 6. Delivery Address */}
              <View style={styles.section}>
                <Text style={styles.sectionLabel}>DELIVERY ADDRESS</Text>
                <View style={styles.textInputBox}>
                  <TextInput
                    style={[styles.textInput, { height: 50 }]}
                    value={address}
                    onChangeText={setAddress}
                    multiline
                    placeholder="Delivery address"
                    placeholderTextColor={colors.textMuted}
                  />
                </View>
              </View>

              {/* Submit Button */}
              <TouchableOpacity
                style={styles.submitBtn}
                onPress={handleSave}
                disabled={submitting}
                activeOpacity={0.8}
              >
                {submitting ? (
                  <ActivityIndicator size="small" color={colors.white} />
                ) : (
                  <Text style={styles.submitBtnText}>
                    {existingSchedule ? 'Update Daily Schedule' : 'Activate Daily Schedule'}
                  </Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: colors.cardBackground,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    maxHeight: '90%',
    paddingBottom: spacing.lg,
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  sheetTitle: {
    ...typography.body,
    fontFamily: 'Inter-Bold',
    color: colors.textPrimary,
    fontWeight: '700',
  },
  sheetSubtitle: {
    ...typography.caption,
    fontFamily: 'Inter-Regular',
    color: colors.textSecondary,
    marginTop: 1,
  },
  loadingBox: {
    padding: spacing.xxl,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: spacing.sm,
    ...typography.caption,
    color: colors.textSecondary,
  },
  scrollContent: {
    padding: spacing.md,
  },
  section: {
    marginBottom: spacing.md,
  },
  sectionLabel: {
    fontSize: 10,
    fontFamily: 'Inter-Bold',
    color: colors.textMuted,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  sectionHint: {
    fontSize: 11,
    fontFamily: 'Inter-Regular',
    color: colors.textSecondary,
    marginBottom: 6,
  },
  partnersList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginTop: 4,
  },
  partnerChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: radius.full,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
  },
  partnerChipSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  partnerChipText: {
    fontSize: 11,
    fontFamily: 'Inter-SemiBold',
    color: colors.textPrimary,
  },
  partnerChipTextSelected: {
    color: colors.white,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  inputSubLabel: {
    fontSize: 11,
    fontFamily: 'Inter-Medium',
    color: colors.textSecondary,
    marginBottom: 4,
  },
  textInputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.sm,
    height: 38,
  },
  textInput: {
    flex: 1,
    fontSize: 13,
    fontFamily: 'Inter-Medium',
    color: colors.textPrimary,
    paddingVertical: 0,
  },
  daysRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  dayCircle: {
    width: 42,
    height: 34,
    borderRadius: radius.md,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dayCircleSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  dayText: {
    fontSize: 11,
    fontFamily: 'Inter-Bold',
    color: colors.textSecondary,
  },
  dayTextSelected: {
    color: colors.white,
  },
  productRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  productName: {
    ...typography.body,
    fontSize: 13,
    fontFamily: 'Inter-SemiBold',
    color: colors.textPrimary,
  },
  productPrice: {
    ...typography.caption,
    fontSize: 11,
    color: colors.textMuted,
  },
  qtyControl: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  qtyBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  qtyValue: {
    fontSize: 13,
    fontFamily: 'Inter-Bold',
    color: colors.textPrimary,
    minWidth: 20,
    textAlign: 'center',
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  toggleLabel: {
    ...typography.body,
    fontFamily: 'Inter-SemiBold',
    color: colors.textPrimary,
  },
  submitBtn: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: spacing.md,
    marginBottom: spacing.xl,
    ...shadows.sm,
  },
  submitBtnText: {
    fontSize: 13,
    fontFamily: 'Inter-Bold',
    color: colors.white,
    fontWeight: '700',
  },
});
