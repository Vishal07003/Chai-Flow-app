import React, { useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { colors, typography, spacing } from '../../theme';

interface SplashScreenProps {
  navigation?: any;
}

export default function SplashScreen({ navigation }: SplashScreenProps) {
  useEffect(() => {
    const timer = setTimeout(() => {
      navigation?.replace('Login');
    }, 1800);
    return () => clearTimeout(timer);
  }, [navigation]);

  return (
    <View style={styles.container}>
      <View style={styles.logoCircle}>
        <Ionicons name="cafe" size={54} color={colors.primary} />
      </View>
      <Text style={styles.title}>ChaiFlow</Text>
      <Text style={styles.subtitle}>Smart Tea Supply & Delivery Network</Text>
      <ActivityIndicator size="small" color={colors.primary} style={styles.loader} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  logoCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#F4EBE6',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  title: {
    ...typography.display,
    fontFamily: 'Inter-Black',
    fontWeight: '900',
    fontSize: 32,
    color: colors.textPrimary,
    letterSpacing: -0.5,
  },
  subtitle: {
    ...typography.body,
    fontFamily: 'Inter-Medium',
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  loader: {
    marginTop: spacing.xxl,
  },
});
