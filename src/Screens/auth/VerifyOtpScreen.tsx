import React, { useState, useEffect, useRef } from 'react';
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

interface VerifyOtpScreenProps {
  navigation?: any;
  route?: any;
}

export default function VerifyOtpScreen({ navigation, route }: VerifyOtpScreenProps) {
  const { userMobile, loginWithVerifiedUser } = useApp();
  const phone = route?.params?.phone || userMobile.replace(/\D/g, '').slice(-10);
  const initialSessionId = route?.params?.sessionId || '';
  const initialCooldown = route?.params?.cooldownSeconds || 60;

  const [sessionId, setSessionId] = useState<string>(initialSessionId);
  const [otp, setOtp] = useState<string>('');
  const [isFocused, setIsFocused] = useState<boolean>(true);
  const [timer, setTimer] = useState<number>(initialCooldown);
  const [isVerifying, setIsVerifying] = useState<boolean>(false);
  const [isResending, setIsResending] = useState<boolean>(false);
  const hiddenInputRef = useRef<TextInput | null>(null);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (timer > 0) {
      interval = setInterval(() => {
        setTimer(prev => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [timer]);

  // Focus input on mount
  useEffect(() => {
    const focusTimeout = setTimeout(() => {
      hiddenInputRef.current?.focus();
    }, 300);
    return () => clearTimeout(focusTimeout);
  }, []);

  const handleOtpChange = (text: string) => {
    const cleaned = text.replace(/[^0-9]/g, '').slice(0, 6);
    setOtp(cleaned);
  };

  const handleVerify = async () => {
    if (!validation.isValidOtp(otp, 6)) {
      AppToast.error('Invalid OTP', 'Please enter a complete 6-digit verification code.');
      return;
    }

    setIsVerifying(true);
    try {
      // Calls unified verify endpoint; backend detects role and returns authenticated user
      const res = await authService.verifyOtpUnified(phone, otp, sessionId);
      if (res.success && res.user) {
        AppToast.success('Login Successful', `Welcome back, ${res.user.first_name || res.user.username}!`);
        await loginWithVerifiedUser(res.user);
      } else {
        AppToast.error('Verification Failed', 'Incorrect or expired OTP.');
      }
    } catch (err: any) {
      const errorMsg = err?.message || 'Verification failed. Please check the code and try again.';
      AppToast.error('Invalid OTP', errorMsg);
    } finally {
      setIsVerifying(false);
    }
  };

  const handleChangeNumber = () => {
    if (navigation) {
      navigation.goBack();
    }
  };

  const handleResend = async () => {
    if (timer > 0 || isResending) return;

    setIsResending(true);
    try {
      const res = await authService.requestOtp(phone);
      if (res.success && res.session_id) {
        setSessionId(res.session_id);
        setTimer(res.cooldown_seconds || 60);
        setOtp('');
        hiddenInputRef.current?.focus();
        AppToast.success('OTP Resent via SMS', res.message || 'A new 6-digit verification code has been sent via SMS.');
      } else {
        AppToast.error('Resend Failed', res.message || 'Please wait before requesting again.');
      }
    } catch (err: any) {
      AppToast.error('SMS Resend Error', err?.message || 'Failed to resend SMS OTP.');
    } finally {
      setIsResending(false);
    }
  };

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Masked phone: +91 98XXX XX210
  const cleanPhone = phone.replace(/\D/g, '').slice(-10);
  const maskedPhone =
    cleanPhone.length === 10
      ? `+91 ${cleanPhone.slice(0, 2)}XXX XX${cleanPhone.slice(-3)}`
      : `+91 ${cleanPhone}`;

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
          {/* 1. Chai Flow Branding */}
          <ChaiFlowHeader />

          {/* 2. Compact Top-Aligned Header & SMS Notice */}
          <View style={styles.headingSection}>
            <Text style={styles.title}>Enter Verification Code</Text>
            <Text style={styles.subtitle}>
              We've sent a 6-digit SMS verification code to{' '}
              <Text style={styles.phoneHighlight}>{maskedPhone}</Text>
            </Text>

            {/* 3. Edit Phone Number Action */}
            <TouchableOpacity
              style={styles.changeNumberRow}
              onPress={handleChangeNumber}
              activeOpacity={0.7}
            >
              <Ionicons name="pencil-sharp" size={13} color="#8C331A" />
              <Text style={styles.changeNumberText}>Edit Phone Number</Text>
            </TouchableOpacity>
          </View>

          {/* 4. OTP Input Card (Higher on screen, directly below headings) */}
          <View style={styles.card}>
            <Text style={styles.label}>ENTER 6-DIGIT CODE</Text>

            {/* 6 Visual Digit Boxes with reliable hidden input */}
            <TouchableOpacity
              activeOpacity={1}
              onPress={() => hiddenInputRef.current?.focus()}
              style={styles.otpBoxesRow}
            >
              {[0, 1, 2, 3, 4, 5].map(index => {
                const digit = otp[index] || '';
                const isCurrent = isFocused && index === Math.min(otp.length, 5);
                const isFilled = !!digit;

                return (
                  <View
                    key={index}
                    style={[
                      styles.otpBox,
                      isCurrent && styles.otpBoxActive,
                      isFilled && styles.otpBoxFilled,
                    ]}
                  >
                    <Text style={styles.otpDigitText}>{digit}</Text>
                  </View>
                );
              })}
            </TouchableOpacity>

            {/* Hidden, accessible single TextInput for Android auto-fill & paste */}
            <TextInput
              ref={hiddenInputRef}
              style={styles.hiddenInput}
              value={otp}
              onChangeText={handleOtpChange}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              keyboardType="number-pad"
              maxLength={6}
              textContentType="oneTimeCode"
              autoComplete={Platform.OS === 'android' ? 'sms-otp' : 'one-time-code'}
              editable={!isVerifying}
              caretHidden={true}
            />

            {/* 5. Verify & Continue Button */}
            <TouchableOpacity
              style={[styles.verifyButton, (isVerifying || otp.length < 6) && styles.verifyButtonDisabled]}
              onPress={handleVerify}
              activeOpacity={0.8}
              disabled={isVerifying || otp.length < 6}
            >
              {isVerifying ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <>
                  <Text style={styles.verifyButtonText}>Verify & Continue</Text>
                  <Ionicons name="checkmark-circle" size={18} color="#FFFFFF" style={styles.verifyIcon} />
                </>
              )}
            </TouchableOpacity>

            {/* 6. Resend OTP Action & Timer */}
            <View style={styles.resendContainer}>
              <Text style={styles.resendLabel}>Didn't receive the code?</Text>
              <TouchableOpacity
                onPress={handleResend}
                disabled={timer > 0 || isResending}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.resendText,
                    (timer > 0 || isResending) && styles.resendTextDisabled,
                  ]}
                >
                  {isResending
                    ? 'Sending...'
                    : timer > 0
                      ? `Resend in ${formatTimer(timer)}`
                      : 'Resend OTP'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* 7. Security Helper Text */}
          <View style={styles.footer}>
            <Ionicons name="shield-checkmark-outline" size={15} color="#8C7C72" />
            <Text style={styles.footerText}>Secure OTP verification</Text>
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
  headingSection: {
    marginTop: 4,
    marginBottom: 14,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: '#1F2937',
    marginBottom: 4,
    letterSpacing: -0.4,
  },
  subtitle: {
    fontSize: 13,
    color: '#6B7280',
    lineHeight: 18,
    marginBottom: 6,
  },
  phoneHighlight: {
    fontWeight: '700',
    color: '#8C331A',
  },
  changeNumberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    marginTop: 2,
  },
  changeNumberText: {
    fontSize: 12,
    color: '#8C331A',
    fontWeight: '700',
    marginLeft: 4,
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
  label: {
    fontSize: 11,
    fontWeight: '800',
    color: '#5C4A3E',
    letterSpacing: 0.8,
    marginBottom: 14,
    textAlign: 'center',
  },
  otpBoxesRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  otpBox: {
    width: 44,
    height: 50,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#E8DED6',
    backgroundColor: '#FAF7F4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  otpBoxActive: {
    borderColor: '#8C331A',
    backgroundColor: '#FFFFFF',
    shadowColor: '#8C331A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 2,
  },
  otpBoxFilled: {
    borderColor: '#8C331A',
    backgroundColor: '#FAF4ED',
  },
  otpDigitText: {
    fontSize: 20,
    fontWeight: '800',
    color: '#2C1E18',
  },
  hiddenInput: {
    position: 'absolute',
    width: 1,
    height: 1,
    opacity: 0.01,
  },
  verifyButton: {
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
  verifyButtonDisabled: {
    backgroundColor: '#C5A496',
  },
  verifyButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  verifyIcon: {
    marginLeft: 8,
  },
  resendContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
  },
  resendLabel: {
    fontSize: 12,
    color: '#7A6A60',
    marginRight: 6,
  },
  resendText: {
    fontSize: 12,
    color: '#8C331A',
    fontWeight: '800',
  },
  resendTextDisabled: {
    color: '#A09085',
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
