import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  StatusBar,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';
import ChaiFlowHeader from '../../components/common/ChaiFlowHeader';
import { useApp } from '../../context/AppContext';
import { authService } from '../../services/auth.service';
import { validation } from '../../utils/validation';
import { AppToast } from '../../utils/toast';

interface LoginScreenProps {
  navigation?: any;
}

export default function LoginScreen({ navigation }: LoginScreenProps) {
  const { setUserMobile } = useApp();
  const [phone, setPhone] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSendOtp = async () => {
    const trimmed = phone.trim();

    if (!validation.isValidPhone(trimmed)) {
      AppToast.error('Validation Error', 'Please enter a valid 10-digit mobile number.');
      return;
    }

    const cleanDigits = trimmed.replace(/\D/g, '').slice(-10);
    const formatted = `+91 ${cleanDigits}`;
    setUserMobile(formatted);

    setIsLoading(true);
    try {
      // Backend verifies registration and dispatches 6-digit OTP strictly via SMS
      const res = await authService.requestOtp(cleanDigits);
      if (res.success && res.session_id) {
        AppToast.success('OTP Sent via SMS', res.message || `Verification code sent via SMS to ${formatted}`);
        if (navigation) {
          navigation.navigate('VerifyOtp', {
            phone: cleanDigits,
            sessionId: res.session_id,
            cooldownSeconds: res.cooldown_seconds || 60,
          });
        }
      } else {
        AppToast.error('SMS Delivery Failed', res.message || 'Unable to deliver OTP via SMS. Please retry after cooldown.');
      }
    } catch (err: any) {
      const errorMsg =
        err?.message ||
        'Account not found or SMS delivery failed. Please verify your registered number.';
      AppToast.error('SMS Request Failed', errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#FAF8F5" />
      <KeyboardAvoidingView
        style={styles.keyboardAvoiding}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          bounces={false}
        >
          {/* 1. Top Brand Header */}
          <ChaiFlowHeader />

          {/* 2. Welcome Back Heading & Subtitle (Compact, top-aligned) */}
          <View style={styles.heroSection}>
            <Text style={styles.mainTitle}>Welcome Back</Text>
            <Text style={styles.subTitle}>
              Sign in with your registered mobile number.
            </Text>
          </View>

          {/* 3. Mobile Number Input Card immediately below heading */}
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
                textContentType="telephoneNumber"
                autoComplete="tel"
                maxLength={10}
                placeholder="Enter 10-digit mobile number"
                placeholderTextColor="#A09085"
                editable={!isLoading}
              />
            </View>

            <TouchableOpacity
              style={[styles.continueButton, isLoading && styles.continueButtonDisabled]}
              activeOpacity={0.8}
              onPress={handleSendOtp}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <>
                  <Text style={styles.buttonText}>Continue</Text>
                  <Ionicons
                    name="arrow-forward"
                    size={18}
                    color="#FFFFFF"
                    style={styles.arrowIcon}
                  />
                </>
              )}
            </TouchableOpacity>
          </View>

          {/* 4. Security Information directly below form */}
          <View style={styles.footer}>
            <Ionicons name="shield-checkmark-outline" size={15} color="#8C7C72" />
            <Text style={styles.footerText}>
              Secure OTP verification
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FAF8F5',
  },
  keyboardAvoiding: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 24,
  },
  heroSection: {
    marginTop: 4,
    marginBottom: 16,
  },
  mainTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: '#1F2937',
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  subTitle: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 20,
    shadowColor: '#8C331A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#EFEAE4',
  },
  inputLabel: {
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
    marginBottom: 16,
  },
  phoneIcon: {
    marginRight: 6,
  },
  countryCode: {
    fontSize: 15,
    fontWeight: '700',
    color: '#2C1E18',
    marginRight: 8,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: '#2C1E18',
    fontWeight: '600',
    padding: 0,
  },
  continueButton: {
    backgroundColor: '#8C331A',
    borderRadius: 12,
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#8C331A',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
  },
  continueButtonDisabled: {
    backgroundColor: '#C5A496',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  arrowIcon: {
    marginLeft: 8,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 18,
  },
  footerText: {
    fontSize: 12,
    color: '#8C7C72',
    marginLeft: 6,
    fontWeight: '500',
  },
});
