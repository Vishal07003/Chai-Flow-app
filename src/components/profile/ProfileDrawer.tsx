import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Image,
  ScrollView,
  Switch,
} from 'react-native';
import {
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useNavigation } from '@react-navigation/native';
import { DrawerContentComponentProps } from '@react-navigation/drawer';
import { useApp } from '../../context/AppContext';

export default function ProfileDrawer(props?: DrawerContentComponentProps) {
  const insets = useSafeAreaInsets();
  const {
    isDrawerOpen,
    closeDrawer,
    userProfile,
    userRole,
    setUserRole,
    logout,
  } = useApp();
  const navigation = useNavigation<any>();

  const isDelivery = userRole === 'DELIVERY_PARTNER';
  const accentColor = isDelivery ? '#059669' : '#8C331A';
  const cardBg = isDelivery ? '#ECFDF5' : '#FDEBE4';
  const cardBorder = isDelivery ? '#A7F3D0' : '#F5C6B8';

  const lastTapTime = useRef<number>(0);
  const handleDebouncedAction = (action: () => void) => {
    const now = Date.now();
    if (now - lastTapTime.current < 350) {
      return;
    }
    lastTapTime.current = now;
    action();
  };

  const safeCloseDrawer = () => {
    if (props?.navigation) {
      props.navigation.closeDrawer();
    }
    closeDrawer();
  };

  const handleToggleRole = () => {
    handleDebouncedAction(() => {
      safeCloseDrawer();
      const newRole = userRole === 'ADMIN' ? 'DELIVERY_PARTNER' : 'ADMIN';
      setUserRole(newRole);
      triggerToast(
        `Switched to ${
          newRole === 'ADMIN' ? 'Owner / Admin' : 'Delivery Partner'
        } Mode!`,
      );
    });
  };

  const [activeModal, setActiveModal] = useState<
    'none' | 'settings' | 'notifications' | 'help'
  >('none');

  const [pushNotifications, setPushNotifications] = useState(true);
  const [emailAlerts, setEmailAlerts] = useState(true);

  const [toastMessage, setToastMessage] = useState('');

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 2500);
  };

  const handleNavigateToProfile = () => {
    handleDebouncedAction(() => {
      safeCloseDrawer();
      try {
        navigation.navigate('Profile');
      } catch (e) {}
    });
  };

  const handleNavigateToSettings = () => {
    handleDebouncedAction(() => {
      safeCloseDrawer();
      try {
        navigation.navigate('Settings');
      } catch (e) {}
    });
  };

  const handleNavigateToReports = () => {
    handleDebouncedAction(() => {
      safeCloseDrawer();
      try {
        navigation.navigate('Reports');
      } catch (e) {}
    });
  };

  const handleLogout = () => {
    handleDebouncedAction(() => {
      safeCloseDrawer();
      logout();
    });
  };

  const renderContent = () => (
    <SafeAreaView
      edges={['top', 'bottom', 'right']}
      style={styles.drawerContainer}
    >
      {toastMessage !== '' && (
        <View
          style={[
            styles.toast,
            { top: insets.top + 10, backgroundColor: accentColor },
          ]}
        >
          <Ionicons
            name="information-circle-outline"
            size={18}
            color="#FFFFFF"
          />
          <Text style={styles.toastText}>{toastMessage}</Text>
        </View>
      )}

      {/* Profile Header Block */}
      <TouchableOpacity
        activeOpacity={0.8}
        style={styles.headerSection}
        onPress={handleNavigateToProfile}
      >
        <View style={[styles.avatarWrapper, { backgroundColor: accentColor }]}>
          {userProfile?.avatarUrl ? (
            <Image
              source={{ uri: userProfile.avatarUrl }}
              style={styles.avatarImg}
            />
          ) : (
            <View
              style={[styles.avatarFallback, { backgroundColor: accentColor }]}
            >
              <Ionicons name="person" size={24} color="#FFF" />
            </View>
          )}
        </View>

        <View style={styles.headerTextContainer}>
          <Text style={styles.userName} numberOfLines={1}>
            {userProfile?.fullName || 'Arjun Mehta'}
          </Text>
          <View style={[styles.roleBadge, { backgroundColor: accentColor }]}>
            <Ionicons
              name={userRole === 'ADMIN' ? 'shield-checkmark' : 'bicycle'}
              size={12}
              color="#FFFFFF"
            />
            <Text style={styles.roleBadgeText}>
              {userRole === 'ADMIN' ? 'ADMIN' : 'DELIVERY PARTNER'}
            </Text>
          </View>
        </View>

        <TouchableOpacity
          onPress={safeCloseDrawer}
          style={styles.closeBtn}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="close" size={22} color="#666" />
        </TouchableOpacity>
      </TouchableOpacity>

      <View style={styles.divider} />

      {/* Navigation Menu */}
      <ScrollView
        style={styles.menuScrollView}
        contentContainerStyle={styles.menuScrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Dynamic Role Switch Card */}
        <View
          style={[
            styles.roleSwitchCard,
            { backgroundColor: cardBg, borderColor: cardBorder },
          ]}
        >
          <View style={styles.roleSwitchInfo}>
            <View style={styles.roleIconCircle}>
              <Ionicons
                name={userRole === 'ADMIN' ? 'shield-checkmark' : 'bicycle'}
                size={16}
                color={accentColor}
              />
            </View>
            <View style={{ marginLeft: 10, flex: 1 }}>
              <Text style={[styles.roleSwitchTitle, { color: accentColor }]}>
                {userRole === 'ADMIN' ? 'Owner Mode' : 'Delivery Mode'}
              </Text>
              <Text style={styles.roleSwitchSub}>
                Tap switch to test partner flow
              </Text>
            </View>
          </View>
          <Switch
            value={userRole === 'DELIVERY_PARTNER'}
            onValueChange={handleToggleRole}
            trackColor={{ false: '#EFECE9', true: accentColor }}
            thumbColor="#FFFFFF"
          />
        </View>

        <TouchableOpacity
          activeOpacity={0.7}
          style={styles.menuItem}
          onPress={handleNavigateToProfile}
        >
          <Ionicons
            name="person-outline"
            size={20}
            color={accentColor}
            style={styles.menuIcon}
          />
          <Text style={styles.menuText}>My Profile</Text>
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.7}
          style={styles.menuItem}
          onPress={handleNavigateToSettings}
        >
          <Ionicons
            name="settings-outline"
            size={20}
            color={accentColor}
            style={styles.menuIcon}
          />
          <Text style={styles.menuText}>Settings</Text>
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.7}
          style={styles.menuItem}
          onPress={handleNavigateToReports}
        >
          <Ionicons
            name="document-text-outline"
            size={20}
            color={accentColor}
            style={styles.menuIcon}
          />
          <Text style={styles.menuText}>Reports & Invoices</Text>
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.7}
          style={styles.menuItem}
          onPress={() => setActiveModal('notifications')}
        >
          <Ionicons
            name="notifications-outline"
            size={20}
            color={accentColor}
            style={styles.menuIcon}
          />
          <Text style={styles.menuText}>Notifications</Text>
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.7}
          style={styles.menuItem}
          onPress={() => setActiveModal('help')}
        >
          <Ionicons
            name="help-circle-outline"
            size={20}
            color={accentColor}
            style={styles.menuIcon}
          />
          <Text style={styles.menuText}>Help & Support</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Footer Section */}
      <View style={styles.footerSection}>
        <View style={styles.divider} />
        <TouchableOpacity
          activeOpacity={0.7}
          style={styles.logoutItem}
          onPress={handleLogout}
        >
          <Ionicons
            name="log-out-outline"
            size={20}
            color="#D9381E"
            style={styles.menuIcon}
          />
          <Text style={styles.logoutText}>Log out</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );

  return (
    <>
      {props?.navigation ? (
        renderContent()
      ) : (
        <Modal
          visible={isDrawerOpen}
          transparent={true}
          animationType="fade"
          statusBarTranslucent={true}
          onRequestClose={closeDrawer}
        >
          <TouchableWithoutFeedback onPress={closeDrawer}>
            <View style={styles.overlay}>
              <TouchableWithoutFeedback onPress={() => {}}>
                {renderContent()}
              </TouchableWithoutFeedback>
            </View>
          </TouchableWithoutFeedback>
        </Modal>
      )}

      {/* Sub-modal: Settings */}
      <Modal
        visible={activeModal === 'settings'}
        transparent={true}
        animationType="slide"
        statusBarTranslucent={true}
        onRequestClose={() => setActiveModal('none')}
      >
        <View style={styles.subModalOverlay}>
          <SafeAreaView
            edges={['bottom', 'left', 'right']}
            style={styles.subModalContainer}
          >
            <View style={styles.subModalHeader}>
              <Text style={styles.subModalTitle}>Settings</Text>
              <TouchableOpacity onPress={() => setActiveModal('none')}>
                <Ionicons name="close" size={22} color="#666" />
              </TouchableOpacity>
            </View>

            <View style={styles.settingRow}>
              <Text style={styles.settingLabel}>Push Notifications</Text>
              <Switch
                value={pushNotifications}
                onValueChange={setPushNotifications}
                trackColor={{ false: '#DDD', true: accentColor }}
                thumbColor="#FFF"
              />
            </View>

            <View style={styles.settingRow}>
              <Text style={styles.settingLabel}>Daily Email Digest</Text>
              <Switch
                value={emailAlerts}
                onValueChange={setEmailAlerts}
                trackColor={{ false: '#DDD', true: accentColor }}
                thumbColor="#FFF"
              />
            </View>

            <TouchableOpacity
              style={[styles.subModalDoneBtn, { backgroundColor: accentColor }]}
              onPress={() => {
                setActiveModal('none');
                triggerToast('Settings updated successfully!');
              }}
            >
              <Text style={styles.subModalDoneBtnText}>Done</Text>
            </TouchableOpacity>
          </SafeAreaView>
        </View>
      </Modal>

      {/* Sub-modal: Notifications */}
      <Modal
        visible={activeModal === 'notifications'}
        transparent={true}
        animationType="slide"
        statusBarTranslucent={true}
        onRequestClose={() => setActiveModal('none')}
      >
        <View style={styles.subModalOverlay}>
          <SafeAreaView
            edges={['bottom', 'left', 'right']}
            style={styles.subModalContainer}
          >
            <View style={styles.subModalHeader}>
              <Text style={styles.subModalTitle}>
                Notifications Preferences
              </Text>
              <TouchableOpacity onPress={() => setActiveModal('none')}>
                <Ionicons name="close" size={22} color="#666" />
              </TouchableOpacity>
            </View>
            <Text style={styles.subModalSubText}>
              Receive real-time alerts for customer payments, low stock alerts,
              and delivery route status updates.
            </Text>
            <TouchableOpacity
              style={[styles.subModalDoneBtn, { backgroundColor: accentColor }]}
              onPress={() => setActiveModal('none')}
            >
              <Text style={styles.subModalDoneBtnText}>Got it</Text>
            </TouchableOpacity>
          </SafeAreaView>
        </View>
      </Modal>

      {/* Sub-modal: Help & Support */}
      <Modal
        visible={activeModal === 'help'}
        transparent={true}
        animationType="slide"
        statusBarTranslucent={true}
        onRequestClose={() => setActiveModal('none')}
      >
        <View style={styles.subModalOverlay}>
          <SafeAreaView
            edges={['bottom', 'left', 'right']}
            style={styles.subModalContainer}
          >
            <View style={styles.subModalHeader}>
              <Text style={styles.subModalTitle}>Help & Support</Text>
              <TouchableOpacity onPress={() => setActiveModal('none')}>
                <Ionicons name="close" size={22} color="#666" />
              </TouchableOpacity>
            </View>

            <View style={styles.helpItem}>
              <Ionicons name="call-outline" size={20} color={accentColor} />
              <View style={styles.helpTextCol}>
                <Text style={styles.helpTitle}>Helpline</Text>
                <Text style={styles.helpDetail}>
                  +91 98765 43210 (9 AM - 8 PM)
                </Text>
              </View>
            </View>

            <View style={styles.helpItem}>
              <Ionicons name="mail-outline" size={20} color={accentColor} />
              <View style={styles.helpTextCol}>
                <Text style={styles.helpTitle}>Support Email</Text>
                <Text style={styles.helpDetail}>support@chaiflow.in</Text>
              </View>
            </View>

            <TouchableOpacity
              style={[styles.subModalDoneBtn, { backgroundColor: accentColor }]}
              onPress={() => {
                setActiveModal('none');
                triggerToast(
                  'Support request logged. Agent will call back soon!',
                );
              }}
            >
              <Text style={styles.subModalDoneBtnText}>Request Callback</Text>
            </TouchableOpacity>
          </SafeAreaView>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  drawerContainer: {
    width: '100%',
    maxWidth: 285,
    flex: 1,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 18,
    shadowColor: '#000',
    shadowOffset: { width: -3, height: 0 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 10,
    justifyContent: 'space-between',
  },
  toast: {
    position: 'absolute',
    left: 10,
    right: 10,
    borderRadius: 12,
    padding: 10,
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 999,
    elevation: 6,
  },
  toastText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 12,
    marginLeft: 6,
    flex: 1,
  },
  headerSection: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
  },
  avatarWrapper: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  avatarImg: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  avatarFallback: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTextContainer: {
    flex: 1,
    marginLeft: 12,
  },
  userName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#2C201A',
    marginBottom: 4,
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    alignSelf: 'flex-start',
  },
  roleBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
    marginLeft: 4,
  },
  closeBtn: {
    padding: 4,
  },
  divider: {
    height: 1,
    backgroundColor: '#EFECE9',
    marginVertical: 6,
  },
  menuScrollView: {
    flex: 1,
  },
  menuScrollContent: {
    flexGrow: 1,
    paddingVertical: 4,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    marginVertical: 2,
  },
  menuIcon: {
    marginRight: 14,
    width: 24,
  },
  menuText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1F1511',
  },
  footerSection: {
    marginTop: 'auto',
    paddingBottom: 8,
  },
  logoutItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  logoutText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#D9381E',
  },
  subModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'flex-end',
  },
  subModalContainer: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 22,
  },
  subModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  subModalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2C201A',
  },
  subModalSubText: {
    fontSize: 14,
    color: '#7C6E65',
    lineHeight: 20,
    marginBottom: 20,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0ECE8',
  },
  settingLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#2C201A',
  },
  subModalDoneBtn: {
    borderRadius: 20,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
  },
  subModalDoneBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  helpItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0ECE8',
  },
  helpTextCol: {
    marginLeft: 14,
  },
  helpTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#2C201A',
  },
  helpDetail: {
    fontSize: 13,
    color: '#7C6E65',
    marginTop: 2,
  },
  roleSwitchCard: {
    borderRadius: 14,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginVertical: 6,
    borderWidth: 1,
  },
  roleSwitchInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  roleIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  roleSwitchTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  roleSwitchSub: {
    fontSize: 11,
    color: '#7C6E65',
    marginTop: 1,
  },
});
