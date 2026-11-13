import React, {
  createContext,
  useContext,
  useState,
  useMemo,
  useEffect,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  customerService,
  productService,
  deliveryService,
  orderService,
  scheduleService,
  profileService,
  authService,
  notificationService,
  apiClient,
  billingService,
} from '../services';

export interface Customer {
  id: string;
  name: string;
  address: string;
  amount: number;
  deliveryStatus: string;
  hasDot?: boolean;
  badge?: string;
  isOverdue?: boolean;
  avatarUrl?: string;
  initials?: string;
}

export interface InvoiceLineItem {
  id: string;
  name: string;
  qty: number;
  price: number;
}

export interface InvoiceItem {
  id: string;
  invoiceNo?: string;
  name: string;
  customerAddress?: string;
  customerPhone?: string;
  amount: string;
  numericAmount?: number;
  due: string;
  date?: string;
  isOverdue?: boolean;
  status?: 'PENDING' | 'OVERDUE' | 'PAID';
  items?: InvoiceLineItem[];
  subtotal?: number;
  tax?: number;
  notes?: string;
  deliveryPartnerName?: string;
  deliveryStatus?: 'Pending' | 'Out for delivery' | 'Delivered';
  currentLocation?: string;
}

export interface ActivityItem {
  id: string;
  color: string;
  title: string;
  subtitle: string;
  time: string;
}

export interface ProductItem {
  id: string;
  name: string;
  price: string;
  unit: string;
  description: string;
  stock: string;
  stockNumber: number;
  maxStock?: number;
  imageUrl?: string;
  badge?: string;
  isLowStock?: boolean;
  isCompact?: boolean;
  category?: string;
}

export interface DeliveryBoyItem {
  id: string;
  name: string;
  phone?: string;
  emergencyContact?: string;
  licenseNumber?: string;
  vehicleType?: 'Scooter' | 'E-Bike' | 'Auto Cargo' | 'Mini Van';
  vehicleModel?: string;
  numberPlate?: string;
  numberPlatePhotoUri?: string;
  licensePhotoUri?: string;
  status: 'BUSY' | 'READY' | 'OFFLINE';
  location: string;
  distance?: string;
  avatarUrl?: string;
  progress?: number;
}

export interface ScheduleItem {
  id: string;
  timeSlot: string;
  title: string;
  customerName: string;
  address: string;
  deliveryBoy: string;
  status: 'UPCOMING' | 'IN_PROGRESS' | 'COMPLETED';
  itemsCount: number;
}

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  time: string;
  type: 'payment' | 'order' | 'overdue' | 'system';
  isRead: boolean;
}

export interface PaymentRecord {
  id: string;
  customerName: string;
  amount: number;
  method: 'UPI / GPay' | 'Cash' | 'Bank Transfer' | 'PhonePe';
  date: string;
  time: string;
  status: 'SUCCESS' | 'SETTLED';
  refNo: string;
}

export interface UserProfile {
  fullName: string;
  role: string;
  phone: string;
  email: string;
  businessName: string;
  address: string;
  avatarUrl: string;
  vehicle?: string;
  plateNumber?: string;
}

export type UserRole = 'ADMIN' | 'DELIVERY_PARTNER';

export interface AppContextType {
  /* Customers */
  customers: Customer[];
  filteredCustomers: Customer[];
  totalOutstanding: number;
  outstandingCustomerCount: number;

  searchQuery: string;
  setSearchQuery: (query: string) => void;
  activeFilter: string;
  setActiveFilter: (filter: string) => void;
  sortBy: string;
  setSortBy: (sort: string) => void;

  addCustomer: (customer: Omit<Customer, 'id'>) => Promise<void> | void;
  collectPayment: (
    customerId: string,
    amountToDeduct: number,
  ) => Promise<void> | void;

  /* Invoices */
  invoices: InvoiceItem[];
  activities: ActivityItem[];
  totalRevenue: number;
  revenueGrowth: string;
  collectionsTotal: number;

  addInvoice: (
    name: string,
    amount: number,
    dueDays: string,
    fullItem?: Partial<InvoiceItem>,
  ) => Promise<void> | void;
  addQuickBill: (billData: {
    customerName: string;
    customerPhone?: string;
    customerAddress?: string;
    items: InvoiceLineItem[];
    subtotal: number;
    discount: number;
    grandTotal: number;
    paymentMethod: 'Cash' | 'UPI' | 'Credit';
    paidAmount: number;
    isWalkIn: boolean;
  }) => Promise<InvoiceItem>;
  markInvoiceAsPaid: (id: string) => Promise<void> | void;
  collectInvoicePayment: (
    invoiceId: string,
    paidAmount: number,
    paymentMethod: 'Cash' | 'UPI' | 'Card' | 'Bank Transfer',
  ) => Promise<void> | void;
  deleteInvoice: (id: string) => Promise<void> | void;
  updateOrderDeliveryStatus: (
    orderId: string,
    status: 'Pending' | 'Out for delivery' | 'Delivered',
    location?: string,
  ) => Promise<void> | void;
  assignOrderPartner: (
    orderId: string,
    partnerName: string,
  ) => Promise<void> | void;

  /* Payment History */
  paymentHistory: PaymentRecord[];

  /* Products & Inventory */
  products: ProductItem[];
  addProduct: (product: Omit<ProductItem, 'id'>) => Promise<void> | void;
  updateProduct: (
    productId: string,
    updates: Partial<ProductItem>,
  ) => Promise<void> | void;
  updateProductStock: (
    productId: string,
    newStockNumber: number,
  ) => Promise<void> | void;
  updateProductPrice: (
    productId: string,
    newPrice: string,
  ) => Promise<void> | void;
  updateProductImage: (
    productId: string,
    imageUrl: string,
  ) => Promise<void> | void;
  deleteProduct: (productId: string) => Promise<void> | void;
  resetProductsToDefault: () => Promise<void> | void;
  totalSKUs: number;
  lowStockCount: number;

