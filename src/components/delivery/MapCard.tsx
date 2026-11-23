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
  destinationAddress,
  distanceKm,
  etaMinutes,
  onPressStartNav,
}: MapCardProps) {
  const displayAddress = destinationAddress || 'No active route';
  const hasRoute = !!destinationAddress && destinationAddress !== 'No active route';

  const handleOpenGoogleMaps = () => {
    if (onPressStartNav) {
      onPressStartNav();
      return;
    }
    if (!hasRoute) return;
    const query = encodeURIComponent(displayAddress);
    Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${query}`).catch(() => {});
  };

  return (
    <View style={styles.card}>
      <View style={styles.mapPreview}>
        <Ionicons name="map" size={32} color="#059669" />
        {distanceKm ? (
          <View style={styles.mapBadge}>
            <Ionicons name="navigate-circle" size={16} color="#FFFFFF" style={{ marginRight: 4 }} />
            <Text style={styles.mapBadgeText}>
              {distanceKm}
              {etaMinutes ? ` • ${etaMinutes}` : ''}
            </Text>
          </View>
        ) : null}
      </View>

      <View style={styles.contentBox}>
        <Text style={styles.label}>NEXT DESTINATION</Text>
        <Text style={styles.addressText} numberOfLines={2}>
          {displayAddress}
        </Text>

        <TouchableOpacity
          activeOpacity={0.85}
          style={[styles.navBtn, !hasRoute && styles.navBtnDisabled]}
          onPress={handleOpenGoogleMaps}
          disabled={!hasRoute}
        >
          <Ionicons name="navigate" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
          <Text style={styles.navBtnText}>
            {hasRoute ? 'Start GPS Navigation' : 'No Active Navigation'}
          </Text>
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
  navBtnDisabled: {
    backgroundColor: '#9CA3AF',
  },
  navBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
});
