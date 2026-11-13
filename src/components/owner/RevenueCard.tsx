import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useNavigation } from '@react-navigation/native';
import { useApp } from '../../context/AppContext';

export default function RevenueCard() {
  const navigation = useNavigation<any>();
  const { totalRevenue, revenueGrowth } = useApp();

  return (
    <View style={styles.container}>
      <TouchableOpacity
        activeOpacity={0.9}
        style={styles.card}
        onPress={() => navigation.navigate('Reports')}
      >
        <Text style={styles.cardTitle}>TOTAL REVENUE (MTD)</Text>
        <View style={styles.cardValueRow}>
          <Text style={styles.amount}>₹{totalRevenue.toLocaleString()}</Text>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{revenueGrowth}</Text>
          </View>

          <View style={styles.reportBtnLink}>
            <Text style={styles.reportBtnText}>View Reports</Text>
            <Ionicons name="chevron-forward" size={14} color="#FFFFFF" />
          </View>
        </View>
        <View style={styles.waveGraphic} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  card: {
    backgroundColor: '#963819',
    borderRadius: 16,
    paddingHorizontal: 20,
    paddingVertical: 20,
    overflow: 'hidden',
    position: 'relative',
    elevation: 3,
    shadowColor: '#963819',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
  },
  cardTitle: {
    color: 'rgba(255, 255, 255, 0.82)',
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  cardValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  amount: {
    fontSize: 26,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  badge: {
    backgroundColor: 'rgba(255, 255, 255, 0.22)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 8,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  reportBtnLink: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
    marginLeft: 'auto',
  },
  reportBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
    marginRight: 4,
  },
  waveGraphic: {
    position: 'absolute',
    right: -20,
    bottom: -30,
    width: 140,
    height: 90,
    borderRadius: 45,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    transform: [{ rotate: '-15deg' }],
  },
});
