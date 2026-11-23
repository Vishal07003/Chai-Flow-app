import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Modal,
  TextInput,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';
import DeliveryHeader from '../../components/delivery/DeliveryHeader';
import { EmptyState } from '../../components/common';
import deliveryService, { BackendDelivery } from '../../services/delivery.service';
import locationTrackingService from '../../services/location.service';
import offlineDeliveryService, { QueuedDeliveryAction, SyncStatus } from '../../services/offlineDelivery.service';

const tabs = ['ALL', 'ASSIGNED', 'ACCEPTED', 'PICKED_UP', 'ON_THE_WAY', 'DELIVERED'];

export default function DeliveryOrdersScreen({ navigation }: any) {
  const [deliveries, setDeliveries] = useState<BackendDelivery[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<string>('ALL');
  const [offlineQueue, setOfflineQueue] = useState<QueuedDeliveryAction[]>([]);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);

  // Discrepancy Recording & Delivery Completion Modal
  const [selectedDelivery, setSelectedDelivery] = useState<BackendDelivery | null>(null);
  const [recordModalVisible, setRecordModalVisible] = useState<boolean>(false);
  const [deliveredQuantities, setDeliveredQuantities] = useState<{ [productId: number]: string }>({});
  const [discrepancyNotes, setDiscrepancyNotes] = useState<string>('');
  const [actionInProgress, setActionInProgress] = useState<boolean>(false);

  const fetchDeliveries = useCallback(async () => {
    try {
      const data = await deliveryService.getDeliveries();
      setDeliveries(data || []);
    } catch (err: any) {
      console.log('Error fetching assigned deliveries:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Subscribe to offline queue changes and trigger sync on launch
  useEffect(() => {
    const unsubscribe = offlineDeliveryService.subscribe(queue => {
      setOfflineQueue([...queue]);
    });

    offlineDeliveryService.getQueue().then(queue => {
      setOfflineQueue(queue);
      if (queue.some(a => a.syncStatus === 'PENDING_SYNC')) {
        handleTriggerSync();
      }
    });

    return unsubscribe;
  }, []);

  const handleTriggerSync = useCallback(async () => {
    try {
      setIsSyncing(true);
      await offlineDeliveryService.syncQueue();
      await fetchDeliveries();
    } catch (err) {
      console.log('Automatic sync error:', err);
    } finally {
      setIsSyncing(false);
    }
  }, [fetchDeliveries]);

  useEffect(() => {
    fetchDeliveries();
  }, [fetchDeliveries]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    handleTriggerSync();
  }, [handleTriggerSync]);

  const filteredDeliveries = useMemo(() => {
    if (activeTab === 'ALL') return deliveries;
    return deliveries.filter(d => d.status.toUpperCase() === activeTab);
  }, [deliveries, activeTab]);

  const handleStatusTransition = async (delivery: BackendDelivery, targetStatus: BackendDelivery['status']) => {
    try {
      setActionInProgress(true);
      await deliveryService.updateStatus(delivery.id, targetStatus);

      // Start/Stop location tracking depending on state: active during picked_up or on_the_way
      if (targetStatus === 'picked_up' || targetStatus === 'on_the_way') {
        await locationTrackingService.startTrackingForDelivery(delivery.id);
      } else if (targetStatus === 'delivered' || targetStatus === 'failed') {
        await locationTrackingService.stopTracking();
      }

      fetchDeliveries();
      Alert.alert('Status Updated', `Delivery is now '${targetStatus.toUpperCase()}'.`);
    } catch (err: any) {
      console.log(`Direct status transition failed (${err?.message}). Enqueuing offline action.`);
      // Enqueue offline action safely
      const actionTypeMap: { [key: string]: any } = {
        accepted: 'ACCEPT_TASK',
        picked_up: 'PICKUP',
        on_the_way: 'ON_THE_WAY',
        failed: 'FAIL_DELIVERY',
      };

      const actionType = actionTypeMap[targetStatus];
      if (actionType) {
        await offlineDeliveryService.enqueueAction(delivery.id, actionType, {
          status: targetStatus,
        });

        // Optimistically update local list display status while pending sync
        setDeliveries(prev =>
          prev.map(d => (d.id === delivery.id ? { ...d, status: targetStatus } : d))
        );

        Alert.alert(
          'Offline Mode: Action Saved',
          `No network connection. '${targetStatus.toUpperCase()}' has been saved locally and will synchronize automatically when online.`
        );
      } else {
        Alert.alert('Transition Error', err?.message || 'Failed to update status.');
      }
    } finally {
      setActionInProgress(false);
    }
  };

  const parseQtyValue = (raw: string | undefined, defaultVal: number = 0): number => {
    if (raw === undefined || raw === null || raw.trim() === '') return defaultVal;
    const clean = raw.replace(/[^0-9]/g, '');
    const num = parseInt(clean, 10);
    return isNaN(num) ? defaultVal : Math.max(0, num);
  };

  const openCompletionModal = (delivery: BackendDelivery) => {
    setSelectedDelivery(delivery);
    const initialQty: { [productId: number]: string } = {};
    if (delivery.order_details?.items) {
      delivery.order_details.items.forEach(it => {
        initialQty[it.product] = String(it.quantity);
      });
    }
    setDeliveredQuantities(initialQty);
    setDiscrepancyNotes('');
    setRecordModalVisible(true);
  };

  const handleQtyAdjust = (productId: number, delta: number) => {
    setDeliveredQuantities(prev => {
      const current = parseQtyValue(prev[productId], 0);
      const nextVal = Math.max(0, current + delta);
      return { ...prev, [productId]: String(nextVal) };
    });
  };

  const handleManualQtyChange = (productId: number, text: string) => {
    const sanitized = text.replace(/[^0-9]/g, '');
    setDeliveredQuantities(prev => ({
      ...prev,
      [productId]: sanitized,
    }));
  };

  const handleQtyBlur = (productId: number, originalQty: number) => {
    setDeliveredQuantities(prev => {
      const val = prev[productId];
      if (val === undefined || val === '') {
        return { ...prev, [productId]: String(originalQty) };
      }
      return prev;
    });
  };

  const handleResetQuantities = () => {
    if (!selectedDelivery?.order_details?.items) return;
    const resetMap: { [productId: number]: string } = {};
    selectedDelivery.order_details.items.forEach(it => {
      resetMap[it.product] = String(it.quantity);
    });
    setDeliveredQuantities(resetMap);
    setDiscrepancyNotes('');
  };

  const handleConfirmDelivered = async () => {
    if (!selectedDelivery) return;

    const items = selectedDelivery.order_details?.items || [];
    for (const it of items) {
      const raw = deliveredQuantities[it.product];
      if (raw !== undefined && raw.trim() === '') {
        Alert.alert('Incomplete Quantities', `Please enter a valid delivered quantity for "${it.product_details?.name || 'Item'}".`);
        return;
      }
    }

    try {
      setActionInProgress(true);
      // 1. Record actual delivered quantities
      const itemsPayload = items.map(it => {
        const raw = deliveredQuantities[it.product];
        const deliveredQty = parseQtyValue(raw, it.quantity);
        return {
          product_id: it.product,
          delivered_quantity: deliveredQty,
          discrepancy_notes: discrepancyNotes.trim(),
        };
      });

      if (itemsPayload.length > 0) {
        await deliveryService.recordDeliveredQuantities(selectedDelivery.id, itemsPayload);
      }

      // 2. Mark delivery as DELIVERED
      await deliveryService.updateStatus(selectedDelivery.id, 'delivered', discrepancyNotes.trim());
      await locationTrackingService.stopTracking();

      setRecordModalVisible(false);
      fetchDeliveries();
      Alert.alert('Delivery Completed', 'Actual delivered quantities recorded. Tracking stopped.');
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to complete delivery.');
    } finally {
      setActionInProgress(false);
    }
  };

  const navigateToOrderDetails = (item: BackendDelivery) => {
    navigation.navigate('OrderDetails', { delivery: item, deliveryId: item.id, order: item.order_details });
  };

  const renderDeliveryCard = ({ item }: { item: BackendDelivery }) => {
    const isAssigned = item.status === 'assigned';
    const isAccepted = item.status === 'accepted';
    const isPickedUp = item.status === 'picked_up';
    const isOnTheWay = item.status === 'on_the_way';
    const isDelivered = item.status === 'delivered';
    const isFailed = item.status === 'failed';

    // Find pending offline actions for this delivery
    const pendingAction = offlineQueue.find(
      a => String(a.deliveryId) === String(item.id) && a.syncStatus !== 'SYNCED'
    );

    return (
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.88}
        onPress={() => navigateToOrderDetails(item)}
      >
        <View style={styles.cardHeader}>
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={styles.orderTitle}>Order #{item.order}</Text>
              {pendingAction && (
                <View
                  style={[
                    styles.syncPill,
                    pendingAction.syncStatus === 'SYNCING' && styles.syncingPill,
                    pendingAction.syncStatus === 'NEEDS_REVIEW' && styles.needsReviewPill,
                    pendingAction.syncStatus === 'SYNC_FAILED' && styles.syncFailedPill,
                  ]}
                >
                  <Ionicons
                    name={
                      pendingAction.syncStatus === 'SYNCING'
                        ? 'sync-outline'
                        : pendingAction.syncStatus === 'NEEDS_REVIEW'
                        ? 'alert-circle-outline'
                        : 'cloud-offline-outline'
                    }
                    size={11}
                    color={
                      pendingAction.syncStatus === 'SYNCING'
                        ? '#2563EB'
                        : pendingAction.syncStatus === 'NEEDS_REVIEW'
                        ? '#D97706'
                        : '#DC2626'
                    }
                  />
                  <Text
                    style={[
                      styles.syncPillText,
                      pendingAction.syncStatus === 'SYNCING' && { color: '#2563EB' },
                      pendingAction.syncStatus === 'NEEDS_REVIEW' && { color: '#D97706' },
                      pendingAction.syncStatus === 'SYNC_FAILED' && { color: '#DC2626' },
                    ]}
                  >
                    {pendingAction.syncStatus.replace(/_/g, ' ')}
                  </Text>
                </View>
              )}
            </View>
            <Text style={styles.clientText}>
              {item.order_details?.company_name || item.order_details?.customer_name || 'Counter Order'}
            </Text>
          </View>
          <View style={[styles.statusPill, isDelivered && styles.deliveredPill, isFailed && styles.failedPill]}>
            <Text style={[styles.statusText, isDelivered && styles.deliveredText, isFailed && styles.failedText]}>
              {item.status.toUpperCase()}
            </Text>
          </View>
        </View>

        <View style={styles.cardBody}>
          <Text style={styles.addressLine}>
            <Ionicons name="location-outline" size={14} color="#8E8278" />{' '}
            {item.order_details?.delivery_address || 'Shop delivery'}
          </Text>
          <Text style={styles.itemsLine}>
            {item.order_details?.items && item.order_details.items.length > 0
              ? item.order_details.items.map(i => `${i.quantity}x ${i.product_details?.name || 'Item'}`).join(' • ')
              : 'Delivery Package'}
          </Text>
        </View>

        {/* Action Controls for Delivery Partner */}
        <View style={styles.cardActions}>
          {isAssigned && (
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: '#059669' }]}
              onPress={() => handleStatusTransition(item, 'accepted')}
              disabled={actionInProgress}
            >
              <Ionicons name="checkmark-circle-outline" size={16} color="#FFFFFF" style={{ marginRight: 4 }} />
              <Text style={styles.actionBtnText}>Accept Task</Text>
            </TouchableOpacity>
          )}

          {isAccepted && (
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: '#8C331A' }]}
              onPress={() => handleStatusTransition(item, 'picked_up')}
              disabled={actionInProgress}
            >
              <Ionicons name="cube-outline" size={16} color="#FFFFFF" style={{ marginRight: 4 }} />
              <Text style={styles.actionBtnText}>Confirm Pickup</Text>
            </TouchableOpacity>
          )}

          {isPickedUp && (
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: '#2563EB' }]}
              onPress={() => handleStatusTransition(item, 'on_the_way')}
              disabled={actionInProgress}
            >
              <Ionicons name="navigate-outline" size={16} color="#FFFFFF" style={{ marginRight: 4 }} />
              <Text style={styles.actionBtnText}>Start Trip (On The Way)</Text>
            </TouchableOpacity>
          )}

          {isOnTheWay && (
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: '#059669' }]}
              onPress={() => navigateToOrderDetails(item)}
              disabled={actionInProgress}
            >
              <Ionicons name="receipt-outline" size={16} color="#FFFFFF" style={{ marginRight: 4 }} />
              <Text style={styles.actionBtnText}>View Details / Deliver</Text>
            </TouchableOpacity>
          )}

          {isDelivered && (
            <View style={styles.completedNotice}>
              <Ionicons name="checkmark-circle" size={16} color="#059669" style={{ marginRight: 4 }} />
              <Text style={styles.completedNoticeText}>Fulfillment Completed</Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <DeliveryHeader title="My Deliveries" />

      {/* Offline Action Banner if queued items exist */}
      {offlineQueue.length > 0 && (
        <View style={styles.offlineBanner}>
          <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, gap: 8 }}>
            <Ionicons name="cloud-offline-outline" size={18} color="#92400E" />
            <Text style={styles.offlineBannerText}>
              {offlineQueue.length} action{offlineQueue.length > 1 ? 's' : ''} saved offline
            </Text>
          </View>
          <TouchableOpacity
            style={styles.syncNowBtn}
            onPress={handleTriggerSync}
            disabled={isSyncing}
          >
            {isSyncing ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={styles.syncNowBtnText}>Sync Now</Text>
            )}
          </TouchableOpacity>
        </View>
      )}

      {/* Status Filter Tabs */}
      <View style={styles.tabsContainer}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={tabs}
          keyExtractor={t => t}
          renderItem={({ item: tab }) => (
            <TouchableOpacity
              style={[styles.tabChip, activeTab === tab && styles.tabChipActive]}
              onPress={() => setActiveTab(tab)}
            >
              <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
                {tab.replace(/_/g, ' ')}
              </Text>
            </TouchableOpacity>
          )}
        />
      </View>

      {/* Main List */}
      {loading ? (
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color="#059669" />
        </View>
      ) : filteredDeliveries.length === 0 ? (
        <EmptyState
          title="No Deliveries Found"
          subtitle="You have no assigned deliveries matching this status."
        />
      ) : (
        <FlatList
          data={filteredDeliveries}
          keyExtractor={item => String(item.id)}
          renderItem={renderDeliveryCard}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#059669']} />
          }
        />
      )}

      {/* Record Actual Delivered Quantities Modal */}
      <Modal visible={recordModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Confirm Delivered Quantities</Text>
              <TouchableOpacity onPress={() => setRecordModalVisible(false)}>
                <Ionicons name="close" size={24} color="#2A2421" />
              </TouchableOpacity>
            </View>
            <Text style={styles.modalSubtitle}>
              Record the actual cups / flasks delivered for owner invoice verification.
            </Text>

            {selectedDelivery?.order_details?.items?.map(it => {
              const orderedQty = it.quantity;
              const rawVal = deliveredQuantities[it.product];
              const deliveredQty = parseQtyValue(rawVal, orderedQty);
              const diff = deliveredQty - orderedQty;
              const displayVal = rawVal !== undefined ? rawVal : String(orderedQty);

              return (
                <View key={it.id} style={styles.qtyRow}>
                  <View style={{ flex: 1, paddingRight: 8 }}>
                    <Text style={styles.itemTitle}>{it.product_details?.name || 'Item'}</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 }}>
                      <Text style={styles.itemSub}>Ordered: {orderedQty}</Text>
                      {diff < 0 ? (
                        <View style={styles.diffPillPending}>
                          <Text style={styles.diffPillTextPending}>Pending: {Math.abs(diff)}</Text>
                        </View>
                      ) : diff > 0 ? (
                        <View style={styles.diffPillExtra}>
                          <Text style={styles.diffPillTextExtra}>Extra: +{diff}</Text>
                        </View>
                      ) : (
                        <View style={styles.diffPillExact}>
                          <Text style={styles.diffPillTextExact}>Exact Match</Text>
                        </View>
                      )}
                    </View>
                  </View>
                  <View style={styles.stepper}>
                    <TouchableOpacity style={styles.stepBtn} onPress={() => handleQtyAdjust(it.product, -1)}>
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
                      editable={!actionInProgress}
                    />
                    <TouchableOpacity style={styles.stepBtn} onPress={() => handleQtyAdjust(it.product, 1)}>
                      <Text style={styles.stepBtnText}>+</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })}

            <TextInput
              style={styles.notesInput}
              placeholder="Discrepancy notes (e.g. 2 flasks spilled / client refused)"
              placeholderTextColor="#8E8278"
              value={discrepancyNotes}
              onChangeText={setDiscrepancyNotes}
            />

            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 8 }}>
              <TouchableOpacity
                style={styles.resetBtn}
                onPress={handleResetQuantities}
                disabled={actionInProgress}
              >
                <Ionicons name="refresh-outline" size={16} color="#DC2626" style={{ marginRight: 4 }} />
                <Text style={styles.resetBtnText}>Reset</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.confirmDeliverBtn, { flex: 1, marginTop: 0 }]}
                onPress={handleConfirmDelivered}
                disabled={actionInProgress}
              >
                {actionInProgress ? (
                  <ActivityIndicator color="#FFFFFF" />
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
  tabsContainer: {
    paddingHorizontal: 16,
    marginVertical: 10,
  },
  tabChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#EFEAE4',
  },
  tabChipActive: {
    backgroundColor: '#059669',
    borderColor: '#059669',
  },
  tabText: {
    fontSize: 11,
    color: '#8E8278',
    fontWeight: '700',
  },
  tabTextActive: {
    color: '#FFFFFF',
  },
  centerBox: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 80,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#EFEAE4',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  orderTitle: {
    fontSize: 13,
    color: '#8E8278',
    fontWeight: '700',
  },
  clientText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#2A2421',
    marginTop: 2,
  },
  statusPill: {
    backgroundColor: '#F5EBE6',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#8C331A',
  },
  deliveredPill: {
    backgroundColor: '#ECFDF5',
  },
  deliveredText: {
    color: '#059669',
  },
  failedPill: {
    backgroundColor: '#FEF2F2',
  },
  failedText: {
    color: '#DC2626',
  },
  cardBody: {
    marginVertical: 10,
  },
  addressLine: {
    fontSize: 12,
    color: '#8E8278',
    marginBottom: 4,
  },
  itemsLine: {
    fontSize: 13,
    fontWeight: '500',
    color: '#2A2421',
  },
  cardActions: {
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#FAF8F5',
  },
  actionBtn: {
    flexDirection: 'row',
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  completedNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
  },
  completedNoticeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#059669',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#2A2421',
  },
  modalSubtitle: {
    fontSize: 12,
    color: '#8E8278',
    marginTop: 4,
    marginBottom: 14,
  },
  qtyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#FAF8F5',
  },
  itemTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#2A2421',
  },
  itemSub: {
    fontSize: 11,
    color: '#8E8278',
    marginTop: 1,
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stepBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#FAF8F5',
    borderWidth: 1,
    borderColor: '#EFEAE4',
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#059669',
  },
  stepVal: {
    fontSize: 14,
    fontWeight: '800',
    color: '#2A2421',
    marginHorizontal: 12,
    minWidth: 18,
    textAlign: 'center',
  },
  stepInput: {
    fontSize: 14,
    fontWeight: '800',
    color: '#2A2421',
    marginHorizontal: 6,
    minWidth: 40,
    height: 32,
    textAlign: 'center',
    backgroundColor: '#FAF8F5',
    borderWidth: 1,
    borderColor: '#EFEAE4',
    borderRadius: 8,
    paddingVertical: 0,
    paddingHorizontal: 4,
  },
  diffPillPending: {
    backgroundColor: '#FEF2F2',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  diffPillTextPending: {
    fontSize: 10,
    fontWeight: '700',
    color: '#DC2626',
  },
  diffPillExtra: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  diffPillTextExtra: {
    fontSize: 10,
    fontWeight: '700',
    color: '#2563EB',
  },
  diffPillExact: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  diffPillTextExact: {
    fontSize: 10,
    fontWeight: '600',
    color: '#6B7280',
  },
  resetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
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
  offlineBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#FDE68A',
  },
  offlineBannerText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#92400E',
  },
  syncNowBtn: {
    backgroundColor: '#D97706',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  syncNowBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
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
  notesInput: {
    backgroundColor: '#FAF8F5',
    borderWidth: 1,
    borderColor: '#EFEAE4',
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 44,
    fontSize: 13,
    color: '#2A2421',
    marginTop: 12,
    marginBottom: 16,
  },
  confirmDeliverBtn: {
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
});
