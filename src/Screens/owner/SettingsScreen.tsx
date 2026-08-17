import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Switch,
  Image,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useNavigation } from '@react-navigation/native';
import Header from '../../components/common/Header';
import { useApp } from '../../context/AppContext';
import { AppToast } from '../../utils/toast';

export default function SettingsScreen() {
  const navigation = useNavigation<any>();
  const { userProfile, userRole } = useApp();

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
});
