import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  Modal,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { launchImageLibrary, launchCamera } from 'react-native-image-picker';
import Header from '../../components/common/Header';
import { useApp } from '../../context/AppContext';

export default function ProfileScreen() {
  const { userProfile, updateUserProfile } = useApp();

  const [isEditing, setIsEditing] = useState(false);
  const [avatarModalVisible, setAvatarModalVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Form Fields State
  const [fullName, setFullName] = useState(userProfile.fullName);
  const [role, setRole] = useState(userProfile.role);
  const [phone, setPhone] = useState(userProfile.phone);
  const [email, setEmail] = useState(userProfile.email);
  const [businessName, setBusinessName] = useState(userProfile.businessName);
  const [address, setAddress] = useState(userProfile.address);
  const [vehicle, setVehicle] = useState(userProfile.vehicle || '');
  const [plateNumber, setPlateNumber] = useState(userProfile.plateNumber || '');

  // Keep local state in sync when userProfile in Context changes
  useEffect(() => {
    setFullName(userProfile.fullName);
    setRole(userProfile.role);
    setPhone(userProfile.phone);
    setEmail(userProfile.email);
    setBusinessName(userProfile.businessName);
    setAddress(userProfile.address);
    setVehicle(userProfile.vehicle || '');
    setPlateNumber(userProfile.plateNumber || '');
  }, [userProfile]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 2800);
  };

  const handleSaveProfile = () => {
    updateUserProfile({
      fullName,
      role,
      phone,
      email,
      businessName,
      address,
      vehicle,
      plateNumber,
    });
    setIsEditing(false);
    showToast('Profile updated successfully!');
  };

  const handleCancelEdit = () => {
    setFullName(userProfile.fullName);
    setRole(userProfile.role);
    setPhone(userProfile.phone);
    setEmail(userProfile.email);
    setBusinessName(userProfile.businessName);
    setAddress(userProfile.address);
    setVehicle(userProfile.vehicle || '');
    setPlateNumber(userProfile.plateNumber || '');
    setIsEditing(false);
  };

  const pickImage = async () => {
    try {
      const result = await launchImageLibrary({
        mediaType: 'photo',
        quality: 0.8,
        selectionLimit: 1,
      });

      if (result.didCancel) {
        return;
      }

      if (result.assets && result.assets.length > 0) {
        const selectedUri = result.assets[0].uri;
        if (selectedUri) {
          updateUserProfile({ avatarUrl: selectedUri });
          setAvatarModalVisible(false);
          showToast('Profile image updated!');
        }
      }
    } catch (_error) {
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

      if (result.didCancel) {
        return;
      }

      if (result.assets && result.assets.length > 0) {
        const selectedUri = result.assets[0].uri;
        if (selectedUri) {
          updateUserProfile({ avatarUrl: selectedUri });
          setAvatarModalVisible(false);
          showToast('Photo captured & updated!');
        }
      }
    } catch (_error) {
      // Ignored
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      {/* Top Navigation Header */}
      <Header title="Profile" showBack={true} />

      <KeyboardAwareScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        enableOnAndroid={true}
        extraScrollHeight={30}
        keyboardShouldPersistTaps="handled"
      >
        {/* User Card Banner */}
        <View style={styles.bannerCard}>
          {/* Upload Area */}
          <TouchableOpacity
            activeOpacity={0.85}
            style={styles.uploadArea}
            onPress={() => setAvatarModalVisible(true)}
          >
            {userProfile.avatarUrl ? (
              <View style={styles.imagePreviewContainer}>
                <Image
                  source={{ uri: userProfile.avatarUrl }}
                  style={styles.previewImage}
                />
                <View style={styles.cameraBadge}>
                  <Ionicons name="camera" size={12} color="#FFF" />
                </View>
              </View>
            ) : (
              <View style={styles.uploadPlaceholderBox}>
                <Ionicons
                  name="cloud-upload-outline"
                  size={24}
                  color="#F7D3C6"
                />
                <Text style={styles.uploadPlaceholderText}>
                  Upload Profile Photo
                </Text>
              </View>
            )}
          </TouchableOpacity>

          <View style={styles.bannerInfo}>
            <Text style={styles.bannerName}>{userProfile.fullName}</Text>
            <Text style={styles.bannerRole}>{userProfile.role}</Text>
            <Text style={styles.bannerBusiness}>
              {userProfile.businessName}
            </Text>
          </View>
        </View>

        {/* Section Header: PERSONAL DETAILS */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>PERSONAL DETAILS</Text>

          {!isEditing ? (
            <TouchableOpacity
              activeOpacity={0.7}
              style={styles.editBtn}
              onPress={() => setIsEditing(true)}
            >
              <Ionicons
                name="create-outline"
                size={16}
                color="#8C331A"
                style={{ marginRight: 4 }}
              />
              <Text style={styles.editText}>Edit</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.editActionsRow}>
              <TouchableOpacity
                activeOpacity={0.7}
                style={styles.cancelBtn}
                onPress={handleCancelEdit}
              >
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                activeOpacity={0.7}
                style={styles.saveBtn}
                onPress={handleSaveProfile}
              >
                <Ionicons
                  name="checkmark-sharp"
                  size={16}
                  color="#FFF"
                  style={{ marginRight: 4 }}
                />
                <Text style={styles.saveText}>Save</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Profile Details Cards */}
        <View style={styles.cardsWrapper}>
          {/* 1. Full Name */}
          <View style={styles.detailCard}>
            <Text style={styles.cardLabel}>FULL NAME</Text>
            {isEditing ? (
              <TextInput
                style={styles.cardInput}
                value={fullName}
                onChangeText={setFullName}
                placeholder="Enter full name"
                placeholderTextColor="#999"
              />
            ) : (
              <Text style={styles.cardValue}>{userProfile.fullName}</Text>
            )}
          </View>

          {/* 2. Role */}
          <View style={styles.detailCard}>
            <Text style={styles.cardLabel}>ROLE</Text>
            {isEditing ? (
              <TextInput
                style={styles.cardInput}
                value={role}
                onChangeText={setRole}
                placeholder="Enter designation / role"
                placeholderTextColor="#999"
              />
            ) : (
              <Text style={styles.cardValue}>{userProfile.role}</Text>
            )}
          </View>

          {/* 3. Phone */}
          <View style={styles.detailCard}>
            <Text style={styles.cardLabel}>PHONE</Text>
            {isEditing ? (
              <TextInput
                style={styles.cardInput}
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
                placeholder="Enter phone number"
                placeholderTextColor="#999"
              />
            ) : (
              <Text style={styles.cardValue}>{userProfile.phone}</Text>
            )}
          </View>

          {/* 4. Email */}
          <View style={styles.detailCard}>
            <Text style={styles.cardLabel}>EMAIL</Text>
            {isEditing ? (
              <TextInput
                style={styles.cardInput}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                placeholder="Enter email address"
                placeholderTextColor="#999"
              />
            ) : (
              <Text style={styles.cardValue}>{userProfile.email}</Text>
            )}
          </View>

          {/* 5. Business Name */}
          <View style={styles.detailCard}>
            <Text style={styles.cardLabel}>BUSINESS NAME</Text>
            {isEditing ? (
              <TextInput
                style={styles.cardInput}
                value={businessName}
                onChangeText={setBusinessName}
                placeholder="Enter business name"
                placeholderTextColor="#999"
              />
            ) : (
              <Text style={styles.cardValue}>{userProfile.businessName}</Text>
            )}
          </View>

          {/* 6. Address */}
          <View style={styles.detailCard}>
            <Text style={styles.cardLabel}>ADDRESS</Text>
            {isEditing ? (
              <TextInput
                style={[styles.cardInput, styles.multilineInput]}
                value={address}
                onChangeText={setAddress}
                multiline={true}
                numberOfLines={2}
                placeholder="Enter address"
                placeholderTextColor="#999"
              />
            ) : (
              <Text style={styles.cardValue}>{userProfile.address}</Text>
            )}
          </View>
        </View>
      </KeyboardAwareScrollView>

      {/* Floating Success Toast Banner */}
      {toastMessage && (
        <View style={styles.toastContainer}>
          <Ionicons name="checkmark-circle" size={20} color="#FFF" />
          <Text style={styles.toastText}>{toastMessage}</Text>
        </View>
      )}

      {/* Bottom Sheet Upload Modal */}
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
                <Ionicons name="close" size={22} color="#6E6259" />
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
                <Ionicons name="camera-outline" size={22} color="#8C331A" />
              </View>
              <Text style={styles.sheetOptionText}>Camera</Text>
            </TouchableOpacity>

            {/* Option 2: Gallery */}
            <TouchableOpacity
              activeOpacity={0.8}
              style={styles.sheetOptionBtn}
              onPress={pickImage}
            >
              <View style={styles.optionIconContainer}>
                <Ionicons name="images-outline" size={22} color="#8C331A" />
              </View>
              <Text style={styles.sheetOptionText}>Choose from Gallery</Text>
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
    paddingTop: 8,
    paddingBottom: 16,
  },

  /* Top Banner Card */
  bannerCard: {
    backgroundColor: '#7A2E19',
    borderRadius: 24,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 10,
    elevation: 4,
    shadowColor: '#7A2E19',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  uploadArea: {
    marginRight: 16,
  },
  imagePreviewContainer: {
    position: 'relative',
  },
  previewImage: {
    width: 68,
    height: 68,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: '#FFA085',
  },
  cameraBadge: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    backgroundColor: '#D9381E',
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
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  uploadPlaceholderText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#F7D3C6',
    textAlign: 'center',
    marginTop: 3,
  },
  bannerInfo: {
    flex: 1,
  },
  bannerName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  bannerRole: {
    fontSize: 13,
    color: '#F7D3C6',
    fontWeight: '500',
  },
  bannerBusiness: {
    fontSize: 13,
    color: '#F7D3C6',
    marginTop: 2,
    fontWeight: '400',
  },

  /* Section Header */
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 12,
    paddingHorizontal: 2,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#6E6259',
    letterSpacing: 0.8,
  },
  editBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  editText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#8C331A',
  },
  editActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cancelBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 8,
  },
  cancelText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#888',
  },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#8C331A',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 14,
  },
  saveText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFF',
  },

  /* Cards Wrapper & Detail Cards */
  cardsWrapper: {
    marginTop: 2,
  },
  detailCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    paddingHorizontal: 18,
    paddingVertical: 14,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
  },
  cardLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#8A7E75',
    letterSpacing: 0.6,
    marginBottom: 6,
  },
  cardValue: {
    fontSize: 15,
    fontWeight: '700',
    color: '#2C201A',
  },
  cardInput: {
    backgroundColor: '#F7F5F2',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    fontWeight: '600',
    color: '#2C201A',
    borderWidth: 1,
    borderColor: '#EBE6E1',
  },
  multilineInput: {
    minHeight: 54,
    textAlignVertical: 'top',
  },

  /* Toast Banner */
  toastContainer: {
    position: 'absolute',
    bottom: 85,
    left: 20,
    right: 20,
    backgroundColor: '#8C331A',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
  },
  toastText: {
    color: '#FFF',
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
    color: '#2C201A',
  },
  sheetSubtitle: {
    fontSize: 13,
    color: '#8A7E75',
    marginBottom: 16,
    fontWeight: '500',
  },
  sheetOptionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FAF7F5',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#F0ECE8',
  },
  optionIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FDEEEB',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  sheetOptionText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#2C201A',
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
    color: '#8A7E75',
  },
});
