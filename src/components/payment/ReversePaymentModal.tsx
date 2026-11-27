import React, { useState, useEffect } from 'react';
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
  ActivityIndicator,
  Alert,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { colors, typography, radius, spacing, shadows } from '../../theme';

export interface AllocationDetail {
  invoice_number?: string;
  allocated_amount: string | number;
}

export interface ReversePaymentModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (reason: string) => Promise<void> | void;
  customerName?: string;
  paymentId?: number | string;
  amount: number | string;
  paymentDate?: string;
  allocations?: AllocationDetail[];
}

export default function ReversePaymentModal({
  visible,
  onClose,
  onSubmit,
  customerName = 'Customer',
  paymentId,
  amount = 0,
  paymentDate = 'N/A',
  allocations = [],
}: ReversePaymentModalProps) {
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (visible) {
      setReason('');
      setSubmitting(false);
    }
  }, [visible]);

  const numAmount = typeof amount === 'number' ? amount : parseFloat(amount || '0') || 0;

  const handlePressReverse = () => {
    const trimmedReason = reason.trim();
    if (!trimmedReason) {
      Alert.alert('Mandatory Reason Required', 'Please enter a clear explanation for reversing this payment.');
      return;
    }

    const allocBreakdownText = allocations && allocations.length > 0
      ? `\n\nAffected Invoice Allocations:\n` + allocations.map(a => `• Invoice #${a.invoice_number || 'N/A'}: ₹${parseFloat(String(a.allocated_amount) || '0').toLocaleString('en-IN')}`).join('\n')
      : '';

    Alert.alert(
      'Confirm Payment Reversal',
      `Customer: ${customerName}\nOriginal Payment: ₹${numAmount.toLocaleString('en-IN')}${allocBreakdownText}\n\nReversal Reason:\n"${trimmedReason}"\n\nThis will restore the affected invoice balance(s). The original payment record will remain in history marked as Reversed.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reverse Payment',
          style: 'destructive',
          onPress: async () => {
            if (submitting) return; // Prevent duplicate submission
            try {
              setSubmitting(true);
              await onSubmit(trimmedReason);
              onClose();
            } catch (err: any) {
              Alert.alert('Reversal Failed', err?.message || 'Could not reverse payment. Please try again.');
            } finally {
              setSubmitting(false);
            }
          },
        },
      ]
    );
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={() => {
        if (!submitting) onClose();
      }}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.overlay}
      >
        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={() => {
            if (!submitting) onClose();
          }}
        />

        <View style={styles.sheetContainer}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerIconWrap}>
              <Ionicons name="arrow-undo" size={20} color="#DC2626" />
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={styles.headerTitle}>Reverse Payment</Text>
              <Text style={styles.headerSubtitle}>
                Payment #{paymentId || 'N/A'} • {customerName}
              </Text>
            </View>
            <TouchableOpacity
              onPress={onClose}
              disabled={submitting}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="close" size={24} color="#6B7280" />
            </TouchableOpacity>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.content}
          >
            {/* Details Card */}
            <View style={styles.summaryCard}>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Customer</Text>
                <Text style={styles.summaryValue} numberOfLines={1}>
                  {customerName}
                </Text>
              </View>

              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Original Amount</Text>
                <Text style={[styles.summaryValue, { color: '#DC2626', fontWeight: '800' }]}>
                  ₹{numAmount.toLocaleString('en-IN')}
                </Text>
              </View>

              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Payment Date</Text>
                <Text style={styles.summaryValue}>{paymentDate}</Text>
              </View>
            </View>

            {/* Allocations breakdown */}
            {allocations && allocations.length > 0 && (
              <View style={styles.allocationsContainer}>
                <Text style={styles.sectionLabel}>INVOICE ALLOCATIONS TO BE REVERSED</Text>
                {allocations.map((alloc, idx) => (
                  <View key={idx} style={styles.allocRow}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <Ionicons name="receipt-outline" size={14} color="#8C331A" style={{ marginRight: 6 }} />
                      <Text style={styles.allocInvoiceText}>
                        {alloc.invoice_number || 'Direct Invoice'}
                      </Text>
                    </View>
                    <Text style={styles.allocAmountText}>
                      ₹{parseFloat(String(alloc.allocated_amount || 0)).toLocaleString('en-IN')}
                    </Text>
                  </View>
                ))}
              </View>
            )}

            {/* Mandatory Reason Input */}
            <View style={styles.inputSection}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
                <Text style={styles.inputLabel}>REVERSAL REASON</Text>
                <Text style={styles.requiredStar}> *</Text>
              </View>
              <TextInput
                style={styles.reasonInput}
                multiline
                numberOfLines={3}
                placeholder="e.g. Accidental duplicate entry, customer disputed, incorrect amount..."
                placeholderTextColor="#9CA3AF"
                value={reason}
                onChangeText={setReason}
                editable={!submitting}
                textAlignVertical="top"
              />
              <Text style={styles.inputHint}>
                A clear reason is required for immutable audit and ledger integrity.
              </Text>
            </View>

            {/* Notice banner */}
            <View style={styles.noticeBox}>
              <Ionicons name="information-circle-outline" size={16} color="#DC2626" style={{ marginRight: 6, marginTop: 1 }} />
              <Text style={styles.noticeText}>
                Reversal cannot be undone. It will safely undo invoice allocations and recalculate the customer's outstanding balance while keeping the historical record intact.
              </Text>
            </View>
          </ScrollView>

          {/* Action Buttons */}
          <View style={styles.footer}>
            <TouchableOpacity
              style={styles.cancelBtn}
              onPress={onClose}
              disabled={submitting}
              activeOpacity={0.7}
            >
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.submitBtn, submitting && styles.submitBtnDisabled]}
              onPress={handlePressReverse}
              disabled={submitting}
              activeOpacity={0.8}
            >
              {submitting ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Ionicons name="arrow-undo" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
                  <Text style={styles.submitBtnText}>Reverse Payment</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
  },
  sheetContainer: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
    paddingBottom: Platform.OS === 'ios' ? 24 : 16,
    ...shadows.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  headerIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FEE2E2',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#111827',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  content: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  summaryCard: {
    backgroundColor: '#FAF5F0',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#EFE6DD',
    marginBottom: 14,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  summaryLabel: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '500',
  },
  summaryValue: {
    fontSize: 13,
    color: '#111827',
    fontWeight: '700',
    maxWidth: '65%',
  },
  allocationsContainer: {
    marginBottom: 16,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
    color: '#8C331A',
    marginBottom: 8,
  },
  allocRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  allocInvoiceText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#111827',
  },
  allocAmountText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#DC2626',
  },
  inputSection: {
    marginBottom: 14,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
    color: '#374151',
  },
  requiredStar: {
    fontSize: 12,
    fontWeight: '800',
    color: '#DC2626',
  },
  reasonInput: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#111827',
    minHeight: 80,
  },
  inputHint: {
    fontSize: 11,
    color: '#9CA3AF',
    marginTop: 4,
    fontStyle: 'italic',
  },
  noticeBox: {
    flexDirection: 'row',
    backgroundColor: '#FEF2F2',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FEE2E2',
    marginTop: 4,
  },
  noticeText: {
    fontSize: 11,
    color: '#991B1B',
    flex: 1,
    lineHeight: 16,
  },
  footer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingTop: 12,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#4B5563',
  },
  submitBtn: {
    flex: 1.6,
    flexDirection: 'row',
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#DC2626',
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitBtnDisabled: {
    opacity: 0.6,
  },
  submitBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
