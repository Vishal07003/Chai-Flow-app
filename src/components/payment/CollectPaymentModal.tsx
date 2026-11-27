import React, { useState, useEffect, useMemo } from 'react';
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
  Dimensions,
  BackHandler,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { colors, typography, radius, spacing, shadows } from '../../theme';
import { BackendInvoice } from '../../services/billing.service';

export interface CollectPaymentFormData {
  amount: number;
  notes?: string;
}

export interface OutstandingInvoiceSummary {
  id: number | string;
  invoice_number: string;
  pending_amount: number;
  created_at?: string;
}

export interface CollectPaymentModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (data: CollectPaymentFormData) => Promise<void> | void;
  customerName?: string;
  totalPendingAmount?: number | string;
  initialAmount?: number | string;
  invoices?: OutstandingInvoiceSummary[] | BackendInvoice[];
}

export default function CollectPaymentModal({
  visible,
  onClose,
  onSubmit,
  customerName = 'Customer',
  totalPendingAmount = 0,
  initialAmount,
  invoices = [],
}: CollectPaymentModalProps) {
  const [amountInput, setAmountInput] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [showConfirmDialog, setShowConfirmDialog] = useState<boolean>(false);

  const numPending = typeof totalPendingAmount === 'string' ? parseFloat(totalPendingAmount) || 0 : totalPendingAmount;

  useEffect(() => {
    if (visible) {
      if (initialAmount !== undefined && initialAmount !== null && initialAmount !== '') {
        setAmountInput(String(initialAmount));
      } else if (numPending > 0) {
        setAmountInput(String(numPending));
      } else {
        setAmountInput('');
      }
      setNotes('');
      setErrorMessage('');
      setIsSubmitting(false);
      setShowConfirmDialog(false);
    }
  }, [visible, initialAmount, numPending]);

  // Keyboard and BackHandler management
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
      if (showConfirmDialog) {
        setShowConfirmDialog(false);
        return true;
      }
      if (isKeyboardVisible) {
        Keyboard.dismiss();
        return true;
      }
      handleClose();
      return true;
    };

    const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);

    return () => {
      showSub.remove();
      hideSub.remove();
      backHandler.remove();
    };
  }, [visible, isKeyboardVisible, showConfirmDialog]);

  const handleClose = () => {
    Keyboard.dismiss();
    setErrorMessage('');
    setShowConfirmDialog(false);
    onClose();
  };

  const handleFullAmount = () => {
    if (numPending > 0) {
      setAmountInput(String(numPending));
      setErrorMessage('');
    }
  };

  const parsedAmount = parseFloat(amountInput);
  const numEntered = isNaN(parsedAmount) || parsedAmount < 0 ? 0 : parsedAmount;

  // Oldest Outstanding First FIFO Allocation Calculation
  // Invoices sorted chronologically by created_at ascending (oldest first)
  const normalizedInvoices: OutstandingInvoiceSummary[] = useMemo(() => {
    if (!invoices || invoices.length === 0) return [];
    return invoices
      .map((inv: any) => ({
        id: inv.id,
        invoice_number: inv.invoice_number || inv.invoiceNo || `INV-${inv.id}`,
        pending_amount: parseFloat(inv.pending_amount) || 0,
        created_at: inv.created_at || inv.date || '',
      }))
      .filter(inv => inv.pending_amount > 0)
      .sort((a, b) => {
        if (!a.created_at && !b.created_at) return 0;
        if (!a.created_at) return 1;
        if (!b.created_at) return -1;
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      });
  }, [invoices]);

  const fifoPreview = useMemo(() => {
    let remainingToAllocate = numEntered;
    let totalAllocated = 0;

    const breakdown = normalizedInvoices.map(inv => {
      if (remainingToAllocate <= 0) {
        return {
          ...inv,
          allocated: 0,
          remainingAfter: inv.pending_amount,
        };
      }
      const toAlloc = Math.min(remainingToAllocate, inv.pending_amount);
      remainingToAllocate -= toAlloc;
      totalAllocated += toAlloc;
      return {
        ...inv,
        allocated: toAlloc,
        remainingAfter: Math.max(0, inv.pending_amount - toAlloc),
      };
    });

    const unappliedCredit = Math.max(0, numEntered - totalAllocated);
    const remainingCustomerBalance = Math.max(0, numPending - numEntered);

    return {
      breakdown,
      totalAllocated,
      unappliedCredit,
      remainingCustomerBalance,
    };
  }, [normalizedInvoices, numEntered, numPending]);

  // Step 1: Open Confirmation Dialog after validating input
  const handleProceedToConfirm = () => {
    Keyboard.dismiss();
    setErrorMessage('');

    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setErrorMessage('Please enter a valid payment amount greater than ₹0.');
      return;
    }

    if (numPending <= 0) {
      setErrorMessage('This customer has no outstanding balance to pay.');
      return;
    }

    setShowConfirmDialog(true);
  };

  // Step 2: Final Single Submission to API after Owner Confirmation
  const handleFinalConfirmSubmit = async () => {
    if (isSubmitting) return; // Prevent duplicate submission
    setIsSubmitting(true);
    setErrorMessage('');

    try {
      await onSubmit({
        amount: parsedAmount,
        notes: notes.trim(),
      });
      setShowConfirmDialog(false);
      handleClose();
    } catch (err: any) {
      setShowConfirmDialog(false);
      setErrorMessage(err?.message || err?.detail || 'Failed to record payment. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const windowHeight = Dimensions.get('window').height;

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={handleClose}
      statusBarTranslucent={true}
    >
      <View style={styles.modalOverlay}>
        <TouchableOpacity
          style={StyleSheet.absoluteFill}
          activeOpacity={1}
          onPress={() => {
            if (showConfirmDialog) {
              setShowConfirmDialog(false);
            } else if (isKeyboardVisible) {
              Keyboard.dismiss();
            } else {
              handleClose();
            }
          }}
        />

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={[
            styles.keyboardContainer,
            isKeyboardVisible && styles.keyboardContainerLifted,
          ]}
          pointerEvents="box-none"
        >
          <View
            style={[
              styles.modalCard,
              { maxHeight: isKeyboardVisible ? windowHeight * 0.75 : windowHeight * 0.88 },
            ]}
          >
            {/* Header */}
            <View style={styles.modalHeader}>
              <View style={styles.headerTitleRow}>
                <View style={styles.headerIconCircle}>
                  <Ionicons name="receipt-outline" size={16} color="#8C331A" />
                </View>
                <View style={{ flex: 1, marginRight: 8 }}>
                  <Text style={styles.modalTitle}>Record Payment</Text>
                  <Text style={styles.modalSubtitle} numberOfLines={1}>
                    {customerName}
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                onPress={handleClose}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                style={styles.closeBtn}
                disabled={isSubmitting}
              >
                <Ionicons name="close" size={18} color="#6B5E55" />
              </TouchableOpacity>
            </View>

            {/* Scrollable Body */}
            <ScrollView
              style={styles.modalBody}
              contentContainerStyle={styles.bodyScrollContent}
              showsVerticalScrollIndicator={true}
              keyboardShouldPersistTaps="handled"
              bounces={false}
            >
              {/* Error Banner */}
              {errorMessage ? (
                <View style={styles.errorBanner}>
                  <Ionicons name="alert-circle" size={16} color="#DC2626" style={{ marginRight: 6 }} />
                  <Text style={styles.errorBannerText}>{errorMessage}</Text>
                </View>
              ) : null}

              {/* Outstanding Balance Banner */}
              <View style={styles.dueBalanceBanner}>
                <View>
                  <Text style={styles.dueBalanceLabel}>Current Total Outstanding</Text>
                  <Text style={styles.dueBalanceAmount}>₹{numPending.toLocaleString('en-IN')}</Text>
                </View>
                {numPending > 0 && (
                  <TouchableOpacity
                    style={styles.payFullChip}
                    onPress={handleFullAmount}
                    activeOpacity={0.8}
                    disabled={isSubmitting}
                  >
                    <Text style={styles.payFullChipText}>Pay Full</Text>
                  </TouchableOpacity>
                )}
              </View>

              {/* Amount Input */}
              <Text style={styles.fieldLabel}>
                PAYMENT AMOUNT (₹) <Text style={styles.requiredStar}>*</Text>
              </Text>
              <View style={styles.amountInputRow}>
                <Text style={styles.currencyPrefix}>₹</Text>
                <TextInput
                  style={styles.amountInput}
                  keyboardType="numeric"
                  placeholder="0"
                  placeholderTextColor="#A09489"
                  value={amountInput}
                  onChangeText={val => {
                    setAmountInput(val);
                    if (errorMessage) setErrorMessage('');
                  }}
                  autoFocus={true}
                  editable={!isSubmitting}
                />
              </View>

              {/* FIFO Allocation Preview Section */}
              {numEntered > 0 && (
                <View style={styles.previewContainer}>
                  <View style={styles.previewHeaderRow}>
                    <Ionicons name="list-outline" size={14} color="#8C331A" style={{ marginRight: 5 }} />
                    <Text style={styles.previewTitle}>FIFO ALLOCATION PREVIEW</Text>
                    <Text style={styles.previewBadge}>Oldest First</Text>
                  </View>

                  {fifoPreview.breakdown.length > 0 ? (
                    fifoPreview.breakdown.map((item, idx) => (
                      <View key={item.id || idx} style={styles.previewItemRow}>
                        <View style={{ flex: 1.5 }}>
                          <Text style={styles.previewInvNumber}>{item.invoice_number}</Text>
                          <Text style={styles.previewInvDue}>
                            Due: ₹{item.pending_amount.toLocaleString('en-IN')}
                          </Text>
                        </View>
                        <View style={{ flex: 1, alignItems: 'flex-end' }}>
                          <Text
                            style={[
                              styles.previewAllocatedAmount,
                              item.allocated > 0 ? styles.allocActive : styles.allocZero,
                            ]}
                          >
                            ₹{item.allocated.toLocaleString('en-IN')} allocated
                          </Text>
                          <Text style={styles.previewRemainingAfter}>
                            Bal: ₹{item.remainingAfter.toLocaleString('en-IN')}
                          </Text>
                        </View>
                      </View>
                    ))
                  ) : (
                    <View style={styles.previewSingleSummary}>
                      <Text style={styles.previewSingleLabel}>Allocated to Outstanding Balance:</Text>
                      <Text style={styles.previewSingleVal}>
                        ₹{Math.min(numEntered, numPending).toLocaleString('en-IN')}
                      </Text>
                    </View>
                  )}

                  {/* Summary of Allocation */}
                  <View style={styles.allocationSummaryBox}>
                    <View style={styles.summaryLine}>
                      <Text style={styles.summaryLineLabel}>Total Allocated:</Text>
                      <Text style={styles.summaryLineVal}>
                        ₹{Math.min(numEntered, numPending).toLocaleString('en-IN')}
                      </Text>
                    </View>
                    <View style={styles.summaryLine}>
                      <Text style={styles.summaryLineLabel}>Remaining Outstanding:</Text>
                      <Text
                        style={[
                          styles.summaryLineVal,
                          { color: fifoPreview.remainingCustomerBalance > 0 ? '#DC2626' : '#059669' },
                        ]}
                      >
                        ₹{fifoPreview.remainingCustomerBalance.toLocaleString('en-IN')}
                      </Text>
                    </View>
                    {fifoPreview.unappliedCredit > 0 && (
                      <View style={styles.summaryLine}>
                        <Text style={[styles.summaryLineLabel, { color: '#059669' }]}>
                          Unapplied Advance Credit:
                        </Text>
                        <Text style={[styles.summaryLineVal, { color: '#059669' }]}>
                          ₹{fifoPreview.unappliedCredit.toLocaleString('en-IN')}
                        </Text>
                      </View>
                    )}
                  </View>
                </View>
              )}

              {/* Notes / Reference (Optional) */}
              <Text style={styles.fieldLabel}>NOTES / REFERENCE (OPTIONAL)</Text>
              <TextInput
                style={styles.notesInput}
                placeholder="e.g. Counter payment settlement"
                placeholderTextColor="#A0958D"
                value={notes}
                onChangeText={setNotes}
                editable={!isSubmitting}
              />
            </ScrollView>

            {/* Fixed Footer Buttons */}
            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={handleClose}
                disabled={isSubmitting}
                activeOpacity={0.7}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.submitBtn, (isSubmitting || numEntered <= 0) && styles.submitBtnDisabled]}
                onPress={handleProceedToConfirm}
                disabled={isSubmitting || numEntered <= 0}
                activeOpacity={0.85}
              >
                <Ionicons name="checkmark-circle" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
                <Text style={styles.submitBtnText}>Record Payment</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </View>

      {/* Mandatory Confirm Payment Dialog Modal */}
      {showConfirmDialog && (
        <Modal
          visible={showConfirmDialog}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setShowConfirmDialog(false)}
        >
          <View style={styles.confirmOverlay}>
            <View style={styles.confirmCard}>
              <View style={styles.confirmHeaderRow}>
                <Ionicons name="alert-circle" size={20} color="#8C331A" style={{ marginRight: 8 }} />
                <Text style={styles.confirmTitle}>Confirm Payment</Text>
              </View>

              <Text style={styles.confirmCustomerText}>
                Customer: <Text style={{ fontWeight: '800', color: '#1F2937' }}>{customerName}</Text>
              </Text>

              <View style={styles.confirmDetailBox}>
                <View style={styles.confirmDetailRow}>
                  <Text style={styles.confirmDetailLabel}>Payment Amount:</Text>
                  <Text style={styles.confirmDetailValMain}>₹{numEntered.toLocaleString('en-IN')}</Text>
                </View>

                <View style={styles.confirmDetailRow}>
                  <Text style={styles.confirmDetailLabel}>Total Allocated:</Text>
                  <Text style={styles.confirmDetailVal}>
                    ₹{Math.min(numEntered, numPending).toLocaleString('en-IN')}
                  </Text>
                </View>

                <View style={styles.confirmDetailRow}>
                  <Text style={styles.confirmDetailLabel}>Remaining Outstanding:</Text>
                  <Text
                    style={[
                      styles.confirmDetailVal,
                      { color: fifoPreview.remainingCustomerBalance > 0 ? '#DC2626' : '#059669' },
                    ]}
                  >
                    ₹{fifoPreview.remainingCustomerBalance.toLocaleString('en-IN')}
                  </Text>
                </View>

                {fifoPreview.unappliedCredit > 0 && (
                  <View style={styles.confirmDetailRow}>
                    <Text style={[styles.confirmDetailLabel, { color: '#059669' }]}>
                      Advance Credit:
                    </Text>
                    <Text style={[styles.confirmDetailVal, { color: '#059669' }]}>
                      ₹{fifoPreview.unappliedCredit.toLocaleString('en-IN')}
                    </Text>
                  </View>
                )}
              </View>

              {/* Allocation Breakdown Preview Snippet */}
              {fifoPreview.breakdown.filter(b => b.allocated > 0).length > 0 && (
                <View style={styles.confirmBreakdownContainer}>
                  <Text style={styles.confirmBreakdownTitle}>Invoice Allocation Breakdown:</Text>
                  {fifoPreview.breakdown
                    .filter(b => b.allocated > 0)
                    .map((item, idx) => (
                      <View key={item.id || idx} style={styles.confirmBreakdownRow}>
                        <Text style={styles.confirmBreakdownInv}>{item.invoice_number}:</Text>
                        <Text style={styles.confirmBreakdownAlloc}>
                          ₹{item.allocated.toLocaleString('en-IN')} allocated
                        </Text>
                      </View>
                    ))}
                </View>
              )}

              {/* Action Buttons: Cancel vs Confirm Payment */}
              <View style={styles.confirmActionsRow}>
                <TouchableOpacity
                  style={styles.confirmCancelBtn}
                  onPress={() => setShowConfirmDialog(false)}
                  disabled={isSubmitting}
                  activeOpacity={0.7}
                >
                  <Text style={styles.confirmCancelText}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.confirmSaveBtn, isSubmitting && styles.submitBtnDisabled]}
                  onPress={handleFinalConfirmSubmit}
                  disabled={isSubmitting}
                  activeOpacity={0.85}
                >
                  {isSubmitting ? (
                    <ActivityIndicator color="#FFFFFF" size="small" />
                  ) : (
                    <Text style={styles.confirmSaveText}>Confirm Payment</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}
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
    maxWidth: 420,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    overflow: 'hidden',
    shadowColor: '#2A2421',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.16,
    shadowRadius: 12,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F3EFEA',
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  headerIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FAF5F2',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
    borderWidth: 1,
    borderColor: '#EFEAE4',
  },
  modalTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1F2937',
  },
  modalSubtitle: {
    fontSize: 11,
    color: '#8C331A',
    fontWeight: '600',
    marginTop: 1,
  },
  closeBtn: {
    padding: 4,
  },
  modalBody: {
    flexGrow: 0,
  },
  bodyScrollContent: {
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 8,
    padding: 10,
    marginBottom: 12,
  },
  errorBannerText: {
    flex: 1,
    fontSize: 12,
    color: '#DC2626',
    fontWeight: '600',
  },
  dueBalanceBanner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FAF8F5',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#EFECE9',
    marginBottom: 14,
  },
  dueBalanceLabel: {
    fontSize: 11,
    color: '#6B7280',
    fontWeight: '600',
  },
  dueBalanceAmount: {
    fontSize: 18,
    fontWeight: '900',
    color: '#8C331A',
    marginTop: 2,
  },
  payFullChip: {
    backgroundColor: '#8C331A',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  payFullChipText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
  },
  fieldLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#8A7A70',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  requiredStar: {
    color: '#DC2626',
  },
  amountInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#8C331A',
    borderRadius: 10,
    paddingHorizontal: 12,
    marginBottom: 14,
    height: 48,
  },
  currencyPrefix: {
    fontSize: 18,
    fontWeight: '800',
    color: '#8C331A',
    marginRight: 6,
  },
  amountInput: {
    flex: 1,
    fontSize: 18,
    fontWeight: '800',
    color: '#1F2937',
    paddingVertical: 8,
  },
  previewContainer: {
    backgroundColor: '#FAF5F2',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E8D7CE',
    marginBottom: 14,
  },
  previewHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    paddingBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#E8D7CE',
  },
  previewTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#8C331A',
    letterSpacing: 0.3,
    flex: 1,
  },
  previewBadge: {
    fontSize: 9,
    fontWeight: '700',
    color: '#8C331A',
    backgroundColor: '#FDEBE4',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  previewItemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#F0E6DE',
  },
  previewInvNumber: {
    fontSize: 12,
    fontWeight: '800',
    color: '#1F2937',
  },
  previewInvDue: {
    fontSize: 10,
    color: '#6B7280',
    marginTop: 1,
  },
  previewAllocatedAmount: {
    fontSize: 12,
    fontWeight: '800',
  },
  allocActive: {
    color: '#059669',
  },
  allocZero: {
    color: '#9CA3AF',
  },
  previewRemainingAfter: {
    fontSize: 10,
    color: '#6B7280',
    marginTop: 1,
  },
  previewSingleSummary: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  previewSingleLabel: {
    fontSize: 12,
    color: '#4B5563',
    fontWeight: '600',
  },
  previewSingleVal: {
    fontSize: 13,
    fontWeight: '800',
    color: '#059669',
  },
  allocationSummaryBox: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#E8D7CE',
  },
  summaryLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 2,
  },
  summaryLineLabel: {
    fontSize: 11,
    color: '#4B5563',
    fontWeight: '600',
  },
  summaryLineVal: {
    fontSize: 12,
    fontWeight: '800',
    color: '#1F2937',
  },
  notesInput: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
    color: '#1F2937',
    marginBottom: 4,
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3EFEA',
    backgroundColor: '#FFFFFF',
  },
  cancelBtn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#4B5563',
  },
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#059669',
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 10,
    minWidth: 140,
  },
  submitBtnDisabled: {
    opacity: 0.6,
  },
  submitBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  confirmOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  confirmCard: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 18,
    shadowColor: '#2A2421',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 12,
  },
  confirmHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  confirmTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1F2937',
  },
  confirmCustomerText: {
    fontSize: 13,
    color: '#4B5563',
    marginBottom: 12,
  },
  confirmDetailBox: {
    backgroundColor: '#FAF8F5',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#EFECE9',
    marginBottom: 12,
  },
  confirmDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  confirmDetailLabel: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '600',
  },
  confirmDetailValMain: {
    fontSize: 16,
    fontWeight: '900',
    color: '#8C331A',
  },
  confirmDetailVal: {
    fontSize: 13,
    fontWeight: '800',
    color: '#1F2937',
  },
  confirmBreakdownContainer: {
    marginBottom: 14,
    paddingHorizontal: 2,
  },
  confirmBreakdownTitle: {
    fontSize: 10,
    fontWeight: '800',
    color: '#8A7A70',
    letterSpacing: 0.3,
    marginBottom: 6,
  },
  confirmBreakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 2,
  },
  confirmBreakdownInv: {
    fontSize: 11,
    fontWeight: '700',
    color: '#374151',
  },
  confirmBreakdownAlloc: {
    fontSize: 11,
    fontWeight: '800',
    color: '#059669',
  },
  confirmActionsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 6,
  },
  confirmCancelBtn: {
    paddingVertical: 9,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D1D5DB',
  },
  confirmCancelText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4B5563',
  },
  confirmSaveBtn: {
    backgroundColor: '#059669',
    paddingVertical: 9,
    paddingHorizontal: 18,
    borderRadius: 8,
    minWidth: 120,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmSaveText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FFFFFF',
  },
});
