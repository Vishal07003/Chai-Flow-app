import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import Ionicons from 'react-native-vector-icons/Ionicons';
import Header from '../../components/common/Header';
import { useApp } from '../../context/AppContext';
import { authService } from '../../services/auth.service';
import { validation } from '../../utils/validation';
import { AppToast } from '../../utils/toast';

interface VerifyOtpScreenProps {
  navigation?: any;
  route?: any;
}

export default function VerifyOtpScreen({ navigation, route }: VerifyOtpScreenProps) {
  const { userMobile, loginWithVerifiedUser, login } = useApp();
  const phone = route?.params?.phone || userMobile.replace(/\D/g, '').slice(-10);
  const initialSessionId = route?.params?.sessionId || '';
  const initialCooldown = route?.params?.cooldownSeconds || 45;

  const [sessionId, setSessionId] = useState<string>(initialSessionId);
  const [otp, setOtp] = useState<string[]>(['', '', '', '', '', '']);
  const [activeIndex, setActiveIndex] = useState<number>(0);
  const [timer, setTimer] = useState<number>(initialCooldown);
  const [isVerifying, setIsVerifying] = useState<boolean>(false);
  const [isResending, setIsResending] = useState<boolean>(false);
  const inputRefs = useRef<Array<TextInput | null>>([]);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (timer > 0) {
      interval = setInterval(() => {
        setTimer(prev => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [timer]);

  const handleOtpChange = (text: string, index: number) => {
    const cleaned = text.replace(/[^0-9]/g, '');
    const newOtp = [...otp];

    if (cleaned.length > 1) {
      const pasted = cleaned.slice(0, 6).split('');
      for (let i = 0; i < 6; i++) {
        newOtp[i] = pasted[i] || '';
      }
      setOtp(newOtp);
      const nextIdx = Math.min(pasted.length, 5);
      setActiveIndex(nextIdx);
      inputRefs.current[nextIdx]?.focus();
      return;
    }

    newOtp[index] = cleaned;
    setOtp(newOtp);

    if (cleaned && index < 5) {
      setActiveIndex(index + 1);
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyPress = (e: any, index: number) => {
    if (e.nativeEvent.key === 'Backspace') {
      if (!otp[index] && index > 0) {
        setActiveIndex(index - 1);
        inputRefs.current[index - 1]?.focus();
      }
    }
  };

  const handleVerify = async () => {
    const fullOtp = otp.join('');
    if (!validation.isValidOtp(fullOtp, 6)) {
      AppToast.error('Invalid OTP', 'Please enter a complete 6-digit verification code.');
      return;
    }

    setIsVerifying(true);
    try {
      const res = await authService.verifyOtp(phone, sessionId, fullOtp);
      if (res.success && res.user) {
        AppToast.success('Login Successful', `Welcome back, ${res.user.first_name || res.user.username}!`);
        if (loginWithVerifiedUser) {
          await loginWithVerifiedUser(res.user);
        } else {
          await login(phone, route?.params?.role);
        }
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
      const res = await authService.resendOtp(phone);
      if (res.success && res.session_id) {
        setSessionId(res.session_id);
        setTimer(res.cooldown_seconds || 45);
        setOtp(['', '', '', '', '', '']);
        setActiveIndex(0);
        inputRefs.current[0]?.focus();
        AppToast.success('OTP Resent', res.message || 'A new code has been sent to your phone.');
      } else {
        AppToast.error('Resend Failed', res.message || 'Please wait before requesting again.');
      }
    } catch (err: any) {
      AppToast.error('Error', err?.message || 'Failed to resend OTP.');
    } finally {
      setIsResending(false);
    }
  };

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const displayPhone = phone.startsWith('+91') ? phone : `+91 ${phone}`;

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAwareScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        enableOnAndroid={true}
        extraScrollHeight={20}
        keyboardShouldPersistTaps="handled"
      >
        <Header />

        <View style={styles.content}>
          <View style={styles.tagContainer}>
            <Text style={styles.tagDot}>•</Text>
            <Text style={styles.tagText}>VERIFY OTP</Text>
          </View>

          <Text style={styles.title}>Enter Verification Code</Text>
          <Text style={styles.subtitle}>
            We've sent a 6-digit verification code to{' '}
            <Text style={styles.phoneHighlight}>{displayPhone}</Text>
          </Text>

          <TouchableOpacity
            style={styles.changeNumberRow}
            onPress={handleChangeNumber}
            activeOpacity={0.7}
          >
            <Ionicons name="pencil-sharp" size={13} color="#8C331A" />
            <Text style={styles.changeNumberText}>Edit Phone Number</Text>
          </TouchableOpacity>

          <View style={styles.card}>
            <Text style={styles.label}>ENTER 6-DIGIT CODE</Text>

            <View style={styles.otpContainer}>
              {otp.map((digit, index) => {
                const isFocused = activeIndex === index;
                return (
                  <View
                    key={index}
                    style={[
                      styles.otpBox,
                      isFocused && styles.otpBoxActive,
                      digit ? styles.otpBoxFilled : null,
                    ]}
                  >
                    <TextInput
                      ref={ref => {
                        inputRefs.current[index] = ref;
                      }}
                      style={styles.otpInput}
                      value={digit}
                      onChangeText={text => handleOtpChange(text, index)}
                      onKeyPress={e => handleKeyPress(e, index)}
                      onFocus={() => setActiveIndex(index)}
                      keyboardType="number-pad"
                      maxLength={index === 0 ? 6 : 1}
                      selectTextOnFocus
                      editable={!isVerifying}
                    />
                  </View>
                );
              })}
            </View>

            <TouchableOpacity
              style={[styles.verifyButton, isVerifying ? styles.verifyButtonDisabled : null]}
              onPress={handleVerify}
              activeOpacity={0.8}
              disabled={isVerifying}
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

          <Text style={styles.footerText}>Protected by end-to-end encrypted OTP</Text>
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
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  content: {
    flex: 1,
    marginTop: 16,
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
    fontSize: 11,
    fontWeight: '800',
    color: '#8C331A',
    letterSpacing: 1.5,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: '#2C1E18',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#7A6A60',
    lineHeight: 20,
    marginBottom: 8,
  },
  phoneHighlight: {
    fontWeight: '700',
    color: '#8C331A',
  },
  changeNumberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  changeNumberText: {
    fontSize: 13,
    color: '#8C331A',
    fontWeight: '700',
    marginLeft: 4,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    shadowColor: '#8C331A',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#F0E6DE',
  },
  label: {
    fontSize: 11,
    fontWeight: '800',
    color: '#5C4A3E',
    letterSpacing: 1,
    marginBottom: 16,
    textAlign: 'center',
  },
  otpContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  otpBox: {
    width: 44,
    height: 52,
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
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 2,
  },
  otpBoxFilled: {
    borderColor: '#8C331A',
    backgroundColor: '#FAF4ED',
  },
  otpInput: {
    fontSize: 20,
    fontWeight: '800',
    color: '#2C1E18',
    textAlign: 'center',
    width: '100%',
    height: '100%',
    padding: 0,
  },
  verifyButton: {
    backgroundColor: '#8C331A',
    borderRadius: 14,
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#8C331A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
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
    marginTop: 20,
  },
  resendLabel: {
    fontSize: 13,
    color: '#7A6A60',
    marginRight: 6,
  },
  resendText: {
    fontSize: 13,
    color: '#8C331A',
    fontWeight: '800',
  },
  resendTextDisabled: {
    color: '#A09085',
  },
  footerText: {
    fontSize: 12,
    color: '#A09085',
    textAlign: 'center',
    marginTop: 24,
  },
});
