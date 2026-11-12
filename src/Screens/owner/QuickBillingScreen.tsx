import React, { useState, useMemo, useCallback, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  TextInput,
  Image,
  Modal,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useApp } from '../../context/AppContext';
import billingService, { BillingCustomer } from '../../services/billing.service';

const TEA_IMAGES: { [key: string]: string } = {
  'Masala Chai':
    'https://images.unsplash.com/photo-1576092768241-dec231879fc3?w=300&auto=format&fit=crop',
  'Ginger Chai':
    'https://images.unsplash.com/photo-1544787219-7f47ccb76574?w=300&auto=format&fit=crop',
  'Elaichi Chai':
    'https://images.unsplash.com/photo-1561336313-0bd5e0b27ec8?w=300&auto=format&fit=crop',
  'Green Tea':
    'https://images.unsplash.com/photo-1627435601361-ec25f5b1d0e5?w=300&auto=format&fit=crop',
  'Adrak Chai':
    'https://images.unsplash.com/photo-1597481499750-3e6b22637e12?w=300&auto=format&fit=crop',
  'Tulsi Chai':
    'https://images.unsplash.com/photo-1571934811356-5cc061b6821f?w=300&auto=format&fit=crop',
  'Lemon Tea':
    'https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=300&auto=format&fit=crop',
  'Cinnamon Chai':
    'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=300&auto=format&fit=crop',
  'Full Cream Milk':
    'https://images.unsplash.com/photo-1563636619-e9143da7973b?w=300&auto=format&fit=crop',
  'Sugar Sachet':
    'https://images.unsplash.com/photo-1581441363689-1f3c3c414635?w=300&auto=format&fit=crop',
};

const DEFAULT_TEA_IMAGE =
  'https://images.unsplash.com/photo-1576092768241-dec231879fc3?w=300&auto=format&fit=crop';

