import React, { useState, useEffect } from 'react';
import {
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Image,
  Alert,
  Linking,
  Keyboard,
} from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { launchCamera, launchImageLibrary } from 'react-native-image-picker';
import { DeliveryBoyItem, useApp } from '../../context/AppContext';

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
  const { updateDeliveryBoy, deleteDeliveryBoy, assignOrderToBoy } = useApp();

  const [isEditing, setIsEditing] = useState(false);

  /* Form state for editing */
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [emergencyPhone, setEmergencyPhone] = useState('');
  const [licenseNumber, setLicenseNumber] = useState('');
  const [vehicleType, setVehicleType] = useState<
    'Scooter' | 'E-Bike' | 'Auto Cargo' | 'Mini Van'
  >('Scooter');
  const [vehicleModel, setVehicleModel] = useState('');
  const [numberPlate, setNumberPlate] = useState('');
  const [status, setStatus] = useState<'READY' | 'BUSY' | 'OFFLINE'>('READY');
  const [location, setLocation] = useState('');

  /* Photos state */
  const [avatarUrl, setAvatarUrl] = useState<string | undefined>(undefined);
  const [licensePhotoUri, setLicensePhotoUri] = useState<string | undefined>(
    undefined,
  );
  const [numberPlatePhotoUri, setNumberPlatePhotoUri] = useState<
    string | undefined
  >(undefined);

  useEffect(() => {
    if (boy) {
      setName(boy.name || '');
      setPhone(boy.phone || '');
      setEmergencyPhone(boy.emergencyContact || '');
      setLicenseNumber(boy.licenseNumber || '');
      setVehicleType(boy.vehicleType || 'Scooter');
      setVehicleModel(boy.vehicleModel || '');
      setNumberPlate(boy.numberPlate || '');
      setStatus(boy.status || 'READY');
      setLocation(boy.location || '');
      setAvatarUrl(boy.avatarUrl);
      setLicensePhotoUri(boy.licensePhotoUri);
      setNumberPlatePhotoUri(boy.numberPlatePhotoUri);
      setIsEditing(false);
    }
  }, [boy, visible]);

  if (!boy) return null;

  const handlePickPhoto = (target: 'profile' | 'license' | 'numberPlate') => {
    Alert.alert('Upload Photo', 'Choose photo source:', [
      {
        text: 'Take Photo (Camera)',
        onPress: async () => {
          try {
            const result = await launchCamera({
              mediaType: 'photo',
              quality: 0.8,
              saveToPhotos: true,
            });
            if (
              !result.didCancel &&
              result.assets &&
              result.assets.length > 0
            ) {
              const uri = result.assets[0].uri;
              if (uri) {
                if (target === 'profile') setAvatarUrl(uri);
                if (target === 'license') setLicensePhotoUri(uri);
                if (target === 'numberPlate') setNumberPlatePhotoUri(uri);
              }
            }
          } catch (error) {
            console.log('Error opening camera:', error);
          }
        },
      },
      {
        text: 'Choose from Device',
        onPress: async () => {
          try {
            const result = await launchImageLibrary({
              mediaType: 'photo',
              quality: 0.8,
            });
            if (
              !result.didCancel &&
              result.assets &&
              result.assets.length > 0
            ) {
              const uri = result.assets[0].uri;
              if (uri) {
                if (target === 'profile') setAvatarUrl(uri);
                if (target === 'license') setLicensePhotoUri(uri);
                if (target === 'numberPlate') setNumberPlatePhotoUri(uri);
              }
            }
          } catch (error) {
            console.log('Error selecting image:', error);
          }
        },
      },
      {
        text: 'Cancel',
        style: 'cancel',
      },
    ]);
  };

  const handleSave = () => {
    Keyboard.dismiss();
    if (!name.trim()) {
      Alert.alert('Required Field', 'Please enter a valid member name.');
      return;
    }

    updateDeliveryBoy(boy.id, {
      name: name.trim(),
      phone: phone.trim(),
      emergencyContact: emergencyPhone.trim(),
      licenseNumber: licenseNumber.trim(),
      vehicleType,
      vehicleModel: vehicleModel.trim(),
      numberPlate: numberPlate.trim(),
      status,
      location: location.trim(),
      avatarUrl,
      licensePhotoUri,
      numberPlatePhotoUri,
    });

    setIsEditing(false);
    Alert.alert('Success', 'Delivery member details updated!');
  };

  const handleDelete = () => {
    Alert.alert(
      'Remove Delivery Partner',
      `Are you sure you want to remove ${boy.name} from the fleet? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => {
            deleteDeliveryBoy(boy.id);
            onClose();
          },
        },
      ],
    );
  };

  const handleCall = () => {
    const p = phone || boy.phone || '+919876543210';
    Linking.openURL(`tel:${p}`);
  };

  const handleWhatsApp = () => {
    const p = phone || boy.phone || '+919876543210';
    const msg = encodeURIComponent(
      `Hi ${boy.name}, regarding ChaiFlow delivery run:`,
    );
    Linking.openURL(`whatsapp://send?phone=${p}&text=${msg}`).catch(() => {
      Linking.openURL(`sms:${p}?body=${msg}`);
    });
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modalContent}>
          {/* Header Row */}
          <View style={styles.headerRow}>
            <View style={styles.headerTitleGroup}>
              <Text style={styles.headerTitle}>
                {isEditing
                  ? 'Edit Partner Details'
                  : 'Delivery Partner Profile'}
              </Text>
            </View>

            <View style={styles.headerActionBtns}>
              {!isEditing && (
                <TouchableOpacity
                  activeOpacity={0.8}
                  style={styles.editIconBtn}
                  onPress={() => setIsEditing(true)}
                >
                  <Ionicons name="create-outline" size={20} color="#8C331A" />
                </TouchableOpacity>
              )}

              <TouchableOpacity
                activeOpacity={0.8}
                style={styles.closeIconBtn}
                onPress={onClose}
              >
                <Ionicons name="close" size={22} color="#6E6259" />
              </TouchableOpacity>
            </View>
          </View>

          <KeyboardAwareScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollBody}
            keyboardShouldPersistTaps="handled"
            enableOnAndroid={true}
            extraScrollHeight={20}
          >
            {/* Avatar Section */}
            <View style={styles.avatarSection}>
              <TouchableOpacity
                disabled={!isEditing}
                onPress={() => handlePickPhoto('profile')}
                activeOpacity={0.8}
                style={styles.avatarContainer}
              >
                {avatarUrl ? (
                  <Image source={{ uri: avatarUrl }} style={styles.avatarImg} />
                ) : (
                  <View style={styles.avatarFallback}>
                    <Ionicons name="person" size={40} color="#8C331A" />
                  </View>
                )}
                {isEditing && (
                  <View style={styles.cameraIconBadge}>
                    <Ionicons name="camera" size={14} color="#FFF" />
                  </View>
                )}
              </TouchableOpacity>

              {!isEditing && (
                <>
                  <Text style={styles.memberName}>{boy.name}</Text>
                  <Text style={styles.memberPhone}>
                    {boy.phone || 'No Phone'}
                  </Text>
                  <View
                    style={[
                      styles.statusBadge,
                      boy.status === 'BUSY'
                        ? styles.busyBadge
                        : boy.status === 'READY'
                        ? styles.readyBadge
                        : styles.offlineBadge,
                    ]}
                  >
                    <Ionicons
                      name={
                        boy.status === 'BUSY'
                          ? 'bicycle'
                          : boy.status === 'READY'
                          ? 'checkmark-circle'
                          : 'moon'
                      }
                      size={12}
                      color={
                        boy.status === 'BUSY'
                          ? '#3B82F6'
                          : boy.status === 'READY'
                          ? '#059669'
                          : '#6B7280'
                      }
                      style={{ marginRight: 4 }}
                    />
                    <Text
                      style={[
                        styles.statusBadgeText,
                        boy.status === 'BUSY'
                          ? styles.busyBadgeText
                          : boy.status === 'READY'
                          ? styles.readyBadgeText
                          : styles.offlineBadgeText,
                      ]}
                    >
                      {boy.status}
                    </Text>
                  </View>
                </>
              )}
            </View>

            {/* Quick Contact & Action Buttons (View Mode) */}
            {!isEditing && (
              <View style={styles.quickActionRow}>
                <TouchableOpacity
                  activeOpacity={0.8}
                  style={styles.callBtn}
                  onPress={handleCall}
                >
                  <Ionicons
                    name="call"
                    size={16}
                    color="#FFF"
                    style={{ marginRight: 6 }}
                  />
                  <Text style={styles.actionBtnText}>Call</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  activeOpacity={0.8}
                  style={styles.messageBtn}
                  onPress={handleWhatsApp}
                >
                  <Ionicons
                    name="logo-whatsapp"
                    size={16}
                    color="#FFF"
                    style={{ marginRight: 6 }}
                  />
                  <Text style={styles.actionBtnText}>WhatsApp</Text>
                </TouchableOpacity>

                {boy.status === 'READY' && (
                  <TouchableOpacity
                    activeOpacity={0.8}
                    style={styles.assignBtn}
                    onPress={() => {
                      assignOrderToBoy(boy.id);
                      Alert.alert(
                        'Order Assigned',
                        `Order assigned to ${boy.name}!`,
                      );
                    }}
                  >
                    <Ionicons
                      name="clipboard"
                      size={16}
                      color="#FFF"
                      style={{ marginRight: 6 }}
                    />
                    <Text style={styles.actionBtnText}>Assign</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}

            {/* Content Body: View vs Edit */}
            {isEditing ? (
              /* --- EDIT FORM --- */
              <View style={styles.formContainer}>
                <Text style={styles.label}>Full Name *</Text>
                <TextInput
                  style={styles.input}
                  value={name}
                  onChangeText={setName}
                  placeholder="Enter partner name"
                />

                <View style={styles.twoColRow}>
                  <View style={{ flex: 1, marginRight: 6 }}>
                    <Text style={styles.label}>Mobile Phone</Text>
                    <TextInput
                      style={styles.input}
                      value={phone}
                      onChangeText={setPhone}
                      keyboardType="phone-pad"
                    />
                  </View>
                  <View style={{ flex: 1, marginLeft: 6 }}>
                    <Text style={styles.label}>Emergency Phone</Text>
                    <TextInput
                      style={styles.input}
                      value={emergencyPhone}
                      onChangeText={setEmergencyPhone}
                      keyboardType="phone-pad"
                    />
                  </View>
                </View>

                <Text style={styles.label}>Duty Status</Text>
                <View style={styles.statusChipRow}>
                  {(['READY', 'BUSY', 'OFFLINE'] as const).map(st => {
                    const isActive = status === st;
                    const activeBg =
                      st === 'READY'
                        ? '#059669'
                        : st === 'BUSY'
                        ? '#2563EB'
                        : '#DC2626';
                    return (
                      <TouchableOpacity
                        key={st}
                        activeOpacity={0.8}
                        onPress={() => setStatus(st)}
                        style={[
                          styles.statusChip,
                          isActive && {
                            backgroundColor: activeBg,
                            borderColor: activeBg,
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.statusChipText,
                            isActive && styles.statusChipTextActive,
                          ]}
                        >
                          {st === 'READY'
                            ? '🟢 ON DUTY'
                            : st === 'BUSY'
                            ? '🚚 BUSY'
                            : '🔴 OFF DUTY'}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                <Text style={styles.label}>Vehicle Type</Text>
                <View style={styles.vehicleTypeGrid}>
                  {(
                    ['Scooter', 'E-Bike', 'Auto Cargo', 'Mini Van'] as const
                  ).map(vt => (
                    <TouchableOpacity
                      key={vt}
                      activeOpacity={0.8}
                      onPress={() => setVehicleType(vt)}
                      style={[
                        styles.vehicleChip,
                        vehicleType === vt && styles.vehicleChipActive,
                      ]}
                    >
                      <Text
                        style={[
                          styles.vehicleChipText,
                          vehicleType === vt && styles.vehicleChipTextActive,
                        ]}
                      >
                        {vt}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <View style={styles.twoColRow}>
                  <View style={{ flex: 1, marginRight: 6 }}>
                    <Text style={styles.label}>Vehicle Model</Text>
                    <TextInput
                      style={styles.input}
                      value={vehicleModel}
                      onChangeText={setVehicleModel}
                    />
                  </View>
                  <View style={{ flex: 1, marginLeft: 6 }}>
                    <Text style={styles.label}>Number Plate (RC)</Text>
                    <TextInput
                      style={styles.input}
                      value={numberPlate}
                      onChangeText={setNumberPlate}
                      autoCapitalize="characters"
                    />
                  </View>
                </View>

                <Text style={styles.label}>Driving License / ID</Text>
                <TextInput
                  style={styles.input}
                  value={licenseNumber}
                  onChangeText={setLicenseNumber}
                />

                <Text style={styles.label}>Assigned Route / Location</Text>
                <TextInput
                  style={styles.input}
                  value={location}
                  onChangeText={setLocation}
                />

                {/* Edit Photo Pickers */}
                <Text style={styles.label}>Update Documents & Photos</Text>
                <View style={styles.photosRow}>
                  <TouchableOpacity
                    style={styles.photoUploadCard}
                    onPress={() => handlePickPhoto('numberPlate')}
                  >
                    {numberPlatePhotoUri ? (
                      <Image
                        source={{ uri: numberPlatePhotoUri }}
                        style={styles.photoThumb}
                      />
                    ) : (
                      <View style={styles.photoPlaceholder}>
                        <Ionicons
                          name="card-outline"
                          size={20}
                          color="#8C331A"
                        />
                        <Text style={styles.photoPlaceholderText}>
                          Number Plate
                        </Text>
                      </View>
                    )}
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.photoUploadCard}
                    onPress={() => handlePickPhoto('license')}
                  >
                    {licensePhotoUri ? (
                      <Image
                        source={{ uri: licensePhotoUri }}
                        style={styles.photoThumb}
                      />
                    ) : (
                      <View style={styles.photoPlaceholder}>
                        <Ionicons
                          name="document-text-outline"
                          size={20}
                          color="#8C331A"
                        />
                        <Text style={styles.photoPlaceholderText}>
                          License Photo
                        </Text>
                      </View>
                    )}
                  </TouchableOpacity>
                </View>

                {/* Form Buttons */}
                <View style={styles.editActionRow}>
                  <TouchableOpacity
                    activeOpacity={0.8}
                    style={styles.saveBtn}
                    onPress={handleSave}
                  >
                    <Ionicons
                      name="checkmark-circle"
                      size={18}
                      color="#FFF"
                      style={{ marginRight: 6 }}
                    />
                    <Text style={styles.saveBtnText}>Save Changes</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    activeOpacity={0.8}
                    style={styles.cancelBtn}
                    onPress={() => setIsEditing(false)}
                  >
                    <Text style={styles.cancelBtnText}>Cancel</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              /* --- VIEW DETAILS --- */
              <View style={styles.detailsContainer}>
                {/* Information Card 1: Vehicle & Plate */}
                <View style={styles.infoCard}>
                  <View style={styles.cardHeader}>
                    <Ionicons
                      name="bicycle-outline"
                      size={18}
                      color="#059669"
                    />
                    <Text style={styles.cardTitle}>Vehicle Information</Text>
                  </View>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Vehicle Type:</Text>
                    <Text style={styles.infoValue}>
                      {boy.vehicleType || 'Scooter'}
                    </Text>
                  </View>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Model:</Text>
                    <Text style={styles.infoValue}>
                      {boy.vehicleModel || 'N/A'}
                    </Text>
                  </View>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Number Plate:</Text>
                    <Text style={styles.infoValueHighlight}>
                      {boy.numberPlate || 'N/A'}
                    </Text>
                  </View>
                </View>

                {/* Information Card 2: Driver Documents & Contact */}
                <View style={styles.infoCard}>
                  <View style={styles.cardHeader}>
                    <Ionicons
                      name="shield-checkmark-outline"
                      size={18}
                      color="#8C331A"
                    />
                    <Text style={styles.cardTitle}>Verification & Contact</Text>
                  </View>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Driving License:</Text>
                    <Text style={styles.infoValue}>
                      {boy.licenseNumber || 'Verified'}
                    </Text>
                  </View>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Emergency Contact:</Text>
                    <Text style={styles.infoValue}>
                      {boy.emergencyContact || 'N/A'}
                    </Text>
                  </View>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Current Hub Route:</Text>
                    <Text style={styles.infoValue}>{boy.location}</Text>
                  </View>
                </View>

                {/* Uploaded Photos Section */}
                {(boy.licensePhotoUri || boy.numberPlatePhotoUri) && (
                  <View style={styles.infoCard}>
                    <View style={styles.cardHeader}>
                      <Ionicons
                        name="images-outline"
                        size={18}
                        color="#3B82F6"
                      />
                      <Text style={styles.cardTitle}>
                        Uploaded Document Photos
                      </Text>
                    </View>
                    <View style={styles.photosDisplayRow}>
                      {boy.numberPlatePhotoUri && (
                        <View style={styles.photoDisplayBox}>
                          <Image
                            source={{ uri: boy.numberPlatePhotoUri }}
                            style={styles.documentPreviewImage}
                          />
                          <Text style={styles.photoCaption}>
                            RC / Number Plate
                          </Text>
                        </View>
                      )}
                      {boy.licensePhotoUri && (
                        <View style={styles.photoDisplayBox}>
                          <Image
                            source={{ uri: boy.licensePhotoUri }}
                            style={styles.documentPreviewImage}
                          />
                          <Text style={styles.photoCaption}>
                            Driving License
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>
                )}

                {/* Danger Action Zone: Remove Member */}
                <TouchableOpacity
                  activeOpacity={0.8}
                  style={styles.deleteMemberBtn}
                  onPress={handleDelete}
                >
                  <Ionicons
                    name="trash-outline"
                    size={18}
                    color="#D9381E"
                    style={{ marginRight: 6 }}
                  />
                  <Text style={styles.deleteMemberText}>
                    Remove Member from Fleet
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </KeyboardAwareScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FAF8F5',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: '90%',
    paddingTop: 20,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  headerTitleGroup: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#2C201A',
  },
  headerActionBtns: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  editIconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FDEEEB',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  closeIconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#EFECE8',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollBody: {
    paddingBottom: 24,
  },
  avatarSection: {
    alignItems: 'center',
    marginVertical: 12,
  },
  avatarContainer: {
    position: 'relative',
  },
  avatarImg: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  avatarFallback: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FDEEEB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cameraIconBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#059669',
    width: 26,
    height: 26,
    borderRadius: 13,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFF',
  },
  memberName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#2C201A',
    marginTop: 8,
  },
  memberPhone: {
    fontSize: 14,
    color: '#6E6259',
    marginTop: 2,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 8,
  },
  busyBadge: {
    backgroundColor: '#EBF3FE',
  },
  busyBadgeText: {
    color: '#3B82F6',
    fontWeight: '700',
    fontSize: 12,
  },
  readyBadge: {
    backgroundColor: '#ECFDF5',
  },
  readyBadgeText: {
    color: '#059669',
    fontWeight: '700',
    fontSize: 12,
  },
  offlineBadge: {
    backgroundColor: '#F3F4F6',
  },
  offlineBadgeText: {
    color: '#6B7280',
    fontWeight: '700',
    fontSize: 12,
  },
  statusBadgeText: {
    fontSize: 12,
  },
  quickActionRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginVertical: 14,
  },
  callBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#8C331A',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 20,
    marginRight: 8,
  },
  messageBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#059669',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 20,
    marginRight: 8,
  },
  assignBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#3B82F6',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 20,
  },
  actionBtnText: {
    color: '#FFF',
    fontWeight: '700',
    fontSize: 13,
  },
  detailsContainer: {
    marginTop: 8,
  },
  infoCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#EFECE9',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F2EE',
    paddingBottom: 8,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#2C201A',
    marginLeft: 6,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 5,
  },
  infoLabel: {
    fontSize: 13,
    color: '#7C6E65',
  },
  infoValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#2C201A',
  },
  infoValueHighlight: {
    fontSize: 13,
    fontWeight: '800',
    color: '#059669',
  },
  photosDisplayRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  photoDisplayBox: {
    width: '48%',
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#EFECE8',
  },
  documentPreviewImage: {
    width: '100%',
    height: 100,
  },
  photoCaption: {
    fontSize: 11,
    fontWeight: '600',
    color: '#6E6259',
    textAlign: 'center',
    paddingVertical: 4,
    backgroundColor: '#FAF8F5',
  },
  deleteMemberBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FEE2E2',
    paddingVertical: 14,
    borderRadius: 18,
    marginTop: 8,
    marginBottom: 10,
  },
  deleteMemberText: {
    color: '#D9381E',
    fontWeight: '700',
    fontSize: 14,
  },

  /* Form Styles */
  formContainer: {
    marginTop: 8,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    color: '#2C201A',
    marginBottom: 6,
    marginTop: 10,
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#EFECE9',
    paddingHorizontal: 14,
    height: 46,
    fontSize: 14,
    color: '#2C201A',
  },
  twoColRow: {
    flexDirection: 'row',
  },
  statusChipRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statusChip: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#EFECE9',
    backgroundColor: '#FFF',
    marginHorizontal: 3,
  },
  statusChipActive: {
    backgroundColor: '#8C331A',
    borderColor: '#8C331A',
  },
  statusChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#6E6259',
  },
  statusChipTextActive: {
    color: '#FFF',
  },
  vehicleTypeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  vehicleChip: {
    width: '48%',
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#EFECE9',
    backgroundColor: '#FFF',
    marginBottom: 6,
  },
  vehicleChipActive: {
    backgroundColor: '#059669',
    borderColor: '#059669',
  },
  vehicleChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#6E6259',
  },
  vehicleChipTextActive: {
    color: '#FFF',
  },
  photosRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  photoUploadCard: {
    width: '48%',
    height: 80,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#EFECE9',
    borderStyle: 'dashed',
  },
  photoThumb: {
    width: '100%',
    height: '100%',
  },
  photoPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoPlaceholderText: {
    fontSize: 10,
    color: '#8C331A',
    fontWeight: '600',
    marginTop: 2,
  },
  editActionRow: {
    flexDirection: 'row',
    marginTop: 18,
    marginBottom: 10,
  },
  saveBtn: {
    flex: 1,
    height: 48,
    backgroundColor: '#8C331A',
    borderRadius: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  saveBtnText: {
    color: '#FFF',
    fontWeight: '700',
    fontSize: 15,
  },
  cancelBtn: {
    width: 90,
    height: 48,
    backgroundColor: '#EFECE8',
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelBtnText: {
    color: '#6E6259',
    fontWeight: '700',
    fontSize: 14,
  },
});
