import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import CustomerAvatar from './CustomerAvatar';

export interface CustomerTileProps {
  name: string;
  subtitle?: string;
  avatarUrl?: string;
  amount?: number;
  badge?: string;
  onPress?: () => void;
}

export default function CustomerTile({
  name,
  subtitle,
  avatarUrl,
  amount,
  badge,
  onPress,
}: CustomerTileProps) {
  return (
    <TouchableOpacity
      activeOpacity={0.8}
      style={styles.tile}
      onPress={onPress}
      disabled={!onPress}
    >
      <CustomerAvatar avatarUrl={avatarUrl} name={name} size={42} />
      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={1}>
          {name}
        </Text>
        {subtitle ? (
          <Text style={styles.subtitle} numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {amount !== undefined || badge ? (
        <View style={styles.rightCol}>
          {amount !== undefined ? (
            <Text style={styles.amount}>₹{amount.toLocaleString()}</Text>
          ) : null}
          {badge ? (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{badge}</Text>
            </View>
          ) : null}
        </View>
      ) : null}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  tile: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginBottom: 8,
  },
  info: {
    flex: 1,
    marginLeft: 12,
  },
  name: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E293B',
  },
  subtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  rightCol: {
    alignItems: 'flex-end',
    marginLeft: 8,
  },
  amount: {
    fontSize: 14,
    fontWeight: '700',
    color: '#8C331A',
  },
  badge: {
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginTop: 2,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#DC2626',
  },
});
