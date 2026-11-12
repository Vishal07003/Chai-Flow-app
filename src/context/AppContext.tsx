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
  logout: () => Promise<void> | void;

  userProfile: UserProfile;
  updateUserProfile: (updated: Partial<UserProfile>) => Promise<void> | void;

  isDrawerOpen: boolean;
  openDrawer: () => void;
  closeDrawer: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const initialCustomers: Customer[] = [
  {
    id: '1',
    name: 'Rajesh Kumar',
    address: 'Flat 402, Green Valley Apartments',
    amount: 1240,
    deliveryStatus: 'Last delivery: 2h ago',
    hasDot: true,
    avatarUrl:
      'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
    initials: 'RK',
    isOverdue: false,
  },
  {
    id: '2',
    name: 'Anita Desai',
    address: 'Villa 12, Sunshine Colony',
    amount: 0,
    deliveryStatus: 'Last delivery: Yesterday',
    hasDot: false,
    avatarUrl:
      'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    initials: 'AD',
    isOverdue: false,
  },
  {
    id: '3',
    name: 'Suresh Prabhu',
    address: 'House No 88, Sector 14',
    amount: 4800,
    deliveryStatus: '30+ days',
    hasDot: false,
    badge: 'OVERDUE',
    avatarUrl:
      'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
    initials: 'SP',
    isOverdue: true,
  },
  {
    id: '4',
    name: 'Vikram Singh',
    address: 'Pinnacle Towers, Block B',
    amount: 850,
    deliveryStatus: 'Last delivery: 4h ago',
    hasDot: false,
    avatarUrl:
      'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&auto=format&fit=crop&q=80',
    initials: 'VS',
    isOverdue: false,
  },
  {
    id: '5',
    name: 'Ankit Sharma',
    address: 'Tower A-102, Highland Park',
    amount: 1240,
    deliveryStatus: 'Due in 2 days',
    hasDot: false,
    avatarUrl:
      'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150&auto=format&fit=crop&q=80',
    initials: 'AS',
    isOverdue: false,
  },
  {
    id: '6',
    name: 'Meera Kapoor',
    address: 'B-304, Royal Palms Estate',
    amount: 850,
    deliveryStatus: 'Overdue by 1 day',
    hasDot: false,
    badge: 'OVERDUE',
    avatarUrl:
      'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop&q=80',
    initials: 'MK',
    isOverdue: true,
  },
];

const initialProducts: ProductItem[] = [
  {
    id: '1',
    name: 'Signature Masala Chai',
    price: '240',
    unit: 'kg',
    description: 'Premium CTC Dust with 7 Spices',
    stock: '142 kg',
    stockNumber: 142,
    maxStock: 200,
    imageUrl:
      'https://images.unsplash.com/photo-1576092768241-dec231879fc3?auto=format&fit=crop&w=600&q=80',
    badge: 'BEST SELLER',
    isLowStock: false,
    category: 'Masala Chai',
  },
  {
    id: '2',
    name: 'Himalayan Green Tea',
    price: '450',
    unit: 'kg',
    description: 'Whole Leaf, Rich in Antioxidants',
    stock: '12 kg',
    stockNumber: 12,
    maxStock: 100,
    imageUrl:
      'https://images.unsplash.com/photo-1564890369478-c89ca6d9cde9?auto=format&fit=crop&w=600&q=80',
    isLowStock: true,
    category: 'Green Tea',
  },
  {
    id: '3',
    name: 'Disposable Paper Cups',
    price: '1.20',
    unit: 'pc',
    description: '150ml, Eco-friendly biodegradable material',
    stock: '5,000',
    stockNumber: 5000,
    isCompact: true,
    category: 'Containers',
  },
  {
    id: '4',
    name: 'Butter Rusk Biscuits',
    price: '120',
    unit: 'pack',
    description: 'Crispy oven baked tea-time biscuits',
    stock: '85 packs',
    stockNumber: 85,
    maxStock: 150,
    imageUrl:
      'https://images.unsplash.com/photo-1558961363-fa8fdf82db35?auto=format&fit=crop&w=600&q=80',
    isLowStock: false,
    category: 'Snacks',
  },
];

