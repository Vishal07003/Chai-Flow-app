import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { colors, radius, fontFamilies } from '../../theme';

interface CustomButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'danger';
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

export default function CustomButton({
  title,
  onPress,
  variant = 'primary',
  loading = false,
  disabled = false,
  style,
  textStyle,
}: CustomButtonProps) {
  const getButtonStyle = () => {
    switch (variant) {
      case 'secondary':
        return styles.secondaryBtn;
      case 'outline':
        return styles.outlineBtn;
      case 'danger':
        return styles.dangerBtn;
      default:
        return styles.primaryBtn;
    }
  };

  const getTextStyle = () => {
    switch (variant) {
      case 'outline':
        return styles.outlineText;
      case 'secondary':
        return styles.secondaryText;
      default:
        return styles.btnText;
    }
  };

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      style={[styles.baseBtn, getButtonStyle(), disabled && styles.disabledBtn, style]}
      onPress={onPress}
      disabled={disabled || loading}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'outline' ? colors.primary : colors.onPrimary} />
      ) : (
        <Text style={[getTextStyle(), textStyle]}>{title}</Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  baseBtn: {
    height: 52,
    borderRadius: radius.LG,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  primaryBtn: {
    backgroundColor: colors.primary,
  },
  secondaryBtn: {
    backgroundColor: colors.surfaceContainer,
    borderWidth: 1,
    borderColor: colors.border,
  },
  outlineBtn: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: colors.primary,
  },
  dangerBtn: {
    backgroundColor: colors.correction,
  },
  disabledBtn: {
    opacity: 0.5,
  },
  btnText: {
    color: colors.onPrimary,
    fontSize: 16,
    fontFamily: fontFamilies.semiBold,
    fontWeight: '600',
  },
  secondaryText: {
    color: colors.primary,
    fontSize: 14,
    fontFamily: fontFamilies.medium,
    fontWeight: '600',
  },
  outlineText: {
    color: colors.primary,
    fontSize: 15,
    fontFamily: fontFamilies.semiBold,
    fontWeight: '600',
  },
});

