import React from 'react';
import { TouchableOpacity, StyleSheet, ViewStyle } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';

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
      <Ionicons name={iconName} size={28} color="#FFFFFF" />
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
    backgroundColor: '#8C331A',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 6,
    shadowColor: '#8C331A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
    zIndex: 99,
  },
});
