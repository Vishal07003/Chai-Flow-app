import React from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { DeliveryBoyItem } from '../../context/AppContext';
import { colors, typography, radius, spacing, shadows } from '../../theme';

export type DeliveryBoy = DeliveryBoyItem;

type DeliveryBoyCardProps = {
  boy: DeliveryBoyItem;
  onPress?: (boy: DeliveryBoyItem) => void;
  onMessage?: (boy: DeliveryBoyItem) => void;
  onCall?: (boy: DeliveryBoyItem) => void;
  onAssignOrder?: (boy: DeliveryBoyItem) => void;
  onMore?: (boy: DeliveryBoyItem) => void;
  onDelete?: (boy: DeliveryBoyItem) => void;
};

export default function DeliveryBoyCard({
  boy,
  onPress,
  onMessage,
  onCall,
  onAssignOrder,
  onMore,
  onDelete,
}: DeliveryBoyCardProps) {
  const {
    name,
    phone,
    status,
    isActive = true,
    avatarUrl,
    vehicleType,
    vehicleModel,
    numberPlate,
    activeDeliveriesCount = 0,
    assignedOrderNumber,
  } = boy;

  const isBusy = status === 'BUSY';
  const isReady = status === 'READY';
  const isOffline = status === 'OFFLINE' || !isActive;

  const handleCardPress = () => {
    if (onPress) {
      onPress(boy);
    } else if (onMore) {
      onMore(boy);
    }
  };

  const statusLabel = !isActive ? 'INACTIVE' : isReady ? 'AVAILABLE' : isBusy ? 'BUSY' : 'OFFLINE';

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      style={[styles.card, !isActive && styles.cardInactive]}
      onPress={handleCardPress}
    >
      <View style={styles.topRow}>
        {/* Profile Avatar / Initials */}
        <View style={styles.avatarWrapper}>
          {avatarUrl ? (
            <Image source={{ uri: avatarUrl }} style={styles.avatarImage} />
          ) : (
            <View style={styles.avatarFallback}>
              <Text style={styles.initialsText}>
                {name ? name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() : 'DP'}
              </Text>
            </View>
          )}

          {/* Status Dot */}
          <View
            style={[
              styles.statusDot,
              isReady && styles.readyDot,
              isBusy && styles.busyDot,
              isOffline && styles.offlineDot,
            ]}
          />
        </View>

        {/* Info Column */}
        <View style={styles.infoCol}>
          <View style={styles.nameRow}>
            <Text style={styles.nameText} numberOfLines={1}>
              {name}
            </Text>

            {/* Status Badge */}
            <View
              style={[
                styles.statusBadge,
                isReady && styles.statusBadgeReady,
                isBusy && styles.statusBadgeBusy,
                isOffline && styles.statusBadgeOffline,
              ]}
            >
              <Text
                style={[
                  styles.statusBadgeText,
                  isReady && styles.statusBadgeTextReady,
                  isBusy && styles.statusBadgeTextBusy,
                  isOffline && styles.statusBadgeTextOffline,
                ]}
              >
                {statusLabel}
              </Text>
            </View>
          </View>

          {/* Mobile & Vehicle Subtitle */}
          <View style={styles.detailsRow}>
            {phone ? (
              <Text style={styles.subText}>📱 {phone}</Text>
            ) : null}

            {(vehicleType || numberPlate) ? (
              <Text style={styles.subText}>
                {phone ? ' • ' : ''}
                {vehicleModel || vehicleType || 'Scooter'}
                {numberPlate ? ` (${numberPlate})` : ''}
              </Text>
            ) : null}
          </View>

          {/* Assigned Order Info if available */}
          {(activeDeliveriesCount > 0 || assignedOrderNumber) && (
            <View style={styles.orderTagRow}>
              <Ionicons name="cube-outline" size={12} color="#8C331A" style={{ marginRight: 4 }} />
              <Text style={styles.orderTagText}>
                {assignedOrderNumber ? `Order #${assignedOrderNumber}` : `${activeDeliveriesCount} active delivery`}
              </Text>
            </View>
          )}
        </View>

        <Ionicons name="chevron-forward" size={16} color="#B5AAA2" />
      </View>

      {/* Quick Action Footer */}
      <View style={styles.actionsFooter}>
        <TouchableOpacity
          style={styles.actionBtn}
          onPress={() => onCall && onCall(boy)}
          activeOpacity={0.7}
        >
          <Ionicons name="call-outline" size={14} color="#059669" style={{ marginRight: 4 }} />
          <Text style={[styles.actionBtnText, { color: '#059669' }]}>Call</Text>
        </TouchableOpacity>

        <View style={styles.btnDivider} />

        <TouchableOpacity
          style={styles.actionBtn}
          onPress={() => onMessage && onMessage(boy)}
          activeOpacity={0.7}
        >
          <Ionicons name="chatbubble-outline" size={14} color="#3B82F6" style={{ marginRight: 4 }} />
          <Text style={[styles.actionBtnText, { color: '#3B82F6' }]}>Message</Text>
        </TouchableOpacity>

        <View style={styles.btnDivider} />

        <TouchableOpacity
          style={styles.actionBtn}
          onPress={handleCardPress}
          activeOpacity={0.7}
        >
          <Ionicons name="information-circle-outline" size={14} color="#8C331A" style={{ marginRight: 4 }} />
          <Text style={[styles.actionBtnText, { color: '#8C331A' }]}>Details</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#EFEAE4',
    marginBottom: 10,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    overflow: 'hidden',
  },
  cardInactive: {
    opacity: 0.7,
    backgroundColor: '#FAF8F5',
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
  },
  avatarWrapper: {
    width: 44,
    height: 44,
    borderRadius: 22,
    position: 'relative',
    marginRight: 10,
  },
  avatarImage: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  avatarFallback: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F7EFE9',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#EFE3D9',
  },
  initialsText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#8C331A',
  },
  statusDot: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  readyDot: {
    backgroundColor: '#10B981',
  },
  busyDot: {
    backgroundColor: '#F59E0B',
  },
  offlineDot: {
    backgroundColor: '#9CA3AF',
  },
  infoCol: {
    flex: 1,
    marginRight: 8,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  nameText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#2A2421',
    flex: 1,
    marginRight: 6,
  },
  statusBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 10,
  },
  statusBadgeReady: {
    backgroundColor: '#ECFDF5',
  },
  statusBadgeBusy: {
    backgroundColor: '#FFFBEB',
  },
  statusBadgeOffline: {
    backgroundColor: '#F3F4F6',
  },
  statusBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  statusBadgeTextReady: {
    color: '#059669',
  },
  statusBadgeTextBusy: {
    color: '#D97706',
  },
  statusBadgeTextOffline: {
    color: '#6B7280',
  },
  detailsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
  },
  subText: {
    fontSize: 11,
    color: '#6B5E55',
  },
  orderTagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    backgroundColor: '#FEF9F6',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  orderTagText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#8C331A',
  },
  actionsFooter: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#F3EFEA',
    backgroundColor: '#FAF8F5',
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  actionBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
  btnDivider: {
    width: 1,
    backgroundColor: '#EFEAE4',
  },
});
