import React, { useState, useEffect, useRef } from 'react';
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
import Header from '../../components/common/Header';
import { useApp } from '../../context/AppContext';
import { validation } from '../../utils/validation';
import { AppToast } from '../../utils/toast';

interface VerifyOtpScreenProps {
  navigation?: any;
  route?: any;
}

export default function VerifyOtpScreen({ navigation, route }: VerifyOtpScreenProps) {
  const { userMobile, userRole, login } = useApp();
  const roleFromRoute = route?.params?.role || userRole;
  const [otp, setOtp] = useState<string[]>(['', '', '', '', '', '']);
  const [activeIndex, setActiveIndex] = useState<number>(0);
  const [timer, setTimer] = useState<number>(24);
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

  const handleVerify = () => {
    const fullOtp = otp.join('');
    if (!validation.isValidOtp(fullOtp, 6)) {
      AppToast.error('Invalid OTP', 'Please enter a complete 6-digit verification code.');
      return;
    }
    AppToast.success('Login Successful', 'Welcome to ChaiFlow!');
    login(userMobile, route?.params?.role);
  };

  const handleChangeNumber = () => {
    if (navigation) {
      navigation.goBack();
    }
  };

  const handleResend = () => {
    if (timer === 0) {
      setTimer(30);
      setOtp(['', '', '', '', '', '']);
      setActiveIndex(0);
      inputRefs.current[0]?.focus();
    }
  };

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
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
        <Header title="ChaiFlow" showLogoOnly />

        <View style={styles.tagContainer}>
          <Text style={styles.tagDot}>•</Text>
          <Text style={styles.tagText}>VERIFY OTP</Text>
        </View>

        <Text style={styles.mainTitle}>Enter the 6-digit code</Text>
        <Text style={styles.subTitle}>
          We sent a code to <Text style={styles.mobileHighlight}>{userMobile || '+91 9359235197'}</Text>.
        </Text>

        <View style={styles.card}>
          <View style={styles.otpContainer}>
            {otp.map((digit, index) => {
              const isFocused = activeIndex === index;
              return (
                <TouchableOpacity
                  key={index}
                  activeOpacity={1}
                  onPress={() => {
                    setActiveIndex(index);
                    inputRefs.current[index]?.focus();
                  }}
                  style={[
                    styles.otpBox,
                    isFocused && styles.otpBoxActive,
                    digit ? styles.otpBoxFilled : null,
                  ]}
                >
                  <TextInput
                    ref={el => {
                      inputRefs.current[index] = el;
                    }}
                    style={styles.otpInput}
                    value={digit}
                    onChangeText={text => handleOtpChange(text, index)}
                    onKeyPress={e => handleKeyPress(e, index)}
                    onFocus={() => setActiveIndex(index)}
                    keyboardType="number-pad"
                    maxLength={1}
                    selectTextOnFocus
                  />
                  {isFocused && !digit && <View style={styles.cursorCaret} />}
                </TouchableOpacity>
              );
            })}
          </View>

          <TouchableOpacity
            style={styles.verifyButton}
            activeOpacity={0.8}
            onPress={handleVerify}
          >
            <Text style={styles.buttonText}>Verify & continue</Text>
            <Ionicons name="arrow-forward" size={18} color="#FFFFFF" style={styles.arrowIcon} />
          </TouchableOpacity>

          <View style={styles.cardActionsRow}>
            <TouchableOpacity onPress={handleChangeNumber} activeOpacity={0.7}>
              <Text style={styles.changeNumberText}>Change number</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleResend}
              disabled={timer > 0}
              activeOpacity={0.7}
            >
              <Text style={[styles.timerText, timer === 0 && styles.resendActiveText]}>
                {timer > 0 ? `Resend in ${formatTimer(timer)}` : 'Resend OTP'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.footer}>
          <Ionicons name="shield-checkmark-outline" size={16} color="#8C7C72" />
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
    marginBottom: 8,
    letterSpacing: -0.3,
  },
  subTitle: {
    fontSize: 14,
    color: '#7A6A60',
    lineHeight: 21,
    marginBottom: 32,
  },
  mobileHighlight: {
    fontWeight: '600',
    color: '#2C1E18',
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
    marginBottom: 40,
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
    borderColor: '#EDE4DC',
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  otpBoxActive: {
    borderColor: '#8C331A',
  },
  otpBoxFilled: {
    borderColor: '#963819',
    backgroundColor: '#FAF6F2',
  },
  otpInput: {
    fontSize: 20,
    fontWeight: '700',
    color: '#2C1E18',
    textAlign: 'center',
    width: '100%',
    height: '100%',
    padding: 0,
  },
  cursorCaret: {
    position: 'absolute',
    width: 2,
    height: 20,
    backgroundColor: '#8C331A',
  },
  verifyButton: {
    backgroundColor: '#963819',
    borderRadius: 28,
    height: 52,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 18,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  arrowIcon: {
    marginLeft: 8,
  },
  cardActionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  changeNumberText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#7A6A60',
  },
  timerText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#A09085',
  },
  resendActiveText: {
    color: '#8C331A',
    fontWeight: '700',
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
