import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';

export default function FleetMap() {
  return (
    <View style={styles.container}>
      {/* Top Left Live Fleet Badge */}
      <View style={styles.badge}>
        <Ionicons name="location-sharp" size={14} color="#8C331A" style={{ marginRight: 4 }} />
        <Text style={styles.badgeText}>Live Fleet View</Text>
      </View>

      {/* Map Graphic Pins / Visual Elements */}
      <View style={styles.mapPin1}>
        <Ionicons name="navigate-circle" size={24} color="#3B82F6" />
      </View>

      <View style={styles.mapPin2}>
        <Ionicons name="navigate-circle" size={24} color="#10B981" />
      </View>

      {/* Bottom Right Target / GPS Action Button */}
      <TouchableOpacity activeOpacity={0.85} style={styles.gpsButton}>
        <Ionicons name="locate" size={20} color="#FFFFFF" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 160,
    backgroundColor: '#E5E7EB',
    borderRadius: 20,
    marginTop: 16,
    marginBottom: 20,
    position: 'relative',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#D1D5DB',
  },
  badge: {
    position: 'absolute',
    top: 14,
    left: 14,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
  },
  badgeText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#2C201A',
  },
  mapPin1: {
    position: 'absolute',
    top: '40%',
    left: '35%',
  },
  mapPin2: {
    position: 'absolute',
    top: '55%',
    left: '70%',
  },
  gpsButton: {
    position: 'absolute',
    bottom: 14,
    right: 14,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#8C331A',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#8C331A',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
});