export default function QuickBillingScreen({ navigation }: any) {
  const { products, addProduct } = useApp();

  // Search filter for products
  const [productSearchQuery, setProductSearchQuery] = useState<string>('');

  // Cart Quantities: productId -> qty
  const [cartQuantities, setCartQuantities] = useState<{ [productId: string]: number }>({});
  const [addedOrder, setAddedOrder] = useState<string[]>([]);

  // Customer State (Optional selection)
  const [selectedCustomer, setSelectedCustomer] = useState<BillingCustomer | null>(null);
  const [showCustomerModal, setShowCustomerModal] = useState<boolean>(false);
  const [customerSearch, setCustomerSearch] = useState<string>('');
  const [customersList, setCustomersList] = useState<BillingCustomer[]>([]);
  const [loadingCustomers, setLoadingCustomers] = useState<boolean>(false);

  // New Customer Modal
  const [showAddCustomerModal, setShowAddCustomerModal] = useState<boolean>(false);
  const [newCustName, setNewCustName] = useState<string>('');
  const [newCustPhone, setNewCustPhone] = useState<string>('');
  const [newCustAddress, setNewCustAddress] = useState<string>('');

  // Payment Options: Cash or Online (manual recording)
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'online'>('cash');
  const [receivedAmount, setReceivedAmount] = useState<string>('');
  const [isSaving, setIsSaving] = useState<boolean>(false);

  // Toast
  const [toastConfig, setToastConfig] = useState<{ msg: string; isError?: boolean } | null>(null);

  const showToast = useCallback((msg: string, isError: boolean = false) => {
    setToastConfig({ msg, isError });
    setTimeout(() => setToastConfig(null), 2500);
  }, []);

  const parseProductPrice = useCallback((priceStr: string): number => {
    return parseInt(priceStr.replace(/[^0-9]/g, '')) || 0;
  }, []);

  // Filtered Products
  const filteredProducts = useMemo(() => {
    if (!productSearchQuery.trim()) return products;
    const q = productSearchQuery.toLowerCase();
    return products.filter(
      p =>
        p.name.toLowerCase().includes(q) ||
        p.category?.toLowerCase().includes(q),
    );
  }, [products, productSearchQuery]);

  // Line items
  const lineItems = useMemo(() => {
    const items: Array<{ id: string; name: string; qty: number; price: number }> = [];
    addedOrder.forEach(pId => {
      const qty = cartQuantities[pId] || 0;
      if (qty > 0) {
        const prod = products.find(p => p.id === pId);
        if (prod) {
          items.push({
            id: prod.id,
            name: prod.name,
            qty,
            price: parseProductPrice(prod.price),
          });
        }
      }
    });
    return items;
  }, [addedOrder, cartQuantities, products, parseProductPrice]);

  const grandTotal = useMemo(() => {
    return lineItems.reduce((acc, curr) => acc + curr.qty * curr.price, 0);
  }, [lineItems]);

  const totalItemsCount = useMemo(() => {
    return lineItems.reduce((acc, curr) => acc + curr.qty, 0);
  }, [lineItems]);

  // Auto-fill receivedAmount with grandTotal by default if empty or matches previous total
  useEffect(() => {
    setReceivedAmount(grandTotal > 0 ? String(grandTotal) : '');
  }, [grandTotal]);

  // Load customers for selection
  const fetchCustomers = useCallback(async (query: string = '') => {
    setLoadingCustomers(true);
    try {
      const res = await billingService.getCustomers(query);
      setCustomersList(res);
    } catch {
      // Fallback
    } finally {
      setLoadingCustomers(false);
    }
  }, []);

  const handleOpenCustomerModal = () => {
    setShowCustomerModal(true);
    fetchCustomers(customerSearch);
  };

  const handleCreateCustomer = async () => {
    if (!newCustName.trim() || !newCustPhone.trim()) {
      showToast('Name and phone number are required.', true);
      return;
    }
    try {
      const created = await billingService.createCustomer({
        name: newCustName.trim(),
        phone: newCustPhone.trim(),
        address: newCustAddress.trim(),
      });
      setSelectedCustomer(created);
      setShowAddCustomerModal(false);
      setShowCustomerModal(false);
      setNewCustName('');
      setNewCustPhone('');
      setNewCustAddress('');
      showToast(`Customer ${created.name} added!`);
    } catch (err: any) {
      showToast(err.message || 'Failed to add customer', true);
    }
  };

  const updateQuantity = useCallback(
    (productId: string, delta: number) => {
      setCartQuantities(prev => {
        const current = prev[productId] || 0;
        const updated = Math.max(0, current + delta);
        return { ...prev, [productId]: updated };
      });

      setAddedOrder(prev => {
        const currentQty = cartQuantities[productId] || 0;
        const updatedQty = Math.max(0, currentQty + delta);
        if (updatedQty > 0 && !prev.includes(productId)) {
          return [...prev, productId];
        } else if (updatedQty === 0 && prev.includes(productId)) {
          return prev.filter(id => id !== productId);
        }
        return prev;
      });
    },
    [cartQuantities],
  );

  const handleClearCart = () => {
    setCartQuantities({});
    setAddedOrder([]);
    setSelectedCustomer(null);
    setReceivedAmount('');
  };

  // Save Bill to Django Backend
  const handleSaveBill = async () => {
    if (lineItems.length === 0) {
      showToast('Please add at least 1 product to the bill!', true);
      return;
    }

    const numericReceived = parseFloat(receivedAmount) || 0;
    if (numericReceived < 0) {
      showToast('Received amount cannot be negative.', true);
      return;
    }
    if (numericReceived > grandTotal) {
      showToast(`Received amount cannot exceed total (₹${grandTotal})`, true);
      return;
    }

    setIsSaving(true);
    try {
      const payload = {
        customer_id: selectedCustomer ? selectedCustomer.id : null,
        customer_name: selectedCustomer ? selectedCustomer.name : 'Walk-in Customer',
        customer_phone: selectedCustomer ? selectedCustomer.phone : '',
        items: lineItems.map(item => ({
          product_name: item.name,
          unit_price: item.price,
          quantity: item.qty,
        })),
        initial_payment_amount: numericReceived,
        initial_payment_method: paymentMethod,
      };

      const savedInvoice = await billingService.createInvoice(payload);
      showToast('Bill saved successfully!');
      handleClearCart();

      setTimeout(() => {
        navigation.navigate('InvoiceDetail', { invoice: savedInvoice, invoiceId: savedInvoice.id });
      }, 700);
    } catch (err: any) {
      showToast(err.message || 'Failed to save bill in database.', true);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* HEADER */}
      <View style={styles.topHeaderBar}>
        <View style={styles.headerTitleGroup}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => navigation.goBack()}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={22} color="#111827" />
          </TouchableOpacity>

          <View style={styles.teaLogoIconContainer}>
            <Ionicons name="cafe" size={16} color="#8C331A" />
          </View>
          <Text style={styles.headerTitleText}>Quick Billing</Text>
        </View>

        <TouchableOpacity
          activeOpacity={0.85}
          style={styles.historyBtn}
          onPress={() => navigation.navigate('Invoices')}
        >
          <Ionicons name="receipt-outline" size={16} color="#8C331A" style={{ marginRight: 4 }} />
          <Text style={styles.historyBtnText}>Invoices</Text>
        </TouchableOpacity>
      </View>

      {toastConfig && (
        <View style={[styles.toastContainer, toastConfig.isError && styles.toastContainerError]}>
          <Ionicons
            name={toastConfig.isError ? 'alert-circle' : 'checkmark-circle'}
            size={20}
            color="#FFFFFF"
          />
          <Text style={styles.toastText}>{toastConfig.msg}</Text>
        </View>
      )}

      <KeyboardAwareScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        enableOnAndroid={true}
        keyboardShouldPersistTaps="handled"
      >
        {/* CUSTOMER SELECTION BAR */}
        <View style={styles.customerCard}>
          <View style={styles.customerInfoRow}>
            <View style={styles.customerAvatar}>
              <Ionicons name="person" size={18} color="#8C331A" />
            </View>
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={styles.customerName}>
                {selectedCustomer ? selectedCustomer.name : 'Walk-in Customer'}
              </Text>
              <Text style={styles.customerSub}>
                {selectedCustomer
                  ? `${selectedCustomer.phone} • Counter Account`
                  : 'Counter Sale (No account selected)'}
              </Text>
            </View>

            {selectedCustomer ? (
              <TouchableOpacity
                onPress={() => setSelectedCustomer(null)}
                style={styles.customerChangeBtn}
              >
                <Text style={styles.customerChangeText}>Remove</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                onPress={handleOpenCustomerModal}
                style={styles.customerSelectBtn}
              >
                <Text style={styles.customerSelectText}>Select / Add</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* PRODUCTS SECTION */}
        <Text style={styles.productsSectionTitle}>Products</Text>

        {/* SEARCH BAR */}
        <View style={styles.searchBarContainer}>
          <Ionicons name="search-outline" size={16} color="#9CA3AF" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search tea..."
            placeholderTextColor="#9CA3AF"
            value={productSearchQuery}
            onChangeText={setProductSearchQuery}
          />
        </View>

        {/* 3-COLUMN PRODUCT GRID */}
        <View style={styles.productThreeGrid}>
          {filteredProducts.map(p => {
            const currentQty = cartQuantities[p.id] || 0;
            const isSelected = currentQty > 0;
            const imgUri = TEA_IMAGES[p.name] || DEFAULT_TEA_IMAGE;

            return (
              <TouchableOpacity
                key={p.id}
                activeOpacity={0.8}
                style={[styles.threeGridCard, isSelected && styles.threeGridCardSelected]}
                onPress={() => updateQuantity(p.id, 1)}
              >
                {currentQty > 0 && (
                  <View style={styles.qtyBadge}>
                    <Text style={styles.qtyBadgeText}>{currentQty}</Text>
                  </View>
                )}

                <Image source={{ uri: imgUri }} style={styles.teaCardImage} resizeMode="cover" />
                <Text style={styles.threeGridCardTitle} numberOfLines={2}>
                  {p.name}
                </Text>
                <Text style={styles.threeGridCardPrice}>₹{p.price}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* YOUR BILL & PAYMENT CARD */}
        <View style={styles.mergedBillSummaryCard}>
          <View style={styles.billHeaderRow}>
            <View style={styles.billTitleGroup}>
              <Ionicons name="cart-outline" size={18} color="#111827" style={{ marginRight: 6 }} />
              <Text style={styles.billCardTitle}>Your Bill</Text>
              {totalItemsCount > 0 && (
                <View style={styles.billCountBadge}>
                  <Text style={styles.billCountBadgeText}>{totalItemsCount}</Text>
                </View>
              )}
            </View>

            {totalItemsCount > 0 && (
              <TouchableOpacity activeOpacity={0.7} style={styles.clearAllBtn} onPress={handleClearCart}>
                <Ionicons name="trash-outline" size={14} color="#8C331A" style={{ marginRight: 2 }} />
                <Text style={styles.clearAllBtnText}>Clear All</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* BILL ITEMS */}
          {lineItems.length === 0 ? (
            <Text style={styles.noItemsText}>No items added to bill yet</Text>
          ) : (
            <View style={styles.billItemsList}>
              {lineItems.map(item => (
                <View key={item.id} style={styles.billItemRow}>
                  <View style={styles.billItemInfoCol}>
                    <Text style={styles.billItemName}>{item.name}</Text>
                    <Text style={styles.billItemSubPrice}>
                      ₹{item.price} x {item.qty} = ₹{item.price * item.qty}
                    </Text>
                  </View>

                  <View style={styles.billItemStepper}>
                    <TouchableOpacity style={styles.miniMinusBtn} onPress={() => updateQuantity(item.id, -1)}>
                      <Ionicons name="remove" size={14} color="#8C331A" />
                    </TouchableOpacity>
                    <Text style={styles.miniQtyText}>{item.qty}</Text>
                    <TouchableOpacity style={styles.miniPlusBtn} onPress={() => updateQuantity(item.id, 1)}>
                      <Ionicons name="add" size={14} color="#FFFFFF" />
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>
          )}

          <View style={styles.dottedDivider} />

          {/* TOTAL */}
          <View style={styles.grandTotalRow}>
            <Text style={styles.grandTotalLabel}>Grand Total</Text>
            <Text style={styles.grandTotalValue}>₹{grandTotal}</Text>
          </View>

          {/* PAYMENT METHOD (CASH OR ONLINE ONLY) */}
          <View style={styles.paymentMethodSection}>
            <Text style={styles.paymentSectionLabel}>Payment Method</Text>
            <View style={styles.paymentMethodRow}>
              <TouchableOpacity
                style={[styles.paymentMethodTab, paymentMethod === 'cash' && styles.paymentMethodTabActive]}
                onPress={() => setPaymentMethod('cash')}
              >
                <Ionicons
                  name="cash-outline"
                  size={16}
                  color={paymentMethod === 'cash' ? '#FFFFFF' : '#4B5563'}
                  style={{ marginRight: 6 }}
                />
                <Text
                  style={[styles.paymentMethodText, paymentMethod === 'cash' && styles.paymentMethodTextActive]}
                >
                  Cash
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.paymentMethodTab, paymentMethod === 'online' && styles.paymentMethodTabActive]}
                onPress={() => setPaymentMethod('online')}
              >
                <Ionicons
                  name="card-outline"
                  size={16}
                  color={paymentMethod === 'online' ? '#FFFFFF' : '#4B5563'}
                  style={{ marginRight: 6 }}
                />
                <Text
                  style={[styles.paymentMethodText, paymentMethod === 'online' && styles.paymentMethodTextActive]}
                >
                  Online (Manual)
                </Text>
              </TouchableOpacity>
            </View>

            {/* RECEIVED AMOUNT INPUT (SUPPORTS PARTIAL & FULL PAYMENTS) */}
            <View style={styles.receivedAmountRow}>
              <View style={{ flex: 1, marginRight: 10 }}>
                <Text style={styles.receivedAmountLabel}>Received Amount (₹)</Text>
                <TextInput
                  style={styles.receivedAmountInput}
                  keyboardType="numeric"
                  placeholder="0"
                  placeholderTextColor="#9CA3AF"
                  value={receivedAmount}
                  onChangeText={setReceivedAmount}
                />
              </View>

              <View style={styles.dueSummaryBox}>
                <Text style={styles.dueSummaryLabel}>Remaining Due</Text>
                <Text style={styles.dueSummaryValue}>
                  ₹{Math.max(0, grandTotal - (parseFloat(receivedAmount) || 0))}
                </Text>
              </View>
            </View>
          </View>
        </View>
      </KeyboardAwareScrollView>

      {/* BOTTOM SAVE BILL BUTTON */}
      <View style={styles.fixedBottomDock}>
        <TouchableOpacity
          activeOpacity={0.85}
          style={[styles.saveBillBtn, (lineItems.length === 0 || isSaving) && styles.saveBillBtnDisabled]}
          onPress={handleSaveBill}
          disabled={lineItems.length === 0 || isSaving}
        >
          {isSaving ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <>
              <Ionicons name="checkmark-circle-outline" size={20} color="#FFFFFF" style={{ marginRight: 8 }} />
              <Text style={styles.saveBillBtnText}>Save Bill (₹{grandTotal})</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* MODAL: CUSTOMER SELECTOR */}
      <Modal
        visible={showCustomerModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowCustomerModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.customerModalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Customer</Text>
              <TouchableOpacity onPress={() => setShowCustomerModal(false)}>
                <Ionicons name="close" size={22} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <View style={styles.modalSearchRow}>
              <TextInput
                style={styles.modalSearchInput}
                placeholder="Search name or phone..."
                placeholderTextColor="#9CA3AF"
                value={customerSearch}
                onChangeText={text => {
                  setCustomerSearch(text);
                  fetchCustomers(text);
                }}
              />
              <TouchableOpacity
                style={styles.newCustBtn}
                onPress={() => setShowAddCustomerModal(true)}
              >
                <Ionicons name="person-add" size={16} color="#FFFFFF" />
              </TouchableOpacity>
            </View>

            {loadingCustomers ? (
              <ActivityIndicator size="large" color="#8C331A" style={{ marginVertical: 30 }} />
            ) : (
              <FlatList
                data={customersList}
                keyExtractor={item => String(item.id)}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.customerSelectItem}
                    onPress={() => {
                      setSelectedCustomer(item);
                      setShowCustomerModal(false);
                    }}
                  >
                    <View style={styles.itemAvatar}>
                      <Text style={styles.itemAvatarText}>{item.name[0]?.toUpperCase()}</Text>
                    </View>
                    <View style={{ flex: 1, marginLeft: 10 }}>
                      <Text style={styles.itemCustName}>{item.name}</Text>
                      <Text style={styles.itemCustPhone}>{item.phone}</Text>
                    </View>
                    <Text style={styles.itemCustBills}>{item.total_bills} bills</Text>
                  </TouchableOpacity>
                )}
                ListEmptyComponent={
                  <Text style={styles.emptyListText}>No customers found. Click + to add one.</Text>
                }
              />
            )}
          </View>
        </View>
      </Modal>

      {/* MODAL: CREATE CUSTOMER */}
      <Modal
        visible={showAddCustomerModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowAddCustomerModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>New Customer</Text>
              <TouchableOpacity onPress={() => setShowAddCustomerModal(false)}>
                <Ionicons name="close" size={20} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalLabel}>Customer Name *</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="e.g. Ramesh Kumar"
              placeholderTextColor="#9CA3AF"
              value={newCustName}
              onChangeText={setNewCustName}
            />

            <Text style={styles.modalLabel}>Phone Number *</Text>
            <TextInput
              style={styles.modalInput}
              keyboardType="phone-pad"
              placeholder="e.g. 9876543210"
              placeholderTextColor="#9CA3AF"
              value={newCustPhone}
              onChangeText={setNewCustPhone}
            />

            <Text style={styles.modalLabel}>Address / Note</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="e.g. Shop 42, Market Road"
              placeholderTextColor="#9CA3AF"
              value={newCustAddress}
              onChangeText={setNewCustAddress}
            />

            <View style={styles.modalBtnRow}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setShowAddCustomerModal(false)}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalSubmitBtn}
                onPress={handleCreateCustomer}
              >
                <Text style={styles.modalSubmitText}>Save Customer</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAF5F0',
  },
  topHeaderBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#FAF5F0',
  },
  backBtn: {
    paddingVertical: 4,
    paddingHorizontal: 2,
    marginRight: 8,
  },
  headerTitleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  teaLogoIconContainer: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#F7EBE4',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  headerTitleText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#111827',
  },
  historyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F7EBE4',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  historyBtnText: {
    color: '#8C331A',
    fontWeight: '700',
    fontSize: 13,
  },

  toastContainer: {
    position: 'absolute',
    top: 50,
    left: 16,
    right: 16,
    backgroundColor: '#059669',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 999,
    elevation: 8,
  },
  toastContainerError: {
    backgroundColor: '#DC2626',
  },
  toastText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
    marginLeft: 8,
  },

  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 110,
  },

  customerCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 12,
    marginTop: 6,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  customerInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  customerAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F7EBE4',
    justifyContent: 'center',
    alignItems: 'center',
  },
  customerName: {
    fontWeight: '800',
    fontSize: 14,
    color: '#111827',
  },
  customerSub: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  customerSelectBtn: {
    backgroundColor: '#8C331A',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  customerSelectText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  customerChangeBtn: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  customerChangeText: {
    color: '#EF4444',
    fontSize: 12,
    fontWeight: '700',
  },

  productsSectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 8,
  },
  searchBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    paddingHorizontal: 10,
    height: 38,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 12,
  },
  searchIcon: {
    marginRight: 6,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: '#111827',
    paddingVertical: 0,
  },

  productThreeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  threeGridCard: {
    width: '31.5%',
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 6,
    marginBottom: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  threeGridCardSelected: {
    borderColor: '#8C331A',
    backgroundColor: '#FEF9F6',
  },
  qtyBadge: {
    position: 'absolute',
    top: -6,
    right: -6,
    backgroundColor: '#8C331A',
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  qtyBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
  },
  teaCardImage: {
    width: '100%',
    height: 52,
    borderRadius: 6,
    marginBottom: 6,
  },
  threeGridCardTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#111827',
    textAlign: 'center',
  },
  threeGridCardPrice: {
    fontSize: 11,
    fontWeight: '800',
    color: '#8C331A',
    marginTop: 2,
  },

  mergedBillSummaryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 10,
  },
  billHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  billTitleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  billCardTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#111827',
  },
  billCountBadge: {
    backgroundColor: '#8C331A',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 10,
    marginLeft: 6,
  },
  billCountBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
  },
  clearAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  clearAllBtnText: {
    color: '#8C331A',
    fontSize: 12,
    fontWeight: '700',
  },

  noItemsText: {
    color: '#9CA3AF',
    fontStyle: 'italic',
    fontSize: 13,
    paddingVertical: 10,
    textAlign: 'center',
  },
  billItemsList: {
    marginTop: 4,
  },
  billItemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
    borderBottomWidth: 0.5,
    borderBottomColor: '#F3F4F6',
  },
  billItemInfoCol: {
    flex: 1,
  },
  billItemName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#111827',
  },
  billItemSubPrice: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 1,
  },
  billItemStepper: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  miniMinusBtn: {
    width: 24,
    height: 24,
    borderRadius: 6,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  miniQtyText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#111827',
    marginHorizontal: 8,
  },
  miniPlusBtn: {
    width: 24,
    height: 24,
    borderRadius: 6,
    backgroundColor: '#8C331A',
    justifyContent: 'center',
    alignItems: 'center',
  },

  dottedDivider: {
    height: 1,
    borderWidth: 0.5,
    borderColor: '#E5E7EB',
    borderStyle: 'dashed',
    marginVertical: 12,
  },
  grandTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  grandTotalLabel: {
    fontSize: 16,
    fontWeight: '800',
    color: '#111827',
  },
  grandTotalValue: {
    fontSize: 18,
    fontWeight: '900',
    color: '#8C331A',
  },

  paymentMethodSection: {
    marginTop: 4,
  },
  paymentSectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#4B5563',
    marginBottom: 6,
  },
  paymentMethodRow: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  paymentMethodTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F3F4F6',
    paddingVertical: 8,
    borderRadius: 8,
    marginRight: 8,
  },
  paymentMethodTabActive: {
    backgroundColor: '#8C331A',
  },
  paymentMethodText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#4B5563',
  },
  paymentMethodTextActive: {
    color: '#FFFFFF',
  },

  receivedAmountRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  receivedAmountLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#4B5563',
    marginBottom: 4,
  },
  receivedAmountInput: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontSize: 14,
    fontWeight: '800',
    color: '#111827',
  },
  dueSummaryBox: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FEE2E2',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    alignItems: 'center',
  },
  dueSummaryLabel: {
    fontSize: 11,
    color: '#DC2626',
    fontWeight: '700',
  },
  dueSummaryValue: {
    fontSize: 15,
    color: '#DC2626',
    fontWeight: '900',
    marginTop: 1,
  },

  fixedBottomDock: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderColor: '#E5E7EB',
  },
  saveBillBtn: {
    backgroundColor: '#8C331A',
    borderRadius: 12,
    paddingVertical: 14,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  saveBillBtnDisabled: {
    backgroundColor: '#9CA3AF',
  },
  saveBillBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '900',
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  customerModalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    maxHeight: '80%',
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
    color: '#111827',
  },
  modalSearchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  modalSearchInput: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 13,
    color: '#111827',
    marginRight: 8,
  },
  newCustBtn: {
    backgroundColor: '#8C331A',
    padding: 9,
    borderRadius: 8,
  },
  customerSelectItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 0.5,
    borderBottomColor: '#F3F4F6',
  },
  itemAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F7EBE4',
    justifyContent: 'center',
    alignItems: 'center',
  },
  itemAvatarText: {
    color: '#8C331A',
    fontWeight: '800',
    fontSize: 13,
  },
  itemCustName: {
    fontWeight: '700',
    fontSize: 13,
    color: '#111827',
  },
  itemCustPhone: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 1,
  },
  itemCustBills: {
    fontSize: 11,
    color: '#8C331A',
    fontWeight: '700',
  },
  emptyListText: {
    textAlign: 'center',
    color: '#9CA3AF',
    fontStyle: 'italic',
    paddingVertical: 20,
    fontSize: 13,
  },

  modalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 18,
  },
  modalLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#374151',
    marginTop: 8,
    marginBottom: 4,
  },
  modalInput: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 13,
    color: '#111827',
  },
  modalBtnRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 16,
  },
  modalCancelBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginRight: 8,
  },
  modalCancelText: {
    color: '#6B7280',
    fontWeight: '700',
  },
  modalSubmitBtn: {
    backgroundColor: '#8C331A',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  modalSubmitText: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
});