  /* Delivery Boys */
  deliveryBoys: DeliveryBoyItem[];
  addDeliveryBoy: (boy: Omit<DeliveryBoyItem, 'id'>) => Promise<void> | void;
  updateDeliveryBoy: (
    boyId: string,
    updated: Partial<DeliveryBoyItem>,
  ) => Promise<void> | void;
  deleteDeliveryBoy: (boyId: string) => Promise<void> | void;
  assignOrderToBoy: (boyId: string) => Promise<void> | void;
  updateBoyStatus: (
    boyId: string,
    status: 'BUSY' | 'READY' | 'OFFLINE',
  ) => Promise<void> | void;
  activeBoysCount: number;
  totalBoysCount: number;
  inTransitOrdersCount: number;

  /* Schedules */
  schedules: ScheduleItem[];
  addSchedule: (schedule: Omit<ScheduleItem, 'id'>) => Promise<void> | void;
  completeSchedule: (scheduleId: string) => Promise<void> | void;

  /* Notifications & Cup Logs */
  notifications: NotificationItem[];
  unreadNotificationsCount: number;
  addNotification: (
    notification: Omit<NotificationItem, 'id' | 'time' | 'isRead'>,
  ) => Promise<void> | void;
  addCupRecord: (
    customerName: string,
    cupCount: number,
    itemType: string,
  ) => void;
  markAllNotificationsAsRead: () => Promise<void> | void;
  deleteNotification: (id: string) => Promise<void> | void;
  deleteSelectedNotifications: (ids: string[]) => void;
  clearAllNotifications: () => Promise<void> | void;

  /* Auth & User Profile & Two Roles */
  isAuthenticated: boolean;
  userMobile: string;
  setUserMobile: (mobile: string) => void;
  userRole: UserRole;
  setUserRole: (role: UserRole) => void;
  login: (mobile?: string, role?: UserRole) => Promise<void> | void;
  loginWithVerifiedUser: (userResponse: any) => Promise<void>;
  logout: () => Promise<void> | void;

  userProfile: UserProfile;
  updateUserProfile: (updated: Partial<UserProfile>) => Promise<void> | void;

  isDrawerOpen: boolean;
  openDrawer: () => void;
  closeDrawer: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const initialCustomers: Customer[] = [];
const initialProducts: ProductItem[] = [];
const initialDeliveryBoys: DeliveryBoyItem[] = [];
const initialSchedules: ScheduleItem[] = [];
const initialInvoices: InvoiceItem[] = [];
const initialActivities: ActivityItem[] = [];
const initialPaymentHistory: PaymentRecord[] = [];
const initialNotifications: NotificationItem[] = [];
const STORAGE_KEY = '@chaiflow_app_state_v1';

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [isLoaded, setIsLoaded] = useState<boolean>(false);

