import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Image } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useNavigation, DrawerActions } from '@react-navigation/native';
import { useApp } from '../../context/AppContext';

interface DeliveryHeaderProps {
  title?: string;
  showBack?: boolean;
  iconName?: string;
}

export default function DeliveryHeader({
  title = 'Delivery Dashboard',
  showBack = false,
  iconName,
}: DeliveryHeaderProps) {
  const navigation = useNavigation<any>();
  const { userProfile, openDrawer, unreadNotificationsCount } = useApp();

  const handleOpenMenu = () => {
    try {
      navigation.dispatch(DrawerActions.openDrawer());
    } catch (e) {
      openDrawer();
    }
  };

  return (
    <View style={styles.headerContainer}>
      <View style={styles.leftRow}>
        {showBack ? (
          <TouchableOpacity
            activeOpacity={0.7}
            style={styles.iconBtn}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={22} color="#111827" />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            activeOpacity={0.8}
            style={styles.avatarBtn}
            onPress={handleOpenMenu}
          >
            {userProfile?.avatarUrl ? (
              <Image
                source={{ uri: userProfile.avatarUrl }}
                style={styles.avatarImg}
              />
            ) : (
              <View style={styles.avatarFallback}>
                <Ionicons name="person" size={18} color="#FFFFFF" />
              </View>
            )}
          </TouchableOpacity>
        )}

        <View style={styles.titleBox}>
          <View style={styles.titleBox}>
            {iconName && (
              <View style={styles.titleBox}>
                <Ionicons name={iconName} size={16} color="#059669" />
              </View>
            )}
            <Text style={styles.titleText}>{title}</Text>
          </View>
          <View style={styles.subtitleRow}>
            <View style={styles.greenDot} />
            <Text style={styles.subtitleText}>Delivery Partner Active</Text>
          </View>
        </View>
      </View>

      <View style={styles.rightRow}>
        <TouchableOpacity
          activeOpacity={0.8}
          style={[styles.iconBtn, { marginRight: 8 }]}
          onPress={() => navigation.navigate('Notifications')}
        >
          <Ionicons name="notifications-outline" size={22} color="#111827" />
          {unreadNotificationsCount > 0 && (
            <View style={styles.notifBadge}>
              <Text style={styles.notifText}>{unreadNotificationsCount}</Text>
            </View>
          )}
        </TouchableOpacity>

        {!showBack && (
          <TouchableOpacity
            activeOpacity={0.8}
            style={styles.iconBtn}
            onPress={handleOpenMenu}
          >
            <Ionicons name="menu" size={24} color="#111827" />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  headerContainer: {
    height: 64,
    backgroundColor: '#FAF8F5',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#EFECE8',
  },
  leftRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarBtn: {
    marginRight: 12,
  },
  avatarImg: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#059669',
  },
  avatarFallback: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#059669',
    justifyContent: 'center',
    alignItems: 'center',
  },
  titleBox: {
    justifyContent: 'center',
  },
  titleText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#111827',
  },
  subtitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  greenDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
    marginRight: 5,
  },
  subtitleText: {
    fontSize: 11,
    color: '#6B7280',
    fontWeight: '600',
  },
  rightRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#EFECE8',
    position: 'relative',
  },
  notifBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: '#EF4444',
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 3,
  },
  notifText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '800',
  },
});
