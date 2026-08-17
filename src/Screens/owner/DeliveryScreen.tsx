import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useNavigation } from '@react-navigation/native';

import Header from '../../components/common/Header';
import SummaryCard from '../../components/delivery/SummaryCard';
import FleetMap from '../../components/delivery/FleetMap';
import DeliveryBoyCard from '../../components/delivery/DeliveryBoyCard';
import DeliveryBoyDetailModal from '../../components/delivery/DeliveryBoyDetailModal';
import FloatingButton from '../../components/common/FloatingButton';
import { useApp, DeliveryBoyItem } from '../../context/AppContext';

export default function DeliveryScreen() {
  const navigation = useNavigation<any>();
  const {
    deliveryBoys,
    activeBoysCount,
    totalBoysCount,
    inTransitOrdersCount,
    assignOrderToBoy,
    deleteDeliveryBoy,
  } = useApp();

  const [selectedBoy, setSelectedBoy] = useState<DeliveryBoyItem | null>(null);
  const [isDetailModalVisible, setIsDetailModalVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 2500);
  };

  const handleOpenDetailModal = (boy: DeliveryBoyItem) => {
    setSelectedBoy(boy);
    setIsDetailModalVisible(true);
  };

  const handleDeleteBoy = (boy: DeliveryBoyItem) => {
    deleteDeliveryBoy(boy.id);
    triggerToast(`Partner ${boy.name} removed from fleet.`);
  };

  const handleMessage = (boy: any) => {
    const phone = boy.phone || '+919876543210';
    const text = encodeURIComponent(`Hi ${boy.name}, regarding ChaiFlow delivery run:`);
    Linking.openURL(`whatsapp://send?phone=${phone}&text=${text}`).catch(() => {
      Linking.openURL(`sms:${phone}?body=${text}`);
    });
  };

  const handleCall = (boy: any) => {
    const phone = boy.phone || '+919876543210';
    Linking.openURL(`tel:${phone}`);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      {/* Fixed Top Header */}
      <Header title="Delivery Boys" />

      {toastMessage !== '' && (
        <View style={styles.toast}>
          <Ionicons name="information-circle-outline" size={20} color="#FFFFFF" />
          <Text style={styles.toastText}>{toastMessage}</Text>
        </View>
      )}

      <KeyboardAwareScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        enableOnAndroid={true}
      >
        {/* Top Summary Row */}
        <View style={styles.summaryRow}>
          <SummaryCard
            title="Active Fleet"
            value={`${activeBoysCount} / ${totalBoysCount}`}
            icon="ellipse"
            color="#3B82F6"
          />

          <SummaryCard
            title="In Transit"
            value={`${inTransitOrdersCount} orders`}
            icon="bus-outline"
            color="#3B4863"
            isFilled={true}
          />
        </View>

        {/* Live Fleet Map View */}
        <FleetMap />

        {/* Team Members Header */}
        <View style={styles.teamHeaderRow}>
          <Text style={styles.teamTitle}>Delivery Fleet Members</Text>

          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => navigation.navigate('AddDeliveryBoy')}
            style={styles.addMemberBtn}
          >
            <Ionicons name="add-circle" size={16} color="#8C331A" />
            <Text style={styles.addMemberText}>Register Partner</Text>
          </TouchableOpacity>
        </View>

        {/* List of Delivery Boys */}
        {deliveryBoys.map(boy => (
          <DeliveryBoyCard
            key={boy.id}
            boy={boy}
            onPress={handleOpenDetailModal}
            onMore={handleOpenDetailModal}
            onDelete={handleDeleteBoy}
            onMessage={handleMessage}
            onCall={handleCall}
            onAssignOrder={() => assignOrderToBoy(boy.id)}
          />
        ))}
      </KeyboardAwareScrollView>

      {/* Detail & Edit Modal */}
      <DeliveryBoyDetailModal
        visible={isDetailModalVisible}
        boy={selectedBoy}
        onClose={() => setIsDetailModalVisible(false)}
      />

      {/* Floating Add Partner Action Button */}
      <FloatingButton
        iconName="person-add"
        onPress={() => navigation.navigate('AddDeliveryBoy')}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAF8F5',
  },
  toast: {
    position: 'absolute',
    top: 50,
    left: 20,
    right: 20,
    backgroundColor: '#8C331A',
    borderRadius: 14,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 999,
    elevation: 6,
  },
  toastText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
    marginLeft: 8,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 16,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  teamHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 18,
    marginBottom: 14,
  },
  teamTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2C201A',
  },
  addMemberBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FDEEEB',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
  },
  addMemberText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#8C331A',
    marginLeft: 4,
  },
});
