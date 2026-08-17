import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useNavigation, DrawerActions } from '@react-navigation/native';
import { useApp } from '../../context/AppContext';

interface HeaderProps {
  title?: string;
  showBack?: boolean;
  showNotification?: boolean;
  showLogoOnly?: boolean;
}

export default function Header({
  title = 'Dashboard',
  showBack = false,
  showNotification = true,
  showLogoOnly = false,
}: HeaderProps) {
  const { openDrawer, userProfile, userRole, unreadNotificationsCount } =
    useApp();
  const navigation = useNavigation<any>();

  const isDelivery = userRole === 'DELIVERY_PARTNER';
  const primaryColor = isDelivery ? '#059669' : '#8C331A';
  const badgeBg = isDelivery ? '#ECFDF5' : '#F7EFE9';
  const badgeBorder = isDelivery ? '#A7F3D0' : '#EFE3D9';
  const titleColor = isDelivery ? '#047857' : '#7A2E19';
  const notifBg = isDelivery ? '#ECFDF5' : '#F5EAE4';
  const iconColor = isDelivery ? '#047857' : '#332219';

  const handleOpenMenu = () => {
    try {
      navigation.dispatch(DrawerActions.openDrawer());
    } catch (e) {
      openDrawer();
    }
  };

  return (
    <View style={[styles.container, isDelivery && styles.containerDelivery]}>
      <View style={styles.left}>
        {showBack ? (
          <TouchableOpacity
            activeOpacity={0.7}
            style={[
              styles.backBtn,
              { backgroundColor: badgeBg, borderColor: badgeBorder },
            ]}
            onPress={() => navigation.goBack()}
            accessibilityLabel="Go back"
          >
            <Ionicons name="arrow-back" size={22} color={primaryColor} />
          </TouchableOpacity>
        ) : (
          <View
            style={[
              styles.logoBadge,
              { backgroundColor: badgeBg, borderColor: badgeBorder },
            ]}
          >
            <Ionicons
              name={isDelivery ? 'bicycle-sharp' : 'cafe-sharp'}
              size={20}
              color={primaryColor}
            />
          </View>
        )}
        <Text style={[styles.title, { color: titleColor }]}>{title}</Text>
      </View>

      {!showLogoOnly && (
        <View style={styles.right}>
          {showNotification && (
            <TouchableOpacity
              activeOpacity={0.8}
              style={[styles.notifBtn, { backgroundColor: notifBg }]}
              onPress={() => navigation.navigate('Notifications')}
              accessibilityLabel="Notifications"
            >
              <Ionicons
                name="notifications-outline"
                size={22}
                color={iconColor}
              />
              {unreadNotificationsCount > 0 && (
                <View
                  style={[
                    styles.notifBadge,
                    isDelivery && { backgroundColor: '#10B981' },
                  ]}
                >
                  <Text style={styles.notifBadgeText}>
                    {unreadNotificationsCount > 9
                      ? '9+'
                      : unreadNotificationsCount}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          )}

          {!showBack && (
            <>
              <TouchableOpacity
                activeOpacity={0.8}
                style={[styles.profileBtn, { backgroundColor: primaryColor }]}
                onPress={handleOpenMenu}
                accessibilityLabel="User Profile"
              >
                {userProfile?.avatarUrl ? (
                  <Image
                    source={{ uri: userProfile.avatarUrl }}
                    style={styles.avatarImg}
                  />
                ) : (
                  <Ionicons name="person" size={18} color="#FFF" />
                )}
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.8}
                style={styles.menuBtn}
                onPress={handleOpenMenu}
                accessibilityLabel="Open Menu"
              >
                <Ionicons name="menu" size={26} color={iconColor} />
              </TouchableOpacity>
            </>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 10,
    backgroundColor: '#FAF8F5',
    zIndex: 10,
  },
  containerDelivery: {
    backgroundColor: '#F8FAF9',
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#F7EFE9',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
    borderWidth: 1,
    borderColor: '#EFE3D9',
  },
  logoBadge: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#F7EFE9',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
    borderWidth: 1,
    borderColor: '#EFE3D9',
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#7A2E19',
  },
  right: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  notifBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F5EAE4',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
    position: 'relative',
  },
  notifBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: '#E11D48',
    borderRadius: 9,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
    borderWidth: 1.5,
    borderColor: '#FAF8F5',
  },
  notifBadgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '800',
  },
  profileBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#8C331A',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
    overflow: 'hidden',
  },
  avatarImg: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  menuBtn: {
    padding: 2,
  },
});
