import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Linking,
  Alert,
  Modal,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { Header, CustomDialog } from '../../components/common';
import { useApp, InvoiceItem, DeliveryBoyItem } from '../../context/AppContext';
import { pdfService } from '../../services/pdf.service';
import billingService, { BackendInvoice, InvoiceAuditLogEntry } from '../../services/billing.service';
import { BillReviewModal, BillReviewItem } from '../../components/billing/BillReviewModal';
import { colors, typography, radius, spacing, shadows } from '../../theme';

export default function InvoiceDetailScreen({ route, navigation }: any) {
  const { invoice } = route.params || {};
  const {
    userRole,
    updateOrderDeliveryStatus,
    markInvoiceAsPaid,
    customers,
    deliveryBoys,
    assignOrderPartner,
  } = useApp();

  const mapBackendInvoiceToItem = (raw: any): InvoiceItem => {
    if (!raw) return raw;
    if (raw.invoice_number) {
      // It's a BackendInvoice from billingService
      const grandTotalNum = parseFloat(raw.grand_total) || 0;
      const subtotalNum = parseFloat(raw.subtotal) || grandTotalNum;
      const discountNum = parseFloat(raw.discount_amount || '0') || 0;
      const paidNum = parseFloat(raw.total_paid || '0') || 0;
      const pendingNum = parseFloat(raw.pending_amount || '0') || 0;
      const isPaidStatus = raw.status === 'paid' || pendingNum <= 0;

      return {
        id: String(raw.id),
        invoiceNo: raw.invoice_number,
        name: raw.customer_name || 'Walk-in Customer',
        customerPhone: raw.customer_phone || '',
        customerAddress: '',
        amount: `₹${grandTotalNum.toLocaleString()}`,
        numericAmount: grandTotalNum,
        subtotal: subtotalNum,
        discountAmount: discountNum,
        paidAmount: paidNum,
        pendingAmount: pendingNum,
        due: isPaidStatus ? 'Paid' : `Pending ₹${pendingNum.toLocaleString()}`,
        date: raw.created_at ? new Date(raw.created_at).toLocaleDateString() : 'Today',
        status: isPaidStatus ? 'PAID' : 'PENDING',
        isOverdue: false,
        deliveryStatus: isPaidStatus ? 'Delivered' : 'Pending',
        items: (raw.items || []).map((it: any) => ({
          id: String(it.id),
          product_id: it.product || it.product_id || null,
          name: it.product_name,
          qty: it.quantity,
          price: parseFloat(it.unit_price) || 0,
        })),
        notes: raw.notes || '',
      };
    }
    return raw;
  };

  const [currentOrder, setCurrentOrder] = useState<InvoiceItem>(
    mapBackendInvoiceToItem(invoice) || {
      id: 'inv-1',
      invoiceNo: 'ORD-2026-001',
      name: 'Ankit Sharma',
      customerAddress: 'Plot 45, Industrial Area, Phase 2, New Delhi',
      customerPhone: '+91 98765 12345',
      amount: '₹1,240',
      numericAmount: 1240,
      due: 'Due in 2 days',
      date: '27 Jul 2026',
      isOverdue: false,
      status: 'PENDING',
      deliveryPartnerName: 'Rahul Sharma',
      deliveryStatus: 'Out for delivery',
      currentLocation: 'Sector 14, Near Metro Station',
      items: [
        { id: '1', name: 'Premium CTC Tea Dust (5kg)', qty: 2, price: 500 },
        { id: '2', name: 'Special Masala Spices (250g)', qty: 1, price: 240 },
      ],
      subtotal: 1240,
      tax: 0,
      notes: 'Thank you for ordering with ChaiFlow!',
    },
  );

  const [rawInvoiceData, setRawInvoiceData] = useState<BackendInvoice | null>(
    invoice && invoice.invoice_number ? invoice : null
  );
  const [isEditBillVisible, setIsEditBillVisible] = useState<boolean>(false);

  const rawInvoiceId = invoice?.id || invoice?.invoice_number || route.params?.invoiceId;

  // Live fetch to prevent stale invoice status
  const fetchLiveInvoice = useCallback(async () => {
    if (!rawInvoiceId) return;
    try {
      const live: BackendInvoice = await billingService.getInvoiceDetail(rawInvoiceId);
      if (live) {
        setRawInvoiceData(live);
        setCurrentOrder(mapBackendInvoiceToItem(live));
      }
    } catch (err) {
      console.log('Error fetching live invoice detail:', err);
    }
  }, [rawInvoiceId]);

  useEffect(() => {
    fetchLiveInvoice();
    const unsubscribe = navigation.addListener?.('focus', () => {
      fetchLiveInvoice();
    });
    return unsubscribe;
  }, [navigation, fetchLiveInvoice]);

  const [isPartnerModalVisible, setIsPartnerModalVisible] = useState(false);
  const [isPdfLoading, setIsPdfLoading] = useState(false);
  const [pdfActionType, setPdfActionType] = useState<string>('');

  // Custom Dialog State
  const [dialogConfig, setDialogConfig] = useState<{
    visible: boolean;
    title: string;
    message?: string;
    type?: 'confirm' | 'danger' | 'info' | 'warning' | 'success';
    buttons?: Array<{
      text: string;
      style?: 'default' | 'cancel' | 'destructive';
      onPress?: () => void;
    }>;
  }>({
    visible: false,
    title: '',
  });

  const closeDialog = () => setDialogConfig(prev => ({ ...prev, visible: false }));

  const isAdmin = userRole === 'ADMIN';

  const orderIdDisplay = currentOrder.invoiceNo || `ORD-${currentOrder.id}`;
  const isPaid = currentOrder.status === 'PAID';
  const isOverdue = currentOrder.isOverdue || currentOrder.status === 'OVERDUE';
  const delStatus = currentOrder.deliveryStatus || (isPaid ? 'Delivered' : 'Pending');
  const partnerName = currentOrder.deliveryPartnerName || 'Rahul Sharma';
  const currentLocationText =
    currentOrder.currentLocation ||
    (delStatus === 'Delivered'
      ? 'Delivered to Customer'
      : delStatus === 'Out for delivery'
      ? 'In Transit (Sector 14, Near Metro)'
      : 'At Central Warehouse / Store Hub');

  const handleSaveEditedBill = async (payload: {
    items: Array<{ product_id: number | null; product_name: string; quantity: number; unit_price: string }>;
    discount_amount: string;
    notes: string;
    due_date: string | null;
    reason?: string;
  }) => {
    if (!rawInvoiceId) return;
    const itemsPayload = payload.items.map(it => ({
      product_id: it.product_id ? Number(it.product_id) : null,
      product_name: it.product_name,
      quantity: it.quantity,
      unit_price: it.unit_price,
    }));

    const updated = await billingService.editBill(rawInvoiceId, {
      items: itemsPayload,
      discount_amount: payload.discount_amount,
      notes: payload.notes,
      due_date: payload.due_date,
      reason: payload.reason,
    });

    setIsEditBillVisible(false);
    if (updated) {
      setRawInvoiceData(updated);
      setCurrentOrder(mapBackendInvoiceToItem(updated));
    } else {
      fetchLiveInvoice();
    }
    setDialogConfig({
      visible: true,
      title: 'Bill Updated',
      message: 'The bill has been edited successfully and customer ledger has been updated.',
      type: 'success',
      buttons: [{ text: 'OK', onPress: closeDialog }],
    });
  };

  const handleCallCustomer = () => {
    const phone = currentOrder.customerPhone || '+919876512345';
    Linking.openURL(`tel:${phone}`).catch(() => {
      setDialogConfig({
        visible: true,
        title: 'Error',
        message: 'Unable to initiate phone call.',
        type: 'warning',
        buttons: [{ text: 'OK', onPress: closeDialog }],
      });
    });
  };

  const handleUpdateStatusByDeliveryPartner = (
    newStatus: 'Pending' | 'Out for delivery' | 'Delivered',
  ) => {
    if (isAdmin) {
      setDialogConfig({
        visible: true,
        title: 'Access Denied',
        message:
          'Admin can only view the order status and delivery location. Only delivery partners can update the delivery status.',
        type: 'warning',
        buttons: [{ text: 'OK', onPress: closeDialog }],
      });
      return;
    }

    updateOrderDeliveryStatus(currentOrder.id, newStatus);
    setCurrentOrder(prev => ({
      ...prev,
      deliveryStatus: newStatus,
      currentLocation:
        newStatus === 'Delivered'
          ? 'Delivered to Customer'
          : newStatus === 'Out for delivery'
          ? 'In Transit (Near Destination)'
          : 'At Central Warehouse',
    }));
  };

  // PDF Handlers: Download, Share, Print
  const handleDownloadPdf = async () => {
    if (isPdfLoading) return;
    try {
      setIsPdfLoading(true);
      setPdfActionType('Downloading PDF...');
      const cleanId = String(currentOrder.id).replace(/[^0-9]/g, '') || currentOrder.id;
      const res = await pdfService.downloadInvoicePdf(cleanId, currentOrder.invoiceNo);
      setDialogConfig({
        visible: true,
        title: 'PDF Downloaded ✅',
        message: `Invoice saved successfully to Downloads:\n${res.filename}`,
        type: 'success',
        buttons: [
          {
            text: 'Open PDF',
            onPress: () => {
              closeDialog();
              pdfService.openInvoicePdf(cleanId, currentOrder.invoiceNo).catch(err => {
                setDialogConfig({
                  visible: true,
                  title: 'Unable to Open',
                  message: err.message || 'No app available to open PDF.',
                  type: 'warning',
                  buttons: [{ text: 'OK', onPress: closeDialog }],
                });
              });
            },
          },
          { text: 'OK', onPress: closeDialog },
        ],
      });
    } catch (err: any) {
      setDialogConfig({
        visible: true,
        title: 'Download Failed',
        message: err.message || 'Unable to download invoice PDF from server.',
        type: 'warning',
        buttons: [{ text: 'OK', onPress: closeDialog }],
      });
    } finally {
      setIsPdfLoading(false);
      setPdfActionType('');
    }
  };

  const handleSharePdf = async () => {
    if (isPdfLoading) return;
    try {
      setIsPdfLoading(true);
      setPdfActionType('Preparing PDF for Sharing...');
      const cleanId = String(currentOrder.id).replace(/[^0-9]/g, '') || currentOrder.id;
      await pdfService.shareInvoicePdf(cleanId, currentOrder.invoiceNo);
    } catch (err: any) {
      setDialogConfig({
        visible: true,
        title: 'Share Failed',
        message: err.message || 'Unable to share invoice PDF.',
        type: 'warning',
        buttons: [{ text: 'OK', onPress: closeDialog }],
      });
    } finally {
      setIsPdfLoading(false);
      setPdfActionType('');
    }
  };

  const handlePrintPdf = async () => {
    if (isPdfLoading) return;
    try {
      setIsPdfLoading(true);
      setPdfActionType('Opening Print Preview...');
      const cleanId = String(currentOrder.id).replace(/[^0-9]/g, '') || currentOrder.id;
      await pdfService.printInvoicePdf(cleanId, currentOrder.invoiceNo);
    } catch (err: any) {
      setDialogConfig({
        visible: true,
        title: 'Print Failed',
        message: err.message || 'Unable to open print service.',
        type: 'warning',
        buttons: [{ text: 'OK', onPress: closeDialog }],
      });
    } finally {
      setIsPdfLoading(false);
      setPdfActionType('');
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      {/* Header with Order ID */}
      <Header title={orderIdDisplay} showBack={true} showNotification={false} />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* 1. Summary Card */}
        <View style={styles.summaryCard}>
          <View style={styles.summaryTopRow}>
            <Text style={styles.summaryCardSubtitle}>ORDER SUMMARY</Text>
            {isAdmin && (
              <TouchableOpacity
                style={styles.editBillHeaderBtn}
                onPress={() => setIsEditBillVisible(true)}
                activeOpacity={0.75}
              >
                <Ionicons name="create-outline" size={14} color="#8C331A" style={{ marginRight: 4 }} />
                <Text style={styles.editBillHeaderBtnText}>Edit Bill</Text>
              </TouchableOpacity>
            )}
          </View>
          <Text style={styles.totalAmountText}>{currentOrder.amount}</Text>

          <View style={styles.badgesContainer}>
            {/* Delivery Status Badge */}
            <View
              style={[
                styles.badge,
                delStatus === 'Delivered'
                  ? styles.badgeDelivered
                  : delStatus === 'Out for delivery'
                  ? styles.badgeTransit
                  : styles.badgePending,
              ]}
            >
              <Text
                style={[
                  styles.badgeText,
                  delStatus === 'Delivered'
                    ? styles.badgeTextDelivered
                    : delStatus === 'Out for delivery'
                    ? styles.badgeTextTransit
                    : styles.badgeTextPending,
                ]}
              >
                {delStatus}
              </Text>
            </View>

            {/* Payment Status Badge */}
            <View
              style={[
                styles.badge,
                isPaid
                  ? styles.badgePaid
                  : isOverdue
                  ? styles.badgeOverdue
                  : styles.badgeUnpaid,
              ]}
            >
              <Text
                style={[
                  styles.badgeText,
                  isPaid
                    ? styles.badgeTextPaid
                    : isOverdue
                    ? styles.badgeTextOverdue
                    : styles.badgeTextUnpaid,
                ]}
              >
                {isPaid ? 'Paid' : isOverdue ? 'Overdue' : 'Unpaid'}
              </Text>
            </View>
          </View>

          {!isPaid && (
            <TouchableOpacity
              activeOpacity={0.8}
              style={styles.markPaidBtn}
              onPress={() => {
                markInvoiceAsPaid(currentOrder.id);
                setCurrentOrder(prev => ({ ...prev, status: 'PAID', isOverdue: false }));
                setDialogConfig({
                  visible: true,
                  title: 'Payment Completed 🎉',
                  message: `Payment of ${currentOrder.amount} marked as completed.`,
                  type: 'success',
                  buttons: [{ text: 'OK', onPress: closeDialog }],
                });
              }}
            >
              <Ionicons name="checkmark-done-circle" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
              <Text style={styles.markPaidBtnText}>Mark Payment Completed</Text>
            </TouchableOpacity>
          )}

          {/* A4 Professional PDF Action Bar */}
          <View style={styles.pdfActionsRow}>
            <TouchableOpacity
              activeOpacity={0.8}
              style={[styles.pdfBtn, isPdfLoading && styles.pdfBtnDisabled]}
              onPress={handleDownloadPdf}
              disabled={isPdfLoading}
            >
              <Ionicons name="download-outline" size={17} color="#7A2E19" />
              <Text style={styles.pdfBtnText}>Download</Text>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.8}
              style={[styles.pdfBtn, isPdfLoading && styles.pdfBtnDisabled]}
              onPress={handleSharePdf}
              disabled={isPdfLoading}
            >
              <Ionicons name="share-social-outline" size={17} color="#7A2E19" />
              <Text style={styles.pdfBtnText}>Share</Text>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.8}
              style={[styles.pdfBtn, isPdfLoading && styles.pdfBtnDisabled]}
              onPress={handlePrintPdf}
              disabled={isPdfLoading}
            >
              <Ionicons name="print-outline" size={17} color="#7A2E19" />
              <Text style={styles.pdfBtnText}>Print</Text>
            </TouchableOpacity>
          </View>

          {isPdfLoading && (
            <Text style={styles.pdfLoadingText}>⏳ {pdfActionType}</Text>
          )}
        </View>

        {/* 2. Customer Card */}
        <TouchableOpacity
          activeOpacity={0.88}
          style={styles.sectionCard}
          onPress={() => {
            const cust = customers.find(
              (c: any) => c.name.toLowerCase() === currentOrder.name.toLowerCase(),
            ) || {
              id: `c_${currentOrder.id}`,
              name: currentOrder.name,
              address: currentOrder.customerAddress || 'Local Market Area',
              amount: currentOrder.numericAmount || 0,
              deliveryStatus: 'Active Customer',
              hasDot: true,
              isOverdue: currentOrder.isOverdue || false,
            };
            navigation.navigate('CustomerDetail', { customer: cust });
          }}
        >
          <View style={styles.customerHeaderRow}>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Text style={styles.sectionTitleLabel}>CUSTOMER DETAILS</Text>
                <Ionicons name="chevron-forward" size={14} color="#A52A0A" style={{ marginLeft: 4 }} />
              </View>
              <Text style={styles.customerName}>{currentOrder.name}</Text>
              {currentOrder.customerAddress && (
                <Text style={styles.customerAddress}>📍 {currentOrder.customerAddress}</Text>
              )}
            </View>

            <TouchableOpacity
              activeOpacity={0.8}
              style={styles.callBtn}
              onPress={handleCallCustomer}
            >
              <Ionicons name="call" size={16} color="#FFFFFF" />
              <Text style={styles.callBtnText}>Call</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>

        {/* 3. Items Section */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitleLabel}>ORDER ITEMS</Text>
          {currentOrder.items && currentOrder.items.length > 0 ? (
            currentOrder.items.map((item, idx) => (
              <View key={item.id || idx.toString()} style={styles.itemRow}>
                <View style={styles.itemLeft}>
                  <Text style={styles.itemName}>{item.name}</Text>
                  <Text style={styles.itemQtyPrice}>
                    Qty: {item.qty} × ₹{item.price}
                  </Text>
                </View>
                <Text style={styles.itemTotal}>₹{(item.qty * item.price).toLocaleString()}</Text>
              </View>
            ))
          ) : (
            <View style={styles.itemRow}>
              <Text style={styles.itemName}>Commercial Chai Powder & Supplies</Text>
              <Text style={styles.itemTotal}>{currentOrder.amount}</Text>
            </View>
          )}

          {/* Financial Breakdown: Subtotal, Discount, Grand Total, Paid, Pending */}
          <View style={styles.calcRow}>
            <Text style={styles.calcLabel}>Subtotal</Text>
            <Text style={styles.calcVal}>₹{(currentOrder.subtotal || currentOrder.numericAmount || 0).toLocaleString()}</Text>
          </View>
          {Boolean(currentOrder.discountAmount && currentOrder.discountAmount > 0) && (
            <View style={styles.calcRow}>
              <Text style={[styles.calcLabel, { color: '#059669', fontWeight: '700' }]}>Discount</Text>
              <Text style={[styles.calcVal, { color: '#059669', fontWeight: '800' }]}>
                - ₹{Number(currentOrder.discountAmount).toLocaleString()}
              </Text>
            </View>
          )}
          <View style={[styles.calcRow, { borderTopWidth: 1, borderTopColor: '#F3F4F6', paddingTop: 6, marginTop: 4 }]}>
            <Text style={[styles.calcLabel, { fontWeight: '800', color: '#111827' }]}>Final Bill Amount</Text>
            <Text style={[styles.calcVal, { fontWeight: '900', color: '#8C331A' }]}>
              {currentOrder.amount || `₹${(currentOrder.numericAmount || 0).toLocaleString()}`}
            </Text>
          </View>
          {currentOrder.paidAmount !== undefined && (
            <View style={styles.calcRow}>
              <Text style={styles.calcLabel}>Amount Received</Text>
              <Text style={[styles.calcVal, { color: '#059669', fontWeight: '700' }]}>
                ₹{Number(currentOrder.paidAmount).toLocaleString()}
              </Text>
            </View>
          )}
          {currentOrder.pendingAmount !== undefined && Number(currentOrder.pendingAmount) > 0 && (
            <View style={styles.calcRow}>
              <Text style={[styles.calcLabel, { color: '#DC2626', fontWeight: '700' }]}>Remaining Due</Text>
              <Text style={[styles.calcVal, { color: '#DC2626', fontWeight: '800' }]}>
                ₹{Number(currentOrder.pendingAmount).toLocaleString()}
              </Text>
            </View>
          )}
          {currentOrder.tax ? (
            <View style={styles.calcRow}>
              <Text style={styles.calcLabel}>GST (5%)</Text>
              <Text style={styles.calcVal}>₹{currentOrder.tax.toLocaleString()}</Text>
            </View>
          ) : null}
        </View>

        {/* 4. Delivery Partner Section */}
        <View style={styles.sectionCard}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <Text style={styles.sectionTitleLabel}>DELIVERY PARTNER</Text>
            {isAdmin && (
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => setIsPartnerModalVisible(true)}
                style={{ flexDirection: 'row', alignItems: 'center' }}
              >
                <Ionicons name="swap-horizontal" size={14} color="#A52A0A" style={{ marginRight: 4 }} />
                <Text style={{ fontSize: 12, fontWeight: '700', color: '#A52A0A' }}>Re-assign</Text>
              </TouchableOpacity>
            )}
          </View>
          <View style={styles.partnerInfoRow}>
            <View style={styles.partnerAvatar}>
              <Ionicons name="bicycle" size={22} color="#A52A0A" />
            </View>
            <View style={{ marginLeft: 12, flex: 1 }}>
              <Text style={styles.partnerNameText}>{partnerName}</Text>
              <Text style={styles.partnerSubText}>Assigned Fleet Member • Active</Text>
            </View>
          </View>
        </View>

        {/* Delivery Partner Selection Modal */}
        <Modal
          visible={isPartnerModalVisible}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setIsPartnerModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Assign Delivery Partner</Text>
                <TouchableOpacity onPress={() => setIsPartnerModalVisible(false)}>
                  <Ionicons name="close-circle" size={24} color="#9CA3AF" />
                </TouchableOpacity>
              </View>

              <FlatList
                data={deliveryBoys}
                keyExtractor={item => item.id}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={[
                      styles.partnerModalItem,
                      item.name === partnerName && styles.partnerModalItemActive,
                    ]}
                    onPress={() => {
                      assignOrderPartner(currentOrder.id, item.name);
                      setCurrentOrder(prev => ({ ...prev, deliveryPartnerName: item.name }));
                      setIsPartnerModalVisible(false);
                      setDialogConfig({
                        visible: true,
                        title: 'Partner Assigned',
                        message: `Order assigned to ${item.name}`,
                        type: 'success',
                        buttons: [{ text: 'OK', onPress: closeDialog }],
                      });
                    }}
                  >
                    <View style={styles.partnerItemAvatar}>
                      <Ionicons name="person" size={18} color="#8C331A" />
                    </View>
                    <View style={{ flex: 1, marginLeft: 12 }}>
                      <Text style={styles.partnerItemName}>{item.name}</Text>
                      <Text style={styles.partnerItemStatus}>
                        {item.status === 'READY' ? '🟢 Ready / Available' : item.status === 'BUSY' ? '🔵 Busy on Delivery' : '🔴 Offline'}
                      </Text>
                    </View>
                    {item.name === partnerName && (
                      <Ionicons name="checkmark-circle" size={20} color="#059669" />
                    )}
                  </TouchableOpacity>
                )}
              />
            </View>
          </View>
        </Modal>

        {/* 5. Live Status Section */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitleLabel}>LIVE DELIVERY STATUS</Text>

          <View style={styles.liveStatusBox}>
            <View style={styles.liveStatusHeader}>
              <View
                style={[
                  styles.badge,
                  delStatus === 'Delivered'
                    ? styles.badgeDelivered
                    : delStatus === 'Out for delivery'
                    ? styles.badgeTransit
                    : styles.badgePending,
                ]}
              >
                <Text
                  style={[
                    styles.badgeText,
                    delStatus === 'Delivered'
                      ? styles.badgeTextDelivered
                      : delStatus === 'Out for delivery'
                      ? styles.badgeTextTransit
                      : styles.badgeTextPending,
                  ]}
                >
                  {delStatus}
                </Text>
              </View>

              <View style={styles.livePulseBox}>
                <Ionicons name="navigate-circle" size={18} color="#A52A0A" />
                <Text style={styles.livePulseText}>GPS Tracking</Text>
              </View>
            </View>

            <View style={styles.locationRow}>
              <Ionicons name="location" size={18} color="#A52A0A" style={{ marginTop: 2 }} />
              <View style={{ marginLeft: 8, flex: 1 }}>
                <Text style={styles.locationTitle}>Current Location</Text>
                <Text style={styles.locationAddress}>{currentLocationText}</Text>
              </View>
            </View>
          </View>

          {/* Admin vs Delivery Partner Rule Notice / Controls */}
          {isAdmin ? (
            <View style={styles.adminNoticeBox}>
              <Ionicons name="shield-checkmark-outline" size={18} color="#8A7A70" />
              <Text style={styles.adminNoticeText}>
                Admin View Only: You can monitor order status and GPS location. Only assigned delivery partners can update delivery status.
              </Text>
            </View>
          ) : (
            <View style={styles.partnerControlsBox}>
              <Text style={styles.partnerControlsTitle}>Update Delivery Status (Partner Action)</Text>
              <View style={styles.statusButtonsRow}>
                <TouchableOpacity
                  style={[styles.statusActionBtn, delStatus === 'Pending' && styles.statusActionBtnActive]}
                  onPress={() => handleUpdateStatusByDeliveryPartner('Pending')}
                >
                  <Text style={styles.statusActionBtnText}>Pending</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.statusActionBtn, delStatus === 'Out for delivery' && styles.statusActionBtnActive]}
                  onPress={() => handleUpdateStatusByDeliveryPartner('Out for delivery')}
                >
                  <Text style={styles.statusActionBtnText}>Out for Delivery</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.statusActionBtn, delStatus === 'Delivered' && styles.statusActionBtnActive]}
                  onPress={() => handleUpdateStatusByDeliveryPartner('Delivered')}
                >
                  <Text style={styles.statusActionBtnText}>Delivered</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>

        {/* 6. Invoice Edit Audit History (Part 4 requirement) */}
        {rawInvoiceData?.audit_logs && rawInvoiceData.audit_logs.length > 0 && (
          <View style={styles.sectionCard}>
            <View style={styles.auditHeaderRow}>
              <Ionicons name="time" size={16} color="#8C331A" style={{ marginRight: 6 }} />
              <Text style={styles.sectionTitleLabel}>BILL AUDIT HISTORY</Text>
            </View>
            <Text style={styles.auditSubtitle}>
              Immutable record of all modifications to this bill. Previous PDF records remain unchanged.
            </Text>

            {rawInvoiceData.audit_logs.map((log: InvoiceAuditLogEntry, idx: number) => (
              <View key={log.id || idx} style={styles.auditLogRow}>
                <View style={styles.auditLogDot} />
                <View style={styles.auditLogContent}>
                  <View style={styles.auditLogTop}>
                    <Text style={styles.auditLogUser}>{log.edited_by_name || 'Owner'}</Text>
                    <Text style={styles.auditLogTime}>
                      {log.created_at ? new Date(log.created_at).toLocaleString() : 'Recently'}
                    </Text>
                  </View>

                  <View style={styles.auditTotalChangeRow}>
                    <Text style={styles.auditPrevTotal}>₹{log.previous_total}</Text>
                    <Ionicons name="arrow-forward" size={12} color="#8C331A" style={{ marginHorizontal: 6 }} />
                    <Text style={styles.auditNextTotal}>₹{log.updated_total}</Text>
                  </View>

                  {Boolean(log.reason) && (
                    <Text style={styles.auditReasonText}>
                      Reason: <Text style={{ fontStyle: 'italic', color: '#374151' }}>"{log.reason}"</Text>
                    </Text>
                  )}
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Bill Review / Edit Modal (Part 4) */}
      <BillReviewModal
        visible={isEditBillVisible}
        onClose={() => setIsEditBillVisible(false)}
        mode="edit_invoice"
        invoiceId={rawInvoiceData?.id || (currentOrder?.id ? Number(currentOrder.id.replace(/[^0-9]/g, '')) : undefined)}
        invoiceNumber={rawInvoiceData?.invoice_number || currentOrder.invoiceNo}
        customerName={currentOrder.name}
        customerPhone={currentOrder.customerPhone}
        deliveryPartnerName={currentOrder.deliveryPartnerName}
        deliveryDate={currentOrder.date}
        initialItems={(currentOrder.items || []).map((it: any) => ({
          id: it.id ? Number(it.id) : undefined,
          product_id: it.product_id || null,
          product_name: it.name,
          quantity: it.qty,
          unit_price: String(it.price || '0'),
        }))}
        initialDiscount={String(currentOrder.discountAmount || 0)}
        initialNotes={currentOrder.notes || ''}
        initialDueDate={rawInvoiceData?.due_date || null}
        onSaveSuccess={() => {
          setIsEditBillVisible(false);
          fetchLiveInvoice();
        }}
        saveAction={handleSaveEditedBill}
      />

      {/* CUSTOM DIALOG POPUP */}
      <CustomDialog
        visible={dialogConfig.visible}
        title={dialogConfig.title}
        message={dialogConfig.message}
        type={dialogConfig.type}
        buttons={dialogConfig.buttons}
        onClose={closeDialog}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAF8F5',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  summaryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 20,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#EFECE9',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    alignItems: 'center',
  },
  summaryCardSubtitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#8A7A70',
    letterSpacing: 0.8,
  },
  summaryTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
  },
  editBillHeaderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FDF2EC',
    borderWidth: 1,
    borderColor: '#E8D7CE',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  editBillHeaderBtnText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#8C331A',
  },
  totalAmountText: {
    fontSize: 32,
    fontWeight: '900',
    color: '#A52A0A',
    marginVertical: 6,
  },
  badgesContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  markPaidBtn: {
    marginTop: 14,
    backgroundColor: '#059669',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  markPaidBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  pdfActionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginTop: 14,
    gap: 8,
  },
  pdfBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FAF6F2',
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E8DFD7',
  },
  pdfBtnDisabled: {
    opacity: 0.5,
  },
  pdfBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#7A2E19',
    marginLeft: 5,
  },
  pdfLoadingText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#8A7A70',
    marginTop: 8,
  },
  sectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#EFECE9',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
  },
  sectionTitleLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#A52A0A',
    letterSpacing: 0.8,
    marginBottom: 12,
  },
  customerHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  customerName: {
    fontSize: 17,
    fontWeight: '900',
    color: '#1F1511',
  },
  customerAddress: {
    fontSize: 12,
    color: '#6E6259',
    marginTop: 4,
    fontWeight: '500',
  },
  callBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#059669',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    marginLeft: 10,
  },
  callBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
    marginLeft: 4,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F3EFEA',
  },
  itemLeft: {
    flex: 1,
    paddingRight: 10,
  },
  itemName: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1F1511',
  },
  itemQtyPrice: {
    fontSize: 12,
    color: '#7C6E65',
    marginTop: 2,
  },
  itemTotal: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1F1511',
  },
  calcRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
  },
  calcLabel: {
    fontSize: 13,
    color: '#6E6259',
    fontWeight: '600',
  },
  calcVal: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1F1511',
  },
  partnerInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  partnerAvatar: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#FDEBE4',
    justifyContent: 'center',
    alignItems: 'center',
  },
  partnerNameText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1F1511',
  },
  partnerSubText: {
    fontSize: 12,
    color: '#7C6E65',
    marginTop: 2,
  },
  liveStatusBox: {
    backgroundColor: '#FAF8F5',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E8E3DF',
  },
  liveStatusHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  livePulseBox: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  livePulseText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#A52A0A',
    marginLeft: 4,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 4,
  },
  locationTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#8A7A70',
  },
  locationAddress: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1F1511',
    marginTop: 2,
  },
  adminNoticeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3EFEA',
    borderRadius: 12,
    padding: 12,
    marginTop: 14,
  },
  adminNoticeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#6E6259',
    marginLeft: 8,
    flex: 1,
  },
  partnerControlsBox: {
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3EFEA',
  },
  partnerControlsTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#1F1511',
    marginBottom: 8,
  },
  statusButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statusActionBtn: {
    flex: 1,
    backgroundColor: '#FAF8F5',
    paddingVertical: 8,
    borderRadius: 10,
    alignItems: 'center',
    marginHorizontal: 3,
    borderWidth: 1,
    borderColor: '#E8E3DF',
  },
  statusActionBtnActive: {
    backgroundColor: '#A52A0A',
    borderColor: '#A52A0A',
  },
  statusActionBtnText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#1F1511',
  },
  badge: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 10,
    marginHorizontal: 4,
  },
  badgePending: {
    backgroundColor: '#FEF3C7',
  },
  badgeTransit: {
    backgroundColor: '#E0F2FE',
  },
  badgeDelivered: {
    backgroundColor: '#ECFDF5',
  },
  badgePaid: {
    backgroundColor: '#ECFDF5',
  },
  badgeUnpaid: {
    backgroundColor: '#FFFBEB',
  },
  badgeOverdue: {
    backgroundColor: '#FEE2E2',
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '800',
  },
  badgeTextPending: {
    color: '#D97706',
  },
  badgeTextTransit: {
    color: '#0284C7',
  },
  badgeTextDelivered: {
    color: '#059669',
  },
  badgeTextPaid: {
    color: '#059669',
  },
  badgeTextUnpaid: {
    color: '#B45309',
  },
  badgeTextOverdue: {
    color: '#DC2626',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: '60%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3EFEA',
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1F1511',
  },
  partnerModalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 14,
    marginBottom: 8,
    backgroundColor: '#FAF8F5',
    borderWidth: 1,
    borderColor: '#EFECE8',
  },
  partnerModalItemActive: {
    backgroundColor: '#ECFDF5',
    borderColor: '#059669',
  },
  partnerItemAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F5EBE6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  partnerItemName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
  },
  partnerItemStatus: {
    fontSize: 11,
    fontWeight: '600',
    color: '#6B7280',
    marginTop: 2,
  },
  /* Audit History Styles */
  auditHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  auditSubtitle: {
    fontSize: 11,
    color: '#6B7280',
    marginBottom: 12,
    lineHeight: 16,
  },
  auditLogRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F3EFEA',
  },
  auditLogDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#8C331A',
    marginTop: 5,
    marginRight: 10,
  },
  auditLogContent: {
    flex: 1,
  },
  auditLogTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  auditLogUser: {
    fontSize: 12,
    fontWeight: '800',
    color: '#1F2937',
  },
  auditLogTime: {
    fontSize: 10,
    color: '#9CA3AF',
  },
  auditTotalChangeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  auditPrevTotal: {
    fontSize: 12,
    fontWeight: '700',
    color: '#6B7280',
    textDecorationLine: 'line-through',
  },
  auditNextTotal: {
    fontSize: 13,
    fontWeight: '800',
    color: '#059669',
  },
  auditReasonText: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 2,
  },
});
