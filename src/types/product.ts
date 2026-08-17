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

export type Product = ProductItem;
