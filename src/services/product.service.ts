import apiClient from './api';

export interface Category {
  id: number;
  name: string;
  description?: string;
}

export interface BackendProduct {
  id: number;
  name: string;
  category: number | null;
  category_name?: string;
  price: string;
  description?: string;
  image_url?: string;
  is_available: boolean;
  created_at: string;
}

export const productService = {
  /**
   * Fetch categories from Django backend
   */
  async getCategories(): Promise<Category[]> {
    return apiClient.get<Category[]>('/products/categories/');
  },

  /**
   * Fetch all products or filter by category / availability
   */
  async getProducts(params?: { category?: number; available?: boolean }): Promise<BackendProduct[]> {
    const query = new URLSearchParams();
    if (params?.category) query.append('category', String(params.category));
    if (params?.available !== undefined) query.append('available', String(params.available));
    const qs = query.toString();
    return apiClient.get<BackendProduct[]>(`/products/items/${qs ? `?${qs}` : ''}`);
  },

  /**
   * Fetch single product detail
   */
  async getProductById(id: number | string): Promise<BackendProduct> {
    return apiClient.get<BackendProduct>(`/products/items/${id}/`);
  },

  /**
   * Create new product (Owner only)
   */
  async createProduct(data: {
    name: string;
    category?: number;
    price: string | number;
    description?: string;
    image_url?: string;
    is_available?: boolean;
  }): Promise<BackendProduct> {
    return apiClient.post<BackendProduct>('/products/items/', data);
  },

  /**
   * Update product (Owner only)
   */
  async updateProduct(
    id: number | string,
    data: Partial<{
      name: string;
      category: number;
      price: string | number;
      description: string;
      image_url: string;
      is_available: boolean;
    }>,
  ): Promise<BackendProduct> {
    return apiClient.patch<BackendProduct>(`/products/items/${id}/`, data);
  },

  /**
   * Delete product (Owner only)
   */
  async deleteProduct(id: number | string): Promise<void> {
    return apiClient.delete<void>(`/products/items/${id}/`);
  },
};

export default productService;
