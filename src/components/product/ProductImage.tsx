import React from 'react';
import { Image, View, StyleSheet, ImageStyle, ViewStyle } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';

export interface ProductImageProps {
  imageUrl?: string;
  size?: number;
  borderRadius?: number;
  style?: ImageStyle & ViewStyle;
}

export default function ProductImage({
  imageUrl,
  size = 60,
  borderRadius = 12,
  style,
}: ProductImageProps) {
  const containerStyle = {
    width: size,
    height: size,
    borderRadius,
  };

  if (imageUrl) {
    return (
      <Image
        source={{ uri: imageUrl }}
        style={[styles.image, containerStyle, style as ImageStyle]}
        resizeMode="cover"
      />
    );
  }

  return (
    <View style={[styles.fallback, containerStyle, style as ViewStyle]}>
      <Ionicons name="cube-outline" size={size * 0.4} color="#8E8278" />
    </View>
  );
}

const styles = StyleSheet.create({
  image: {
    backgroundColor: '#F3EFEA',
  },
  fallback: {
    backgroundColor: '#F3EFEA',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
