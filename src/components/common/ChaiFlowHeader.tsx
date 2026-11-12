import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';

export default function ChaiFlowHeader() {
  return (
    <View style={styles.headerContainer}>
      <View style={styles.logoBadge}>
        <Ionicons name="cafe" size={24} color="#594294" />
      </View>
      <View style={styles.textContainer}>
        <Text style={styles.brandTitle}>ChaiFlow</Text>
        <Text style={styles.brandSubtitle}>Delivery network manager</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 32,
    marginTop: 12,
  },
  logoBadge: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#F3E3D5',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  textContainer: {
    justifyContent: 'center',
  },
  brandTitle: {
    fontSize: 21,
    fontWeight: '700',
    color: '#8C331A',
    letterSpacing: -0.2,
  },
  brandSubtitle: {
    fontSize: 13,
    fontWeight: '400',
    color: '#9C8C82',
    marginTop: 2,
  },
});
