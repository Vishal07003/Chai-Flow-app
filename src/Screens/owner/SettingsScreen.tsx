import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Switch,
  Image,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useNavigation } from '@react-navigation/native';
import Header from '../../components/common/Header';
import { TimePickerModal } from '../../components/common';
import { useApp } from '../../context/AppContext';
import { AppToast } from '../../utils/toast';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import orderService, { GlobalRecurringNotificationSetting } from '../../services/order.service';
import { colors, typography, radius, spacing, shadows } from '../../theme';

export default function SettingsScreen() {
  const navigation = useNavigation<any>();
  const { userProfile, userRole, logout } = useApp();
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const isDelivery = userRole === 'DELIVERY_PARTNER';
  const primaryColor = isDelivery ? '#059669' : '#8C331A';

  /* Clean Palette */
  const bgContainer = isDelivery ? '#F8FAF9' : '#FAF8F5';
  const cardBg = '#FFFFFF';
  const iconBg = isDelivery ? '#ECFDF5' : '#F7EFE9';
  const textPrimary = '#111827';
  const textSecondary = '#6B7280';
  const modalBg = '#FFFFFF';
  const modalBorder = '#F3F4F6';

  /* Toggle States */
  const [pushNotifications, setPushNotifications] = useState(true);

  /* Recurring Notification Settings (Phase 2A - Owner only) */
  const [recSettingsLoading, setRecSettingsLoading] = useState(false);
  const [recSettingsSaving, setRecSettingsSaving] = useState(false);
  const [orderGenTime, setOrderGenTime] = useState('06:00:00');
  const [ownerNotifTime, setOwnerNotifTime] = useState('06:05:00');
  const [partnerNotifTime, setPartnerNotifTime] = useState('06:10:00');
  const [ownerNotifEnabled, setOwnerNotifEnabled] = useState(true);
  const [partnerNotifEnabled, setPartnerNotifEnabled] = useState(true);
  const [recTimezone, setRecTimezone] = useState('Asia/Kolkata');
  const [timePickerTarget, setTimePickerTarget] = useState<'gen' | 'owner' | 'partner' | null>(null);

  useEffect(() => {
    if (!isDelivery) {
      loadRecurringSettings();
    }
  }, [isDelivery]);

  const loadRecurringSettings = async () => {
    try {
      setRecSettingsLoading(true);
      const data = await orderService.getGlobalRecurringSettings();
      if (data) {
        setOrderGenTime(data.order_generation_time || '06:00:00');
        setOwnerNotifTime(data.owner_notification_time || '06:05:00');
        setPartnerNotifTime(data.partner_notification_time || '06:10:00');
        setOwnerNotifEnabled(data.owner_notification_enabled ?? true);
        setPartnerNotifEnabled(data.partner_notification_enabled ?? true);
        setRecTimezone(data.timezone || 'Asia/Kolkata');
      }
    } catch (err) {
      // Graceful fallback to initial defaults
      console.log('Failed to fetch recurring settings', err);
    } finally {
      setRecSettingsLoading(false);
    }
  };

  const handleSaveRecurringSettings = async () => {
    // Client-side hierarchy validation
    if (ownerNotifTime < orderGenTime) {
      AppToast.error('Invalid Timing', 'Owner notification time cannot precede order generation time.');
      return;
    }
    if (partnerNotifTime < orderGenTime) {
      AppToast.error('Invalid Timing', 'Delivery partner notification time cannot precede order generation time.');
      return;
    }

    try {
      setRecSettingsSaving(true);
      await orderService.updateGlobalRecurringSettings({
        order_generation_time: orderGenTime,
        owner_notification_time: ownerNotifTime,
        partner_notification_time: partnerNotifTime,
        owner_notification_enabled: ownerNotifEnabled,
        partner_notification_enabled: partnerNotifEnabled,
        timezone: recTimezone,
      });
      AppToast.success('Settings Saved', 'Recurring order notification settings updated successfully.');
    } catch (err: any) {
      const errMsg = err?.response?.data?.owner_notification_time?.[0]
        || err?.response?.data?.partner_notification_time?.[0]
        || err?.message
        || 'Failed to save recurring settings.';
      AppToast.error('Save Failed', errMsg);
    } finally {
      setRecSettingsSaving(false);
    }
  };

  const formatDisplayTime = (timeStr: string) => {
    if (!timeStr) return '--:--';
    const [hStr, mStr] = timeStr.split(':');
    let h = parseInt(hStr || '0', 10);
    const m = mStr || '00';
    const ampm = h >= 12 ? 'PM' : 'AM';
    h = h % 12 === 0 ? 12 : h % 12;
    return `${String(h).padStart(2, '0')}:${m} ${ampm}`;
  };

  /* Modal States */
  const [activeModal, setActiveModal] = useState<
    'none' | 'language' | 'security' | 'help'
  >('none');
  const [selectedLanguage, setSelectedLanguage] = useState('English');

  const handleTogglePush = (value: boolean) => {
    setPushNotifications(value);
    AppToast.info(
      'Push Notifications',
      value ? 'Push notifications enabled.' : 'Push notifications disabled.',
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: bgContainer }]}>
      <Header title="Settings" showBack={true} showNotification={true} />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile Card Header */}
        <TouchableOpacity
          activeOpacity={0.8}
          style={[styles.profileCard, { backgroundColor: cardBg }]}
          onPress={() => navigation.navigate('Profile')}
        >
          <View
            style={[styles.avatarCircle, { backgroundColor: primaryColor }]}
          >
            {userProfile?.avatarUrl ? (
              <Image
                source={{ uri: userProfile.avatarUrl }}
                style={styles.avatarImg}
              />
            ) : (
              <Ionicons name="person" size={24} color="#FFFFFF" />
            )}
          </View>

          <View style={styles.profileInfo}>
            <Text style={[styles.profileName, { color: textPrimary }]}>
              {userProfile?.fullName || 'Arjun Mehta'}
            </Text>
            <Text style={[styles.profileSubtitle, { color: textSecondary }]}>
              Edit profile & business info
            </Text>
          </View>

          <Ionicons name="chevron-forward" size={20} color={textSecondary} />
        </TouchableOpacity>

        {/* PREFERENCES SECTION */}
        <Text style={[styles.sectionHeader, { color: textSecondary }]}>
          PREFERENCES
        </Text>

        {/* Push Notifications Row */}
        <View style={[styles.settingCard, { backgroundColor: cardBg }]}>
          <View style={styles.leftRow}>
            <View style={[styles.iconCircle, { backgroundColor: iconBg }]}>
              <Ionicons
                name="notifications-outline"
                size={20}
                color={primaryColor}
              />
            </View>
            <Text style={[styles.settingTitle, { color: textPrimary }]}>
              Push notifications
            </Text>
          </View>
          <Switch
            value={pushNotifications}
            onValueChange={handleTogglePush}
            trackColor={{ false: '#4B5563', true: primaryColor }}
            thumbColor="#FFFFFF"
          />
        </View>

        {/* RECURRING ORDER NOTIFICATION SETTINGS (OWNER ONLY) */}
        {!isDelivery && (
          <View style={styles.recurringSettingsSection}>
            <View style={styles.recSectionHeaderRow}>
              <View>
                <Text style={[styles.sectionHeader, { color: textSecondary, marginBottom: 2 }]}>
                  RECURRING ORDER NOTIFICATIONS
                </Text>
                <Text style={styles.recSectionSub}>
                  Default generation schedule & dispatch alerts ({recTimezone})
                </Text>
              </View>
              {recSettingsLoading && (
                <ActivityIndicator size="small" color="#8C331A" />
              )}
            </View>

            {/* Timings Card */}
            <View style={[styles.recCard, { backgroundColor: cardBg }]}>
              {/* Generation Time */}
              <TouchableOpacity
                style={styles.recTimingRow}
                onPress={() => setTimePickerTarget('gen')}
                activeOpacity={0.7}
              >
                <View style={styles.recTimingLeft}>
                  <View style={[styles.recIconWrap, { backgroundColor: '#FDF4F2' }]}>
                    <Ionicons name="time-outline" size={18} color="#8C331A" />
                  </View>
                  <View>
                    <Text style={styles.recTimingLabel}>Order Generation Time</Text>
                    <Text style={styles.recTimingHelp}>Daily cutoff time to generate pending orders</Text>
                  </View>
                </View>
                <View style={styles.recTimingBadge}>
                  <Text style={styles.recTimingValue}>{formatDisplayTime(orderGenTime)}</Text>
                  <Ionicons name="pencil" size={13} color="#8C331A" style={{ marginLeft: 4 }} />
                </View>
              </TouchableOpacity>

              {/* Owner Notification Time */}
              <TouchableOpacity
                style={styles.recTimingRow}
                onPress={() => setTimePickerTarget('owner')}
                activeOpacity={0.7}
              >
                <View style={styles.recTimingLeft}>
                  <View style={[styles.recIconWrap, { backgroundColor: '#F0FDF4' }]}>
                    <Ionicons name="notifications-outline" size={18} color="#059669" />
                  </View>
                  <View>
                    <Text style={styles.recTimingLabel}>Owner Notification Time</Text>
                    <Text style={styles.recTimingHelp}>Daily summary alert to review batches</Text>
                  </View>
                </View>
                <View style={styles.recTimingBadge}>
                  <Text style={styles.recTimingValue}>{formatDisplayTime(ownerNotifTime)}</Text>
                  <Ionicons name="pencil" size={13} color="#8C331A" style={{ marginLeft: 4 }} />
                </View>
              </TouchableOpacity>

              {/* Partner Notification Time */}
              <TouchableOpacity
                style={[styles.recTimingRow, { borderBottomWidth: 0 }]}
                onPress={() => setTimePickerTarget('partner')}
                activeOpacity={0.7}
              >
                <View style={styles.recTimingLeft}>
                  <View style={[styles.recIconWrap, { backgroundColor: '#EFF6FF' }]}>
                    <Ionicons name="bicycle-outline" size={18} color="#2563EB" />
                  </View>
                  <View>
                    <Text style={styles.recTimingLabel}>Partner Notification Time</Text>
                    <Text style={styles.recTimingHelp}>Daily dispatch alert for assigned drivers</Text>
                  </View>
                </View>
                <View style={styles.recTimingBadge}>
                  <Text style={styles.recTimingValue}>{formatDisplayTime(partnerNotifTime)}</Text>
                  <Ionicons name="pencil" size={13} color="#8C331A" style={{ marginLeft: 4 }} />
                </View>
              </TouchableOpacity>
            </View>

            {/* Toggle Switches Card */}
            <View style={[styles.recCard, { backgroundColor: cardBg, marginTop: 10 }]}>
              {/* Owner Notification Toggle */}
              <View style={styles.recSwitchRow}>
                <View style={{ flex: 1, marginRight: 10 }}>
                  <Text style={styles.recSwitchLabel}>Owner Notification Enabled</Text>
                  <Text style={styles.recSwitchDesc}>Receive automated daily notification alerts</Text>
                </View>
                <Switch
                  value={ownerNotifEnabled}
                  onValueChange={setOwnerNotifEnabled}
                  trackColor={{ false: '#E5E7EB', true: '#8C331A' }}
                  thumbColor="#FFFFFF"
                />
              </View>

              {/* Partner Notification Toggle */}
              <View style={[styles.recSwitchRow, { borderTopWidth: 1, borderTopColor: '#F3EFEA' }]}>
                <View style={{ flex: 1, marginRight: 10 }}>
                  <Text style={styles.recSwitchLabel}>Delivery Partner Notification Enabled</Text>
                  <Text style={styles.recSwitchDesc}>Notify assigned partners when daily orders dispatch</Text>
                </View>
                <Switch
                  value={partnerNotifEnabled}
                  onValueChange={setPartnerNotifEnabled}
                  trackColor={{ false: '#E5E7EB', true: '#8C331A' }}
                  thumbColor="#FFFFFF"
                />
              </View>
            </View>

            {/* Save Button */}
            <TouchableOpacity
              style={[styles.recSaveBtn, recSettingsSaving && { opacity: 0.7 }]}
              onPress={handleSaveRecurringSettings}
              disabled={recSettingsSaving}
              activeOpacity={0.8}
            >
              {recSettingsSaving ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Ionicons name="save-outline" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
                  <Text style={styles.recSaveBtnText}>Save Notification Settings</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        )}

        {/* MORE SECTION */}
        <Text
          style={[
            styles.sectionHeader,
            { color: textSecondary, marginTop: 12 },
          ]}
        >
          MORE
        </Text>

        {/* Language Row */}
        <TouchableOpacity
          activeOpacity={0.7}
          style={[styles.settingCard, { backgroundColor: cardBg }]}
          onPress={() => setActiveModal('language')}
        >
          <View style={styles.leftRow}>
            <View style={[styles.iconCircle, { backgroundColor: iconBg }]}>
              <Ionicons
                name="globe-outline"
                size={20}
                color={primaryColor}
              />
            </View>
            <Text style={[styles.settingTitle, { color: textPrimary }]}>
              Language
            </Text>
          </View>
          <View style={styles.rightRow}>
            <Text style={[styles.valueText, { color: textSecondary }]}>
              {selectedLanguage}
            </Text>
            <Ionicons name="chevron-forward" size={18} color={textSecondary} />
          </View>
        </TouchableOpacity>

        {/* Security & PIN Row */}
        <TouchableOpacity
          activeOpacity={0.7}
          style={[styles.settingCard, { backgroundColor: cardBg }]}
          onPress={() => setActiveModal('security')}
        >
          <View style={styles.leftRow}>
            <View style={[styles.iconCircle, { backgroundColor: iconBg }]}>
              <Ionicons
                name="shield-outline"
                size={20}
                color={primaryColor}
              />
            </View>
            <Text style={[styles.settingTitle, { color: textPrimary }]}>
              Security & PIN
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={textSecondary} />
        </TouchableOpacity>

        {/* Billing & Invoices Row */}
        <TouchableOpacity
          activeOpacity={0.7}
          style={[styles.settingCard, { backgroundColor: cardBg }]}
          onPress={() =>
            navigation.navigate(isDelivery ? 'Reports' : 'Invoices')
          }
        >
          <View style={styles.leftRow}>
            <View style={[styles.iconCircle, { backgroundColor: iconBg }]}>
              <Ionicons
                name="document-text-outline"
                size={20}
                color={primaryColor}
              />
            </View>
            <Text style={[styles.settingTitle, { color: textPrimary }]}>
              Billing & invoices
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={textSecondary} />
        </TouchableOpacity>

        {/* Help & Support Row */}
        <TouchableOpacity
          activeOpacity={0.7}
          style={[styles.settingCard, { backgroundColor: cardBg }]}
          onPress={() => setActiveModal('help')}
        >
          <View style={styles.leftRow}>
            <View style={[styles.iconCircle, { backgroundColor: iconBg }]}>
              <Ionicons
                name="help-circle-outline"
                size={20}
                color={primaryColor}
              />
            </View>
            <Text style={[styles.settingTitle, { color: textPrimary }]}>
              Help & support
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={textSecondary} />
        </TouchableOpacity>

        {/* Logout Row */}
        <TouchableOpacity
          activeOpacity={0.7}
          style={[styles.settingCard, { backgroundColor: cardBg, marginTop: 8 }]}
          onPress={() => setShowLogoutConfirm(true)}
        >
          <View style={styles.leftRow}>
            <View style={[styles.iconCircle, { backgroundColor: '#FEF2F2' }]}>
              <Ionicons
                name="log-out-outline"
                size={20}
                color="#DC2626"
              />
            </View>
            <Text style={[styles.settingTitle, { color: '#DC2626', fontWeight: '700' }]}>
              Log out
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color="#DC2626" />
        </TouchableOpacity>
      </ScrollView>

      {/* Language Selector Modal */}
      <Modal
        visible={activeModal === 'language'}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setActiveModal('none')}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: modalBg }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: textPrimary }]}>
                Select Language
              </Text>
              <TouchableOpacity onPress={() => setActiveModal('none')}>
                <Ionicons name="close" size={22} color={textSecondary} />
              </TouchableOpacity>
            </View>

            {[
              'English',
              'Hindi (हिंदी)',
              'Gujarati (ગુજરાતી)',
              'Marathi (मराठी)',
            ].map(lang => (
              <TouchableOpacity
                key={lang}
                style={[
                  styles.optionRow,
                  selectedLanguage.startsWith(lang.split(' ')[0]) && {
                    backgroundColor: iconBg,
                  },
                ]}
                onPress={() => {
                  setSelectedLanguage(lang.split(' ')[0]);
                  setActiveModal('none');
                  AppToast.success(
                    'Language Changed',
                    `App language set to ${lang}`,
                  );
                }}
              >
                <Text style={[styles.optionText, { color: textPrimary }]}>
                  {lang}
                </Text>
                {selectedLanguage.startsWith(lang.split(' ')[0]) && (
                  <Ionicons name="checkmark" size={20} color={primaryColor} />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </Modal>

      {/* Security & PIN Modal */}
      <Modal
        visible={activeModal === 'security'}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setActiveModal('none')}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: modalBg }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: textPrimary }]}>
                Security & App Lock
              </Text>
              <TouchableOpacity onPress={() => setActiveModal('none')}>
                <Ionicons name="close" size={22} color={textSecondary} />
              </TouchableOpacity>
            </View>

            <Text style={[styles.modalSub, { color: textSecondary }]}>
              Protect your business data and billing records with biometric or
              PIN lock.
            </Text>

            <View style={styles.securityOptionRow}>
              <View>
                <Text style={[styles.securityTitle, { color: textPrimary }]}>
                  App PIN Protection
                </Text>
                <Text style={[styles.securityDesc, { color: textSecondary }]}>
                  Prompt PIN when opening app
                </Text>
              </View>
              <Switch
                value={true}
                onValueChange={() => {}}
                trackColor={{ false: '#4B5563', true: primaryColor }}
                thumbColor="#FFFFFF"
              />
            </View>

            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: primaryColor }]}
              onPress={() => {
                setActiveModal('none');
                AppToast.success(
                  'Security Updated',
                  'App PIN lock preferences saved.',
                );
              }}
            >
              <Text style={styles.actionBtnText}>Save Preferences</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Help & Support Modal */}
      <Modal
        visible={activeModal === 'help'}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setActiveModal('none')}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: modalBg }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: textPrimary }]}>
                Help & Support
              </Text>
              <TouchableOpacity onPress={() => setActiveModal('none')}>
                <Ionicons name="close" size={22} color={textSecondary} />
              </TouchableOpacity>
            </View>

            <View style={[styles.helpItem, { borderBottomColor: modalBorder }]}>
              <Ionicons name="call-outline" size={22} color={primaryColor} />
              <View style={{ marginLeft: 12 }}>
                <Text style={[styles.helpTitle, { color: textPrimary }]}>
                  Customer Support
                </Text>
                <Text style={[styles.helpDetail, { color: textSecondary }]}>
                  +91 98765 43210 (9 AM - 8 PM)
                </Text>
              </View>
            </View>

            <View style={[styles.helpItem, { borderBottomColor: modalBorder }]}>
              <Ionicons name="mail-outline" size={22} color={primaryColor} />
              <View style={{ marginLeft: 12 }}>
                <Text style={[styles.helpTitle, { color: textPrimary }]}>
                  Email Desk
                </Text>
                <Text style={[styles.helpDetail, { color: textSecondary }]}>
                  support@chaiflow.in
                </Text>
              </View>
            </View>

            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: primaryColor }]}
              onPress={() => {
                setActiveModal('none');
                AppToast.info(
                  'Callback Scheduled',
                  'A support executive will contact you.',
                );
              }}
            >
              <Text style={styles.actionBtnText}>Request Callback</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Time Picker Modal for Recurring Order Notification Settings */}
      <TimePickerModal
        visible={timePickerTarget !== null}
        title={
          timePickerTarget === 'gen'
            ? 'Order Generation Time'
            : timePickerTarget === 'owner'
            ? 'Owner Notification Time'
            : 'Partner Notification Time'
        }
        initialTime={
          timePickerTarget === 'gen'
            ? orderGenTime
            : timePickerTarget === 'owner'
            ? ownerNotifTime
            : partnerNotifTime
        }
        onClose={() => setTimePickerTarget(null)}
        onSelectTime={(selectedTime) => {
          if (timePickerTarget === 'gen') setOrderGenTime(selectedTime);
          else if (timePickerTarget === 'owner') setOwnerNotifTime(selectedTime);
          else if (timePickerTarget === 'partner') setPartnerNotifTime(selectedTime);
        }}
      />

      {/* Logout Confirmation Dialog */}
      <ConfirmDialog
        visible={showLogoutConfirm}
        title="Confirm Logout"
        description="Are you sure you want to logout from your account?"
        confirmLabel="Logout"
        cancelLabel="Cancel"
        type="danger"
        icon="log-out-outline"
        onConfirm={async () => {
          setShowLogoutConfirm(false);
          await logout();
        }}
        onCancel={() => setShowLogoutConfirm(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 40,
  },
  profileCard: {
    borderRadius: 20,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
  },
  avatarCircle: {
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
  profileInfo: {
    flex: 1,
    marginLeft: 14,
  },
  profileName: {
    fontSize: 17,
    fontWeight: '700',
  },
  profileSubtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  sectionHeader: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.2,
    marginBottom: 10,
    marginLeft: 4,
  },
  settingCard: {
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
  },
  leftRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  settingTitle: {
    fontSize: 15,
    fontWeight: '600',
  },
  rightRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  valueText: {
    fontSize: 14,
    marginRight: 6,
    fontWeight: '500',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    borderRadius: 24,
    padding: 20,
    width: '100%',
    maxWidth: 340,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
  },
  modalSub: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 16,
  },
  optionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    marginBottom: 6,
  },
  optionText: {
    fontSize: 15,
    fontWeight: '600',
  },
  securityOptionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    marginBottom: 16,
  },
  securityTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  securityDesc: {
    fontSize: 12,
    marginTop: 2,
  },
  helpItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  helpTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  helpDetail: {
    fontSize: 13,
    marginTop: 2,
  },
  actionBtn: {
    borderRadius: 14,
    height: 46,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
  },
  actionBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  // Phase 2A: Recurring Notification Settings Styles
  recurringSettingsSection: {
    marginTop: 6,
    marginBottom: 16,
  },
  recSectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    marginLeft: 4,
  },
  recSectionSub: {
    fontSize: 11,
    color: '#8E8278',
    marginTop: 2,
  },
  recCard: {
    borderRadius: 18,
    padding: 14,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
  },
  recTimingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: '#F3EFEA',
  },
  recTimingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 10,
  },
  recIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  recTimingLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#2A2421',
  },
  recTimingHelp: {
    fontSize: 11,
    color: '#8E8278',
    marginTop: 2,
  },
  recTimingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FAF8F5',
    borderWidth: 1,
    borderColor: '#EFEAE4',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  recTimingValue: {
    fontSize: 13,
    fontWeight: '700',
    color: '#8C331A',
  },
  recSwitchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
  },
  recSwitchLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#2A2421',
  },
  recSwitchDesc: {
    fontSize: 11,
    color: '#8E8278',
    marginTop: 2,
  },
  recSaveBtn: {
    flexDirection: 'row',
    backgroundColor: '#8C331A',
    borderRadius: 14,
    height: 46,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 12,
    elevation: 2,
    shadowColor: '#8C331A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
  },
  recSaveBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
});
