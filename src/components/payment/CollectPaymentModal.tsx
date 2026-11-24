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
  Keyboard,
  ActivityIndicator,
  Dimensions,
  BackHandler,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { colors, typography, radius, spacing, shadows } from '../../theme';

export interface CollectPaymentFormData {
  amount: number;
  paymentMethod: 'cash';
  notes: string;
}

export interface CollectPaymentModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (data: CollectPaymentFormData) => Promise<void> | void;
  customerName?: string;
  totalPendingAmount?: number | string;
  initialAmount?: number | string;
}

export default function CollectPaymentModal({
  visible,
  onClose,
  onSubmit,
  customerName = 'Customer',
  totalPendingAmount = 0,
  initialAmount,
}: CollectPaymentModalProps) {
  const [amountInput, setAmountInput] = useState<string>('');
  const paymentMethod: 'cash' = 'cash';
  const [notes, setNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');

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
  }, [visible, isKeyboardVisible]);

  const handleClose = () => {
    Keyboard.dismiss();
    setErrorMessage('');
    onClose();
  };

  const handleFullAmount = () => {
    if (numPending > 0) {
      setAmountInput(String(numPending));
    }
  };

  const handleSubmit = async () => {
    Keyboard.dismiss();
    const amt = parseFloat(amountInput);
    if (isNaN(amt) || amt <= 0) {
      setErrorMessage('Please enter a valid payment amount greater than ₹0');
      return;
    }

    setErrorMessage('');
    setIsSubmitting(true);
    try {
      await onSubmit({
        amount: amt,
        paymentMethod,
        notes: notes.trim(),
      });
      handleClose();
    } catch (err: any) {
      setErrorMessage(err?.message || err?.detail || 'Failed to record payment');
    } finally {
      setIsSubmitting(false);
    }
  };

  const windowHeight = Dimensions.get('window').height;
  const numEntered = parseFloat(amountInput) || 0;
  const remainingDue = Math.max(0, numPending - numEntered);

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
            if (isKeyboardVisible) {
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
              { maxHeight: isKeyboardVisible ? windowHeight * 0.75 : windowHeight * 0.85 },
            ]}
          >
            {/* Header */}
            <View style={styles.modalHeader}>
              <View style={styles.headerTitleRow}>
                <View style={styles.headerIconCircle}>
                  <Ionicons name="cash" size={16} color="#8C331A" />
                </View>
                <View>
                  <Text style={styles.modalTitle}>Collect Payment</Text>
                  <Text style={styles.modalSubtitle} numberOfLines={1}>
                    {customerName} • Settle open balance
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                onPress={handleClose}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                style={styles.closeBtn}
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
                  <Ionicons name="alert-circle" size={16} color="#DC2626" />
                  <Text style={styles.errorBannerText}>{errorMessage}</Text>
                </View>
              ) : null}

              {/* Outstanding Balance Banner */}
              <View style={styles.dueBalanceBanner}>
                <View>
                  <Text style={styles.dueBalanceLabel}>Current Balance Due</Text>
                  <Text style={styles.dueBalanceAmount}>₹{numPending.toLocaleString()}</Text>
                </View>
                {numPending > 0 && (
                  <TouchableOpacity
                    style={styles.payFullChip}
                    onPress={handleFullAmount}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.payFullChipText}>Pay Full</Text>
                  </TouchableOpacity>
                )}
              </View>

              {/* Amount Input */}
              <Text style={styles.fieldLabel}>
                COLLECTION AMOUNT (₹) <Text style={styles.requiredStar}>*</Text>
              </Text>
              <View style={styles.amountInputRow}>
                <Text style={styles.currencyPrefix}>₹</Text>
                <TextInput
                  style={styles.amountInput}
                  keyboardType="numeric"
                  placeholder="0"
                  placeholderTextColor="#A09489"
                  value={amountInput}
                  onChangeText={setAmountInput}
                  autoFocus={true}
                />
              </View>

              {/* Payment Method - Fixed Cash Only Badge */}
              <Text style={styles.fieldLabel}>PAYMENT METHOD</Text>
              <View style={styles.fixedCashBadge}>
                <Ionicons name="cash-outline" size={16} color={colors.primary} style={{ marginRight: 6 }} />
                <Text style={styles.fixedCashText}>Payment Mode: Cash</Text>
              </View>

              {/* Notes / Reference */}
              <Text style={styles.fieldLabel}>NOTES / REFERENCE (OPTIONAL)</Text>
              <TextInput
                style={styles.notesInput}
                placeholder="e.g. Cash collected at counter"
                placeholderTextColor="#A0958D"
                value={notes}
                onChangeText={setNotes}
              />

              {/* Calculation Summary */}
              {numPending > 0 && numEntered > 0 && (
                <View style={styles.calculationBox}>
                  <Text style={styles.calcLabel}>Remaining Balance After Payment:</Text>
                  <Text
                    style={[
                      styles.calcValue,
                      remainingDue === 0 ? styles.calcValueSuccess : styles.calcValuePending,
                    ]}
                  >
                    ₹{remainingDue.toLocaleString()}
                  </Text>
                </View>
              )}
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
                style={[styles.submitBtn, isSubmitting && styles.submitBtnDisabled]}
                onPress={handleSubmit}
                disabled={isSubmitting}
                activeOpacity={0.85}
              >
                {isSubmitting ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <>
                    <Ionicons name="checkmark-circle" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
                    <Text style={styles.submitBtnText}>Record Payment</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </View>
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
    flexDirection: 'column',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F0EBE6',
    backgroundColor: '#FFFFFF',
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
    backgroundColor: '#F7EBE4',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#2A2421',
  },
  modalSubtitle: {
    fontSize: 11,
    color: '#8E8278',
    marginTop: 1,
  },
  closeBtn: {
    padding: 6,
    borderRadius: 16,
    backgroundColor: '#FAF7F4',
  },
  modalBody: {
    flexShrink: 1,
  },
  bodyScrollContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 16,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginBottom: 10,
  },
  errorBannerText: {
    fontSize: 12,
    color: '#DC2626',
    fontWeight: '600',
    marginLeft: 6,
    flex: 1,
  },
  dueBalanceBanner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FAF7F4',
    borderWidth: 1,
    borderColor: '#E6DDD5',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 12,
  },
  dueBalanceLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#8E8278',
  },
  dueBalanceAmount: {
    fontSize: 18,
    fontWeight: '900',
    color: '#8C331A',
    marginTop: 1,
  },
  payFullChip: {
    backgroundColor: '#F7EBE4',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#EFE5DF',
  },
  payFullChipText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#8C331A',
  },
  fieldLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#8E8278',
    letterSpacing: 0.5,
    marginTop: 8,
    marginBottom: 4,
  },
  requiredStar: {
    color: '#DC2626',
    fontWeight: '700',
  },
  amountInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FAF7F4',
    borderWidth: 1,
    borderColor: '#E6DDD5',
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 44,
  },
  currencyPrefix: {
    fontSize: 18,
    fontWeight: '800',
    color: '#8C331A',
    marginRight: 6,
  },
  amountInput: {
    flex: 1,
    fontSize: 16,
    fontWeight: '800',
    color: '#2A2421',
    paddingVertical: 0,
  },
  fixedCashBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F4EBE6',
    borderWidth: 1.5,
    borderColor: colors.primary,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    alignSelf: 'flex-start',
    gap: spacing.xs,
  },
  fixedCashText: {
    ...typography.body,
    fontFamily: 'Inter-SemiBold',
    fontWeight: '600',
    color: colors.primary,
  },
  methodChipsRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 6,
  },
  methodChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 7,
    borderRadius: 8,
    backgroundColor: '#FAF7F4',
    borderWidth: 1,
    borderColor: '#E6DDD5',
  },
  methodChipActive: {
    backgroundColor: '#8C331A',
    borderColor: '#8C331A',
  },
  methodChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#6B5E55',
  },
  methodChipTextActive: {
    color: '#FFFFFF',
  },
  notesInput: {
    backgroundColor: '#FAF7F4',
    borderWidth: 1,
    borderColor: '#E6DDD5',
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 40,
    fontSize: 13,
    color: '#2A2421',
  },
  calculationBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FDFCFB',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
    marginTop: 10,
    borderWidth: 0.5,
    borderColor: '#EFEAE4',
  },
  calcLabel: {
    fontSize: 11,
    color: '#8E8278',
    fontWeight: '600',
  },
  calcValue: {
    fontSize: 13,
    fontWeight: '800',
  },
  calcValueSuccess: {
    color: '#059669',
  },
  calcValuePending: {
    color: '#D97706',
  },
  modalFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#F0EBE6',
    backgroundColor: '#FFFFFF',
    gap: 10,
  },
  cancelBtn: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 8,
    backgroundColor: '#FAF7F4',
    borderWidth: 1,
    borderColor: '#E6DDD5',
  },
  cancelBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#6B5E55',
  },
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#8C331A',
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 8,
  },
  submitBtnDisabled: {
    opacity: 0.6,
  },
  submitBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
  },
});
