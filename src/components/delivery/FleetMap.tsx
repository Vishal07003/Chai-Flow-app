import React, { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { DeliveryPartnerProfile } from '../../services/delivery.service';

interface FleetMapProps {
  partners?: DeliveryPartnerProfile[] | any[];
  onRefresh?: () => void;
}

export default function FleetMap({ partners = [], onRefresh }: FleetMapProps) {
  const [collapsed, setCollapsed] = useState(false);

  // Filter partners that have real latitude & longitude coordinates recorded
  const activeLocationPartners = (partners || []).filter(
    (p: any) =>
      p.current_lat !== undefined &&
      p.current_lat !== null &&
      p.current_lng !== undefined &&
      p.current_lng !== null,
  );

  return (
    <View style={styles.card}>
      {/* Collapsible Header */}
      <TouchableOpacity
        style={styles.header}
        onPress={() => setCollapsed(!collapsed)}
        activeOpacity={0.8}
      >
        <View style={styles.headerLeft}>
          <View style={styles.iconCircle}>
            <Ionicons name="navigate" size={14} color="#8C331A" />
          </View>
          <View>
            <Text style={styles.title}>Live Fleet GPS</Text>
            <Text style={styles.subtitle}>
              {activeLocationPartners.length > 0
                ? `${activeLocationPartners.length} partner(s) transmitting live GPS`
                : 'No active partner GPS signals'}
            </Text>
          </View>
        </View>

        <View style={styles.headerRight}>
          {onRefresh && (
            <TouchableOpacity
              onPress={onRefresh}
              style={styles.refreshBtn}
              hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
            >
              <Ionicons name="refresh" size={14} color="#8C331A" />
            </TouchableOpacity>
          )}
          <Ionicons
            name={collapsed ? 'chevron-down' : 'chevron-up'}
            size={18}
            color="#8E8278"
          />
        </View>
      </TouchableOpacity>

      {/* Map Content Body */}
      {!collapsed && (
        <View style={styles.mapBody}>
          {activeLocationPartners.length > 0 ? (
            <View style={styles.activeLocationContainer}>
              <View style={styles.activeLocationList}>
                {activeLocationPartners.map((p: any) => (
                  <View key={p.id} style={styles.locationRow}>
                    <Ionicons name="location" size={15} color="#059669" style={{ marginRight: 6 }} />
                    <Text style={styles.locationPartnerName}>{p.name}:</Text>
                    <Text style={styles.coordinatesText}>
                      {Number(p.current_lat).toFixed(4)}, {Number(p.current_lng).toFixed(4)}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          ) : (
            <View style={styles.emptyContainer}>
              <Ionicons name="location-outline" size={28} color="#C4BCB5" />
              <Text style={styles.emptyTitle}>GPS Location Unavailable</Text>
              <Text style={styles.emptySubtitle}>
                Partners transmit live coordinates once an assigned order is in transit.
              </Text>
            </View>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#EFEAE4',
    marginBottom: 12,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#FFFFFF',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#FDEEEB',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  title: {
    fontSize: 13,
    fontWeight: '800',
    color: '#2A2421',
  },
  subtitle: {
    fontSize: 11,
    color: '#8E8278',
    marginTop: 1,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  refreshBtn: {
    padding: 4,
    backgroundColor: '#FAF8F5',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#EFEAE4',
  },
  mapBody: {
    borderTopWidth: 1,
    borderTopColor: '#F3EFEA',
    backgroundColor: '#FAF8F5',
    padding: 12,
  },
  activeLocationContainer: {
    paddingVertical: 4,
  },
  activeLocationList: {
    gap: 6,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#EFEAE4',
  },
  locationPartnerName: {
    fontSize: 12,
    fontWeight: '700',
    color: '#2A2421',
    marginRight: 6,
  },
  coordinatesText: {
    fontSize: 11,
    color: '#059669',
    fontWeight: '600',
  },
  emptyContainer: {
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#554A42',
    marginTop: 4,
  },
  emptySubtitle: {
    fontSize: 11,
    color: '#8E8278',
    textAlign: 'center',
    marginTop: 2,
    paddingHorizontal: 16,
  },
});
