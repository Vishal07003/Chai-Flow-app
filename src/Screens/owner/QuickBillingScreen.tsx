import React, { useState, useMemo, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Image,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useApp, InvoiceLineItem, ProductItem } from '../../context/AppContext';

// Unsplash tea images matching tea shop products
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
  const { products, addQuickBill, addProduct } = useApp();

  // Search filter
  const [productSearchQuery, setProductSearchQuery] = useState<string>('');

  // Selected Bill Line Items: Map of productId -> qty
  const [cartQuantities, setCartQuantities] = useState<{
    [productId: string]: number;
  }>({});
  // Sequence order in which products were added
  const [addedOrder, setAddedOrder] = useState<string[]>([]);

  // Payment State
  const [paymentMethod, setPaymentMethod] = useState<'Cash' | 'UPI' | 'Credit'>(
    'Cash',
  );

  // Modal States for Add Product
  const [showAddProductModal, setShowAddProductModal] =
    useState<boolean>(false);
  const [newProductName, setNewProductName] = useState<string>('');
  const [newProductPrice, setNewProductPrice] = useState<string>('');
  const [newProductCategory, setNewProductCategory] = useState<string>('Tea');
  const [newProductStock, setNewProductStock] = useState<string>('100');

  // UI Toast State
  const [toastConfig, setToastConfig] = useState<{ msg: string; isError?: boolean } | null>(null);

  const showToast = useCallback((msg: string, isError: boolean = false) => {
    setToastConfig({ msg, isError });
    setTimeout(() => setToastConfig(null), 2500);
  }, []);

  // Helper to parse numerical price
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

  // Convert cartQuantities to InvoiceLineItem[] in added order
  const lineItems = useMemo<InvoiceLineItem[]>(() => {
    const items: InvoiceLineItem[] = [];
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

  // Grand Total Calculation
  const grandTotal = useMemo(() => {
    return lineItems.reduce((acc, curr) => acc + curr.qty * curr.price, 0);
  }, [lineItems]);

  const totalItemsCount = useMemo(() => {
    return lineItems.reduce((acc, curr) => acc + curr.qty, 0);
  }, [lineItems]);

  // Stepper handlers
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

  // Clear Cart Handler
  const handleClearCart = () => {
    setCartQuantities({});
    setAddedOrder([]);
  };

  // Add Product Handler
  const handleCreateProduct = async () => {
    if (!newProductName.trim()) {
      showToast('Please enter a tea/product name.', true);
      return;
    }
    const numericPrice = parseInt(newProductPrice) || 0;
    if (numericPrice <= 0) {
      showToast('Please enter a valid price.', true);
      return;
    }

    const stockNum = parseInt(newProductStock) || 100;

    await addProduct({
      name: newProductName.trim(),
      price: `₹${numericPrice}`,
      unit: 'cup',
      description: `${newProductCategory} - Counter tea`,
      stock: `${stockNum} units left`,
      stockNumber: stockNum,
      category: newProductCategory,
      isLowStock: stockNum <= 15,
    });

    setShowAddProductModal(false);
    setNewProductName('');
    setNewProductPrice('');
    showToast(`Added ${newProductName.trim()} to catalog!`);
  };

  // Process Bill Handler
  const handleProcessBill = async () => {
    if (lineItems.length === 0) {
      showToast('Please add at least 1 product to proceed with payment!', true);
      return;
    }

    try {
      const newInvoice = await addQuickBill({
        customerName: 'Walk-in Customer',
        customerAddress: 'Counter Sale',
        items: lineItems,
        subtotal: grandTotal,
        discount: 0,
        grandTotal,
        paymentMethod,
        paidAmount: grandTotal,
        isWalkIn: true,
      });

      showToast('Quick Bill saved successfully!');

      setTimeout(() => {
        navigation.replace('InvoiceDetail', { invoice: newInvoice });
      }, 800);
    } catch (_err) {
      showToast('Failed to save bill. Please try again.', true);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* SCREEN HEADER WITH BACK BUTTON */}
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

        <View style={styles.headerRightActions}>
          <TouchableOpacity
            activeOpacity={0.85}
            style={styles.addTeaPillBtn}
            onPress={() =>
              navigation.navigate('ProductDetail', { mode: 'add' })
            }
          >
            <Ionicons
              name="add"
              size={16}
              color="#FFFFFF"
              style={{ marginRight: 2 }}
            />
            <Text style={styles.addTeaPillBtnText}>Add Product</Text>
          </TouchableOpacity>
        </View>
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

      {/* MAIN SCROLLABLE CONTENT */}
      <KeyboardAwareScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        enableOnAndroid={true}
        keyboardShouldPersistTaps="handled"
      >
        {/* PRODUCTS SECTION TITLE */}
        <Text style={styles.productsSectionTitle}>Products</Text>

        {/* COMPACT SEARCH BAR */}
        <View style={styles.searchBarContainer}>
          <Ionicons
            name="search-outline"
            size={16}
            color="#9CA3AF"
            style={styles.searchIcon}
          />
          <TextInput
            style={styles.searchInput}
            placeholder="Search tea..."
            placeholderTextColor="#9CA3AF"
            value={productSearchQuery}
            onChangeText={setProductSearchQuery}
          />
        </View>

        {/* 3-COLUMN PRODUCT CARDS GRID */}
        <View style={styles.productThreeGrid}>
          {filteredProducts.map((p: ProductItem) => {
            const currentQty = cartQuantities[p.id] || 0;
            const isSelected = currentQty > 0;
            const imgUri = TEA_IMAGES[p.name] || DEFAULT_TEA_IMAGE;

            return (
              <TouchableOpacity
                key={p.id}
                activeOpacity={0.8}
                style={[
                  styles.threeGridCard,
                  isSelected && styles.threeGridCardSelected,
                ]}
                onPress={() => updateQuantity(p.id, 1)}
              >
                {/* Quantity Badge on Top Right */}
                {currentQty > 0 && (
                  <View style={styles.qtyBadge}>
                    <Text style={styles.qtyBadgeText}>{currentQty}</Text>
                  </View>
                )}

                <Image
                  source={{ uri: imgUri }}
                  style={styles.teaCardImage}
                  resizeMode="cover"
                />

                <Text style={styles.threeGridCardTitle} numberOfLines={2}>
                  {p.name}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* SINGLE COMBINED CARD FOR YOUR BILL & SUMMARY */}
        <View style={styles.mergedBillSummaryCard}>
          {/* BILL HEADER */}
          <View style={styles.billHeaderRow}>
            <View style={styles.billTitleGroup}>
              <Ionicons
                name="cart-outline"
                size={18}
                color="#111827"
                style={{ marginRight: 6 }}
              />
              <Text style={styles.billCardTitle}>Your Bill</Text>
              {totalItemsCount > 0 && (
                <View style={styles.billCountBadge}>
                  <Text style={styles.billCountBadgeText}>
                    {totalItemsCount}
                  </Text>
                </View>
              )}
            </View>

            {totalItemsCount > 0 && (
              <TouchableOpacity
                activeOpacity={0.7}
                style={styles.clearAllBtn}
                onPress={handleClearCart}
              >
                <Ionicons
                  name="trash-outline"
                  size={14}
                  color="#8C331A"
                  style={{ marginRight: 2 }}
                />
                <Text style={styles.clearAllBtnText}>Clear All</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* BILL ITEMS LIST */}
          {lineItems.length === 0 ? (
            <Text style={styles.noItemsText}>No items added</Text>
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
                    <TouchableOpacity
                      style={styles.miniMinusBtn}
                      onPress={() => updateQuantity(item.id, -1)}
                    >
                      <Ionicons name="remove" size={14} color="#8C331A" />
                    </TouchableOpacity>

                    <Text style={styles.miniQtyText}>{item.qty}</Text>

                    <TouchableOpacity
                      style={styles.miniPlusBtn}
                      onPress={() => updateQuantity(item.id, 1)}
                    >
                      <Ionicons name="add" size={14} color="#FFFFFF" />
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>
          )}

          {/* DIVIDER */}
          <View style={styles.dottedDivider} />

          {/* INTEGRATED SUMMARY TOTALS */}
          <View style={styles.summaryLineRow}>
            <Text style={styles.summaryLineLabel}>Total Items</Text>
            <Text style={styles.summaryLineValue}>{totalItemsCount}</Text>
          </View>

          <View style={styles.grandTotalRow}>
            <Text style={styles.grandTotalLabel}>Grand Total</Text>
            <Text style={styles.grandTotalValue}>₹{grandTotal}</Text>
          </View>
        </View>
      </KeyboardAwareScrollView>

      {/* FIXED ALWAYS-VISIBLE BOTTOM DOCK */}
      <View style={styles.fixedBottomDock}>
        <TouchableOpacity
          activeOpacity={0.8}
          style={styles.dockClearBtn}
          onPress={handleClearCart}
        >
          <Ionicons
            name="trash-outline"
            size={18}
            color="#8C331A"
            style={{ marginRight: 6 }}
          />
          <Text style={styles.dockClearBtnText}>Clear Bill</Text>
        </TouchableOpacity>
      </View>

      {/* MODAL: ADD NEW TEA / PRODUCT */}
      <Modal
        visible={showAddProductModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowAddProductModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add New Tea / Product</Text>
              <TouchableOpacity onPress={() => setShowAddProductModal(false)}>
                <Ionicons name="close" size={20} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalLabel}>Product Name *</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="e.g. Masala Chai, Elaichi Tea"
              placeholderTextColor="#9CA3AF"
              value={newProductName}
              onChangeText={setNewProductName}
            />

            <View style={styles.modalRow}>
              <View style={{ flex: 1, marginRight: 8 }}>
                <Text style={styles.modalLabel}>Price (₹) *</Text>
                <TextInput
                  style={styles.modalInput}
                  keyboardType="numeric"
                  placeholder="e.g. 20"
                  placeholderTextColor="#9CA3AF"
                  value={newProductPrice}
                  onChangeText={setNewProductPrice}
                />
              </View>

              <View style={{ flex: 1, marginLeft: 8 }}>
                <Text style={styles.modalLabel}>Category</Text>
                <TextInput
                  style={styles.modalInput}
                  placeholder="e.g. Tea, Milk"
                  placeholderTextColor="#9CA3AF"
                  value={newProductCategory}
                  onChangeText={setNewProductCategory}
                />
              </View>
            </View>

            <View style={styles.modalBtnRow}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setShowAddProductModal(false)}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalSubmitBtn}
                onPress={handleCreateProduct}
              >
                <Text style={styles.modalSubmitText}>Add Product</Text>
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
  headerRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  addTeaPillBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#8C331A',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
  },
  addTeaPillBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
  },
  toastContainerError: {
    backgroundColor: '#DC2626',
  },
  toastText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13.5,
    marginLeft: 8,
    flex: 1,
  },

  scrollContent: {
    paddingHorizontal: 14,
    paddingBottom: 90,
  },

  productsSectionTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#111827',
    marginTop: 4,
    marginBottom: 8,
  },

  /* Compact Search Bar */
  searchBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    paddingHorizontal: 12,
    height: 38,
    borderWidth: 1,
    borderColor: '#EFECE9',
    marginBottom: 10,
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

  /* 3-COLUMN PRODUCT CARDS GRID */
  productThreeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  threeGridCard: {
    width: '31.5%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 8,
    marginBottom: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#EFECE9',
    elevation: 1.5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    position: 'relative',
  },
  threeGridCardSelected: {
    borderColor: '#8C331A',
    backgroundColor: '#FFFBF9',
  },
  qtyBadge: {
    position: 'absolute',
    top: 5,
    right: 5,
    backgroundColor: '#8C331A',
    width: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2,
  },
  qtyBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
  },
  teaCardImage: {
    width: 52,
    height: 52,
    borderRadius: 26,
    marginBottom: 6,
  },
  threeGridCardTitle: {
    fontSize: 11.5,
    fontWeight: '800',
    color: '#111827',
    textAlign: 'center',
    lineHeight: 15,
  },

  /* MERGED YOUR BILL & SUMMARY CARD */
  mergedBillSummaryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: '#EFECE9',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    marginBottom: 10,
  },
  billHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
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
    borderRadius: 10,
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 6,
  },
  billCountBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
  },
  clearAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  clearAllBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#8C331A',
  },
  noItemsText: {
    fontSize: 12.5,
    color: '#9CA3AF',
    fontStyle: 'italic',
    paddingVertical: 6,
  },
  billItemsList: {
    marginTop: 2,
  },
  billItemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#F9FAFB',
  },
  billItemInfoCol: {
    flex: 1,
  },
  billItemName: {
    fontSize: 12.5,
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
    borderRadius: 12,
    backgroundColor: '#F5ECE8',
    justifyContent: 'center',
    alignItems: 'center',
  },
  miniQtyText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#111827',
    marginHorizontal: 7,
  },
  miniPlusBtn: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#8C331A',
    justifyContent: 'center',
    alignItems: 'center',
  },

  dottedDivider: {
    borderWidth: 0.8,
    borderColor: '#E5E7EB',
    borderStyle: 'dashed',
    marginVertical: 10,
  },

  summaryLineRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  summaryLineLabel: {
    fontSize: 12.5,
    color: '#6B7280',
    fontWeight: '600',
  },
  summaryLineValue: {
    fontSize: 13,
    fontWeight: '800',
    color: '#111827',
  },
  grandTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  grandTotalLabel: {
    fontSize: 15,
    fontWeight: '800',
    color: '#111827',
  },
  grandTotalValue: {
    fontSize: 20,
    fontWeight: '900',
    color: '#8C331A',
  },

  /* FIXED ALWAYS-VISIBLE BOTTOM PAYMENT DOCK */
  fixedBottomDock: {
    position: 'absolute',
    height: 100,
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#EFECE9',
    paddingHorizontal: 16,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    elevation: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
  },
  dockClearBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F7EBE4',
    paddingHorizontal: 16,
    height: 52,
    paddingVertical: 12,
    borderRadius: 20,
  },
  dockClearBtnText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#8C331A',
  },

  /* Modal Styling */
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 18,
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
    color: '#8C331A',
  },
  modalLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#374151',
    marginBottom: 4,
    marginTop: 6,
  },
  modalInput: {
    backgroundColor: '#FAF8F5',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: 12,
    height: 42,
    fontSize: 13,
    color: '#111827',
  },
  modalRow: {
    flexDirection: 'row',
  },
  modalBtnRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 16,
  },
  modalCancelBtn: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 10,
    backgroundColor: '#F3F4F6',
    marginRight: 8,
  },
  modalCancelText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#4B5563',
  },
  modalSubmitBtn: {
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 10,
    backgroundColor: '#8C331A',
  },
  modalSubmitText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FFFFFF',
  },
});
