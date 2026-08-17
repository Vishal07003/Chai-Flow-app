import apiClient from './api';
import { ProductItem } from '../types/product';

export const productService = {
  async getProducts(initialData?: ProductItem[]): Promise<ProductItem[]> {
    return apiClient.get<ProductItem[]>('/products', initialData || []);
  },

  async addProduct(product: Omit<ProductItem, 'id'>): Promise<ProductItem> {
    const id = Date.now().toString();
    const newProduct: ProductItem = {
      ...product,
      id,
    };
    return apiClient.post<ProductItem>('/products', product, newProduct);
  },

  async updateStock(
    productId: string,
    newStockNumber: number,
  ): Promise<{ productId: string; newStockNumber: number }> {
    return apiClient.put(`/products/${productId}/stock`, { newStockNumber }, {
      productId,
      newStockNumber,
    });
  },

  async updateImage(
    productId: string,
    imageUrl: string,
  ): Promise<{ productId: string; imageUrl: string }> {
    return apiClient.put(`/products/${productId}/image`, { imageUrl }, {
      productId,
      imageUrl,
    });
  },

  async updatePrice(
    productId: string,
    newPrice: string,
  ): Promise<{ productId: string; newPrice: string }> {
    return apiClient.put(`/products/${productId}/price`, { newPrice }, {
      productId,
      newPrice,
    });
  },

  async deleteProduct(id: string): Promise<{ success: boolean }> {
    return apiClient.delete<{ success: boolean }>(`/products/${id}`, {
      success: true,
    });
  },
};

export default productService;
