import React from 'react';
import { TouchableOpacity, Text, View, StyleSheet } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';

export interface QuickActionProps {
  title: string;
  icon: string;
  color?: string;
  bgColor?: string;
  iconColor?: string;
  onPress?: () => void;
}

export default function QuickAction({
  title,
  icon,
  color,
  bgColor,
  iconColor = '#FFFFFF',
  onPress,
}: QuickActionProps) {
  const finalBgColor = bgColor || color || '#B74A21';
  const finalIconColor = bgColor ? iconColor : '#FFFFFF';

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={onPress}
      style={styles.wrapper}
    >
      <View style={[styles.box, { backgroundColor: finalBgColor }]}>
        <Ionicons name={icon} size={24} color={finalIconColor} />
      </View>
      <Text style={styles.title}>{title}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
    marginHorizontal: 12,
    width: 72,
  },
  box: {
    width: 72,
    height: 60,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    color: '#4A3D36',
    marginTop: 8,
    fontWeight: '600',
    fontSize: 12,
    textAlign: 'center',
  },
});
