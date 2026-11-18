import React, { useState, useEffect, useRef } from 'react';
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
import { validation } from '../../utils/validation';

export interface AddCustomerFormData {
  name: string;
  phone: string;
  address: string;
  openingBalance: number;
}

export interface AddCustomerModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (data: AddCustomerFormData) => Promise<void> | void;
  title?: string;
  initialData?: Partial<AddCustomerFormData>;
  isEditing?: boolean;
}

export default function AddCustomerModal({
  visible,
  onClose,
  onSubmit,
  title = 'New Customer',
  initialData,
  isEditing = false,
}: AddCustomerModalProps) {
  const [name, setName] = useState(initialData?.name || '');
  const [phone, setPhone] = useState(initialData?.phone || '');
  const [address, setAddress] = useState(initialData?.address || '');
  const [openingBalance, setOpeningBalance] = useState(
    initialData?.openingBalance !== undefined ? String(initialData.openingBalance) : '',
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);

  const scrollViewRef = useRef<ScrollView>(null);

  // Sync initialData when modal opens
  useEffect(() => {
    if (visible) {
      if (initialData) {
        setName(initialData.name || '');
        setPhone(initialData.phone || '');
        setAddress(initialData.address || '');
        setOpeningBalance(
          initialData.openingBalance !== undefined ? String(initialData.openingBalance) : '',
        );
      } else {
        setName('');
        setPhone('');
        setAddress('');
        setOpeningBalance('');
      }
      setErrors({});
      setIsSubmitting(false);
    }
  }, [visible, initialData]);

  // Keyboard and Android back listener
  useEffect(() => {
    if (!visible) return;

    const keyboardDidShowListener = Keyboard.addListener(
      Platform.OS === 'android' ? 'keyboardDidShow' : 'keyboardWillShow',
      () => {
        setIsKeyboardVisible(true);
      },
    );

    const keyboardDidHideListener = Keyboard.addListener(
      Platform.OS === 'android' ? 'keyboardDidHide' : 'keyboardWillHide',
      () => {
        setIsKeyboardVisible(false);
      },
    );

    // Hardware Back Handler on Android:
    // If keyboard is open, dismissing keyboard is handled by OS.
    // If keyboard is closed, pressing back closes modal.
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
      keyboardDidShowListener.remove();
      keyboardDidHideListener.remove();
      backHandler.remove();
    };
  }, [visible, isKeyboardVisible]);

  const resetForm = () => {
    setName('');
    setPhone('');
    setAddress('');
    setOpeningBalance('');
    setErrors({});
    setIsSubmitting(false);
  };

  const handleClose = () => {
    Keyboard.dismiss();
    resetForm();
    onClose();
  };

  const handleSubmit = async () => {
    Keyboard.dismiss();
    const trimmedName = name.trim();
    const trimmedPhone = phone.trim();
    const trimmedAddress = address.trim();
    const parsedBalance = openingBalance.trim() ? parseFloat(openingBalance.trim()) : 0;

    const validationResult = validation.validateCustomerForm({
      name: trimmedName,
      phone: trimmedPhone,
      address: trimmedAddress,
      openingBalance: openingBalance.trim(),
    });

    if (!validationResult.isValid) {
      setErrors(validationResult.errors);
      scrollViewRef.current?.scrollTo({ y: 0, animated: true });
      return;
    }

    setErrors({});
    setIsSubmitting(true);
    try {
      await onSubmit({
        name: trimmedName,
        phone: trimmedPhone,
        address: trimmedAddress,
        openingBalance: isNaN(parsedBalance) || parsedBalance < 0 ? 0 : parsedBalance,
      });
      resetForm();
    } catch (err: any) {
      const apiMessage = err?.message || err?.detail || 'Failed to save customer.';
      setErrors({ form: apiMessage });
      scrollViewRef.current?.scrollTo({ y: 0, animated: true });
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
        {/* Backdrop tap dismisses keyboard first, or closes modal if keyboard is closed */}
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
            {/* 1. FIXED HEADER */}
            <View style={styles.modalHeader}>
              <View style={styles.headerTitleRow}>
                <View style={styles.headerIconCircle}>
                  <Ionicons name="person-add" size={14} color="#8C331A" />
                </View>
                <Text style={styles.modalTitle}>{title}</Text>
              </View>

              <TouchableOpacity
                onPress={handleClose}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                style={styles.closeBtn}
                accessibilityLabel="Close customer modal"
              >
                <Ionicons name="close" size={18} color="#6B5E55" />
              </TouchableOpacity>
            </View>

            {/* 2. SCROLLABLE BODY */}
            <ScrollView
              ref={scrollViewRef}
              style={styles.modalBody}
              contentContainerStyle={styles.bodyScrollContent}
              showsVerticalScrollIndicator={true}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="none"
              bounces={false}
            >
              {/* General Form Error Banner */}
              {errors.form ? (
                <View style={styles.errorBanner}>
                  <Ionicons name="alert-circle" size={16} color="#DC2626" />
                  <Text style={styles.errorBannerText}>{errors.form}</Text>
                </View>
              ) : null}

              {/* Field 1: Customer Name (REQUIRED) */}
              <Text style={styles.modalLabel}>
                CUSTOMER NAME <Text style={styles.requiredStar}>*</Text>
              </Text>
              <TextInput
                style={[styles.modalInput, errors.name ? styles.inputError : null]}
                placeholder="e.g. Ramesh Kumar"
                placeholderTextColor="#A0958D"
                value={name}
                onChangeText={val => {
                  setName(val);
                  if (errors.name) {
                    setErrors(prev => ({ ...prev, name: '' }));
                  }
                }}
              />
              {errors.name ? <Text style={styles.errorText}>{errors.name}</Text> : null}

              {/* Field 2: Phone Number (OPTIONAL) */}
              <Text style={styles.modalLabel}>
                PHONE NUMBER <Text style={styles.optionalText}>(Optional)</Text>
              </Text>
              <TextInput
                style={[styles.modalInput, errors.phone ? styles.inputError : null]}
                keyboardType="phone-pad"
                placeholder="e.g. 9876543210"
                placeholderTextColor="#A0958D"
                value={phone}
                maxLength={15}
                onChangeText={val => {
                  setPhone(val);
                  if (errors.phone) {
                    setErrors(prev => ({ ...prev, phone: '' }));
                  }
                }}
              />
              {errors.phone ? <Text style={styles.errorText}>{errors.phone}</Text> : null}

              {/* Field 3: Address / Area (OPTIONAL) */}
              <Text style={styles.modalLabel}>
                ADDRESS / AREA <Text style={styles.optionalText}>(Optional)</Text>
              </Text>
              <TextInput
                style={styles.modalInput}
                placeholder="e.g. Stall 12, Market Area"
                placeholderTextColor="#A0958D"
                value={address}
                onChangeText={setAddress}
              />

              {/* Field 4: Opening Balance (₹) (OPTIONAL) */}
              {!isEditing && (
                <>
                  <Text style={styles.modalLabel}>
                    OPENING BALANCE (₹) <Text style={styles.optionalText}>(Optional)</Text>
                  </Text>
                  <TextInput
                    style={[styles.modalInput, errors.openingBalance ? styles.inputError : null]}
                    keyboardType="numeric"
                    placeholder="0"
                    placeholderTextColor="#A0958D"
                    value={openingBalance}
                    onChangeText={val => {
                      setOpeningBalance(val);
                      if (errors.openingBalance) {
                        setErrors(prev => ({ ...prev, openingBalance: '' }));
                      }
                    }}
                  />
                  {errors.openingBalance ? (
                    <Text style={styles.errorText}>{errors.openingBalance}</Text>
                  ) : null}
                </>
              )}
            </ScrollView>

            {/* 3. FIXED FOOTER (Always visible above keyboard) */}
            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={handleClose}
                disabled={isSubmitting}
                activeOpacity={0.7}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalSubmitBtn, isSubmitting ? styles.submitBtnDisabled : null]}
                onPress={handleSubmit}
                disabled={isSubmitting}
                activeOpacity={0.8}
              >
                {isSubmitting ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Ionicons name="checkmark-circle" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
                    <Text style={styles.modalSubmitText}>Save Customer</Text>
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
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  keyboardContainer: {
    width: '100%',
    maxWidth: 400,
    justifyContent: 'center',
    alignItems: 'center',
  },
  keyboardContainerLifted: {
    // When keyboard is visible, slightly shift upward for natural viewing angle
    marginBottom: Platform.OS === 'android' ? 20 : 0,
  },
  modalCard: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#EFEAE4',
    shadowColor: '#2A2421',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 14,
    elevation: 10,
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
  },
  /* 1. Header */
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F5EBE6',
    backgroundColor: '#FFFFFF',
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerIconCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#F5EBE6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#2A2421',
    letterSpacing: -0.2,
  },
  closeBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#FAF8F5',
    borderWidth: 1,
    borderColor: '#EFEAE4',
    justifyContent: 'center',
    alignItems: 'center',
  },
  /* 2. Scrollable Body */
  modalBody: {
    flexShrink: 1,
  },
  bodyScrollContent: {
    paddingHorizontal: 18,
    paddingTop: 10,
    paddingBottom: 14,
  },
  modalLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#6B5E55',
    letterSpacing: 0.4,
    marginTop: 10,
    marginBottom: 4,
  },
  requiredStar: {
    color: '#DC2626',
    fontWeight: '800',
  },
  optionalText: {
    fontSize: 10,
    fontWeight: '500',
    color: '#A0958D',
    textTransform: 'none',
  },
  modalInput: {
    backgroundColor: '#FAF8F5',
    borderWidth: 1,
    borderColor: '#EFEAE4',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 13,
    color: '#2A2421',
    height: 42,
  },
  inputError: {
    borderColor: '#DC2626',
    backgroundColor: '#FEF2F2',
  },
  errorText: {
    fontSize: 11,
    color: '#DC2626',
    marginTop: 3,
    fontWeight: '600',
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FCA5A5',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginBottom: 6,
  },
  errorBannerText: {
    fontSize: 11,
    color: '#DC2626',
    marginLeft: 6,
    fontWeight: '600',
    flex: 1,
  },
  /* 3. Fixed Footer */
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#F5EBE6',
    backgroundColor: '#FFFFFF',
    gap: 8,
  },
  modalCancelBtn: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 9,
    backgroundColor: '#FAF8F5',
    borderWidth: 1,
    borderColor: '#EFEAE4',
  },
  modalCancelText: {
    color: '#6B5E55',
    fontWeight: '700',
    fontSize: 13,
  },
  modalSubmitBtn: {
    flexDirection: 'row',
    backgroundColor: '#8C331A',
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 9,
    minWidth: 135,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitBtnDisabled: {
    backgroundColor: '#C4BCB5',
  },
  modalSubmitText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 13,
  },
});
