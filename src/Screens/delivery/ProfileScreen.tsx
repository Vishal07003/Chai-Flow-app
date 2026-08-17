import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Image,
  TouchableOpacity,
  TextInput,
  Modal,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { launchImageLibrary, launchCamera } from 'react-native-image-picker';
import DeliveryHeader from '../../components/delivery/DeliveryHeader';
import { useApp } from '../../context/AppContext';

export default function ProfileScreen({ navigation: _navigation }: any) {
  const { userProfile, updateUserProfile } = useApp();

  const [isEditing, setIsEditing] = useState(false);
  const [avatarModalVisible, setAvatarModalVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Form Fields
  const [fullName, setFullName] = useState(userProfile.fullName || '');
  const [phone, setPhone] = useState(userProfile.phone || '');
  const [email, setEmail] = useState(userProfile.email || '');
  const [vehicle, setVehicle] = useState(
    userProfile.vehicle || 'Hero Electric Splendor',
  );
  const [plateNumber, setPlateNumber] = useState(
    userProfile.plateNumber || 'KA-01-EA-9920',
  );
  const [address, setAddress] = useState(userProfile.address || '');

  useEffect(() => {
    setFullName(userProfile.fullName || '');
    setPhone(userProfile.phone || '');
    setEmail(userProfile.email || '');
    setVehicle(userProfile.vehicle || 'Hero Electric Splendor');
    setPlateNumber(userProfile.plateNumber || 'KA-01-EA-9920');
    setAddress(userProfile.address || '');
  }, [userProfile]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  };

  const handleSave = () => {
    updateUserProfile({
      fullName,
      phone,
      email,
      vehicle,
      plateNumber,
      address,
    });
    setIsEditing(false);
    showToast('Delivery Partner details saved!');
  };

  const pickImage = async () => {
    try {
      const result = await launchImageLibrary({
        mediaType: 'photo',
        quality: 0.8,
        selectionLimit: 1,
      });
      if (!result.didCancel && result.assets && result.assets.length > 0) {
        const uri = result.assets[0].uri;
        if (uri) {
          updateUserProfile({ avatarUrl: uri });
          setAvatarModalVisible(false);
          showToast('Profile photo updated!');
        }
      }
    } catch (_err) {
      // Ignored
    }
  };

  const takePhoto = async () => {
    try {
      const result = await launchCamera({
        mediaType: 'photo',
        quality: 0.8,
        saveToPhotos: true,
      });
      if (!result.didCancel && result.assets && result.assets.length > 0) {
        const uri = result.assets[0].uri;
        if (uri) {
          updateUserProfile({ avatarUrl: uri });
          setAvatarModalVisible(false);
          showToast('New photo captured & saved!');
        }
      }
    } catch (_err) {
      // Ignored
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <DeliveryHeader title="Partner Profile" showBack={true} />

      <KeyboardAwareScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        enableOnAndroid={true}
        extraScrollHeight={30}
        keyboardShouldPersistTaps="handled"
      >
        {/* Banner Section */}
        <View style={styles.bannerCard}>
          <TouchableOpacity
            activeOpacity={0.85}
            style={styles.uploadArea}
            onPress={() => setAvatarModalVisible(true)}
          >
            {userProfile?.avatarUrl ? (
              <View style={styles.imagePreviewContainer}>
                <Image
                  source={{ uri: userProfile.avatarUrl }}
                  style={styles.previewImage}
                />
                <View style={styles.cameraBadge}>
                  <Ionicons name="camera" size={12} color="#FFFFFF" />
                </View>
              </View>
            ) : (
              <View style={styles.uploadPlaceholderBox}>
                <Ionicons name="cloud-upload-outline" size={24} color="#D1FAE5" />
                <Text style={styles.uploadPlaceholderText}>
                  Upload Profile Photo
                </Text>
              </View>
            )}
          </TouchableOpacity>

          <View style={styles.bannerInfo}>
            <Text style={styles.profileName}>{userProfile.fullName}</Text>
            <Text style={styles.profileRole}>Delivery Fleet Captain</Text>
            <View style={styles.vehicleBadgeRow}>
              <Ionicons
                name="bicycle"
                size={14}
                color="#D1FAE5"
                style={{ marginRight: 4 }}
              />
              <Text style={styles.vehicleBadgeText}>
                {userProfile.vehicle || 'EV Bike'} ·{' '}
                {userProfile.plateNumber || 'KA-01-EA-9920'}
              </Text>
            </View>
          </View>
        </View>

        {/* Action Bar Header */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>DELIVERY PARTNER INFORMATION</Text>
          {!isEditing ? (
            <TouchableOpacity
              activeOpacity={0.7}
              style={styles.editBtn}
              onPress={() => setIsEditing(true)}
            >
              <Ionicons
                name="create-outline"
                size={16}
                color="#059669"
                style={{ marginRight: 4 }}
              />
              <Text style={styles.editText}>Edit Profile</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.editActionsRow}>
              <TouchableOpacity
                activeOpacity={0.7}
                style={styles.cancelBtn}
                onPress={() => setIsEditing(false)}
              >
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                activeOpacity={0.8}
                style={styles.saveHeaderBtn}
                onPress={handleSave}
              >
                <Ionicons
                  name="checkmark-sharp"
                  size={16}
                  color="#FFF"
                  style={{ marginRight: 4 }}
                />
                <Text style={styles.saveHeaderText}>Save</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Editable Form Fields Card */}
        <View style={styles.formCard}>
          {/* Full Name */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>FULL NAME</Text>
            {isEditing ? (
              <TextInput
                style={styles.input}
                value={fullName}
                onChangeText={setFullName}
                placeholder="Enter full name"
                placeholderTextColor="#9CA3AF"
              />
            ) : (
              <Text style={styles.valueText}>{userProfile.fullName}</Text>
            )}
          </View>

          {/* Phone */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>PHONE NUMBER</Text>
            {isEditing ? (
              <TextInput
                style={styles.input}
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
                placeholder="Enter phone number"
                placeholderTextColor="#9CA3AF"
              />
            ) : (
              <Text style={styles.valueText}>{userProfile.phone}</Text>
            )}
          </View>

          {/* Email */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>EMAIL ADDRESS</Text>
            {isEditing ? (
              <TextInput
                style={styles.input}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                placeholder="Enter email"
                placeholderTextColor="#9CA3AF"
              />
            ) : (
              <Text style={styles.valueText}>{userProfile.email}</Text>
            )}
          </View>

          {/* Assigned Vehicle Model */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>ASSIGNED VEHICLE / MODEL</Text>
            {isEditing ? (
              <TextInput
                style={styles.input}
                value={vehicle}
                onChangeText={setVehicle}
                placeholder="e.g. Hero Electric Splendor"
                placeholderTextColor="#9CA3AF"
              />
            ) : (
              <Text style={styles.valueText}>
                {userProfile.vehicle || 'Hero Electric Splendor'}
              </Text>
            )}
          </View>

          {/* Vehicle Number Plate (Read-Only: Only Owner can edit) */}
          <View style={styles.fieldGroup}>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                marginBottom: 6,
              }}
            >
              <Text style={styles.label}>VEHICLE NUMBER PLATE</Text>
              <View style={styles.ownerOnlyBadge}>
                <Ionicons
                  name="lock-closed"
                  size={10}
                  color="#059669"
                  style={{ marginRight: 3 }}
                />
                <Text style={styles.ownerOnlyBadgeText}>Owner Verified</Text>
              </View>
            </View>

            <View style={styles.plateChip}>
              <Ionicons
                name="car-sport"
                size={15}
                color="#047857"
                style={{ marginRight: 6 }}
              />
              <Text style={styles.plateChipText}>
                {userProfile.plateNumber || 'KA-01-EA-9920'}
              </Text>
            </View>
            <Text style={styles.readOnlyNote}>
              * Number plate can only be modified by Network Owner
            </Text>
          </View>

          {/* Base Hub / Address */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>BASE LOCATION / HUB ADDRESS</Text>
            {isEditing ? (
              <TextInput
                style={[styles.input, styles.multilineInput]}
                value={address}
                onChangeText={setAddress}
                multiline={true}
                numberOfLines={2}
                placeholder="Enter address"
                placeholderTextColor="#9CA3AF"
              />
            ) : (
              <Text style={styles.valueText}>
                {userProfile.address || 'Central Delivery Hub'}
              </Text>
            )}
          </View>

          {isEditing && (
            <TouchableOpacity
              activeOpacity={0.85}
              style={styles.saveBtn}
              onPress={handleSave}
            >
              <Text style={styles.saveBtnText}>Save Profile Updates</Text>
            </TouchableOpacity>
          )}
        </View>
      </KeyboardAwareScrollView>

      {/* Floating Success Toast */}
      {toastMessage && (
        <View style={styles.toastContainer}>
          <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />
          <Text style={styles.toastText}>{toastMessage}</Text>
        </View>
      )}

      {/* Bottom Sheet Modal */}
      <Modal
        visible={avatarModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setAvatarModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setAvatarModalVisible(false)}
        >
          <TouchableOpacity
            activeOpacity={1}
            style={styles.modalSheet}
            onPress={e => e.stopPropagation()}
          >
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Upload Profile Photo</Text>
              <TouchableOpacity onPress={() => setAvatarModalVisible(false)}>
                <Ionicons name="close" size={22} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <Text style={styles.sheetSubtitle}>Choose photo source:</Text>

            {/* Option 1: Camera */}
            <TouchableOpacity
              activeOpacity={0.8}
              style={styles.sheetOptionBtn}
              onPress={takePhoto}
            >
              <View style={styles.optionIconContainer}>
                <Ionicons name="camera-outline" size={22} color="#059669" />
              </View>
              <Text style={styles.sheetOptionText}>📷  Camera</Text>
            </TouchableOpacity>

            {/* Option 2: Gallery */}
            <TouchableOpacity
              activeOpacity={0.8}
              style={styles.sheetOptionBtn}
              onPress={pickImage}
            >
              <View style={styles.optionIconContainer}>
                <Ionicons name="images-outline" size={22} color="#059669" />
              </View>
              <Text style={styles.sheetOptionText}>🖼️  Choose from Gallery</Text>
            </TouchableOpacity>

            {/* Cancel Button */}
            <TouchableOpacity
              activeOpacity={0.8}
              style={styles.sheetCancelBtn}
              onPress={() => setAvatarModalVisible(false)}
            >
              <Text style={styles.sheetCancelText}>Cancel</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAF8F5',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 16,
  },

  /* Banner Card */
  bannerCard: {
    backgroundColor: '#059669',
    borderRadius: 22,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    elevation: 3,
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
  },
  uploadArea: {
    marginRight: 14,
  },
  imagePreviewContainer: {
    position: 'relative',
  },
  previewImage: {
    width: 68,
    height: 68,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: '#A7F3D0',
  },
  cameraBadge: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    backgroundColor: '#047857',
    width: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  uploadPlaceholderBox: {
    width: 88,
    height: 68,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.4)',
    borderStyle: 'dashed',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  uploadPlaceholderText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#D1FAE5',
    textAlign: 'center',
    marginTop: 3,
  },
  bannerInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 19,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  profileRole: {
    fontSize: 13,
    color: '#D1FAE5',
    fontWeight: '600',
    marginBottom: 6,
  },
  vehicleBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  vehicleBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    paddingHorizontal: 2,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#6B7280',
    letterSpacing: 0.8,
  },
  editBtn: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  editText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#059669',
  },
  editActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cancelBtn: {
    marginRight: 10,
  },
  cancelText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6B7280',
  },
  saveHeaderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#059669',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 10,
  },
  saveHeaderText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  formCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    elevation: 2,
  },
  fieldGroup: {
    marginBottom: 14,
  },
  label: {
    fontSize: 11,
    fontWeight: '800',
    color: '#6B7280',
    letterSpacing: 0.6,
    marginBottom: 6,
  },
  valueText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
  },
  input: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    paddingHorizontal: 14,
    height: 46,
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  multilineInput: {
    minHeight: 56,
    textAlignVertical: 'top',
  },
  plateChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    alignSelf: 'flex-start',
  },
  plateChipText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#047857',
    letterSpacing: 0.5,
  },
  ownerOnlyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    marginLeft: 6,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  ownerOnlyBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#059669',
  },
  readOnlyNote: {
    fontSize: 11,
    color: '#9CA3AF',
    marginTop: 4,
    fontStyle: 'italic',
  },
  saveBtn: {
    backgroundColor: '#059669',
    borderRadius: 14,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
  },
  saveBtnText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 14,
  },

  toastContainer: {
    position: 'absolute',
    bottom: 85,
    left: 20,
    right: 20,
    backgroundColor: '#059669',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
  },
  toastText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
    marginLeft: 8,
  },

  /* Bottom Sheet Modal */
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 22,
    paddingBottom: Platform.OS === 'ios' ? 36 : 24,
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#111827',
  },
  sheetSubtitle: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 16,
    fontWeight: '500',
  },
  sheetOptionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  optionIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#ECFDF5',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  sheetOptionText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
  },
  sheetCancelBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    marginTop: 4,
  },
  sheetCancelText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#6B7280',
  },
});
