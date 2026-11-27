import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Linking,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';
import DeliveryHeader from '../../components/delivery/DeliveryHeader';
import ConfirmDialog from '../../components/ConfirmDialog';
import deliveryService, { BackendDelivery } from '../../services/delivery.service';
import { colors, typography, radius, spacing, shadows } from '../../theme';

export default function OrderDetailsScreen({ route, navigation }: any) {
  const deliveryParam: BackendDelivery | undefined = route.params?.delivery;
  const deliveryIdParam: number | string | undefined =
    route.params?.deliveryId || deliveryParam?.id || route.params?.order?.id;

  const [delivery, setDelivery] = useState<BackendDelivery | null>(deliveryParam || null);
  const [loading, setLoading] = useState<boolean>(!deliveryParam && !!deliveryIdParam);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  // Status Action Confirmation Modal
  const [confirmModal, setConfirmModal] = useState<{
    visible: boolean;
    title: string;
    description: string;
    targetStatus: 'picked_up' | 'delivered';
  }>({
    visible: false,
    title: '',
    description: '',
    targetStatus: 'picked_up',
  });

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

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 2500);
  };

  const handleDialCustomer = (phone?: string) => {
    if (!phone) {
      triggerToast('No phone number available.');
      return;
    }
    Linking.openURL(`tel:${phone}`).catch(() => {
      triggerToast('Unable to launch dialer.');
    });
  };

  const handleUpdateStatus = async (targetStatus: 'picked_up' | 'delivered') => {
    if (!delivery) return;

    try {
      setIsSubmitting(true);
      const updated = await deliveryService.updateStatus(delivery.id, targetStatus);
      setDelivery(updated);
      setConfirmModal(prev => ({ ...prev, visible: false }));
      triggerToast(
        `Order marked as ${targetStatus === 'picked_up' ? 'Picked Up' : 'Delivered'}.`
      );
    } catch (err: any) {
      setConfirmModal(prev => ({ ...prev, visible: false }));
      triggerToast(err?.message || 'Failed to update delivery status.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <DeliveryHeader title="Order Details" showBack />
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading order details...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error || !delivery) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <DeliveryHeader title="Order Details" showBack />
        <View style={styles.centerBox}>
          <Ionicons name="alert-circle-outline" size={48} color="#DC2626" />
          <Text style={styles.errorTitle}>Unable to load delivery</Text>
          <Text style={styles.errorSubtitle}>{error || 'Delivery record not found.'}</Text>
          <TouchableOpacity
            style={styles.retryBtn}
            onPress={fetchDeliveryDetail}
            activeOpacity={0.8}
          >
            <Text style={styles.retryBtnText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const orderDetails = delivery.order_details;
  const orderNumber = orderDetails?.order_number || `ORD-${delivery.order}`;
  const customerName = orderDetails?.customer_name || orderDetails?.company_name || 'Customer';
  const customerPhone = orderDetails?.customer_phone || '';
  const deliveryAddress = orderDetails?.delivery_address || 'Shop Delivery / In-Store Pickup';
  const notes = orderDetails?.notes || '';
  const scheduledDate = orderDetails?.scheduled_delivery_date || '';
  const scheduledTime = orderDetails?.scheduled_delivery_time || '';
  const orderDate = orderDetails?.created_at
    ? new Date(orderDetails.created_at).toLocaleString('en-IN', {
        dateStyle: 'medium',
        timeStyle: 'short',
      })
    : 'N/A';

  const items = orderDetails?.items || [];

  const st = delivery.status.toLowerCase();
  const isPending = st === 'assigned' || st === 'pending' || st === 'accepted';
  const isPickedUp = st === 'picked_up' || st === 'on_the_way';
  const isDelivered = st === 'delivered';

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <DeliveryHeader title="Order Details" showBack />

      {toastMessage !== '' && (
        <View style={styles.toast}>
          <Ionicons name="information-circle-outline" size={18} color="#FFFFFF" />
          <Text style={styles.toastText}>{toastMessage}</Text>
        </View>
      )}

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Section 1: Order Header & Status Card */}
        <View style={styles.card}>
          <View style={styles.orderTopRow}>
            <View>
              <Text style={styles.orderNumberTitle}>{orderNumber}</Text>
              <Text style={styles.orderDateSubtitle}>Ordered: {orderDate}</Text>
            </View>

            <View
              style={[
                styles.statusBadge,
                isPending && styles.badgePending,
                isPickedUp && styles.badgePickedUp,
                isDelivered && styles.badgeDelivered,
              ]}
            >
              <Text
                style={[
                  styles.statusBadgeText,
                  isPending && styles.badgeTextPending,
                  isPickedUp && styles.badgeTextPickedUp,
                  isDelivered && styles.badgeTextDelivered,
                ]}
              >
                {isPending ? 'Pending' : isPickedUp ? 'Picked Up' : 'Delivered'}
              </Text>
            </View>
          </View>

          {/* Delivery Date & Time Slot */}
          <View style={styles.scheduleRow}>
            <Ionicons name="calendar-outline" size={15} color={colors.primary} />
            <Text style={styles.scheduleLabel}>Delivery Schedule:</Text>
            <Text style={styles.scheduleValue}>
              {scheduledDate ? `${scheduledDate}${scheduledTime ? ` at ${scheduledTime}` : ''}` : 'Today Standard'}
            </Text>
          </View>
        </View>

        {/* Section 2: Customer Details */}
        <View style={styles.card}>
          <Text style={styles.sectionHeaderTitle}>Customer Information</Text>

          <View style={styles.customerRow}>
            <View style={styles.avatarCircle}>
              <Text style={styles.avatarText}>
                {customerName ? customerName.slice(0, 2).toUpperCase() : 'CU'}
              </Text>
            </View>

            <View style={{ flex: 1 }}>
              <Text style={styles.customerNameText}>{customerName}</Text>
              {customerPhone ? (
                <Text style={styles.phoneText}>{customerPhone}</Text>
              ) : (
                <Text style={styles.phoneTextMuted}>No phone number provided</Text>
              )}
            </View>

            {customerPhone ? (
              <TouchableOpacity
                style={styles.callBtn}
                onPress={() => handleDialCustomer(customerPhone)}
                activeOpacity={0.8}
              >
                <Ionicons name="call" size={16} color="#FFFFFF" />
                <Text style={styles.callBtnText}>Call</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        </View>

        {/* Section 3: Delivery Address */}
        <View style={styles.card}>
          <Text style={styles.sectionHeaderTitle}>Delivery Address</Text>
          <View style={styles.addressBox}>
            <Ionicons name="location-sharp" size={18} color={colors.primary} style={{ marginTop: 2 }} />
            <Text style={styles.addressContentText}>{deliveryAddress}</Text>
          </View>
        </View>

        {/* Section 4: Products & Quantities */}
        <View style={styles.card}>
          <Text style={styles.sectionHeaderTitle}>Order Items ({items.length})</Text>

          {items.length === 0 ? (
            <Text style={styles.noItemsText}>No product details available.</Text>
          ) : (
            items.map((item: any, idx: number) => {
              const productName = item.product_details?.name || item.product_name || `Item #${idx + 1}`;
              const qty = item.quantity || 1;

              return (
                <View key={item.id || idx} style={styles.itemRow}>
                  <View style={styles.qtyBadge}>
                    <Text style={styles.qtyBadgeText}>{qty}x</Text>
                  </View>
                  <Text style={styles.itemNameText}>{productName}</Text>
                </View>
              );
            })
          )}
        </View>

        {/* Section 5: Order Notes / Instructions */}
        {notes ? (
          <View style={styles.card}>
            <Text style={styles.sectionHeaderTitle}>Notes & Instructions</Text>
            <View style={styles.notesBox}>
              <Ionicons name="document-text-outline" size={16} color={colors.textSecondary} />
              <Text style={styles.notesText}>{notes}</Text>
            </View>
          </View>
        ) : null}

        {/* Section 6: Operational Action Workflow Controls */}
        <View style={styles.actionsContainer}>
          {isPending && (
            <TouchableOpacity
              style={[styles.primaryActionBtn, { backgroundColor: colors.primary }]}
              onPress={() =>
                setConfirmModal({
                  visible: true,
                  title: 'Mark as Picked Up',
                  description: `Confirm that you have picked up ${orderNumber} from the store.`,
                  targetStatus: 'picked_up',
                })
              }
              disabled={isSubmitting}
              activeOpacity={0.8}
            >
              <Ionicons name="cube-outline" size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
              <Text style={styles.primaryActionBtnText}>Mark as Picked Up</Text>
            </TouchableOpacity>
          )}

          {isPickedUp && (
            <TouchableOpacity
              style={[styles.primaryActionBtn, { backgroundColor: '#8C331A' }]}
              onPress={() =>
                setConfirmModal({
                  visible: true,
                  title: 'Mark as Delivered',
                  description: `Confirm that you have delivered ${orderNumber} to ${customerName}.`,
                  targetStatus: 'delivered',
                })
              }
              disabled={isSubmitting}
              activeOpacity={0.8}
            >
              <Ionicons name="checkmark-done-circle-outline" size={20} color="#FFFFFF" style={{ marginRight: 8 }} />
              <Text style={styles.primaryActionBtnText}>Mark as Delivered</Text>
            </TouchableOpacity>
          )}

          {isDelivered && (
            <View style={styles.completedNoticeBox}>
              <Ionicons name="checkmark-circle" size={22} color="#8C331A" />
              <Text style={styles.completedNoticeText}>
                This order has been delivered successfully.
              </Text>
            </View>
          )}
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Confirmation Dialog */}
      <ConfirmDialog
        visible={confirmModal.visible}
        title={confirmModal.title}
        description={confirmModal.description}
        confirmLabel={confirmModal.targetStatus === 'picked_up' ? 'Confirm Pick Up' : 'Confirm Delivered'}
        cancelLabel="Cancel"
        type={confirmModal.targetStatus === 'picked_up' ? 'warning' : 'success'}
        onConfirm={() => handleUpdateStatus(confirmModal.targetStatus)}
        onCancel={() => setConfirmModal(prev => ({ ...prev, visible: false }))}
        loading={isSubmitting}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7F8FA',
  },
  centerBox: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 13,
    color: '#718096',
  },
  errorTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#253247',
    marginTop: 12,
  },
  errorSubtitle: {
    fontSize: 13,
    color: '#718096',
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 16,
  },
  retryBtn: {
    backgroundColor: '#8C331A',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: radius.md,
  },
  retryBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
  toast: {
    backgroundColor: '#253247',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginHorizontal: 16,
    marginTop: 8,
    borderRadius: radius.md,
    gap: 8,
    ...shadows.sm,
  },
  toastText: {
    fontSize: 12,
    color: '#FFFFFF',
    fontWeight: '500',
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: radius.lg,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E8EDF2',
    ...shadows.sm,
  },
  orderTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F7F8FA',
  },
  orderNumberTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#253247',
  },
  orderDateSubtitle: {
    fontSize: 12,
    color: '#718096',
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.full,
    borderWidth: 1,
  },
  badgePending: {
    backgroundColor: '#FEF3C7',
    borderColor: '#FDE68A',
  },
  badgePickedUp: {
    backgroundColor: '#EFF6FF',
    borderColor: '#BFDBFE',
  },
  badgeDelivered: {
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0',
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  badgeTextPending: {
    color: '#92400E',
  },
  badgeTextPickedUp: {
    color: '#1D4ED8',
  },
  badgeTextDelivered: {
    color: '#047857',
  },
  scheduleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 10,
    gap: 6,
  },
  scheduleLabel: {
    fontSize: 12,
    color: '#718096',
    fontWeight: '500',
  },
  scheduleValue: {
    fontSize: 12,
    fontWeight: '700',
    color: '#253247',
  },
  sectionHeaderTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#718096',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  customerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatarCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F7F8FA',
    borderWidth: 1,
    borderColor: '#E8EDF2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#8C331A',
  },
  customerNameText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#253247',
  },
  phoneText: {
    fontSize: 13,
    color: '#718096',
    marginTop: 2,
  },
  phoneTextMuted: {
    fontSize: 12,
    color: '#A0AEC0',
    fontStyle: 'italic',
  },
  callBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#8C331A',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radius.md,
    gap: 4,
  },
  callBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 12,
  },
  addressBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: '#F7F8FA',
    padding: 12,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: '#E8EDF2',
  },
  addressContentText: {
    fontSize: 13,
    color: '#253247',
    lineHeight: 18,
    flex: 1,
  },
  noItemsText: {
    fontSize: 13,
    color: '#718096',
    fontStyle: 'italic',
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F7F8FA',
    gap: 10,
  },
  qtyBadge: {
    backgroundColor: '#F7F8FA',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: '#E8EDF2',
  },
  qtyBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#8C331A',
  },
  itemNameText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#253247',
    flex: 1,
  },
  notesBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: '#FEF3C7',
    padding: 12,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  notesText: {
    fontSize: 13,
    color: '#92400E',
    lineHeight: 18,
    flex: 1,
  },
  actionsContainer: {
    marginTop: 6,
    marginBottom: 16,
  },
  primaryActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: radius.lg,
    ...shadows.md,
  },
  primaryActionBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  completedNoticeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#ECFDF5',
    paddingVertical: 14,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  completedNoticeText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#047857',
  },
});