const initialDeliveryBoys: DeliveryBoyItem[] = [
  {
    id: '1',
    name: 'Rahul Sharma',
    phone: '+91 98765 12345',
    vehicleType: 'Scooter',
    vehicleModel: 'Honda Activa 6G',
    numberPlate: 'DL 01 AB 7890',
    status: 'BUSY',
    location: 'Sector 14 - Market Rd',
    distance: '2.4km away',
    progress: 70,
    avatarUrl:
      'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80',
  },
  {
    id: '2',
    name: 'Arjun Varma',
    phone: '+91 98112 34567',
    vehicleType: 'E-Bike',
    vehicleModel: 'Hero Electric Nyx',
    numberPlate: 'DL 03 EB 4512',
    status: 'READY',
    location: 'At Hub',
    distance: 'Idle 15m',
    avatarUrl:
      'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80',
  },
  {
    id: '3',
    name: 'Vikram Singh',
    phone: '+91 99001 88776',
    vehicleType: 'Auto Cargo',
    vehicleModel: 'Piaggio Ape Extra',
    numberPlate: 'HR 26 CB 9988',
    status: 'OFFLINE',
    location: 'Shift ended 2h ago',
    avatarUrl:
      'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=200&q=80',
  },
];

const initialSchedules: ScheduleItem[] = [
  {
    id: 'sch-1',
    timeSlot: '09:00 AM',
    title: 'Morning Tea Delivery Route #101',
    customerName: 'Rajesh Kumar',
    address: 'Flat 402, Green Valley Apartments',
    deliveryBoy: 'Rahul Sharma',
    status: 'IN_PROGRESS',
    itemsCount: 15,
  },
  {
    id: 'sch-2',
    timeSlot: '11:30 AM',
    title: 'Bulk Container Delivery #102',
    customerName: 'Ankit Sharma',
    address: 'Tower A-102, Highland Park',
    deliveryBoy: 'Arjun Varma',
    status: 'UPCOMING',
    itemsCount: 8,
  },
  {
    id: 'sch-3',
    timeSlot: '02:00 PM',
    title: 'Afternoon Restock Route #103',
    customerName: 'Anita Desai',
    address: 'Villa 12, Sunshine Colony',
    deliveryBoy: 'Unassigned',
    status: 'UPCOMING',
    itemsCount: 12,
  },
  {
    id: 'sch-4',
    timeSlot: '05:00 PM',
    title: 'Evening Delivery Route #104',
    customerName: 'Suresh Prabhu',
    address: 'House No 88, Sector 14',
    deliveryBoy: 'Rahul Sharma',
    status: 'UPCOMING',
    itemsCount: 20,
  },
];

const initialInvoices: InvoiceItem[] = [
  {
    id: 'inv-1',
    invoiceNo: 'INV-2026-001',
    name: 'Ankit Sharma',
    customerAddress: 'Plot 45, Industrial Area, Phase 2, New Delhi',
    customerPhone: '+91 98765 12345',
    amount: '₹1,240',
    numericAmount: 1240,
    due: 'Due in 2 days',
    date: '27 Jul 2026',
    isOverdue: false,
    status: 'PENDING',
    items: [
      { id: '1', name: 'Premium CTC Tea Dust (5kg)', qty: 2, price: 500 },
      { id: '2', name: 'Special Masala Spices (250g)', qty: 1, price: 240 },
    ],
    subtotal: 1240,
    tax: 0,
    notes: 'Thank you for ordering with ChaiFlow! Please pay within 2 days.',
  },
  {
    id: 'inv-2',
    invoiceNo: 'INV-2026-002',
    name: 'Meera Kapoor',
    customerAddress: 'Flat 302, Royal Palms, Vasant Kunj',
    customerPhone: '+91 98123 45678',
    amount: '₹850',
    numericAmount: 850,
    due: 'Overdue by 1 day',
    date: '25 Jul 2026',
    isOverdue: true,
    status: 'OVERDUE',
    items: [{ id: '1', name: 'Green Tea Leaves (1kg)', qty: 1, price: 850 }],
    subtotal: 850,
    tax: 0,
    notes: 'Payment is overdue. Please settle immediately via UPI.',
  },
  {
    id: 'inv-3',
    invoiceNo: 'INV-2026-003',
    name: 'Suresh Prabhu',
    customerAddress: 'House No 88, Sector 14, Noida',
    customerPhone: '+91 99887 76655',
    amount: '₹4,800',
    numericAmount: 4800,
    due: 'Overdue by 30 days',
    date: '29 Jun 2026',
    isOverdue: true,
    status: 'OVERDUE',
    items: [
      { id: '1', name: 'Commercial CTC Tea Crate (25kg)', qty: 2, price: 2400 },
    ],
    subtotal: 4800,
    tax: 0,
    notes: 'Account flagged overdue. Final notice for settlement.',
  },
];

