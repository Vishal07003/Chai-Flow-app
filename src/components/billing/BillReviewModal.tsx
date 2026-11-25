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
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { colors } from '../../theme';
import { AppDatePicker } from '../common';
import AppToast from '../../utils/toast';

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
  initialDueDate = null,
  onSaveSuccess,
  saveAction,
}) => {
  const [items, setItems] = useState<BillReviewItem[]>([]);
  const [discount, setDiscount] = useState<string>('0');
  const [notes, setNotes] = useState<string>('');
  const [dueDate, setDueDate] = useState<string>('');
  const [editReason, setEditReason] = useState<string>('');
  const [isSaving, setIsSaving] = useState<boolean>(false);

  useEffect(() => {
    if (visible) {
      setItems(initialItems.map(it => ({ ...it })));
      setDiscount(initialDiscount || '0');
      setNotes(initialNotes || '');
      setDueDate(initialDueDate || '');
      setEditReason('');
      setIsSaving(false);
    }
  }, [visible, initialItems, initialDiscount, initialNotes, initialDueDate]);

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

  // Item Removal
  const handleRemoveItem = (index: number) => {
    if (items.length <= 1) {
      AppToast.warning('Cannot Remove', 'A bill must have at least one product item.');
      return;
    }
    setItems(prev => prev.filter((_, i) => i !== index));
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
        due_date: dueDate.trim() || null,
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

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          {/* Header */}
          <View style={styles.modalHeader}>
            <View>
              <Text style={styles.modalTitle}>
                {mode === 'create_from_order' ? 'Review & Save Bill' : 'Edit Saved Bill'}
              </Text>
              <Text style={styles.modalSubtitle}>
                {mode === 'create_from_order'
                  ? `Order #${orderId} • ${customerName || 'Customer'}`
                  : `Invoice #${invoiceNumber || invoiceId} • ${customerName || 'Customer'}`}
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="close" size={22} color="#6B7280" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
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
              return (
                <View key={item.id || index} style={styles.itemRow}>
                  <View style={{ flex: 2, marginRight: 6 }}>
                    <Text style={styles.itemProductName} numberOfLines={2}>
                      {item.product_name}
                    </Text>
                    {item.ordered_quantity !== undefined && item.ordered_quantity !== item.quantity && (
                      <Text style={styles.itemDiscrepancyHint}>
                        Ordered: {item.ordered_quantity} • Delivered: {item.quantity}
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
                    onPress={() => handleRemoveItem(index)}
                    style={styles.trashBtn}
                    hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                  >
                    <Ionicons name="trash-outline" size={16} color="#DC2626" />
                  </TouchableOpacity>
                </View>
              );
            })}

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

            {/* Optional Due Date */}
            <AppDatePicker
              label="Payment Due Date (Optional)"
              value={dueDate}
              onChange={setDueDate}
              placeholder="Select Due Date"
              clearable={true}
              style={{ marginBottom: 12 }}
            />

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
                  />
                </View>
              </View>
            )}

            <View style={{ height: 24 }} />
          </ScrollView>

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
                    {mode === 'create_from_order' ? `Save Bill (₹${grandTotal.toFixed(0)})` : `Save Edits (₹${grandTotal.toFixed(0)})`}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>
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
  modalContainer: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
    paddingBottom: 24,
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
  },
  metaInfoCard: {
    backgroundColor: '#FDF2EC',
    borderRadius: 8,
    padding: 10,
    marginBottom: 12,
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
    color: '#D97706',
    fontWeight: '600',
    marginTop: 1,
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
  calculationCard: {
    backgroundColor: '#FDF9F6',
    borderWidth: 1,
    borderColor: '#E8D7CE',
    borderRadius: 10,
    padding: 12,
    marginVertical: 12,
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
    minHeight: 36,
  },
  modalFooter: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 16,
    paddingTop: 10,
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
});

export default BillReviewModal;
