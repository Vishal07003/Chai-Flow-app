import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  FlatList,
  TextInput,
  RefreshControl,
  ActivityIndicator,
  Modal,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { Header, EmptyState } from '../../components/common';
import orderService, { BackendOrder, OrderInvoicePreview } from '../../services/order.service';

const tabs = ['ALL', 'PENDING', 'ACCEPTED', 'OUT_FOR_DELIVERY', 'DELIVERED'];

export default function OrdersScreen({ navigation }: any) {
  const [orders, setOrders] = useState<BackendOrder[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeTab, setActiveTab] = useState<string>('ALL');

  // Manual Invoice Preview & Generation State
  const [selectedOrder, setSelectedOrder] = useState<BackendOrder | null>(null);
  const [previewLoading, setPreviewLoading] = useState<boolean>(false);
  const [invoicePreview, setInvoicePreview] = useState<OrderInvoicePreview | null>(null);
  const [previewModalVisible, setPreviewModalVisible] = useState<boolean>(false);
  const [generating, setGenerating] = useState<boolean>(false);

  const fetchOrders = useCallback(async () => {
    try {
      const data = await orderService.getOrders();
      setOrders(data || []);
    } catch (err: any) {
      console.log('Error fetching orders:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchOrders();
  }, [fetchOrders]);

  const filteredOrders = useMemo(() => {
    return orders.filter(o => {
      const matchesTab =
        activeTab === 'ALL' || o.status.toUpperCase() === activeTab;
      const q = searchQuery.toLowerCase().trim();
      const matchesQuery =
        !q ||
        o.customer_name?.toLowerCase().includes(q) ||
        o.company_name?.toLowerCase().includes(q) ||
        String(o.id).includes(q) ||
        o.delivery_address?.toLowerCase().includes(q);

      return matchesTab && matchesQuery;
    });
  }, [orders, activeTab, searchQuery]);

  // Open Invoice Preview Modal (Owner review before generating official invoice)
  const handleOpenInvoicePreview = async (order: BackendOrder) => {
    try {
      setSelectedOrder(order);
      setPreviewLoading(true);
      setPreviewModalVisible(true);
      const preview = await orderService.getInvoicePreview(order.id);
      setInvoicePreview(preview);
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to load invoice preview.');
      setPreviewModalVisible(false);
    } finally {
      setPreviewLoading(false);
    }
  };

  // Confirm manual invoice generation
  const handleConfirmGenerateInvoice = async () => {
    if (!selectedOrder) return;

    try {
      setGenerating(true);
      const result = await orderService.generateManualInvoice(selectedOrder.id);
      setPreviewModalVisible(false);
      fetchOrders();
      Alert.alert(
        'Invoice Created',
        `Official Invoice #${result.invoice_number || 'Generated'} has been issued and debited to company ledger.`,
      );
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to generate invoice.');
    } finally {
      setGenerating(false);
    }
  };

  const renderOrderItem = ({ item }: { item: BackendOrder }) => {
    const totalNum = parseFloat(item.total_amount) || 0;
    const hasInvoice = item.has_invoice;
    const isDelivered = item.status === 'delivered';

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View>
            <Text style={styles.orderIdText}>Order #{item.id}</Text>
            <Text style={styles.clientName}>
              {item.company_name || item.customer_name}
            </Text>
          </View>
          <View style={styles.statusPill}>
            <Text style={styles.statusPillText}>{item.status.toUpperCase()}</Text>
          </View>
        </View>

        <View style={styles.cardBody}>
          <Text style={styles.addressText} numberOfLines={1}>
            <Ionicons name="location-outline" size={13} color="#8E8278" />{' '}
            {item.delivery_address || 'Shop delivery'}
          </Text>
          <Text style={styles.itemsSummary}>
            {item.items && item.items.length > 0
              ? item.items.map(i => `${i.quantity}x ${i.product_details?.name || 'Item'}`).join(' • ')
              : 'Supply Delivery'}
          </Text>
        </View>

        <View style={styles.cardFooter}>
          <View>
            <Text style={styles.amountLabel}>Total Billable</Text>
            <Text style={styles.amountValue}>₹{totalNum.toLocaleString()}</Text>
          </View>

          {hasInvoice ? (
            <View style={styles.invoicedBadge}>
              <Ionicons name="checkmark-done" size={14} color="#059669" />
              <Text style={styles.invoicedBadgeText}>
                {item.invoice_number || 'INVOICED'}
              </Text>
            </View>
          ) : (
            <TouchableOpacity
              style={styles.generateBtn}
              onPress={() => handleOpenInvoicePreview(item)}
            >
              <Ionicons name="receipt-outline" size={14} color="#FFFFFF" style={{ marginRight: 4 }} />
              <Text style={styles.generateBtnText}>Generate Invoice</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Header
        title="Commercial Orders"
        showBack={false}
      />

      {/* Search Input */}
      <View style={styles.searchBar}>
        <Ionicons name="search-outline" size={18} color="#8E8278" style={{ marginRight: 8 }} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search by order ID, company, customer or address..."
          placeholderTextColor="#8E8278"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery ? (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Ionicons name="close-circle" size={18} color="#8E8278" />
          </TouchableOpacity>
        ) : null}
      </View>

      {/* Filter Tabs */}
      <View style={styles.tabContainer}>
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

      {/* Orders List */}
      {loading ? (
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color="#8C331A" />
        </View>
      ) : filteredOrders.length === 0 ? (
        <EmptyState
          title="No Orders Found"
          subtitle={searchQuery ? "No orders match your search." : "No orders in this category."}
        />
      ) : (
        <FlatList
          data={filteredOrders}
          keyExtractor={item => String(item.id)}
          renderItem={renderOrderItem}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#8C331A']} />
          }
        />
      )}

      {/* Manual Invoice Review Modal */}
      <Modal visible={previewModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Manual Invoice Review</Text>
                <Text style={styles.modalSubtitle}>Order #{selectedOrder?.id} • {selectedOrder?.company_name || selectedOrder?.customer_name}</Text>
              </View>
              <TouchableOpacity onPress={() => setPreviewModalVisible(false)}>
                <Ionicons name="close" size={24} color="#2A2421" />
              </TouchableOpacity>
            </View>

            {previewLoading ? (
              <View style={[styles.centerBox, { height: 200 }]}>
                <ActivityIndicator size="large" color="#8C331A" />
                <Text style={{ marginTop: 10, color: '#8E8278' }}>Resolving company pricing & delivery actuals...</Text>
              </View>
            ) : invoicePreview ? (
              <View style={styles.previewContent}>
                <View style={styles.auditNotice}>
                  <Ionicons name="shield-checkmark" size={16} color="#059669" style={{ marginRight: 6 }} />
                  <Text style={styles.auditNoticeText}>Backend resolved rates and delivery discrepancies applied.</Text>
                </View>

                {/* Items Discrepancy Breakdown */}
                <FlatList
                  data={invoicePreview.items}
                  keyExtractor={it => String(it.product_id)}
                  style={{ maxHeight: 220, marginVertical: 10 }}
                  renderItem={({ item: it }) => (
                    <View style={styles.previewItemRow}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.previewItemName}>{it.product_name}</Text>
                        <Text style={styles.previewItemQty}>
                          Ordered: {it.ordered_quantity} • Delivered: {it.delivered_quantity}
                        </Text>
                        {it.has_discrepancy && (
                          <Text style={styles.discrepancyAlert}>
                            ⚠️ Discrepancy: Invoicing confirmed actuals ({it.recommended_quantity} units)
                          </Text>
                        )}
                      </View>
                      <View style={{ alignItems: 'flex-end' }}>
                        <Text style={styles.previewItemPrice}>₹{it.line_total}</Text>
                        <Text style={styles.previewItemRate}>@ ₹{it.effective_rate}/ea</Text>
                      </View>
                    </View>
                  )}
                />

                {/* Financial Summary */}
                <View style={styles.financialSummaryBox}>
                  <View style={styles.sumRow}>
                    <Text style={styles.sumLabel}>Subtotal</Text>
                    <Text style={styles.sumValue}>₹{invoicePreview.subtotal}</Text>
                  </View>
                  {parseFloat(invoicePreview.discount_total) > 0 && (
                    <View style={styles.sumRow}>
                      <Text style={[styles.sumLabel, { color: '#059669' }]}>Approved Discount</Text>
                      <Text style={[styles.sumValue, { color: '#059669' }]}>- ₹{invoicePreview.discount_total}</Text>
                    </View>
                  )}
                  <View style={[styles.sumRow, { borderTopWidth: 1, borderTopColor: '#EFEAE4', paddingTop: 6, marginTop: 4 }]}>
                    <Text style={styles.grandLabel}>Final Invoiced Total</Text>
                    <Text style={styles.grandValue}>₹{invoicePreview.grand_total}</Text>
                  </View>
                </View>

                {/* Confirm Button */}
                <TouchableOpacity
                  style={styles.confirmGenerateBtn}
                  onPress={handleConfirmGenerateInvoice}
                  disabled={generating}
                >
                  {generating ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <>
                      <Ionicons name="checkmark-circle" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
                      <Text style={styles.confirmGenerateBtnText}>Confirm & Issue Official Invoice</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            ) : null}
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
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginVertical: 10,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44,
    borderWidth: 1,
    borderColor: '#EFEAE4',
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: '#2A2421',
  },
  tabContainer: {
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  tabChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#EFEAE4',
  },
  tabChipActive: {
    backgroundColor: '#8C331A',
    borderColor: '#8C331A',
  },
  tabText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#8E8278',
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
  orderIdText: {
    fontSize: 12,
    color: '#8E8278',
    fontWeight: '700',
  },
  clientName: {
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
  statusPillText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#8C331A',
  },
  cardBody: {
    marginVertical: 10,
  },
  addressText: {
    fontSize: 12,
    color: '#8E8278',
    marginBottom: 4,
  },
  itemsSummary: {
    fontSize: 13,
    color: '#4B3F38',
    fontWeight: '500',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#FAF8F5',
  },
  amountLabel: {
    fontSize: 10,
    color: '#8E8278',
    textTransform: 'uppercase',
  },
  amountValue: {
    fontSize: 16,
    fontWeight: '800',
    color: '#2A2421',
    marginTop: 1,
  },
  invoicedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  invoicedBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#059669',
    marginLeft: 4,
  },
  generateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#8C331A',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
  },
  generateBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
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
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#2A2421',
  },
  modalSubtitle: {
    fontSize: 12,
    color: '#8E8278',
    marginTop: 2,
  },
  previewContent: {
    marginTop: 4,
  },
  auditNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    padding: 10,
    borderRadius: 8,
    marginBottom: 8,
  },
  auditNoticeText: {
    fontSize: 11,
    color: '#065F46',
    fontWeight: '600',
    flex: 1,
  },
  previewItemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#FAF8F5',
  },
  previewItemName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#2A2421',
  },
  previewItemQty: {
    fontSize: 11,
    color: '#8E8278',
    marginTop: 2,
  },
  discrepancyAlert: {
    fontSize: 11,
    color: '#DC2626',
    fontWeight: '600',
    marginTop: 2,
  },
  previewItemPrice: {
    fontSize: 14,
    fontWeight: '800',
    color: '#2A2421',
  },
  previewItemRate: {
    fontSize: 10,
    color: '#8E8278',
  },
  financialSummaryBox: {
    backgroundColor: '#FAF8F5',
    borderRadius: 12,
    padding: 12,
    marginVertical: 12,
  },
  sumRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  sumLabel: {
    fontSize: 12,
    color: '#8E8278',
  },
  sumValue: {
    fontSize: 13,
    fontWeight: '700',
    color: '#2A2421',
  },
  grandLabel: {
    fontSize: 14,
    fontWeight: '800',
    color: '#2A2421',
  },
  grandValue: {
    fontSize: 16,
    fontWeight: '800',
    color: '#8C331A',
  },
  confirmGenerateBtn: {
    flexDirection: 'row',
    backgroundColor: '#8C331A',
    borderRadius: 12,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 6,
  },
  confirmGenerateBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
});
