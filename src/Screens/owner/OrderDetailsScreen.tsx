import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';
import orderService, { BackendOrder } from '../../services/order.service';
import deliveryService, { BackendDelivery } from '../../services/delivery.service';
import billingService, { BackendInvoice } from '../../services/billing.service';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import AppToast from '../../utils/toast';
import { colors, typography, radius, spacing, shadows } from '../../theme';

export default function OrderDetailsScreen({ route, navigation }: any) {
  const initialOrder: BackendOrder | undefined = route.params?.order;
  const orderId = route.params?.orderId || initialOrder?.id;

  const [order, setOrder] = useState<BackendOrder | null>(initialOrder || null);
  const [delivery, setDelivery] = useState<BackendDelivery | null>(null);
  const [existingInvoice, setExistingInvoice] = useState<BackendInvoice | null>(null);
  const [loading, setLoading] = useState<boolean>(!initialOrder);
  const [approving, setApproving] = useState<boolean>(false);

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
      const [orderRes, deliveriesRes] = await Promise.all([
        orderService.getOrderById(orderId),
        deliveryService.getDeliveries({ order: orderId }).catch(() => []),
      ]);

      if (orderRes) {
        setOrder(orderRes);
        // If order has an invoice number, fetch invoice details for direct display & navigation
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
      description: `Confirm and approve the delivered quantities for Order #${order.id}? This will mark the order as delivered and make it ready for billing.`,
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

  // Payment Status Badge
  const getPaymentBadge = () => {
    if (!existingInvoice) {
      return { label: 'Uninvoiced', bg: '#F3F4F6', text: '#6B7280', border: '#E5E7EB' };
    }
    const pending = parseFloat(existingInvoice.pending_amount || '0');
    const paid = parseFloat(existingInvoice.total_paid || '0');

    if (existingInvoice.status === 'paid' || pending <= 0) {
      return { label: 'Paid', bg: '#ECFDF5', text: '#059669', border: '#A7F3D0' };
    }
    if (paid > 0 || existingInvoice.status === 'partially_paid') {
      return { label: 'Partially Paid', bg: '#FFFBEB', text: '#B45309', border: '#FDE68A' };
    }
    return { label: 'Unpaid', bg: '#FEF2F2', text: '#DC2626', border: '#FECACA' };
  };

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
  const paymentBadge = getPaymentBadge();
  const formattedDate = order.created_at
    ? new Date(order.created_at).toLocaleString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : '';

  // Actual delivered quantities
  const deliveredItems = delivery?.delivered_items || [];
  const partnerSubmitted = deliveredItems.length > 0 || order.status === 'delivered';
  const isOwnerApproved = order.status === 'delivered';

  // Amount computation: display finalized invoice grand total if invoiced, otherwise fallback
  const displayBillAmount = existingInvoice
    ? parseFloat(existingInvoice.grand_total || '0').toFixed(0)
    : parseFloat(order.total_amount || '0').toFixed(0);

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

        <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
          <View style={[styles.statusBadge, { backgroundColor: badge.bg, borderColor: badge.border }]}>
            <Text style={[styles.statusBadgeText, { color: badge.text }]}>{badge.label}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: paymentBadge.bg, borderColor: paymentBadge.border }]}>
            <Text style={[styles.statusBadgeText, { color: paymentBadge.text }]}>{paymentBadge.label}</Text>
          </View>
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
            <View style={styles.phoneChip}>
              <Ionicons name="call-outline" size={12} color={colors.primary} style={{ marginRight: 5 }} />
              <Text style={styles.phoneChipText}>{order.customer_phone}</Text>
            </View>
          ) : null}

          <View style={styles.addressRow}>
            <Ionicons name="location-outline" size={15} color={colors.textSecondary} style={{ marginRight: 6, marginTop: 1 }} />
            <Text style={styles.addressText}>{order.delivery_address || 'No delivery address provided'}</Text>
          </View>
        </View>

        {/* 3. ORDER ITEMS & PRICING */}
        <View style={styles.card}>
          <Text style={styles.cardSectionLabel}>ORDER ITEMS</Text>
          <View style={styles.itemsTable}>
            {(order.items || []).map((item, index) => {
              const productName = item.product_details?.name || (item as any).product_name || 'Item';
              const unitPrice = parseFloat(item.price || item.product_details?.price || '0');
              const lineTotal = item.quantity * unitPrice;

              // Check if delivered quantity is recorded
              const deliveredRec = deliveredItems.find(d => d.product === item.product);
              const delivQty = deliveredRec?.delivered_quantity ?? (isOwnerApproved ? item.quantity : null);

              return (
                <View key={item.id || index} style={styles.itemRow}>
                  <View style={styles.itemInfoCol}>
                    <Text style={styles.itemName}>{productName}</Text>
                    <Text style={styles.itemQtyPrice}>
                      Ordered: {item.quantity} {delivQty !== null ? `• Delivered: ${delivQty}` : ''} × ₹{unitPrice.toFixed(0)}
                    </Text>
                  </View>
                  <Text style={styles.itemTotal}>₹{lineTotal.toFixed(0)}</Text>
                </View>
              );
            })}
          </View>

          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>
              {existingInvoice ? 'Final Bill Amount (Invoiced)' : 'Order Total Amount'}
            </Text>
            <Text style={styles.totalValue}>₹{displayBillAmount}</Text>
          </View>
        </View>

        {/* 4. ACTUAL DELIVERED QUANTITIES & OWNER APPROVAL */}
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
                <Text style={[styles.deliveredColHeader, { flex: 1, textAlign: 'right' }]}>Delivered</Text>
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

        {/* 5. INVOICE & BILLING INFORMATION */}
        <View style={styles.card}>
          <Text style={styles.cardSectionLabel}>BILLING INFORMATION</Text>
          {order.has_invoice || order.invoice_number ? (
            <View style={styles.invoiceRow}>
              <View>
                <Text style={styles.invoiceNumberText}>
                  Invoice #{order.invoice_number || existingInvoice?.invoice_number || 'Generated'}
                </Text>
                <Text style={styles.invoiceStatusText}>
                  Payment Status: {existingInvoice?.status ? existingInvoice.status.replace('_', ' ').toUpperCase() : 'ISSUED'}
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
                Invoice not generated yet. Eligible delivered orders are billed through Daily Billing or included in Monthly Bill.
              </Text>
            </View>
          )}
        </View>

        {/* 6. ORDER ACTIONS */}
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
    backgroundColor: '#FAF5F0',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E8D7CE',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#FAF5F0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  headerTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#8C331A',
  },
  headerSubtitle: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 1,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    borderWidth: 1,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E8D7CE',
  },
  cardHighlight: {
    borderColor: '#FCD34D',
    backgroundColor: '#FFFDF7',
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  cardSectionLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#8C331A',
    letterSpacing: 0.5,
  },
  profileActionBtn: {
    paddingVertical: 2,
    paddingHorizontal: 4,
  },
  profileActionText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#8C331A',
  },
  customerNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  customerName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1F2937',
  },
  phoneChip: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: '#FAF5F0',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginTop: 6,
  },
  phoneChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#8C331A',
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 6,
  },
  addressText: {
    fontSize: 12,
    color: '#6B7280',
    flex: 1,
    lineHeight: 16,
  },
  itemsTable: {
    marginTop: 6,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  itemInfoCol: {
    flex: 1,
    marginRight: 10,
  },
  itemName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1F2937',
  },
  itemQtyPrice: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 1,
  },
  itemTotal: {
    fontSize: 13,
    fontWeight: '800',
    color: '#1F2937',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 10,
    marginTop: 4,
  },
  totalLabel: {
    fontSize: 13,
    fontWeight: '800',
    color: '#8C331A',
  },
  totalValue: {
    fontSize: 16,
    fontWeight: '800',
    color: '#8C331A',
  },
  approvedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  approvedPillText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#059669',
  },
  awaitingApprovalPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFBEB',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FCD34D',
  },
  awaitingApprovalPillText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#D97706',
  },
  deliveredTable: {
    marginTop: 6,
    borderRadius: 8,
    backgroundColor: '#FAF5F0',
    padding: 8,
  },
  deliveredTableHeader: {
    flexDirection: 'row',
    paddingBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#E8D7CE',
  },
  deliveredColHeader: {
    fontSize: 10,
    fontWeight: '800',
    color: '#8C331A',
  },
  deliveredTableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
  },
  deliveredProductName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1F2937',
  },
  deliveredQtyText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#1F2937',
  },
  diffQtyText: {
    color: '#D97706',
  },
  approveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#059669',
    borderRadius: 8,
    paddingVertical: 10,
    marginTop: 10,
  },
  approveBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  invoiceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 6,
  },
  invoiceNumberText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1F2937',
  },
  invoiceStatusText: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 2,
  },
  viewInvoiceActionBtn: {
    backgroundColor: '#FAF5F0',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#E8D7CE',
  },
  viewInvoiceActionText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#8C331A',
  },
  noInvoiceNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FAF5F0',
    borderRadius: 8,
    padding: 8,
    marginTop: 6,
  },
  noInvoiceNoticeText: {
    fontSize: 11,
    color: '#6B7280',
    flex: 1,
    lineHeight: 15,
  },
  actionButtonsContainer: {
    marginTop: 8,
  },
  cancelBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FECACA',
    backgroundColor: '#FEF2F2',
  },
  cancelBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#DC2626',
  },
  centerBox: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 13,
    color: '#6B7280',
  },
});
