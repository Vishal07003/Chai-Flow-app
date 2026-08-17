import React from 'react';
import { Image, StyleSheet, Text, View, ImageStyle, ViewStyle } from 'react-native';

export interface CustomerAvatarProps {
  avatarUrl?: string;
  name: string;
  size?: number;
  style?: ImageStyle & ViewStyle;
}

export default function CustomerAvatar({
  avatarUrl,
  name,
  size = 48,
  style,
}: CustomerAvatarProps) {
  const initials = name
    .split(' ')
    .map(p => p[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const containerStyle = {
    width: size,
    height: size,
    borderRadius: size / 2,
  };

  if (avatarUrl) {
    return (
      <Image
        source={{ uri: avatarUrl }}
        style={[styles.image, containerStyle, style as ImageStyle]}
      />
    );
  }

  return (
    <View style={[styles.fallback, containerStyle, style as ViewStyle]}>
      <Text style={[styles.initialsText, { fontSize: size * 0.35 }]}>
        {initials}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  image: {
    backgroundColor: '#EBE6E1',
  },
  fallback: {
    backgroundColor: '#F7EFE9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  initialsText: {
    fontWeight: '700',
    color: '#8C331A',
  },
});