const initialActivities: ActivityItem[] = [
  {
    id: 'act-1',
    color: '#3B82F6',
    title: 'Route #402 Completed',
    subtitle: 'Rahul delivered to 14 points',
    time: '12 mins ago',
  },
  {
    id: 'act-2',
    color: '#8C331A',
    title: 'New Inventory Added',
    subtitle: '50kg Premium CTC Tea Dust',
    time: '45 mins ago',
  },
  {
    id: 'act-3',
    color: '#10B981',
    title: 'Payment Received',
    subtitle: '₹5,000 from Corporate Hub',
    time: '2 hours ago',
  },
  {
    id: 'act-4',
    color: '#F59E0B',
    title: 'New Customer Added',
    subtitle: 'Ramesh Tea Stall (40 cups/day)',
    time: '3 hours ago',
  },
  {
    id: 'act-5',
    color: '#8B5CF6',
    title: 'Invoice Created',
    subtitle: 'INV-2026-004 for Ankit Sharma (₹1,240)',
    time: '4 hours ago',
  },
  {
    id: 'act-6',
    color: '#EC4899',
    title: 'Schedule Assigned',
    subtitle: 'Evening Delivery Route #104 to Rahul',
    time: '5 hours ago',
  },
  {
    id: 'act-7',
    color: '#10B981',
    title: 'Payment Collected',
    subtitle: '₹1,850 from Green Valley Bakery',
    time: 'Yesterday',
  },
];

const initialPaymentHistory: PaymentRecord[] = [
  {
    id: 'pay-101',
    customerName: 'Ramesh Tea Stall',
    amount: 1200,
    method: 'UPI / GPay',
    date: 'Today',
    time: '10:15 AM',
    status: 'SUCCESS',
    refNo: 'UPI/4091823901',
  },
  {
    id: 'pay-102',
    customerName: 'Modern Bakery & Cafe',
    amount: 2500,
    method: 'Cash',
    date: 'Today',
    time: '08:45 AM',
    status: 'SUCCESS',
    refNo: 'CSH/89201923',
  },
  {
    id: 'pay-103',
    customerName: 'Chai Point Sector 5',
    amount: 4300,
    method: 'PhonePe',
    date: 'Yesterday',
    time: '04:30 PM',
    status: 'SETTLED',
    refNo: 'PHN/30192841',
  },
  {
    id: 'pay-104',
    customerName: 'Green Valley Bakery',
    amount: 1850,
    method: 'Bank Transfer',
    date: 'Yesterday',
    time: '02:15 PM',
    status: 'SETTLED',
    refNo: 'IMPS/90812903',
  },
  {
    id: 'pay-105',
    customerName: 'Sharma Snacks Bar',
    amount: 3200,
    method: 'UPI / GPay',
    date: '25 Jul 2026',
    time: '11:20 AM',
    status: 'SETTLED',
    refNo: 'UPI/10928301',
  },
  {
    id: 'pay-106',
    customerName: 'Hotel Royal Inn',
    amount: 8500,
    method: 'Bank Transfer',
    date: '24 Jul 2026',
    time: '05:40 PM',
    status: 'SETTLED',
    refNo: 'NEFT/50912830',
  },
];

const initialNotifications: NotificationItem[] = [
  {
    id: 'n1',
    title: 'Payment Received',
    message: 'Ramesh Tea Stall paid ₹1,200 via UPI (GPay).',
    time: '10m ago',
    type: 'payment',
    isRead: false,
  },
  {
    id: 'n2',
    title: 'Invoice Overdue Warning',
    message: 'Green Valley Bakery invoice of ₹2,450 is 3 days overdue.',
    time: '1h ago',
    type: 'overdue',
    isRead: false,
  },
  {
    id: 'n3',
    title: 'Delivery Run Started',
    message: 'Suresh Patel started Morning Commercial Street delivery run.',
    time: '2h ago',
    type: 'order',
    isRead: false,
  },
  {
    id: 'n4',
    title: 'Stock Alert',
    message:
      'Masala Chai Premix 500g is running low in inventory (12 packets left).',
    time: '5h ago',
    type: 'system',
    isRead: true,
  },
];

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
  // 1. Load persisted data from AsyncStorage on app boot
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
          if (parsed.isAuthenticated !== undefined)
            setIsAuthenticated(parsed.isAuthenticated);
          if (parsed.userMobile) setUserMobile(parsed.userMobile);
          if (parsed.userRole) setUserRole(parsed.userRole);
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

  const totalRevenue = 42850;
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
    const newInv = await orderService.createInvoice(
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

    const newInv = await orderService.createQuickBill({
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

    await orderService.markInvoiceAsPaid(id);

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
    await orderService.deleteInvoice(id);
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
