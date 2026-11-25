import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  TextInput,
  Modal,
  FlatList,
  ActivityIndicator,
  Platform,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { Header, DeliveryPartnerDropdown } from '../../components/common';
import { AddCustomerModal, type AddCustomerFormData } from '../../components/customer';
import { useApp } from '../../context/AppContext';
import billingService, { BillingCustomer } from '../../services/billing.service';
import deliveryService, { DeliveryPartnerProfile } from '../../services/delivery.service';
import productService, { BackendProduct } from '../../services/product.service';
import orderService, {
  DailyDeliverySchedule,
  CreateDailySchedulePayload,
} from '../../services/order.service';
import AppToast from '../../utils/toast';
import { colors, typography, radius, spacing, shadows } from '../../theme';

interface CreateEditDailyScheduleScreenProps {
  navigation: any;
  route: any;
}

const WEEKDAYS = [
  { day: 0, label: 'Mon' },
  { day: 1, label: 'Tue' },
  { day: 2, label: 'Wed' },
  { day: 3, label: 'Thu' },
  { day: 4, label: 'Fri' },
  { day: 5, label: 'Sat' },
  { day: 6, label: 'Sun' },
];

export default function CreateEditDailyScheduleScreen({
  navigation,
  route,
}: CreateEditDailyScheduleScreenProps) {
  const existingSchedule: DailyDeliverySchedule | undefined = route?.params?.schedule;
  const initialCustomer = route?.params?.customer;
  const initialCustomerId = route?.params?.customerId || initialCustomer?.id;

  const { products: appProducts, refreshBackendData } = useApp();

  // State
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [loadingInitial, setLoadingInitial] = useState<boolean>(true);

  // Customer Selection State (Searchable dropdown like QuickBilling)
  const [selectedCustomer, setSelectedCustomer] = useState<BillingCustomer | null>(null);
  const [showCustomerModal, setShowCustomerModal] = useState<boolean>(false);
  const [customerSearch, setCustomerSearch] = useState<string>('');
  const [customersList, setCustomersList] = useState<BillingCustomer[]>([]);
  const [loadingCustomers, setLoadingCustomers] = useState<boolean>(false);
  const [showAddCustomerModal, setShowAddCustomerModal] = useState<boolean>(false);

  // Delivery Partner (Searchable dropdown)
  const [selectedPartnerId, setSelectedPartnerId] = useState<number | null>(null);

  // Delivery Timing
  const [deliveryTime, setDeliveryTime] = useState<string>('10:00');
  const [leadTimeMinutes, setLeadTimeMinutes] = useState<string>('30');
  const [selectedDays, setSelectedDays] = useState<number[]>([0, 1, 2, 3, 4, 5, 6]);
  const [startDate, setStartDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState<string>('');

  // Products and Pricing Cart
  const [catalogProducts, setCatalogProducts] = useState<BackendProduct[]>([]);
  // Map of productId (string) -> quantity (string) for direct editable quantity inputs (no +/- buttons)
  const [cartQuantities, setCartQuantities] = useState<{ [productId: string]: string }>({});
  // Map of productId (string) -> custom unit rate (string)
  const [customUnitPrices, setCustomUnitPrices] = useState<{ [productId: string]: string }>({});
  // Ordered product ids
  const [addedOrder, setAddedOrder] = useState<string[]>([]);
  // Search and select product modal
  const [showProductModal, setShowProductModal] = useState<boolean>(false);
  const [productSearch, setProductSearch] = useState<string>('');
  const [discount, setDiscount] = useState<string>('');

  // Schedule Settings
  const [deliveryAddress, setDeliveryAddress] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [isActive, setIsActive] = useState<boolean>(true);

  // Load Initial Data (Products & Customers)
  useEffect(() => {
    let isMounted = true;
    setLoadingInitial(true);

    Promise.all([
      productService.getProducts().catch(() => []),
      billingService.getCustomers('').catch(() => []),
    ])
      .then(([prods, custs]) => {
        if (!isMounted) return;
        setCatalogProducts(prods || []);
        setCustomersList(custs || []);

        // Prepopulate if editing existing schedule
        if (existingSchedule) {
          const matchedCust = (custs || []).find(
            c => c.id === existingSchedule.customer_profile
          );
          if (matchedCust) {
            setSelectedCustomer(matchedCust);
          } else {
            setSelectedCustomer({
              id: existingSchedule.customer_profile,
              name: existingSchedule.customer_name,
              phone: existingSchedule.customer_phone || '',
              address: existingSchedule.delivery_address || '',
            } as any);
          }

          setSelectedPartnerId(existingSchedule.delivery_partner);
          setDeliveryTime(existingSchedule.delivery_time ? existingSchedule.delivery_time.substring(0, 5) : '10:00');
          setLeadTimeMinutes(String(existingSchedule.notification_lead_time_minutes || 30));

          const days = existingSchedule.weekdays
            ? existingSchedule.weekdays.split(',').map(s => parseInt(s.trim(), 10)).filter(n => !isNaN(n))
            : [0, 1, 2, 3, 4, 5, 6];
          setSelectedDays(days);
          setStartDate(existingSchedule.start_date || new Date().toISOString().split('T')[0]);
          setEndDate(existingSchedule.end_date || '');
          setIsActive(existingSchedule.is_active);
          setDeliveryAddress(existingSchedule.delivery_address || '');
          setNotes(existingSchedule.notes || '');

          // Items
          const qMap: { [pId: string]: string } = {};
          const pMap: { [pId: string]: string } = {};
          const orderIds: string[] = [];

          (existingSchedule.items || []).forEach(it => {
            const pidStr = String(it.product);
            qMap[pidStr] = String(it.quantity || 1);
            pMap[pidStr] = String(parseFloat(it.unit_price) || parseFloat(it.product_price) || 0);
            if (!orderIds.includes(pidStr)) {
              orderIds.push(pidStr);
            }
          });

          setCartQuantities(qMap);
          setCustomUnitPrices(pMap);
          setAddedOrder(orderIds);
        } else if (initialCustomerId) {
          // Pre-populate customer when opened from Customer Detail
          const matched = (custs || []).find(c => c.id === Number(initialCustomerId));
          if (matched) {
            setSelectedCustomer(matched);
            setDeliveryAddress(matched.address || '');
          } else if (initialCustomer) {
            setSelectedCustomer(initialCustomer);
            setDeliveryAddress(initialCustomer.address || '');
          }
        }
      })
      .finally(() => {
        if (isMounted) setLoadingInitial(false);
      });

    return () => {
      isMounted = false;
    };
  }, [existingSchedule, initialCustomerId, initialCustomer]);

  // Customer Search loader
  const fetchCustomerSearchResults = useCallback(async (query: string) => {
    setLoadingCustomers(true);
    try {
      const res = await billingService.getCustomers(query);
      setCustomersList(res || []);
    } catch {
      // Handled silently
    } finally {
      setLoadingCustomers(false);
    }
  }, []);

  const handleOpenCustomerModal = () => {
    setShowCustomerModal(true);
    fetchCustomerSearchResults(customerSearch);
  };

  const handleSelectCustomer = (customer: BillingCustomer) => {
    setSelectedCustomer(customer);
    if (customer.address && (!deliveryAddress || deliveryAddress.trim() === '')) {
      setDeliveryAddress(customer.address);
    }
    setShowCustomerModal(false);
  };

  const handleCreateCustomerSubmit = async (data: AddCustomerFormData) => {
    try {
      const created = await billingService.createCustomer({
        name: data.name,
        phone: data.phone,
        address: data.address,
        opening_balance: data.openingBalance,
      });
      setSelectedCustomer(created);
      if (created.address) {
        setDeliveryAddress(created.address);
      }
      setShowAddCustomerModal(false);
      setShowCustomerModal(false);
      AppToast.success('Customer Created', `${created.name} added successfully.`);
    } catch (err: any) {
      AppToast.error('Customer Error', err?.message || 'Failed to create customer.');
    }
  };

  // Weekday toggles
  const toggleWeekday = (day: number) => {
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

  // Line items derived for calculation
  const lineItems = useMemo(() => {
    const items: Array<{
      id: string;
      name: string;
      unit: string;
      qty: number;
      price: number;
      rawQtyStr: string;
      rawPriceStr: string;
      lineTotal: number;
    }> = [];

    addedOrder.forEach(pId => {
      const rawQty = cartQuantities[pId];
      const parsedQty = parseInt(rawQty || '0', 10);
      const effectiveQty = isNaN(parsedQty) || parsedQty < 0 ? 0 : parsedQty;

      const prod =
        catalogProducts.find(p => String(p.id) === String(pId)) ||
        (appProducts as any[]).find(p => String(p.id) === String(pId));

      const catalogPrice = prod ? parseFloat(prod.price) || 0 : 0;
      const customPriceStr = customUnitPrices[pId];
      const effectivePrice =
        customPriceStr !== undefined && customPriceStr !== ''
          ? parseFloat(customPriceStr) || 0
          : catalogPrice;

      items.push({
        id: pId,
        name: prod?.name || `Product #${pId}`,
        unit: prod?.unit || 'unit',
        qty: effectiveQty,
        rawQtyStr: rawQty !== undefined ? rawQty : '1',
        price: effectivePrice,
        rawPriceStr: customPriceStr !== undefined ? customPriceStr : String(catalogPrice),
        lineTotal: effectiveQty * effectivePrice,
      });
    });

    return items;
  }, [addedOrder, cartQuantities, customUnitPrices, catalogProducts, appProducts]);

  // Financial summary calculations (reused QuickBilling pattern)
  const subtotal = useMemo(() => {
    return lineItems.reduce((acc, curr) => acc + curr.lineTotal, 0);
  }, [lineItems]);

  const discountAmount = useMemo(() => {
    const val = parseFloat(discount) || 0;
    return Math.max(0, Math.min(val, subtotal));
  }, [discount, subtotal]);

  const grandTotal = useMemo(() => {
    return Math.max(0, subtotal - discountAmount);
  }, [subtotal, discountAmount]);

  const totalUnitsCount = useMemo(() => {
    return lineItems.reduce((acc, curr) => acc + curr.qty, 0);
  }, [lineItems]);

  // Cart Management
  const handleAddProductToCart = (prod: BackendProduct) => {
    const pIdStr = String(prod.id);
    if (!addedOrder.includes(pIdStr)) {
      setAddedOrder(prev => [...prev, pIdStr]);
      setCartQuantities(prev => ({ ...prev, [pIdStr]: '1' }));
      setCustomUnitPrices(prev => ({ ...prev, [pIdStr]: String(parseFloat(prod.price) || 0) }));
    } else {
      // Increment
      setCartQuantities(prev => {
        const cur = parseInt(prev[pIdStr] || '0', 10) || 0;
        return { ...prev, [pIdStr]: String(cur + 1) };
      });
    }
    setShowProductModal(false);
  };

  const handleRemoveProduct = (pId: string) => {
    setAddedOrder(prev => prev.filter(id => id !== pId));
    setCartQuantities(prev => {
      const copy = { ...prev };
      delete copy[pId];
      return copy;
    });
    setCustomUnitPrices(prev => {
      const copy = { ...prev };
      delete copy[pId];
      return copy;
    });
  };

  const handleQuantityTextChange = (pId: string, text: string) => {
    const clean = text.replace(/[^0-9]/g, '');
    setCartQuantities(prev => ({ ...prev, [pId]: clean }));
  };

  const handlePriceTextChange = (pId: string, text: string) => {
    const clean = text.replace(/[^0-9.]/g, '');
    setCustomUnitPrices(prev => ({ ...prev, [pId]: clean }));
  };

  // Filter products in picker modal
  const filteredCatalog = useMemo(() => {
    if (!productSearch.trim()) return catalogProducts;
    const q = productSearch.toLowerCase();
    return catalogProducts.filter(
      p => p.name.toLowerCase().includes(q) || (p.unit && p.unit.toLowerCase().includes(q))
    );
  }, [catalogProducts, productSearch]);

  // Validation & Save Schedule
  const handleSaveSchedule = async () => {
    if (!selectedCustomer) {
      AppToast.warning('Required Field', 'Please select a Customer for this delivery schedule.');
      return;
    }
    if (!selectedPartnerId) {
      AppToast.warning('Required Field', 'Please assign a fixed Delivery Partner.');
      return;
    }
    if (lineItems.length === 0) {
      AppToast.warning('Required Field', 'Please add at least one product with quantity.');
      return;
    }

    const invalidQtyItem = lineItems.find(it => it.qty <= 0);
    if (invalidQtyItem) {
      AppToast.warning('Invalid Quantity', `Please enter a valid quantity (> 0) for ${invalidQtyItem.name}.`);
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
      customer_id: Number(selectedCustomer.id),
      delivery_partner_id: selectedPartnerId,
      delivery_time: `${deliveryTime}:00`,
      notification_lead_time_minutes: parseInt(leadTimeMinutes || '30', 10) || 30,
      weekdays: selectedDays.join(','),
      delivery_address: deliveryAddress.trim() || selectedCustomer.address || 'Store Route',
      start_date: startDate,
      end_date: endDate.trim() ? endDate.trim() : null,
      is_active: isActive,
      notes: notes.trim(),
      items: lineItems.map(it => ({
        product_id: Number(it.id),
        quantity: it.qty,
        unit_price: it.price.toFixed(2),
      })),
    };

    try {
      setSubmitting(true);
      if (existingSchedule) {
        await orderService.updateDailySchedule(existingSchedule.id, payload);
        AppToast.success('Schedule Updated', 'Customer delivery schedule updated successfully.');
      } else {
        await orderService.createDailySchedule(payload);
        AppToast.success('Schedule Activated', 'Daily delivery schedule created and route assigned.');
      }
      navigation.goBack();
    } catch (err: any) {
      AppToast.error('Save Failed', err?.message || 'Could not save schedule.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      {/* Header matching Customers & Home */}
      <Header
        title={existingSchedule ? 'Edit Daily Schedule' : 'Create Daily Schedule'}
        showBack={true}
      />

      {loadingInitial ? (
        <View style={styles.centerLoadingBox}>
          <ActivityIndicator size="large" color="#8C331A" />
          <Text style={styles.loadingText}>Loading schedule details...</Text>
        </View>
      ) : (
        <KeyboardAwareScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          enableOnAndroid={true}
          enableAutomaticScroll={true}
          extraScrollHeight={Platform.OS === 'android' ? 140 : 100}
          keyboardShouldPersistTaps="handled"
        >
          {/* SECTION 1: CUSTOMER SELECTION (Searchable dropdown like QuickBilling) */}
          <View style={styles.formSectionCard}>
            <Text style={styles.cardHeaderTitle}>1. CUSTOMER PROFILE</Text>
            <View style={styles.customerRow}>
              <View style={styles.customerAvatar}>
                <Ionicons name="person" size={18} color="#8C331A" />
              </View>

              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={styles.customerName}>
                  {selectedCustomer ? selectedCustomer.name : 'Select Customer (Required)'}
                </Text>
                <Text style={styles.customerSub} numberOfLines={1}>
                  {selectedCustomer
                    ? `${selectedCustomer.phone ? selectedCustomer.phone + ' • ' : ''}${selectedCustomer.address || 'Store Route'}`
                    : 'Tap Select to search or add new customer'}
                </Text>
              </View>

              {selectedCustomer ? (
                <View style={styles.customerActionRow}>
                  <TouchableOpacity
                    onPress={handleOpenCustomerModal}
                    style={styles.customerChangeMiniBtn}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.customerChangeMiniText}>Change</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => setSelectedCustomer(null)}
                    style={styles.customerRemoveBtn}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="close-circle-outline" size={18} color="#EF4444" />
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity
                  onPress={handleOpenCustomerModal}
                  style={styles.customerSelectBtn}
                  activeOpacity={0.8}
                >
                  <Ionicons name="person-add-outline" size={13} color="#FFFFFF" style={{ marginRight: 4 }} />
                  <Text style={styles.customerSelectText}>Select</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* SECTION 2: FIXED DELIVERY PARTNER SELECTION (Searchable dropdown) */}
          <View style={styles.formSectionCard}>
            <Text style={styles.cardHeaderTitle}>2. FIXED DELIVERY PARTNER</Text>
            <Text style={styles.sectionSubtitle}>
              The assigned partner receives this order every scheduled day. Never automatically reassigned.
            </Text>
            <DeliveryPartnerDropdown
              selectedPartnerId={selectedPartnerId}
              onSelectPartner={(pId) => setSelectedPartnerId(pId)}
              label="ASSIGN FIXED PARTNER"
              placeholder="Search or Select Delivery Partner"
              optional={false}
              containerStyle={{ marginTop: 8 }}
            />
          </View>

          {/* SECTION 3: DELIVERY TIMING & WEEKDAYS */}
          <View style={styles.formSectionCard}>
            <Text style={styles.cardHeaderTitle}>3. DELIVERY TIMING & SCHEDULE</Text>

            {/* Time & FCM Lead Time */}
            <View style={styles.dualInputRow}>
              <View style={{ flex: 1, marginRight: 8 }}>
                <Text style={styles.inputFieldLabel}>Target Time (24H HH:MM)</Text>
                <View style={styles.textInputBox}>
                  <Ionicons name="time-outline" size={16} color="#8C331A" style={{ marginRight: 6 }} />
                  <TextInput
                    style={styles.textInputField}
                    value={deliveryTime}
                    onChangeText={setDeliveryTime}
                    placeholder="10:00"
                    placeholderTextColor="#9CA3AF"
                    maxLength={5}
                  />
                </View>
              </View>

              <View style={{ flex: 1 }}>
                <Text style={styles.inputFieldLabel}>FCM Alert Lead (Minutes)</Text>
                <View style={styles.textInputBox}>
                  <Ionicons name="notifications-outline" size={16} color="#8C331A" style={{ marginRight: 6 }} />
                  <TextInput
                    style={styles.textInputField}
                    value={leadTimeMinutes}
                    onChangeText={t => setLeadTimeMinutes(t.replace(/[^0-9]/g, ''))}
                    placeholder="30"
                    placeholderTextColor="#9CA3AF"
                    keyboardType="numeric"
                    maxLength={3}
                  />
                </View>
              </View>
            </View>

            {/* Weekday Selection Chips */}
            <Text style={[styles.inputFieldLabel, { marginTop: 12 }]}>Delivery Weekdays</Text>
            <View style={styles.weekdaysGrid}>
              {WEEKDAYS.map(w => {
                const isSelected = selectedDays.includes(w.day);
                return (
                  <TouchableOpacity
                    key={w.day}
                    style={[styles.weekdayPill, isSelected && styles.weekdayPillSelected]}
                    onPress={() => toggleWeekday(w.day)}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.weekdayPillText, isSelected && styles.weekdayPillTextSelected]}>
                      {w.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Start and Optional End Dates */}
            <View style={[styles.dualInputRow, { marginTop: 12 }]}>
              <View style={{ flex: 1, marginRight: 8 }}>
                <Text style={styles.inputFieldLabel}>Start Date (YYYY-MM-DD)</Text>
                <View style={styles.textInputBox}>
                  <Ionicons name="calendar-outline" size={16} color="#6B7280" style={{ marginRight: 6 }} />
                  <TextInput
                    style={styles.textInputField}
                    value={startDate}
                    onChangeText={setStartDate}
                    placeholder="YYYY-MM-DD"
                    placeholderTextColor="#9CA3AF"
                  />
                </View>
              </View>

              <View style={{ flex: 1 }}>
                <Text style={styles.inputFieldLabel}>End Date (Optional)</Text>
                <View style={styles.textInputBox}>
                  <Ionicons name="calendar-outline" size={16} color="#6B7280" style={{ marginRight: 6 }} />
                  <TextInput
                    style={styles.textInputField}
                    value={endDate}
                    onChangeText={setEndDate}
                    placeholder="YYYY-MM-DD (Ongoing)"
                    placeholderTextColor="#9CA3AF"
                  />
                </View>
              </View>
            </View>
          </View>

          {/* SECTION 4: PRODUCT SELECTION AND PRICING (Exact QuickBilling Pattern with Direct Editable Qty Box, No +/- Buttons) */}
          <View style={styles.formSectionCard}>
            <View style={styles.sectionHeaderBetween}>
              <Text style={styles.cardHeaderTitle}>4. PRODUCTS & COMMERCIAL PRICING</Text>
              <TouchableOpacity
                style={styles.addProductBtn}
                onPress={() => {
                  setProductSearch('');
                  setShowProductModal(true);
                }}
                activeOpacity={0.8}
              >
                <Ionicons name="add" size={15} color="#FFFFFF" style={{ marginRight: 3 }} />
                <Text style={styles.addProductBtnText}>Add Product</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.sectionSubtitle}>
              Quantities and rates are directly editable. Prices lock into generated daily orders.
            </Text>

            {/* Line items table / card list */}
            {lineItems.length === 0 ? (
              <View style={styles.emptyCartBox}>
                <Ionicons name="cafe-outline" size={32} color="#D1D5DB" style={{ marginBottom: 6 }} />
                <Text style={styles.emptyCartTitle}>No Products Configured</Text>
                <Text style={styles.emptyCartSub}>Tap "Add Product" to select items for this daily delivery.</Text>
              </View>
            ) : (
              <View style={styles.cartItemsList}>
                {lineItems.map(item => (
                  <View key={item.id} style={styles.cartItemRow}>
                    <View style={{ flex: 1, marginRight: 8 }}>
                      <Text style={styles.cartItemTitle} numberOfLines={1}>{item.name}</Text>
                      <Text style={styles.cartItemUnit}>Unit: {item.unit}</Text>
                    </View>

                    {/* Rate Input Box */}
                    <View style={styles.rateCol}>
                      <Text style={styles.miniColLabel}>Rate (₹)</Text>
                      <View style={styles.miniInputBox}>
                        <Text style={styles.currencyPrefix}>₹</Text>
                        <TextInput
                          style={styles.miniTextInput}
                          value={item.rawPriceStr}
                          onChangeText={t => handlePriceTextChange(item.id, t)}
                          keyboardType="numeric"
                          selectTextOnFocus={true}
                        />
                      </View>
                    </View>

                    {/* Quantity Input Box (Strictly No +/- buttons) */}
                    <View style={styles.qtyCol}>
                      <Text style={styles.miniColLabel}>Quantity</Text>
                      <View style={styles.miniInputBox}>
                        <TextInput
                          style={styles.miniTextInput}
                          value={item.rawQtyStr}
                          onChangeText={t => handleQuantityTextChange(item.id, t)}
                          keyboardType="numeric"
                          selectTextOnFocus={true}
                        />
                      </View>
                    </View>

                    {/* Total & Remove */}
                    <View style={styles.totalCol}>
                      <Text style={styles.miniColLabel}>Total</Text>
                      <Text style={styles.lineTotalText}>₹{item.lineTotal.toFixed(2)}</Text>
                    </View>

                    <TouchableOpacity
                      onPress={() => handleRemoveProduct(item.id)}
                      style={styles.removeCartItemBtn}
                      activeOpacity={0.7}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <Ionicons name="trash-outline" size={16} color="#EF4444" />
                    </TouchableOpacity>
                  </View>
                ))}

                {/* Financial Breakdown (Subtotal, Discount, Grand Total) */}
                <View style={styles.financialSummaryBox}>
                  <View style={styles.summaryLine}>
                    <Text style={styles.summaryLineLabel}>Product Subtotal</Text>
                    <Text style={styles.summaryLineValue}>₹{subtotal.toFixed(2)}</Text>
                  </View>

                  <View style={styles.summaryLine}>
                    <View>
                      <Text style={styles.summaryLineLabel}>Schedule Discount (₹)</Text>
                      <Text style={styles.summaryLineSub}>Applied per daily delivery</Text>
                    </View>
                    <View style={styles.discountInputWrap}>
                      <Text style={styles.currencyPrefix}>₹</Text>
                      <TextInput
                        style={styles.discountInput}
                        value={discount}
                        onChangeText={t => setDiscount(t.replace(/[^0-9.]/g, ''))}
                        placeholder="0"
                        placeholderTextColor="#9CA3AF"
                        keyboardType="numeric"
                        selectTextOnFocus={true}
                      />
                    </View>
                  </View>

                  <View style={[styles.summaryLine, styles.grandTotalBorderLine]}>
                    <View>
                      <Text style={styles.grandTotalLabel}>Daily Grand Total</Text>
                      <Text style={styles.grandTotalSub}>
                        {totalUnitsCount} unit{totalUnitsCount === 1 ? '' : 's'} scheduled
                      </Text>
                    </View>
                    <Text style={styles.grandTotalAmount}>₹{grandTotal.toFixed(2)}</Text>
                  </View>
                </View>
              </View>
            )}
          </View>

          {/* SECTION 5: SCHEDULE SETTINGS & NOTES */}
          <View style={styles.formSectionCard}>
            <Text style={styles.cardHeaderTitle}>5. SCHEDULE SETTINGS</Text>

            <Text style={styles.inputFieldLabel}>Delivery Address Snapshot</Text>
            <View style={[styles.textInputBox, { height: 44, marginBottom: 10 }]}>
              <Ionicons name="location-outline" size={16} color="#8C331A" style={{ marginRight: 6 }} />
              <TextInput
                style={styles.textInputField}
                value={deliveryAddress}
                onChangeText={setDeliveryAddress}
                placeholder="Specific desk, cabin or delivery point"
                placeholderTextColor="#9CA3AF"
              />
            </View>

            <Text style={styles.inputFieldLabel}>Operational Notes (Optional)</Text>
            <View style={[styles.textInputBox, { height: 44, marginBottom: 12 }]}>
              <Ionicons name="document-text-outline" size={16} color="#6B7280" style={{ marginRight: 6 }} />
              <TextInput
                style={styles.textInputField}
                value={notes}
                onChangeText={setNotes}
                placeholder="e.g. Leave flask at reception, call before entry"
                placeholderTextColor="#9CA3AF"
              />
            </View>

            {/* Active / Paused Switch */}
            <TouchableOpacity
              style={styles.activeToggleRow}
              onPress={() => setIsActive(!isActive)}
              activeOpacity={0.8}
            >
              <Ionicons
                name={isActive ? 'checkbox' : 'square-outline'}
                size={20}
                color={isActive ? '#8C331A' : '#9CA3AF'}
                style={{ marginRight: 8 }}
              />
              <View style={{ flex: 1 }}>
                <Text style={styles.activeToggleTitle}>
                  {isActive ? 'Schedule Active' : 'Schedule Paused'}
                </Text>
                <Text style={styles.activeToggleSub}>
                  {isActive
                    ? 'Orders will generate automatically on scheduled days.'
                    : 'Paused: No orders will generate until resumed.'}
                </Text>
              </View>
            </TouchableOpacity>
          </View>

          {/* Save Schedule Button */}
          <TouchableOpacity
            style={[styles.saveScheduleBtn, submitting && { opacity: 0.7 }]}
            onPress={handleSaveSchedule}
            disabled={submitting}
            activeOpacity={0.85}
          >
            {submitting ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <Ionicons name="checkmark-circle" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
                <Text style={styles.saveScheduleBtnText}>
                  {existingSchedule ? 'Update Daily Schedule' : 'Save & Activate Schedule'}
                </Text>
              </>
            )}
          </TouchableOpacity>
        </KeyboardAwareScrollView>
      )}

      {/* Customer Selection Modal (Searchable dropdown like QuickBilling) */}
      <Modal
        visible={showCustomerModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowCustomerModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheetBox}>
            <View style={styles.modalSheetHeader}>
              <View>
                <Text style={styles.modalSheetTitle}>Select Customer</Text>
                <Text style={styles.modalSheetSub}>Choose existing customer or add new account</Text>
              </View>
              <TouchableOpacity onPress={() => setShowCustomerModal(false)}>
                <Ionicons name="close" size={22} color="#4B5563" />
              </TouchableOpacity>
            </View>

            {/* Search Input */}
            <View style={styles.modalSearchWrap}>
              <Ionicons name="search-outline" size={17} color="#888" style={{ marginRight: 8 }} />
              <TextInput
                style={styles.modalSearchInput}
                placeholder="Search by name, phone or company..."
                placeholderTextColor="#9CA3AF"
                value={customerSearch}
                onChangeText={t => {
                  setCustomerSearch(t);
                  fetchCustomerSearchResults(t);
                }}
              />
              {customerSearch.length > 0 && (
                <TouchableOpacity onPress={() => { setCustomerSearch(''); fetchCustomerSearchResults(''); }}>
                  <Ionicons name="close-circle" size={16} color="#9CA3AF" />
                </TouchableOpacity>
              )}
            </View>

            {/* Add New Customer Action */}
            <TouchableOpacity
              style={styles.modalAddCustomerBtn}
              onPress={() => setShowAddCustomerModal(true)}
              activeOpacity={0.8}
            >
              <Ionicons name="person-add" size={16} color="#8C331A" style={{ marginRight: 6 }} />
              <Text style={styles.modalAddCustomerBtnText}>+ Create New Customer Profile</Text>
            </TouchableOpacity>

            {/* Customer List */}
            {loadingCustomers ? (
              <ActivityIndicator size="large" color="#8C331A" style={{ marginVertical: 30 }} />
            ) : (
              <FlatList
                data={customersList}
                keyExtractor={item => String(item.id)}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 20 }}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.customerOptionItem}
                    onPress={() => handleSelectCustomer(item)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.customerOptionAvatar}>
                      <Text style={styles.customerOptionInitials}>
                        {(item.name || 'C').slice(0, 2).toUpperCase()}
                      </Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.customerOptionName}>{item.name}</Text>
                      <Text style={styles.customerOptionSub} numberOfLines={1}>
                        {item.phone ? item.phone + ' • ' : ''}{item.address || 'Local Route'}
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={16} color="#D1D5DB" />
                  </TouchableOpacity>
                )}
                ListEmptyComponent={
                  <View style={{ paddingVertical: 30, alignItems: 'center' }}>
                    <Text style={{ color: '#6B7280', fontSize: 13 }}>No customers found matching search.</Text>
                  </View>
                }
              />
            )}
          </View>
        </View>
      </Modal>

      {/* Add Customer Modal */}
      <AddCustomerModal
        visible={showAddCustomerModal}
        onClose={() => setShowAddCustomerModal(false)}
        onSubmit={handleCreateCustomerSubmit}
      />

      {/* Product Selection Modal */}
      <Modal
        visible={showProductModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowProductModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheetBox}>
            <View style={styles.modalSheetHeader}>
              <View>
                <Text style={styles.modalSheetTitle}>Select Product</Text>
                <Text style={styles.modalSheetSub}>Choose from shop catalog for this schedule</Text>
              </View>
              <TouchableOpacity onPress={() => setShowProductModal(false)}>
                <Ionicons name="close" size={22} color="#4B5563" />
              </TouchableOpacity>
            </View>

            {/* Search Input */}
            <View style={styles.modalSearchWrap}>
              <Ionicons name="search-outline" size={17} color="#888" style={{ marginRight: 8 }} />
              <TextInput
                style={styles.modalSearchInput}
                placeholder="Search products by name or unit..."
                placeholderTextColor="#9CA3AF"
                value={productSearch}
                onChangeText={setProductSearch}
              />
              {productSearch.length > 0 && (
                <TouchableOpacity onPress={() => setProductSearch('')}>
                  <Ionicons name="close-circle" size={16} color="#9CA3AF" />
                </TouchableOpacity>
              )}
            </View>

            {/* Products List */}
            <FlatList
              data={filteredCatalog}
              keyExtractor={item => String(item.id)}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: 20 }}
              renderItem={({ item }) => {
                const inCart = addedOrder.includes(String(item.id));
                return (
                  <TouchableOpacity
                    style={[styles.productOptionRow, inCart && styles.productOptionRowSelected]}
                    onPress={() => handleAddProductToCart(item)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.productIconBox}>
                      <Ionicons name="cafe" size={18} color="#8C331A" />
                    </View>
                    <View style={{ flex: 1, marginLeft: 10 }}>
                      <Text style={styles.productOptionName}>{item.name}</Text>
                      <Text style={styles.productOptionSub}>
                        Standard: ₹{parseFloat(item.price).toFixed(2)} {item.unit ? `• per ${item.unit}` : ''}
                      </Text>
                    </View>
                    {inCart ? (
                      <View style={styles.inCartBadge}>
                        <Text style={styles.inCartBadgeText}>Selected</Text>
                      </View>
                    ) : (
                      <Ionicons name="add-circle" size={24} color="#8C331A" />
                    )}
                  </TouchableOpacity>
                );
              }}
              ListEmptyComponent={
                <View style={{ paddingVertical: 30, alignItems: 'center' }}>
                  <Text style={{ color: '#6B7280', fontSize: 13 }}>No products found.</Text>
                </View>
              }
            />
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
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 40,
  },
  centerLoadingBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 30,
  },
  loadingText: {
    fontSize: 13,
    fontFamily: 'Inter-Medium',
    color: '#6B7280',
    marginTop: 10,
  },
  formSectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#EFEAE4',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  cardHeaderTitle: {
    fontSize: 11,
    fontFamily: 'Inter-Bold',
    fontWeight: '800',
    color: '#8C331A',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 11,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    lineHeight: 15,
    marginBottom: 8,
  },
  sectionHeaderBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  customerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
  },
  customerAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#FDEBE4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  customerName: {
    fontSize: 15,
    fontFamily: 'Inter-Bold',
    fontWeight: '800',
    color: '#1F2937',
  },
  customerSub: {
    fontSize: 11,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    marginTop: 2,
  },
  customerActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  customerChangeMiniBtn: {
    backgroundColor: '#F3EFEA',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  customerChangeMiniText: {
    fontSize: 11,
    fontFamily: 'Inter-Bold',
    fontWeight: '700',
    color: '#8C331A',
  },
  customerRemoveBtn: {
    padding: 4,
  },
  customerSelectBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#8C331A',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
  },
  customerSelectText: {
    fontSize: 12,
    fontFamily: 'Inter-Bold',
    fontWeight: '700',
    color: '#FFFFFF',
  },
  dualInputRow: {
    flexDirection: 'row',
    marginTop: 8,
  },
  inputFieldLabel: {
    fontSize: 10,
    fontFamily: 'Inter-Bold',
    fontWeight: '800',
    color: '#6B7280',
    marginBottom: 4,
  },
  textInputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FAF8F5',
    borderWidth: 1,
    borderColor: '#EFEAE4',
    borderRadius: 8,
    paddingHorizontal: 10,
    height: 42,
  },
  textInputField: {
    flex: 1,
    fontSize: 13,
    fontFamily: 'Inter-Medium',
    color: '#1F2937',
    padding: 0,
  },
  weekdaysGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  weekdayPill: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    marginHorizontal: 2,
    borderRadius: 8,
    backgroundColor: '#FAF8F5',
    borderWidth: 1,
    borderColor: '#EFEAE4',
  },
  weekdayPillSelected: {
    backgroundColor: '#8C331A',
    borderColor: '#8C331A',
  },
  weekdayPillText: {
    fontSize: 11,
    fontFamily: 'Inter-Bold',
    fontWeight: '700',
    color: '#6B7280',
  },
  weekdayPillTextSelected: {
    color: '#FFFFFF',
  },
  addProductBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#8C331A',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 8,
  },
  addProductBtnText: {
    fontSize: 11,
    fontFamily: 'Inter-Bold',
    fontWeight: '700',
    color: '#FFFFFF',
  },
  emptyCartBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 24,
    backgroundColor: '#FAF8F5',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#F3EFEA',
    borderStyle: 'dashed',
    marginTop: 8,
  },
  emptyCartTitle: {
    fontSize: 13,
    fontFamily: 'Inter-Bold',
    fontWeight: '700',
    color: '#4B5563',
  },
  emptyCartSub: {
    fontSize: 11,
    fontFamily: 'Inter-Regular',
    color: '#9CA3AF',
    marginTop: 2,
  },
  cartItemsList: {
    marginTop: 8,
  },
  cartItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FAF8F5',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#EFEAE4',
    marginBottom: 8,
  },
  cartItemTitle: {
    fontSize: 13,
    fontFamily: 'Inter-Bold',
    fontWeight: '700',
    color: '#1F2937',
  },
  cartItemUnit: {
    fontSize: 10,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    marginTop: 2,
  },
  rateCol: {
    width: 65,
    marginRight: 6,
  },
  qtyCol: {
    width: 55,
    marginRight: 6,
  },
  totalCol: {
    width: 60,
    alignItems: 'flex-end',
    marginRight: 8,
  },
  miniColLabel: {
    fontSize: 9,
    fontFamily: 'Inter-Bold',
    fontWeight: '800',
    color: '#9CA3AF',
    marginBottom: 2,
  },
  miniInputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 6,
    paddingHorizontal: 4,
    height: 32,
  },
  currencyPrefix: {
    fontSize: 11,
    fontFamily: 'Inter-Bold',
    color: '#8C331A',
    marginRight: 2,
  },
  miniTextInput: {
    flex: 1,
    fontSize: 12,
    fontFamily: 'Inter-Bold',
    color: '#1F2937',
    textAlign: 'center',
    padding: 0,
  },
  lineTotalText: {
    fontSize: 12,
    fontFamily: 'Inter-Bold',
    fontWeight: '800',
    color: '#8C331A',
    marginTop: 6,
  },
  removeCartItemBtn: {
    padding: 4,
  },
  financialSummaryBox: {
    backgroundColor: '#FCFAF8',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#F3EFEA',
    padding: 12,
    marginTop: 6,
  },
  summaryLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 4,
  },
  summaryLineLabel: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    color: '#4B5563',
  },
  summaryLineValue: {
    fontSize: 13,
    fontFamily: 'Inter-Bold',
    fontWeight: '700',
    color: '#1F2937',
  },
  summaryLineSub: {
    fontSize: 10,
    fontFamily: 'Inter-Regular',
    color: '#9CA3AF',
  },
  discountInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 6,
    paddingHorizontal: 6,
    height: 32,
    width: 80,
  },
  discountInput: {
    flex: 1,
    fontSize: 12,
    fontFamily: 'Inter-Bold',
    color: '#1F2937',
    padding: 0,
    textAlign: 'right',
  },
  grandTotalBorderLine: {
    borderTopWidth: 1,
    borderTopColor: '#EFEAE4',
    paddingTop: 8,
    marginTop: 6,
  },
  grandTotalLabel: {
    fontSize: 14,
    fontFamily: 'Inter-Bold',
    fontWeight: '800',
    color: '#1F2937',
  },
  grandTotalSub: {
    fontSize: 10,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    marginTop: 1,
  },
  grandTotalAmount: {
    fontSize: 18,
    fontFamily: 'Inter-Bold',
    fontWeight: '800',
    color: '#8C331A',
  },
  activeToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FAF8F5',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#EFEAE4',
  },
  activeToggleTitle: {
    fontSize: 13,
    fontFamily: 'Inter-Bold',
    fontWeight: '700',
    color: '#1F2937',
  },
  activeToggleSub: {
    fontSize: 10,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    marginTop: 2,
  },
  saveScheduleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#8C331A',
    borderRadius: 12,
    paddingVertical: 14,
    marginTop: 4,
    marginBottom: 20,
    shadowColor: '#8C331A',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 5,
    elevation: 3,
  },
  saveScheduleBtnText: {
    fontSize: 14,
    fontFamily: 'Inter-Bold',
    fontWeight: '800',
    color: '#FFFFFF',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalSheetBox: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    padding: 16,
    maxHeight: '82%',
  },
  modalSheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  modalSheetTitle: {
    fontSize: 17,
    fontFamily: 'Inter-Bold',
    fontWeight: '800',
    color: '#1F2937',
  },
  modalSheetSub: {
    fontSize: 11,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    marginTop: 2,
  },
  modalSearchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FAF8F5',
    borderWidth: 1,
    borderColor: '#EFEAE4',
    borderRadius: 10,
    paddingHorizontal: 10,
    height: 42,
    marginBottom: 10,
  },
  modalSearchInput: {
    flex: 1,
    fontSize: 13,
    fontFamily: 'Inter-Medium',
    color: '#1F2937',
    padding: 0,
  },
  modalAddCustomerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FDEBE4',
    borderWidth: 1,
    borderColor: '#F5C6B8',
    borderRadius: 8,
    paddingVertical: 9,
    marginBottom: 10,
  },
  modalAddCustomerBtnText: {
    fontSize: 12,
    fontFamily: 'Inter-Bold',
    fontWeight: '700',
    color: '#8C331A',
  },
  customerOptionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F3EFEA',
  },
  customerOptionAvatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#F3EFEA',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  customerOptionInitials: {
    fontSize: 12,
    fontFamily: 'Inter-Bold',
    fontWeight: '700',
    color: '#8C331A',
  },
  customerOptionName: {
    fontSize: 14,
    fontFamily: 'Inter-Bold',
    fontWeight: '700',
    color: '#1F2937',
  },
  customerOptionSub: {
    fontSize: 11,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    marginTop: 2,
  },
  productOptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F3EFEA',
  },
  productOptionRowSelected: {
    backgroundColor: '#FDEBE4',
  },
  productIconBox: {
    width: 34,
    height: 34,
    borderRadius: 8,
    backgroundColor: '#FDEBE4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  productOptionName: {
    fontSize: 13,
    fontFamily: 'Inter-Bold',
    fontWeight: '700',
    color: '#1F2937',
  },
  productOptionSub: {
    fontSize: 11,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    marginTop: 2,
  },
  inCartBadge: {
    backgroundColor: '#8C331A',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  inCartBadgeText: {
    fontSize: 10,
    fontFamily: 'Inter-Bold',
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
