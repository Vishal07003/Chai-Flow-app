import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  TextInput,
  Image,
  Modal,
  FlatList,
  ScrollView,
  ActivityIndicator,
  Platform,
  Alert,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import Ionicons from 'react-native-vector-icons/Ionicons';
import Toast from 'react-native-toast-message';
import { useApp } from '../../context/AppContext';
import billingService, { BillingCustomer } from '../../services/billing.service';
import orderService from '../../services/order.service';
import deliveryService, { DeliveryPartnerProfile } from '../../services/delivery.service';
import draftService, { DraftInvoice } from '../../services/draft.service';
import { CustomDialog, ConfirmDialog, DeliveryPartnerDropdown } from '../../components/common';
import CalendarPickerModal from '../../components/common/CalendarPickerModal';
import { AddCustomerModal, type AddCustomerFormData } from '../../components/customer';

const TEA_IMAGES: { [key: string]: string } = {
  'Masala Chai':
    'https://images.unsplash.com/photo-1576092768241-dec231879fc3?w=300&auto=format&fit=crop',
  'Ginger Chai':
    'https://images.unsplash.com/photo-1544787219-7f47ccb76574?w=300&auto=format&fit=crop',
  'Elaichi Chai':
    'https://images.unsplash.com/photo-1561336313-0bd5e0b27ec8?w=300&auto=format&fit=crop',
  'Green Tea':
    'https://images.unsplash.com/photo-1627435601361-ec25f5b1d0e5?w=300&auto=format&fit=crop',
  'Adrak Chai':
    'https://images.unsplash.com/photo-1597481499750-3e6b22637e12?w=300&auto=format&fit=crop',
  'Tulsi Chai':
    'https://images.unsplash.com/photo-1571934811356-5cc061b6821f?w=300&auto=format&fit=crop',
  'Lemon Tea':
    'https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=300&auto=format&fit=crop',
  'Cinnamon Chai':
    'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=300&auto=format&fit=crop',
  'Full Cream Milk':
    'https://images.unsplash.com/photo-1563636619-e9143da7973b?w=300&auto=format&fit=crop',
  'Sugar Sachet':
    'https://images.unsplash.com/photo-1581441363689-1f3c3c414635?w=300&auto=format&fit=crop',
};

const DEFAULT_TEA_IMAGE =
  'https://images.unsplash.com/photo-1576092768241-dec231879fc3?w=300&auto=format&fit=crop';

