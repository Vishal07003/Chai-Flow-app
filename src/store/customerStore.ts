import { storage } from '../utils/storage';
import { Customer } from '../types/customer';

const CUSTOMERS_KEY = '@customer_store_v1';

export const customerStore = {
  async saveCustomers(customers: Customer[]): Promise<boolean> {
    return storage.setItem(CUSTOMERS_KEY, customers);
  },

  async getCustomers(): Promise<Customer[] | null> {
    return storage.getItem(CUSTOMERS_KEY);
  },
};

export default customerStore;
