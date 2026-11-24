import React, { useState, useEffect, useMemo } from 'react';
import {
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
  Image,
  Alert,
  Linking,
  Keyboard,
  Platform,
  useWindowDimensions,
} from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { DeliveryBoyItem, useApp } from '../../context/AppContext';
import ConfirmDialog from '../ConfirmDialog';
import { colors, typography, radius, spacing, shadows } from '../../theme';

interface DeliveryBoyDetailModalProps {
  visible: boolean;
  boy: DeliveryBoyItem | null;
  onClose: () => void;
}

export default function DeliveryBoyDetailModal({
  visible,
  boy,
  onClose,
}: DeliveryBoyDetailModalProps) {
  const { updateDeliveryBoy, deleteDeliveryBoy } = useApp();
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();

  const [isEditing, setIsEditing] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);

  /* Form state for editing */
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [emergencyPhone, setEmergencyPhone] = useState('');
  const [status, setStatus] = useState<'READY' | 'BUSY' | 'OFFLINE'>('READY');

  /* Baseline state to detect unsaved changes */
  const [initialForm, setInitialForm] = useState({
    name: '',
    phone: '',
    emergencyPhone: '',
    status: 'READY' as 'READY' | 'BUSY' | 'OFFLINE',
  });

  useEffect(() => {
    if (boy) {
      const bName = boy.name || '';
      const bPhone = boy.phone || '';
      const bEmergency = boy.emergencyContact || '';
      const bStatus = boy.status || 'READY';

      setName(bName);
      setPhone(bPhone);
      setEmergencyPhone(bEmergency);
      setStatus(bStatus);

      setInitialForm({
        name: bName,
        phone: bPhone,
        emergencyPhone: bEmergency,
        status: bStatus,
      });

      setIsEditing(false);
      setShowDeleteConfirm(false);
      setShowDiscardConfirm(false);
    }
  }, [boy, visible]);

  // Check if user made unsaved changes in Edit mode
  const hasUnsavedChanges = useMemo(() => {
    if (!isEditing) return false;
    return (
      name.trim() !== initialForm.name.trim() ||
      phone.trim() !== initialForm.phone.trim() ||
      emergencyPhone.trim() !== initialForm.emergencyPhone.trim() ||
      status !== initialForm.status
    );
  }, [isEditing, name, phone, emergencyPhone, status, initialForm]);

  if (!boy) return null;

  // Handle close action requested by X, Android back, or Outside tap
  const handleRequestClose = () => {
    if (isEditing) {
      if (hasUnsavedChanges) {
        setShowDiscardConfirm(true);
      } else {
        setIsEditing(false);
      }
    } else {
      onClose();
    }
  };

  const handleDiscardChanges = () => {
    setShowDiscardConfirm(false);
    // Reset back to original
    setName(initialForm.name);
    setPhone(initialForm.phone);
    setEmergencyPhone(initialForm.emergencyPhone);
    setStatus(initialForm.status);
    setIsEditing(false);
  };

  const handleSave = () => {
    Keyboard.dismiss();
    const trimmedName = name.trim();
    if (!trimmedName) {
      Alert.alert('Required Field', 'Please enter a valid partner name.');
      return;
    }

    const trimmedPhone = phone.trim();
    if (trimmedPhone && trimmedPhone.replace(/[^0-9]/g, '').length < 10) {
      Alert.alert('Invalid Mobile', 'Please enter a valid 10-digit mobile number.');
      return;
    }

    // Update only the simplified fields while preserving all existing vehicle/route data in backend
    updateDeliveryBoy(boy.id, {
      name: trimmedName,
      phone: trimmedPhone,
      emergencyContact: emergencyPhone.trim(),
      status,
    });

    setInitialForm({
      name: trimmedName,
      phone: trimmedPhone,
      emergencyPhone: emergencyPhone.trim(),
      status,
    });

    setIsEditing(false);
    Alert.alert('Success', 'Partner details updated successfully!');
  };

  const handleDelete = () => {
    setShowDeleteConfirm(true);
  };

  const handleExecuteDelete = () => {
    setShowDeleteConfirm(false);
    if (boy) {
      deleteDeliveryBoy(boy.id);
      onClose();
    }
  };

  const handleCall = () => {
    const p = phone || boy.phone;
    if (!p) {
      Alert.alert('Notice', 'No phone number available.');
      return;
    }
    Linking.openURL(`tel:${p}`);
  };

  const handleMessage = () => {
    const p = phone || boy.phone;
    if (!p) {
      Alert.alert('Notice', 'No phone number available.');
      return;
    }
    const cleanNumber = p.replace(/[^0-9]/g, '');
    const msg = encodeURIComponent(
      `Hi ${boy.name}, regarding ChaiFlow delivery run:`,
    );
    Linking.openURL(`whatsapp://send?phone=${cleanNumber}&text=${msg}`).catch(() => {
      Linking.openURL(`sms:${p}?body=${msg}`);
    });
  };

  // Helper for duty status formatting
  const getStatusDisplay = (st: 'READY' | 'BUSY' | 'OFFLINE') => {
    switch (st) {
      case 'READY':
        return { label: 'On Duty', color: '#059669', bg: '#ECFDF5', icon: 'checkmark-circle' };
      case 'BUSY':
        return { label: 'Busy', color: '#D97706', bg: '#FEF3C7', icon: 'bicycle' };
      case 'OFFLINE':
      default:
        return { label: 'Off Duty', color: '#6B7280', bg: '#F3F4F6', icon: 'moon' };
    }
  };

  const currentStatusDisplay = getStatusDisplay(boy.status || 'READY');

  // Compute initials fallback
  const initials = boy.name
    ? boy.name
      .split(' ')
      .map(part => part[0])
      .slice(0, 2)
      .join('')
      .toUpperCase()
    : 'DP';

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent={true}
      onRequestClose={handleRequestClose}
      statusBarTranslucent={true}
    >
      <TouchableWithoutFeedback onPress={handleRequestClose}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback onPress={e => e.stopPropagation()}>
            <View
              style={[
                styles.modalCard,
                {
                  maxWidth: Math.min(windowWidth - 32, 420),
                  maxHeight: Math.min(windowHeight - 64, 580),
                },
              ]}
            >
              {/* Header Row */}
              <View style={styles.headerRow}>
                <View style={styles.headerTitleGroup}>
                  <Text style={styles.headerTitle}>
                    {isEditing ? 'Edit Partner Details' : 'Partner Profile'}
                  </Text>
                </View>

                <View style={styles.headerActionBtns}>
                  {!isEditing && (
                    <TouchableOpacity
                      activeOpacity={0.7}
                      style={styles.editIconBtn}
                      onPress={() => setIsEditing(true)}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      accessibilityLabel="Edit Partner"
                    >
                      <Ionicons name="create-outline" size={18} color="#8C331A" />
                    </TouchableOpacity>
                  )}

                  <TouchableOpacity
                    activeOpacity={0.7}
                    style={styles.closeIconBtn}
                    onPress={handleRequestClose}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    accessibilityLabel="Close Modal"
                  >
                    <Ionicons name="close" size={20} color="#6E6259" />
                  </TouchableOpacity>
                </View>
              </View>

              <KeyboardAwareScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.scrollBody}
                keyboardShouldPersistTaps="handled"
                enableOnAndroid={true}
                extraScrollHeight={Platform.OS === 'android' ? 80 : 40}
              >
                {/* 1. DELIVERY PARTNER PROFILE (VIEW MODE) */}
                {!isEditing ? (
                  <View style={styles.profileContainer}>
                    {/* Profile Photo / Initials */}
                    <View style={styles.avatarSection}>
                      <View style={styles.avatarContainer}>
                        {boy.avatarUrl ? (
                          <Image source={{ uri: boy.avatarUrl }} style={styles.avatarImg} />
                        ) : (
                          <View style={styles.avatarFallback}>
                            <Text style={styles.avatarInitialsText}>{initials}</Text>
                          </View>
                        )}
                      </View>

                      {/* Partner Name & Phone */}
                      <Text style={styles.memberName} numberOfLines={2}>
                        {boy.name}
                      </Text>
                      <Text style={styles.memberPhone}>
                        {boy.phone || 'No phone recorded'}
                      </Text>

                      {/* Duty Status Badge (On Duty / Busy / Off Duty) */}
                      <View
                        style={[
                          styles.statusBadge,
                          { backgroundColor: currentStatusDisplay.bg },
                        ]}
                      >
                        <Ionicons
                          name={currentStatusDisplay.icon}
                          size={13}
                          color={currentStatusDisplay.color}
                          style={{ marginRight: 5 }}
                        />
                        <Text
                          style={[
                            styles.statusBadgeText,
                            { color: currentStatusDisplay.color },
                          ]}
                        >
                          {currentStatusDisplay.label}
                        </Text>
                      </View>
                    </View>

                    {/* Quick Call & Message Actions */}
                    <View style={styles.quickActionRow}>
                      <TouchableOpacity
                        activeOpacity={0.8}
                        style={styles.callBtn}
                        onPress={handleCall}
                      >
                        <Ionicons
                          name="call"
                          size={15}
                          color="#FFFFFF"
                          style={{ marginRight: 6 }}
                        />
                        <Text style={styles.actionBtnText}>Call</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        activeOpacity={0.8}
                        style={styles.messageBtn}
                        onPress={handleMessage}
                      >
                        <Ionicons
                          name="chatbubble-ellipses"
                          size={15}
                          color="#FFFFFF"
                          style={{ marginRight: 6 }}
                        />
                        <Text style={styles.actionBtnText}>Message</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        activeOpacity={0.8}
                        style={styles.editActionBtn}
                        onPress={() => setIsEditing(true)}
                      >
                        <Ionicons
                          name="pencil"
                          size={15}
                          color="#8C331A"
                          style={{ marginRight: 4 }}
                        />
                        <Text style={styles.editActionBtnText}>Edit</Text>
                      </TouchableOpacity>
                    </View>

                    {/* Emergency Contact (if available) */}
                    {Boolean(boy.emergencyContact) && (
                      <View style={styles.emergencyCard}>
                        <View style={styles.emergencyHeader}>
                          <Ionicons
                            name="alert-circle-outline"
                            size={16}
                            color="#8C331A"
                            style={{ marginRight: 6 }}
                          />
                          <Text style={styles.emergencyTitle}>Emergency Contact</Text>
                        </View>
                        <Text style={styles.emergencyValue}>
                          {boy.emergencyContact}
                        </Text>
                      </View>
                    )}

                    {/* Remove Member from Fleet Action */}
                    <TouchableOpacity
                      activeOpacity={0.8}
                      style={styles.deleteMemberBtn}
                      onPress={handleDelete}
                    >
                      <Ionicons
                        name="trash-outline"
                        size={16}
                        color="#DC2626"
                        style={{ marginRight: 6 }}
                      />
                      <Text style={styles.deleteMemberText}>
                        Remove Member from Fleet
                      </Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  /* 2. EDIT PARTNER DETAILS (EDIT MODE) */
                  <View style={styles.formContainer}>
                    {/* Partner Name */}
                    <Text style={styles.label}>PARTNER NAME *</Text>
                    <TextInput
                      style={styles.input}
                      value={name}
                      onChangeText={setName}
                      placeholder="Enter partner name"
                      placeholderTextColor="#9CA3AF"
                    />

                    {/* Mobile Phone */}
                    <Text style={styles.label}>MOBILE PHONE *</Text>
                    <TextInput
                      style={styles.input}
                      value={phone}
                      onChangeText={setPhone}
                      placeholder="10-digit mobile number"
                      placeholderTextColor="#9CA3AF"
                      keyboardType="phone-pad"
                    />

                    {/* Emergency Phone (Optional) */}
                    <Text style={styles.label}>EMERGENCY PHONE (OPTIONAL)</Text>
                    <TextInput
                      style={styles.input}
                      value={emergencyPhone}
                      onChangeText={setEmergencyPhone}
                      placeholder="Optional emergency contact number"
                      placeholderTextColor="#9CA3AF"
                      keyboardType="phone-pad"
                    />

                    {/* Duty Status Selector (On Duty / Busy / Off Duty) */}
                    <Text style={styles.label}>DUTY STATUS</Text>
                    <View style={styles.statusChipRow}>
                      {(
                        [
                          { key: 'READY', label: 'On Duty', icon: 'checkmark-circle', activeColor: '#059669', activeBg: '#ECFDF5' },
                          { key: 'BUSY', label: 'Busy', icon: 'bicycle', activeColor: '#D97706', activeBg: '#FEF3C7' },
                          { key: 'OFFLINE', label: 'Off Duty', icon: 'moon', activeColor: '#6B7280', activeBg: '#F3F4F6' },
                        ] as const
                      ).map(item => {
                        const isSelected = status === item.key;
                        return (
                          <TouchableOpacity
                            key={item.key}
                            activeOpacity={0.8}
                            onPress={() => setStatus(item.key)}
                            style={[
                              styles.statusChip,
                              isSelected && {
                                backgroundColor: item.activeBg,
                                borderColor: item.activeColor,
                              },
                            ]}
                          >
                            <Ionicons
                              name={item.icon}
                              size={14}
                              color={isSelected ? item.activeColor : '#6B7280'}
                              style={{ marginRight: 4 }}
                            />
                            <Text
                              style={[
                                styles.statusChipText,
                                isSelected && { color: item.activeColor, fontWeight: '700' },
                              ]}
                            >
                              {item.label}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>

                    {/* Save Changes and Cancel Actions */}
                    <View style={styles.editActionRow}>
                      <TouchableOpacity
                        activeOpacity={0.8}
                        style={styles.cancelBtn}
                        onPress={handleRequestClose}
                      >
                        <Text style={styles.cancelBtnText}>Cancel</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        activeOpacity={0.8}
                        style={styles.saveBtn}
                        onPress={handleSave}
                      >
                        <Ionicons
                          name="checkmark"
                          size={17}
                          color="#FFFFFF"
                          style={{ marginRight: 6 }}
                        />
                        <Text style={styles.saveBtnText}>Save Changes</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
              </KeyboardAwareScrollView>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>

      {/* Discard Unsaved Changes Dialog */}
      <ConfirmDialog
        visible={showDiscardConfirm}
        title="Discard Unsaved Changes?"
        description="You have unsaved edits in this partner's profile. Are you sure you want to discard them?"
        type="warning"
        confirmLabel="Discard"
        cancelLabel="Keep Editing"
        onConfirm={handleDiscardChanges}
        onCancel={() => setShowDiscardConfirm(false)}
      />

      {/* Remove Partner Confirmation Dialog */}
      <ConfirmDialog
        visible={showDeleteConfirm}
        title="Remove Delivery Partner?"
        description={`Are you sure you want to remove "${boy?.name}" from your active fleet? This action cannot be undone.`}
        type="danger"
        confirmLabel="Remove Partner"
        cancelLabel="Cancel"
        onConfirm={handleExecuteDelete}
        onCancel={() => setShowDeleteConfirm(false)}
      />
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalCard: {
    width: '100%',
    backgroundColor: '#FAF8F5',
    borderRadius: 20,
    paddingTop: 16,
    paddingHorizontal: 18,
    paddingBottom: 16,
    borderWidth: 1,
    borderColor: '#EFEAE4',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.18,
        shadowRadius: 16,
      },
      android: {
        elevation: 10,
      },
    }),
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#EFEAE4',
  },
  headerTitleGroup: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#2C201A',
  },
  headerActionBtns: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  editIconBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#FDEEEB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeIconBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#EFECE8',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollBody: {
    paddingTop: 12,
    paddingBottom: 8,
  },

  /* Profile View Styles */
  profileContainer: {
    alignItems: 'center',
  },
  avatarSection: {
    alignItems: 'center',
    width: '100%',
    marginBottom: 12,
  },
  avatarContainer: {
    marginBottom: 8,
  },
  avatarImg: {
    width: 72,
    height: 72,
    borderRadius: 36,
  },
  avatarFallback: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#FDEEEB',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#F6D9D2',
  },
  avatarInitialsText: {
    fontSize: 24,
    fontWeight: '800',
    color: '#8C331A',
  },
  memberName: {
    fontSize: 18,
    fontWeight: '800',
    color: '#2C201A',
    textAlign: 'center',
    marginBottom: 2,
  },
  memberPhone: {
    fontSize: 13,
    color: '#6E6259',
    marginBottom: 8,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 14,
    marginTop: 2,
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  quickActionRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    width: '100%',
    marginVertical: 10,
  },
  callBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#8C331A',
    height: 40,
    borderRadius: 10,
  },
  messageBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#059669',
    height: 40,
    borderRadius: 10,
  },
  editActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FDEEEB',
    borderWidth: 1,
    borderColor: '#F6D9D2',
    height: 40,
    paddingHorizontal: 14,
    borderRadius: 10,
  },
  editActionBtnText: {
    color: '#8C331A',
    fontWeight: '700',
    fontSize: 13,
  },
  actionBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
  emergencyCard: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#EFEAE4',
    marginTop: 8,
    marginBottom: 10,
  },
  emergencyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  emergencyTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#8C331A',
    letterSpacing: 0.3,
  },
  emergencyValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#2C201A',
    marginLeft: 22,
  },
  deleteMemberBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FEE2E2',
    width: '100%',
    height: 42,
    borderRadius: 10,
    marginTop: 6,
  },
  deleteMemberText: {
    color: '#DC2626',
    fontWeight: '700',
    fontSize: 13,
  },

  /* Edit Form Styles */
  formContainer: {
    width: '100%',
  },
  label: {
    fontSize: 11,
    fontWeight: '800',
    color: '#6B7280',
    letterSpacing: 0.4,
    marginTop: 10,
    marginBottom: 6,
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: 12,
    height: 42,
    fontSize: 13,
    color: '#111827',
  },
  statusChipRow: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 2,
    marginBottom: 8,
  },
  statusChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
  },
  statusChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4B5563',
  },
  editActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 16,
    marginBottom: 4,
  },
  cancelBtn: {
    flex: 1,
    height: 44,
    backgroundColor: '#EFECE8',
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelBtnText: {
    color: '#6E6259',
    fontWeight: '700',
    fontSize: 13,
  },
  saveBtn: {
    flex: 1.5,
    height: 44,
    backgroundColor: '#8C331A',
    borderRadius: 10,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  saveBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
});
