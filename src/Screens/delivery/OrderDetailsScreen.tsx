import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Linking,
  ActivityIndicator,
  Modal,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';
import DeliveryHeader from '../../components/delivery/DeliveryHeader';
import deliveryService, { BackendDelivery } from '../../services/delivery.service';
import locationTrackingService from '../../services/location.service';

export default function OrderDetailsScreen({ route, navigation }: any) {
  const deliveryParam: BackendDelivery | undefined = route.params?.delivery;
  const deliveryIdParam: number | string | undefined =
    route.params?.deliveryId || deliveryParam?.id || route.params?.order?.id;

  const [delivery, setDelivery] = useState<BackendDelivery | null>(deliveryParam || null);
  const [loading, setLoading] = useState<boolean>(!deliveryParam && !!deliveryIdParam);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [isConfirmModalVisible, setIsConfirmModalVisible] = useState(false);

  const fetchDeliveryDetail = useCallback(async () => {
    if (!deliveryIdParam) {
      setError('No delivery ID provided.');
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      setError(null);
      const data = await deliveryService.getDeliveryById(deliveryIdParam);
      setDelivery(data);
    } catch (err: any) {
      console.log('Failed to fetch delivery details:', err);
      // If direct single delivery fails or is offline, keep param if available
      if (!deliveryParam) {
        setError(err?.message || 'Unable to load delivery details.');
      }
    } finally {
      setLoading(false);
    }
  }, [deliveryIdParam, deliveryParam]);

  useEffect(() => {
    if (deliveryIdParam) {
      fetchDeliveryDetail();
    }
  }, [deliveryIdParam, fetchDeliveryDetail]);

  const orderDetails = delivery?.order_details;
  const customerName =
    orderDetails?.company_name || orderDetails?.customer_name || 'Counter Order';
  const phone = orderDetails?.customer_phone || '';
  const address = orderDetails?.delivery_address || 'Shop delivery';
  const items = orderDetails?.items || [];
  const status = delivery?.status || 'assigned';
  const isDelivered = status === 'delivered';
  const isFailed = status === 'failed';

  const handleCall = () => {
    if (phone) {
      Linking.openURL(`tel:${phone}`).catch(() => {
        Alert.alert('Error', 'Unable to initiate call.');
      });
    } else {
      Alert.alert('No Phone', 'No contact phone number provided for this customer.');
    }
  };

  const handleNavigate = () => {
    if (!address) {
      Alert.alert('No Address', 'No destination address available.');
      return;
    }
    const query = encodeURIComponent(address);
    Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${query}`).catch(() => {
      Alert.alert('Error', 'Unable to open maps application.');
    });
  };

  const handleMarkDelivered = async () => {
    if (!delivery || isSubmitting || isDelivered) return;
    try {
      setIsSubmitting(true);
      await deliveryService.updateStatus(delivery.id, 'delivered');
      locationTrackingService.stopTracking();

      setDelivery(prev => (prev ? { ...prev, status: 'delivered' } : prev));
      setToastMessage('Order Delivered Successfully! 🎉');

      setTimeout(() => {
        navigation.goBack();
      }, 1500);
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to update delivery status.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Top Banner Toast Message */}
      {toastMessage ? (
        <View style={styles.topToastContainer}>
          <Ionicons
            name="checkmark-circle"
            size={22}
            color="#FFFFFF"
            style={{ marginRight: 8 }}
          />
          <Text style={styles.topToastText}>{toastMessage}</Text>
        </View>
      ) : null}

      <DeliveryHeader title="Delivery Details" showBack={true} />

      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#059669" />
          <Text style={styles.loadingText}>Loading delivery details...</Text>
        </View>
      ) : error && !delivery ? (
        <View style={styles.centerContainer}>
          <Ionicons name="alert-circle-outline" size={48} color="#EF4444" />
          <Text style={styles.errorTitle}>Delivery Not Found</Text>
          <Text style={styles.errorSub}>{error}</Text>
          <TouchableOpacity
            style={styles.retryBtn}
            onPress={fetchDeliveryDetail}
            activeOpacity={0.8}
          >
            <Ionicons name="refresh" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
            <Text style={styles.retryBtnText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Card: Customer & Destination Information */}
          <View style={styles.card}>
            <View style={styles.badgeRow}>
              <Text style={styles.seqText}>
                ORDER #{orderDetails?.id || delivery?.order || delivery?.id}
              </Text>
              <View
                style={[
                  styles.statusBadge,
                  isDelivered && styles.deliveredBadge,
                  isFailed && styles.failedBadge,
                ]}
              >
                <Text
                  style={[
                    styles.statusBadgeText,
                    isDelivered && styles.deliveredBadgeText,
                    isFailed && styles.failedBadgeText,
                  ]}
                >
                  {status.toUpperCase()}
                </Text>
              </View>
            </View>

            <Text style={styles.customerName}>{customerName}</Text>
            {orderDetails?.company_name && orderDetails?.customer_name ? (
              <Text style={styles.contactPersonText}>
                Contact: {orderDetails.customer_name}
              </Text>
            ) : null}

            <View style={styles.divider} />

            <Text style={styles.sectionLabel}>DELIVERY LOCATION</Text>
            <Text style={styles.addressText}>{address}</Text>

            <View style={styles.actionRow}>
              <TouchableOpacity
                activeOpacity={0.8}
                style={styles.actionBtn}
                onPress={handleCall}
              >
                <Ionicons name="call" size={18} color="#059669" />
                <Text style={styles.actionBtnText}>
                  {phone ? `Call (${phone})` : 'Call Customer'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.8}
                style={[styles.actionBtn, styles.navBtn]}
                onPress={handleNavigate}
              >
                <Ionicons name="navigate" size={18} color="#3B82F6" />
                <Text style={[styles.actionBtnText, { color: '#3B82F6' }]}>
                  Open Maps
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Card: Operational Items & Quantities */}
          <View style={styles.card}>
            <Text style={styles.sectionLabel}>ORDER ITEMS & QUANTITIES</Text>
            {items && items.length > 0 ? (
              items.map(item => (
                <View key={item.id} style={styles.itemRow}>
                  <Text style={styles.itemName} numberOfLines={1}>
                    {item.product_details?.name || 'Item'}
                  </Text>
                  <Text style={styles.itemQty}>{item.quantity} pcs</Text>
                </View>
              ))
            ) : (
              <Text style={styles.emptyItemsText}>No items specified</Text>
            )}

            {/* Delivered Quantities if available */}
            {delivery?.delivered_items && delivery.delivered_items.length > 0 ? (
              <>
                <View style={styles.divider} />
                <Text style={styles.sectionLabel}>RECONCILED DELIVERED ITEMS</Text>
                {delivery.delivered_items.map(di => (
                  <View key={di.id} style={styles.itemRow}>
                    <Text style={styles.itemName} numberOfLines={1}>
                      {di.product_name}
                    </Text>
                    <Text style={styles.itemQty}>
                      {di.delivered_quantity} / {di.ordered_quantity} pcs
                    </Text>
                  </View>
                ))}
              </>
            ) : null}

            {orderDetails?.notes ? (
              <>
                <View style={styles.divider} />
                <Text style={styles.sectionLabel}>DELIVERY NOTES</Text>
                <Text style={styles.notesText}>{orderDetails.notes}</Text>
              </>
            ) : null}
          </View>

          {/* Complete Delivery Action Button */}
          {!isDelivered && !isFailed && (
            <TouchableOpacity
              activeOpacity={0.85}
              style={[
                styles.deliverBtn,
                isSubmitting && styles.deliverBtnDisabled,
              ]}
              onPress={() => setIsConfirmModalVisible(true)}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <ActivityIndicator
                    size="small"
                    color="#FFFFFF"
                    style={{ marginRight: 8 }}
                  />
                  <Text style={styles.deliverBtnText}>Updating Status...</Text>
                </View>
              ) : (
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Ionicons
                    name="checkmark-circle"
                    size={20}
                    color="#FFFFFF"
                    style={{ marginRight: 8 }}
                  />
                  <Text style={styles.deliverBtnText}>Mark Order as Delivered</Text>
                </View>
              )}
            </TouchableOpacity>
          )}
        </ScrollView>
      )}

      {/* Confirmation Dialog Modal */}
      <Modal
        visible={isConfirmModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setIsConfirmModalVisible(false)}
      >
        <View style={styles.confirmModalOverlay}>
          <View style={styles.confirmModalBox}>
            <View style={styles.confirmModalIconContainer}>
              <Ionicons
                name="checkmark-done-circle"
                size={42}
                color="#059669"
              />
            </View>

            <Text style={styles.confirmModalTitle}>Confirm Delivery</Text>
            <Text style={styles.confirmModalSub}>
              Are you sure you want to mark this delivery for{' '}
              <Text style={{ fontWeight: '800', color: '#111827' }}>
                {customerName}
              </Text>{' '}
              as delivered?
            </Text>

            <View style={styles.confirmModalBtnRow}>
              <TouchableOpacity
                activeOpacity={0.8}
                style={styles.cancelModalBtn}
                onPress={() => setIsConfirmModalVisible(false)}
              >
                <Text style={styles.cancelModalBtnText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.85}
                style={styles.confirmModalBtn}
                onPress={() => {
                  setIsConfirmModalVisible(false);
                  handleMarkDelivered();
                }}
              >
                <Text style={styles.confirmModalBtnText}>Confirm</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
    paddingTop: 14,
    paddingBottom: 30,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '600',
  },
  errorTitle: {
    marginTop: 12,
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  errorSub: {
    marginTop: 4,
    fontSize: 13,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 16,
  },
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#059669',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    marginBottom: 14,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    borderWidth: 1,
    borderColor: '#EFECE8',
  },
  badgeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  seqText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#059669',
    letterSpacing: 0.5,
  },
  statusBadge: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  deliveredBadge: {
    backgroundColor: '#ECFDF5',
  },
  failedBadge: {
    backgroundColor: '#FEF2F2',
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#D97706',
  },
  deliveredBadgeText: {
    color: '#059669',
  },
  failedBadgeText: {
    color: '#DC2626',
  },
  customerName: {
    fontSize: 18,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 2,
  },
  contactPersonText: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '500',
    marginBottom: 6,
  },
  divider: {
    height: 1,
    backgroundColor: '#F3F4F6',
    marginVertical: 12,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#6B7280',
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  addressText: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
    marginBottom: 12,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ECFDF5',
    paddingVertical: 10,
    borderRadius: 10,
    gap: 6,
  },
  navBtn: {
    backgroundColor: '#EFF6FF',
  },
  actionBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#059669',
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  itemName: {
    fontSize: 14,
    color: '#374151',
    flex: 1,
  },
  itemQty: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
  },
  emptyItemsText: {
    fontSize: 13,
    color: '#9CA3AF',
    fontStyle: 'italic',
    paddingVertical: 6,
  },
  notesText: {
    fontSize: 13,
    color: '#4B5563',
    lineHeight: 18,
  },
  deliverBtn: {
    backgroundColor: '#059669',
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  deliverBtnDisabled: {
    backgroundColor: '#9CA3AF',
  },
  deliverBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  topToastContainer: {
    position: 'absolute',
    top: 50,
    left: 20,
    right: 20,
    zIndex: 999,
    backgroundColor: '#059669',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
  topToastText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
    flex: 1,
  },
  confirmModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  confirmModalBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    width: '100%',
    alignItems: 'center',
  },
  confirmModalIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#ECFDF5',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  confirmModalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 8,
  },
  confirmModalSub: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  confirmModalBtnRow: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  cancelModalBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
  },
  cancelModalBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#4B5563',
  },
  confirmModalBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#059669',
    alignItems: 'center',
  },
  confirmModalBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
