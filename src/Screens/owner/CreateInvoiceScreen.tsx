import React, { useState, useMemo } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  TextInput,
  Modal,
  FlatList,
  ScrollView,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { Header, CustomDialog } from '../../components/common';
import { useApp, ProductItem, Customer, DeliveryBoyItem } from '../../context/AppContext';

export default function CreateInvoiceScreen({ navigation }: any) {
  const { customers, products, deliveryBoys, addInvoice } = useApp();

  // Selected Customer State
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(
    customers[0] || null,
  );
  const [isCustomerModalVisible, setIsCustomerModalVisible] = useState(false);

  // Selected Delivery Partner State
  const [selectedPartner, setSelectedPartner] = useState<DeliveryBoyItem | null>(
    deliveryBoys[0] || null,
  );
  const [isPartnerModalVisible, setIsPartnerModalVisible] = useState(false);

  // Item Quantities Map { productId: quantity }
  const [quantities, setQuantities] = useState<{ [key: string]: number }>({});
  const [notes, setNotes] = useState('');
  const [toastMessage, setToastMessage] = useState('');

  // Custom Dialog State
  const [dialogConfig, setDialogConfig] = useState<{
    visible: boolean;
    title: string;
    message?: string;
    type?: 'confirm' | 'success' | 'danger' | 'info' | 'warning';
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

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 2500);
  };

  const handleQuantityChange = (productId: string, delta: number) => {
    setQuantities(prev => {
      const current = prev[productId] || 0;
      const next = Math.max(0, current + delta);
      return { ...prev, [productId]: next };
    });
  };

  // Calculations
  const selectedItemsList = useMemo(() => {
    return products
      .filter(p => (quantities[p.id] || 0) > 0)
      .map(p => ({
        id: p.id,
        name: p.name,
        qty: quantities[p.id] || 0,
        price: parseFloat(p.price) || 0,
      }));
  }, [products, quantities]);

  const subtotal = useMemo(() => {
    return selectedItemsList.reduce((acc, item) => acc + item.qty * item.price, 0);
  }, [selectedItemsList]);

  const tax = useMemo(() => Math.round(subtotal * 0.05), [subtotal]);
  const grandTotal = useMemo(() => subtotal + tax, [subtotal, tax]);

  const handleCreateOrder = async () => {
    if (!selectedCustomer) {
      setDialogConfig({
        visible: true,
        title: 'Customer Required',
        message: 'Please select a customer for this order.',
        type: 'warning',
        buttons: [{ text: 'OK', onPress: closeDialog }],
      });
      return;
    }

    if (selectedItemsList.length === 0) {
      setDialogConfig({
        visible: true,
        title: 'No Items Selected',
        message: 'Please select at least one product quantity.',
        type: 'warning',
        buttons: [{ text: 'OK', onPress: closeDialog }],
      });
      return;
    }

    const orderNo = `ORD-${Date.now().toString().slice(-6)}`;
    const fullOrderObj = {
      invoiceNo: orderNo,
      name: selectedCustomer.name,
      customerAddress: selectedCustomer.address,
      customerPhone: '+91 98765 43210',
      amount: `₹${grandTotal.toLocaleString()}`,
      numericAmount: grandTotal,
      due: 'Due in 7 days',
      date: 'Today',
      isOverdue: false,
      status: 'PENDING' as const,
      deliveryPartnerName: selectedPartner ? selectedPartner.name : 'Unassigned',
      deliveryStatus: 'Pending' as const,
      currentLocation: 'At Store / Central Warehouse',
      items: selectedItemsList,
      subtotal,
      tax,
      notes: notes.trim() || 'Created via ChaiFlow Admin app.',
    };

    await addInvoice(
      selectedCustomer.name,
      grandTotal,
      'Due in 7 days',
      fullOrderObj,
    );

    triggerToast('Order Created Successfully!');
    setTimeout(() => {
      navigation.replace('InvoiceDetail', { invoice: fullOrderObj });
    }, 600);
  };

  // Render Product Item for FlatList
  const renderProductItem = ({ item }: { item: ProductItem }) => {
    const qty = quantities[item.id] || 0;
    const priceNum = parseFloat(item.price) || 0;

    return (
      <View style={styles.productCard}>
        <View style={styles.productInfo}>
          <Text style={styles.productName}>{item.name}</Text>
          <Text style={styles.productPrice}>₹{priceNum.toLocaleString()} / {item.unit || 'unit'}</Text>
        </View>

        {/* Quantity Counter Buttons */}
        <View style={styles.qtyContainer}>
          <TouchableOpacity
            activeOpacity={0.7}
            style={[styles.qtyBtn, qty === 0 && styles.qtyBtnDisabled]}
            onPress={() => handleQuantityChange(item.id, -1)}
            disabled={qty === 0}
          >
            <Ionicons name="remove" size={16} color={qty === 0 ? '#C4B9B1' : '#A52A0A'} />
          </TouchableOpacity>

          <Text style={styles.qtyText}>{qty}</Text>

          <TouchableOpacity
            activeOpacity={0.7}
            style={styles.qtyBtnAdd}
            onPress={() => handleQuantityChange(item.id, 1)}
          >
            <Ionicons name="add" size={16} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      {/* Header */}
      <Header title="Create Order" showBack={true} showNotification={false} />

      {toastMessage !== '' && (
        <View style={styles.toast}>
          <Ionicons name="checkmark-circle-outline" size={20} color="#FFFFFF" />
          <Text style={styles.toastText}>{toastMessage}</Text>
        </View>
      )}

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Subtitle Header Card */}
        <View style={styles.subHeaderCard}>
          <Text style={styles.subHeaderTitle}>New Order Setup</Text>
          <Text style={styles.subHeaderSubtitle}>Choose customer, items and delivery partner</Text>
        </View>

        {/* 1. Customer Selector */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>1. SELECT CUSTOMER</Text>

          <TouchableOpacity
            activeOpacity={0.8}
            style={styles.dropdownBtn}
            onPress={() => setIsCustomerModalVisible(true)}
          >
            <View style={styles.dropdownLeft}>
              <Ionicons name="person-circle-outline" size={22} color="#A52A0A" />
              <View style={{ marginLeft: 10 }}>
                <Text style={styles.dropdownValueText}>
                  {selectedCustomer ? selectedCustomer.name : 'Select a Customer'}
                </Text>
                {selectedCustomer && (
                  <Text style={styles.dropdownSubText} numberOfLines={1}>
                    {selectedCustomer.address}
                  </Text>
                )}
              </View>
            </View>
            <Ionicons name="chevron-down" size={18} color="#7C6E65" />
          </TouchableOpacity>
        </View>

        {/* 2. Products List */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>2. SELECT PRODUCTS & QUANTITY</Text>
          <FlatList
            data={products}
            keyExtractor={p => p.id}
            renderItem={renderProductItem}
            scrollEnabled={false}
          />
        </View>

        {/* 3. Delivery Partner Selector */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>3. ASSIGN DELIVERY PARTNER</Text>

          <TouchableOpacity
            activeOpacity={0.8}
            style={styles.dropdownBtn}
            onPress={() => setIsPartnerModalVisible(true)}
          >
            <View style={styles.dropdownLeft}>
              <Ionicons name="bicycle-outline" size={22} color="#A52A0A" />
              <View style={{ marginLeft: 10 }}>
                <Text style={styles.dropdownValueText}>
                  {selectedPartner ? selectedPartner.name : 'Select Delivery Partner'}
                </Text>
                {selectedPartner && (
                  <Text style={styles.dropdownSubText}>
                    {selectedPartner.vehicleType} • {selectedPartner.status}
                  </Text>
                )}
              </View>
            </View>
            <Ionicons name="chevron-down" size={18} color="#7C6E65" />
          </TouchableOpacity>
        </View>

        {/* Additional Notes */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>ORDER NOTES (OPTIONAL)</Text>
          <TextInput
            style={styles.notesInput}
            placeholder="Special delivery instructions or order notes..."
            placeholderTextColor="#A09489"
            multiline
            value={notes}
            onChangeText={setNotes}
          />
        </View>

        {/* 4. Order Total Summary Card */}
        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>ORDER SUMMARY</Text>

          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Selected Items ({selectedItemsList.length})</Text>
            <Text style={styles.summaryVal}>₹{subtotal.toLocaleString()}</Text>
          </View>

          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>GST (5%)</Text>
            <Text style={styles.summaryVal}>₹{tax.toLocaleString()}</Text>
          </View>

          <View style={[styles.summaryRow, styles.totalRow]}>
            <Text style={styles.totalLabel}>Total Amount</Text>
            <Text style={styles.totalVal}>₹{grandTotal.toLocaleString()}</Text>
          </View>
        </View>

        {/* Primary Create Order Button */}
        <TouchableOpacity
          activeOpacity={0.88}
          style={styles.submitBtn}
          onPress={handleCreateOrder}
        >
          <Ionicons name="checkmark-circle-outline" size={20} color="#FFFFFF" style={{ marginRight: 8 }} />
          <Text style={styles.submitBtnText}>Create Order</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Customer Selection Modal */}
      <Modal
        visible={isCustomerModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setIsCustomerModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Choose Customer</Text>
              <TouchableOpacity onPress={() => setIsCustomerModalVisible(false)}>
                <Ionicons name="close" size={22} color="#1F1511" />
              </TouchableOpacity>
            </View>

            <FlatList
              data={customers}
              keyExtractor={c => c.id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.modalItem}
                  onPress={() => {
                    setSelectedCustomer(item);
                    setIsCustomerModalVisible(false);
                  }}
                >
                  <Ionicons name="person" size={18} color="#A52A0A" />
                  <View style={{ marginLeft: 12 }}>
                    <Text style={styles.modalItemName}>{item.name}</Text>
                    <Text style={styles.modalItemSub}>{item.address}</Text>
                  </View>
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>

      {/* Delivery Partner Selection Modal */}
      <Modal
        visible={isPartnerModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setIsPartnerModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Choose Delivery Partner</Text>
              <TouchableOpacity onPress={() => setIsPartnerModalVisible(false)}>
                <Ionicons name="close" size={22} color="#1F1511" />
              </TouchableOpacity>
            </View>

            <FlatList
              data={deliveryBoys}
              keyExtractor={b => b.id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.modalItem}
                  onPress={() => {
                    setSelectedPartner(item);
                    setIsPartnerModalVisible(false);
                  }}
                >
                  <Ionicons name="bicycle" size={18} color="#A52A0A" />
                  <View style={{ marginLeft: 12 }}>
                    <Text style={styles.modalItemName}>{item.name}</Text>
                    <Text style={styles.modalItemSub}>{item.vehicleType || 'Delivery Boy'} • {item.status}</Text>
                  </View>
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>

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
  toast: {
    position: 'absolute',
    top: 50,
    left: 20,
    right: 20,
    backgroundColor: '#A52A0A',
    borderRadius: 14,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 999,
    elevation: 6,
  },
  toastText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
    marginLeft: 8,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  subHeaderCard: {
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
  subHeaderTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#1F1511',
  },
  subHeaderSubtitle: {
    fontSize: 12,
    color: '#7C6E65',
    fontWeight: '600',
    marginTop: 2,
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
  sectionTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#A52A0A',
    letterSpacing: 0.8,
    marginBottom: 12,
  },
  dropdownBtn: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FAF8F5',
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E8E3DF',
  },
  dropdownLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  dropdownValueText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1F1511',
  },
  dropdownSubText: {
    fontSize: 11,
    color: '#7C6E65',
    marginTop: 1,
  },
  productCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F3EFEA',
  },
  productInfo: {
    flex: 1,
    paddingRight: 10,
  },
  productName: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1F1511',
  },
  productPrice: {
    fontSize: 12,
    fontWeight: '600',
    color: '#7C6E65',
    marginTop: 2,
  },
  qtyContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FAF8F5',
    borderRadius: 12,
    padding: 4,
    borderWidth: 1,
    borderColor: '#E8E3DF',
  },
  qtyBtn: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: '#F3EFEA',
    justifyContent: 'center',
    alignItems: 'center',
  },
  qtyBtnDisabled: {
    backgroundColor: '#FAFAF8',
  },
  qtyBtnAdd: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: '#A52A0A',
    justifyContent: 'center',
    alignItems: 'center',
  },
  qtyText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1F1511',
    width: 28,
    textAlign: 'center',
  },
  notesInput: {
    backgroundColor: '#FAF8F5',
    borderRadius: 12,
    padding: 12,
    fontSize: 13,
    color: '#1F1511',
    height: 60,
    textAlignVertical: 'top',
    borderWidth: 1,
    borderColor: '#E8E3DF',
  },
  summaryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#EFECE9',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
  },
  summaryTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#8A7A70',
    letterSpacing: 0.8,
    marginBottom: 10,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  summaryLabel: {
    fontSize: 13,
    color: '#6E6259',
    fontWeight: '600',
  },
  summaryVal: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1F1511',
  },
  totalRow: {
    paddingTop: 10,
    marginTop: 4,
    borderTopWidth: 1,
    borderTopColor: '#F3EFEA',
    marginBottom: 0,
  },
  totalLabel: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1F1511',
  },
  totalVal: {
    fontSize: 18,
    fontWeight: '900',
    color: '#A52A0A',
  },
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#A52A0A',
    borderRadius: 16,
    paddingVertical: 14,
    elevation: 3,
  },
  submitBtnText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: '70%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#1F1511',
  },
  modalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3EFEA',
  },
  modalItemName: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1F1511',
  },
  modalItemSub: {
    fontSize: 11,
    color: '#7C6E65',
    marginTop: 2,
  },
});
