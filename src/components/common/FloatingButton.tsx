import React from 'react';
import { TouchableOpacity, StyleSheet, ViewStyle } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { colors, shadows } from '../../theme';

interface FloatingButtonProps {
  onPress: () => void;
  iconName?: string;
  style?: ViewStyle;
}

export default function FloatingButton({
  onPress,
  iconName = 'add',
  style,
}: FloatingButtonProps) {
  return (
    <TouchableOpacity
      activeOpacity={0.8}
      style={[styles.fab, style]}
      onPress={onPress}
      accessibilityLabel="Add New"
    >
      <Ionicons name={iconName} size={28} color={colors.onPrimary} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    ...shadows.lg,
    zIndex: 99,
  },
});
