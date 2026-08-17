export type UserRole = 'ADMIN' | 'DELIVERY_PARTNER' | 'OWNER';

export interface UserProfile {
  id?: string;
  name?: string;
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

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  time: string;
  type: 'payment' | 'order' | 'overdue' | 'system';
  isRead: boolean;
}
