import React, { useState } from 'react';
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
      const res = await authService.sendOtp(cleanDigits);
      if (res.success && res.session_id) {
        AppToast.success('OTP Sent', res.message || `Verification code sent to ${formatted}`);
        if (navigation) {
          navigation.navigate('VerifyOtp', {
            phone: cleanDigits,
            sessionId: res.session_id,
            cooldownSeconds: res.cooldown_seconds || 60,
            userExists: res.user_exists,
          });
        }
      } else {
        AppToast.error('OTP Failed', res.message || 'Unable to send OTP. Please try again.');
      }
    } catch (err: any) {
      const errorMsg = err?.message || 'Network error occurred while requesting OTP.';
      AppToast.error('Request Failed', errorMsg);
    } finally {
      setIsLoading(false);
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
              maxLength={10}
              placeholder="Enter 10-digit mobile number"
              placeholderTextColor="#A09085"
              editable={!isLoading}
            />
          </View>

          <TouchableOpacity
            style={[styles.sendButton, isLoading ? styles.sendButtonDisabled : null]}
            activeOpacity={0.8}
            onPress={handleSendOtp}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <>
                <Text style={styles.buttonText}>Send OTP</Text>
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
    letterSpacing: 1.5,
  },
  mainTitle: {
    fontSize: 28,
    fontWeight: '900',
    color: '#2C1E18',
    letterSpacing: -0.5,
    marginBottom: 8,
  },
  subTitle: {
    fontSize: 14,
    color: '#7A6A60',
    lineHeight: 20,
    marginBottom: 24,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    shadowColor: '#8C331A',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#F0E6DE',
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#5C4A3E',
    letterSpacing: 1,
    marginBottom: 10,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FAF7F4',
    borderWidth: 1.5,
    borderColor: '#E8DED6',
    borderRadius: 14,
    paddingHorizontal: 14,
    height: 52,
    marginBottom: 20,
  },
  phoneIcon: {
    marginRight: 8,
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
    color: '#2C1E18',
    fontWeight: '600',
    padding: 0,
  },
  sendButton: {
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
  sendButtonDisabled: {
    backgroundColor: '#C5A496',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
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
    marginTop: 24,
  },
  footerText: {
    fontSize: 12,
    color: '#8C7C72',
    marginLeft: 6,
    fontWeight: '500',
  },
});
