import React from 'react';
import { StyleSheet, TouchableOpacity } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';

interface FloatingButtonProps {
  iconName?: string;
  onPress?: () => void;
}

export default function FloatingButton({
  iconName = 'add',
  onPress,
}: FloatingButtonProps) {
  return (
    <TouchableOpacity activeOpacity={0.85} onPress={onPress} style={styles.fab}>
      <Ionicons name={iconName} size={24} color="#FFF" />
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
  },
});
