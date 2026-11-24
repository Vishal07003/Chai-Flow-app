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
import { colors, typography, spacing, radius, shadows } from '../../theme';

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
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />
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
                color={colors.textSecondary}
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
                placeholderTextColor={colors.textMuted}
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
                <ActivityIndicator color={colors.white} size="small" />
              ) : (
                <>
                  <Text style={styles.buttonText}>Continue</Text>
                  <Ionicons
                    name="arrow-forward"
                    size={18}
                    color={colors.white}
                    style={styles.arrowIcon}
                  />
                </>
              )}
            </TouchableOpacity>
          </View>

          {/* 4. Security Information directly below form */}
          <View style={styles.footer}>
            <Ionicons name="shield-checkmark-outline" size={15} color={colors.textSecondary} />
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
    backgroundColor: colors.background,
  },
  keyboardAvoiding: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xs,
    paddingBottom: spacing.xl,
  },
  heroSection: {
    marginTop: spacing.xs,
    marginBottom: spacing.md,
  },
  mainTitle: {
    ...typography.display,
    fontFamily: 'Inter-Black',
    fontWeight: '900',
    color: colors.textPrimary,
    letterSpacing: -0.5,
    marginBottom: spacing.xs,
  },
  subTitle: {
    ...typography.body,
    fontFamily: 'Inter-Regular',
    color: colors.textSecondary,
    lineHeight: 20,
  },
  card: {
    backgroundColor: colors.cardBackground,
    borderRadius: radius.xl,
    padding: spacing.lg,
    ...shadows.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  inputLabel: {
    ...typography.caption,
    fontFamily: 'Inter-Bold',
    fontWeight: '800',
    color: colors.textPrimary,
    letterSpacing: 0.8,
    marginBottom: spacing.sm,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.sm,
    height: 48,
    marginBottom: spacing.md,
  },
  phoneIcon: {
    marginRight: spacing.xs,
  },
  countryCode: {
    ...typography.heading2,
    fontFamily: 'Inter-Bold',
    fontWeight: '700',
    color: colors.textPrimary,
    marginRight: spacing.xs,
  },
  input: {
    flex: 1,
    ...typography.heading2,
    fontFamily: 'Inter-SemiBold',
    fontWeight: '600',
    color: colors.textPrimary,
    padding: 0,
  },
  continueButton: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
  },
  continueButtonDisabled: {
    backgroundColor: '#C5A496',
  },
  buttonText: {
    color: colors.white,
    ...typography.body,
    fontFamily: 'Inter-Bold',
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  arrowIcon: {
    marginLeft: spacing.xs,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.lg,
  },
  footerText: {
    ...typography.caption,
    fontFamily: 'Inter-Medium',
    color: colors.textSecondary,
    marginLeft: 6,
  },
});
