import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Image,
  TouchableOpacity,
  TextInput,
  Modal,
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { launchImageLibrary, launchCamera } from 'react-native-image-picker';
import DeliveryHeader from '../../components/delivery/DeliveryHeader';
import { useApp } from '../../context/AppContext';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import deliveryService, { DeliveryPartnerProfile } from '../../services/delivery.service';

export default function ProfileScreen({ navigation: _navigation }: any) {
  const { userProfile, updateUserProfile, logout } = useApp();

  const [partnerProfile, setPartnerProfile] = useState<DeliveryPartnerProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [isEditing, setIsEditing] = useState(false);
  const [avatarModalVisible, setAvatarModalVisible] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Form Fields
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [emergencyPhone, setEmergencyPhone] = useState('');
  const [location, setLocation] = useState('');

  const fetchProfile = useCallback(async () => {
    try {
      setLoading(true);
      const partners = await deliveryService.getDeliveryPartners();
      if (Array.isArray(partners) && partners.length > 0) {
        const myProfile = partners[0];
        setPartnerProfile(myProfile);
        setFullName(myProfile.name || userProfile.fullName || '');
        setPhone(myProfile.phone || userProfile.phone || '');
        setEmergencyPhone(myProfile.emergency_phone || '');
        setLocation(myProfile.location || '');
      } else {
        // Fallback to authenticated user info
        setFullName(userProfile.fullName || '');
        setPhone(userProfile.phone || '');
        setEmergencyPhone('');
        setLocation('');
      }
    } catch (err) {
      console.log('Error fetching delivery partner profile:', err);
      setFullName(userProfile.fullName || '');
      setPhone(userProfile.phone || '');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [userProfile]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchProfile();
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  };

  const handleSave = async () => {
    try {
      if (partnerProfile?.id) {
        await deliveryService.updateDeliveryBoy(partnerProfile.id, {
          name: fullName.trim(),
          phone: phone.trim(),
          emergency_phone: emergencyPhone.trim(),
          location: location.trim(),
        });
      }
      updateUserProfile({
        fullName: fullName.trim(),
        phone: phone.trim(),
      });
      setIsEditing(false);
      showToast('Profile updated successfully!');
      fetchProfile();
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to update profile.');
    }
  };

  const handleLogout = () => {
    setShowLogoutConfirm(true);
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

  const displayName = fullName || partnerProfile?.name || userProfile.fullName || 'Delivery Partner';
  const displayPhone = phone || partnerProfile?.phone || userProfile.phone || 'No phone set';
  const displayStatus = partnerProfile?.status || 'READY';
  const isActive = partnerProfile?.is_active ?? true;

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <DeliveryHeader title="Partner Profile" showBack={true} />

      {loading && !refreshing ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#059669" />
          <Text style={styles.loadingText}>Loading profile...</Text>
        </View>
      ) : (
        <KeyboardAwareScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          enableOnAndroid={true}
          extraScrollHeight={30}
          keyboardShouldPersistTaps="handled"
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={['#059669']}
              tintColor="#059669"
            />
          }
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
                    Photo
                  </Text>
                </View>
              )}
            </TouchableOpacity>

            <View style={styles.bannerInfo}>
              <Text style={styles.profileName} numberOfLines={1}>{displayName}</Text>
              <View style={styles.statusRow}>
                <View style={[styles.statusDot, { backgroundColor: isActive ? '#34D399' : '#EF4444' }]} />
                <Text style={styles.profileRole}>
                  {isActive ? `Active • ${displayStatus}` : 'Account Deactivated'}
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
              <TouchableOpacity
                activeOpacity={0.7}
                style={styles.cancelBtn}
                onPress={() => setIsEditing(false)}
              >
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Form Fields Card */}
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
                <Text style={styles.valueText}>{displayName}</Text>
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
                <Text style={styles.valueText}>{displayPhone}</Text>
              )}
            </View>

            {/* Emergency Phone */}
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>EMERGENCY CONTACT</Text>
              {isEditing ? (
                <TextInput
                  style={styles.input}
                  value={emergencyPhone}
                  onChangeText={setEmergencyPhone}
                  keyboardType="phone-pad"
                  placeholder="Enter emergency contact number"
                  placeholderTextColor="#9CA3AF"
                />
              ) : (
                <Text style={styles.valueText}>
                  {emergencyPhone || 'Not specified'}
                </Text>
              )}
            </View>

            {/* Hub / Base Location */}
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>BASE LOCATION / HUB</Text>
              {isEditing ? (
                <TextInput
                  style={[styles.input, styles.multilineInput]}
                  value={location}
                  onChangeText={setLocation}
                  multiline={true}
                  numberOfLines={2}
                  placeholder="Enter hub location"
                  placeholderTextColor="#9CA3AF"
                />
              ) : (
                <Text style={styles.valueText}>
                  {location || 'Assigned to Fleet Hub'}
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

          {/* Logout Button */}
          <TouchableOpacity
            style={styles.logoutBtn}
            onPress={handleLogout}
            activeOpacity={0.85}
          >
            <Ionicons name="log-out-outline" size={18} color="#DC2626" style={{ marginRight: 8 }} />
            <Text style={styles.logoutBtnText}>Log Out</Text>
          </TouchableOpacity>
        </KeyboardAwareScrollView>
      )}

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

            <TouchableOpacity
              activeOpacity={0.8}
              style={styles.sheetOptionBtn}
              onPress={takePhoto}
            >
              <View style={styles.optionIconContainer}>
                <Ionicons name="camera-outline" size={22} color="#059669" />
              </View>
              <Text style={styles.sheetOptionText}>Camera</Text>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.8}
              style={styles.sheetOptionBtn}
              onPress={pickImage}
            >
              <View style={styles.optionIconContainer}>
                <Ionicons name="images-outline" size={22} color="#059669" />
              </View>
              <Text style={styles.sheetOptionText}>Choose from Gallery</Text>
            </TouchableOpacity>

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

      {/* Logout Confirmation Dialog */}
      <ConfirmDialog
        visible={showLogoutConfirm}
        title="Confirm Logout"
        description="Are you sure you want to logout from your account?"
        confirmLabel="Logout"
        cancelLabel="Cancel"
        type="danger"
        icon="log-out-outline"
        onConfirm={async () => {
          setShowLogoutConfirm(false);
          await logout();
        }}
        onCancel={() => setShowLogoutConfirm(false)}
      />
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
    paddingBottom: 24,
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '600',
  },
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
    borderRadius: 34,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  cameraBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#10B981',
    width: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  uploadPlaceholderBox: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#D1FAE5',
    borderStyle: 'dashed',
  },
  uploadPlaceholderText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFFFFF',
    marginTop: 2,
  },
  bannerInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 19,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 3,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  profileRole: {
    fontSize: 12,
    color: '#D1FAE5',
    fontWeight: '600',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    paddingHorizontal: 4,
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
  cancelBtn: {
    paddingHorizontal: 8,
  },
  cancelText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#EF4444',
  },
  formCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: '#EFECE8',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    marginBottom: 14,
  },
  fieldGroup: {
    marginBottom: 14,
  },
  label: {
    fontSize: 11,
    fontWeight: '700',
    color: '#6B7280',
    marginBottom: 5,
    letterSpacing: 0.6,
  },
  valueText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  input: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 14,
    color: '#111827',
  },
  multilineInput: {
    minHeight: 54,
    textAlignVertical: 'top',
  },
  saveBtn: {
    backgroundColor: '#059669',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  saveBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FEE2E2',
    paddingVertical: 12,
    borderRadius: 14,
    marginBottom: 20,
  },
  logoutBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#DC2626',
  },
  toastContainer: {
    position: 'absolute',
    bottom: 24,
    left: 20,
    right: 20,
    backgroundColor: '#059669',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
  },
  toastText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
    marginLeft: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  sheetTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#111827',
  },
  sheetSubtitle: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 16,
  },
  sheetOptionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
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
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  sheetCancelBtn: {
    alignItems: 'center',
    paddingVertical: 14,
    marginTop: 8,
  },
  sheetCancelText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#6B7280',
  },
});
