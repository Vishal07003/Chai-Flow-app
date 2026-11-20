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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';
import Header from '../../components/common/Header';
import { CustomDialog, DeliveryPartnerDropdown } from '../../components/common';
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

  // itemQuantities stores string values during typing to preserve product selection if temporarily empty
  const [itemQuantities, setItemQuantities] = useState<{ [productId: number]: string }>({});
  const [submitting, setSubmitting] = useState<boolean>(false);

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
          unit: p.unit || 'Pc',
          description: p.description,
          is_available: true,
          category: p.category || 1,
          created_at: p.created_at || new Date().toISOString(),
        }));
        setProducts(mappedProds);

        if (existingTemplate && existingTemplate.items) {
          const qMap: { [id: number]: string } = {};
          existingTemplate.items.forEach(it => {
            qMap[it.product] = String(it.quantity);
          });
          setItemQuantities(qMap);
        } else if (route?.params?.prefilledItems && Array.isArray(route.params.prefilledItems)) {
          const qMap: { [id: number]: string } = {};
          route.params.prefilledItems.forEach((it: any) => {
            qMap[Number(it.product_id)] = String(it.quantity);
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

  // Direct numeric quantity change handler - preserves product row even if text is empty
  const handleQuantityTextChange = (productId: number, text: string) => {
    // Only allow positive digits
    const cleaned = text.replace(/[^0-9]/g, '');
    setItemQuantities(prev => ({
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
      message: `Remove "${prodName}" from this recurring order template? This will not delete the product from the catalog.`,
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
          },
        },
      ],
    });
  };

  // Add product from modal
  const handleAddProductFromModal = (p: BackendProduct) => {
    setItemQuantities(prev => {
      const existingQty = prev[p.id];
      if (existingQty !== undefined) {
        // If already in list, increase quantity by 1 or keep valid number
        const num = parseInt(existingQty, 10) || 0;
        return { ...prev, [p.id]: String(num + 1) };
      }
      return { ...prev, [p.id]: '1' };
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
    return Object.entries(itemQuantities).reduce((sum, [pid, str]) => {
      const prod = products.find(p => p.id === Number(pid));
      const rate = prod ? parseFloat(prod.price) || 0 : 0;
      const num = parseInt(str, 10) || 0;
      return sum + rate * num;
    }, 0);
  }, [itemQuantities, products]);

  // Modal filtered products
  const modalFilteredProducts = useMemo(() => {
    if (!modalSearch.trim()) return products;
    const q = modalSearch.toLowerCase().trim();
    return products.filter(p => p.name.toLowerCase().includes(q));
  }, [products, modalSearch]);

  const handleSave = async () => {
    if (!selectedCustomerId) {
      Alert.alert('Required', 'Please select a customer.');
      return;
    }
    if (!deliveryAddress.trim()) {
      Alert.alert('Required', 'Please enter a delivery address.');
      return;
    }

    // Validate quantities
    if (selectedProductIds.length === 0) {
      Alert.alert('Required', 'Please add at least one product to the recurring order template.');
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
      Alert.alert('Required', 'Please select at least one active weekday.');
      return;
    }

    const items = selectedProductIds.map(pid => ({
      product_id: pid,
      quantity: parseInt(itemQuantities[pid], 10),
    }));

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
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <Header
        title={isEditing ? 'Edit Recurring Template' : 'New Recurring Template'}
        showBack={true}
        showNotification={false}
      />

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

          {/* Delivery Partner Searchable Dropdown */}
          <DeliveryPartnerDropdown
            selectedPartnerId={selectedPartnerId}
            onSelectPartner={(partnerId) => setSelectedPartnerId(partnerId)}
            label="ASSIGN DELIVERY PARTNER (OPTIONAL)"
            placeholder="Select Delivery Partner (Optional)"
            optional={true}
            containerStyle={{ marginBottom: 10 }}
          />

          {/* Order Notes */}
          <Text style={styles.sectionLabel}>TEMPLATE NOTES (OPTIONAL)</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. Deliver before 8:00 AM without sugar"
            placeholderTextColor="#A0958D"
            value={notes}
            onChangeText={setNotes}
          />

          {/* Selected Products Section */}
          <View style={styles.productsHeaderRow}>
            <Text style={styles.sectionLabel}>RECURRING PRODUCTS ({totalDistinctProducts})</Text>
          </View>

          {selectedProductIds.length === 0 ? (
            <View style={styles.emptyProductsCard}>
              <Ionicons name="cart-outline" size={32} color="#C4BCB5" />
              <Text style={styles.emptyProductsTitle}>No Products Selected</Text>
              <Text style={styles.emptyProductsSub}>
                Add products to automatically deliver on schedule.
              </Text>
            </View>
          ) : (
            <View style={styles.selectedProductsCard}>
              {selectedProductIds.map((pid, idx) => {
                const prod = products.find(p => p.id === pid);
                const isLast = idx === selectedProductIds.length - 1;
                const priceNum = prod ? parseFloat(prod.price) || 0 : 0;
                const unitStr = prod?.unit || 'Pc';
                const currentQtyStr = itemQuantities[pid] ?? '';
                const lineTotal = priceNum * (parseInt(currentQtyStr, 10) || 0);

                return (
                  <View
                    key={pid}
                    style={[
                      styles.selectedProdRow,
                      isLast && { borderBottomWidth: 0 },
                    ]}
                  >
                    {/* Left: Product Info */}
                    <View style={styles.prodInfoCol}>
                      <Text style={styles.prodName} numberOfLines={1}>
                        {prod ? prod.name : `Product #${pid}`}
                      </Text>
                      <Text style={styles.prodPrice}>
                        ₹{priceNum} / {unitStr}
                      </Text>
                    </View>

                    {/* Middle: Direct Numeric Quantity Input */}
                    <View style={styles.qtyInputBox}>
                      <Text style={styles.qtyLabel}>Qty</Text>
                      <TextInput
                        style={styles.qtyTextInput}
                        keyboardType="numeric"
                        value={currentQtyStr}
                        placeholder="0"
                        placeholderTextColor="#A3968C"
                        onChangeText={t => handleQuantityTextChange(pid, t)}
                        selectTextOnFocus
                      />
                    </View>

                    {/* Line Total */}
                    <View style={styles.lineTotalBox}>
                      <Text style={styles.lineTotalText}>₹{lineTotal.toLocaleString()}</Text>
                    </View>

                    {/* Right: Individual Delete Icon */}
                    <TouchableOpacity
                      style={styles.removeBtn}
                      onPress={() => handleRemoveProduct(pid)}
                      activeOpacity={0.7}
                      accessibilityLabel="Remove item"
                    >
                      <Ionicons name="trash-outline" size={19} color="#DC2626" />
                    </TouchableOpacity>
                  </View>
                );
              })}
            </View>
          )}

          {/* + Add Product Button */}
          <TouchableOpacity
            style={styles.addProductBtn}
            onPress={() => {
              setModalSearch('');
              setAddModalVisible(true);
            }}
            activeOpacity={0.8}
          >
            <Ionicons name="add-circle-outline" size={18} color="#8C331A" style={{ marginRight: 6 }} />
            <Text style={styles.addProductBtnText}>+ Add Product</Text>
          </TouchableOpacity>

          {/* Order Summary Card */}
          <View style={styles.summaryCard}>
            <Text style={styles.summaryTitle}>ORDER SUMMARY</Text>

            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Selected Products</Text>
              <Text style={styles.summaryVal}>{totalDistinctProducts} items</Text>
            </View>

            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Total Quantity</Text>
              <Text style={styles.summaryVal}>{totalQuantities} units</Text>
            </View>

            <View style={[styles.summaryRow, styles.summaryTotalRow]}>
              <Text style={styles.summaryTotalLabel}>Estimated Recurring Amount</Text>
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

      {/* Add Product Searchable Modal */}
      <Modal
        visible={addModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setAddModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            {/* Modal Header */}
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalTitle}>Add Product</Text>
              <TouchableOpacity
                onPress={() => setAddModalVisible(false)}
                style={styles.modalCloseBtn}
              >
                <Ionicons name="close" size={20} color="#554A42" />
              </TouchableOpacity>
            </View>

            {/* Modal Search Bar */}
            <View style={styles.modalSearchBox}>
              <Ionicons name="search-outline" size={16} color="#8E8278" style={{ marginRight: 8 }} />
              <TextInput
                style={styles.modalSearchInput}
                placeholder="Search products by name..."
                placeholderTextColor="#A0958D"
                value={modalSearch}
                onChangeText={setModalSearch}
                autoFocus
              />
              {modalSearch.length > 0 && (
                <TouchableOpacity onPress={() => setModalSearch('')}>
                  <Ionicons name="close-circle" size={16} color="#8E8278" />
                </TouchableOpacity>
              )}
            </View>

            {/* Modal Product List */}
            <ScrollView
              style={styles.modalProductList}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              {modalFilteredProducts.length === 0 ? (
                <View style={styles.emptySearchBox}>
                  <Text style={styles.emptySearchText}>No matching products found</Text>
                </View>
              ) : (
                modalFilteredProducts.map(prod => {
                  const alreadySelected = itemQuantities[prod.id] !== undefined;
                  const currentQty = parseInt(itemQuantities[prod.id] || '0', 10);
                  const priceNum = parseFloat(prod.price) || 0;
                  const unitStr = prod.unit || 'Pc';

                  return (
                    <TouchableOpacity
                      key={prod.id}
                      style={[
                        styles.modalProdItem,
                        alreadySelected && styles.modalProdItemActive,
                      ]}
                      onPress={() => handleAddProductFromModal(prod)}
                      activeOpacity={0.7}
                    >
                      <View style={{ flex: 1, marginRight: 8 }}>
                        <Text style={styles.modalProdName}>{prod.name}</Text>
                        <Text style={styles.modalProdPrice}>
                          ₹{priceNum} / {unitStr}
                        </Text>
                      </View>

                      {alreadySelected ? (
                        <View style={styles.alreadySelectedBadge}>
                          <Text style={styles.alreadySelectedText}>
                            Selected ({currentQty}) +
                          </Text>
                        </View>
                      ) : (
                        <View style={styles.addPill}>
                          <Ionicons name="add" size={16} color="#8C331A" />
                          <Text style={styles.addPillText}>Add</Text>
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                })
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Confirmation Dialog */}
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
  scrollContent: {
    padding: 16,
    paddingBottom: 20,
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
  emptyProductsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#EFEAE4',
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  emptyProductsTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#554A42',
    marginTop: 8,
  },
  emptyProductsSub: {
    fontSize: 12,
    color: '#8E8278',
    marginTop: 2,
    textAlign: 'center',
  },
  selectedProductsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#EFEAE4',
    overflow: 'hidden',
    marginBottom: 12,
  },
  selectedProdRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#EFEAE4',
  },
  prodInfoCol: {
    flex: 2,
    marginRight: 8,
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
  qtyInputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FAF8F5',
    borderWidth: 1,
    borderColor: '#E0D8D0',
    borderRadius: 8,
    paddingHorizontal: 6,
    height: 36,
    marginRight: 8,
  },
  qtyLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#8E8278',
    marginRight: 4,
  },
  qtyTextInput: {
    fontSize: 13,
    fontWeight: '800',
    color: '#2A2421',
    minWidth: 32,
    maxWidth: 55,
    textAlign: 'center',
    paddingVertical: 0,
  },
  lineTotalBox: {
    width: 65,
    alignItems: 'flex-end',
    marginRight: 8,
  },
  lineTotalText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#2A2421',
  },
  removeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FEF2F2',
    justifyContent: 'center',
    alignItems: 'center',
  },
  addProductBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#8C331A',
    borderStyle: 'dashed',
    borderRadius: 10,
    height: 42,
    marginBottom: 16,
  },
  addProductBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#8C331A',
  },
  summaryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#EFEAE4',
    padding: 14,
    marginBottom: 12,
  },
  summaryTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#8E8278',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  summaryLabel: {
    fontSize: 12,
    color: '#554A42',
  },
  summaryVal: {
    fontSize: 12,
    fontWeight: '600',
    color: '#2A2421',
  },
  summaryTotalRow: {
    borderTopWidth: 1,
    borderTopColor: '#EFEAE4',
    paddingTop: 8,
    marginTop: 6,
  },
  summaryTotalLabel: {
    fontSize: 13,
    fontWeight: '800',
    color: '#2A2421',
  },
  summaryTotalVal: {
    fontSize: 15,
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
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'center',
    padding: 20,
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    maxHeight: '75%',
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
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
    color: '#2A2421',
  },
  modalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FAF8F5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalSearchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FAF8F5',
    borderWidth: 1,
    borderColor: '#EFEAE4',
    borderRadius: 8,
    paddingHorizontal: 10,
    height: 40,
    marginBottom: 10,
  },
  modalSearchInput: {
    flex: 1,
    fontSize: 13,
    color: '#2A2421',
    paddingVertical: 0,
  },
  modalProductList: {
    maxHeight: 280,
  },
  emptySearchBox: {
    paddingVertical: 24,
    alignItems: 'center',
  },
  emptySearchText: {
    fontSize: 13,
    color: '#8E8278',
  },
  modalProdItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F5EFEA',
  },
  modalProdItemActive: {
    backgroundColor: '#FEF9F6',
  },
  modalProdName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#2A2421',
  },
  modalProdPrice: {
    fontSize: 11,
    color: '#8C331A',
    fontWeight: '600',
    marginTop: 2,
  },
  addPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF0EA',
    borderWidth: 1,
    borderColor: '#FBD8CB',
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  addPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#8C331A',
    marginLeft: 2,
  },
  alreadySelectedBadge: {
    backgroundColor: '#E8F5E9',
    borderRadius: 14,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  alreadySelectedText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#2E7D32',
  },
});
