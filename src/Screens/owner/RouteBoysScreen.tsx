import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Image,
  Linking,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';
import Header from '../../components/common/Header';
import { useApp, DeliveryBoyItem } from '../../context/AppContext';

export default function RouteBoysScreen({ navigation }: any) {
  const { deliveryBoys, assignOrderToBoy, schedules } = useApp();

  /* Modal state for Viewing Boy Route Details */
  const [selectedBoyForRoute, setSelectedBoyForRoute] = useState<DeliveryBoyItem | null>(null);

  const handleCall = (phone?: string) => {
    const num = phone || '+91 98765 43210';
    Linking.openURL(`tel:${num}`);
  };

  const handleMessage = (phone?: string, name?: string) => {
    const num = phone || '+91 98765 43210';
    const text = encodeURIComponent(
      `Hi ${name || 'Partner'}, regarding your assigned ChaiFlow route:`,
    );
    Linking.openURL(`whatsapp://send?phone=${num}&text=${text}`).catch(() => {
      Linking.openURL(`sms:${num}?body=${text}`);
    });
  };

  /* Mock Route Stops for Selected Partner */
  const mockStopsForBoy = (boyName: string) => [
    {
      seq: 1,
      customer: 'Rajesh Kumar (Chai Point)',
      address: 'Flat 402, Green Valley Apartments, Sector 14',
      items: '2x Masala Chai Premix 1kg, 1x Assam Tea 500g',
      amount: 1240,
      mode: 'COD',
      status: 'IN PROGRESS',
      timeSlot: '09:00 AM - 10:30 AM',
    },
    {
      seq: 2,
      customer: 'Anil Tea Corner',
      address: 'Shop 12, Main Market, Connaught Place',
      items: '4x Cardamom Tea Bags (100s)',
      amount: 850,
      mode: 'UPI',
      status: 'UPCOMING',
      timeSlot: '11:00 AM - 12:15 PM',
    },
    {
      seq: 3,
      customer: 'Hotel Royal Inn Cafe',
      address: 'Plot 88, Kirti Nagar Industrial Area',
      items: '5x Commercial Premix Pack 5kg',
      amount: 3450,
      mode: 'PAID',
      status: 'UPCOMING',
      timeSlot: '01:30 PM - 02:30 PM',
    },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <Header title="Delivery Fleet Members" showBack={true} />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.topInfoRow}>
          <Text style={styles.totalCountText}>
            Showing {deliveryBoys.length} Registered Partners
          </Text>

          <TouchableOpacity
            style={styles.addBtnSmall}
            onPress={() => navigation.navigate('AddDeliveryBoy')}
          >
            <Ionicons name="person-add" size={14} color="#FFF" />
            <Text style={styles.addBtnText}>Add Partner</Text>
          </TouchableOpacity>
        </View>

        {deliveryBoys.map(boy => {
          const isBusy = boy.status === 'BUSY';
          const isReady = boy.status === 'READY';
          return (
            <TouchableOpacity
              key={boy.id}
              activeOpacity={0.9}
              style={styles.boyCard}
              onPress={() => setSelectedBoyForRoute(boy)}
            >
              <View style={styles.cardHeader}>
                <Image
                  source={{
                    uri:
                      boy.avatarUrl ||
                      `https://ui-avatars.com/api/?name=${encodeURIComponent(
                        boy.name,
                      )}&background=059669&color=FFF`,
                  }}
                  style={styles.avatar}
                />

                <View style={styles.infoCol}>
                  <Text style={styles.boyName}>{boy.name}</Text>
                  {boy.numberPlate && (
                    <View style={styles.plateRow}>
                      <Ionicons name="bicycle" size={12} color="#059669" />
                      <Text style={styles.plateText}>
                        {boy.vehicleModel || boy.vehicleType || 'Scooter'} · {boy.numberPlate}
                      </Text>
                    </View>
                  )}
                  <Text style={styles.locationText}>📍 {boy.location}</Text>
                </View>

                <View
                  style={[
                    styles.statusBadge,
                    isReady
                      ? styles.statusReady
                      : isBusy
                      ? styles.statusBusy
                      : styles.statusOffline,
                  ]}
                >
                  <Text
                    style={[
                      styles.statusText,
                      isReady
                        ? styles.textReady
                        : isBusy
                        ? styles.textBusy
                        : styles.textOffline,
                    ]}
                  >
                    {boy.status}
                  </Text>
                </View>
              </View>

              {/* View Route Bar */}
              <View style={styles.viewRouteBar}>
                <Ionicons name="map-outline" size={14} color="#059669" />
                <Text style={styles.viewRouteBarText}>
                  View Assigned Route & 3 Delivery Stops
                </Text>
                <Ionicons name="chevron-forward" size={14} color="#059669" />
              </View>

              {/* Action Buttons Row */}
              <View style={styles.cardActions}>
                <TouchableOpacity
                  style={styles.actionBtnCall}
                  onPress={() => handleCall(boy.phone)}
                >
                  <Ionicons name="call" size={14} color="#059669" />
                  <Text style={styles.actionTextCall}>Call</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.actionBtnMsg}
                  onPress={() => handleMessage(boy.phone, boy.name)}
                >
                  <Ionicons name="logo-whatsapp" size={14} color="#25D366" />
                  <Text style={styles.actionTextMsg}>WhatsApp</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.actionBtnAssign}
                  onPress={() => {
                    assignOrderToBoy(boy.id);
                    navigation.goBack();
                  }}
                >
                  <Text style={styles.actionTextAssign}>Assign Order</Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Partner Route & Delivery Details Modal */}
      {selectedBoyForRoute && (
        <Modal
          visible={!!selectedBoyForRoute}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setSelectedBoyForRoute(null)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              {/* Header */}
              <View style={styles.modalHeader}>
                <View style={styles.modalHeaderTitleRow}>
                  <Ionicons name="map" size={20} color="#059669" />
                  <Text style={styles.modalTitle}>Delivery Route & Stops</Text>
                </View>
                <TouchableOpacity onPress={() => setSelectedBoyForRoute(null)}>
                  <Ionicons name="close-circle" size={24} color="#9CA3AF" />
                </TouchableOpacity>
              </View>

              {/* Partner Overview Banner */}
              <View style={styles.partnerBanner}>
                <Image
                  source={{
                    uri:
                      selectedBoyForRoute.avatarUrl ||
                      `https://ui-avatars.com/api/?name=${encodeURIComponent(
                        selectedBoyForRoute.name,
                      )}&background=059669&color=FFF`,
                  }}
                  style={styles.modalAvatar}
                />
                <View style={{ flex: 1 }}>
                  <Text style={styles.modalPartnerName}>{selectedBoyForRoute.name}</Text>
                  <Text style={styles.modalPartnerSub}>
                    {selectedBoyForRoute.vehicleModel || 'Honda Activa 6G'} · {selectedBoyForRoute.numberPlate || 'DL 01 AB 7890'}
                  </Text>
                  <Text style={styles.modalRouteName}>
                    📍 Route: {selectedBoyForRoute.location}
                  </Text>
                </View>

                <TouchableOpacity
                  style={styles.modalCallBtn}
                  onPress={() => handleCall(selectedBoyForRoute.phone)}
                >
                  <Ionicons name="call" size={16} color="#FFF" />
                </TouchableOpacity>
              </View>

              {/* Route Sequence Stops Header */}
              <Text style={styles.stopsHeaderTitle}>Active Route Stops (3 Total)</Text>

              {/* Stops List */}
              <ScrollView style={{ maxHeight: 320 }} showsVerticalScrollIndicator={false}>
                {mockStopsForBoy(selectedBoyForRoute.name).map(stop => (
                  <View key={stop.seq} style={styles.modalStopCard}>
                    <View style={styles.modalStopSeq}>
                      <Text style={styles.modalStopSeqText}>#{stop.seq}</Text>
                    </View>

                    <View style={{ flex: 1 }}>
                      <View style={styles.stopTopRow}>
                        <Text style={styles.stopCustName}>{stop.customer}</Text>
                        <Text style={styles.stopStatusTag}>{stop.status}</Text>
                      </View>

                      <Text style={styles.stopAddressText}>{stop.address}</Text>

                      <View style={styles.stopItemBox}>
                        <Ionicons name="cube-outline" size={12} color="#059669" />
                        <Text style={styles.stopItemText}>{stop.items}</Text>
                      </View>

                      <View style={styles.stopFooterRow}>
                        <Text style={styles.stopAmountText}>
                          Collectible: ₹{stop.amount.toLocaleString()} ({stop.mode})
                        </Text>
                        <Text style={styles.stopTimeText}>⏰ {stop.timeSlot}</Text>
                      </View>
                    </View>
                  </View>
                ))}
              </ScrollView>

              {/* Close / Assign Actions */}
              <View style={styles.modalFooterRow}>
                <TouchableOpacity
                  style={styles.assignRouteBtnModal}
                  onPress={() => {
                    assignOrderToBoy(selectedBoyForRoute.id);
                    setSelectedBoyForRoute(null);
                    navigation.goBack();
                  }}
                >
                  <Ionicons name="checkmark-done-circle" size={18} color="#FFF" style={{ marginRight: 6 }} />
                  <Text style={styles.assignRouteBtnText}>Assign Order To {selectedBoyForRoute.name.split(' ')[0]}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAF8F5',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 32,
  },
  topInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  totalCountText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#6B7280',
  },
  addBtnSmall: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#059669',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  addBtnText: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: '800',
    marginLeft: 4,
  },
  boyCard: {
    backgroundColor: '#FFF',
    borderRadius: 18,
    padding: 14,
    marginBottom: 14,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 5,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 12,
  },
  infoCol: {
    flex: 1,
  },
  boyName: {
    fontSize: 15,
    fontWeight: '800',
    color: '#111827',
  },
  plateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  plateText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#059669',
    marginLeft: 4,
  },
  locationText: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  statusReady: {
    backgroundColor: '#D1FAE5',
  },
  statusBusy: {
    backgroundColor: '#DBEAFE',
  },
  statusOffline: {
    backgroundColor: '#F3F4F6',
  },
  statusText: {
    fontSize: 10,
    fontWeight: '800',
  },
  textReady: {
    color: '#059669',
  },
  textBusy: {
    color: '#2563EB',
  },
  textOffline: {
    color: '#6B7280',
  },
  viewRouteBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#ECFDF5',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginTop: 10,
  },
  viewRouteBarText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#059669',
    flex: 1,
    marginLeft: 6,
  },
  cardActions: {
    flexDirection: 'row',
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  actionBtnCall: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    marginRight: 6,
  },
  actionTextCall: {
    fontSize: 11,
    fontWeight: '700',
    color: '#059669',
    marginLeft: 4,
  },
  actionBtnMsg: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    marginRight: 6,
  },
  actionTextMsg: {
    fontSize: 11,
    fontWeight: '700',
    color: '#15803D',
    marginLeft: 4,
  },
  actionBtnAssign: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#059669',
    borderRadius: 10,
  },
  actionTextAssign: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FFF',
  },

  /* Modal */
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  modalHeaderTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#111827',
    marginLeft: 8,
  },
  partnerBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    borderRadius: 18,
    padding: 14,
    marginBottom: 16,
  },
  modalAvatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    marginRight: 12,
  },
  modalPartnerName: {
    fontSize: 15,
    fontWeight: '800',
    color: '#065F46',
  },
  modalPartnerSub: {
    fontSize: 11,
    color: '#047857',
    marginTop: 1,
  },
  modalRouteName: {
    fontSize: 11,
    fontWeight: '700',
    color: '#059669',
    marginTop: 2,
  },
  modalCallBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#059669',
    justifyContent: 'center',
    alignItems: 'center',
  },
  stopsHeaderTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#374151',
    marginBottom: 10,
    letterSpacing: 0.3,
  },
  modalStopCard: {
    flexDirection: 'row',
    backgroundColor: '#F9FAFB',
    borderRadius: 14,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  modalStopSeq: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#059669',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  modalStopSeqText: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: '900',
  },
  stopTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  stopCustName: {
    fontSize: 13,
    fontWeight: '800',
    color: '#111827',
  },
  stopStatusTag: {
    fontSize: 9,
    fontWeight: '800',
    color: '#2563EB',
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  stopAddressText: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 2,
  },
  stopItemBox: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  stopItemText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#059669',
    marginLeft: 4,
  },
  stopFooterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 6,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  stopAmountText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#111827',
  },
  stopTimeText: {
    fontSize: 10,
    color: '#6B7280',
  },
  modalFooterRow: {
    marginTop: 14,
  },
  assignRouteBtnModal: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#059669',
    borderRadius: 16,
    height: 48,
  },
  assignRouteBtnText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '800',
  },
});
