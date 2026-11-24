import React from 'react';
import {
  View,
  TextInput,
  Text,
  StyleSheet,
  TextInputProps,
} from 'react-native';
import { colors, radius, typography, fontFamilies } from '../../theme';

interface CustomInputProps extends TextInputProps {
  label?: string;
  error?: string;
}

export default function CustomInput({
  label,
  error,
  style,
  ...props
}: CustomInputProps) {
  return (
    <View style={styles.container}>
      {label && <Text style={styles.label}>{label}</Text>}
      <TextInput
        style={[styles.input, error ? styles.inputError : null, style]}
        placeholderTextColor={colors.secondaryText}
        {...props}
      />
      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  label: {
    ...typography.metricLabel,
    color: colors.primary,
    marginBottom: 6,
  },
  input: {
    height: 48,
    backgroundColor: colors.surfaceContainer,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.MD,
    paddingHorizontal: 14,
    fontSize: 14,
    fontFamily: fontFamilies.regular,
    color: colors.primary,
  },
  inputError: {
    borderColor: colors.correction,
  },
  errorText: {
    ...typography.caption,
    color: colors.correction,
    marginTop: 4,
  },
});