  const [customers, setCustomers] = useState<Customer[]>(initialCustomers);
  const [products, setProducts] = useState<ProductItem[]>(initialProducts);
  const [deliveryBoys, setDeliveryBoys] =
    useState<DeliveryBoyItem[]>(initialDeliveryBoys);
  const [schedules, setSchedules] = useState<ScheduleItem[]>(initialSchedules);
  const [invoices, setInvoices] = useState<InvoiceItem[]>(initialInvoices);
  const [activities, setActivities] =
    useState<ActivityItem[]>(initialActivities);
  const [paymentHistory, setPaymentHistory] = useState<PaymentRecord[]>(
    initialPaymentHistory,
  );
  const [collectionsTotal, setCollectionsTotal] = useState<number>(21550);
  const [notifications, setNotifications] =
    useState<NotificationItem[]>(initialNotifications);

  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeFilter, setActiveFilter] = useState<string>('All');
  const [sortBy, setSortBy] = useState<string>('Name');

  /* User Profile & Side Drawer State */
  const [userProfile, setUserProfile] = useState<UserProfile>({
    fullName: 'Arjun Mehta',
    role: 'Network Owner',
    phone: '+91 1234567899',
    email: 'arjun@chaiflow.in',
    businessName: 'ChaiFlow Beverages',
    address: 'Shop 14, Kirti Nagar, New Delhi',
    avatarUrl:
      'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&auto=format&fit=crop&q=80',
    vehicle: 'Hero Electric Splendor',
    plateNumber: 'KA-01-EA-9920',
  });

  const updateUserProfile = async (updated: Partial<UserProfile>) => {
    const updatedProfile = await profileService.updateProfile(updated);
    setUserProfile(prev => ({ ...prev, ...updatedProfile }));
  };

  const [isDrawerOpen, setIsDrawerOpen] = useState<boolean>(false);
  const openDrawer = () => setIsDrawerOpen(true);
  const closeDrawer = () => setIsDrawerOpen(false);

  /* Auth State & Two Roles (ADMIN & DELIVERY_PARTNER) */
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [userMobile, setUserMobile] = useState<string>('+91 1234567899');
  const [userRole, setUserRole] = useState<UserRole>('ADMIN');

  const loginWithVerifiedUser = async (userResponse: any) => {
    const role = userResponse?.profile?.role || 'customer';
    const phone = userResponse?.profile?.phone || userMobile;
    const formattedPhone = phone.startsWith('+91') ? phone : `+91 ${phone}`;

    setUserMobile(formattedPhone);

    if (role === 'delivery') {
      setUserRole('DELIVERY_PARTNER');
      setUserProfile({
        fullName: `${userResponse.first_name || ''} ${userResponse.last_name || ''}`.trim() || userResponse.username || 'Delivery Partner',
        role: 'Delivery Partner',
        phone: formattedPhone,
        email: userResponse.email || `${userResponse.username}@chaiflow.in`,
        businessName: 'ChaiFlow Fleet',
        address: userResponse?.profile?.address || 'Hub Central',
        avatarUrl: `https://ui-avatars.com/api/?name=${encodeURIComponent(userResponse.username || 'Delivery')}&background=3B82F6&color=FFF`,
        vehicle: 'Hero Electric Splendor',
        plateNumber: 'KA-01-EA-9920',
      });
    } else {
      setUserRole('ADMIN');
      setUserProfile({
        fullName: `${userResponse.first_name || ''} ${userResponse.last_name || ''}`.trim() || 'Arjun Mehta',
        role: role === 'owner' ? 'Network Owner' : 'Customer Account',
        phone: formattedPhone,
        email: userResponse.email || 'arjun@chaiflow.in',
        businessName: 'ChaiFlow Beverages',
        address: userResponse?.profile?.address || 'Shop 14, Kirti Nagar, New Delhi',
        avatarUrl:
          'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&auto=format&fit=crop&q=80',
      });
    }

    setIsAuthenticated(true);
    await notificationService.registerDeviceToken();
  };

  const login = async (mobile?: string, roleOverride?: UserRole) => {
    const targetMobile = mobile || userMobile;
    try {
      await authService.login(targetMobile, 'ChaiPass@123');
    } catch {
      // Offline / fallback demo login support
    }
    const cleanDigits = (str: string) =>
      (str || '').replace(/\D/g, '').slice(-10);
    const inputDigits = cleanDigits(targetMobile);

    // Find if entered phone matches any registered Delivery Partner
    const matchedBoy = deliveryBoys.find(
      b =>
        b.phone &&
        cleanDigits(b.phone) === inputDigits &&
        inputDigits.length >= 8,
    );

    if (matchedBoy) {
      const formattedPhone = matchedBoy.phone || targetMobile;
      setUserMobile(formattedPhone);
      setUserRole('DELIVERY_PARTNER');
      setUserProfile({
        fullName: matchedBoy.name,
        role: 'Delivery Partner',
        phone: formattedPhone,
        email: `${matchedBoy.name
          .toLowerCase()
          .replace(/\s+/g, '')}@chaiflow.in`,
        businessName: 'ChaiFlow Delivery Partner',
        address: matchedBoy.location || 'Hub Central',
        avatarUrl:
          matchedBoy.avatarUrl ||
          `https://ui-avatars.com/api/?name=${encodeURIComponent(
            matchedBoy.name,
          )}&background=3B82F6&color=FFF`,
        vehicle:
          matchedBoy.vehicleModel ||
          matchedBoy.vehicleType ||
          'Hero Electric Splendor',
        plateNumber: matchedBoy.numberPlate || 'KA-01-EA-9920',
      });
    } else {
      const resolvedRole = roleOverride || 'ADMIN';
      const formattedPhone =
        targetMobile === '+91 0000000000' ||
          !targetMobile ||
          inputDigits === '1234567899'
          ? '+91 1234567899'
          : targetMobile.startsWith('+91')
            ? targetMobile
            : `+91 ${targetMobile.trim()}`;

      setUserMobile(formattedPhone);
      setUserRole(resolvedRole);
      setUserProfile({
        fullName: 'Arjun Mehta',
        role: 'Network Owner',
        phone: formattedPhone,
        email: 'arjun@chaiflow.in',
        businessName: 'ChaiFlow Beverages',
        address: 'Shop 14, Kirti Nagar, New Delhi',
        avatarUrl:
          'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&auto=format&fit=crop&q=80',
      });
    }

    setIsAuthenticated(true);
    // Register FCM device token for authenticated user session
    await notificationService.registerDeviceToken();
  };

  const logout = async () => {
    // Deactivate device token before clearing auth session
    await notificationService.deactivateDeviceToken();
    await authService.logout();
    setIsDrawerOpen(false);
    setIsAuthenticated(false);
  };

  /* -------------------------------------------------------------
   *  AsyncStorage Local Device Persistence Engine
   * ------------------------------------------------------------- */
  // 1. Load persisted data and verify active JWT session on app boot
  useEffect(() => {
    const loadPersistedData = async () => {
      try {
        const stored = await AsyncStorage.getItem(STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (parsed.customers) setCustomers(parsed.customers);
          if (parsed.products) {
            const defaultProductIds = ['1', '2', '3', '4'];
            const filteredProducts = (parsed.products as ProductItem[]).filter(
              p => defaultProductIds.includes(p.id),
            );
            const restoredProducts = initialProducts.map(initP => {
              const existingP = filteredProducts.find(p => p.id === initP.id);
              return existingP ? { ...initP, ...existingP } : initP;
            });
            setProducts(restoredProducts);
          }
          if (parsed.deliveryBoys) setDeliveryBoys(parsed.deliveryBoys);
          if (parsed.schedules) setSchedules(parsed.schedules);
          if (parsed.invoices) setInvoices(parsed.invoices);
          if (parsed.activities) setActivities(parsed.activities);
          if (parsed.paymentHistory) setPaymentHistory(parsed.paymentHistory);
          if (parsed.collectionsTotal !== undefined)
            setCollectionsTotal(parsed.collectionsTotal);
          if (parsed.userProfile) setUserProfile(parsed.userProfile);
          if (parsed.notifications) setNotifications(parsed.notifications);
          if (parsed.userMobile) setUserMobile(parsed.userMobile);
          if (parsed.userRole) setUserRole(parsed.userRole);
        }

        // Live JWT session check with backend & initial dynamic data fetch
        const token = await apiClient.getAccessToken();
        if (token) {
          try {
            const currentUser = await authService.getCurrentUser();
            if (currentUser) {
              const role = currentUser?.profile?.role || 'customer';
              const phone = currentUser?.profile?.phone || userMobile;
              const formattedPhone = phone?.startsWith('+91') ? phone : `+91 ${phone}`;

              if (role === 'delivery') {
                setUserRole('DELIVERY_PARTNER');
              } else {
                setUserRole('ADMIN');
              }
              setUserMobile(formattedPhone);
              setIsAuthenticated(true);

              // Dynamically fetch live data from Django Backend
              try {
                const [liveCustomers, liveProducts, livePartners, liveSchedules] = await Promise.all([
                  customerService.getCustomers(),
                  productService.getProductsList(),
                  deliveryService.getDeliveryBoys(),
                  scheduleService.getSchedules(),
                ]);

                if (liveCustomers && liveCustomers.length > 0) setCustomers(liveCustomers);
                if (liveProducts && liveProducts.length > 0) setProducts(liveProducts);
                if (livePartners && livePartners.length > 0) setDeliveryBoys(livePartners);
                if (liveSchedules && liveSchedules.length > 0) setSchedules(liveSchedules);

                // Fetch live invoices & dashboard stats
                const liveInvoices = await billingService.getInvoices();
                if (Array.isArray(liveInvoices) && liveInvoices.length > 0) {
                  const mappedInvoices: InvoiceItem[] = liveInvoices.map(inv => {
                    const grandNum = parseFloat(inv.grand_total) || 0;
                    const pendingNum = parseFloat(inv.pending_amount) || 0;
                    const isPaid = inv.status === 'paid' || pendingNum <= 0;
                    return {
                      id: String(inv.id),
                      invoiceNo: inv.invoice_number,
                      name: inv.customer_name || 'Walk-in Customer',
                      customerAddress: 'Counter Sale',
                      customerPhone: inv.customer_phone || '',
                      amount: `₹${grandNum.toLocaleString()}`,
                      numericAmount: grandNum,
                      due: isPaid ? 'Paid in Full' : `₹${pendingNum.toLocaleString()} due`,
                      date: inv.created_at ? new Date(inv.created_at).toLocaleDateString() : 'Today',
                      isOverdue: !isPaid,
                      status: isPaid ? 'PAID' : 'PENDING',
                      deliveryPartnerName: 'Rahul Sharma',
                      deliveryStatus: isPaid ? 'Delivered' : 'Pending',
                      items: (inv.items || []).map(it => ({
                        id: String(it.id),
                        name: it.product_name,
                        qty: it.quantity,
                        price: parseFloat(it.unit_price) || 0,
                      })),
                      subtotal: parseFloat(inv.subtotal) || grandNum,
                      tax: 0,
                    };
                  });
                  setInvoices(mappedInvoices);
                }

                const liveStats = await billingService.getDashboardStats();
                if (liveStats && liveStats.total_received) {
                  const recNum = parseFloat(liveStats.total_received) || 0;
                  setCollectionsTotal(recNum);
                }
              } catch (fetchErr) {
                console.log('Error refreshing live backend data:', fetchErr);
              }
            }
          } catch (sessionErr) {
            console.log('Session verification expired or unreachable:', sessionErr);
            // If token invalid, clear tokens
            const refreshToken = await apiClient.getRefreshToken();
            if (!refreshToken) {
              await apiClient.clearTokens();
              setIsAuthenticated(false);
            }
          }
        } else {
          setIsAuthenticated(false);
        }
      } catch (err) {
        console.log('Error loading data from AsyncStorage:', err);
      } finally {
        setIsLoaded(true);
      }
    };
    loadPersistedData();
  }, []);

  // 2. Persist data to AsyncStorage on state updates
  useEffect(() => {
    if (!isLoaded) return;

    const savePersistedData = async () => {
      try {
        const appData = {
          customers,
          products,
          deliveryBoys,
          schedules,
          invoices,
          activities,
          paymentHistory,
          collectionsTotal,
          userProfile,
          notifications,
          isAuthenticated,
          userMobile,
          userRole,
        };
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(appData));
      } catch (err) {
        console.log('Error saving data to AsyncStorage:', err);
      }
    };

    savePersistedData();
  }, [
    isLoaded,
    customers,
    products,
    deliveryBoys,
    schedules,
    invoices,
    activities,
    paymentHistory,
    collectionsTotal,
    userProfile,
    notifications,
    isAuthenticated,
    userMobile,
    userRole,
  ]);

  const totalRevenue = useMemo(() => {
    return invoices.reduce((sum, item) => sum + (item.numericAmount || 0), 0);
  }, [invoices]);
  const revenueGrowth = '+12%';

  /* Calculated Customer Stats */
  const totalOutstanding = useMemo(() => {
    return customers.reduce((sum, item) => sum + item.amount, 0);
  }, [customers]);

  const outstandingCustomerCount = useMemo(() => {
    return customers.filter(c => c.amount > 0).length;
  }, [customers]);

  const filteredCustomers = useMemo(() => {
    let result = [...customers];
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        c =>
          c.name.toLowerCase().includes(q) ||
          c.address.toLowerCase().includes(q),
      );
    }
    if (activeFilter === 'Due Today') {
      result = result.filter(c => c.amount > 0 && !c.isOverdue);
    } else if (activeFilter === 'Defaulters') {
      result = result.filter(c => c.isOverdue || c.badge === 'OVERDUE');
    }
    if (sortBy === 'Name') {
      result.sort((a, b) => a.name.localeCompare(b.name));
    } else if (sortBy === 'Amount') {
      result.sort((a, b) => b.amount - a.amount);
    }
    return result;
  }, [customers, searchQuery, activeFilter, sortBy]);

  /* Customer Actions */
  const addCustomer = async (newCust: Omit<Customer, 'id'>) => {
    const customer = await customerService.addCustomer(newCust);
    setCustomers(prev => [customer, ...prev]);

    setActivities(prev => [
      {
        id: `act-${Date.now()}`,
        color: '#10B981',
        title: 'New Customer Added',
        subtitle: `${customer.name} (${customer.address})`,
        time: 'Just now',
      },
      ...prev,
    ]);
  };

  const collectPayment = async (customerId: string, amountToDeduct: number) => {
    await customerService.collectPayment(customerId, amountToDeduct);
    let customerName = '';

    setCustomers(prev =>
      prev.map(cust => {
        if (cust.id === customerId) {
          customerName = cust.name;
          const newAmount = Math.max(0, cust.amount - amountToDeduct);
          return {
            ...cust,
            amount: newAmount,
            badge: newAmount === 0 ? undefined : cust.badge,
            isOverdue: newAmount === 0 ? false : cust.isOverdue,
          };
        }
        return cust;
      }),
    );

    setCollectionsTotal(prev => prev + amountToDeduct);
    setInvoices(prev => prev.filter(inv => inv.name !== customerName));

    setActivities(prev => [
      {
        id: `act-${Date.now()}`,
        color: '#3B82F6',
        title: 'Payment Collected',
        subtitle: `₹${amountToDeduct.toLocaleString()} from ${customerName}`,
        time: 'Just now',
      },
      ...prev,
    ]);
  };

  const addInvoice = async (
    name: string,
    amount: number,
    dueDays: string,
    fullItem?: Partial<InvoiceItem>,
  ) => {
    const newInv = await billingService.createInvoiceLegacy(
      name,
      amount,
      dueDays,
      fullItem,
    );

    setInvoices(prev => [newInv, ...prev]);

    setCustomers(prev => {
      const existing = prev.find(
        c => c.name.toLowerCase() === name.toLowerCase(),
      );
      if (existing) {
        return prev.map(c =>
          c.id === existing.id ? { ...c, amount: c.amount + amount } : c,
        );
      } else {
        return [
          {
            id: Date.now().toString(),
            name,
            address: fullItem?.customerAddress || 'New Customer Address',
            amount,
            deliveryStatus: dueDays,
            hasDot: true,
            initials: name
              .split(' ')
              .map(n => n[0])
              .join('')
              .toUpperCase(),
          },
          ...prev,
        ];
      }
    });

    setActivities(prev => [
      {
        id: `act-${Date.now()}`,
        color: '#F59E0B',
        title: 'New Invoice Created',
        subtitle: `${newInv.invoiceNo} for ${name} (${newInv.amount})`,
        time: 'Just now',
      },
      ...prev,
    ]);
  };

  const addQuickBill = async (billData: {
    customerName: string;
    customerPhone?: string;
    customerAddress?: string;
    items: InvoiceLineItem[];
    subtotal: number;
    discount: number;
    grandTotal: number;
    paymentMethod: 'Cash' | 'UPI' | 'Credit';
    paidAmount: number;
    isWalkIn: boolean;
  }): Promise<InvoiceItem> => {
    const isPaidOnSpot = billData.paidAmount >= billData.grandTotal;
    const isPartial =
      billData.paidAmount > 0 && billData.paidAmount < billData.grandTotal;
    const remainingDue = Math.max(0, billData.grandTotal - billData.paidAmount);

    const dueStatusText = isPaidOnSpot
      ? 'Paid on Spot'
      : isPartial
        ? `Partially Paid (₹${remainingDue.toLocaleString()} due)`
        : 'Counter Credit';

    const status: 'PAID' | 'PENDING' = isPaidOnSpot ? 'PAID' : 'PENDING';

    const newInv = await billingService.createQuickBillLegacy({
      name: billData.customerName,
      customerPhone:
        billData.customerPhone || (billData.isWalkIn ? '' : '+91 98765 00000'),
      customerAddress:
        billData.customerAddress ||
        (billData.isWalkIn ? 'Counter Walk-in' : 'Local Market Area'),
      numericAmount: billData.grandTotal,
      subtotal: billData.subtotal,
      tax: 0,
      due: dueStatusText,
      status: status,
      items: billData.items,
      notes: `Counter Quick Bill (${billData.paymentMethod}) - Discount: ₹${billData.discount}`,
    });

    setInvoices(prev => [newInv, ...prev]);

    if (billData.paidAmount > 0) {
      const mappedMethod: 'UPI / GPay' | 'Cash' | 'Bank Transfer' =
        billData.paymentMethod === 'UPI'
          ? 'UPI / GPay'
          : billData.paymentMethod === 'Credit'
            ? 'Bank Transfer'
            : 'Cash';

      setCollectionsTotal(prev => prev + billData.paidAmount);
      setPaymentHistory(prev => [
        {
          id: `pay-${Date.now()}`,
          customerName: billData.customerName,
          amount: billData.paidAmount,
          method: mappedMethod,
          date: 'Today',
          time: 'Just now',
          status: 'SUCCESS',
          refNo: `QBC-${newInv.invoiceNo || newInv.id}`,
        },
        ...prev,
      ]);
    }

    if (!billData.isWalkIn && remainingDue > 0) {
      setCustomers(prev => {
        const existing = prev.find(
          c => c.name.toLowerCase() === billData.customerName.toLowerCase(),
        );
        if (existing) {
          return prev.map(c =>
            c.id === existing.id ? { ...c, amount: c.amount + remainingDue } : c,
          );
        } else {
          return [
            {
              id: Date.now().toString(),
              name: billData.customerName,
              address: billData.customerAddress || 'Counter Customer',
              amount: remainingDue,
              deliveryStatus: dueStatusText,
              hasDot: true,
            },
            ...prev,
          ];
        }
      });
    }

    setActivities(prev => [
      {
        id: `act-${Date.now()}`,
        color: '#059669',
        title: `Quick Bill Created (${newInv.invoiceNo})`,
        subtitle: `₹${billData.grandTotal.toLocaleString()} for ${billData.customerName
          } [${billData.paymentMethod}]`,
        time: 'Just now',
      },
      ...prev,
    ]);

    if (billData.items && billData.items.length > 0) {
      setProducts(prev =>
        prev.map(p => {
          const itemInBill = billData.items.find(
            i => i.name.toLowerCase() === p.name.toLowerCase() || i.id === p.id,
          );
          if (itemInBill) {
            const updatedStock = Math.max(0, p.stockNumber - itemInBill.qty);
            return {
              ...p,
              stockNumber: updatedStock,
              stock: `${updatedStock} units left`,
              isLowStock: updatedStock <= 15,
            };
          }
          return p;
        }),
      );
    }

    return newInv;
  };

  const markInvoiceAsPaid = async (id: string) => {
    const inv = invoices.find(i => i.id === id);
    if (!inv) return;

    await billingService.markInvoiceAsPaidLegacy(id);

    setInvoices(prev =>
      prev.map(item =>
        item.id === id ? { ...item, status: 'PAID', isOverdue: false } : item,
      ),
    );

    const paidVal =
      inv.numericAmount || parseInt(inv.amount.replace(/[^0-9]/g, '')) || 0;
    if (paidVal > 0) {
      setCollectionsTotal(prev => prev + paidVal);
      setPaymentHistory(prev => [
        {
          id: `pay-${Date.now()}`,
          customerName: inv.name,
          amount: paidVal,
          method: 'UPI / GPay',
          date: 'Today',
          time: 'Just now',
          status: 'SUCCESS',
          refNo: `INV-SETTLE-${inv.invoiceNo || inv.id}`,
        },
        ...prev,
      ]);
    }
  };

  const collectInvoicePayment = async (
    invoiceId: string,
    paidAmount: number,
    paymentMethod: 'Cash' | 'UPI' | 'Card' | 'Bank Transfer',
  ) => {
    const inv = invoices.find(i => i.id === invoiceId);
    if (!inv || paidAmount <= 0) return;

    const currentVal =
      inv.numericAmount ||
      parseInt(inv.amount.replace(/[^0-9]/g, '')) ||
      0;
    const remainingAmount = Math.max(0, currentVal - paidAmount);
    const isFullyPaid = remainingAmount === 0;

    // 1. Update Invoices
    setInvoices(prev =>
      prev.map(item => {
        if (item.id === invoiceId) {
          if (isFullyPaid) {
            return {
              ...item,
              status: 'PAID',
              isOverdue: false,
              numericAmount: 0,
              amount: '₹0',
              due: 'Paid in Full',
            };
          } else {
            return {
              ...item,
              numericAmount: remainingAmount,
              amount: `₹${remainingAmount.toLocaleString()}`,
              due: `Partial Paid (₹${remainingAmount.toLocaleString()} due)`,
            };
          }
        }
        return item;
      }),
    );

    // 2. Increase Collections Total
    setCollectionsTotal(prev => prev + paidAmount);

    // 3. Decrease Customer Amount if customer exists
    const customerName = inv.name;
    setCustomers(prev =>
      prev.map(cust => {
        if (cust.name.toLowerCase() === customerName.toLowerCase()) {
          const newAmount = Math.max(0, cust.amount - paidAmount);
          return {
            ...cust,
            amount: newAmount,
            badge: newAmount === 0 ? undefined : cust.badge,
            isOverdue: newAmount === 0 ? false : cust.isOverdue,
          };
        }
        return cust;
      }),
    );

    // 4. Add Payment History
    const mappedMethod: PaymentRecord['method'] =
      paymentMethod === 'Cash'
        ? 'Cash'
        : paymentMethod === 'Card' || paymentMethod === 'Bank Transfer'
          ? 'Bank Transfer'
          : 'UPI / GPay';

    setPaymentHistory(prev => [
      {
        id: `pay-${Date.now()}`,
        customerName: inv.name,
        amount: paidAmount,
        method: mappedMethod,
        date: 'Today',
        time: 'Just now',
        status: 'SUCCESS',
        refNo: `COLLECT-${inv.invoiceNo || inv.id}`,
      },
      ...prev,
    ]);

    // 5. Update Recent Activity
    setActivities(prev => [
      {
        id: `act-${Date.now()}`,
        color: '#059669',
        title: isFullyPaid
          ? `Invoice ${inv.invoiceNo || inv.id} Paid`
          : `Payment Collected (${inv.invoiceNo || inv.id})`,
        subtitle: `₹${paidAmount.toLocaleString()} from ${inv.name} [${paymentMethod}]`,
        time: 'Just now',
      },
      ...prev,
    ]);

    // 6. Add Notification
    setNotifications(prev => [
      {
        id: `n-${Date.now()}`,
        title: 'Payment Received',
        message: `₹${paidAmount.toLocaleString()} received from ${inv.name} via ${paymentMethod}.`,
        time: 'Just now',
        type: 'payment',
        isRead: false,
      },
      ...prev,
    ]);
  };

  const deleteInvoice = async (id: string) => {
    await billingService.deleteInvoiceLegacy(id);
    setInvoices(prev => prev.filter(inv => inv.id !== id));
  };

  const updateOrderDeliveryStatus = async (
    orderId: string,
    status: 'Pending' | 'Out for delivery' | 'Delivered',
    location?: string,
  ) => {
    setInvoices(prev =>
      prev.map(inv =>
        inv.id === orderId || inv.invoiceNo === orderId
          ? {
            ...inv,
            deliveryStatus: status,
            currentLocation:
              location ||
              (status === 'Delivered'
                ? 'Delivered to Customer'
                : status === 'Out for delivery'
                  ? 'In Transit / On Route'
                  : 'At Hub'),
          }
          : inv,
      ),
    );
  };

  const assignOrderPartner = async (orderId: string, partnerName: string) => {
    setInvoices(prev =>
      prev.map(inv =>
        inv.id === orderId || inv.invoiceNo === orderId
          ? { ...inv, deliveryPartnerName: partnerName }
          : inv,
      ),
    );

    setDeliveryBoys(prev =>
      prev.map(b =>
        b.name.toLowerCase() === partnerName.toLowerCase()
          ? { ...b, status: 'BUSY', location: `Assigned Order ${orderId}` }
          : b,
      ),
    );

    setActivities(prev => [
      {
        id: `act-${Date.now()}`,
        color: '#059669',
        title: 'Delivery Partner Assigned',
        subtitle: `Order ${orderId} assigned to ${partnerName}`,
        time: 'Just now',
      },
      ...prev,
    ]);
  };

  /* Calculated Product Stats */
  const totalSKUs = useMemo(() => products.length, [products]);
  const lowStockCount = useMemo(() => {
    return products.filter(p => p.isLowStock || p.stockNumber <= 15).length;
  }, [products]);

  const addProduct = async (newProd: Omit<ProductItem, 'id'>) => {
    const product = await productService.addProduct(newProd);
    setProducts(prev => [product, ...prev]);

    setActivities(prev => [
      {
        id: `act-${Date.now()}`,
        color: '#8C331A',
        title: 'New Product Added',
        subtitle: `${product.name} (${product.stock})`,
        time: 'Just now',
      },
      ...prev,
    ]);
  };

  const updateProduct = async (
    productId: string,
    updates: Partial<ProductItem>,
  ) => {
    await productService.updateProductItem(productId, updates);
    setProducts(prev =>
      prev.map(prod => (prod.id === productId ? { ...prod, ...updates } : prod)),
    );
  };

  const updateProductStock = async (
    productId: string,
    newStockNumber: number,
  ) => {
    await productService.updateStock(productId, newStockNumber);
    setProducts(prev =>
      prev.map(prod => {
        if (prod.id === productId) {
          const isLow = newStockNumber <= 15;
          return {
            ...prod,
            stockNumber: newStockNumber,
            stock: `${newStockNumber} ${prod.unit}`,
            isLowStock: isLow,
          };
        }
        return prod;
      }),
    );
  };

  const updateProductPrice = async (productId: string, newPrice: string) => {
    await productService.updatePrice(productId, newPrice);
    const formattedPrice = newPrice.startsWith('₹') ? newPrice : `₹${newPrice}`;
    setProducts(prev =>
      prev.map(prod => {
        if (prod.id === productId) {
          return {
            ...prod,
            price: formattedPrice,
          };
        }
        return prod;
      }),
    );
  };

  const updateProductImage = async (productId: string, imageUrl: string) => {
    await productService.updateImage(productId, imageUrl);
    setProducts(prev =>
      prev.map(prod => {
        if (prod.id === productId) {
          return {
            ...prod,
            imageUrl,
          };
        }
        return prod;
      }),
    );
  };

  const deleteProduct = async (productId: string) => {
    await productService.deleteProduct(productId);
    setProducts(prev => prev.filter(p => p.id !== productId));
  };

  const resetProductsToDefault = async () => {
    setProducts(initialProducts);
  };

  /* Delivery Boy Calculations & Actions */
  const activeBoysCount = useMemo(() => {
    return deliveryBoys.filter(b => b.status === 'BUSY' || b.status === 'READY')
      .length;
  }, [deliveryBoys]);

  const totalBoysCount = useMemo(() => deliveryBoys.length, [deliveryBoys]);

  const inTransitOrdersCount = useMemo(() => {
    return deliveryBoys.filter(b => b.status === 'BUSY').length * 4; // Dynamic order estimation
  }, [deliveryBoys]);

  const addDeliveryBoy = async (newBoy: Omit<DeliveryBoyItem, 'id'>) => {
    const boy = await deliveryService.addDeliveryBoy(newBoy);
    setDeliveryBoys(prev => [boy, ...prev]);

    setActivities(prev => [
      {
        id: `act-${Date.now()}`,
        color: '#3B82F6',
        title: 'New Delivery Member',
        subtitle: `${boy.name} joined the fleet`,
        time: 'Just now',
      },
      ...prev,
    ]);
  };

  const assignOrderToBoy = async (boyId: string) => {
    await deliveryService.assignOrder(boyId);
    setDeliveryBoys(prev =>
      prev.map(boy => {
        if (boy.id === boyId) {
          return {
            ...boy,
            status: 'BUSY',
            location: 'En route to customer',
            progress: 20,
          };
        }
        return boy;
      }),
    );

    setActivities(prev => [
      {
        id: `act-${Date.now()}`,
        color: '#8C331A',
        title: 'Order Assigned',
        subtitle: 'New delivery assigned to fleet',
        time: 'Just now',
      },
      ...prev,
    ]);
  };

  const updateDeliveryBoy = async (
    boyId: string,
    updated: Partial<DeliveryBoyItem>,
  ) => {
    await deliveryService.updateDeliveryBoy(boyId, updated);
    setDeliveryBoys(prev =>
      prev.map(boy => (boy.id === boyId ? { ...boy, ...updated } : boy)),
    );
  };

  const deleteDeliveryBoy = async (boyId: string) => {
    await deliveryService.deleteDeliveryBoy(boyId);
    setDeliveryBoys(prev => prev.filter(boy => boy.id !== boyId));
    setActivities(prev => [
      {
        id: `act-${Date.now()}`,
        color: '#D9381E',
        title: 'Fleet Member Removed',
        subtitle: 'A delivery partner was removed from fleet',
        time: 'Just now',
      },
      ...prev,
    ]);
  };

  const updateBoyStatus = async (
    boyId: string,
    status: 'BUSY' | 'READY' | 'OFFLINE',
  ) => {
    await deliveryService.updateStatus(boyId, status);
    setDeliveryBoys(prev =>
      prev.map(boy => {
        if (boy.id === boyId) {
          return {
            ...boy,
            status,
            location:
              status === 'READY'
                ? 'At Hub'
                : status === 'BUSY'
                  ? 'En route'
                  : 'Offline',
            progress: status === 'BUSY' ? 50 : 0,
          };
        }
        return boy;
      }),
    );
  };

  /* Schedule Actions */
  const addSchedule = async (newSch: Omit<ScheduleItem, 'id'>) => {
    const item = await scheduleService.addSchedule(newSch);
    setSchedules(prev => [...prev, item]);

    // Send notification to Delivery Partner & system
    addNotification({
      title: '📅 New Delivery Route Assigned',
      message: `New route "${newSch.title || newSch.customerName
        }" assigned to ${newSch.deliveryBoy} for ${newSch.timeSlot}.`,
      type: 'order',
    });

    // Log Activity
    setActivities(prev => [
      {
        id: `act-${Date.now()}`,
        color: '#059669',
        title: 'New Route Scheduled',
        subtitle: `${newSch.customerName} assigned to ${newSch.deliveryBoy}`,
        time: 'Just now',
      },
      ...prev,
    ]);
  };

  const completeSchedule = async (scheduleId: string) => {
    await scheduleService.completeSchedule(scheduleId);
    setSchedules(prev =>
      prev.map(sch =>
        sch.id === scheduleId ? { ...sch, status: 'COMPLETED' } : sch,
      ),
    );
  };

  /* Notifications State & Actions */

  const unreadNotificationsCount = notifications.filter(n => !n.isRead).length;

  const addNotification = async (
    item: Omit<NotificationItem, 'id' | 'time' | 'isRead'>,
  ) => {
    const newNotif = await notificationService.addNotification(item);
    setNotifications(prev => [newNotif, ...prev]);
  };

  const addCupRecord = (
    customerName: string,
    cupCount: number,
    itemType: string,
  ) => {
    const partnerName = userProfile?.fullName || 'Delivery Partner';

    // 1. Add notification for Admin
    addNotification({
      title: '📦 New Cups Logged',
      message: `${partnerName} logged ${cupCount}x ${itemType} for ${customerName}`,
      type: 'order',
    });

    // 2. Add Activity log for Admin dashboard
    setActivities(prev => [
      {
        id: `act-${Date.now()}`,
        color: '#10B981',
        title: `Cups Logged (${cupCount}x ${itemType})`,
        subtitle: `${customerName} via ${partnerName}`,
        time: 'Just now',
      },
      ...prev,
    ]);
  };

  const markAllNotificationsAsRead = async () => {
    await notificationService.markAllAsRead();
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
  };

  const deleteNotification = async (id: string) => {
    await notificationService.deleteNotification(id);
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const deleteSelectedNotifications = (ids: string[]) => {
    setNotifications(prev => prev.filter(n => !ids.includes(n.id)));
  };

  const clearAllNotifications = async () => {
    await notificationService.clearAll();
    setNotifications([]);
  };

  return (
    <AppContext.Provider
      value={{
        customers,
        filteredCustomers,
        totalOutstanding,
        outstandingCustomerCount,
        searchQuery,
        setSearchQuery,
        activeFilter,
        setActiveFilter,
        sortBy,
        setSortBy,
        addCustomer,
        collectPayment,
        invoices,
        activities,
        totalRevenue,
        revenueGrowth,
        collectionsTotal,
        addInvoice,
        addQuickBill,
        markInvoiceAsPaid,
        collectInvoicePayment,
        deleteInvoice,
        updateOrderDeliveryStatus,
        assignOrderPartner,
        paymentHistory,

        notifications,
        unreadNotificationsCount,
        addNotification,
        addCupRecord,
        markAllNotificationsAsRead,
        deleteNotification,
        deleteSelectedNotifications,
        clearAllNotifications,

        products,
        addProduct,
        updateProduct,
        updateProductStock,
        updateProductPrice,
        updateProductImage,
        deleteProduct,
        resetProductsToDefault,
        totalSKUs,
        lowStockCount,

        deliveryBoys,
        addDeliveryBoy,
        updateDeliveryBoy,
        deleteDeliveryBoy,
        assignOrderToBoy,
        updateBoyStatus,
        activeBoysCount,
        totalBoysCount,
        inTransitOrdersCount,

        schedules,
        addSchedule,
        completeSchedule,

        isAuthenticated,
        userMobile,
        setUserMobile,
        userRole,
        setUserRole,
        login,
        loginWithVerifiedUser,
        logout,

        userProfile,
        updateUserProfile,
        isDrawerOpen,
        openDrawer,
        closeDrawer,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};