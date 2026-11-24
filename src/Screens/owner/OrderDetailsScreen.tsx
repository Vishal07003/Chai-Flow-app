import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
import orderService, { BackendOrder } from '../../services/order.service';
import deliveryService, {
  BackendDelivery,
  DeliveryPartnerProfile,
} from '../../services/delivery.service';
import billingService, { BackendInvoice } from '../../services/billing.service';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import AppToast from '../../utils/toast';
import { colors, typography, radius, spacing, shadows } from '../../theme';

export default function OrderDetailsScreen({ route, navigation }: any) {
  const initialOrder: BackendOrder | undefined = route.params?.order;
  const orderId = route.params?.orderId || initialOrder?.id;

  const [order, setOrder] = useState<BackendOrder | null>(initialOrder || null);
  const [delivery, setDelivery] = useState<BackendDelivery | null>(null);
  const [deliveryPartners, setDeliveryPartners] = useState<DeliveryPartnerProfile[]>([]);
  const [existingInvoice, setExistingInvoice] = useState<BackendInvoice | null>(null);
  const [loading, setLoading] = useState<boolean>(!initialOrder);
  const [approving, setApproving] = useState<boolean>(false);
  const [assignPartnerModalVisible, setAssignPartnerModalVisible] = useState<boolean>(false);
  const [assigning, setAssigning] = useState<boolean>(false);

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
        deliveryService.getDeliveries({ order: orderId }).catch(() => []),
        deliveryService.getDeliveryPartners().catch(() => []),
      ]);

      if (orderRes) {
        setOrder(orderRes);
        // If order has an invoice number, fetch invoice details for direct navigation
        if (orderRes.has_invoice || orderRes.invoice_number) {
          billingService
            .getInvoices()
            .then(invs => {
              const matched = invs.find(
                inv =>
                  (orderRes.invoice_number && inv.invoice_number === orderRes.invoice_number) ||
                  (inv.notes && inv.notes.includes(String(orderRes.id)))
              );
              if (matched) setExistingInvoice(matched);
            })
            .catch(() => {});
        }
      }
      if (deliveriesRes && deliveriesRes.length > 0) {
        setDelivery(deliveriesRes[0]);
      }
      if (partnersRes) {
        setDeliveryPartners(partnersRes);
      }
    } catch (err: any) {
      console.log('Error loading order details:', err);
      AppToast.error('Error', err?.message || 'Failed to load order details.');
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    loadOrderAndDelivery();
    const unsubscribe = navigation.addListener?.('focus', () => {
      loadOrderAndDelivery();
    });
    return unsubscribe;
  }, [navigation, loadOrderAndDelivery]);

  // Phone Call
  const handleCall = (phoneNumber?: string) => {
    if (phoneNumber) {
      Linking.openURL(`tel:${phoneNumber}`).catch(() => {
        AppToast.error('Call Error', 'Could not initiate phone call.');
      });
    }
  };

  // Partner Assignment
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

  // Cancel Order
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

  // Owner Review & Approval of Submitted Delivery Quantities
  const handleApproveDeliveredQuantities = () => {
    if (!order) return;
    setConfirmDialogConfig({
      visible: true,
      title: 'Approve Delivered Quantities?',
      description: `Confirm and approve the delivery partner's submitted quantities for Order #${order.id}? This will mark the order as delivered and make it ready for billing.`,
      confirmLabel: 'Approve Quantities',
      cancelLabel: 'Cancel',
      type: 'success',
      icon: 'checkmark-circle-outline',
      onConfirm: async () => {
        try {
          setApproving(true);
          await orderService.updateOrderStatus(order.id, 'delivered');
          AppToast.success('Order Approved', `Order #${order.id} is approved and marked as Delivered.`);
          loadOrderAndDelivery();
        } catch (err: any) {
          AppToast.error('Approval Failed', err?.message || 'Could not approve order.');
        } finally {
          setApproving(false);
          setConfirmDialogConfig(prev => ({ ...prev, visible: false }));
        }
      },
    });
  };

  // Status Badge Metadata
  const getStatusBadge = (st: string) => {
    switch (st) {
      case 'delivered':
        return { label: 'Delivered', bg: '#ECFDF5', text: '#059669', border: '#A7F3D0' };
      case 'cancelled':
        return { label: 'Cancelled', bg: '#FEF2F2', text: '#DC2626', border: '#FECACA' };
      case 'out_for_delivery':
      case 'on_the_way':
      case 'picked_up':
        return { label: 'Out for Delivery', bg: '#EFF6FF', text: '#2563EB', border: '#BFDBFE' };
      case 'preparing':
      case 'accepted':
        return { label: 'In Progress', bg: '#FDF4FF', text: '#9333EA', border: '#F5D0FE' };
      case 'assigned':
        return { label: 'Assigned', bg: '#FEF3C7', text: '#D97706', border: '#FDE68A' };
      default:
        return { label: 'Pending', bg: '#FFFBEB', text: '#B45309', border: '#FDE68A' };
    }
  };

  // Delivery partner details
  const partnerName =
    delivery?.driver_details
      ? `${delivery.driver_details.first_name} ${delivery.driver_details.last_name}`.trim() ||
        delivery.driver_details.username
      : order?.delivery_partner_name || null;
  const partnerPhone = delivery?.driver_details?.phone || null;
  // Independent mapping: delivery status from backend delivery, with order.delivery_status fallback
  const deliveryStatus = delivery?.status || order?.delivery_status || (order?.delivery_partner_id ? 'assigned' : 'unassigned');

  // Delivered actuals submitted by partner
  const deliveredItems = delivery?.delivered_items || [];
  const partnerSubmitted =
    deliveredItems.length > 0 || deliveryStatus === 'delivered' || order?.delivery_status === 'delivered';
  const isOwnerApproved = order?.status === 'delivered';

  // Delivery Progress Timeline Items
  const timelineEvents = useMemo(() => {
    if (!order) return [];
    return [
      {
        key: 'created',
        label: 'Order Created',
        timestamp: order.created_at,
        completed: true,
      },
      {
        key: 'assigned',
        label: 'Partner Assigned',
        timestamp: delivery?.driver ? delivery.updated_at : null,
        completed: Boolean(delivery?.driver || order.delivery_partner_id),
      },
      {
        key: 'accepted',
        label: 'Accepted',
        timestamp: ['accepted', 'picked_up', 'on_the_way', 'delivered'].includes(deliveryStatus)
          ? delivery?.updated_at
          : null,
        completed: ['accepted', 'picked_up', 'on_the_way', 'delivered'].includes(deliveryStatus),
      },
      {
        key: 'picked_up',
        label: 'Picked Up',
        timestamp: delivery?.pickup_time,
        completed: ['picked_up', 'on_the_way', 'delivered'].includes(deliveryStatus),
      },
      {
        key: 'on_the_way',
        label: 'On The Way',
        timestamp: ['on_the_way', 'delivered'].includes(deliveryStatus) ? delivery?.updated_at : null,
        completed: ['on_the_way', 'delivered'].includes(deliveryStatus),
      },
      {
        key: 'delivered',
        label: deliveryStatus === 'failed' ? 'Delivery Failed' : 'Delivered',
        timestamp: delivery?.delivered_time,
        completed: deliveryStatus === 'delivered' || deliveryStatus === 'failed',
        isFailed: deliveryStatus === 'failed',
      },
    ];
  }, [order, delivery, deliveryStatus]);

  // Loading State
  if (loading || !order) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} activeOpacity={0.7}>
            <Ionicons name="arrow-back" size={20} color={colors.primary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Order Details</Text>
        </View>
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading order details...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const badge = getStatusBadge(order.status);
  const formattedDate = order.created_at
    ? new Date(order.created_at).toLocaleString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : '';

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* 1. HEADER */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} activeOpacity={0.7}>
            <Ionicons name="arrow-back" size={20} color={colors.primary} />
          </TouchableOpacity>
          <View>
            <Text style={styles.headerTitle}>Order #{order.id}</Text>
            <Text style={styles.headerSubtitle}>{formattedDate}</Text>
          </View>
        </View>

        <View style={[styles.statusBadge, { backgroundColor: badge.bg, borderColor: badge.border }]}>
          <Text style={[styles.statusBadgeText, { color: badge.text }]}>{badge.label}</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* 2. CUSTOMER INFORMATION */}
        <View style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <Text style={styles.cardSectionLabel}>CUSTOMER INFORMATION</Text>
            <TouchableOpacity
              style={styles.profileActionBtn}
              onPress={() => {
                navigation.navigate('CustomerDetail', {
                  customerId: order.customer || order.customer_profile,
                  customer: {
                    id: order.customer || order.customer_profile,
                    name: order.customer_name,
                    phone: order.customer_phone || '',
                    address: order.delivery_address || '',
                  },
                });
              }}
              activeOpacity={0.7}
            >
              <Text style={styles.profileActionText}>View Profile →</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.customerNameRow}>
            <Ionicons name="person-outline" size={16} color={colors.primary} style={{ marginRight: 6 }} />
            <Text style={styles.customerName}>
              {order.customer_name}
              {order.company_name ? ` (${order.company_name})` : ''}
            </Text>
          </View>

          {order.customer_phone ? (
            <TouchableOpacity
              style={styles.phoneChip}
              onPress={() => handleCall(order.customer_phone)}
              activeOpacity={0.7}
            >
              <Ionicons name="call" size={12} color={colors.primary} style={{ marginRight: 5 }} />
              <Text style={styles.phoneChipText}>{order.customer_phone}</Text>
            </TouchableOpacity>
          ) : null}

          <View style={styles.addressRow}>
            <Ionicons name="location-outline" size={15} color={colors.textSecondary} style={{ marginRight: 6, marginTop: 1 }} />
            <Text style={styles.addressText}>{order.delivery_address || 'No delivery address provided'}</Text>
          </View>
        </View>

        {/* 3. ORDER ITEMS */}
        <View style={styles.card}>
          <Text style={styles.cardSectionLabel}>ORDER ITEMS</Text>
          <View style={styles.itemsTable}>
            {(order.items || []).map((item, index) => {
              const productName = item.product_details?.name || (item as any).product_name || 'Item';
              const unitPrice = parseFloat(item.price || item.product_details?.price || '0');
              const lineTotal = item.quantity * unitPrice;
              return (
                <View key={item.id || index} style={styles.itemRow}>
                  <View style={styles.itemInfoCol}>
                    <Text style={styles.itemName}>{productName}</Text>
                    <Text style={styles.itemQtyPrice}>
                      {item.quantity} qty × ₹{unitPrice.toFixed(0)}
                    </Text>
                  </View>
                  <Text style={styles.itemTotal}>₹{lineTotal.toFixed(0)}</Text>
                </View>
              );
            })}
          </View>

          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total Order Amount</Text>
            <Text style={styles.totalValue}>₹{parseFloat(order.total_amount || '0').toFixed(0)}</Text>
          </View>
        </View>

        {/* 4. DELIVERY PARTNER */}
        <View style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <Text style={styles.cardSectionLabel}>DELIVERY PARTNER</Text>
            {order.status !== 'delivered' && order.status !== 'cancelled' ? (
              <TouchableOpacity
                style={styles.reassignBtn}
                onPress={() => setAssignPartnerModalVisible(true)}
                activeOpacity={0.7}
              >
                <Text style={styles.reassignBtnText}>{partnerName ? 'Reassign' : 'Assign Partner'}</Text>
              </TouchableOpacity>
            ) : null}
          </View>

          <View style={styles.partnerRow}>
            <View style={styles.partnerIconBox}>
              <Ionicons name="bicycle" size={18} color={colors.primary} />
            </View>
            <View style={styles.partnerInfo}>
              <Text style={styles.partnerNameText}>{partnerName || 'No partner assigned'}</Text>
              <Text style={styles.partnerStatusText}>
                Status: {deliveryStatus ? deliveryStatus.replace(/_/g, ' ').toUpperCase() : 'UNASSIGNED'}
              </Text>
            </View>
            {partnerPhone ? (
              <TouchableOpacity
                style={styles.callPartnerBtn}
                onPress={() => handleCall(partnerPhone)}
                activeOpacity={0.7}
              >
                <Ionicons name="call" size={14} color={colors.white} />
              </TouchableOpacity>
            ) : null}
          </View>
        </View>

        {/* 5. DELIVERY PROGRESS (COMPACT TEXTUAL STATUS TIMELINE) */}
        <View style={styles.card}>
          <Text style={styles.cardSectionLabel}>DELIVERY PROGRESS</Text>
          <View style={styles.timelineContainer}>
            {timelineEvents.map((evt, idx) => {
              const isLast = idx === timelineEvents.length - 1;
              return (
                <View key={evt.key} style={styles.timelineRow}>
                  <View style={styles.timelineLeftTrack}>
                    <View
                      style={[
                        styles.timelineDot,
                        evt.completed && styles.timelineDotCompleted,
                        evt.isFailed && styles.timelineDotFailed,
                      ]}
                    >
                      {evt.completed && !evt.isFailed && (
                        <Ionicons name="checkmark" size={10} color={colors.white} />
                      )}
                      {evt.isFailed && <Ionicons name="close" size={10} color={colors.white} />}
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

                  <View style={styles.timelineBody}>
                    <View style={styles.timelineHeader}>
                      <Text
                        style={[
                          styles.timelineEventTitle,
                          evt.completed && styles.timelineEventTitleCompleted,
                          evt.isFailed && styles.timelineEventTitleFailed,
                        ]}
                      >
                        {evt.label}
                      </Text>
                      <Text style={styles.timelineEventTime}>
                        {evt.timestamp
                          ? new Date(evt.timestamp).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })
                          : '—'}
                      </Text>
                    </View>
                  </View>
                </View>
              );
            })}
          </View>
        </View>

        {/* 6. ACTUAL DELIVERED QUANTITIES & OWNER APPROVAL */}
        {partnerSubmitted ? (
          <View style={[styles.card, !isOwnerApproved && styles.cardHighlight]}>
            <View style={styles.cardHeaderRow}>
              <Text style={styles.cardSectionLabel}>ACTUAL DELIVERED QUANTITIES</Text>
              {isOwnerApproved ? (
                <View style={styles.approvedPill}>
                  <Ionicons name="checkmark-done" size={12} color={colors.success} style={{ marginRight: 3 }} />
                  <Text style={styles.approvedPillText}>Approved by Owner</Text>
                </View>
              ) : (
                <View style={styles.awaitingApprovalPill}>
                  <Ionicons name="hourglass-outline" size={12} color={colors.warning} style={{ marginRight: 3 }} />
                  <Text style={styles.awaitingApprovalPillText}>Awaiting Approval</Text>
                </View>
              )}
            </View>

            <View style={styles.deliveredTable}>
              <View style={styles.deliveredTableHeader}>
                <Text style={[styles.deliveredColHeader, { flex: 2 }]}>Product</Text>
                <Text style={[styles.deliveredColHeader, { flex: 1, textAlign: 'center' }]}>Ordered</Text>
                <Text style={[styles.deliveredColHeader, { flex: 1, textAlign: 'right' }]}>Submitted</Text>
              </View>

              {deliveredItems.length > 0
                ? deliveredItems.map((dItem, idx) => {
                    const hasDiff = dItem.delivered_quantity !== dItem.ordered_quantity;
                    return (
                      <View key={dItem.id || idx} style={styles.deliveredTableRow}>
                        <Text style={[styles.deliveredProductName, { flex: 2 }]} numberOfLines={1}>
                          {dItem.product_name}
                        </Text>
                        <Text style={[styles.deliveredQtyText, { flex: 1, textAlign: 'center' }]}>
                          {dItem.ordered_quantity}
                        </Text>
                        <Text
                          style={[
                            styles.deliveredQtyText,
                            { flex: 1, textAlign: 'right' },
                            hasDiff && styles.diffQtyText,
                          ]}
                        >
                          {dItem.delivered_quantity}
                        </Text>
                      </View>
                    );
                  })
                : (order.items || []).map((it, idx) => (
                    <View key={it.id || idx} style={styles.deliveredTableRow}>
                      <Text style={[styles.deliveredProductName, { flex: 2 }]} numberOfLines={1}>
                        {it.product_details?.name || (it as any).product_name}
                      </Text>
                      <Text style={[styles.deliveredQtyText, { flex: 1, textAlign: 'center' }]}>
                        {it.quantity}
                      </Text>
                      <Text style={[styles.deliveredQtyText, { flex: 1, textAlign: 'right' }]}>
                        {it.quantity}
                      </Text>
                    </View>
                  ))}
            </View>

            {/* Approval Action Button */}
            {!isOwnerApproved && order.status !== 'cancelled' ? (
              <TouchableOpacity
                style={styles.approveBtn}
                onPress={handleApproveDeliveredQuantities}
                disabled={approving}
                activeOpacity={0.8}
              >
                {approving ? (
                  <ActivityIndicator size="small" color={colors.white} />
                ) : (
                  <>
                    <Ionicons name="checkmark-circle" size={17} color={colors.white} style={{ marginRight: 6 }} />
                    <Text style={styles.approveBtnText}>Approve Quantities & Mark Delivered</Text>
                  </>
                )}
              </TouchableOpacity>
            ) : null}
          </View>
        ) : null}

        {/* 7. INVOICE INFORMATION */}
        <View style={styles.card}>
          <Text style={styles.cardSectionLabel}>INVOICE INFORMATION</Text>
          {order.has_invoice || order.invoice_number ? (
            <View style={styles.invoiceRow}>
              <View>
                <Text style={styles.invoiceNumberText}>
                  Invoice #{order.invoice_number || existingInvoice?.invoice_number || 'Generated'}
                </Text>
                <Text style={styles.invoiceStatusText}>
                  Status: {existingInvoice?.status ? existingInvoice.status.toUpperCase() : 'ISSUED'}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.viewInvoiceActionBtn}
                onPress={() => {
                  if (existingInvoice) {
                    navigation.navigate('InvoiceDetail', { invoice: existingInvoice });
                  } else {
                    navigation.navigate('Billing');
                  }
                }}
                activeOpacity={0.7}
              >
                <Text style={styles.viewInvoiceActionText}>View Invoice →</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.noInvoiceNotice}>
              <Ionicons name="information-circle-outline" size={18} color={colors.textSecondary} style={{ marginRight: 6 }} />
              <Text style={styles.noInvoiceNoticeText}>
                Invoice not generated yet. Approved orders can be billed from Daily Billing.
              </Text>
            </View>
          )}
        </View>

        {/* 8. ORDER ACTIONS */}
        {order.status !== 'cancelled' && order.status !== 'delivered' ? (
          <View style={styles.actionButtonsContainer}>
            <TouchableOpacity
              style={styles.cancelBtn}
              onPress={handleCancelOrder}
              activeOpacity={0.8}
            >
              <Ionicons name="close-circle-outline" size={16} color={colors.danger} style={{ marginRight: 6 }} />
              <Text style={styles.cancelBtnText}>Cancel Order</Text>
            </TouchableOpacity>
          </View>
        ) : null}
      </ScrollView>

      {/* Reassign Partner Modal */}
      <Modal
        visible={assignPartnerModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setAssignPartnerModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            activeOpacity={1}
            onPress={() => setAssignPartnerModalVisible(false)}
          />
          <View style={styles.modalBox}>
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalTitle}>Select Delivery Partner</Text>
              <TouchableOpacity onPress={() => setAssignPartnerModalVisible(false)}>
                <Ionicons name="close" size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {assigning ? (
              <ActivityIndicator size="small" color={colors.primary} style={{ marginVertical: 20 }} />
            ) : deliveryPartners.length === 0 ? (
              <Text style={styles.emptyPartnersText}>No active delivery partners found.</Text>
            ) : (
              <ScrollView style={{ maxHeight: 260 }}>
                {deliveryPartners.map(partner => (
                  <TouchableOpacity
                    key={partner.id}
                    style={styles.partnerOptionItem}
                    onPress={() => handleAssignPartner(partner)}
                    activeOpacity={0.7}
                  >
                    <View>
                      <Text style={styles.partnerOptionName}>{partner.name}</Text>
                      <Text style={styles.partnerOptionSub}>
                        {partner.phone} • {partner.vehicle_type}
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {/* Centralized Confirm Dialog */}
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
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.cardBackground,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  backBtn: {
    padding: 6,
    borderRadius: radius.md,
    backgroundColor: colors.background,
    marginRight: 4,
  },
  headerTitle: {
    ...typography.heading2,
    fontFamily: 'Inter-Bold',
    color: colors.textPrimary,
  },
  headerSubtitle: {
    ...typography.caption,
    fontFamily: 'Inter-Regular',
    color: colors.textMuted,
    marginTop: 1,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.full,
    borderWidth: 1,
  },
  statusBadgeText: {
    fontSize: 11,
    fontFamily: 'Inter-SemiBold',
    fontWeight: '700',
  },
  centerBox: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: spacing.sm,
    ...typography.body,
    fontFamily: 'Inter-Regular',
    color: colors.textSecondary,
  },
  scrollContent: {
    padding: spacing.md,
    paddingBottom: spacing.xxl,
  },
  card: {
    backgroundColor: colors.cardBackground,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.xs,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardHighlight: {
    borderColor: '#F5C6B8',
    backgroundColor: '#FFFCF9',
    borderWidth: 1,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  cardSectionLabel: {
    fontSize: 10,
    fontFamily: 'Inter-Bold',
    color: colors.textMuted,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  profileActionBtn: {
    paddingVertical: 2,
    paddingHorizontal: 4,
  },
  profileActionText: {
    fontSize: 11,
    fontFamily: 'Inter-SemiBold',
    color: colors.primary,
    fontWeight: '700',
  },
  customerNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 4,
  },
  customerName: {
    ...typography.body,
    fontFamily: 'Inter-Bold',
    color: colors.textPrimary,
    fontWeight: '700',
  },
  phoneChip: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: '#F7EDE8',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.full,
    marginVertical: 4,
  },
  phoneChipText: {
    fontSize: 11,
    fontFamily: 'Inter-SemiBold',
    color: colors.primary,
    fontWeight: '600',
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 4,
  },
  addressText: {
    ...typography.caption,
    fontFamily: 'Inter-Regular',
    color: colors.textSecondary,
    flex: 1,
    lineHeight: 16,
  },
  itemsTable: {
    marginVertical: 4,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  itemInfoCol: {
    flex: 1,
  },
  itemName: {
    ...typography.body,
    fontFamily: 'Inter-SemiBold',
    color: colors.textPrimary,
    fontSize: 13,
  },
  itemQtyPrice: {
    ...typography.caption,
    fontFamily: 'Inter-Regular',
    color: colors.textMuted,
    fontSize: 11,
    marginTop: 1,
  },
  itemTotal: {
    ...typography.body,
    fontFamily: 'Inter-Bold',
    color: colors.textPrimary,
    fontWeight: '700',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: spacing.xs,
    marginTop: 2,
  },
  totalLabel: {
    ...typography.body,
    fontFamily: 'Inter-Bold',
    color: colors.textPrimary,
    fontWeight: '700',
  },
  totalValue: {
    ...typography.heading2,
    fontFamily: 'Inter-Bold',
    color: colors.primary,
    fontWeight: '800',
  },
  partnerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  partnerIconBox: {
    width: 34,
    height: 34,
    borderRadius: radius.full,
    backgroundColor: '#F7EDE8',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.sm,
  },
  partnerInfo: {
    flex: 1,
  },
  partnerNameText: {
    ...typography.body,
    fontFamily: 'Inter-SemiBold',
    color: colors.textPrimary,
    fontWeight: '700',
  },
  partnerStatusText: {
    ...typography.caption,
    fontFamily: 'Inter-Regular',
    color: colors.textMuted,
    fontSize: 11,
  },
  callPartnerBtn: {
    width: 32,
    height: 32,
    borderRadius: radius.full,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  reassignBtn: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.sm,
    backgroundColor: '#F7EDE8',
  },
  reassignBtnText: {
    fontSize: 11,
    fontFamily: 'Inter-SemiBold',
    color: colors.primary,
    fontWeight: '700',
  },
  timelineContainer: {
    marginTop: spacing.xs,
    paddingLeft: spacing.xs,
  },
  timelineRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  timelineLeftTrack: {
    alignItems: 'center',
    width: 18,
    marginRight: spacing.xs,
  },
  timelineDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.gray200,
    borderWidth: 2,
    borderColor: colors.cardBackground,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  timelineDotCompleted: {
    backgroundColor: colors.success,
  },
  timelineDotFailed: {
    backgroundColor: colors.danger,
  },
  timelineLine: {
    width: 2,
    height: 14,
    backgroundColor: colors.gray200,
    marginVertical: 1,
  },
  timelineLineCompleted: {
    backgroundColor: colors.success,
  },
  timelineBody: {
    flex: 1,
    paddingBottom: 4,
  },
  timelineHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  timelineEventTitle: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    color: colors.textSecondary,
  },
  timelineEventTitleCompleted: {
    fontFamily: 'Inter-SemiBold',
    color: colors.textPrimary,
    fontWeight: '700',
  },
  timelineEventTitleFailed: {
    color: colors.danger,
    fontFamily: 'Inter-SemiBold',
  },
  timelineEventTime: {
    fontSize: 11,
    fontFamily: 'Inter-Regular',
    color: colors.textMuted,
  },
  approvedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.full,
    backgroundColor: '#ECFDF5',
  },
  approvedPillText: {
    fontSize: 10,
    fontFamily: 'Inter-Bold',
    color: colors.success,
    fontWeight: '700',
  },
  awaitingApprovalPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.full,
    backgroundColor: '#FEF3C7',
  },
  awaitingApprovalPillText: {
    fontSize: 10,
    fontFamily: 'Inter-Bold',
    color: colors.warning,
    fontWeight: '700',
  },
  deliveredTable: {
    marginTop: 4,
    marginBottom: spacing.xs,
  },
  deliveredTableHeader: {
    flexDirection: 'row',
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  deliveredColHeader: {
    fontSize: 10,
    fontFamily: 'Inter-Bold',
    color: colors.textMuted,
    textTransform: 'uppercase',
  },
  deliveredTableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  deliveredProductName: {
    fontSize: 12,
    fontFamily: 'Inter-SemiBold',
    color: colors.textPrimary,
  },
  deliveredQtyText: {
    fontSize: 12,
    fontFamily: 'Inter-SemiBold',
    color: colors.textPrimary,
  },
  diffQtyText: {
    color: colors.danger,
    fontWeight: '700',
  },
  approveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: 9,
    marginTop: spacing.xs,
    ...shadows.sm,
  },
  approveBtnText: {
    fontSize: 12,
    fontFamily: 'Inter-Bold',
    color: colors.white,
    fontWeight: '700',
  },
  invoiceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  invoiceNumberText: {
    ...typography.body,
    fontFamily: 'Inter-Bold',
    color: colors.textPrimary,
    fontWeight: '700',
  },
  invoiceStatusText: {
    ...typography.caption,
    fontFamily: 'Inter-Regular',
    color: colors.textMuted,
    fontSize: 11,
    marginTop: 1,
  },
  viewInvoiceActionBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.sm,
    backgroundColor: '#F7EDE8',
  },
  viewInvoiceActionText: {
    fontSize: 11,
    fontFamily: 'Inter-Bold',
    color: colors.primary,
    fontWeight: '700',
  },
  noInvoiceNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    padding: spacing.xs,
    borderRadius: radius.sm,
    marginTop: 4,
  },
  noInvoiceNoticeText: {
    ...typography.caption,
    fontFamily: 'Inter-Regular',
    color: colors.textSecondary,
    flex: 1,
    lineHeight: 16,
  },
  actionButtonsContainer: {
    marginTop: spacing.xs,
  },
  cancelBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: radius.md,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  cancelBtnText: {
    fontSize: 12,
    fontFamily: 'Inter-Bold',
    color: colors.danger,
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  modalBox: {
    backgroundColor: colors.cardBackground,
    borderRadius: radius.lg,
    padding: spacing.md,
    ...shadows.md,
  },
  modalHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
    paddingBottom: spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  modalTitle: {
    ...typography.body,
    fontFamily: 'Inter-Bold',
    color: colors.textPrimary,
    fontWeight: '700',
  },
  emptyPartnersText: {
    ...typography.caption,
    color: colors.textMuted,
    textAlign: 'center',
    marginVertical: spacing.md,
  },
  partnerOptionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  partnerOptionName: {
    ...typography.body,
    fontFamily: 'Inter-Bold',
    color: colors.textPrimary,
    fontSize: 13,
  },
  partnerOptionSub: {
    ...typography.caption,
    color: colors.textMuted,
    fontSize: 11,
    marginTop: 1,
  },
});
