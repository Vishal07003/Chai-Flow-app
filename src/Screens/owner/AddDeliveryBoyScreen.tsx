import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  Keyboard,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { launchCamera, launchImageLibrary } from 'react-native-image-picker';
import Header from '../../components/common/Header';
import { useApp } from '../../context/AppContext';
import { validation } from '../../utils/validation';
import { AppToast } from '../../utils/toast';

export default function AddDeliveryBoyScreen({ navigation }: any) {
  const { addDeliveryBoy } = useApp();

  /* Personal Details */
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [emergencyPhone, setEmergencyPhone] = useState('');
  const [licenseNumber, setLicenseNumber] = useState('');

  /* Vehicle Choice & Registration */
  const [vehicleType, setVehicleType] = useState<
    'Scooter' | 'E-Bike' | 'Auto Cargo' | 'Mini Van'
  >('Scooter');
  const [vehicleModel, setVehicleModel] = useState('');
  const [numberPlate, setNumberPlate] = useState('');

  /* Photos */
  const [profilePhotoUri, setProfilePhotoUri] = useState<string | null>(null);
  const [numberPlatePhotoUri, setNumberPlatePhotoUri] = useState<string | null>(
    null,
  );
  const [licensePhotoUri, setLicensePhotoUri] = useState<string | null>(null);

  /* Status & Location */
  const [location, setLocation] = useState('');
  const [status, setStatus] = useState<'READY' | 'BUSY' | 'OFFLINE'>('READY');
  const [showToast, setShowToast] = useState(false);

  /* Image Pickers (Camera / Device Gallery) */
  const handlePickPhoto = (target: 'profile' | 'numberPlate' | 'license') => {
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
                if (target === 'profile') setProfilePhotoUri(uri);
                if (target === 'numberPlate') setNumberPlatePhotoUri(uri);
                if (target === 'license') setLicensePhotoUri(uri);
              }
            }
          } catch (error) {
            console.log('Error launching camera:', error);
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
                if (target === 'profile') setProfilePhotoUri(uri);
                if (target === 'numberPlate') setNumberPlatePhotoUri(uri);
                if (target === 'license') setLicensePhotoUri(uri);
              }
            }
          } catch (error) {
            console.log('Error launching gallery:', error);
          }
        },
      },
      {
        text: 'Cancel',
        style: 'cancel',
      },
    ]);
  };

  const handleSaveDeliveryBoy = () => {
    Keyboard.dismiss();

    if (!validation.isNotEmpty(name)) {
      AppToast.error('Validation Error', 'Please enter partner full name.');
      return;
    }

    if (!validation.isValidPhone(phone)) {
      AppToast.error(
        'Validation Error',
        'Please enter a valid 10-digit mobile number.',
      );
      return;
    }

    addDeliveryBoy({
      name: name.trim(),
      phone: phone.trim(),
      emergencyContact: emergencyPhone.trim() || '+91 98765 00000',
      licenseNumber: licenseNumber.trim() || 'DL-99202688',
      vehicleType,
      vehicleModel:
        vehicleModel.trim() ||
        (vehicleType === 'Scooter' ? 'Honda Activa 6G' : 'Hero E-Bike'),
      numberPlate: numberPlate.trim() || 'DL 01 AB 1234',
      numberPlatePhotoUri: numberPlatePhotoUri || undefined,
      licensePhotoUri: licensePhotoUri || undefined,
      status: status,
      location: location.trim() || 'Assigned to Hub Central',
      distance: '0 km away',
      avatarUrl:
        profilePhotoUri ||
        `https://ui-avatars.com/api/?name=${encodeURIComponent(
          name,
        )}&background=8C331A&color=FFF`,
      progress: status === 'BUSY' ? 30 : 0,
    });

    AppToast.success('Success', 'Delivery partner registered!');

    setTimeout(() => {
      navigation.goBack();
    }, 1200);
  };

  return (
    <SafeAreaView style={styles.container}>
      <Header title="Add Delivery Partner" showBack={true} />

      {showToast && (
        <View style={styles.toast}>
          <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />
          <Text style={styles.toastText}>
            Delivery partner & vehicle details registered!
          </Text>
        </View>
      )}

      <KeyboardAwareScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        enableOnAndroid={true}
      >
        {/* Profile Avatar Selector */}
        <View style={styles.avatarSection}>
          <TouchableOpacity
            activeOpacity={0.85}
            style={styles.avatarWrapper}
            onPress={() => handlePickPhoto('profile')}
          >
            {profilePhotoUri ? (
              <Image
                source={{ uri: profilePhotoUri }}
                style={styles.avatarImg}
              />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Ionicons name="person-add-outline" size={36} color="#8C331A" />
              </View>
            )}

            <View style={styles.cameraIconCircle}>
              <Ionicons name="camera" size={14} color="#FFFFFF" />
            </View>
          </TouchableOpacity>
          <Text style={styles.avatarHelpText}>
            Tap to upload partner profile picture
          </Text>
        </View>

        {/* SECTION 1: Personal Details */}
        <View style={styles.sectionHeaderRow}>
          <Ionicons name="person" size={18} color="#8C331A" />
          <Text style={styles.sectionTitle}>1. Personal Information</Text>
        </View>

        <Text style={styles.label}>Full Name *</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. Suresh Patel"
          placeholderTextColor="#B5AAA2"
          value={name}
          onChangeText={setName}
        />

        <View style={styles.rowTwoInputs}>
          <View style={{ flex: 1, marginRight: 6 }}>
            <Text style={styles.label}>Mobile Phone</Text>
            <TextInput
              style={styles.input}
              placeholder="+91 98765 43210"
              placeholderTextColor="#B5AAA2"
              keyboardType="phone-pad"
              value={phone}
              onChangeText={setPhone}
            />
          </View>

          <View style={{ flex: 1, marginLeft: 6 }}>
            <Text style={styles.label}>Emergency Phone</Text>
            <TextInput
              style={styles.input}
              placeholder="+91 98112 00000"
              placeholderTextColor="#B5AAA2"
              keyboardType="phone-pad"
              value={emergencyPhone}
              onChangeText={setEmergencyPhone}
            />
          </View>
        </View>

        <Text style={styles.label}>Driving License / ID Number</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. DL-042023001829"
          placeholderTextColor="#B5AAA2"
          value={licenseNumber}
          onChangeText={setLicenseNumber}
        />

        {/* SECTION 2: Vehicle Choice & Number Plate */}
        <View style={[styles.sectionHeaderRow, { marginTop: 20 }]}>
          <Ionicons name="bicycle" size={18} color="#8C331A" />
          <Text style={styles.sectionTitle}>2. Vehicle Choice & Details</Text>
        </View>

        <Text style={styles.label}>Vehicle Type</Text>
        <View style={styles.vehicleGrid}>
          {[
            { id: 'Scooter', label: 'Scooter / Bike', icon: 'bicycle-outline' },
            { id: 'E-Bike', label: 'Electric E-Bike', icon: 'flash-outline' },
            { id: 'Auto Cargo', label: 'Auto Cargo', icon: 'bus-outline' },
            { id: 'Mini Van', label: 'Mini Van', icon: 'car-outline' },
          ].map(v => {
            const isSelected = vehicleType === v.id;
            return (
              <TouchableOpacity
                key={v.id}
                activeOpacity={0.8}
                style={[
                  styles.vehicleCard,
                  isSelected && styles.vehicleCardActive,
                ]}
                onPress={() => setVehicleType(v.id as any)}
              >
                <Ionicons
                  name={v.icon}
                  size={20}
                  color={isSelected ? '#FFF' : '#8C331A'}
                />
                <Text
                  style={[
                    styles.vehicleText,
                    isSelected && styles.vehicleTextActive,
                  ]}
                >
                  {v.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={styles.rowTwoInputs}>
          <View style={{ flex: 1, marginRight: 6 }}>
            <Text style={styles.label}>Vehicle Brand & Model</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Honda Activa 6G"
              placeholderTextColor="#B5AAA2"
              value={vehicleModel}
              onChangeText={setVehicleModel}
            />
          </View>

          <View style={{ flex: 1, marginLeft: 6 }}>
            <Text style={styles.label}>Number Plate (RC)</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. DL 01 AB 1234"
              placeholderTextColor="#B5AAA2"
              autoCapitalize="characters"
              value={numberPlate}
              onChangeText={setNumberPlate}
            />
          </View>
        </View>

        {/* SECTION 3: Document Photo Uploads */}
        <View style={[styles.sectionHeaderRow, { marginTop: 20 }]}>
          <Ionicons name="camera" size={18} color="#8C331A" />
          <Text style={styles.sectionTitle}>3. Document & Vehicle Photos</Text>
        </View>

        <View style={styles.photoUploadRow}>
          {/* Number Plate Photo Upload */}
          <TouchableOpacity
            activeOpacity={0.8}
            style={styles.photoUploadCard}
            onPress={() => handlePickPhoto('numberPlate')}
          >
            {numberPlatePhotoUri ? (
              <Image
                source={{ uri: numberPlatePhotoUri }}
                style={styles.uploadPreview}
              />
            ) : (
              <View style={styles.uploadPlaceholder}>
                <Ionicons name="image-outline" size={24} color="#8C331A" />
                <Text style={styles.uploadLabel}>Number Plate Photo</Text>
                <Text style={styles.uploadSub}>Tap to upload</Text>
              </View>
            )}
          </TouchableOpacity>

          {/* License Photo Upload */}
          <TouchableOpacity
            activeOpacity={0.8}
            style={styles.photoUploadCard}
            onPress={() => handlePickPhoto('license')}
          >
            {licensePhotoUri ? (
              <Image
                source={{ uri: licensePhotoUri }}
                style={styles.uploadPreview}
              />
            ) : (
              <View style={styles.uploadPlaceholder}>
                <Ionicons name="card-outline" size={24} color="#8C331A" />
                <Text style={styles.uploadLabel}>Driving License</Text>
                <Text style={styles.uploadSub}>Tap to upload</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* SECTION 4: Route & Duty */}
        <Text style={styles.label}>Assigned Route / Delivery Hub Sector</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. Commercial Street & Sector 14"
          placeholderTextColor="#B5AAA2"
          value={location}
          onChangeText={setLocation}
        />

        <Text style={styles.label}>Initial Duty Status</Text>
        <View style={styles.statusRow}>
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
                  isActive
                    ? { backgroundColor: activeBg, borderColor: activeBg }
                    : styles.inactiveStatusChip,
                ]}
              >
                <Text
                  style={[
                    styles.statusChipText,
                    isActive
                      ? styles.activeStatusChipText
                      : styles.inactiveStatusChipText,
                  ]}
                >
                  {st === 'READY'
                    ? '🟢 On Duty'
                    : st === 'BUSY'
                    ? '🚚 On Delivery'
                    : '🔴 Off Duty'}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Submit Button */}
        <TouchableOpacity
          activeOpacity={0.8}
          style={styles.submitBtn}
          onPress={handleSaveDeliveryBoy}
        >
          <Ionicons
            name="checkmark-circle"
            size={20}
            color="#FFFFFF"
            style={{ marginRight: 8 }}
          />
          <Text style={styles.submitBtnText}>Register Partner to Fleet</Text>
        </TouchableOpacity>
      </KeyboardAwareScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAF8F5',
  },
  toast: {
    position: 'absolute',
    top: 50,
    left: 20,
    right: 20,
    backgroundColor: '#8C331A',
    borderRadius: 14,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 999,
    elevation: 6,
  },
  toastText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
    marginLeft: 10,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 40,
  },
  avatarSection: {
    alignItems: 'center',
    marginVertical: 14,
  },
  avatarWrapper: {
    position: 'relative',
  },
  avatarImg: {
    width: 90,
    height: 90,
    borderRadius: 45,
  },
  avatarPlaceholder: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: '#FDEEEB',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#F8C4B8',
    borderStyle: 'dashed',
  },
  cameraIconCircle: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    backgroundColor: '#8C331A',
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  avatarHelpText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#7C6E65',
    marginTop: 8,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#8C331A',
    marginLeft: 6,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    color: '#2C201A',
    marginBottom: 6,
    marginTop: 8,
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#EFECE9',
    paddingHorizontal: 14,
    height: 48,
    fontSize: 14,
    color: '#2C201A',
    marginBottom: 6,
  },
  rowTwoInputs: {
    flexDirection: 'row',
  },
  vehicleGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  vehicleCard: {
    width: '48%',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#EFECE9',
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 12,
    marginBottom: 8,
  },
  vehicleCardActive: {
    backgroundColor: '#8C331A',
    borderColor: '#8C331A',
  },
  vehicleText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#2C201A',
    marginLeft: 8,
  },
  vehicleTextActive: {
    color: '#FFFFFF',
  },
  photoUploadRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  photoUploadCard: {
    width: '48%',
    height: 100,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#EFECE9',
    borderStyle: 'dashed',
  },
  uploadPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 8,
  },
  uploadLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#2C201A',
    marginTop: 4,
  },
  uploadSub: {
    fontSize: 10,
    color: '#7C6E65',
  },
  uploadPreview: {
    width: '100%',
    height: '100%',
  },
  statusRow: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  statusChip: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 14,
    alignItems: 'center',
    marginRight: 6,
    borderWidth: 1,
  },
  activeStatusChip: {
    backgroundColor: '#8C331A',
    borderColor: '#8C331A',
  },
  inactiveStatusChip: {
    backgroundColor: '#FFFFFF',
    borderColor: '#EFECE9',
  },
  statusChipText: {
    fontSize: 12,
    fontWeight: '700',
  },
  activeStatusChipText: {
    color: '#FFFFFF',
  },
  inactiveStatusChipText: {
    color: '#6E6259',
  },
  submitBtn: {
    backgroundColor: '#8C331A',
    borderRadius: 26,
    height: 52,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 18,
    marginBottom: 20,
    elevation: 3,
    shadowColor: '#8C331A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
  },
  submitBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});
