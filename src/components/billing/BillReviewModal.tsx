import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Modal,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Keyboard,
  Platform,
  FlatList,
  Dimensions,
  KeyboardAvoidingView,
} from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { colors } from '../../theme';
import AppToast from '../../utils/toast';
import { ConfirmDialog } from '../ConfirmDialog';
import { productService, BackendProduct } from '../../services/product.service';

export interface BillReviewItem {
  id?: number;
  product_id?: number | null;
  product_name: string;
  ordered_quantity?: number;
  quantity: number;
  unit_price: string;
  total_price?: string;
  has_discrepancy?: boolean;
}

export interface BillReviewModalProps {
  visible: boolean;
  onClose: () => void;
  mode: 'create_from_order' | 'edit_invoice';
  orderId?: number;
  invoiceId?: number;
  invoiceNumber?: string;
  customerName?: string;
  customerPhone?: string;
  deliveryDate?: string;
  deliveryTime?: string;
  deliveryPartnerName?: string;
  initialItems: BillReviewItem[];
  initialDiscount?: string;
  initialNotes?: string;
  initialDueDate?: string | null;
  onSaveSuccess: () => void;
  saveAction: (payload: {
    items: Array<{ product_id: number | null; product_name: string; quantity: number; unit_price: string }>;
    discount_amount: string;
    notes: string;
    due_date: string | null;
    reason?: string;
  }) => Promise<void>;
}

