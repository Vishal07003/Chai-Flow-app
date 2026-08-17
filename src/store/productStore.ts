import { storage } from '../utils/storage';
import { Product } from '../types/product';

const PRODUCTS_KEY = '@product_store_v1';

export const productStore = {
  async saveProducts(products: Product[]): Promise<boolean> {
    return storage.setItem(PRODUCTS_KEY, products);
  },

  async getProducts(): Promise<Product[] | null> {
    return storage.getItem(PRODUCTS_KEY);
  },
};

export default productStore;
