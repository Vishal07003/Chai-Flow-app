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
  unit?: string;
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
   * Upload product image to backend storage and retrieve permanent URL
   */
  async uploadProductImage(fileUri: string, fileName?: string): Promise<string> {
    const formData = new FormData();
    const cleanFileName = fileName || `product_${Date.now()}.jpg`;
    
    // Determine mime type
    let mimeType = 'image/jpeg';
    if (cleanFileName.toLowerCase().endsWith('.png')) mimeType = 'image/png';
    else if (cleanFileName.toLowerCase().endsWith('.webp')) mimeType = 'image/webp';

    formData.append('image', {
      uri: fileUri,
      name: cleanFileName,
      type: mimeType,
    } as any);

    const res = await apiClient.post<{ success: boolean; image_url: string; filename: string }>(
      '/products/upload-image/',
      formData,
    );

    if (res && res.image_url) {
      return res.image_url;
    }
    throw new Error('Image upload failed: backend returned empty URL');
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
    category?: number | null;
    price: string | number;
    unit?: string;
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
      category: number | null;
      price: string | number;
      unit: string;
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
            unit: bp.unit || 'Pc',
            description: bp.description || '',
            category: bp.category_name || 'Tea',
            categoryId: bp.category,
            imageUrl: bp.image_url || '',
            is_available: bp.is_available,
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
        ? parseFloat(product.price.replace(/[^0-9.]/g, '')) || 0
        : Number(product.price) || 0;

    try {
      // Find category id if category name passed
      let categoryId = product.categoryId || null;
      if (!categoryId && product.category) {
        try {
          const cats = await this.getCategories();
          const matched = cats.find(c => c.name.toLowerCase() === product.category.toLowerCase());
          if (matched) categoryId = matched.id;
        } catch {}
      }

      const res = await this.createProduct({
        name: product.name,
        category: categoryId,
        price: rawPrice,
        unit: product.unit || 'Pc',
        description: product.description || '',
        image_url: product.imageUrl || '',
        is_available: true,
      });

      return {
        ...product,
        id: String(res.id),
        name: res.name,
        price: `₹${rawPrice}`,
        unit: res.unit || product.unit || 'Pc',
        category: res.category_name || product.category || 'Tea',
        categoryId: res.category,
        description: res.description || '',
        imageUrl: res.image_url || '',
      };
    } catch (e) {
      console.log('Backend createProduct error:', e);
      throw e;
    }
  },

  async updateProductItem(id: string, updates: any): Promise<any> {
    try {
      const payload: any = {};
      if (updates.name !== undefined) payload.name = updates.name;
      if (updates.description !== undefined) payload.description = updates.description;
      if (updates.imageUrl !== undefined) payload.image_url = updates.imageUrl;
      if (updates.unit !== undefined) payload.unit = updates.unit;
      if (updates.price !== undefined) {
        payload.price =
          typeof updates.price === 'string'
            ? parseFloat(updates.price.replace(/[^0-9.]/g, '')) || 0
            : updates.price;
      }
      if (updates.category !== undefined) {
        let categoryId = updates.categoryId;
        if (!categoryId && updates.category) {
          try {
            const cats = await this.getCategories();
            const matched = cats.find(c => c.name.toLowerCase() === updates.category.toLowerCase());
            if (matched) categoryId = matched.id;
          } catch {}
        }
        if (categoryId !== undefined) {
          payload.category = categoryId;
        }
      }
      if (updates.is_available !== undefined) {
        payload.is_available = updates.is_available;
      }

      if (Object.keys(payload).length > 0) {
        const res = await this.updateProduct(id, payload);
        return {
          id: String(res.id),
          name: res.name,
          price: `₹${parseFloat(res.price) || 0}`,
          unit: res.unit || 'Pc',
          category: res.category_name || updates.category || 'Tea',
          categoryId: res.category,
          description: res.description || '',
          imageUrl: res.image_url || '',
          is_available: res.is_available,
        };
      }
    } catch (e) {
      console.log('Backend updateProduct error:', e);
      throw e;
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
