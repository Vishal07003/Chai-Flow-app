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
  phone?: string;
  category?: string;
  pendingBalance?: number;
}
