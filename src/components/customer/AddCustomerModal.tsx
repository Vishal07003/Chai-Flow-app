import React, { useState } from 'react';
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
  TouchableWithoutFeedback,
  Keyboard,
  ActivityIndicator,
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

  React.useEffect(() => {
    if (visible && initialData) {
      setName(initialData.name || '');
      setPhone(initialData.phone || '');
      setAddress(initialData.address || '');
      setOpeningBalance(
        initialData.openingBalance !== undefined ? String(initialData.openingBalance) : '',
      );
      setErrors({});
    }
  }, [visible, initialData]);

  const resetForm = () => {
    setName('');
    setPhone('');
    setAddress('');
    setOpeningBalance('');
    setErrors({});
    setIsSubmitting(false);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleSubmit = async () => {
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
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={handleClose}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={styles.keyboardContainer}
          >
            <View style={styles.modalCard}>
              {/* Header */}
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>{title}</Text>
                <TouchableOpacity
                  onPress={handleClose}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  accessibilityLabel="Close customer modal"
                >
                  <Ionicons name="close" size={20} color="#6B7280" />
                </TouchableOpacity>
              </View>

              <ScrollView
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                bounces={false}
                contentContainerStyle={styles.scrollContent}
              >
                {/* General Form Error */}
                {errors.form ? (
                  <View style={styles.errorBanner}>
                    <Ionicons name="alert-circle" size={16} color="#DC2626" />
                    <Text style={styles.errorBannerText}>{errors.form}</Text>
                  </View>
                ) : null}

                {/* Field 1: Customer Name (REQUIRED) */}
                <Text style={styles.modalLabel}>
                  Customer Name <Text style={styles.requiredStar}>*</Text>
                </Text>
                <TextInput
                  style={[styles.modalInput, errors.name ? styles.inputError : null]}
                  placeholder="e.g. Ramesh Kumar"
                  placeholderTextColor="#9CA3AF"
                  value={name}
                  onChangeText={val => {
                    setName(val);
                    if (errors.name) {
                      setErrors(prev => ({ ...prev, name: '' }));
                    }
                  }}
                  autoFocus={Platform.OS === 'ios'}
                />
                {errors.name ? <Text style={styles.errorText}>{errors.name}</Text> : null}

                {/* Field 2: Phone Number (OPTIONAL) */}
                <Text style={styles.modalLabel}>
                  Phone Number <Text style={styles.optionalText}>(Optional)</Text>
                </Text>
                <TextInput
                  style={[styles.modalInput, errors.phone ? styles.inputError : null]}
                  keyboardType="phone-pad"
                  placeholder="e.g. 9876543210"
                  placeholderTextColor="#9CA3AF"
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
                  Address / Area <Text style={styles.optionalText}>(Optional)</Text>
                </Text>
                <TextInput
                  style={styles.modalInput}
                  placeholder="e.g. Shop 42, Market Road"
                  placeholderTextColor="#9CA3AF"
                  value={address}
                  onChangeText={setAddress}
                />

                {/* Field 4: Opening Balance (₹) (OPTIONAL) */}
                <Text style={styles.modalLabel}>
                  Opening Balance (₹) <Text style={styles.optionalText}>(Optional)</Text>
                </Text>
                <TextInput
                  style={[styles.modalInput, errors.openingBalance ? styles.inputError : null]}
                  keyboardType="numeric"
                  placeholder="0"
                  placeholderTextColor="#9CA3AF"
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

                {/* Action Buttons */}
                <View style={styles.modalBtnRow}>
                  <TouchableOpacity
                    style={styles.modalCancelBtn}
                    onPress={handleClose}
                    disabled={isSubmitting}
                  >
                    <Text style={styles.modalCancelText}>Cancel</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.modalSubmitBtn, isSubmitting ? styles.submitBtnDisabled : null]}
                    onPress={handleSubmit}
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <Text style={styles.modalSubmitText}>Save Customer</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </ScrollView>
            </View>
          </KeyboardAvoidingView>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
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
  modalCard: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
    maxHeight: '90%',
  },
  scrollContent: {
    paddingBottom: 4,
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
  modalLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#374151',
    marginTop: 10,
    marginBottom: 4,
  },
  requiredStar: {
    color: '#DC2626',
    fontWeight: '700',
  },
  optionalText: {
    fontSize: 11,
    fontWeight: '400',
    color: '#9CA3AF',
  },
  modalInput: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 13,
    color: '#111827',
  },
  inputError: {
    borderColor: '#DC2626',
    backgroundColor: '#FEF2F2',
  },
  errorText: {
    fontSize: 11,
    color: '#DC2626',
    marginTop: 3,
    fontWeight: '500',
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
    marginBottom: 8,
  },
  errorBannerText: {
    fontSize: 12,
    color: '#DC2626',
    marginLeft: 6,
    flex: 1,
  },
  modalBtnRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginTop: 18,
  },
  modalCancelBtn: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    marginRight: 8,
  },
  modalCancelText: {
    color: '#6B7280',
    fontWeight: '700',
    fontSize: 13,
  },
  modalSubmitBtn: {
    backgroundColor: '#8C331A',
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 8,
    minWidth: 110,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitBtnDisabled: {
    opacity: 0.7,
  },
  modalSubmitText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 13,
  },
});
