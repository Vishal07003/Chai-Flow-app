import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';
import DeliveryHeader from '../../components/delivery/DeliveryHeader';
import deliveryService, { BackendDelivery } from '../../services/delivery.service';
import locationTrackingService from '../../services/location.service';
import offlineDeliveryService, { QueuedDeliveryAction, SyncStatus } from '../../services/offlineDelivery.service';

export default function OrderDetailsScreen({ route, navigation }: any) {
  const deliveryParam: BackendDelivery | undefined = route.params?.delivery;
  const deliveryIdParam: number | string | undefined =
    route.params?.deliveryId || deliveryParam?.id || route.params?.order?.id;

  const [delivery, setDelivery] = useState<BackendDelivery | null>(deliveryParam || null);
  const [loading, setLoading] = useState<boolean>(!deliveryParam && !!deliveryIdParam);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [syncStatus, setSyncStatus] = useState<SyncStatus | null>(null);
  const [pendingAction, setPendingAction] = useState<QueuedDeliveryAction | undefined>(undefined);

  // Quantity Reconciliation Bottom Sheet State
  const [isReconcileModalVisible, setIsReconcileModalVisible] = useState(false);
  // Store values as string representation to support in-progress typing / empty inputs
  const [deliveredQuantities, setDeliveredQuantities] = useState<{ [productId: number]: string }>({});
  const [discrepancyNotes, setDiscrepancyNotes] = useState<string>('');

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

  // Sync state observer for this specific delivery
  useEffect(() => {
    const checkSync = async () => {
      if (!deliveryIdParam) return;
      const res = await offlineDeliveryService.getDeliverySyncStatus(deliveryIdParam);
      setSyncStatus(res.syncStatus);
      setPendingAction(res.latestAction);
    };

    checkSync();
    const unsubscribe = offlineDeliveryService.subscribe(() => {
      checkSync();
    });
    return unsubscribe;
  }, [deliveryIdParam]);

  const orderDetails = delivery?.order_details;
  const customerName =
    orderDetails?.company_name || orderDetails?.customer_name || 'Counter Order';
  const phone = orderDetails?.customer_phone || '';
  const address = orderDetails?.delivery_address || 'Shop delivery';
  const items = orderDetails?.items || [];
  const status = delivery?.status || 'assigned';
  const isDelivered = status === 'delivered';
  const isFailed = status === 'failed';

  // Format order created date/time in Asia/Kolkata
  const orderFormattedDate = useMemo(() => {
    const rawDate = orderDetails?.created_at || delivery?.updated_at;
    if (!rawDate) return null;
    try {
      const d = new Date(rawDate);
      if (isNaN(d.getTime())) return null;
      return d.toLocaleString('en-IN', {
        dateStyle: 'medium',
        timeStyle: 'short',
        timeZone: 'Asia/Kolkata',
      });
    } catch {
      return null;
    }
  }, [orderDetails?.created_at, delivery?.updated_at]);

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

  // Helper to parse input safely to non-negative integer
  const parseQtyValue = (raw: string | undefined, defaultVal: number = 0): number => {
    if (raw === undefined || raw === null || raw.trim() === '') return defaultVal;
    const clean = raw.replace(/[^0-9]/g, '');
    const num = parseInt(clean, 10);
    return isNaN(num) ? defaultVal : Math.max(0, num);
  };

  // Initialize and open Quantity Reconciliation modal
  const openReconcileModal = () => {
    const initialMap: { [productId: number]: string } = {};
    if (items && items.length > 0) {
      items.forEach(it => {
        initialMap[it.product] = String(it.quantity);
      });
    }
    setDeliveredQuantities(initialMap);
    setDiscrepancyNotes('');
    setIsReconcileModalVisible(true);
  };

  // Adjust delivered quantity with +/-
  const handleQtyAdjust = (productId: number, delta: number) => {
    setDeliveredQuantities(prev => {
      const current = parseQtyValue(prev[productId], 0);
      const nextVal = Math.max(0, current + delta);
      return { ...prev, [productId]: String(nextVal) };
    });
  };

  // Direct manual quantity text change handler
  const handleManualQtyChange = (productId: number, text: string) => {
    // Only accept whole numeric digits or empty string (while user is backspacing)
    const sanitized = text.replace(/[^0-9]/g, '');
    setDeliveredQuantities(prev => ({
      ...prev,
      [productId]: sanitized,
    }));
  };

  // On blur, if field is left empty, default back to original ordered quantity or 0
  const handleQtyBlur = (productId: number, originalQty: number) => {
    setDeliveredQuantities(prev => {
      const val = prev[productId];
      if (val === undefined || val === '') {
        return { ...prev, [productId]: String(originalQty) };
      }
      return prev;
    });
  };

  // Check whether any product quantity was modified from original
  const hasEdits = useMemo(() => {
    return items.some(it => {
      const raw = deliveredQuantities[it.product];
      const parsed = parseQtyValue(raw, it.quantity);
      return parsed !== it.quantity;
    });
  }, [items, deliveredQuantities]);

  // Reset all edited quantities to original ordered quantities
  const handleResetQuantities = () => {
    const doReset = () => {
      const resetMap: { [productId: number]: string } = {};
      items.forEach(it => {
        resetMap[it.product] = String(it.quantity);
      });
      setDeliveredQuantities(resetMap);
      setDiscrepancyNotes('');
    };

    if (hasEdits) {
      Alert.alert(
        'Reset Quantities?',
        'This will restore all delivered quantities to match the original ordered amounts.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Reset', style: 'destructive', onPress: doReset },
        ]
      );
    } else {
      doReset();
    }
  };

  // Submit actual delivered quantities and complete delivery
  const handleConfirmDelivery = async () => {
    if (!delivery || isSubmitting || isDelivered) return;

    // Validate that all quantities are valid numbers
    for (const it of items) {
      const raw = deliveredQuantities[it.product];
      if (raw !== undefined && raw.trim() === '') {
        Alert.alert('Incomplete Quantities', `Please enter a valid delivered quantity for "${it.product_details?.name || 'Item'}".`);
        return;
      }
    }

    try {
      setIsSubmitting(true);

      // 1. Build delivered items payload
      const itemsPayload = items.map(it => {
        const raw = deliveredQuantities[it.product];
        const deliveredQty = parseQtyValue(raw, it.quantity);
        return {
          product_id: it.product,
          delivered_quantity: deliveredQty,
          discrepancy_notes: discrepancyNotes.trim(),
        };
      });

      // Submit actual delivered quantities
      if (itemsPayload.length > 0) {
        await deliveryService.recordDeliveredQuantities(delivery.id, itemsPayload);
      }

      // 2. Mark delivery as DELIVERED in backend
      await deliveryService.updateStatus(delivery.id, 'delivered', discrepancyNotes.trim());

      // 3. Halt GPS tracking immediately
      await locationTrackingService.stopTracking();

      setIsReconcileModalVisible(false);
      setToastMessage('Delivery Completed Successfully! 🎉');

      // Refresh delivery data
      await fetchDeliveryDetail();

      setTimeout(() => {
        navigation.goBack();
      }, 1600);
    } catch (err: any) {
      console.log(`Direct delivery completion failed (${err?.message}). Enqueuing offline action.`);

      // Build payload for offline queue
      const itemsPayload = items.map(it => {
        const raw = deliveredQuantities[it.product];
        const deliveredQty = parseQtyValue(raw, it.quantity);
        return {
          product_id: it.product,
          delivered_quantity: deliveredQty,
          discrepancy_notes: discrepancyNotes.trim(),
        };
      });

      await offlineDeliveryService.enqueueAction(delivery.id, 'SUBMIT_QUANTITIES', {
        items: itemsPayload,
        notes: discrepancyNotes.trim(),
        status: 'delivered',
      });

      // Stop location tracking
      await locationTrackingService.stopTracking();

      setIsReconcileModalVisible(false);
      setToastMessage('Saved Offline: Will Sync Automatically');

      Alert.alert(
        'Offline: Delivery Recorded',
        'No network connection. Your delivered quantities and completion record have been saved locally. The delivery shows "Pending Sync" and will confirm with the server when connectivity returns.'
      );
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
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Text style={styles.seqText}>
                  ORDER #{orderDetails?.id || delivery?.order || delivery?.id}
                </Text>
                {syncStatus && (
                  <View
                    style={[
                      styles.syncPill,
                      syncStatus === 'SYNCING' && styles.syncingPill,
                      syncStatus === 'NEEDS_REVIEW' && styles.needsReviewPill,
                      syncStatus === 'SYNC_FAILED' && styles.syncFailedPill,
                    ]}
                  >
                    <Ionicons
                      name={
                        syncStatus === 'SYNCING'
                          ? 'sync-outline'
                          : syncStatus === 'NEEDS_REVIEW'
                          ? 'alert-circle-outline'
                          : 'cloud-offline-outline'
                      }
                      size={11}
                      color={
                        syncStatus === 'SYNCING'
                          ? '#2563EB'
                          : syncStatus === 'NEEDS_REVIEW'
                          ? '#D97706'
                          : '#DC2626'
                      }
                    />
                    <Text
                      style={[
                        styles.syncPillText,
                        syncStatus === 'SYNCING' && { color: '#2563EB' },
                        syncStatus === 'NEEDS_REVIEW' && { color: '#D97706' },
                        syncStatus === 'SYNC_FAILED' && { color: '#DC2626' },
                      ]}
                    >
                      {syncStatus.replace(/_/g, ' ')}
                    </Text>
                  </View>
                )}
              </View>

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
                  {status.toUpperCase().replace(/_/g, ' ')}
                </Text>
              </View>
            </View>

            <Text style={styles.customerName}>{customerName}</Text>
            {orderDetails?.company_name && orderDetails?.customer_name ? (
              <Text style={styles.contactPersonText}>
                Contact: {orderDetails.customer_name}
              </Text>
            ) : null}

            {orderFormattedDate ? (
              <View style={styles.dateRow}>
                <Ionicons name="time-outline" size={14} color="#6B7280" />
                <Text style={styles.dateText}>Order Placed: {orderFormattedDate}</Text>
              </View>
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

          {/* Offline Pending Review Box */}
          {pendingAction && (
            <View
              style={[
                styles.syncAlertBox,
                syncStatus === 'NEEDS_REVIEW' && styles.syncAlertNeedsReview,
                syncStatus === 'SYNC_FAILED' && styles.syncAlertFailed,
              ]}
            >
              <Ionicons
                name={
                  syncStatus === 'SYNCING'
                    ? 'sync-outline'
                    : syncStatus === 'NEEDS_REVIEW'
                    ? 'alert-circle'
                    : 'cloud-offline'
                }
                size={20}
                color={
                  syncStatus === 'SYNCING'
                    ? '#2563EB'
                    : syncStatus === 'NEEDS_REVIEW'
                    ? '#D97706'
                    : '#DC2626'
                }
              />
              <View style={{ flex: 1 }}>
                <Text style={styles.syncAlertTitle}>
                  {syncStatus === 'PENDING_SYNC'
                    ? 'Action Saved Offline'
                    : syncStatus === 'SYNCING'
                    ? 'Synchronizing with server...'
                    : syncStatus === 'NEEDS_REVIEW'
                    ? 'Sync Needs Review'
                    : 'Sync Failed'}
                </Text>
                <Text style={styles.syncAlertDesc}>
                  {pendingAction.errorMessage ||
                    'This action is queued locally and will be submitted automatically when your device connects to the internet.'}
                </Text>
              </View>

              {(syncStatus === 'NEEDS_REVIEW' || syncStatus === 'SYNC_FAILED') && (
                <TouchableOpacity
                  style={styles.retrySyncBtn}
                  onPress={() => offlineDeliveryService.retryAction(pendingAction.actionId)}
                >
                  <Text style={styles.retrySyncBtnText}>Retry</Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          {/* Complete Delivery / Record Quantities Action Button */}
          {!isDelivered && !isFailed && (
            <TouchableOpacity
              activeOpacity={0.85}
              style={[
                styles.deliverBtn,
                isSubmitting && styles.deliverBtnDisabled,
              ]}
              onPress={openReconcileModal}
              disabled={isSubmitting}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Ionicons
                  name="checkmark-done-circle"
                  size={20}
                  color="#FFFFFF"
                  style={{ marginRight: 8 }}
                />
                <Text style={styles.deliverBtnText}>
                  Record Quantities & Confirm Delivery
                </Text>
              </View>
            </TouchableOpacity>
          )}

          {isDelivered && (
            <View style={styles.completedCard}>
              <Ionicons name="checkmark-circle" size={24} color="#059669" style={{ marginRight: 8 }} />
              <View style={{ flex: 1 }}>
                <Text style={styles.completedCardTitle}>Order Delivered</Text>
                <Text style={styles.completedCardSub}>Actual delivered quantities recorded.</Text>
              </View>
            </View>
          )}
        </ScrollView>
      )}

      {/* Quantity Reconciliation Bottom Sheet Modal */}
      <Modal
        visible={isReconcileModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => {
          if (!isSubmitting) setIsReconcileModalVisible(false);
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalTitle}>Confirm Delivered Quantities</Text>
                <Text style={styles.modalSubtitle}>
                  Adjust actual units handed over for customer & invoice verification.
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setIsReconcileModalVisible(false)}
                disabled={isSubmitting}
                style={styles.closeModalBtn}
              >
                <Ionicons name="close" size={24} color="#2A2421" />
              </TouchableOpacity>
            </View>

            {/* Stepper List for each Item with Editable Numeric Input */}
            <ScrollView style={{ maxHeight: 300 }} showsVerticalScrollIndicator={false}>
              {items.map(it => {
                const orderedQty = it.quantity;
                const rawVal = deliveredQuantities[it.product];
                const deliveredQty = parseQtyValue(rawVal, orderedQty);
                const diff = deliveredQty - orderedQty;
                const displayVal = rawVal !== undefined ? rawVal : String(orderedQty);

                return (
                  <View key={it.id} style={styles.qtyRow}>
                    <View style={{ flex: 1, paddingRight: 8 }}>
                      <Text style={styles.itemTitle} numberOfLines={1}>
                        {it.product_details?.name || 'Item'}
                      </Text>
                      <View style={styles.qtyMetaRow}>
                        <Text style={styles.itemSub}>Ordered: {orderedQty}</Text>
                        {diff < 0 ? (
                          <View style={styles.diffPillPending}>
                            <Text style={styles.diffPillTextPending}>
                              Pending: {Math.abs(diff)}
                            </Text>
                          </View>
                        ) : diff > 0 ? (
                          <View style={styles.diffPillExtra}>
                            <Text style={styles.diffPillTextExtra}>
                              Extra: +{diff}
                            </Text>
                          </View>
                        ) : (
                          <View style={styles.diffPillExact}>
                            <Text style={styles.diffPillTextExact}>Exact Match</Text>
                          </View>
                        )}
                      </View>
                    </View>

                    {/* Stepper Controls with Centered Editable TextInput */}
                    <View style={styles.stepper}>
                      <TouchableOpacity
                        style={styles.stepBtn}
                        onPress={() => handleQtyAdjust(it.product, -1)}
                        disabled={isSubmitting}
                        activeOpacity={0.7}
                      >
                        <Text style={styles.stepBtnText}>−</Text>
                      </TouchableOpacity>

                      <TextInput
                        style={styles.stepInput}
                        value={displayVal}
                        onChangeText={text => handleManualQtyChange(it.product, text)}
                        onBlur={() => handleQtyBlur(it.product, orderedQty)}
                        keyboardType="number-pad"
                        maxLength={5}
                        selectTextOnFocus
                        editable={!isSubmitting}
                      />

                      <TouchableOpacity
                        style={styles.stepBtn}
                        onPress={() => handleQtyAdjust(it.product, 1)}
                        disabled={isSubmitting}
                        activeOpacity={0.7}
                      >
                        <Text style={styles.stepBtnText}>+</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })}
            </ScrollView>

            {/* Discrepancy Notes Input */}
            <TextInput
              style={styles.notesInput}
              placeholder="Discrepancy / delivery notes (optional)"
              placeholderTextColor="#8E8278"
              value={discrepancyNotes}
              onChangeText={setDiscrepancyNotes}
              editable={!isSubmitting}
            />

            {/* Action Row: Reset Button & Confirm Delivery Button */}
            <View style={styles.modalActionRow}>
              <TouchableOpacity
                style={styles.resetBtn}
                onPress={handleResetQuantities}
                disabled={isSubmitting}
                activeOpacity={0.7}
              >
                <Ionicons name="refresh-outline" size={16} color="#DC2626" style={{ marginRight: 4 }} />
                <Text style={styles.resetBtnText}>Reset</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.confirmDeliverBtn, isSubmitting && styles.deliverBtnDisabled]}
                onPress={handleConfirmDelivery}
                disabled={isSubmitting}
                activeOpacity={0.85}
              >
                {isSubmitting ? (
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <ActivityIndicator size="small" color="#FFFFFF" style={{ marginRight: 8 }} />
                    <Text style={styles.confirmDeliverBtnText}>Submitting...</Text>
                  </View>
                ) : (
                  <Text style={styles.confirmDeliverBtnText}>Confirm Delivery</Text>
                )}
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
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  dateText: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },
  divider: {
    height: 1,
    backgroundColor: '#F3F4F6',
    marginVertical: 14,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#9CA3AF',
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  addressText: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
    marginBottom: 14,
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
    paddingVertical: 11,
    borderRadius: 12,
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
    color: '#1F2937',
    fontWeight: '600',
    flex: 1,
  },
  itemQty: {
    fontSize: 14,
    fontWeight: '700',
    color: '#059669',
  },
  emptyItemsText: {
    fontSize: 13,
    color: '#9CA3AF',
    fontStyle: 'italic',
  },
  notesText: {
    fontSize: 13,
    color: '#4B5563',
    lineHeight: 18,
  },
  deliverBtn: {
    backgroundColor: '#059669',
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
    elevation: 3,
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
  },
  deliverBtnDisabled: {
    opacity: 0.6,
  },
  deliverBtnText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  completedCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#A7F3D0',
    marginTop: 8,
  },
  completedCardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#065F46',
  },
  completedCardSub: {
    fontSize: 12,
    color: '#047857',
    marginTop: 2,
  },
  topToastContainer: {
    position: 'absolute',
    top: 50,
    left: 16,
    right: 16,
    backgroundColor: '#059669',
    borderRadius: 12,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 999,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#111827',
  },
  modalSubtitle: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  closeModalBtn: {
    padding: 4,
  },
  qtyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  itemTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
  },
  qtyMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 3,
  },
  itemSub: {
    fontSize: 12,
    color: '#6B7280',
  },
  diffPillPending: {
    backgroundColor: '#FEF2F2',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  diffPillTextPending: {
    fontSize: 11,
    fontWeight: '700',
    color: '#DC2626',
  },
  diffPillExtra: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  diffPillTextExtra: {
    fontSize: 11,
    fontWeight: '700',
    color: '#2563EB',
  },
  diffPillExact: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  diffPillTextExact: {
    fontSize: 11,
    fontWeight: '600',
    color: '#6B7280',
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stepBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepBtnText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  stepVal: {
    fontSize: 15,
    fontWeight: '800',
    color: '#111827',
    marginHorizontal: 10,
    minWidth: 22,
    textAlign: 'center',
  },
  stepInput: {
    fontSize: 15,
    fontWeight: '800',
    color: '#111827',
    marginHorizontal: 6,
    minWidth: 42,
    height: 34,
    textAlign: 'center',
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    paddingVertical: 0,
    paddingHorizontal: 4,
  },
  notesInput: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 44,
    fontSize: 13,
    color: '#111827',
    marginTop: 12,
    marginBottom: 16,
  },
  modalActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  resetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 13,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FCA5A5',
  },
  resetBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#DC2626',
  },
  confirmDeliverBtn: {
    flex: 1,
    backgroundColor: '#059669',
    height: 46,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  confirmDeliverBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
  syncPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#FEF2F2',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  syncingPill: {
    backgroundColor: '#EFF6FF',
  },
  needsReviewPill: {
    backgroundColor: '#FEF3C7',
  },
  syncFailedPill: {
    backgroundColor: '#FEF2F2',
  },
  syncPillText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#DC2626',
  },
  syncAlertBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FEF3C7',
    borderRadius: 14,
    padding: 14,
    gap: 12,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  syncAlertNeedsReview: {
    backgroundColor: '#FFFBEB',
    borderColor: '#FCD34D',
  },
  syncAlertFailed: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FCA5A5',
  },
  syncAlertTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#111827',
  },
  syncAlertDesc: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
    lineHeight: 16,
  },
  retrySyncBtn: {
    backgroundColor: '#D97706',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    alignSelf: 'center',
  },
  retrySyncBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
});
