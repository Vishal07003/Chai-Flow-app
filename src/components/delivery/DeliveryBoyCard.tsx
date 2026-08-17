import React from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { DeliveryBoyItem } from '../../context/AppContext';

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
    status,
    location,
    distance,
    avatarUrl,
    progress = 0,
    vehicleType,
    vehicleModel,
    numberPlate,
  } = boy;

  const isBusy = status === 'BUSY';
  const isReady = status === 'READY';
  const isOffline = status === 'OFFLINE';

  const handleCardPress = () => {
    if (onPress) {
      onPress(boy);
    } else if (onMore) {
      onMore(boy);
    }
  };

  return (
    <View style={styles.card}>
      {/* Top Header Row - Clickable for details & edit */}
      <TouchableOpacity
        activeOpacity={0.8}
        style={styles.headerRow}
        onPress={handleCardPress}
      >
        {/* Avatar with Status Indicator Dot */}
        <View style={styles.avatarWrapper}>
          {avatarUrl ? (
            <Image source={{ uri: avatarUrl }} style={styles.avatarImage} />
          ) : (
            <View style={styles.avatarFallback}>
              <Ionicons name="person" size={24} color="#A09489" />
            </View>
          )}

          {/* Status Indicator Dot */}
          <View
            style={[
              styles.statusDot,
              isBusy && styles.busyDot,
              isReady && styles.readyDot,
              isOffline && styles.offlineDot,
            ]}
          >
            {isBusy && <Ionicons name="git-commit" size={10} color="#FFF" />}
          </View>
        </View>

        {/* Name & Subtitle */}
        <View style={styles.infoContainer}>
          <View style={styles.nameHeaderRow}>
            <Text style={styles.name}>{name}</Text>
            <Ionicons name="chevron-forward" size={16} color="#A09489" />
          </View>

          {/* Vehicle & Plate Tag */}
          {(numberPlate || vehicleType) && (
            <View style={styles.vehiclePillRow}>
              <Ionicons
                name="bicycle"
                size={12}
                color="#059669"
                style={{ marginRight: 4 }}
              />
              <Text style={styles.vehiclePillText}>
                {vehicleModel || vehicleType || 'Scooter'} ·{' '}
                {numberPlate || 'DL 01 AB 1234'}
              </Text>
            </View>
          )}

          <View style={styles.locationRow}>
            {isBusy && (
              <Ionicons
                name="git-commit-outline"
                size={14}
                color="#6E6259"
                style={{ marginRight: 4 }}
              />
            )}
            {isReady && (
              <Ionicons
                name="location-outline"
                size={14}
                color="#6E6259"
                style={{ marginRight: 4 }}
              />
            )}
            {isOffline && (
              <Ionicons
                name="time-outline"
                size={14}
                color="#6E6259"
                style={{ marginRight: 4 }}
              />
            )}
            <Text style={styles.locationText}>
              {location} {distance ? `• ${distance}` : ''}
            </Text>
          </View>
        </View>

        {/* Right Badge & Quick Delete Button */}
        <View style={styles.badgeColumn}>
          <View
            style={[
              styles.badge,
              isBusy && styles.busyBadge,
              isReady && styles.readyBadge,
              isOffline && styles.offlineBadge,
            ]}
          >
            <Text
              style={[
                styles.badgeText,
                isBusy && styles.busyBadgeText,
                isReady && styles.readyBadgeText,
                isOffline && styles.offlineBadgeText,
              ]}
            >
              {status}
            </Text>
          </View>

          {/* {onDelete && (
            <TouchableOpacity
              activeOpacity={0.7}
              style={styles.trashQuickBtn}
              onPress={() => onDelete(boy)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="trash-outline" size={16} color="#D9381E" />
            </TouchableOpacity>
          )} */}
        </View>
      </TouchableOpacity>

      {/* Progress Bar (if active/busy) */}
      {progress > 0 && (
        <View style={styles.progressTrack}>
          <View style={[styles.progressBar, { width: `${progress}%` }]} />
        </View>
      )}

      {/* Action Buttons Row */}
      {isBusy && (
        <View style={styles.actionsRow}>
          <TouchableOpacity
            activeOpacity={0.8}
            style={styles.messageBtn}
            onPress={() => onMessage?.(boy)}
          >
            <Ionicons
              name="chatbox-outline"
              size={16}
              color="#332219"
              style={{ marginRight: 6 }}
            />
            <Text style={styles.messageBtnText}>Message</Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.8}
            style={styles.callBtn}
            onPress={() => onCall?.(boy)}
          >
            <Ionicons name="call-outline" size={16} color="#8C331A" />
          </TouchableOpacity>
        </View>
      )}

      {isReady && (
        <View style={styles.actionsRow}>
          <TouchableOpacity
            activeOpacity={0.85}
            style={styles.assignBtn}
            onPress={() => onAssignOrder?.(boy)}
          >
            <Ionicons
              name="clipboard-outline"
              size={16}
              color="#FFFFFF"
              style={{ marginRight: 6 }}
            />
            <Text style={styles.assignBtnText}>Assign Order</Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.8}
            style={styles.moreBtn}
            onPress={() => handleCardPress()}
          >
            <Ionicons name="create-outline" size={18} color="#4A3E37" />
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    marginBottom: 14,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 5,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarWrapper: {
    position: 'relative',
    marginRight: 14,
  },
  avatarImage: {
    width: 52,
    height: 52,
    borderRadius: 26,
  },
  avatarFallback: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#EFECE8',
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusDot: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  busyDot: {
    backgroundColor: '#3B82F6',
  },
  readyDot: {
    backgroundColor: '#10B981',
  },
  offlineDot: {
    backgroundColor: '#9CA3AF',
  },
  infoContainer: {
    flex: 1,
  },
  nameHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  name: {
    fontSize: 16,
    fontWeight: '700',
    color: '#2C201A',
    marginRight: 4,
  },
  badgeColumn: {
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  trashQuickBtn: {
    marginTop: 8,
    padding: 4,
  },
  vehiclePillRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
    marginBottom: 2,
  },
  vehiclePillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#059669',
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  locationText: {
    fontSize: 13,
    color: '#6E6259',
  },
  badge: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 14,
  },
  busyBadge: {
    backgroundColor: '#EBF3FE',
  },
  busyBadgeText: {
    color: '#3B82F6',
  },
  readyBadge: {
    backgroundColor: '#FDEEEB',
  },
  readyBadgeText: {
    color: '#8C331A',
  },
  offlineBadge: {
    backgroundColor: '#F3F4F6',
  },
  offlineBadgeText: {
    color: '#71717A',
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  progressTrack: {
    height: 4,
    backgroundColor: '#EFECE8',
    borderRadius: 2,
    marginTop: 14,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#3B82F6',
    borderRadius: 2,
  },

  /* Actions Row */
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 14,
  },
  messageBtn: {
    flex: 1,
    height: 42,
    backgroundColor: '#EFECE8',
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  messageBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2C201A',
  },
  callBtn: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: '#FDEEEB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  assignBtn: {
    flex: 1,
    height: 44,
    backgroundColor: '#8C331A',
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  assignBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  moreBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#EFECE8',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
