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

  // Live Django Backend Methods for AppContext ProductItem operations
  async getProductsList(initialData?: any[]): Promise<any[]> {
    try {
      const backendProducts = await this.getProducts();
      if (Array.isArray(backendProducts) && backendProducts.length > 0) {
        return backendProducts.map(bp => {
          const rawPrice = parseFloat(bp.price) || 0;
          return {
            id: String(bp.id),
            name: bp.name,
            price: `₹${rawPrice}`,
            unit: 'unit',
            description: bp.description || 'Store inventory item',
            stock: bp.is_available ? '100 units' : 'Out of stock',
            stockNumber: bp.is_available ? 100 : 0,
            maxStock: 200,
            category: bp.category_name || 'Masala Chai',
            isLowStock: !bp.is_available,
            imageUrl:
              bp.image_url ||
              'https://images.unsplash.com/photo-1576092768241-dec231879fc3?auto=format&fit=crop&w=600&q=80',
          };
        });
      }
    } catch (e) {
      console.log('Using local fallback for products:', e);
    }
    return initialData || [];
  },

  async addProduct(product: any): Promise<any> {
    const rawPrice =
      typeof product.price === 'string'
        ? parseFloat(product.price.replace(/[^0-9.]/g, '')) || 100
        : Number(product.price) || 100;

    try {
      const res = await this.createProduct({
        name: product.name,
        price: rawPrice,
        description: product.description || 'Premium store item',
        image_url: product.imageUrl,
        is_available: product.stockNumber !== undefined ? product.stockNumber > 0 : true,
      });

      return {
        ...product,
        id: String(res.id),
        price: `₹${rawPrice}`,
      };
    } catch (e) {
      console.log('Backend createProduct error, falling back locally:', e);
      const id = Date.now().toString();
      return {
        ...product,
        id,
      };
    }
  },

  async updateProductItem(id: string, updates: any): Promise<any> {
    try {
      const payload: any = {};
      if (updates.name) payload.name = updates.name;
      if (updates.description) payload.description = updates.description;
      if (updates.imageUrl) payload.image_url = updates.imageUrl;
      if (updates.price !== undefined) {
        payload.price =
          typeof updates.price === 'string'
            ? parseFloat(updates.price.replace(/[^0-9.]/g, '')) || 0
            : updates.price;
      }
      if (updates.stockNumber !== undefined) {
        payload.is_available = updates.stockNumber > 0;
      }
      if (Object.keys(payload).length > 0) {
        await this.updateProduct(id, payload);
      }
    } catch (e) {
      console.log('Backend updateProduct error:', e);
    }
    return {
      id,
      ...updates,
    };
  },

  async updateStock(
    productId: string,
    newStockNumber: number,
  ): Promise<{ productId: string; newStockNumber: number }> {
    try {
      await this.updateProduct(productId, { is_available: newStockNumber > 0 });
    } catch (e) {
      console.log('Update stock fallback:', e);
    }
    return {
      productId,
      newStockNumber,
    };
  },

  async updateImage(
    productId: string,
    imageUrl: string,
  ): Promise<{ productId: string; imageUrl: string }> {
    try {
      await this.updateProduct(productId, { image_url: imageUrl });
    } catch (e) {
      console.log('Update image fallback:', e);
    }
    return {
      productId,
      imageUrl,
    };
  },

  async updatePrice(
    productId: string,
    newPrice: string,
  ): Promise<{ productId: string; newPrice: string }> {
    try {
      const priceNum = parseFloat(newPrice.replace(/[^0-9.]/g, '')) || 0;
      await this.updateProduct(productId, { price: priceNum });
    } catch (e) {
      console.log('Update price fallback:', e);
    }
    return {
      productId,
      newPrice,
    };
  },
};

export default productService;
