import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import Ionicons from 'react-native-vector-icons/Ionicons';
import ChaiFlowHeader from '../../components/common/ChaiFlowHeader';
import { useApp } from '../../context/AppContext';
import { validation } from '../../utils/validation';
import { AppToast } from '../../utils/toast';

interface LoginScreenProps {
  navigation?: any;
}

export default function LoginScreen({ navigation }: LoginScreenProps) {
  const { setUserMobile } = useApp();
  const [phone, setPhone] = useState('');

  const handleSendOtp = () => {
    const trimmed = phone.trim();

    if (!validation.isValidPhone(trimmed)) {
      AppToast.error('Validation Error', 'Please enter a valid 10-digit mobile number.');
      return;
    }

    const formatted = trimmed.startsWith('+91') ? trimmed : `+91 ${trimmed}`;
    setUserMobile(formatted);
    AppToast.info('OTP Sent', `Verification code sent to ${formatted}`);

    if (navigation) {
      navigation.navigate('VerifyOtp');
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAwareScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        enableOnAndroid={true}
        extraScrollHeight={20}
        keyboardShouldPersistTaps="handled"
      >
        {/* Top Brand Header */}
        <ChaiFlowHeader />

        {/* Section Tag */}
        <View style={styles.tagContainer}>
          <Text style={styles.tagDot}>•</Text>
          <Text style={styles.tagText}>SIGN IN</Text>
        </View>

        {/* Unified Main Title & Subtitle */}
        <Text style={styles.mainTitle}>Welcome to ChaiFlow</Text>
        <Text style={styles.subTitle}>
          Sign in with your mobile number to access your operations, inventory,
          and deliveries.
        </Text>

        {/* Form Card */}
        <View style={styles.card}>
          <Text style={styles.inputLabel}>MOBILE NUMBER</Text>

          <View style={styles.inputWrapper}>
            <Ionicons
              name="call-outline"
              size={18}
              color="#7A6A60"
              style={styles.phoneIcon}
            />
            <Text style={styles.countryCode}>+91</Text>
            <TextInput
              style={styles.input}
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
              placeholder="Enter mobile number"
              placeholderTextColor="#A09085"
            />
          </View>

          <TouchableOpacity
            style={styles.sendButton}
            activeOpacity={0.8}
            onPress={handleSendOtp}
          >
            <Text style={styles.buttonText}>Send OTP</Text>
            <Ionicons
              name="arrow-forward"
              size={18}
              color="#FFFFFF"
              style={styles.arrowIcon}
            />
          </TouchableOpacity>
        </View>

        {/* Bottom Security Footer */}
        <View style={styles.footer}>
          <Ionicons name="shield-checkmark-outline" size={16} color="#8C7C72" />
          <Text style={styles.footerText}>
            Protected by end-to-end encrypted OTP authentication
          </Text>
        </View>
      </KeyboardAwareScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FAF4ED',
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 24,
    justifyContent: 'space-between',
  },
  tagContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  tagDot: {
    color: '#8C331A',
    fontSize: 16,
    marginRight: 6,
    fontWeight: '900',
  },
  tagText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#8C331A',
    letterSpacing: 1.2,
  },
  mainTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#2C1E18',
    marginBottom: 6,
    letterSpacing: -0.3,
  },
  subTitle: {
    fontSize: 14,
    color: '#7A6A60',
    lineHeight: 20,
    marginBottom: 24,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 22,
    shadowColor: '#2C1E18',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.04,
    shadowRadius: 16,
    elevation: 3,
    marginBottom: 30,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#7A6A60',
    letterSpacing: 0.8,
    marginBottom: 10,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FAF6F2',
    borderWidth: 1,
    borderColor: '#ECE2D8',
    borderRadius: 20,
    paddingHorizontal: 16,
    height: 52,
    marginBottom: 20,
  },
  phoneIcon: {
    marginRight: 10,
  },
  countryCode: {
    fontSize: 15,
    fontWeight: '700',
    color: '#2C1E18',
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: '#2C1E18',
    padding: 0,
  },
  sendButton: {
    backgroundColor: '#963819',
    borderRadius: 28,
    height: 52,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  arrowIcon: {
    marginLeft: 8,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 'auto',
    paddingVertical: 12,
  },
  footerText: {
    fontSize: 12,
    color: '#8C7C72',
    fontWeight: '500',
    marginLeft: 6,
  },
});
