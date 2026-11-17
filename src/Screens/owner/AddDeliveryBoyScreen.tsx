import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  Keyboard,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { launchCamera, launchImageLibrary } from 'react-native-image-picker';
import Header from '../../components/common/Header';
import { CustomDialog } from '../../components/common';
import { useApp } from '../../context/AppContext';
import { validation } from '../../utils/validation';
import { AppToast } from '../../utils/toast';

export default function AddDeliveryBoyScreen({ navigation }: any) {
  const { addDeliveryBoy } = useApp();

  /* 3 Fields Only: Full Name, Mobile Number, Profile Photo (Optional) */
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [profilePhotoUri, setProfilePhotoUri] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Dialog State for Camera / Gallery Selection
  const [dialogConfig, setDialogConfig] = useState<{
    visible: boolean;
    title: string;
    message?: string;
    type?: 'confirm' | 'danger' | 'info' | 'warning' | 'success';
    buttons?: Array<{
      text: string;
      style?: 'default' | 'cancel' | 'destructive';
      onPress?: () => void;
    }>;
  }>({
    visible: false,
    title: '',
  });

  const closeDialog = () => setDialogConfig(prev => ({ ...prev, visible: false }));

  /* Image Picker: Camera or Gallery */
  const handlePickPhoto = () => {
    setDialogConfig({
      visible: true,
      title: 'Profile Photo (Optional)',
      message: 'Choose photo source:',
      type: 'confirm',
      buttons: [
        {
          text: 'Take Photo (Camera)',
          onPress: async () => {
            closeDialog();
            try {
              const result = await launchCamera({
                mediaType: 'photo',
                quality: 0.8,
                saveToPhotos: false,
              });
              if (!result.didCancel && result.assets && result.assets.length > 0) {
                const uri = result.assets[0].uri;
                if (uri) setProfilePhotoUri(uri);
              }
            } catch (error) {
              console.log('Error launching camera:', error);
            }
          },
        },
        {
          text: 'Choose from Gallery',
          onPress: async () => {
            closeDialog();
            try {
              const result = await launchImageLibrary({
                mediaType: 'photo',
                quality: 0.8,
              });
              if (!result.didCancel && result.assets && result.assets.length > 0) {
                const uri = result.assets[0].uri;
                if (uri) setProfilePhotoUri(uri);
              }
            } catch (error) {
              console.log('Error launching gallery:', error);
            }
          },
        },
        {
          text: 'Cancel',
          style: 'cancel',
          onPress: closeDialog,
        },
      ],
    });
  };

  const handleSaveDeliveryBoy = async () => {
    Keyboard.dismiss();

    const trimmedName = name.trim();
    if (!validation.isNotEmpty(trimmedName)) {
      AppToast.error('Validation Error', 'Please enter partner full name.');
      return;
    }

    const trimmedPhone = phone.trim();
    if (!validation.isValidPhone(trimmedPhone)) {
      AppToast.error('Validation Error', 'Please enter a valid 10-digit mobile number.');
      return;
    }

    const cleanMobile = trimmedPhone.replace(/\D/g, '').slice(-10);

    setIsSubmitting(true);
    try {
      await addDeliveryBoy({
        name: trimmedName,
        phone: cleanMobile,
        status: 'READY',
        location: 'Assigned to Fleet',
        avatarUrl:
          profilePhotoUri ||
          `https://ui-avatars.com/api/?name=${encodeURIComponent(
            trimmedName,
          )}&background=8C331A&color=FFF`,
      });

      AppToast.success(
        'Partner Registered',
        `${trimmedName} added. They can verify and log in via Mobile OTP.`,
      );

      setTimeout(() => {
        navigation.goBack();
      }, 800);
    } catch (err: any) {
      const errorMsg =
        err?.response?.data?.phone ||
        err?.response?.data?.name ||
        err?.message ||
        'Failed to register delivery partner.';
      AppToast.error('Registration Failed', Array.isArray(errorMsg) ? errorMsg[0] : errorMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <Header title="Add Delivery Partner" showBack={true} />

      <KeyboardAwareScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        enableOnAndroid={true}
        bounces={false}
      >
        {/* 1. Optional Profile Photo */}
        <View style={styles.avatarSection}>
          <TouchableOpacity
            activeOpacity={0.85}
            style={styles.avatarWrapper}
            onPress={handlePickPhoto}
          >
            {profilePhotoUri ? (
              <Image source={{ uri: profilePhotoUri }} style={styles.avatarImg} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Ionicons name="person-outline" size={38} color="#8C331A" />
              </View>
            )}

            <View style={styles.cameraIconCircle}>
              <Ionicons name="camera" size={14} color="#FFFFFF" />
            </View>
          </TouchableOpacity>
          <Text style={styles.avatarHelpText}>
            {profilePhotoUri ? 'Tap to change photo' : 'Add Photo (Optional)'}
          </Text>
        </View>

        {/* Input Card Container */}
        <View style={styles.card}>
          {/* 2. Full Name Input */}
          <Text style={styles.label}>FULL NAME *</Text>
          <View style={styles.inputWrapper}>
            <Ionicons name="person-outline" size={18} color="#7A6A60" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="e.g. Suresh Patel"
              placeholderTextColor="#A09085"
              value={name}
              onChangeText={setName}
              autoCapitalize="words"
              editable={!isSubmitting}
            />
          </View>

          {/* 3. Mobile Number Input (+91 prefix) */}
          <Text style={[styles.label, { marginTop: 14 }]}>MOBILE NUMBER *</Text>
          <View style={styles.inputWrapper}>
            <Ionicons name="call-outline" size={18} color="#7A6A60" style={styles.inputIcon} />
            <Text style={styles.countryCode}>+91</Text>
            <TextInput
              style={styles.input}
              placeholder="10-digit mobile number"
              placeholderTextColor="#A09085"
              keyboardType="phone-pad"
              maxLength={10}
              value={phone}
              onChangeText={setPhone}
              editable={!isSubmitting}
            />
          </View>

          {/* Helper notice */}
          <View style={styles.noticeBox}>
            <Ionicons name="information-circle-outline" size={16} color="#059669" />
            <Text style={styles.noticeText}>
              Delivery partner will verify this mobile number using SMS OTP during their first login.
            </Text>
          </View>

          {/* Submit Button */}
          <TouchableOpacity
            activeOpacity={0.8}
            style={[styles.submitBtn, isSubmitting && styles.submitBtnDisabled]}
            onPress={handleSaveDeliveryBoy}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <>
                <Text style={styles.submitBtnText}>Create Delivery Partner</Text>
                <Ionicons name="arrow-forward" size={18} color="#FFFFFF" style={styles.btnIcon} />
              </>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAwareScrollView>

      {/* Dialog for Photo Selection */}
      <CustomDialog
        visible={dialogConfig.visible}
        title={dialogConfig.title}
        message={dialogConfig.message}
        type={dialogConfig.type}
        buttons={dialogConfig.buttons}
        onClose={closeDialog}
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
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 32,
  },
  avatarSection: {
    alignItems: 'center',
    marginVertical: 14,
  },
  avatarWrapper: {
    position: 'relative',
  },
  avatarImg: {
    width: 88,
    height: 88,
    borderRadius: 44,
  },
  avatarPlaceholder: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: '#FDEEEB',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#F8C4B8',
    borderStyle: 'dashed',
  },
  cameraIconCircle: {
    position: 'absolute',
    bottom: 0,
    right: 0,
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
    fontWeight: '700',
    color: '#7C6E65',
    marginTop: 8,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 20,
    borderWidth: 1,
    borderColor: '#EFEAE4',
    shadowColor: '#8C331A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
    marginTop: 6,
  },
  label: {
    fontSize: 11,
    fontWeight: '800',
    color: '#5C4A3E',
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FAF7F4',
    borderWidth: 1.5,
    borderColor: '#E8DED6',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 48,
  },
  inputIcon: {
    marginRight: 8,
  },
  countryCode: {
    fontSize: 15,
    fontWeight: '700',
    color: '#2C1E18',
    marginRight: 8,
  },
  input: {
    flex: 1,
    fontSize: 14,
    color: '#2C1E18',
    fontWeight: '600',
    padding: 0,
  },
  noticeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    borderRadius: 10,
    padding: 10,
    marginTop: 16,
    borderWidth: 1,
    borderColor: '#A7F3D0',
    gap: 8,
  },
  noticeText: {
    flex: 1,
    fontSize: 12,
    color: '#065F46',
    lineHeight: 16,
    fontWeight: '500',
  },
  submitBtn: {
    backgroundColor: '#8C331A',
    borderRadius: 12,
    height: 48,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
    shadowColor: '#8C331A',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  submitBtnDisabled: {
    backgroundColor: '#C5A496',
  },
  submitBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  btnIcon: {
    marginLeft: 8,
  },
});
