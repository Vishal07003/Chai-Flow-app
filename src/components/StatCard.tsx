import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';

export interface StatCardProps {
  title: string;
  amount: string | number;
  subtitle?: string;
  color?: string;
  iconName?: string;
  iconColor?: string;
  iconBgColor?: string;
  onPress?: () => void;
}

export default function StatCard({
  title,
  amount,
  subtitle,
  color,
  iconName,
  iconColor = '#3B82F6',
  iconBgColor = '#EDF4FE',
  onPress,
}: StatCardProps) {
  return (
    <TouchableOpacity
      activeOpacity={onPress ? 0.85 : 1}
      style={styles.card}
      onPress={onPress}
      disabled={!onPress}
    >
      {iconName && (
        <View style={[styles.iconBox, { backgroundColor: iconBgColor }]}>
          <Ionicons name={iconName} size={22} color={iconColor} />
        </View>
      )}
      <Text style={styles.title}>{title}</Text>
      <Text style={[styles.amount, color ? { color } : null]}>{amount}</Text>
      {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 4,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    color: '#6E6259',
    fontSize: 13,
    fontWeight: '500',
  },
  amount: {
    fontSize: 22,
    fontWeight: '700',
    color: '#2C201A',
    marginTop: 4,
  },
  subtitle: {
    marginTop: 6,
    color: '#999999',
    fontSize: 12,
  },
});
