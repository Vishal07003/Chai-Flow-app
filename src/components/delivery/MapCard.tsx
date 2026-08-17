import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Linking } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';

interface MapCardProps {
  destinationAddress?: string;
  distanceKm?: string;
  etaMinutes?: string;
  onPressStartNav?: () => void;
}

export default function MapCard({
  destinationAddress = 'Flat 402, Green Valley Apartments, Sector 14',
  distanceKm = '2.4 km',
  etaMinutes = '8 mins',
  onPressStartNav,
}: MapCardProps) {
  const handleOpenGoogleMaps = () => {
    if (onPressStartNav) {
      onPressStartNav();
      return;
    }
    const query = encodeURIComponent(destinationAddress);
    Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${query}`).catch(() => {});
  };

  return (
    <View style={styles.card}>
      <View style={styles.mapPreview}>
        <Ionicons name="map" size={32} color="#059669" />
        <View style={styles.mapBadge}>
          <Ionicons name="navigate-circle" size={16} color="#FFFFFF" style={{ marginRight: 4 }} />
          <Text style={styles.mapBadgeText}>{distanceKm} • {etaMinutes}</Text>
        </View>
      </View>

      <View style={styles.contentBox}>
        <Text style={styles.label}>NEXT DESTINATION</Text>
        <Text style={styles.addressText} numberOfLines={2}>{destinationAddress}</Text>

        <TouchableOpacity activeOpacity={0.85} style={styles.navBtn} onPress={handleOpenGoogleMaps}>
          <Ionicons name="navigate" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
          <Text style={styles.navBtnText}>Start GPS Navigation</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 16,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    borderWidth: 1,
    borderColor: '#EFECE8',
  },
  mapPreview: {
    height: 110,
    backgroundColor: '#ECFDF5',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  mapBadge: {
    position: 'absolute',
    bottom: 10,
    backgroundColor: '#059669',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
  },
  mapBadgeText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 12,
  },
  contentBox: {
    padding: 16,
  },
  label: {
    fontSize: 11,
    fontWeight: '800',
    color: '#6B7280',
    letterSpacing: 0.8,
  },
  addressText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
    marginTop: 4,
    marginBottom: 12,
  },
  navBtn: {
    backgroundColor: '#059669',
    height: 44,
    borderRadius: 14,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  navBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
});
