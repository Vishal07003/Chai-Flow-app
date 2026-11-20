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
  Modal,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { CustomDialog, ConfirmDialog, DeliveryPartnerDropdown, TimePickerModal } from '../../components/common';
import AddCustomerModal from '../../components/customer/AddCustomerModal';
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
  const [autoApprove, setAutoApprove] = useState<boolean>(existingTemplate?.auto_approve ?? false);
  const [notes, setNotes] = useState<string>(existingTemplate?.notes || '');

  // Notification Schedule (Phase 2A)
  const [useGlobalNotif, setUseGlobalNotif] = useState<boolean>(
    existingTemplate?.use_global_notification_settings ?? true
  );
  const [customGenTime, setCustomGenTime] = useState<string>(
    existingTemplate?.custom_order_generation_time || '06:00:00'
  );
  const [customOwnerTime, setCustomOwnerTime] = useState<string>(
    existingTemplate?.custom_owner_notification_time || '06:05:00'
  );
  const [customPartnerTime, setCustomPartnerTime] = useState<string>(
    existingTemplate?.custom_partner_notification_time || '06:10:00'
  );
  const [ownerNotifEnabled, setOwnerNotifEnabled] = useState<boolean>(
    existingTemplate?.owner_notification_enabled ?? true
  );
  const [partnerNotifEnabled, setPartnerNotifEnabled] = useState<boolean>(
    existingTemplate?.partner_notification_enabled ?? true
  );
  const [timePickerTarget, setTimePickerTarget] = useState<'gen' | 'owner' | 'partner' | null>(null);

  // itemQuantities: productId -> string quantity (preserves editing when temporarily empty)
  const [itemQuantities, setItemQuantities] = useState<{ [productId: number]: string }>({});
  // itemAgreedPrices: productId -> string custom unit price snapshot
  const [itemAgreedPrices, setItemAgreedPrices] = useState<{ [productId: number]: string }>({});

  const [submitting, setSubmitting] = useState<boolean>(false);

  // Customer Selector Modal State
  const [customerModalVisible, setCustomerModalVisible] = useState<boolean>(false);
  const [customerSearch, setCustomerSearch] = useState<string>('');
  const [showAddCustomerModal, setShowAddCustomerModal] = useState<boolean>(false);

  // Add Product Modal State
  const [addModalVisible, setAddModalVisible] = useState<boolean>(false);
  const [modalSearch, setModalSearch] = useState<string>('');

  // Custom Confirmation Dialog State
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

  const loadData = useCallback(async () => {
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
        unit: p.unit || 'Pc',
        description: p.description,
        is_available: true,
        category: p.category || 1,
        created_at: p.created_at || new Date().toISOString(),
      }));
      setProducts(mappedProds);

      if (existingTemplate && existingTemplate.items) {
        const qMap: { [id: number]: string } = {};
        const pMap: { [id: number]: string } = {};
        existingTemplate.items.forEach(it => {
          qMap[it.product] = String(it.quantity);
          const rawPrice = it.unit_price || it.product_price;
          pMap[it.product] = rawPrice ? String(rawPrice).replace(/[^0-9.]/g, '') : '0';
        });
        setItemQuantities(qMap);
        setItemAgreedPrices(pMap);
      } else if (route?.params?.prefilledItems && Array.isArray(route.params.prefilledItems)) {
        const qMap: { [id: number]: string } = {};
        const pMap: { [id: number]: string } = {};
        route.params.prefilledItems.forEach((it: any) => {
          const pid = Number(it.product_id);
          qMap[pid] = String(it.quantity || 1);
          const foundProd = mappedProds.find(p => p.id === pid);
          pMap[pid] = it.unit_price ? String(it.unit_price) : (foundProd?.price || '0');
        });
        setItemQuantities(qMap);
        setItemAgreedPrices(pMap);
      }
    } catch (err) {
      console.log('Error loading recurring template dependencies:', err);
    } finally {
      setLoadingData(false);
    }
  }, [existingTemplate, route?.params?.prefilledItems]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSelectCustomer = (c: BillingCustomer) => {
    setSelectedCustomerId(c.id);
    if (!deliveryAddress) {
      setDeliveryAddress(c.address || '');
    }
    setCustomerModalVisible(false);
  };

  const handleCreateCustomerSubmit = async (formData: any) => {
    try {
      const created = await billingService.createCustomer({
        name: formData.name,
        phone: formData.phone,
        address: formData.address,
        opening_balance: formData.openingBalance || 0,
      });
      setShowAddCustomerModal(false);
      setCustomerModalVisible(false);
      const updatedList = await billingService.getCustomers();
      setCustomers(updatedList || []);
      setSelectedCustomerId(created.id);
      if (created.address) {
        setDeliveryAddress(created.address);
      }
      Alert.alert('Customer Added', `Customer ${created.name} registered and selected.`);
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to create customer.');
    }
  };

  const toggleWeekday = (dayKey: string) => {
    setSelectedWeekdays(prev =>
      prev.includes(dayKey) ? prev.filter(d => d !== dayKey) : [...prev, dayKey].sort()
    );
  };

  // Direct numeric quantity change handler
  const handleQuantityTextChange = (productId: number, text: string) => {
    const cleaned = text.replace(/[^0-9]/g, '');
    setItemQuantities(prev => ({
      ...prev,
      [productId]: cleaned,
    }));
  };

  // Direct agreed price change handler
  const handlePriceTextChange = (productId: number, text: string) => {
    const cleaned = text.replace(/[^0-9.]/g, '');
    setItemAgreedPrices(prev => ({
      ...prev,
      [productId]: cleaned,
    }));
  };

  // Individual product remove action with confirmation
  const handleRemoveProduct = (productId: number) => {
    const prod = products.find(p => p.id === productId);
    const prodName = prod ? prod.name : `Product #${productId}`;

    setDialogConfig({
      visible: true,
      title: 'Remove Product',
      message: `Remove "${prodName}" from this recurring order template? This will not affect previous orders or invoices.`,
      type: 'warning',
      buttons: [
        { text: 'Cancel', style: 'cancel', onPress: closeDialog },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => {
            closeDialog();
            setItemQuantities(prev => {
              const copy = { ...prev };
              delete copy[productId];
              return copy;
            });
            setItemAgreedPrices(prev => {
              const copy = { ...prev };
              delete copy[productId];
              return copy;
            });
          },
        },
      ],
    });
  };

  // Add product from modal (prevents duplicate rows, defaults to catalog price)
  const handleAddProductFromModal = (p: BackendProduct) => {
    setItemQuantities(prev => {
      const existingQty = prev[p.id];
      if (existingQty !== undefined) {
        const num = parseInt(existingQty, 10) || 0;
        return { ...prev, [p.id]: String(num + 1) };
      }
      return { ...prev, [p.id]: '1' };
    });

    setItemAgreedPrices(prev => {
      if (prev[p.id] !== undefined) return prev;
      return { ...prev, [p.id]: p.price || '0' };
    });

    setAddModalVisible(false);
    setModalSearch('');
  };

  // Calculations
  const selectedProductIds = useMemo(() => {
    return Object.keys(itemQuantities).map(Number);
  }, [itemQuantities]);

  const totalDistinctProducts = selectedProductIds.length;

  const totalQuantities = useMemo(() => {
    return Object.values(itemQuantities).reduce((sum, str) => {
      const num = parseInt(str, 10) || 0;
      return sum + num;
    }, 0);
  }, [itemQuantities]);

  const estimatedTotal = useMemo(() => {
    return selectedProductIds.reduce((sum, pid) => {
      const priceStr = itemAgreedPrices[pid];
      const prod = products.find(p => p.id === pid);
      const rate = priceStr !== undefined && priceStr !== '' ? parseFloat(priceStr) || 0 : (prod ? parseFloat(prod.price) || 0 : 0);
      const num = parseInt(itemQuantities[pid], 10) || 0;
      return sum + (rate * num);
    }, 0);
  }, [selectedProductIds, itemQuantities, itemAgreedPrices, products]);

  // Filtered customer list for modal
  const filteredCustomers = useMemo(() => {
    if (!customerSearch.trim()) return customers;
    const q = customerSearch.toLowerCase().trim();
    return customers.filter(c => c.name.toLowerCase().includes(q) || (c.phone && c.phone.includes(q)));
  }, [customers, customerSearch]);

  // Modal filtered products
  const modalFilteredProducts = useMemo(() => {
    if (!modalSearch.trim()) return products;
    const q = modalSearch.toLowerCase().trim();
    return products.filter(p => p.name.toLowerCase().includes(q));
  }, [products, modalSearch]);

  const handleSave = async () => {
    if (!selectedCustomerId) {
      Alert.alert('Required Field', 'Please select a customer for this recurring order.');
      return;
    }
    if (!deliveryAddress.trim()) {
      Alert.alert('Required Field', 'Please enter a delivery address.');
      return;
    }

    if (selectedProductIds.length === 0) {
      Alert.alert('Required Field', 'Please add at least one product to the recurring order template.');
      return;
    }

    const invalidItems = selectedProductIds.filter(pid => {
      const val = parseInt(itemQuantities[pid], 10);
      return isNaN(val) || val <= 0;
    });

    if (invalidItems.length > 0) {
      const invalidNames = invalidItems.map(pid => {
        const prod = products.find(p => p.id === pid);
        return prod ? prod.name : `Product #${pid}`;
      }).join(', ');
      Alert.alert('Invalid Quantity', `Please enter a valid quantity (> 0) for: ${invalidNames}`);
      return;
    }

    if (frequency === 'weekdays' && selectedWeekdays.length === 0) {
      Alert.alert('Required Field', 'Please select at least one active weekday.');
      return;
    }

    // Phase 2A: Timing validation if custom schedule selected
    if (!useGlobalNotif) {
      if (customOwnerTime < customGenTime) {
        Alert.alert('Invalid Timing', 'Owner notification time cannot be earlier than order generation time.');
        return;
      }
      if (customPartnerTime < customGenTime) {
        Alert.alert('Invalid Timing', 'Delivery partner notification time cannot be earlier than order generation time.');
        return;
      }
    }

    const items = selectedProductIds.map(pid => {
      const agreedRate = parseFloat(itemAgreedPrices[pid]);
      const prod = products.find(p => p.id === pid);
      const fallbackRate = prod ? parseFloat(prod.price) || 0 : 0;
      return {
        product_id: pid,
        quantity: parseInt(itemQuantities[pid], 10),
        unit_price: !isNaN(agreedRate) && agreedRate >= 0 ? agreedRate : fallbackRate,
      };
    });

    try {
      setSubmitting(true);
      const payload: any = {
        customer_id: selectedCustomerId,
        delivery_partner_id: selectedPartnerId,
        delivery_address: deliveryAddress.trim(),
        frequency,
        weekdays: frequency === 'weekdays' ? selectedWeekdays.join(',') : '',
        auto_approve: autoApprove,
        notes: notes.trim(),
        use_global_notification_settings: useGlobalNotif,
        owner_notification_enabled: ownerNotifEnabled,
        partner_notification_enabled: partnerNotifEnabled,
        items,
      };

      if (!useGlobalNotif) {
        payload.custom_order_generation_time = customGenTime;
        payload.custom_owner_notification_time = customOwnerTime;
        payload.custom_partner_notification_time = customPartnerTime;
      } else {
        payload.custom_order_generation_time = null;
        payload.custom_owner_notification_time = null;
        payload.custom_partner_notification_time = null;
      }

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
        <View style={styles.formHeader}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerBackBtn}>
            <Ionicons name="arrow-back" size={22} color="#111827" />
          </TouchableOpacity>
          <Text style={styles.formHeaderTitle}>{isEditing ? 'Edit Recurring Order' : 'Add Recurring Order'}</Text>
        </View>
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color="#8C331A" />
        </View>
      </SafeAreaView>
    );
  }

  const formatDisplayTime = (timeStr: string) => {
    if (!timeStr) return '--:--';
    const [hStr, mStr] = timeStr.split(':');
    let h = parseInt(hStr || '0', 10);
    const m = mStr || '00';
    const ampm = h >= 12 ? 'PM' : 'AM';
    h = h % 12 === 0 ? 12 : h % 12;
    return `${String(h).padStart(2, '0')}:${m} ${ampm}`;
  };

  const selectedCustObj = customers.find(c => c.id === selectedCustomerId) || initialCustomer;

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      {/* Form-Specific Header: Clean back arrow + title, no notifications, profile, or hamburger menu */}
      <View style={styles.formHeader}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.headerBackBtn}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="arrow-back" size={22} color="#111827" />
        </TouchableOpacity>
        <View style={styles.formHeaderTitleContainer}>
          <Text style={styles.formHeaderTitle}>
            {isEditing ? 'Edit Recurring Order' : 'Add Recurring Order'}
          </Text>
          <Text style={styles.formHeaderSubtitle}>
            Configure automated regular chai & snacks delivery
          </Text>
        </View>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* SECTION 1: CUSTOMER SELECTION */}
          <Text style={styles.sectionLabel}>CUSTOMER *</Text>
          {selectedCustObj ? (
            <View style={styles.selectedCustomerCard}>
              <View style={styles.custAvatar}>
                <Ionicons name="person" size={16} color="#8C331A" />
              </View>
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={styles.custName}>{selectedCustObj.name}</Text>
                <Text style={styles.custPhone}>{selectedCustObj.phone || 'No phone recorded'}</Text>
              </View>
              <TouchableOpacity
                onPress={() => setCustomerModalVisible(true)}
                style={styles.changeBtn}
              >
                <Text style={styles.changeBtnText}>Change</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              style={styles.selectCustomerPromptBtn}
              onPress={() => setCustomerModalVisible(true)}
              activeOpacity={0.8}
            >
              <View style={styles.selectCustomerPromptLeft}>
                <Ionicons name="person-circle-outline" size={20} color="#8C331A" />
                <Text style={styles.selectCustomerPromptText}>Select Customer (Required)</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
            </TouchableOpacity>
          )}

          {/* SECTION 2: DELIVERY PARTNER SEARCHABLE DROPDOWN */}
          <DeliveryPartnerDropdown
            selectedPartnerId={selectedPartnerId}
            onSelectPartner={(partnerId) => setSelectedPartnerId(partnerId)}
            label="DELIVERY PARTNER (OPTIONAL)"
            placeholder="Select Delivery Partner (Optional)"
            optional={true}
            containerStyle={{ marginBottom: 12, marginTop: 12 }}
          />

          {/* SECTION 3: PRODUCTS SELECTION */}
          <View style={styles.productsHeaderRow}>
            <Text style={styles.sectionLabel}>PRODUCTS ({totalDistinctProducts})</Text>
            <TouchableOpacity
              style={styles.addMiniAction}
              onPress={() => {
                setModalSearch('');
                setAddModalVisible(true);
              }}
            >
              <Ionicons name="add" size={16} color="#8C331A" />
              <Text style={styles.addMiniActionText}>Add Product</Text>
            </TouchableOpacity>
          </View>

          {selectedProductIds.length === 0 ? (
            <TouchableOpacity
              style={styles.emptyProductsCard}
              onPress={() => {
                setModalSearch('');
                setAddModalVisible(true);
              }}
              activeOpacity={0.8}
            >
              <Ionicons name="cart-outline" size={32} color="#C4BCB5" />
              <Text style={styles.emptyProductsTitle}>No Products Added</Text>
              <Text style={styles.emptyProductsSub}>Tap here to search and select products for this recurring schedule.</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.selectedProductsCard}>
              {selectedProductIds.map((pid, idx) => {
                const prod = products.find(p => p.id === pid);
                const isLast = idx === selectedProductIds.length - 1;
                const unitStr = prod?.unit || 'Pc';
                const currentQtyStr = itemQuantities[pid] ?? '';
                const currentPriceStr = itemAgreedPrices[pid] ?? (prod?.price || '0');
                const priceNum = parseFloat(currentPriceStr) || 0;
                const qtyNum = parseInt(currentQtyStr, 10) || 0;
                const lineTotal = priceNum * qtyNum;

                return (
                  <View
                    key={pid}
                    style={[
                      styles.selectedProdRow,
                      isLast && { borderBottomWidth: 0 },
                    ]}
                  >
                    {/* Product Name */}
                    <View style={styles.prodInfoCol}>
                      <Text style={styles.prodName} numberOfLines={1}>
                        {prod ? prod.name : `Product #${pid}`}
                      </Text>
                      <Text style={styles.prodCat}>{unitStr}</Text>
                    </View>

                    {/* Numeric Quantity Input */}
                    <View style={styles.numericInputGroup}>
                      <Text style={styles.smallInputLabel}>Qty</Text>
                      <TextInput
                        style={styles.numericTextInput}
                        keyboardType="numeric"
                        value={currentQtyStr}
                        placeholder="1"
                        placeholderTextColor="#9CA3AF"
                        onChangeText={t => handleQuantityTextChange(pid, t)}
                        selectTextOnFocus
                      />
                    </View>

                    {/* Editable Agreed Unit Price */}
                    <View style={styles.numericInputGroup}>
                      <Text style={styles.smallInputLabel}>Rate (₹)</Text>
                      <TextInput
                        style={styles.numericTextInput}
                        keyboardType="numeric"
                        value={currentPriceStr}
                        placeholder="0"
                        placeholderTextColor="#9CA3AF"
                        onChangeText={t => handlePriceTextChange(pid, t)}
                        selectTextOnFocus
                      />
                    </View>

                    {/* Line Total */}
                    <View style={styles.lineTotalBox}>
                      <Text style={styles.lineTotalLabel}>Total</Text>
                      <Text style={styles.lineTotalText}>₹{lineTotal.toLocaleString()}</Text>
                    </View>

                    {/* Individual Delete Action */}
                    <TouchableOpacity
                      style={styles.removeBtn}
                      onPress={() => handleRemoveProduct(pid)}
                      activeOpacity={0.7}
                      accessibilityLabel="Remove item"
                    >
                      <Ionicons name="trash-outline" size={17} color="#DC2626" />
                    </TouchableOpacity>
                  </View>
                );
              })}
            </View>
          )}

          {/* SECTION 4: SCHEDULE */}
          <Text style={[styles.sectionLabel, { marginTop: 16 }]}>SCHEDULE FREQUENCY</Text>
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
                Daily (All 7 Days)
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
                Selected Weekdays
              </Text>
            </TouchableOpacity>
          </View>

          {/* Weekday Toggles */}
          {frequency === 'weekdays' && (
            <View style={styles.weekdaysRow}>
              {WEEKDAYS.map(day => {
                const isActive = selectedWeekdays.includes(day.key);
                return (
                  <TouchableOpacity
                    key={day.key}
                    style={[styles.dayChip, isActive && styles.dayChipActive]}
                    onPress={() => toggleWeekday(day.key)}
                  >
                    <Text style={[styles.dayChipText, isActive && styles.dayChipTextActive]}>
                      {day.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}

          {/* SECTION 5: DELIVERY DETAILS */}
          <Text style={[styles.sectionLabel, { marginTop: 16 }]}>DELIVERY ADDRESS *</Text>
          <TextInput
            style={styles.input}
            placeholder="Shop address, office floor or stall location"
            placeholderTextColor="#9CA3AF"
            value={deliveryAddress}
            onChangeText={setDeliveryAddress}
          />

          <Text style={[styles.sectionLabel, { marginTop: 12 }]}>ORDER INSTRUCTIONS (OPTIONAL)</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. Deliver before 8:30 AM without sugar"
            placeholderTextColor="#9CA3AF"
            value={notes}
            onChangeText={setNotes}
          />

          {/* SECTION 6: APPROVAL CONFIGURATION */}
          <Text style={[styles.sectionLabel, { marginTop: 16 }]}>APPROVAL CONFIGURATION</Text>
          <View style={styles.approvalConfigRow}>
            <TouchableOpacity
              style={[styles.approvalOption, !autoApprove && styles.approvalOptionActive]}
              onPress={() => setAutoApprove(false)}
              activeOpacity={0.8}
            >
              <Ionicons
                name={!autoApprove ? 'shield-checkmark' : 'shield-outline'}
                size={18}
                color={!autoApprove ? '#8C331A' : '#6B7280'}
                style={{ marginRight: 8 }}
              />
              <View style={{ flex: 1 }}>
                <Text style={[styles.approvalOptionTitle, !autoApprove && styles.approvalOptionTitleActive]}>
                  Owner Approval Required
                </Text>
                <Text style={styles.approvalOptionDesc}>
                  Generates order in Pending status for manual review (Default)
                </Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.approvalOption, autoApprove && styles.approvalOptionActive]}
              onPress={() => setAutoApprove(true)}
              activeOpacity={0.8}
            >
              <Ionicons
                name={autoApprove ? 'flash' : 'flash-outline'}
                size={18}
                color={autoApprove ? '#059669' : '#6B7280'}
                style={{ marginRight: 8 }}
              />
              <View style={{ flex: 1 }}>
                <Text style={[styles.approvalOptionTitle, autoApprove && { color: '#059669' }]}>
                  Auto-Approve
                </Text>
                <Text style={styles.approvalOptionDesc}>
                  Automatically confirms daily orders to kitchen queue
                </Text>
              </View>
            </TouchableOpacity>
          </View>

          {/* SECTION 7: NOTIFICATION SCHEDULE (PHASE 2A) */}
          <Text style={[styles.sectionLabel, { marginTop: 18 }]}>NOTIFICATION SCHEDULE</Text>
          <View style={styles.notifScheduleCard}>
            {/* Global Settings Toggle Row */}
            <View style={styles.notifGlobalToggleRow}>
              <View style={{ flex: 1, marginRight: 10 }}>
                <Text style={styles.notifScheduleTitle}>Use Global Default Settings</Text>
                <Text style={styles.notifScheduleDesc}>
                  Inherit daily cutoff and notification timings configured in Settings
                </Text>
              </View>
              <TouchableOpacity
                style={[styles.globalToggleBtn, useGlobalNotif && styles.globalToggleBtnActive]}
                onPress={() => setUseGlobalNotif(!useGlobalNotif)}
                activeOpacity={0.8}
              >
                <Ionicons
                  name={useGlobalNotif ? 'checkmark-circle' : 'ellipse-outline'}
                  size={18}
                  color={useGlobalNotif ? '#059669' : '#9CA3AF'}
                  style={{ marginRight: 4 }}
                />
                <Text style={[styles.globalToggleBtnText, useGlobalNotif && styles.globalToggleBtnTextActive]}>
                  {useGlobalNotif ? 'Global Active' : 'Custom'}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Custom Timing Fields (Visible when Use Global is OFF) */}
            {!useGlobalNotif && (
              <View style={styles.customTimingsContainer}>
                <Text style={styles.customTimingsHeader}>CUSTOM SCHEDULE (ASIA/KOLKATA)</Text>

                {/* Custom Order Generation Time */}
                <TouchableOpacity
                  style={styles.customTimingRow}
                  onPress={() => setTimePickerTarget('gen')}
                  activeOpacity={0.7}
                >
                  <View style={styles.customTimingLeft}>
                    <Ionicons name="time-outline" size={17} color="#8C331A" style={{ marginRight: 8 }} />
                    <View>
                      <Text style={styles.customTimingLabel}>Order Generation Time</Text>
                      <Text style={styles.customTimingHelp}>Time to create today's order batch</Text>
                    </View>
                  </View>
                  <View style={styles.customTimingBadge}>
                    <Text style={styles.customTimingBadgeText}>{formatDisplayTime(customGenTime)}</Text>
                    <Ionicons name="pencil" size={12} color="#8C331A" style={{ marginLeft: 4 }} />
                  </View>
                </TouchableOpacity>

                {/* Custom Owner Notification Time */}
                <TouchableOpacity
                  style={styles.customTimingRow}
                  onPress={() => setTimePickerTarget('owner')}
                  activeOpacity={0.7}
                >
                  <View style={styles.customTimingLeft}>
                    <Ionicons name="notifications-outline" size={17} color="#059669" style={{ marginRight: 8 }} />
                    <View>
                      <Text style={styles.customTimingLabel}>Owner Notification Time</Text>
                      <Text style={styles.customTimingHelp}>Batch review alert to owner</Text>
                    </View>
                  </View>
                  <View style={styles.customTimingBadge}>
                    <Text style={styles.customTimingBadgeText}>{formatDisplayTime(customOwnerTime)}</Text>
                    <Ionicons name="pencil" size={12} color="#8C331A" style={{ marginLeft: 4 }} />
                  </View>
                </TouchableOpacity>

                {/* Custom Partner Notification Time */}
                <TouchableOpacity
                  style={[styles.customTimingRow, { borderBottomWidth: 0 }]}
                  onPress={() => setTimePickerTarget('partner')}
                  activeOpacity={0.7}
                >
                  <View style={styles.customTimingLeft}>
                    <Ionicons name="bicycle-outline" size={17} color="#2563EB" style={{ marginRight: 8 }} />
                    <View>
                      <Text style={styles.customTimingLabel}>Partner Notification Time</Text>
                      <Text style={styles.customTimingHelp}>Dispatch alert to assigned driver</Text>
                    </View>
                  </View>
                  <View style={styles.customTimingBadge}>
                    <Text style={styles.customTimingBadgeText}>{formatDisplayTime(customPartnerTime)}</Text>
                    <Ionicons name="pencil" size={12} color="#8C331A" style={{ marginLeft: 4 }} />
                  </View>
                </TouchableOpacity>
              </View>
            )}

            {/* Notification Switches (Always accessible) */}
            <View style={styles.notifSwitchesContainer}>
              <View style={styles.notifSwitchRow}>
                <View style={{ flex: 1, marginRight: 8 }}>
                  <Text style={styles.notifSwitchTitle}>Owner Notification</Text>
                  <Text style={styles.notifSwitchSub}>Send batch alert for this template</Text>
                </View>
                <TouchableOpacity
                  style={[styles.notifSwitchPill, ownerNotifEnabled && styles.notifSwitchPillActive]}
                  onPress={() => setOwnerNotifEnabled(!ownerNotifEnabled)}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.notifSwitchPillText, ownerNotifEnabled && styles.notifSwitchPillTextActive]}>
                    {ownerNotifEnabled ? 'ENABLED' : 'DISABLED'}
                  </Text>
                </TouchableOpacity>
              </View>

              <View style={[styles.notifSwitchRow, { borderTopWidth: 1, borderTopColor: '#F3EFEA', paddingTop: 10 }]}>
                <View style={{ flex: 1, marginRight: 8 }}>
                  <Text style={styles.notifSwitchTitle}>Delivery Partner Notification</Text>
                  <Text style={styles.notifSwitchSub}>Alert partner when delivery generated</Text>
                </View>
                <TouchableOpacity
                  style={[styles.notifSwitchPill, partnerNotifEnabled && styles.notifSwitchPillActive]}
                  onPress={() => setPartnerNotifEnabled(!partnerNotifEnabled)}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.notifSwitchPillText, partnerNotifEnabled && styles.notifSwitchPillTextActive]}>
                    {partnerNotifEnabled ? 'ENABLED' : 'DISABLED'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* SECTION 8: SUMMARY CARD */}
          <View style={styles.summaryCard}>
            <Text style={styles.summaryTitle}>TEMPLATE SUMMARY</Text>

            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Product Count</Text>
              <Text style={styles.summaryVal}>{totalDistinctProducts} items</Text>
            </View>

            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Total Scheduled Units</Text>
              <Text style={styles.summaryVal}>{totalQuantities} units</Text>
            </View>

            <View style={[styles.summaryRow, styles.summaryTotalRow]}>
              <Text style={styles.summaryTotalLabel}>Estimated Recurring Value</Text>
              <Text style={styles.summaryTotalVal}>₹{estimatedTotal.toLocaleString()}</Text>
            </View>
          </View>

          {/* Spacer to allow full scroll above fixed footer */}
          <View style={{ height: 90 }} />
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Fixed Bottom Action Bar */}
      <View style={styles.bottomFixedFooter}>
        <TouchableOpacity
          style={[styles.saveBtn, (selectedProductIds.length === 0 || submitting) && styles.saveBtnDisabled]}
          onPress={handleSave}
          disabled={selectedProductIds.length === 0 || submitting}
          activeOpacity={0.85}
        >
          {submitting ? (
            <ActivityIndicator color="#FFFFFF" size="small" />
          ) : (
            <>
              <Ionicons name="checkmark-circle" size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
              <Text style={styles.saveBtnText}>
                {isEditing ? 'Update Recurring Template' : 'Save Recurring Template'}
              </Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* MODAL: SELECT CUSTOMER */}
      <Modal
        visible={customerModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setCustomerModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalTitle}>Select Customer</Text>
              <TouchableOpacity
                onPress={() => setCustomerModalVisible(false)}
                style={styles.modalCloseBtn}
              >
                <Ionicons name="close" size={20} color="#554A42" />
              </TouchableOpacity>
            </View>

            <View style={styles.modalSearchRow}>
              <View style={styles.modalSearchBox}>
                <Ionicons name="search-outline" size={16} color="#9CA3AF" style={{ marginRight: 6 }} />
                <TextInput
                  style={styles.modalSearchInput}
                  placeholder="Search name or mobile..."
                  placeholderTextColor="#9CA3AF"
                  value={customerSearch}
                  onChangeText={setCustomerSearch}
                />
              </View>
              <TouchableOpacity
                style={styles.modalAddCustomerBtn}
                onPress={() => setShowAddCustomerModal(true)}
              >
                <Ionicons name="person-add" size={16} color="#FFFFFF" style={{ marginRight: 4 }} />
                <Text style={styles.modalAddCustomerBtnText}>New</Text>
              </TouchableOpacity>
            </View>

            <FlatList
              data={filteredCustomers}
              keyExtractor={item => String(item.id)}
              showsVerticalScrollIndicator={false}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.customerRowItem,
                    selectedCustomerId === item.id && styles.customerRowItemActive,
                  ]}
                  onPress={() => handleSelectCustomer(item)}
                >
                  <View style={styles.custAvatarSmall}>
                    <Text style={styles.custAvatarSmallText}>{item.name[0]?.toUpperCase()}</Text>
                  </View>
                  <View style={{ flex: 1, marginLeft: 10 }}>
                    <Text style={styles.custRowName}>{item.name}</Text>
                    <Text style={styles.custRowPhone}>{item.phone || 'No phone recorded'}</Text>
                  </View>
                  {selectedCustomerId === item.id && (
                    <Ionicons name="checkmark-circle" size={18} color="#8C331A" />
                  )}
                </TouchableOpacity>
              )}
              ListEmptyComponent={
                <View style={{ paddingVertical: 20, alignItems: 'center' }}>
                  <Text style={{ color: '#9CA3AF', fontSize: 13 }}>No customers match your search.</Text>
                </View>
              }
            />
          </View>
        </View>
      </Modal>

      {/* MODAL: ADD NEW CUSTOMER */}
      <AddCustomerModal
        visible={showAddCustomerModal}
        onClose={() => setShowAddCustomerModal(false)}
        onSubmit={handleCreateCustomerSubmit}
      />

      {/* MODAL: ADD PRODUCT SEARCHABLE */}
      <Modal
        visible={addModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setAddModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalTitle}>Add Product to Template</Text>
              <TouchableOpacity
                onPress={() => setAddModalVisible(false)}
                style={styles.modalCloseBtn}
              >
                <Ionicons name="close" size={20} color="#554A42" />
              </TouchableOpacity>
            </View>

            <View style={[styles.modalSearchBox, { marginBottom: 10 }]}>
              <Ionicons name="search-outline" size={16} color="#9CA3AF" style={{ marginRight: 6 }} />
              <TextInput
                style={styles.modalSearchInput}
                placeholder="Search active products by name..."
                placeholderTextColor="#9CA3AF"
                value={modalSearch}
                onChangeText={setModalSearch}
              />
            </View>

            <FlatList
              data={modalFilteredProducts}
              keyExtractor={item => String(item.id)}
              showsVerticalScrollIndicator={false}
              renderItem={({ item }) => {
                const isAlreadySelected = selectedProductIds.includes(item.id);
                return (
                  <TouchableOpacity
                    style={[
                      styles.productModalRow,
                      isAlreadySelected && styles.productModalRowSelected,
                    ]}
                    onPress={() => handleAddProductFromModal(item)}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={styles.productModalName}>{item.name}</Text>
                      <Text style={styles.productModalPrice}>
                        Standard catalog price: ₹{item.price} / {item.unit || 'Pc'}
                      </Text>
                    </View>
                    <View
                      style={[
                        styles.addBadge,
                        isAlreadySelected && styles.addBadgeSelected,
                      ]}
                    >
                      <Ionicons
                        name={isAlreadySelected ? 'checkmark' : 'add'}
                        size={14}
                        color={isAlreadySelected ? '#059669' : '#8C331A'}
                      />
                      <Text
                        style={[
                          styles.addBadgeText,
                          isAlreadySelected && { color: '#059669' },
                        ]}
                      >
                        {isAlreadySelected ? 'Added' : 'Add'}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              }}
              ListEmptyComponent={
                <View style={{ paddingVertical: 20, alignItems: 'center' }}>
                  <Text style={{ color: '#9CA3AF', fontSize: 13 }}>No products found.</Text>
                </View>
              }
            />
          </View>
        </View>
      </Modal>

      {/* CONFIRMATION DIALOG */}
      <CustomDialog
        visible={dialogConfig.visible}
        title={dialogConfig.title}
        message={dialogConfig.message}
        type={dialogConfig.type}
        buttons={dialogConfig.buttons}
        onClose={closeDialog}
      />

      {/* TIME PICKER MODAL (PHASE 2A) */}
      <TimePickerModal
        visible={timePickerTarget !== null}
        title={
          timePickerTarget === 'gen'
            ? 'Order Generation Time'
            : timePickerTarget === 'owner'
            ? 'Owner Notification Time'
            : 'Partner Notification Time'
        }
        initialTime={
          timePickerTarget === 'gen'
            ? customGenTime
            : timePickerTarget === 'owner'
            ? customOwnerTime
            : customPartnerTime
        }
        onClose={() => setTimePickerTarget(null)}
        onSelectTime={(selectedTime) => {
          if (timePickerTarget === 'gen') setCustomGenTime(selectedTime);
          else if (timePickerTarget === 'owner') setCustomOwnerTime(selectedTime);
          else if (timePickerTarget === 'partner') setCustomPartnerTime(selectedTime);
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAF8F5',
  },
  formHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#EFEAE4',
  },
  headerBackBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  formHeaderTitleContainer: {
    flex: 1,
  },
  formHeaderTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#111827',
  },
  formHeaderSubtitle: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 1,
  },
  centerBox: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 20,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#6B7280',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  selectedCustomerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#EFEAE4',
    marginBottom: 8,
  },
  custAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FAF0EB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  custName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
  },
  custPhone: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 1,
  },
  changeBtn: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  changeBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#4B5563',
  },
  selectCustomerPromptBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 6,
  },
  selectCustomerPromptLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  selectCustomerPromptText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#4B5563',
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 13,
    color: '#111827',
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
    borderColor: '#E5E7EB',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 8,
  },
  freqBtnActive: {
    backgroundColor: '#8C331A',
    borderColor: '#8C331A',
  },
  freqBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#4B5563',
  },
  freqBtnTextActive: {
    color: '#FFFFFF',
  },
  weekdaysRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
    marginTop: 4,
  },
  dayChip: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginHorizontal: 2,
  },
  dayChipActive: {
    backgroundColor: '#FAF0EB',
    borderColor: '#8C331A',
  },
  dayChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#6B7280',
  },
  dayChipTextActive: {
    color: '#8C331A',
  },
  approvalConfigRow: {
    gap: 8,
    marginBottom: 12,
  },
  approvalOption: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    padding: 10,
  },
  approvalOptionActive: {
    borderColor: '#8C331A',
    backgroundColor: '#FAF0EB',
  },
  approvalOptionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#111827',
  },
  approvalOptionTitleActive: {
    color: '#8C331A',
  },
  approvalOptionDesc: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 2,
    lineHeight: 15,
  },
  productsHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 10,
    marginBottom: 6,
  },
  addMiniAction: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FAF0EB',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  addMiniActionText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#8C331A',
    marginLeft: 2,
  },
  emptyProductsCard: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 24,
    marginBottom: 12,
  },
  emptyProductsTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#4B5563',
    marginTop: 8,
  },
  emptyProductsSub: {
    fontSize: 11,
    color: '#9CA3AF',
    textAlign: 'center',
    marginTop: 2,
  },
  selectedProductsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    overflow: 'hidden',
    marginBottom: 8,
  },
  selectedProdRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  prodInfoCol: {
    flex: 1.6,
    marginRight: 6,
  },
  prodName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#111827',
  },
  prodCat: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 1,
  },
  numericInputGroup: {
    width: 62,
    marginRight: 6,
  },
  smallInputLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: '#6B7280',
    marginBottom: 2,
    textAlign: 'center',
  },
  numericTextInput: {
    backgroundColor: '#FAF8F5',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 6,
    paddingVertical: 4,
    paddingHorizontal: 6,
    fontSize: 13,
    fontWeight: '700',
    color: '#111827',
    textAlign: 'center',
  },
  lineTotalBox: {
    width: 60,
    alignItems: 'flex-end',
    marginRight: 8,
  },
  lineTotalLabel: {
    fontSize: 9,
    color: '#6B7280',
    fontWeight: '600',
  },
  lineTotalText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#8C331A',
    marginTop: 2,
  },
  removeBtn: {
    padding: 6,
  },
  summaryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 14,
    marginTop: 12,
    marginBottom: 10,
  },
  summaryTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#6B7280',
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  summaryLabel: {
    fontSize: 13,
    color: '#4B5563',
  },
  summaryVal: {
    fontSize: 13,
    fontWeight: '700',
    color: '#111827',
  },
  summaryTotalRow: {
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    marginTop: 8,
    paddingTop: 10,
  },
  summaryTotalLabel: {
    fontSize: 14,
    fontWeight: '800',
    color: '#111827',
  },
  summaryTotalVal: {
    fontSize: 16,
    fontWeight: '900',
    color: '#8C331A',
  },
  bottomFixedFooter: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#EFEAE4',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  saveBtn: {
    backgroundColor: '#8C331A',
    borderRadius: 10,
    height: 46,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBtnDisabled: {
    backgroundColor: '#D1D5DB',
  },
  saveBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },

  /* Modals */
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalCard: {
    width: '100%',
    maxHeight: '80%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
  },
  modalHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#111827',
  },
  modalCloseBtn: {
    padding: 4,
  },
  modalSearchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  modalSearchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    paddingHorizontal: 10,
    height: 38,
  },
  modalSearchInput: {
    flex: 1,
    fontSize: 13,
    color: '#111827',
    paddingVertical: 0,
  },
  modalAddCustomerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#8C331A',
    borderRadius: 8,
    paddingHorizontal: 10,
    height: 38,
  },
  modalAddCustomerBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  customerRowItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  customerRowItemActive: {
    backgroundColor: '#FAF0EB',
    borderRadius: 8,
    paddingHorizontal: 8,
  },
  custAvatarSmall: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FAF0EB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  custAvatarSmallText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#8C331A',
  },
  custRowName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#111827',
  },
  custRowPhone: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 1,
  },
  productModalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  productModalRowSelected: {
    backgroundColor: '#F6FDF9',
  },
  productModalName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#111827',
  },
  productModalPrice: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 2,
  },
  addBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FAF0EB',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  addBadgeSelected: {
    backgroundColor: '#ECFDF5',
  },
  addBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#8C331A',
    marginLeft: 2,
  },
  // Phase 2A Notification Schedule Styles
  notifScheduleCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 14,
    marginBottom: 16,
  },
  notifGlobalToggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  notifScheduleTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#2A2421',
  },
  notifScheduleDesc: {
    fontSize: 11,
    color: '#8E8278',
    marginTop: 2,
  },
  globalToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  globalToggleBtnActive: {
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0',
  },
  globalToggleBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#6B7280',
  },
  globalToggleBtnTextActive: {
    color: '#059669',
  },
  customTimingsContainer: {
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3EFEA',
  },
  customTimingsHeader: {
    fontSize: 11,
    fontWeight: '700',
    color: '#8C331A',
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  customTimingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F3EFEA',
  },
  customTimingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 10,
  },
  customTimingLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#2A2421',
  },
  customTimingHelp: {
    fontSize: 11,
    color: '#8E8278',
    marginTop: 1,
  },
  customTimingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FAF8F5',
    borderWidth: 1,
    borderColor: '#EFEAE4',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  customTimingBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#8C331A',
  },
  notifSwitchesContainer: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3EFEA',
  },
  notifSwitchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  notifSwitchTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#2A2421',
  },
  notifSwitchSub: {
    fontSize: 11,
    color: '#8E8278',
    marginTop: 1,
  },
  notifSwitchPill: {
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  notifSwitchPillActive: {
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0',
  },
  notifSwitchPillText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#6B7280',
    letterSpacing: 0.5,
  },
  notifSwitchPillTextActive: {
    color: '#059669',
  },
});
