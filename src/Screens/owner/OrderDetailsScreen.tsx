import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Linking,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';
import orderService, { BackendOrder, OrderInvoicePreview } from '../../services/order.service';
import deliveryService, { BackendDelivery, DeliveryPartnerProfile } from '../../services/delivery.service';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import AppToast from '../../utils/toast';
import { colors, typography, radius, spacing, shadows } from '../../theme';

export default function OrderDetailsScreen({ route, navigation }: any) {
  const initialOrder: BackendOrder | undefined = route.params?.order;
  const orderId = route.params?.orderId || initialOrder?.id;

  const [order, setOrder] = useState<BackendOrder | null>(initialOrder || null);
  const [delivery, setDelivery] = useState<BackendDelivery | null>(null);
  const [deliveryPartners, setDeliveryPartners] = useState<DeliveryPartnerProfile[]>([]);
  const [loading, setLoading] = useState<boolean>(!initialOrder);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  // Modals state
  const [assignPartnerModalVisible, setAssignPartnerModalVisible] = useState<boolean>(false);
  const [assigning, setAssigning] = useState<boolean>(false);

  // Manual Invoicing Preview State
  const [invoicePreviewVisible, setInvoicePreviewVisible] = useState<boolean>(false);
  const [previewLoading, setPreviewLoading] = useState<boolean>(false);
  const [invoicePreview, setInvoicePreview] = useState<OrderInvoicePreview | null>(null);
  const [generatingInvoice, setGeneratingInvoice] = useState<boolean>(false);

  // Centralized Confirm Dialog
  const [confirmDialogConfig, setConfirmDialogConfig] = useState<{
    visible: boolean;
    title: string;
    description?: string;
    confirmLabel?: string;
    cancelLabel?: string;
    type?: 'danger' | 'warning' | 'info' | 'success';
    icon?: string;
    onConfirm: () => void;
  }>({
    visible: false,
    title: '',
    onConfirm: () => {},
  });

  const loadOrderAndDelivery = useCallback(async () => {
    if (!orderId) return;
    try {
      const [orderRes, deliveriesRes, partnersRes] = await Promise.all([
        orderService.getOrderById(orderId),
        deliveryService.getDeliveries({ order: orderId }),
        deliveryService.getDeliveryPartners(),
      ]);

      if (orderRes) setOrder(orderRes);
      if (deliveriesRes && deliveriesRes.length > 0) {
        setDelivery(deliveriesRes[0]);
      }
      if (partnersRes) setDeliveryPartners(partnersRes);
    } catch (err: any) {
      console.log('Error loading order details:', err);
      AppToast.error('Error', err?.message || 'Failed to load order details.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [orderId]);

  useEffect(() => {
    loadOrderAndDelivery();
    const unsubscribe = navigation.addListener?.('focus', () => {
      loadOrderAndDelivery();
    });
    return unsubscribe;
  }, [navigation, loadOrderAndDelivery]);

  const onRefresh = () => {
    setRefreshing(true);
    loadOrderAndDelivery();
  };

  // Actions
  const handleCall = () => {
    const phone = order?.customer_phone;
    if (phone) {
      Linking.openURL(`tel:${phone}`).catch(() => {
        AppToast.error('Call Error', 'Could not initiate phone call.');
      });
    }
  };

  const handleOpenMaps = () => {
    const address = order?.delivery_address;
    if (address) {
      const query = encodeURIComponent(address);
      Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${query}`).catch(() => {
        AppToast.error('Maps Error', 'Could not open maps.');
      });
    }
  };

  const handleAssignPartner = async (partner: DeliveryPartnerProfile) => {
    if (!delivery) {
      AppToast.warning('Delivery Missing', 'Delivery container not initialized for this order.');
      return;
    }

    try {
      setAssigning(true);
      await deliveryService.assignDriver(delivery.id, partner.id);
      setAssignPartnerModalVisible(false);
      AppToast.success('Partner Assigned', `Order assigned to ${partner.name}.`);
      loadOrderAndDelivery();
    } catch (err: any) {
      AppToast.error('Assignment Failed', err?.message || 'Failed to assign partner.');
    } finally {
      setAssigning(false);
    }
  };

  const handleCancelOrder = () => {
    if (!order) return;
    setConfirmDialogConfig({
      visible: true,
      title: 'Cancel Order?',
      description: `Are you sure you want to cancel Order #${order.id}? This action cannot be reversed.`,
      confirmLabel: 'Cancel Order',
      cancelLabel: 'Keep Order',
      type: 'danger',
      icon: 'close-circle-outline',
      onConfirm: async () => {
        try {
          await orderService.updateOrderStatus(order.id, 'cancelled');
          AppToast.info('Order Cancelled', `Order #${order.id} has been cancelled.`);
          loadOrderAndDelivery();
        } catch (err: any) {
          AppToast.error('Cancellation Failed', err?.message || 'Could not cancel order.');
        } finally {
          setConfirmDialogConfig(prev => ({ ...prev, visible: false }));
        }
      },
    });
  };

  const handleOpenInvoicePreview = async () => {
    if (!order) return;
    try {
      setPreviewLoading(true);
      setInvoicePreviewVisible(true);
      const preview = await orderService.getInvoicePreview(order.id);
      setInvoicePreview(preview);
    } catch (err: any) {
      AppToast.error('Preview Error', err?.message || 'Failed to load invoice preview.');
      setInvoicePreviewVisible(false);
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleConfirmGenerateInvoice = async () => {
    if (!order) return;
    setConfirmDialogConfig({
      visible: true,
      title: 'Generate Official Invoice?',
      description: `Issue official tax invoice for Order #${order.id} (${order.customer_name}) and debit customer ledger?`,
      confirmLabel: 'Issue Invoice',
      cancelLabel: 'Cancel',
      type: 'info',
      icon: 'receipt-outline',
      onConfirm: async () => {
        try {
          setGeneratingInvoice(true);
          const result = await orderService.generateManualInvoice(order.id);
          setInvoicePreviewVisible(false);
          AppToast.success('Invoice Generated', `Invoice #${result.invoice_number || 'Issued'} debited to customer ledger.`);
          loadOrderAndDelivery();
        } catch (err: any) {
          AppToast.error('Invoicing Failed', err?.message || 'Failed to issue invoice.');
        } finally {
          setGeneratingInvoice(false);
          setConfirmDialogConfig(prev => ({ ...prev, visible: false }));
        }
      },
    });
  };

  const handleOpenDeliveryTracking = () => {
    if (delivery) {
      navigation.navigate('DeliveryTracking', { deliveryId: delivery.id });
    }
  };

  if (loading || !order) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={22} color="#8C331A" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Order Details</Text>
        </View>
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color="#8C331A" />
          <Text style={styles.loadingText}>Loading order details...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Delivery status badge helper
  const deliveryStatus = delivery?.status || order.delivery_status || 'assigned';
  const getDeliveryStatusColor = (st: string) => {
    switch (st) {
      case 'delivered':
        return '#059669';
      case 'on_the_way':
        return '#3B82F6';
      case 'picked_up':
      case 'accepted':
        return '#D97706';
      case 'failed':
        return '#DC2626';
      default:
        return '#6B7280';
    }
  };

  // Order status badge helper
  const getOrderStatusColor = (st: string) => {
    switch (st) {
      case 'delivered':
        return '#059669';
      case 'out_for_delivery':
      case 'preparing':
      case 'accepted':
        return '#D97706';
      case 'cancelled':
        return '#DC2626';
      default:
        return '#8C331A';
    }
  };

  // Timeline events
  const timelineEvents = [
    { label: 'Order Created', time: order.created_at, completed: true, icon: 'receipt-outline' },
    {
      label: 'Partner Assigned',
      time: delivery?.driver ? delivery.updated_at : null,
      completed: !!(delivery?.driver || order.delivery_partner_id),
      icon: 'person-add-outline',
    },
    {
      label: 'Accepted by Partner',
      time: delivery?.status === 'accepted' || delivery?.pickup_time ? delivery?.updated_at : null,
      completed: ['accepted', 'picked_up', 'on_the_way', 'delivered'].includes(deliveryStatus),
      icon: 'checkbox-outline',
    },
    {
      label: 'Picked Up',
      time: delivery?.pickup_time,
      completed: ['picked_up', 'on_the_way', 'delivered'].includes(deliveryStatus),
      icon: 'bag-check-outline',
    },
    {
      label: 'On The Way',
      time: deliveryStatus === 'on_the_way' || deliveryStatus === 'delivered' ? delivery?.updated_at : null,
      completed: ['on_the_way', 'delivered'].includes(deliveryStatus),
      icon: 'bicycle-outline',
    },
    {
      label: deliveryStatus === 'failed' ? 'Delivery Failed' : 'Delivered',
      time: delivery?.delivered_time,
      completed: deliveryStatus === 'delivered' || deliveryStatus === 'failed',
      icon: deliveryStatus === 'failed' ? 'alert-circle-outline' : 'checkmark-done-circle-outline',
      isDanger: deliveryStatus === 'failed',
    },
  ];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Top Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} activeOpacity={0.7}>
            <Ionicons name="arrow-back" size={20} color="#8C331A" />
          </TouchableOpacity>
          <View>
            <Text style={styles.headerTitle}>Order #{order.id}</Text>
            <Text style={styles.headerSubtitle}>{new Date(order.created_at).toLocaleString()}</Text>
          </View>
        </View>

        <View style={[styles.statusBadge, { backgroundColor: `${getOrderStatusColor(order.status)}15` }]}>
          <Text style={[styles.statusBadgeText, { color: getOrderStatusColor(order.status) }]}>
            {order.status.replace(/_/g, ' ').toUpperCase()}
          </Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* 1. Customer Details Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.cardHeaderTitleRow}>
              <Ionicons name="person-outline" size={16} color="#8C331A" style={{ marginRight: 6 }} />
              <Text style={styles.cardHeading}>CUSTOMER DETAILS</Text>
            </View>
            {order.customer_phone ? (
              <TouchableOpacity style={styles.phonePill} onPress={handleCall} activeOpacity={0.7}>
                <Ionicons name="call" size={12} color="#8C331A" style={{ marginRight: 4 }} />
                <Text style={styles.phonePillText}>Call</Text>
              </TouchableOpacity>
            ) : null}
          </View>

          <Text style={styles.customerName}>{order.customer_name}</Text>
          {order.customer_phone ? (
            <Text style={styles.customerPhone}>{order.customer_phone}</Text>
          ) : (
            <Text style={styles.noPhoneText}>No contact phone provided</Text>
          )}

          <TouchableOpacity style={styles.addressBox} onPress={handleOpenMaps} activeOpacity={0.7}>
            <Ionicons name="location-outline" size={16} color="#8C331A" style={{ marginRight: 8, marginTop: 1 }} />
            <Text style={styles.addressText} numberOfLines={2}>
              {order.delivery_address || 'Walk-in / Direct Company Delivery'}
            </Text>
          </TouchableOpacity>

          {order.notes ? (
            <View style={styles.notesBox}>
              <Ionicons name="document-text-outline" size={14} color="#8E8278" style={{ marginRight: 6 }} />
              <Text style={styles.notesText}>{order.notes}</Text>
            </View>
          ) : null}
        </View>

        {/* 2. Order Items Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.cardHeaderTitleRow}>
              <Ionicons name="cart-outline" size={16} color="#8C331A" style={{ marginRight: 6 }} />
              <Text style={styles.cardHeading}>ORDER ITEMS ({order.items?.length || 0})</Text>
            </View>
            <Text style={styles.orderTotalHeader}>₹{parseFloat(order.total_amount).toLocaleString()}</Text>
          </View>

          <View style={styles.itemsList}>
            {order.items?.map((item, idx) => {
              const lineTotal = (parseFloat(item.price) * item.quantity).toFixed(2);
              return (
                <View key={item.id || idx} style={styles.itemRow}>
                  <View style={{ flex: 1, marginRight: 8 }}>
                    <Text style={styles.itemName}>
                      {item.product_details?.name || `Product #${item.product}`}
                    </Text>
                    <Text style={styles.itemRate}>
                      {item.quantity} units × ₹{item.price}
                    </Text>
                  </View>
                  <Text style={styles.itemLineTotal}>₹{lineTotal}</Text>
                </View>
              );
            })}
          </View>

          <View style={styles.totalRow}>
            <Text style={styles.grandLabel}>Total Order Amount</Text>
            <Text style={styles.grandValue}>₹{parseFloat(order.total_amount).toLocaleString()}</Text>
          </View>
        </View>

        {/* 3. Delivery Details Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.cardHeaderTitleRow}>
              <Ionicons name="bicycle-outline" size={16} color="#8C331A" style={{ marginRight: 6 }} />
              <Text style={styles.cardHeading}>DELIVERY DETAILS</Text>
            </View>
            <View style={[styles.statusBadge, { backgroundColor: `${getDeliveryStatusColor(deliveryStatus)}15` }]}>
              <Text style={[styles.statusBadgeText, { color: getDeliveryStatusColor(deliveryStatus) }]}>
                {deliveryStatus.replace(/_/g, ' ').toUpperCase()}
              </Text>
            </View>
          </View>

          <View style={styles.partnerInfoRow}>
            <View style={styles.partnerAvatar}>
              <Ionicons name="person" size={18} color="#8C331A" />
            </View>
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={styles.partnerName}>
                {delivery?.driver_details
                  ? `${delivery.driver_details.first_name} ${delivery.driver_details.last_name}`.trim() || delivery.driver_details.username
                  : order.delivery_partner_name || 'No partner assigned'}
              </Text>
              <Text style={styles.partnerSubtext}>
                {delivery?.driver_details?.phone || (delivery?.driver ? 'Assigned Driver' : 'Pending partner assignment')}
              </Text>
            </View>

            <TouchableOpacity
              style={styles.reassignBtn}
              onPress={() => setAssignPartnerModalVisible(true)}
              activeOpacity={0.7}
            >
              <Text style={styles.reassignBtnText}>
                {delivery?.driver || order.delivery_partner_id ? 'Reassign' : 'Assign'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Delivered quantities verification if available */}
          {delivery?.delivered_items && delivery.delivered_items.length > 0 && (
            <View style={styles.deliveredItemsSection}>
              <Text style={styles.deliveredSubheading}>Delivered Quantities Verification:</Text>
              {delivery.delivered_items.map((dItem, idx) => (
                <View key={dItem.id || idx} style={styles.deliveredItemRow}>
                  <Text style={styles.deliveredItemName}>{dItem.product_name}</Text>
                  <Text
                    style={[
                      styles.deliveredItemQty,
                      dItem.has_discrepancy && styles.discrepancyText,
                    ]}
                  >
                    {dItem.delivered_quantity} / {dItem.ordered_quantity} delivered
                    {dItem.discrepancy_notes ? ` (${dItem.discrepancy_notes})` : ''}
                  </Text>
                </View>
              ))}
            </View>
          )}

          {/* Live Delivery History Link */}
          {delivery && (
            <TouchableOpacity
              style={styles.viewTrackingHistoryBtn}
              onPress={handleOpenDeliveryTracking}
              activeOpacity={0.7}
            >
              <Ionicons name="navigate-circle-outline" size={16} color="#8C331A" style={{ marginRight: 6 }} />
              <Text style={styles.viewTrackingHistoryText}>View Live Tracking & Status History →</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* 4. Order Timeline */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.cardHeaderTitleRow}>
              <Ionicons name="time-outline" size={16} color="#8C331A" style={{ marginRight: 6 }} />
              <Text style={styles.cardHeading}>ORDER TIMELINE</Text>
            </View>
          </View>

          <View style={styles.timelineList}>
            {timelineEvents.map((evt, idx) => {
              const isLast = idx === timelineEvents.length - 1;
              return (
                <View key={idx} style={styles.timelineItem}>
                  <View style={styles.timelineLeftCol}>
                    <View
                      style={[
                        styles.timelineIconCircle,
                        evt.completed && styles.timelineIconCircleCompleted,
                        evt.isDanger && styles.timelineIconCircleDanger,
                      ]}
                    >
                      <Ionicons
                        name={evt.icon as any}
                        size={12}
                        color={evt.completed ? (evt.isDanger ? '#DC2626' : '#059669') : '#A0958D'}
                      />
                    </View>
                    {!isLast && (
                      <View
                        style={[
                          styles.timelineLine,
                          evt.completed && styles.timelineLineCompleted,
                        ]}
                      />
                    )}
                  </View>

                  <View style={styles.timelineContent}>
                    <Text
                      style={[
                        styles.timelineEventLabel,
                        evt.completed && styles.timelineEventLabelCompleted,
                        evt.isDanger && { color: '#DC2626' },
                      ]}
                    >
                      {evt.label}
                    </Text>
                    {evt.time ? (
                      <Text style={styles.timelineEventTime}>
                        {new Date(evt.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </Text>
                    ) : (
                      <Text style={styles.timelineEventPending}>Pending</Text>
                    )}
                  </View>
                </View>
              );
            })}
          </View>
        </View>

        {/* 5. Invoicing & Billing Integration */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.cardHeaderTitleRow}>
              <Ionicons name="receipt-outline" size={16} color="#8C331A" style={{ marginRight: 6 }} />
              <Text style={styles.cardHeading}>INVOICE & BILLING</Text>
            </View>
          </View>

          {order.has_invoice ? (
            <View style={styles.invoicedBox}>
              <Ionicons name="checkmark-circle" size={20} color="#059669" style={{ marginRight: 8 }} />
              <View style={{ flex: 1 }}>
                <Text style={styles.invoicedTitle}>Official Invoice Issued</Text>
                <Text style={styles.invoicedSubtitle}>
                  Invoice #{order.invoice_number || 'Generated'} has been debited to customer ledger.
                </Text>
              </View>
            </View>
          ) : (
            <View style={styles.notInvoicedBox}>
              <Text style={styles.notInvoicedText}>
                No official tax invoice generated yet. Invoices are manually generated by the Owner after verifying actual delivered quantities.
              </Text>
              <TouchableOpacity
                style={styles.generateInvoiceBtn}
                onPress={handleOpenInvoicePreview}
                activeOpacity={0.8}
              >
                <Ionicons name="document-text" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
                <Text style={styles.generateInvoiceBtnText}>Review & Issue Invoice</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* 6. Owner Actions */}
        <View style={styles.actionsWrap}>
          {order.status !== 'cancelled' && order.status !== 'delivered' && (
            <TouchableOpacity
              style={styles.cancelOrderBtn}
              onPress={handleCancelOrder}
              activeOpacity={0.7}
            >
              <Ionicons name="close-circle-outline" size={16} color="#DC2626" style={{ marginRight: 6 }} />
              <Text style={styles.cancelOrderBtnText}>Cancel Order</Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>

      {/* Assign Partner Modal */}
      <Modal visible={assignPartnerModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Assign Delivery Partner</Text>
              <TouchableOpacity onPress={() => setAssignPartnerModalVisible(false)}>
                <Ionicons name="close" size={22} color="#2A2421" />
              </TouchableOpacity>
            </View>

            {assigning ? (
              <View style={[styles.centerBox, { height: 160 }]}>
                <ActivityIndicator color="#8C331A" size="large" />
                <Text style={styles.loadingText}>Assigning driver...</Text>
              </View>
            ) : deliveryPartners.length === 0 ? (
              <View style={[styles.centerBox, { height: 160 }]}>
                <Ionicons name="people-outline" size={32} color="#C4BCB5" />
                <Text style={styles.emptyText}>No delivery partners registered in fleet.</Text>
              </View>
            ) : (
              <ScrollView style={{ maxHeight: 300 }}>
                {deliveryPartners.map(partner => (
                  <TouchableOpacity
                    key={partner.id}
                    style={styles.partnerSelectRow}
                    onPress={() => handleAssignPartner(partner)}
                  >
                    <View style={styles.partnerAvatar}>
                      <Ionicons name="bicycle" size={18} color="#8C331A" />
                    </View>
                    <View style={{ flex: 1, marginLeft: 10 }}>
                      <Text style={styles.partnerName}>{partner.name}</Text>
                      <Text style={styles.partnerSubtext}>{partner.phone} • {partner.vehicle_type}</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color="#8E8278" />
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {/* Manual Invoicing Preview Modal */}
      <Modal visible={invoicePreviewVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.invoiceModalCard}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Invoice Review</Text>
                <Text style={styles.modalSubtitle}>Order #{order.id} • {order.customer_name}</Text>
              </View>
              <TouchableOpacity onPress={() => setInvoicePreviewVisible(false)}>
                <Ionicons name="close" size={22} color="#2A2421" />
              </TouchableOpacity>
            </View>

            {previewLoading ? (
              <View style={[styles.centerBox, { height: 200 }]}>
                <ActivityIndicator size="large" color="#8C331A" />
                <Text style={styles.loadingText}>Resolving rates & discrepancy audit...</Text>
              </View>
            ) : invoicePreview ? (
              <ScrollView style={{ maxHeight: 420 }}>
                <View style={styles.auditNotice}>
                  <Ionicons name="shield-checkmark" size={16} color="#059669" style={{ marginRight: 6 }} />
                  <Text style={styles.auditNoticeText}>Backend resolved rates and delivery discrepancies applied.</Text>
                </View>

                {invoicePreview.items.map((it, idx) => (
                  <View key={it.product_id || idx} style={styles.previewItemRow}>
                    <View style={{ flex: 1, marginRight: 8 }}>
                      <Text style={styles.previewItemName}>{it.product_name}</Text>
                      <Text style={styles.previewItemQty}>
                        Invoicing: {it.recommended_quantity} units
                        {it.has_discrepancy ? ` (Ordered: ${it.ordered_quantity})` : ''}
                      </Text>
                      {it.has_discrepancy && (
                        <Text style={styles.discrepancyAlert}>
                          ⚠️ Delivery actuals applied ({it.recommended_quantity} units)
                        </Text>
                      )}
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={styles.previewItemPrice}>₹{it.line_total}</Text>
                      <Text style={styles.previewItemRate}>@ ₹{it.effective_rate}/ea</Text>
                    </View>
                  </View>
                ))}

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

                <TouchableOpacity
                  style={styles.confirmGenerateBtn}
                  onPress={handleConfirmGenerateInvoice}
                  disabled={generatingInvoice}
                  activeOpacity={0.8}
                >
                  {generatingInvoice ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <>
                      <Ionicons name="checkmark-circle" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
                      <Text style={styles.confirmGenerateBtnText}>Confirm & Issue Official Invoice</Text>
                    </>
                  )}
                </TouchableOpacity>
              </ScrollView>
            ) : null}
          </View>
        </View>
      </Modal>

      {/* Reusable Centralized ConfirmDialog */}
      <ConfirmDialog
        visible={confirmDialogConfig.visible}
        title={confirmDialogConfig.title}
        description={confirmDialogConfig.description}
        confirmLabel={confirmDialogConfig.confirmLabel}
        cancelLabel={confirmDialogConfig.cancelLabel}
        type={confirmDialogConfig.type}
        icon={confirmDialogConfig.icon}
        onConfirm={confirmDialogConfig.onConfirm}
        onCancel={() => setConfirmDialogConfig(prev => ({ ...prev, visible: false }))}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAF8F5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FAF8F5',
    borderBottomWidth: 1,
    borderBottomColor: '#EFEAE4',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F5EBE6',
    borderWidth: 1,
    borderColor: '#EFE3D9',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#2A2421',
  },
  headerSubtitle: {
    fontSize: 11,
    color: '#8E8278',
    marginTop: 1,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  centerBox: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 13,
    color: '#8E8278',
    fontWeight: '600',
  },
  emptyText: {
    marginTop: 10,
    fontSize: 13,
    color: '#8E8278',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#EFEAE4',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#FAF8F5',
  },
  cardHeaderTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardHeading: {
    fontSize: 11,
    fontWeight: '800',
    color: '#8E8278',
    letterSpacing: 0.5,
  },
  phonePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5EBE6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  phonePillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#8C331A',
  },
  customerName: {
    fontSize: 16,
    fontWeight: '800',
    color: '#2A2421',
  },
  customerPhone: {
    fontSize: 13,
    color: '#6B5E55',
    fontWeight: '600',
    marginTop: 2,
  },
  noPhoneText: {
    fontSize: 12,
    color: '#A0958D',
    marginTop: 2,
  },
  addressBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FAF8F5',
    borderRadius: 10,
    padding: 10,
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#EFEAE4',
  },
  addressText: {
    flex: 1,
    fontSize: 12,
    color: '#4B3F38',
    lineHeight: 17,
  },
  notesBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FAF8F5',
    borderRadius: 8,
    padding: 8,
    marginTop: 8,
  },
  notesText: {
    fontSize: 11,
    color: '#6B5E55',
    fontStyle: 'italic',
  },
  orderTotalHeader: {
    fontSize: 15,
    fontWeight: '800',
    color: '#8C331A',
  },
  itemsList: {
    marginTop: 4,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#FAF8F5',
  },
  itemName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#2A2421',
  },
  itemRate: {
    fontSize: 11,
    color: '#8E8278',
    marginTop: 2,
  },
  itemLineTotal: {
    fontSize: 13,
    fontWeight: '800',
    color: '#2A2421',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#EFEAE4',
  },
  grandLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#2A2421',
  },
  grandValue: {
    fontSize: 16,
    fontWeight: '800',
    color: '#8C331A',
  },
  partnerInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  partnerAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F5EBE6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  partnerName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#2A2421',
  },
  partnerSubtext: {
    fontSize: 11,
    color: '#8E8278',
    marginTop: 1,
  },
  reassignBtn: {
    backgroundColor: '#FAF8F5',
    borderWidth: 1,
    borderColor: '#EFEAE4',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  reassignBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#8C331A',
  },
  deliveredItemsSection: {
    marginTop: 12,
    backgroundColor: '#FAF8F5',
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: '#EFEAE4',
  },
  deliveredSubheading: {
    fontSize: 11,
    fontWeight: '700',
    color: '#8E8278',
    marginBottom: 6,
  },
  deliveredItemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 3,
  },
  deliveredItemName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#2A2421',
  },
  deliveredItemQty: {
    fontSize: 12,
    color: '#059669',
    fontWeight: '700',
  },
  discrepancyText: {
    color: '#DC2626',
  },
  viewTrackingHistoryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    paddingVertical: 8,
    backgroundColor: '#FAF8F5',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#EFEAE4',
  },
  viewTrackingHistoryText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#8C331A',
  },
  timelineList: {
    marginTop: 6,
  },
  timelineItem: {
    flexDirection: 'row',
    minHeight: 46,
  },
  timelineLeftCol: {
    width: 24,
    alignItems: 'center',
  },
  timelineIconCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#FAF8F5',
    borderWidth: 1,
    borderColor: '#EFEAE4',
    justifyContent: 'center',
    alignItems: 'center',
  },
  timelineIconCircleCompleted: {
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0',
  },
  timelineIconCircleDanger: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
  },
  timelineLine: {
    width: 2,
    flex: 1,
    backgroundColor: '#EFEAE4',
    marginVertical: 2,
  },
  timelineLineCompleted: {
    backgroundColor: '#10B981',
  },
  timelineContent: {
    flex: 1,
    marginLeft: 10,
    paddingBottom: 14,
  },
  timelineEventLabel: {
    fontSize: 13,
    color: '#8E8278',
    fontWeight: '600',
  },
  timelineEventLabelCompleted: {
    color: '#2A2421',
    fontWeight: '700',
  },
  timelineEventTime: {
    fontSize: 10,
    color: '#8E8278',
    marginTop: 2,
  },
  timelineEventPending: {
    fontSize: 10,
    color: '#C4BCB5',
    marginTop: 2,
  },
  invoicedBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  invoicedTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#065F46',
  },
  invoicedSubtitle: {
    fontSize: 11,
    color: '#047857',
    marginTop: 2,
  },
  notInvoicedBox: {
    backgroundColor: '#FAF8F5',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#EFEAE4',
  },
  notInvoicedText: {
    fontSize: 12,
    color: '#6B5E55',
    lineHeight: 17,
    marginBottom: 10,
  },
  generateInvoiceBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#8C331A',
    borderRadius: 10,
    paddingVertical: 10,
  },
  generateInvoiceBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  actionsWrap: {
    marginTop: 6,
    marginBottom: 20,
  },
  cancelOrderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 12,
    paddingVertical: 12,
  },
  cancelOrderBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#DC2626',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(17, 24, 39, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 8,
  },
  invoiceModalCard: {
    width: '100%',
    maxWidth: 440,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#FAF8F5',
    marginBottom: 10,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#2A2421',
  },
  modalSubtitle: {
    fontSize: 11,
    color: '#8E8278',
    marginTop: 2,
  },
  partnerSelectRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#FAF8F5',
  },
  auditNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    padding: 10,
    borderRadius: 8,
    marginBottom: 10,
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
    fontSize: 13,
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
  confirmGenerateBtn: {
    flexDirection: 'row',
    backgroundColor: '#8C331A',
    borderRadius: 12,
    height: 46,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 4,
    marginBottom: 8,
  },
  confirmGenerateBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
});