export const BillReviewModal: React.FC<BillReviewModalProps> = ({
  visible,
  onClose,
  mode,
  orderId,
  invoiceId,
  invoiceNumber,
  customerName,
  deliveryPartnerName,
  deliveryDate,
  deliveryTime,
  initialItems,
  initialDiscount = '0',
  initialNotes = '',
  onSaveSuccess,
  saveAction,
}) => {
  const [items, setItems] = useState<BillReviewItem[]>([]);
  const [discount, setDiscount] = useState<string>('0');
  const [notes, setNotes] = useState<string>('');
  const [editReason, setEditReason] = useState<string>('');
  const [isSaving, setIsSaving] = useState<boolean>(false);

  // Keyboard height state for adaptive bottom sheet positioning
  const [keyboardHeight, setKeyboardHeight] = useState<number>(0);
  const scrollViewRef = useRef<any>(null);

  // Delete product confirmation state
  const [deleteIndex, setDeleteIndex] = useState<number | null>(null);

  // Add Product modal state
  const [showAddProductModal, setShowAddProductModal] = useState<boolean>(false);
  const [availableProducts, setAvailableProducts] = useState<BackendProduct[]>([]);
  const [loadingProducts, setLoadingProducts] = useState<boolean>(false);
  const [productSearch, setProductSearch] = useState<string>('');

  // Track keyboard show/hide events to adapt bottom sheet height & position
  useEffect(() => {
    const showSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      e => {
        setKeyboardHeight(e.endCoordinates.height);
      }
    );
    const hideSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => {
        setKeyboardHeight(0);
      }
    );

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  useEffect(() => {
    if (visible) {
      setItems(initialItems.map(it => ({ ...it })));
      setDiscount(initialDiscount || '0');
      setNotes(initialNotes || '');
      setEditReason('');
      setIsSaving(false);
      setDeleteIndex(null);
      setShowAddProductModal(false);
      setKeyboardHeight(0);
    }
  }, [visible, initialItems, initialDiscount, initialNotes]);

  // Load catalog products when Add Product modal opens
  const handleOpenAddProduct = async () => {
    setShowAddProductModal(true);
    setProductSearch('');
    if (availableProducts.length === 0) {
      setLoadingProducts(true);
      try {
        const prods = await productService.getProducts({ available: true });
        setAvailableProducts(Array.isArray(prods) ? prods : []);
      } catch (err) {
        console.warn('Failed to load products for bill modal:', err);
      } finally {
        setLoadingProducts(false);
      }
    }
  };

  const handleSelectProduct = (product: BackendProduct) => {
    const existingIndex = items.findIndex(it => it.product_id === product.id);
    if (existingIndex >= 0) {
      setItems(prev => {
        const next = [...prev];
        next[existingIndex] = {
          ...next[existingIndex],
          quantity: (next[existingIndex].quantity || 0) + 1,
        };
        return next;
      });
      AppToast.info('Product Updated', `Increased ${product.name} quantity.`);
    } else {
      const newItem: BillReviewItem = {
        product_id: product.id,
        product_name: product.name,
        ordered_quantity: 0,
        quantity: 1,
        unit_price: product.price ? String(product.price) : '0',
      };
      setItems(prev => [...prev, newItem]);
      AppToast.success('Product Added', `${product.name} added to bill.`);
    }
    setShowAddProductModal(false);
  };

  // Handle direct item quantity change
  const handleQtyChange = (index: number, newQtyText: string) => {
    const clean = newQtyText.replace(/[^0-9]/g, '');
    const num = parseInt(clean, 10);
    setItems(prev => {
      const next = [...prev];
      next[index] = { ...next[index], quantity: isNaN(num) ? 0 : num };
      return next;
    });
  };

  // Handle direct item price change
  const handlePriceChange = (index: number, newPriceText: string) => {
    const clean = newPriceText.replace(/[^0-9.]/g, '');
    setItems(prev => {
      const next = [...prev];
      next[index] = { ...next[index], unit_price: clean };
      return next;
    });
  };

  // Request Item Removal with Confirmation
  const requestRemoveItem = (index: number) => {
    if (items.length <= 1) {
      AppToast.warning('Cannot Remove', 'A bill must have at least one product item.');
      return;
    }
    setDeleteIndex(index);
  };

  const confirmRemoveItem = () => {
    if (deleteIndex !== null) {
      setItems(prev => prev.filter((_, i) => i !== deleteIndex));
      setDeleteIndex(null);
    }
  };

  // Totals Calculation
  const subtotal = useMemo(() => {
    return items.reduce((sum, it) => {
      const price = parseFloat(it.unit_price) || 0;
      const q = it.quantity || 0;
      return sum + price * q;
    }, 0);
  }, [items]);

  const discountAmount = useMemo(() => {
    const d = parseFloat(discount) || 0;
    return Math.min(d, subtotal);
  }, [discount, subtotal]);

  const grandTotal = useMemo(() => {
    return Math.max(0, subtotal - discountAmount);
  }, [subtotal, discountAmount]);

  const totalQuantity = useMemo(() => {
    return items.reduce((sum, it) => sum + (it.quantity || 0), 0);
  }, [items]);

  // Check if any item has delivered quantity exceeding ordered quantity
  const itemsWithExcessDelivered = useMemo(() => {
    return items.filter(
      it => it.ordered_quantity !== undefined && it.quantity > it.ordered_quantity
    );
  }, [items]);

  // Handle Save Bill
  const handleSave = async () => {
    if (isSaving) return;

    if (items.length === 0) {
      AppToast.error('Empty Bill', 'Please include at least one product line.');
      return;
    }

    const hasInvalidQty = items.some(it => !it.quantity || it.quantity <= 0);
    if (hasInvalidQty) {
      AppToast.error('Invalid Quantity', 'All line items must have a quantity of at least 1.');
      return;
    }

    if (mode === 'edit_invoice' && !editReason.trim()) {
      AppToast.warning('Reason Required', 'Please enter a brief reason for editing this saved bill.');
      return;
    }

    setIsSaving(true);
    try {
      const payloadItems = items.map(it => ({
        product_id: it.product_id || null,
        product_name: it.product_name,
        quantity: it.quantity,
        unit_price: it.unit_price || '0',
      }));

      await saveAction({
        items: payloadItems,
        discount_amount: String(discountAmount),
        notes: notes.trim(),
        due_date: null, // Payment collection is handled via Collect Cash in Customer Profile
        reason: editReason.trim() || undefined,
      });

      AppToast.success(
        mode === 'create_from_order' ? 'Bill Saved' : 'Bill Updated',
        mode === 'create_from_order'
          ? `Invoice generated for Order #${orderId}.`
          : `Invoice #${invoiceNumber || invoiceId} updated with audit trail.`
      );
      onSaveSuccess();
      onClose();
    } catch (err: any) {
      AppToast.error('Save Failed', err?.message || 'Could not save bill. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const filteredProducts = useMemo(() => {
    if (!productSearch.trim()) return availableProducts;
    const term = productSearch.toLowerCase();
    return availableProducts.filter(p => p.name.toLowerCase().includes(term));
  }, [availableProducts, productSearch]);

  const itemToDelete = deleteIndex !== null ? items[deleteIndex] : null;

  // Compute dynamic max height based on available screen space above keyboard
  const screenHeight = Dimensions.get('window').height;
  const isKeyboardOpen = keyboardHeight > 0;
  // Dynamic max height so bottom sheet adapts smoothly to available screen height above keyboard
  const modalMaxHeight = isKeyboardOpen
    ? Math.max(screenHeight - keyboardHeight - 16, 260)
    : screenHeight * 0.90;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.modalOverlay}
      >
        <View
          style={[
            styles.modalContainer,
            {
              maxHeight: modalMaxHeight,
              ...(Platform.OS === 'android' && isKeyboardOpen ? { marginBottom: keyboardHeight } : {}),
            },
          ]}
        >
          {/* Header */}
          <View style={styles.modalHeader}>
            <View style={{ flex: 1 }}>
              <Text style={styles.modalTitle}>
                {mode === 'create_from_order' ? 'Review & Save Bill' : 'Edit Saved Bill'}
              </Text>
              <Text style={styles.modalSubtitle} numberOfLines={1}>
                {mode === 'create_from_order'
                  ? `Order #${orderId} • ${customerName || 'Customer'}`
                  : `Invoice #${invoiceNumber || invoiceId} • ${customerName || 'Customer'}`}
              </Text>
            </View>
            <TouchableOpacity
              onPress={onClose}
              style={styles.closeBtn}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="close" size={22} color="#6B7280" />
            </TouchableOpacity>
          </View>

          <KeyboardAwareScrollView
            ref={scrollViewRef}
            style={styles.modalBody}
            contentContainerStyle={styles.modalScrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={true}
            enableOnAndroid={true}
            enableAutomaticScroll={true}
            extraHeight={140}
            extraScrollHeight={100}
            bounces={false}
          >
            {/* Delivery Metadata (Read Only Info) */}
            <View style={styles.metaInfoCard}>
              <View style={styles.metaRow}>
                <Ionicons name="bicycle-outline" size={14} color="#8C331A" style={{ marginRight: 6 }} />
                <Text style={styles.metaLabel}>Delivery Partner:</Text>
                <Text style={styles.metaValue} numberOfLines={1}>{deliveryPartnerName || 'Assigned Driver'}</Text>
              </View>
              {(deliveryDate || deliveryTime) && (
                <View style={[styles.metaRow, { marginTop: 4 }]}>
                  <Ionicons name="time-outline" size={14} color="#8C331A" style={{ marginRight: 6 }} />
                  <Text style={styles.metaLabel}>Delivered At:</Text>
                  <Text style={styles.metaValue}>
                    {deliveryDate || ''} {deliveryTime || ''}
                  </Text>
                </View>
              )}
            </View>

            {/* Quantity discrepancy banner if delivered > ordered */}
            {itemsWithExcessDelivered.length > 0 && (
              <View style={styles.warningBanner}>
                <Ionicons name="warning-outline" size={16} color="#D97706" style={{ marginRight: 6 }} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.warningTitle}>Quantity Notice</Text>
                  <Text style={styles.warningSubtitle}>
                    Delivered quantity exceeds ordered quantity on {itemsWithExcessDelivered.map(i => i.product_name).join(', ')}. Review before saving.
                  </Text>
                </View>
              </View>
            )}

            {/* Product Items Table Header */}
            <View style={styles.tableHeaderRow}>
              <Text style={[styles.tableHeaderCol, { flex: 2 }]}>PRODUCT</Text>
              <Text style={[styles.tableHeaderCol, { flex: 1, textAlign: 'center' }]}>QTY</Text>
              <Text style={[styles.tableHeaderCol, { flex: 1.2, textAlign: 'center' }]}>RATE (₹)</Text>
              <Text style={[styles.tableHeaderCol, { flex: 1.2, textAlign: 'right' }]}>TOTAL</Text>
              <View style={{ width: 28 }} />
            </View>

            {/* Editable Line Items */}
            {items.map((item, index) => {
              const lineTotal = ((item.quantity || 0) * (parseFloat(item.unit_price) || 0)).toFixed(0);
              const isExcess = item.ordered_quantity !== undefined && item.quantity > item.ordered_quantity;
              return (
                <View key={item.id || index} style={styles.itemRow}>
                  <View style={{ flex: 2, marginRight: 6 }}>
                    <Text style={styles.itemProductName} numberOfLines={2}>
                      {item.product_name}
                    </Text>
                    {item.ordered_quantity !== undefined && (
                      <Text style={[styles.itemDiscrepancyHint, isExcess && styles.excessHint]}>
                        Ordered: {item.ordered_quantity} • Delivered: {item.quantity}
                        {isExcess ? ' (Exceeds Ordered)' : ''}
                      </Text>
                    )}
                  </View>

                  {/* QTY Input */}
                  <View style={{ flex: 1, alignItems: 'center' }}>
                    <TextInput
                      style={styles.cellInput}
                      keyboardType="numeric"
                      value={String(item.quantity)}
                      onChangeText={t => handleQtyChange(index, t)}
                    />
                  </View>

                  {/* Rate Input */}
                  <View style={{ flex: 1.2, alignItems: 'center' }}>
                    <TextInput
                      style={styles.cellInput}
                      keyboardType="decimal-pad"
                      value={item.unit_price}
                      onChangeText={t => handlePriceChange(index, t)}
                    />
                  </View>

                  {/* Line Total */}
                  <Text style={[styles.cellTotalText, { flex: 1.2, textAlign: 'right' }]}>
                    ₹{lineTotal}
                  </Text>

                  {/* Remove Item */}
                  <TouchableOpacity
                    onPress={() => requestRemoveItem(index)}
                    style={styles.trashBtn}
                    hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                  >
                    <Ionicons name="trash-outline" size={16} color="#DC2626" />
                  </TouchableOpacity>
                </View>
              );
            })}

            {/* + Add Product Button */}
            <TouchableOpacity
              style={styles.addProductBtn}
              onPress={handleOpenAddProduct}
              activeOpacity={0.7}
            >
              <Ionicons name="add-circle-outline" size={16} color="#8C331A" style={{ marginRight: 6 }} />
              <Text style={styles.addProductBtnText}>+ Add Product</Text>
            </TouchableOpacity>

            {/* Summary & Calculations Section */}
            <View style={styles.calculationCard}>
              <View style={styles.calcRow}>
                <Text style={styles.calcLabel}>Total Quantity:</Text>
                <Text style={styles.calcValue}>{totalQuantity} units</Text>
              </View>

              <View style={styles.calcRow}>
                <Text style={styles.calcLabel}>Subtotal:</Text>
                <Text style={styles.calcValue}>₹{subtotal.toFixed(0)}</Text>
              </View>

              {/* Discount Input */}
              <View style={styles.calcRow}>
                <Text style={styles.calcLabel}>Discount (₹):</Text>
                <TextInput
                  style={styles.discountInput}
                  keyboardType="numeric"
                  value={discount}
                  onChangeText={t => setDiscount(t.replace(/[^0-9.]/g, ''))}
                  placeholder="0"
                />
              </View>

              <View style={styles.calcDivider} />

              <View style={styles.calcRow}>
                <Text style={styles.grandTotalLabel}>Final Bill Amount:</Text>
                <Text style={styles.grandTotalValue}>₹{grandTotal.toFixed(0)}</Text>
              </View>
            </View>

            {/* Notes */}
            <Text style={styles.fieldLabel}>ORDER & BILLING NOTES (OPTIONAL)</Text>
            <View style={styles.notesBox}>
              <TextInput
                style={styles.notesInput}
                placeholder="Remarks or customer requests..."
                placeholderTextColor="#9CA3AF"
                value={notes}
                onChangeText={setNotes}
                multiline
                onFocus={() => {
                  setTimeout(() => {
                    scrollViewRef.current?.scrollToEnd({ animated: true });
                  }, 100);
                }}
              />
            </View>

            {/* Audit Reason (Required when editing an existing saved bill) */}
            {mode === 'edit_invoice' && (
              <View style={{ marginTop: 12 }}>
                <Text style={[styles.fieldLabel, { color: '#DC2626' }]}>
                  REASON FOR EDIT (AUDIT LOG) *
                </Text>
                <View style={[styles.notesBox, { borderColor: '#FECACA', backgroundColor: '#FEF2F2' }]}>
                  <TextInput
                    style={styles.notesInput}
                    placeholder="e.g. Quantity discrepancy corrected, agreed client discount..."
                    placeholderTextColor="#9CA3AF"
                    value={editReason}
                    onChangeText={setEditReason}
                    onFocus={() => {
                      setTimeout(() => {
                        scrollViewRef.current?.scrollToEnd({ animated: true });
                      }, 100);
                    }}
                  />
                </View>
              </View>
            )}

            <View style={{ height: 16 }} />
          </KeyboardAwareScrollView>

          {/* Modal Actions Footer */}
          <View style={styles.modalFooter}>
            <TouchableOpacity
              style={styles.cancelActionBtn}
              onPress={onClose}
              disabled={isSaving}
              activeOpacity={0.7}
            >
              <Text style={styles.cancelActionText}>Cancel / Go Back</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.saveActionBtn, isSaving && { opacity: 0.7 }]}
              onPress={handleSave}
              disabled={isSaving}
              activeOpacity={0.85}
            >
              {isSaving ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Ionicons name="checkmark-done" size={17} color="#FFFFFF" style={{ marginRight: 6 }} />
                  <Text style={styles.saveActionText}>
                    {mode === 'create_from_order'
                      ? `Save Bill (₹${grandTotal.toFixed(0)})`
                      : `Save Edits (₹${grandTotal.toFixed(0)})`}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Product Delete Confirmation Dialog */}
        <ConfirmDialog
          visible={deleteIndex !== null}
          title="Remove Product?"
          description={
            itemToDelete
              ? `Are you sure you want to remove "${itemToDelete.product_name}" from this bill?`
              : 'Are you sure you want to remove this product from the bill?'
          }
          type="danger"
          confirmLabel="Remove"
          cancelLabel="Cancel"
          onConfirm={confirmRemoveItem}
          onCancel={() => setDeleteIndex(null)}
        />

        {/* Add Product Sub-Modal */}
        <Modal
          visible={showAddProductModal}
          transparent
          animationType="fade"
          onRequestClose={() => setShowAddProductModal(false)}
        >
          <View style={styles.pickerOverlay}>
            <View style={styles.pickerContainer}>
              <View style={styles.pickerHeader}>
                <Text style={styles.pickerTitle}>Add Product to Bill</Text>
                <TouchableOpacity
                  onPress={() => setShowAddProductModal(false)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons name="close" size={20} color="#6B7280" />
                </TouchableOpacity>
              </View>

              <View style={styles.searchRow}>
                <Ionicons name="search" size={16} color="#9CA3AF" style={{ marginRight: 6 }} />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search products..."
                  placeholderTextColor="#9CA3AF"
                  value={productSearch}
                  onChangeText={setProductSearch}
                  autoFocus
                />
                {productSearch ? (
                  <TouchableOpacity onPress={() => setProductSearch('')}>
                    <Ionicons name="close-circle" size={16} color="#9CA3AF" />
                  </TouchableOpacity>
                ) : null}
              </View>

              {loadingProducts ? (
                <View style={styles.pickerLoading}>
                  <ActivityIndicator size="small" color="#8C331A" />
                  <Text style={styles.pickerLoadingText}>Loading products...</Text>
                </View>
              ) : (
                <FlatList
                  data={filteredProducts}
                  keyExtractor={item => String(item.id)}
                  keyboardShouldPersistTaps="handled"
                  style={{ maxHeight: 280 }}
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      style={styles.productPickerRow}
                      onPress={() => handleSelectProduct(item)}
                      activeOpacity={0.7}
                    >
                      <View style={{ flex: 1 }}>
                        <Text style={styles.productPickerName}>{item.name}</Text>
                        {item.category_name && (
                          <Text style={styles.productPickerCategory}>{item.category_name}</Text>
                        )}
                      </View>
                      <Text style={styles.productPickerPrice}>₹{parseFloat(item.price || '0').toFixed(0)}</Text>
                      <Ionicons name="add-circle" size={20} color="#8C331A" style={{ marginLeft: 8 }} />
                    </TouchableOpacity>
                  )}
                  ListEmptyComponent={
                    <View style={styles.emptyList}>
                      <Text style={styles.emptyListText}>No products found</Text>
                    </View>
                  }
                />
              )}

              <TouchableOpacity
                style={styles.pickerCloseBtn}
                onPress={() => setShowAddProductModal(false)}
              >
                <Text style={styles.pickerCloseBtnText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    width: '100%',
    display: 'flex',
    flexDirection: 'column',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#E8D7CE',
    backgroundColor: '#FAF5F0',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#8C331A',
  },
  modalSubtitle: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 1,
  },
  closeBtn: {
    padding: 4,
  },
  modalBody: {
    paddingHorizontal: 16,
    paddingTop: 12,
    flexShrink: 1,
  },
  modalScrollContent: {
    paddingBottom: 24,
  },
  metaInfoCard: {
    backgroundColor: '#FDF2EC',
    borderRadius: 8,
    padding: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E8D7CE',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaLabel: {
    fontSize: 11,
    color: '#6B7280',
    marginRight: 6,
  },
  metaValue: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1F2937',
    flex: 1,
  },
  warningBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FCD34D',
    borderRadius: 8,
    padding: 10,
    marginBottom: 10,
  },
  warningTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#B45309',
  },
  warningSubtitle: {
    fontSize: 11,
    color: '#92400E',
    marginTop: 1,
  },
  tableHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 8,
    backgroundColor: '#FAF5F0',
    borderRadius: 6,
    marginBottom: 6,
  },
  tableHeaderCol: {
    fontSize: 10,
    fontWeight: '800',
    color: '#8C331A',
    letterSpacing: 0.5,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  itemProductName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1F2937',
  },
  itemDiscrepancyHint: {
    fontSize: 10,
    color: '#6B7280',
    fontWeight: '600',
    marginTop: 1,
  },
  excessHint: {
    color: '#D97706',
    fontWeight: '700',
  },
  cellInput: {
    borderWidth: 1,
    borderColor: '#E8D7CE',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 4,
    fontSize: 12,
    fontWeight: '700',
    color: '#1F2937',
    textAlign: 'center',
    minWidth: 44,
    backgroundColor: '#FFFFFF',
  },
  cellTotalText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#8C331A',
  },
  trashBtn: {
    width: 28,
    alignItems: 'flex-end',
    padding: 2,
  },
  addProductBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    marginVertical: 8,
    borderWidth: 1,
    borderColor: '#8C331A',
    borderStyle: 'dashed',
    borderRadius: 8,
    backgroundColor: '#FAF5F0',
  },
  addProductBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#8C331A',
  },
  calculationCard: {
    backgroundColor: '#FDF9F6',
    borderWidth: 1,
    borderColor: '#E8D7CE',
    borderRadius: 10,
    padding: 12,
    marginVertical: 10,
  },
  calcRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 3,
  },
  calcLabel: {
    fontSize: 12,
    color: '#4B5563',
    fontWeight: '600',
  },
  calcValue: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1F2937',
  },
  discountInput: {
    borderWidth: 1,
    borderColor: '#E8D7CE',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    fontSize: 12,
    fontWeight: '700',
    color: '#8C331A',
    textAlign: 'right',
    minWidth: 64,
    backgroundColor: '#FFFFFF',
  },
  calcDivider: {
    height: 1,
    backgroundColor: '#E8D7CE',
    marginVertical: 8,
  },
  grandTotalLabel: {
    fontSize: 14,
    fontWeight: '800',
    color: '#2C1810',
  },
  grandTotalValue: {
    fontSize: 17,
    fontWeight: '900',
    color: '#8C331A',
  },
  fieldLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#8C331A',
    marginBottom: 6,
    letterSpacing: 0.5,
  },
  notesBox: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E8D7CE',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  notesInput: {
    fontSize: 12,
    color: '#1F2937',
    minHeight: 44,
  },
  modalFooter: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: Platform.OS === 'ios' ? 24 : 12,
    borderTopWidth: 1,
    borderTopColor: '#E8D7CE',
    backgroundColor: '#FFFFFF',
  },
  cancelActionBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#D1D5DB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelActionText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#4B5563',
  },
  saveActionBtn: {
    flex: 1.5,
    backgroundColor: '#8C331A',
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
  },
  saveActionText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  pickerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  pickerContainer: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    maxHeight: '70%',
    elevation: 5,
  },
  pickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  pickerTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#8C331A',
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginBottom: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: '#1F2937',
    paddingVertical: 2,
  },
  pickerLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    gap: 8,
  },
  pickerLoadingText: {
    fontSize: 12,
    color: '#6B7280',
  },
  productPickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  productPickerName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1F2937',
  },
  productPickerCategory: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 1,
  },
  productPickerPrice: {
    fontSize: 13,
    fontWeight: '800',
    color: '#8C331A',
  },
  emptyList: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  emptyListText: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  pickerCloseBtn: {
    marginTop: 12,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    alignItems: 'center',
  },
  pickerCloseBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#4B5563',
  },
});

export default BillReviewModal;