export default function QuickBillingScreen({ route, navigation }: any) {
  const insets = useSafeAreaInsets();
  const { products, addProduct, refreshBackendData } = useApp();

  const isOrderMode = route?.params?.mode === 'order';
  const routeCustomer = route?.params?.customer;
  const initialCustomerId = route?.params?.customerId;
  const prefilledItems = route?.params?.prefilledItems;
  const routeDraftId = route?.params?.draftId;
  const isFromTab = Boolean(route?.params?.fromTab);

  // Show Back Button if:
  // 1. In Order Mode (e.g. Orders -> New Order)
  // 2. Editing an existing draft (draftId present)
  // 3. Came with an explicit non-tab flag (fromOrders, customer prefill, prefilled items)
  // When opened directly from the Billing bottom tab, showBackButton is false.
  const showBackButton = isOrderMode || Boolean(routeDraftId) || Boolean(route?.params?.fromOrders) || (Boolean(routeCustomer || initialCustomerId || prefilledItems) && !isFromTab);

  // Draft Edit State
  const [editingDraft, setEditingDraft] = useState<DraftInvoice | null>(null);
  const [loadingDraftDetail, setLoadingDraftDetail] = useState<boolean>(false);
  const [dueDate, setDueDate] = useState<string>('');
  const [showDatePicker, setShowDatePicker] = useState<boolean>(false);
  const [draftNotes, setDraftNotes] = useState<string>('');
  const [customUnitPrices, setCustomUnitPrices] = useState<{ [productId: string]: string }>({});

  // Search filter for products
  const [productSearchQuery, setProductSearchQuery] = useState<string>('');
  const [productViewMode, setProductViewMode] = useState<'grid' | 'list'>('grid');

  // Cart Quantities: productId -> qty (string to support intermediate empty/typing states without losing product)
  const [cartQuantities, setCartQuantities] = useState<{ [productId: string]: string }>({});
  const [addedOrder, setAddedOrder] = useState<string[]>([]);

  // Scroll ref for keyboard awareness
  const scrollRef = useRef<any>(null);

  // Customer State (Optional selection in billing mode, required in order mode)
  const [selectedCustomer, setSelectedCustomer] = useState<BillingCustomer | null>(null);
  const [showCustomerModal, setShowCustomerModal] = useState<boolean>(false);
  const [customerSearch, setCustomerSearch] = useState<string>('');
  const [customersList, setCustomersList] = useState<BillingCustomer[]>([]);
  const [loadingCustomers, setLoadingCustomers] = useState<boolean>(false);

  // New Customer Modal
  const [showAddCustomerModal, setShowAddCustomerModal] = useState<boolean>(false);

  // Delivery Details (Used in Order Mode)
  const [deliveryAddress, setDeliveryAddress] = useState<string>('');
  const [selectedPartnerId, setSelectedPartnerId] = useState<number | null>(null);
  const [orderNotes, setOrderNotes] = useState<string>('');
  const [partners, setPartners] = useState<DeliveryPartnerProfile[]>([]);
  const [loadingPartners, setLoadingPartners] = useState<boolean>(false);

  // Payment Options: Status (Full, Partial, Unpaid), Method (Cash, Online)
  const [paymentStatus, setPaymentStatus] = useState<'FULL' | 'PARTIAL' | 'UNPAID'>('FULL');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'online'>('cash');
  const [discount, setDiscount] = useState<string>('');
  const [receivedAmount, setReceivedAmount] = useState<string>('');
  const [isSaving, setIsSaving] = useState<boolean>(false);

  // Toast
  const [toastConfig, setToastConfig] = useState<{ msg: string; isError?: boolean } | null>(null);

  // Premium Confirm Dialog State
  const [confirmDialogConfig, setConfirmDialogConfig] = useState<{
    visible: boolean;
    title: string;
    description?: string;
    confirmLabel?: string;
    cancelLabel?: string;
    type?: 'danger' | 'warning' | 'info' | 'success';
    icon?: string;
    onConfirm: () => void | Promise<void>;
  }>({
    visible: false,
    title: '',
    onConfirm: () => {},
  });

  const closeConfirmDialog = useCallback(() => {
    setConfirmDialogConfig(prev => ({ ...prev, visible: false }));
  }, []);

  // Custom Popup Dialog State
  const [dialogConfig, setDialogConfig] = useState<{
    visible: boolean;
    title: string;
    message?: string;
    type?: 'confirm' | 'success' | 'danger' | 'info';
    buttons?: Array<{
      text: string;
      style?: 'default' | 'cancel' | 'destructive';
      onPress?: () => void;
      loading?: boolean;
    }>;
  }>({
    visible: false,
    title: '',
  });

  const closeDialog = useCallback(() => {
    setDialogConfig(prev => ({ ...prev, visible: false }));
  }, []);

  const showToast = useCallback((msg: string, isError: boolean = false) => {
    setToastConfig({ msg, isError });
    setTimeout(() => setToastConfig(null), 2500);
  }, []);

  const parseProductPrice = useCallback((priceStr: string | number): number => {
    if (typeof priceStr === 'number') return priceStr;
    const clean = String(priceStr || '0').replace(/[^0-9.]/g, '');
    return parseFloat(clean) || 0;
  }, []);

  const formatPriceDisplay = useCallback((priceVal: string | number): string => {
    if (priceVal === undefined || priceVal === null) return '₹0';
    const str = String(priceVal).trim();
    if (str.startsWith('₹')) return str;
    return `₹${str}`;
  }, []);

  // Filtered Products
  const filteredProducts = useMemo(() => {
    if (!productSearchQuery.trim()) return products;
    const q = productSearchQuery.toLowerCase();
    return products.filter(
      p =>
        p.name.toLowerCase().includes(q) ||
        p.category?.toLowerCase().includes(q),
    );
  }, [products, productSearchQuery]);

  // Line items (Derived from selected products in addedOrder)
  const lineItems = useMemo(() => {
    const items: Array<{ id: string; name: string; qty: number; price: number; rawQtyStr: string; rawPriceStr: string }> = [];
    addedOrder.forEach(pId => {
      const rawVal = cartQuantities[pId];
      const parsedQty = typeof rawVal === 'number' ? rawVal : parseInt(rawVal || '0', 10);
      const effectiveQty = isNaN(parsedQty) || parsedQty < 0 ? 0 : parsedQty;
      const prod = products.find(p => p.id === pId);
      if (prod) {
        const customP = customUnitPrices[pId];
        const effectivePrice = customP !== undefined ? (parseFloat(customP) || 0) : parseProductPrice(prod.price);
        items.push({
          id: prod.id,
          name: prod.name,
          qty: effectiveQty,
          rawQtyStr: rawVal !== undefined ? String(rawVal) : '1',
          price: effectivePrice,
          rawPriceStr: customP !== undefined ? String(customP) : String(effectivePrice),
        });
      }
    });
    return items;
  }, [addedOrder, cartQuantities, products, customUnitPrices, parseProductPrice]);

  const subtotal = useMemo(() => {
    return lineItems.reduce((acc, curr) => acc + curr.qty * curr.price, 0);
  }, [lineItems]);

  const discountAmount = useMemo(() => {
    const val = parseFloat(discount) || 0;
    return Math.max(0, Math.min(val, subtotal));
  }, [discount, subtotal]);

  const grandTotal = useMemo(() => {
    return Math.max(0, subtotal - discountAmount);
  }, [subtotal, discountAmount]);

  const totalItemsCount = useMemo(() => {
    return lineItems.reduce((acc, curr) => acc + curr.qty, 0);
  }, [lineItems]);

  // Fetch delivery partners when in order mode or billing mode (optional delivery partner for quick billing drafts)
  useEffect(() => {
    setLoadingPartners(true);
    deliveryService
      .getDeliveryPartners()
      .then(res => {
        setPartners(res || []);
      })
      .catch(err => {
        console.log('Error fetching delivery partners:', err);
        setPartners([]);
      })
      .finally(() => {
        setLoadingPartners(false);
      });
  }, []);

  // Fetch draft details if routeDraftId is provided (Edit Existing Draft)
  useEffect(() => {
    if (!routeDraftId) return;

    let isMounted = true;
    setLoadingDraftDetail(true);

    draftService
      .getDraftDetail(routeDraftId)
      .then(draft => {
        if (!isMounted) return;
        setEditingDraft(draft);

        // Populate customer
        if (draft.customer) {
          setSelectedCustomer({
            id: Number(draft.customer),
            name: draft.customer_name || 'Customer',
            phone: draft.customer_phone || '',
            address: '',
            created_at: draft.created_at,
            total_bills: 0,
            total_billed_amount: '0',
            total_pending_amount: '0',
          });
        } else {
          setSelectedCustomer(null);
        }

        // Populate Delivery Partner
        if (draft.delivery_partner_id || draft.delivery_partner) {
          setSelectedPartnerId(Number(draft.delivery_partner_id || draft.delivery_partner));
        } else {
          setSelectedPartnerId(null);
        }

        // Populate Delivery Address
        if (draft.delivery_address) {
          setDeliveryAddress(draft.delivery_address);
        } else if (draft.customer && (draft as any).customer_address) {
          setDeliveryAddress((draft as any).customer_address);
        }

        // Populate Discount, Due Date, Notes
        if (draft.discount_amount && parseFloat(draft.discount_amount) > 0) {
          setDiscount(String(parseFloat(draft.discount_amount)));
        } else {
          setDiscount('');
        }

        if (draft.due_date) {
          setDueDate(draft.due_date);
        } else {
          setDueDate('');
        }

        if (draft.notes) {
          setDraftNotes(draft.notes);
        } else {
          setDraftNotes('');
        }

        // Populate Line Items
        const newQtys: { [productId: string]: string } = {};
        const newPrices: { [productId: string]: string } = {};
        const newOrder: string[] = [];

        (draft.items || []).forEach(item => {
          let matchedProd = products.find(
            p =>
              (item.product && String(p.id) === String(item.product)) ||
              (item.product_name && p.name.toLowerCase() === item.product_name.toLowerCase())
          );

          const pId = matchedProd ? String(matchedProd.id) : String(item.product || item.id);
          newQtys[pId] = String(item.quantity || 1);
          newPrices[pId] = String(parseFloat(item.unit_price || '0'));
          if (!newOrder.includes(pId)) {
            newOrder.push(pId);
          }
        });

        setCartQuantities(newQtys);
        setCustomUnitPrices(newPrices);
        setAddedOrder(newOrder);
      })
      .catch(err => {
        console.log('Error loading draft details:', err);
        Toast.show({
          type: 'error',
          text1: 'Failed to load draft',
          text2: err?.message || 'Could not fetch draft details.',
        });
      })
      .finally(() => {
        if (isMounted) setLoadingDraftDetail(false);
      });

    return () => {
      isMounted = false;
    };
  }, [routeDraftId, products]);

  // Preselect customer and prefill items from navigation params
  useEffect(() => {
    if (routeCustomer) {
      setSelectedCustomer({
        id: Number(routeCustomer.id),
        name: routeCustomer.name,
        phone: routeCustomer.phone || '',
        address: routeCustomer.address || '',
        created_at: routeCustomer.created_at || new Date().toISOString(),
        total_bills: routeCustomer.total_bills || 0,
        total_billed_amount: String(routeCustomer.total_billed_amount || '0'),
        total_pending_amount: String(routeCustomer.total_pending_amount || routeCustomer.amount || '0'),
      });
      if (routeCustomer.address && !deliveryAddress) {
        setDeliveryAddress(routeCustomer.address);
      }
    } else if (initialCustomerId) {
      billingService
        .getCustomers()
        .then(custs => {
          const matched = custs.find(c => String(c.id) === String(initialCustomerId));
          if (matched) {
            setSelectedCustomer(matched);
            if (matched.address && !deliveryAddress) {
              setDeliveryAddress(matched.address);
            }
          }
        })
        .catch(err => console.log('Error prefetching customer:', err));
    }

    if (prefilledItems && Array.isArray(prefilledItems) && prefilledItems.length > 0 && products.length > 0) {
      const newQtys: { [productId: string]: string } = {};
      const newOrder: string[] = [];

      prefilledItems.forEach(it => {
        // match by product_id or product_name in catalog
        const found = products.find(
          p => String(p.id) === String(it.product_id) || (it.product_name && p.name.toLowerCase() === it.product_name.toLowerCase())
        );
        if (found) {
          newQtys[found.id] = String(it.quantity || 1);
          if (!newOrder.includes(found.id)) {
            newOrder.push(found.id);
          }
        }
      });

      if (Object.keys(newQtys).length > 0) {
        setCartQuantities(newQtys);
        setAddedOrder(newOrder);
      }
    }
  }, [routeCustomer, initialCustomerId, prefilledItems, products]);

  // Auto-fill receivedAmount based on paymentStatus and grandTotal
  useEffect(() => {
    if (paymentStatus === 'FULL') {
      setReceivedAmount(grandTotal > 0 ? String(grandTotal) : '0');
    } else if (paymentStatus === 'UNPAID') {
      setReceivedAmount('0');
    }
  }, [grandTotal]);

  const handleSelectPaymentStatus = (status: 'FULL' | 'PARTIAL' | 'UNPAID') => {
    setPaymentStatus(status);
    if (status === 'FULL') {
      setReceivedAmount(grandTotal > 0 ? String(grandTotal) : '0');
    } else if (status === 'UNPAID') {
      setReceivedAmount('0');
    } else if (status === 'PARTIAL') {
      // If was full or 0, clear or prompt partial input
      if (receivedAmount === String(grandTotal) || receivedAmount === '0') {
        setReceivedAmount('');
      }
    }
  };

  const handleDiscountChange = (text: string) => {
    const cleanText = text.replace(/[^0-9.]/g, '');
    const numVal = parseFloat(cleanText) || 0;
    if (numVal > subtotal && subtotal > 0) {
      setDiscount(String(subtotal));
    } else {
      setDiscount(cleanText);
    }
  };

  // Synchronize payment status when Owner manually edits received amount
  const handleReceivedAmountChange = (text: string) => {
    // Sanitize non-numeric characters (allow decimal if needed, but integers preferred)
    const cleanText = text.replace(/[^0-9.]/g, '');
    setReceivedAmount(cleanText);

    if (cleanText === '') {
      setPaymentStatus('PARTIAL');
      return;
    }

    const numericVal = parseFloat(cleanText);
    if (isNaN(numericVal) || numericVal <= 0) {
      setPaymentStatus('UNPAID');
    } else if (numericVal >= grandTotal && grandTotal > 0) {
      setPaymentStatus('FULL');
    } else {
      setPaymentStatus('PARTIAL');
    }
  };

  // Load customers for selection
  const fetchCustomers = useCallback(async (query: string = '') => {
    setLoadingCustomers(true);
    try {
      const res = await billingService.getCustomers(query);
      setCustomersList(res);
    } catch {
      // Fallback
    } finally {
      setLoadingCustomers(false);
    }
  }, []);

  const handleOpenCustomerModal = () => {
    setShowCustomerModal(true);
    fetchCustomers(customerSearch);
  };

  const handleCreateCustomer = async (data: AddCustomerFormData) => {
    try {
      const created = await billingService.createCustomer({
        name: data.name,
        phone: data.phone,
        address: data.address,
        opening_balance: data.openingBalance,
      });
      setSelectedCustomer(created);
      if (created.address && !deliveryAddress) {
        setDeliveryAddress(created.address);
      }
      setShowAddCustomerModal(false);
      setShowCustomerModal(false);
      showToast(`Customer ${created.name} added!`);
    } catch (err: any) {
      showToast(err.message || err.detail || 'Failed to add customer', true);
      throw err;
    }
  };

  const updateQuantity = useCallback(
    (productId: string, delta: number) => {
      setCartQuantities(prev => {
        const rawCurrent = prev[productId];
        const currentNum = rawCurrent !== undefined ? (parseInt(rawCurrent, 10) || 0) : 0;
        const updatedNum = Math.max(0, currentNum + delta);
        return { ...prev, [productId]: String(updatedNum) };
      });

      setAddedOrder(prev => {
        if (!prev.includes(productId)) {
          return [...prev, productId];
        }
        return prev;
      });
    },
    [],
  );

  const handleClearCart = useCallback(() => {
    setCartQuantities({});
    setCustomUnitPrices({});
    setAddedOrder([]);
    setSelectedCustomer(null);
    setReceivedAmount('0');
    setPaymentStatus('FULL');
    setPaymentMethod('cash');
    setDeliveryAddress('');
    setSelectedPartnerId(null);
    setOrderNotes('');
    setDueDate('');
    setDraftNotes('');
  }, []);

  const handlePromptClearCart = () => {
    if (addedOrder.length === 0) return;
    setDialogConfig({
      visible: true,
      title: isOrderMode ? 'Clear Order?' : 'Clear Bill?',
      message: isOrderMode
        ? 'Are you sure you want to remove all items and reset this order?'
        : 'Are you sure you want to remove all items and reset this bill?',
      type: 'danger',
      buttons: [
        { text: 'Cancel', style: 'cancel', onPress: closeDialog },
        {
          text: 'Clear All',
          style: 'destructive',
          onPress: () => {
            closeDialog();
            handleClearCart();
          },
        },
      ],
    });
  };

  // Direct editing of quantity in text input - preserves product in cart even if temporarily empty or zero
  const handleDirectQtyChange = (productId: string, text: string) => {
    const cleanText = text.replace(/[^0-9]/g, '');
    setCartQuantities(prev => ({
      ...prev,
      [productId]: cleanText,
    }));
    setAddedOrder(prev => (prev.includes(productId) ? prev : [...prev, productId]));
  };

  // When user finishes typing / blurs input, normalize empty or 0 to '1' (or min 1)
  const handleQtyBlur = (productId: string) => {
    setCartQuantities(prev => {
      const cur = prev[productId];
      const parsed = parseInt(cur, 10);
      if (isNaN(parsed) || parsed <= 0) {
        return { ...prev, [productId]: '1' };
      }
      return { ...prev, [productId]: String(parsed) };
    });
  };

  const handlePromptRemoveItem = (productId: string, productName: string) => {
    setDialogConfig({
      visible: true,
      title: 'Remove Product?',
      message: `Are you sure you want to remove "${productName}" from the ${isOrderMode ? 'order' : 'bill'}?`,
      type: 'danger',
      buttons: [
        { text: 'Cancel', style: 'cancel', onPress: closeDialog },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => {
            closeDialog();
            handleRemoveItem(productId);
          },
        },
      ],
    });
  };

  // Direct editing of unit price in text input
  const handleDirectPriceChange = (productId: string, text: string) => {
    const cleanText = text.replace(/[^0-9.]/g, '');
    setCustomUnitPrices(prev => ({
      ...prev,
      [productId]: cleanText,
    }));
  };

  const handlePriceBlur = (productId: string, defaultPrice: number) => {
    setCustomUnitPrices(prev => {
      const cur = prev[productId];
      const parsed = parseFloat(cur);
      if (isNaN(parsed) || parsed < 0) {
        return { ...prev, [productId]: String(defaultPrice) };
      }
      return { ...prev, [productId]: String(parsed) };
    });
  };

  // Explicit product removal
  const handleRemoveItem = (productId: string) => {
    setCartQuantities(prev => {
      const next = { ...prev };
      delete next[productId];
      return next;
    });
    setCustomUnitPrices(prev => {
      const next = { ...prev };
      delete next[productId];
      return next;
    });
    setAddedOrder(prev => prev.filter(id => id !== productId));
  };

  // Execute Order Creation in Django Backend (Order Mode)
  const executeSaveOrder = async () => {
    closeDialog();
    closeConfirmDialog();
    if (isSaving) return;
    setIsSaving(true);

    try {
      const itemsPayload = lineItems.map(item => ({
        product_id: Number(item.id),
        quantity: item.qty,
      }));

      const createdOrder = await orderService.createOrder({
        customer_id: selectedCustomer ? selectedCustomer.id : null,
        delivery_partner_id: selectedPartnerId,
        delivery_address: deliveryAddress.trim() || selectedCustomer?.address || 'Counter Sale / Stalls',
        notes: orderNotes.trim(),
        items: itemsPayload,
      });

      // Reset form
      handleClearCart();

      // Refresh backend datasets
      refreshBackendData();

      Toast.show({
        type: 'success',
        text1: `Order #${createdOrder.id} Placed`,
        text2: 'Order saved in PENDING status. No invoice or payment created.',
      });

      setTimeout(() => {
        navigation.navigate('Orders');
      }, 500);
    } catch (err: any) {
      Toast.show({
        type: 'error',
        text1: 'Failed to create order',
        text2: err.message || err.detail || 'Please check your connection and try again.',
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Validate date in YYYY-MM-DD format
  const isValidDateFormat = (dStr: string) => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dStr)) return false;
    const [y, m, d] = dStr.split('-').map(Number);
    if (m < 1 || m > 12 || d < 1 || d > 31) return false;
    const dt = new Date(y, m - 1, d);
    return dt.getFullYear() === y && dt.getMonth() === m - 1 && dt.getDate() === d;
  };

  // Execute Draft Creation / Update in Django Backend (Draft Billing Mode)
  const executeSaveDraft = async () => {
    closeDialog();
    closeConfirmDialog();
    if (isSaving) return;
    setIsSaving(true);

    try {
      const itemsPayload = lineItems.map(item => ({
        product_id: Number(item.id) || null,
        product_name: item.name,
        quantity: item.qty,
        unit_price: item.price,
      }));

      const trimmedDueDate = dueDate.trim();
      if (trimmedDueDate && !isValidDateFormat(trimmedDueDate)) {
        Toast.show({
          type: 'error',
          text1: 'Invalid Due Date',
          text2: 'Please enter a valid date in YYYY-MM-DD format (e.g. 2026-12-01).',
        });
        return;
      }
      const cleanDueDate = trimmedDueDate || null;
      const cleanNotes = draftNotes.trim();

      if (editingDraft) {
        // Edit existing draft -> PATCH /api/v1/billing/drafts/{id}/
        await draftService.updateDraft(editingDraft.id, {
          customer_id: selectedCustomer ? selectedCustomer.id : null,
          delivery_partner_id: selectedPartnerId,
          delivery_address: deliveryAddress.trim() || undefined,
          items: itemsPayload,
          discount_amount: discountAmount,
          due_date: cleanDueDate,
          notes: cleanNotes,
        });

        // Reset form
        handleClearCart();

        // Refresh backend datasets
        refreshBackendData();

        Toast.show({
          type: 'success',
          text1: 'Draft Updated',
          text2: `Draft ${editingDraft.draft_number} saved successfully.`,
        });

        setTimeout(() => {
          navigation.navigate('Orders');
        }, 400);
      } else {
        // Create new draft -> POST /api/v1/billing/drafts/
        const createdDraft = await draftService.createDraft({
          customer_id: selectedCustomer ? selectedCustomer.id : null,
          delivery_partner_id: selectedPartnerId,
          delivery_address: deliveryAddress.trim() || undefined,
          billing_source: 'quick_billing',
          items: itemsPayload,
          discount_amount: discountAmount,
          due_date: cleanDueDate,
          notes: cleanNotes,
        });

        // Reset form
        handleClearCart();

        // Refresh backend datasets
        refreshBackendData();

        Toast.show({
          type: 'success',
          text1: 'Draft Bill Created',
          text2: `Draft ${createdDraft.draft_number} saved in Draft Bills.`,
        });

        setTimeout(() => {
          navigation.navigate('Orders');
        }, 400);
      }
    } catch (err: any) {
      Toast.show({
        type: 'error',
        text1: editingDraft ? 'Failed to update draft' : 'Failed to create draft',
        text2: err.message || err.detail || 'Please check your connection and try again.',
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Show Confirmation Popup on the same screen using Premium ConfirmDialog
  const handleSaveBill = () => {
    if (isSaving) return;

    if (lineItems.length === 0) {
      Toast.show({
        type: 'error',
        text1: isOrderMode ? 'Empty Order' : 'Empty Bill',
        text2: `Please add at least 1 product to the ${isOrderMode ? 'order' : 'bill'}!`,
      });
      return;
    }

    // Verify all line items have a valid quantity greater than zero
    const hasZeroOrInvalidQty = lineItems.some(it => it.qty <= 0);
    if (hasZeroOrInvalidQty) {
      Toast.show({
        type: 'error',
        text1: 'Invalid Quantity',
        text2: 'Please ensure all selected products have a quantity of at least 1.',
      });
      return;
    }

    if (isOrderMode) {
      if (!selectedCustomer) {
        Toast.show({
          type: 'error',
          text1: 'Customer Required',
          text2: 'Please select a customer for this order.',
        });
        return;
      }

      const assignedPartnerName = selectedPartnerId
        ? partners.find(p => p.id === selectedPartnerId)?.name || 'Assigned Partner'
        : 'Unassigned (Kitchen queue)';

      setConfirmDialogConfig({
        visible: true,
        title: 'Confirm Order Creation?',
        description: `Customer: ${selectedCustomer.name}\nTotal Items: ${totalItemsCount}\nTotal Commercial Value: ₹${subtotal}\nDelivery Address: ${deliveryAddress.trim() || selectedCustomer.address || 'Standard Address'}\nPartner: ${assignedPartnerName}\n\nNotice: Order will be saved in PENDING status. No invoice is issued and no payment is collected until manually approved.`,
        confirmLabel: 'Create Order',
        cancelLabel: 'Cancel',
        type: 'info',
        icon: 'bag-check-outline',
        onConfirm: executeSaveOrder,
      });
      return;
    }

    // Quick Billing Mode -> Save as Draft (New or Edit)
    const trimmedDueDate = dueDate.trim();
    if (trimmedDueDate && !isValidDateFormat(trimmedDueDate)) {
      Toast.show({
        type: 'error',
        text1: 'Invalid Due Date',
        text2: 'Please enter a valid date in YYYY-MM-DD format (e.g. 2026-12-01).',
      });
      return;
    }
    if (selectedPartnerId) {
      const effectiveAddress = deliveryAddress.trim() || selectedCustomer?.address?.trim();
      if (!selectedCustomer && !deliveryAddress.trim()) {
        Toast.show({
          type: 'error',
          text1: 'Delivery Address Required',
          text2: 'Please enter a destination address for this walk-in delivery order.',
        });
        return;
      }
      if (selectedCustomer && !effectiveAddress) {
        Toast.show({
          type: 'error',
          text1: 'Delivery Address Required',
          text2: 'Selected customer has no saved address. Please enter a delivery address.',
        });
        return;
      }
    }

    const assignedPartnerName = selectedPartnerId
      ? partners.find(p => p.id === selectedPartnerId)?.name || 'Assigned Delivery Partner'
      : 'None (Self pickup / Counter)';

    const isEditing = !!editingDraft;

    setConfirmDialogConfig({
      visible: true,
      title: isEditing ? `Update Draft ${editingDraft.draft_number}?` : 'Save as Billing Draft?',
      description: `Customer: ${selectedCustomer ? selectedCustomer.name : 'Walk-in Customer'}\nItems: ${totalItemsCount} units\nSubtotal: ₹${subtotal}${discountAmount > 0 ? ` • Discount: -₹${discountAmount}` : ''}\nEstimated Grand Total: ₹${grandTotal}\nDelivery Partner: ${assignedPartnerName}${dueDate ? `\nDue Date: ${dueDate}` : ''}\n\nNotice: This saves a flexible Draft Bill. Official invoice finalization and ledger posting occur from Draft Bills in the Orders Hub.`,
      confirmLabel: isEditing ? 'Update Draft' : 'Save Draft',
      cancelLabel: 'Cancel',
      type: 'info',
      icon: 'receipt-outline',
      onConfirm: executeSaveDraft,
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* HEADER */}
      <View style={styles.topHeaderBar}>
        <View style={styles.headerTitleGroup}>
          {showBackButton && (
            <TouchableOpacity
              style={styles.backBtn}
              onPress={() => navigation.goBack()}
              activeOpacity={0.7}
            >
              <Ionicons name="arrow-back" size={22} color="#111827" />
            </TouchableOpacity>
          )}

          <View style={styles.teaLogoIconContainer}>
            <Ionicons name={isOrderMode ? "cart" : editingDraft ? "document-text" : "cafe"} size={16} color="#8C331A" />
          </View>
          <Text style={styles.headerTitleText}>
            {isOrderMode ? 'New Order' : editingDraft ? `Edit Draft (${editingDraft.draft_number})` : 'Quick Billing Draft'}
          </Text>
        </View>

        <TouchableOpacity
          activeOpacity={0.85}
          style={styles.historyBtn}
          onPress={() => navigation.navigate('Orders')}
        >
          <Ionicons
            name="receipt-outline"
            size={16}
            color="#8C331A"
            style={{ marginRight: 4 }}
          />
          <Text style={styles.historyBtnText}>{isOrderMode ? 'Orders' : 'Draft Bills'}</Text>
        </TouchableOpacity>
      </View>

      {toastConfig && (
        <View style={[styles.toastContainer, toastConfig.isError && styles.toastContainerError]}>
          <Ionicons
            name={toastConfig.isError ? 'alert-circle' : 'checkmark-circle'}
            size={20}
            color="#FFFFFF"
          />
          <Text style={styles.toastText}>{toastConfig.msg}</Text>
        </View>
      )}

      {loadingDraftDetail ? (
        <View style={styles.centerLoadingBox}>
          <ActivityIndicator size="large" color="#8C331A" />
          <Text style={styles.loadingDraftText}>Loading draft details...</Text>
        </View>
      ) : (
        <KeyboardAwareScrollView
          ref={scrollRef}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          enableOnAndroid={true}
          enableAutomaticScroll={true}
          extraScrollHeight={Platform.OS === 'android' ? 140 : 100}
          extraHeight={Platform.OS === 'android' ? 140 : 100}
          keyboardOpeningTime={0}
          keyboardShouldPersistTaps="handled"
        >
        {/* CUSTOMER SELECTION BAR */}
        <View style={styles.customerCard}>
          <View style={styles.customerInfoRow}>
            <View style={styles.customerAvatar}>
              <Ionicons name="person" size={18} color="#8C331A" />
            </View>
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={styles.customerName}>
                {selectedCustomer
                  ? selectedCustomer.name
                  : isOrderMode
                    ? 'Select Customer (Required)'
                    : 'Walk-in Customer'}
              </Text>
              <Text style={styles.customerSub} numberOfLines={1}>
                {selectedCustomer
                  ? `${selectedCustomer.phone ? selectedCustomer.phone + ' • ' : ''}${selectedCustomer.address || 'Counter Account'}`
                  : isOrderMode
                    ? 'Tap Select / Add to assign order recipient'
                    : 'Counter Sale (No account selected)'}
              </Text>
            </View>

            {selectedCustomer ? (
              <View style={styles.customerActionRow}>
                <TouchableOpacity
                  onPress={handleOpenCustomerModal}
                  style={styles.customerChangeMiniBtn}
                >
                  <Text style={styles.customerChangeMiniText}>Change</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setSelectedCustomer(null)}
                  style={styles.customerRemoveBtn}
                >
                  <Ionicons name="close-circle-outline" size={18} color="#EF4444" />
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity
                onPress={handleOpenCustomerModal}
                style={styles.customerSelectBtn}
              >
                <Ionicons name="person-add-outline" size={13} color="#FFFFFF" style={{ marginRight: 4 }} />
                <Text style={styles.customerSelectText}>Select / Add</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* SECTION 2: DELIVERY PARTNER SELECTION (OPTIONAL FOR BOTH ORDER AND QUICK BILLING DRAFT) */}
        <View style={styles.partnerSelectionCard}>
          <DeliveryPartnerDropdown
            selectedPartnerId={selectedPartnerId}
            onSelectPartner={(partnerId) => setSelectedPartnerId(partnerId)}
            label="DELIVERY PARTNER (OPTIONAL)"
            placeholder="Select Delivery Partner (Optional)"
            optional={true}
          />

          {/* Delivery Address field: Shown when in Order Mode OR when a Delivery Partner is selected in Draft Mode */}
          {(!isOrderMode && selectedPartnerId) && (
            <View style={{ marginTop: 12 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                <Ionicons name="location-outline" size={14} color="#8C331A" style={{ marginRight: 4 }} />
                <Text style={styles.orderFieldLabel}>
                  DELIVERY DESTINATION ADDRESS {selectedCustomer ? '(OPTIONAL OVERRIDE)' : '* (REQUIRED FOR WALK-IN)'}
                </Text>
              </View>
              <View style={styles.orderAddressBox}>
                <TextInput
                  style={[styles.orderAddressInput, { minHeight: 44 }]}
                  multiline
                  placeholder={
                    selectedCustomer?.address
                      ? `Defaults to customer address: ${selectedCustomer.address}`
                      : "Enter destination address for delivery partner..."
                  }
                  placeholderTextColor="#9CA3AF"
                  value={deliveryAddress}
                  onChangeText={setDeliveryAddress}
                />
              </View>
              {selectedCustomer?.address && !deliveryAddress ? (
                <Text style={{ fontSize: 11, color: '#6B7280', marginTop: 4, fontStyle: 'italic' }}>
                  Leave blank to use customer's saved address ({selectedCustomer.address})
                </Text>
              ) : null}
            </View>
          )}
        </View>

        {/* PRODUCTS SECTION HEADER & VIEW TOGGLE */}
        <View style={styles.productsHeaderRow}>
          <Text style={styles.productsSectionTitle}>Products</Text>
          <View style={styles.viewModeToggleGroup}>
            <TouchableOpacity
              style={[styles.viewModeBtn, productViewMode === 'grid' && styles.viewModeBtnActive]}
              onPress={() => setProductViewMode('grid')}
            >
              <Ionicons
                name="grid-outline"
                size={16}
                color={productViewMode === 'grid' ? '#8C331A' : '#9CA3AF'}
              />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.viewModeBtn, productViewMode === 'list' && styles.viewModeBtnActive]}
              onPress={() => setProductViewMode('list')}
            >
              <Ionicons
                name="list-outline"
                size={16}
                color={productViewMode === 'list' ? '#8C331A' : '#9CA3AF'}
              />
            </TouchableOpacity>
          </View>
        </View>

        {/* SEARCH BAR */}
        <View style={styles.searchBarContainer}>
          <Ionicons name="search-outline" size={16} color="#9CA3AF" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search tea, snacks, beverages..."
            placeholderTextColor="#9CA3AF"
            value={productSearchQuery}
            onChangeText={setProductSearchQuery}
          />
          {productSearchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setProductSearchQuery('')}>
              <Ionicons name="close-circle" size={16} color="#9CA3AF" />
            </TouchableOpacity>
          )}
        </View>

        {/* PRODUCT CATALOG: GRID OR LIST LAYOUT */}
        {productViewMode === 'grid' ? (
          <View style={styles.productThreeGrid}>
            {filteredProducts.map((p, idx) => {
              const rawQty = cartQuantities[p.id];
              const numQty = rawQty !== undefined ? (parseInt(rawQty, 10) || 0) : 0;
              const isSelected = addedOrder.includes(p.id) && numQty > 0;
              const imgUri = TEA_IMAGES[p.name] || DEFAULT_TEA_IMAGE;
              const isThirdInRow = (idx + 1) % 3 === 0;

              return (
                <TouchableOpacity
                  key={p.id}
                  activeOpacity={0.8}
                  style={[
                    styles.threeGridCard,
                    isThirdInRow && styles.threeGridCardThird,
                    isSelected && styles.threeGridCardSelected,
                  ]}
                  onPress={() => updateQuantity(p.id, 1)}
                >
                  {isSelected && (
                    <View style={styles.qtyBadge}>
                      <Text style={styles.qtyBadgeText}>{numQty}</Text>
                    </View>
                  )}

                  <Image source={{ uri: imgUri }} style={styles.teaCardImage} resizeMode="cover" />
                  <View style={styles.productTagRow}>
                    <Text style={styles.productIdTag}>#{p.id}</Text>
                    {p.unit ? <Text style={styles.productUnitTag}>{p.unit}</Text> : null}
                  </View>
                  <Text style={styles.threeGridCardTitle} numberOfLines={2}>
                    {p.name}
                  </Text>
                  <Text style={styles.threeGridCardPrice}>{formatPriceDisplay(p.price)}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        ) : (
          <View style={styles.productListView}>
            {filteredProducts.map(p => {
              const rawQty = cartQuantities[p.id];
              const numQty = rawQty !== undefined ? (parseInt(rawQty, 10) || 0) : 0;
              const isSelected = addedOrder.includes(p.id) && numQty > 0;
              const imgUri = TEA_IMAGES[p.name] || DEFAULT_TEA_IMAGE;

              return (
                <View
                  key={p.id}
                  style={[styles.productListRow, isSelected && styles.productListRowSelected]}
                >
                  <Image source={{ uri: imgUri }} style={styles.teaRowImage} resizeMode="cover" />
                  <View style={styles.productListInfoCol}>
                    <View style={styles.productRowTitleLine}>
                      <Text style={styles.productListTitle} numberOfLines={1}>
                        {p.name}
                      </Text>
                      <Text style={styles.productIdTag}>#{p.id}</Text>
                    </View>
                    <Text style={styles.productListPrice}>
                      {formatPriceDisplay(p.price)} {p.unit ? `• per ${p.unit}` : ''}
                    </Text>
                  </View>

                  <View style={styles.productListStepper}>
                    {isSelected ? (
                      <>
                        <TouchableOpacity
                          style={styles.miniMinusBtn}
                          onPress={() => updateQuantity(p.id, -1)}
                        >
                          <Ionicons name="remove" size={14} color="#8C331A" />
                        </TouchableOpacity>
                        <Text style={styles.miniQtyText}>{numQty}</Text>
                        <TouchableOpacity
                          style={styles.miniPlusBtn}
                          onPress={() => updateQuantity(p.id, 1)}
                        >
                          <Ionicons name="add" size={14} color="#FFFFFF" />
                        </TouchableOpacity>
                      </>
                    ) : (
                      <TouchableOpacity
                        style={styles.rowAddBtn}
                        onPress={() => updateQuantity(p.id, 1)}
                      >
                        <Ionicons name="add" size={14} color="#8C331A" style={{ marginRight: 2 }} />
                        <Text style={styles.rowAddBtnText}>Add</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {/* YOUR BILL & PAYMENT CARD */}
        <View style={styles.mergedBillSummaryCard}>
          <View style={styles.billHeaderRow}>
            <View style={styles.billTitleGroup}>
              <Ionicons
                name={isOrderMode ? "receipt-outline" : "cart-outline"}
                size={18}
                color="#111827"
                style={{ marginRight: 6 }}
              />
              <Text style={styles.billCardTitle}>{isOrderMode ? 'Order Summary' : 'Your Bill'}</Text>
              {totalItemsCount > 0 && (
                <View style={styles.billCountBadge}>
                  <Text style={styles.billCountBadgeText}>{totalItemsCount}</Text>
                </View>
              )}
            </View>

            {totalItemsCount > 0 && (
              <TouchableOpacity activeOpacity={0.7} style={styles.clearAllBtn} onPress={handlePromptClearCart}>
                <Ionicons name="trash-outline" size={14} color="#8C331A" style={{ marginRight: 4 }} />
                <Text style={styles.clearAllBtnText}>Clear All</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* BILL ITEMS */}
          {lineItems.length === 0 ? (
            <Text style={styles.noItemsText}>
              {isOrderMode ? 'No items added to order yet' : 'No items added to bill yet'}
            </Text>
          ) : (
            <View style={styles.billItemsList}>
              {lineItems.map(item => (
                <View key={item.id} style={styles.billItemRow}>
                  {/* Left Side: Product Name, Editable Unit Price and Line Total */}
                  <View style={styles.billItemLeftCol}>
                    <Text style={styles.billItemName} numberOfLines={1}>{item.name}</Text>
                    <View style={styles.billItemPricingRow}>
                      <View style={styles.unitPriceEditWrapper}>
                        <Text style={styles.unitPricePrefix}>₹</Text>
                        <TextInput
                          style={styles.unitPriceInput}
                          keyboardType="numeric"
                          value={item.rawPriceStr}
                          onChangeText={text => handleDirectPriceChange(item.id, text)}
                          onBlur={() => handlePriceBlur(item.id, item.price)}
                          selectTextOnFocus={true}
                        />
                        <Text style={styles.unitPriceSuffix}>/ unit</Text>
                      </View>
                      <Text style={styles.billItemDotSeparator}>•</Text>
                      <Text style={styles.billItemLineTotalText}>
                        Total: <Text style={styles.billItemLineTotalBold}>₹{item.price * item.qty}</Text>
                      </Text>
                    </View>
                  </View>

                  {/* Right Side: Quantity Input and Remove Button beside each other */}
                  <View style={styles.billItemRightCol}>
                    {/* Small direct editable numeric quantity input */}
                    <View style={styles.billItemQtyBox}>
                      <TextInput
                        style={styles.billItemQtyInput}
                        keyboardType="numeric"
                        value={item.rawQtyStr}
                        onChangeText={text => handleDirectQtyChange(item.id, text)}
                        onBlur={() => handleQtyBlur(item.id)}
                        selectTextOnFocus={true}
                      />
                    </View>

                    {/* Remove button beside the quantity input with 12-16dp spacing */}
                    <TouchableOpacity
                      style={styles.removeItemActionBtn}
                      onPress={() => handlePromptRemoveItem(item.id, item.name)}
                      activeOpacity={0.7}
                      hitSlop={{ top: 10, bottom: 10, left: 8, right: 8 }}
                      accessibilityLabel={`Remove ${item.name}`}
                    >
                      <Ionicons name="trash-outline" size={16} color="#DC2626" />
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>
          )}

          <View style={styles.dottedDivider} />

          {/* FINANCIAL BREAKDOWN: Order Mode shows Total Commercial Value; Billing Mode shows Subtotal, Discount, Grand Total */}
          {isOrderMode ? (
            <View style={styles.calcSummarySection}>
              <View style={styles.calcSummaryRow}>
                <Text style={styles.calcSummaryLabel}>Total Items Count</Text>
                <Text style={styles.calcSummaryValue}>{totalItemsCount} units</Text>
              </View>

              <View style={[styles.calcSummaryRow, styles.grandTotalRowBorder]}>
                <View>
                  <Text style={styles.grandTotalLabel}>Total Commercial Value</Text>
                  <Text style={styles.grandTotalSubLabel}>
                    Official invoice debited separately upon manual review
                  </Text>
                </View>
                <Text style={styles.grandTotalValue}>₹{subtotal}</Text>
              </View>

              <View style={styles.orderNoticeBox}>
                <Ionicons name="information-circle-outline" size={15} color="#8C331A" style={{ marginRight: 6 }} />
                <Text style={styles.orderNoticeText}>
                  Order will be saved in PENDING status. No invoice is issued and no payment is collected until manually approved.
                </Text>
              </View>
            </View>
          ) : (
            <View style={styles.calcSummarySection}>
              <View style={styles.calcSummaryRow}>
                <Text style={styles.calcSummaryLabel}>Product Subtotal</Text>
                <Text style={styles.calcSummaryValue}>₹{subtotal}</Text>
              </View>

              <View style={styles.calcSummaryRow}>
                <View style={styles.discountLabelCol}>
                  <Text style={styles.discountFieldLabel}>Discount (₹)</Text>
                  <Text style={styles.discountFieldSubLabel}>Deducted from bill</Text>
                </View>
                <View style={styles.discountInputWrapper}>
                  <Text style={styles.discountCurrencyPrefix}>₹</Text>
                  <TextInput
                    style={styles.discountInput}
                    keyboardType="numeric"
                    placeholder="0"
                    placeholderTextColor="#9CA3AF"
                    value={discount}
                    onChangeText={handleDiscountChange}
                    selectTextOnFocus={true}
                  />
                </View>
              </View>

              <View style={[styles.calcSummaryRow, styles.grandTotalRowBorder]}>
                <View>
                  <Text style={styles.grandTotalLabel}>Final Bill Amount</Text>
                  {discountAmount > 0 ? (
                    <Text style={styles.discountSavedTag}>₹{discountAmount} discount applied</Text>
                  ) : null}
                </View>
                <Text style={styles.grandTotalValue}>₹{grandTotal}</Text>
              </View>
            </View>
          )}

          {/* DELIVERY DETAILS: VISIBLE IN ORDER MODE */}
          {isOrderMode && (
            <View style={styles.orderDeliverySection}>
              <View style={styles.dottedDivider} />

              <View style={styles.deliverySectionHeader}>
                <Ionicons name="location" size={16} color="#8C331A" style={{ marginRight: 6 }} />
                <Text style={styles.deliverySectionTitle}>Delivery Address & Notes</Text>
              </View>

              {/* Delivery Address */}
              <Text style={styles.orderFieldLabel}>DELIVERY ADDRESS *</Text>
              <View style={styles.orderAddressBox}>
                <Ionicons
                  name="location-outline"
                  size={18}
                  color="#8C331A"
                  style={{ marginRight: 8, marginTop: 4 }}
                />
                <TextInput
                  style={styles.orderAddressInput}
                  multiline
                  placeholder="Enter destination shop or office address..."
                  placeholderTextColor="#9CA3AF"
                  value={deliveryAddress}
                  onChangeText={setDeliveryAddress}
                />
              </View>

              {/* Order Notes */}
              <Text style={styles.orderFieldLabel}>ORDER NOTES (OPTIONAL)</Text>
              <TextInput
                style={styles.orderNotesInput}
                placeholder="Special instructions, delivery time window, etc."
                placeholderTextColor="#9CA3AF"
                value={orderNotes}
                onChangeText={setOrderNotes}
              />
            </View>
          )}

          {/* DRAFT BILLING OPTIONS: DUE DATE & NOTES - ONLY FOR QUICK BILLING DRAFT MODE */}
          {!isOrderMode && (
            <View style={styles.draftOptionsSection}>
              <View style={styles.dottedDivider} />

              <View style={styles.deliverySectionHeader}>
                <Ionicons name="receipt" size={16} color="#8C331A" style={{ marginRight: 6 }} />
                <Text style={styles.deliverySectionTitle}>Draft Bill Settings</Text>
              </View>

              {/* Payment Due Date */}
              <Text style={styles.orderFieldLabel}>PAYMENT DUE DATE (OPTIONAL - YYYY-MM-DD)</Text>
              <View style={styles.draftInputBox}>
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => setShowDatePicker(true)}
                  style={styles.calendarIconBtn}
                >
                  <Ionicons
                    name="calendar-outline"
                    size={20}
                    color="#8C331A"
                  />
                </TouchableOpacity>
                <TextInput
                  style={styles.draftInputField}
                  placeholder="YYYY-MM-DD (e.g. 2026-12-01)"
                  placeholderTextColor="#9CA3AF"
                  value={dueDate}
                  onChangeText={setDueDate}
                />
                {dueDate.length > 0 && (
                  <TouchableOpacity
                    activeOpacity={0.7}
                    onPress={() => setDueDate('')}
                    style={{ padding: 4 }}
                  >
                    <Ionicons name="close-circle" size={18} color="#9CA3AF" />
                  </TouchableOpacity>
                )}
              </View>

              {/* Draft Notes */}
              <Text style={styles.orderFieldLabel}>DRAFT NOTES (OPTIONAL)</Text>
              <TextInput
                style={styles.orderNotesInput}
                placeholder="Remarks, terms, or customer special requests..."
                placeholderTextColor="#9CA3AF"
                value={draftNotes}
                onChangeText={setDraftNotes}
              />
            </View>
          )}
        </View>
      </KeyboardAwareScrollView>
      )}

      {/* BOTTOM ACTION BUTTON: SAVE DRAFT OR CREATE ORDER */}
      <View style={[styles.fixedBottomDock, { paddingBottom: Math.max(insets.bottom, 12) }]}>
        <TouchableOpacity
          activeOpacity={0.85}
          style={[styles.saveBillBtn, (lineItems.length === 0 || isSaving) && styles.saveBillBtnDisabled]}
          onPress={handleSaveBill}
          disabled={lineItems.length === 0 || isSaving}
        >
          {isSaving ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <>
              <Ionicons
                name={isOrderMode ? "bag-check-outline" : editingDraft ? "save-outline" : "receipt-outline"}
                size={20}
                color="#FFFFFF"
                style={{ marginRight: 8 }}
              />
              <Text style={styles.saveBillBtnText}>
                {isOrderMode
                  ? `Create Order (₹${subtotal})`
                  : editingDraft
                    ? `Update Draft (₹${grandTotal})`
                    : `Save Draft (₹${grandTotal})`}
              </Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* MODAL: CUSTOMER SELECTOR */}
      <Modal
        visible={showCustomerModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowCustomerModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.customerModalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Customer</Text>
              <TouchableOpacity onPress={() => setShowCustomerModal(false)}>
                <Ionicons name="close" size={22} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <View style={styles.modalSearchRow}>
              <TextInput
                style={styles.modalSearchInput}
                placeholder="Search name or phone..."
                placeholderTextColor="#9CA3AF"
                value={customerSearch}
                onChangeText={text => {
                  setCustomerSearch(text);
                  fetchCustomers(text);
                }}
              />
              <TouchableOpacity
                style={styles.newCustBtn}
                onPress={() => setShowAddCustomerModal(true)}
              >
                <Ionicons name="person-add" size={16} color="#FFFFFF" />
              </TouchableOpacity>
            </View>

            {loadingCustomers ? (
              <ActivityIndicator size="large" color="#8C331A" style={{ marginVertical: 30 }} />
            ) : (
              <FlatList
                data={customersList}
                keyExtractor={item => String(item.id)}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.customerSelectItem}
                    onPress={() => {
                      setSelectedCustomer(item);
                      if (item.address && !deliveryAddress) {
                        setDeliveryAddress(item.address);
                      }
                      setShowCustomerModal(false);
                    }}
                  >
                    <View style={styles.itemAvatar}>
                      <Text style={styles.itemAvatarText}>{item.name[0]?.toUpperCase()}</Text>
                    </View>
                    <View style={{ flex: 1, marginLeft: 10 }}>
                      <Text style={styles.itemCustName}>{item.name}</Text>
                      <Text style={styles.itemCustPhone}>{item.phone}</Text>
                    </View>
                    <Text style={styles.itemCustBills}>{item.total_bills} bills</Text>
                  </TouchableOpacity>
                )}
                ListEmptyComponent={
                  <Text style={styles.emptyListText}>No customers found. Click + to add one.</Text>
                }
              />
            )}
          </View>
        </View>
      </Modal>

      {/* UNIFIED MODAL: CREATE CUSTOMER */}
      <AddCustomerModal
        visible={showAddCustomerModal}
        onClose={() => setShowAddCustomerModal(false)}
        onSubmit={handleCreateCustomer}
      />

      {/* PREMIUM CENTRALIZED CONFIRM DIALOG */}
      <ConfirmDialog
        visible={confirmDialogConfig.visible}
        title={confirmDialogConfig.title}
        description={confirmDialogConfig.description}
        type={confirmDialogConfig.type}
        icon={confirmDialogConfig.icon}
        confirmLabel={confirmDialogConfig.confirmLabel}
        cancelLabel={confirmDialogConfig.cancelLabel}
        onConfirm={confirmDialogConfig.onConfirm}
        onCancel={closeConfirmDialog}
        loading={isSaving}
      />

      {/* CUSTOM BRANDED POPUP DIALOG */}
      <CustomDialog
        visible={dialogConfig.visible}
        title={dialogConfig.title}
        message={dialogConfig.message}
        type={dialogConfig.type}
        buttons={dialogConfig.buttons}
        onClose={closeDialog}
      />

      {/* PAYMENT DUE DATE CALENDAR PICKER */}
      <CalendarPickerModal
        visible={showDatePicker}
        title="Select Payment Due Date"
        initialDate={dueDate.trim() || undefined}
        onClose={() => setShowDatePicker(false)}
        onSelectDate={(dateString: string) => {
          setDueDate(dateString);
          setShowDatePicker(false);
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAF5F0',
  },
  topHeaderBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#FAF5F0',
  },
  backBtn: {
    paddingVertical: 4,
    paddingHorizontal: 2,
    marginRight: 8,
  },
  headerTitleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  teaLogoIconContainer: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#F7EBE4',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  headerTitleText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#111827',
  },
  historyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F7EBE4',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  historyBtnText: {
    color: '#8C331A',
    fontWeight: '700',
    fontSize: 13,
  },

  toastContainer: {
    position: 'absolute',
    top: 50,
    left: 16,
    right: 16,
    backgroundColor: '#059669',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 999,
    elevation: 8,
  },
  toastContainerError: {
    backgroundColor: '#DC2626',
  },
  toastText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
    marginLeft: 8,
  },

  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 130,
  },

  customerCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 12,
    marginTop: 6,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  customerInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  customerAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F7EBE4',
    justifyContent: 'center',
    alignItems: 'center',
  },
  customerName: {
    fontWeight: '800',
    fontSize: 14,
    color: '#111827',
  },
  customerSub: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  customerSelectBtn: {
    backgroundColor: '#8C331A',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  customerSelectText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  customerActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  customerChangeMiniBtn: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 6,
  },
  customerChangeMiniText: {
    color: '#374151',
    fontSize: 11,
    fontWeight: '700',
  },
  customerRemoveBtn: {
    padding: 4,
  },

  productsHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  productsSectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#111827',
  },
  viewModeToggleGroup: {
    flexDirection: 'row',
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    padding: 2,
  },
  viewModeBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  viewModeBtnActive: {
    backgroundColor: '#FFFFFF',
    elevation: 1,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 1,
  },

  searchBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    paddingHorizontal: 10,
    height: 38,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 12,
  },
  searchIcon: {
    marginRight: 6,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: '#111827',
    paddingVertical: 0,
  },

  productThreeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 14,
  },
  threeGridCard: {
    width: '31.6%',
    marginRight: '2.6%',
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 6,
    marginBottom: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  threeGridCardThird: {
    marginRight: 0,
  },
  threeGridCardSelected: {
    borderColor: '#8C331A',
    backgroundColor: '#FEF9F6',
  },
  qtyBadge: {
    position: 'absolute',
    top: -6,
    right: -6,
    backgroundColor: '#8C331A',
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  qtyBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
  },
  teaCardImage: {
    width: '100%',
    height: 52,
    borderRadius: 6,
    marginBottom: 4,
  },
  productTagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    marginBottom: 2,
  },
  productIdTag: {
    fontSize: 10,
    fontWeight: '700',
    color: '#6B7280',
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 4,
  },
  productUnitTag: {
    fontSize: 9,
    color: '#9CA3AF',
  },
  threeGridCardTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#111827',
    textAlign: 'center',
  },
  threeGridCardPrice: {
    fontSize: 11,
    fontWeight: '800',
    color: '#8C331A',
    marginTop: 2,
  },

  productListView: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 14,
    overflow: 'hidden',
  },
  productListRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderBottomWidth: 0.5,
    borderBottomColor: '#F3F4F6',
  },
  productListRowSelected: {
    backgroundColor: '#FEF9F6',
  },
  teaRowImage: {
    width: 44,
    height: 44,
    borderRadius: 6,
    marginRight: 10,
  },
  productListInfoCol: {
    flex: 1,
  },
  productRowTitleLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  productListTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#111827',
    flexShrink: 1,
  },
  productListPrice: {
    fontSize: 12,
    fontWeight: '800',
    color: '#8C331A',
    marginTop: 2,
  },
  productListStepper: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rowAddBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F7EBE4',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  rowAddBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#8C331A',
  },

  mergedBillSummaryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 10,
  },
  billHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  billTitleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  billCardTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#111827',
  },
  billCountBadge: {
    backgroundColor: '#8C331A',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 10,
    marginLeft: 6,
  },
  billCountBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
  },
  clearAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  clearAllBtnText: {
    color: '#8C331A',
    fontSize: 12,
    fontWeight: '700',
  },

  noItemsText: {
    color: '#9CA3AF',
    fontStyle: 'italic',
    fontSize: 13,
    paddingVertical: 10,
    textAlign: 'center',
  },
  billItemsList: {
    marginTop: 4,
  },
  billItemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 0.5,
    borderBottomColor: '#F3F4F6',
  },
  billItemLeftCol: {
    flex: 1,
    marginRight: 12,
  },
  billItemName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
  },
  billItemPricingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  billItemSubPrice: {
    fontSize: 12,
    color: '#6B7280',
  },
  billItemDotSeparator: {
    fontSize: 12,
    color: '#9CA3AF',
    marginHorizontal: 5,
  },
  billItemLineTotalText: {
    fontSize: 12,
    color: '#6B7280',
  },
  billItemLineTotalBold: {
    fontSize: 13,
    fontWeight: '800',
    color: '#111827',
  },
  billItemRightCol: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  billItemQtyBox: {
    backgroundColor: '#FAF7F4',
    borderWidth: 1,
    borderColor: '#D7CCC8',
    borderRadius: 7,
    minWidth: 75,
    height: 34,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  billItemQtyInput: {
    fontSize: 14,
    fontWeight: '800',
    color: '#111827',
    textAlign: 'center',
    width: '100%',
    paddingVertical: 0,
    paddingHorizontal: 2,
  },
  miniMinusBtn: {
    width: 28,
    height: 28,
    borderRadius: 6,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  miniPlusBtn: {
    width: 28,
    height: 28,
    borderRadius: 6,
    backgroundColor: '#8C331A',
    justifyContent: 'center',
    alignItems: 'center',
  },
  miniQtyText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#111827',
    marginHorizontal: 8,
  },
  removeItemActionBtn: {
    width: 34,
    height: 34,
    borderRadius: 7,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FEE2E2',
    justifyContent: 'center',
    alignItems: 'center',
  },

  dottedDivider: {
    height: 1,
    borderWidth: 0.5,
    borderColor: '#E5E7EB',
    borderStyle: 'dashed',
    marginVertical: 12,
  },

  calcSummarySection: {
    marginBottom: 8,
  },
  calcSummaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  calcSummaryLabel: {
    fontSize: 14,
    color: '#4B5563',
    fontWeight: '600',
  },
  calcSummaryValue: {
    fontSize: 15,
    color: '#111827',
    fontWeight: '700',
  },
  discountLabelCol: {
    flex: 1,
  },
  discountFieldLabel: {
    fontSize: 14,
    color: '#059669',
    fontWeight: '700',
  },
  discountFieldSubLabel: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 1,
  },
  discountInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 2,
    minWidth: 100,
    justifyContent: 'flex-end',
  },
  discountCurrencyPrefix: {
    fontSize: 14,
    fontWeight: '700',
    color: '#059669',
    marginRight: 4,
  },
  discountInput: {
    fontSize: 15,
    fontWeight: '800',
    color: '#059669',
    minWidth: 50,
    textAlign: 'right',
    paddingVertical: 4,
    paddingHorizontal: 2,
  },
  grandTotalRowBorder: {
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    paddingTop: 10,
    marginTop: 4,
  },
  discountSavedTag: {
    fontSize: 11,
    color: '#059669',
    fontWeight: '700',
    marginTop: 1,
  },
  grandTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  grandTotalLabel: {
    fontSize: 16,
    fontWeight: '800',
    color: '#111827',
  },
  grandTotalSubLabel: {
    fontSize: 11,
    color: '#8E8278',
    marginTop: 2,
  },
  grandTotalValue: {
    fontSize: 18,
    fontWeight: '900',
    color: '#8C331A',
  },
  orderNoticeBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FAF0EB',
    borderRadius: 8,
    padding: 10,
    marginTop: 12,
  },
  orderNoticeText: {
    flex: 1,
    fontSize: 11,
    color: '#8C331A',
    lineHeight: 16,
    fontWeight: '500',
  },

  partnerSelectionCard: {
    marginBottom: 12,
  },

  /* ORDER MODE DELIVERY STYLES */
  orderDeliverySection: {
    marginTop: 4,
  },
  deliverySectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  deliverySectionTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#111827',
  },
  orderFieldLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#6B7280',
    marginBottom: 6,
    marginTop: 8,
    letterSpacing: 0.5,
  },
  orderAddressBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FAF8F5',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    minHeight: 56,
  },
  orderAddressInput: {
    flex: 1,
    fontSize: 13,
    color: '#111827',
    padding: 0,
    textAlignVertical: 'top',
  },
  partnerScroll: {
    marginVertical: 4,
  },
  partnerPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 7,
    marginRight: 8,
  },
  partnerPillSelected: {
    backgroundColor: '#8C331A',
    borderColor: '#8C331A',
  },
  partnerPillText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4B5563',
  },
  partnerPillTextSelected: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  orderNotesInput: {
    backgroundColor: '#FAF8F5',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 13,
    color: '#111827',
  },

  paymentMethodSection: {
    marginTop: 4,
  },
  paymentSectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#4B5563',
    marginBottom: 6,
  },
  paymentSectionSubLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#4B5563',
    marginBottom: 6,
  },
  paymentStatusRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 12,
  },
  paymentStatusTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingVertical: 7,
    borderRadius: 8,
  },
  paymentStatusTabActive: {
    backgroundColor: '#8C331A',
    borderColor: '#8C331A',
  },
  paymentStatusText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#374151',
  },
  paymentStatusTextActive: {
    color: '#FFFFFF',
  },

  methodContainer: {
    marginBottom: 4,
  },
  paymentMethodRow: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  paymentMethodTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F3F4F6',
    paddingVertical: 8,
    borderRadius: 8,
    marginRight: 8,
  },
  paymentMethodTabActive: {
    backgroundColor: '#8C331A',
  },
  paymentMethodText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#4B5563',
  },
  paymentMethodTextActive: {
    color: '#FFFFFF',
  },

  receivedAmountRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  receivedAmountLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#4B5563',
    marginBottom: 4,
  },
  receivedAmountInput: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontSize: 14,
    fontWeight: '800',
    color: '#111827',
  },
  receivedAmountInputEditable: {
    borderColor: '#8C331A',
    backgroundColor: '#FFFFFF',
  },
  receivedAmountInputDisabled: {
    backgroundColor: '#F3F4F6',
    color: '#9CA3AF',
  },
  dueSummaryBox: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FEE2E2',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    alignItems: 'center',
  },
  dueSummaryLabel: {
    fontSize: 11,
    color: '#DC2626',
    fontWeight: '700',
  },
  dueSummaryValue: {
    fontSize: 15,
    color: '#DC2626',
    fontWeight: '900',
    marginTop: 1,
  },

  fixedBottomDock: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderColor: '#E5E7EB',
  },
  saveBillBtn: {
    backgroundColor: '#8C331A',
    borderRadius: 12,
    paddingVertical: 14,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  saveBillBtnDisabled: {
    backgroundColor: '#9CA3AF',
  },
  saveBillBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '900',
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  customerModalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#111827',
  },
  modalSearchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  modalSearchInput: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 13,
    color: '#111827',
    marginRight: 8,
  },
  newCustBtn: {
    backgroundColor: '#8C331A',
    padding: 9,
    borderRadius: 8,
  },
  customerSelectItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 0.5,
    borderBottomColor: '#F3F4F6',
  },
  itemAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F7EBE4',
    justifyContent: 'center',
    alignItems: 'center',
  },
  itemAvatarText: {
    color: '#8C331A',
    fontWeight: '800',
    fontSize: 13,
  },
  itemCustName: {
    fontWeight: '700',
    fontSize: 13,
    color: '#111827',
  },
  itemCustPhone: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 1,
  },
  itemCustBills: {
    fontSize: 11,
    color: '#8C331A',
    fontWeight: '700',
  },
  emptyListText: {
    textAlign: 'center',
    color: '#9CA3AF',
    fontStyle: 'italic',
    paddingVertical: 20,
    fontSize: 13,
  },

  modalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 18,
  },
  modalLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#374151',
    marginTop: 8,
    marginBottom: 4,
  },
  modalInput: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 13,
    color: '#111827',
  },
  modalBtnRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 16,
  },
  modalCancelBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginRight: 8,
  },
  modalCancelText: {
    color: '#6B7280',
    fontWeight: '700',
  },
  modalSubmitBtn: {
    backgroundColor: '#8C331A',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  modalSubmitText: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  /* Unit Price Edit Styles */
  unitPriceEditWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FAF8F5',
    borderWidth: 1,
    borderColor: '#EFEAE4',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  unitPricePrefix: {
    fontSize: 12,
    fontWeight: '700',
    color: '#8C331A',
    marginRight: 2,
  },
  unitPriceInput: {
    fontSize: 12,
    fontWeight: '800',
    color: '#111827',
    paddingVertical: 0,
    paddingHorizontal: 2,
    minWidth: 35,
    textAlign: 'center',
  },
  unitPriceSuffix: {
    fontSize: 11,
    color: '#8E8278',
    marginLeft: 2,
  },
  /* Draft Options Styles */
  draftOptionsSection: {
    marginTop: 4,
  },
  draftInputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FAF8F5',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginBottom: 8,
  },
  draftInputField: {
    flex: 1,
    fontSize: 13,
    color: '#111827',
    paddingVertical: 4,
  },
  calendarIconBtn: {
    paddingRight: 8,
    paddingVertical: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  centerLoadingBox: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  loadingDraftText: {
    marginTop: 12,
    fontSize: 13,
    color: '#8E8278',
    fontWeight: '600',
  },
});
