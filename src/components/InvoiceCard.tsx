import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';

export interface InvoiceCardProps {
  name: string;
  amount: string;
  due: string;
  initials?: string;
  isOverdue?: boolean;
  onPress?: () => void;
}

export default function InvoiceCard({
  name,
  amount,
  due,
  initials,
  isOverdue = false,
  onPress,
}: InvoiceCardProps) {
  const displayInitials =
    initials ||
    name
      .split(' ')
      .map(part => part[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);

  return (
    <TouchableOpacity activeOpacity={0.8} onPress={onPress} style={styles.card}>
      <View style={styles.leftGroup}>
        <View style={styles.avatar}>
          <Text style={styles.initialsText}>{displayInitials}</Text>
        </View>

        <View style={styles.info}>
          <Text style={styles.name}>{name}</Text>
          <Text style={[styles.due, (isOverdue || due.toLowerCase().includes('overdue')) && styles.overdueText]}>
            {due}
          </Text>
        </View>
      </View>

      <View style={styles.rightGroup}>
        <Text style={styles.amount}>{amount}</Text>
        <Ionicons name="chevron-forward" size={16} color="#A89F97" style={{ marginLeft: 6 }} />
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 10,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  leftGroup: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#EFECE9',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  initialsText: {
    color: '#4A3D36',
    fontWeight: '700',
    fontSize: 14,
  },
  info: {
    justifyContent: 'center',
  },
  name: {
    fontSize: 15,
    fontWeight: '600',
    color: '#2C201A',
  },
  due: {
    color: '#7C6E65',
    fontSize: 13,
    marginTop: 2,
  },
  overdueText: {
    color: '#A62B2B',
  },
  rightGroup: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  amount: {
    color: '#602816',
    fontWeight: '700',
    fontSize: 16,
  },
});
