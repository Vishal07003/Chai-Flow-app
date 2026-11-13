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

const tabs = ['ALL', 'ASSIGNED', 'ACCEPTED', 'PICKED_UP', 'ON_THE_WAY', 'DELIVERED'];

export default function DeliveryOrdersScreen({ navigation }: any) {
  const [deliveries, setDeliveries] = useState<BackendDelivery[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<string>('ALL');

  // Discrepancy Recording & Delivery Completion Modal
  const [selectedDelivery, setSelectedDelivery] = useState<BackendDelivery | null>(null);
  const [recordModalVisible, setRecordModalVisible] = useState<boolean>(false);
  const [deliveredQuantities, setDeliveredQuantities] = useState<{ [productId: number]: number }>({});
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

  useEffect(() => {
    fetchDeliveries();
  }, [fetchDeliveries]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchDeliveries();
  }, [fetchDeliveries]);

  const filteredDeliveries = useMemo(() => {
    if (activeTab === 'ALL') return deliveries;
    return deliveries.filter(d => d.status.toUpperCase() === activeTab);
  }, [deliveries, activeTab]);

  const handleStatusTransition = async (delivery: BackendDelivery, targetStatus: BackendDelivery['status']) => {
    try {
      setActionInProgress(true);
      await deliveryService.updateStatus(delivery.id, targetStatus);
      fetchDeliveries();
      Alert.alert('Status Updated', `Delivery is now '${targetStatus.toUpperCase()}'.`);
    } catch (err: any) {
      Alert.alert('Transition Error', err?.message || 'Failed to update status.');
    } finally {
      setActionInProgress(false);
    }
  };

  const openCompletionModal = (delivery: BackendDelivery) => {
    setSelectedDelivery(delivery);
    const initialQty: { [productId: number]: number } = {};
    if (delivery.order_details?.items) {
      delivery.order_details.items.forEach(it => {
        initialQty[it.product] = it.quantity;
      });
    }
    setDeliveredQuantities(initialQty);
    setDiscrepancyNotes('');
    setRecordModalVisible(true);
  };

  const handleQtyAdjust = (productId: number, delta: number) => {
    setDeliveredQuantities(prev => {
      const current = prev[productId] || 0;
      return { ...prev, [productId]: Math.max(0, current + delta) };
    });
  };

  const handleConfirmDelivered = async () => {
    if (!selectedDelivery) return;

    try {
      setActionInProgress(true);
      // 1. Record actual delivered quantities
      const itemsPayload = Object.entries(deliveredQuantities).map(([pid, qty]) => ({
        product_id: Number(pid),
        delivered_quantity: qty,
        discrepancy_notes: discrepancyNotes.trim(),
      }));

      if (itemsPayload.length > 0) {
        await deliveryService.recordDeliveredQuantities(selectedDelivery.id, itemsPayload);
      }

      // 2. Mark delivery as DELIVERED
      await deliveryService.updateStatus(selectedDelivery.id, 'delivered', discrepancyNotes.trim());

      setRecordModalVisible(false);
      fetchDeliveries();
      Alert.alert('Delivery Completed', 'Actual delivered quantities recorded. Tracking stopped.');
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to complete delivery.');
    } finally {
      setActionInProgress(false);
    }
  };

  const renderDeliveryCard = ({ item }: { item: BackendDelivery }) => {
    const isAssigned = item.status === 'assigned';
    const isAccepted = item.status === 'accepted';
    const isPickedUp = item.status === 'picked_up';
    const isOnTheWay = item.status === 'on_the_way';
    const isDelivered = item.status === 'delivered';
    const isFailed = item.status === 'failed';

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View>
            <Text style={styles.orderTitle}>Order #{item.order}</Text>
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
              onPress={() => openCompletionModal(item)}
              disabled={actionInProgress}
            >
              <Ionicons name="checkmark-done-circle" size={16} color="#FFFFFF" style={{ marginRight: 4 }} />
              <Text style={styles.actionBtnText}>Deliver (Record Quantities)</Text>
            </TouchableOpacity>
          )}

          {isDelivered && (
            <View style={styles.completedNotice}>
              <Ionicons name="checkmark-circle" size={16} color="#059669" style={{ marginRight: 4 }} />
              <Text style={styles.completedNoticeText}>Fulfillment Completed</Text>
            </View>
          )}
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <DeliveryHeader title="My Deliveries" />

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
              const qty = deliveredQuantities[it.product] ?? it.quantity;
              return (
                <View key={it.id} style={styles.qtyRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.itemTitle}>{it.product_details?.name || 'Item'}</Text>
                    <Text style={styles.itemSub}>Ordered: {it.quantity} units</Text>
                  </View>
                  <View style={styles.stepper}>
                    <TouchableOpacity style={styles.stepBtn} onPress={() => handleQtyAdjust(it.product, -1)}>
                      <Text style={styles.stepBtnText}>-</Text>
                    </TouchableOpacity>
                    <Text style={styles.stepVal}>{qty}</Text>
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

            <TouchableOpacity
              style={styles.confirmDeliverBtn}
              onPress={handleConfirmDelivered}
              disabled={actionInProgress}
            >
              {actionInProgress ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.confirmDeliverBtnText}>Confirm Delivery & Record Actuals</Text>
              )}
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
