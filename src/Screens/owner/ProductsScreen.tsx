import React, { useState, useEffect } from 'react';
import {
  ScrollView,
  StyleSheet,
  View,
  Text,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';

import {
  Header,
  FloatingButton,
  EmptyState,
  SearchBar,
} from '../../components/common';
import { CategoryChip, ProductCard } from '../../components/owner';

import { useApp } from '../../context/AppContext';

export const PRODUCT_CATEGORIES = [
  'All',
  'Snacks',
  'Tiffin',
  'Tea',
  'Coffee',
  'Packed Foods',
];

export default function ProductsScreen({ navigation, route }: any) {
  const { products, deleteProduct, refreshBackendData } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      refreshBackendData();
    });
    return unsubscribe;
  }, [navigation, refreshBackendData]);

  useEffect(() => {
    if (route.params?.openAddModal) {
      navigation.navigate('ProductDetail', { mode: 'add' });
      navigation.setParams({ openAddModal: undefined });
    }
  }, [route.params?.openAddModal, navigation]);

  const filteredProducts = products.filter(item => {
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch = !q || item.name.toLowerCase().includes(q) || (item.description && item.description.toLowerCase().includes(q));
    if (activeCategory === 'All') return matchesSearch;
    return (
      matchesSearch &&
      item.category?.toLowerCase() === activeCategory.toLowerCase()
    );
  });

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      {/* Fixed Top Header */}
      <Header title="Products" />

      {/* Sticky Search & Category Bar */}
      <View style={styles.stickySearchContainer}>
        <SearchBar
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Search products by name..."
          containerStyle={{ marginVertical: 0, marginBottom: 8 }}
        />

        {/* Category Filters Horizontal Scroll */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.categoriesRow}
          contentContainerStyle={{ paddingVertical: 2 }}
        >
          {PRODUCT_CATEGORIES.map(cat => (
            <CategoryChip
              key={cat}
              label={cat}
              isActive={activeCategory === cat}
              onPress={() => setActiveCategory(cat)}
            />
          ))}
        </ScrollView>
      </View>

      <KeyboardAwareScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        enableOnAndroid={true}
      >
        {/* Compact Product Cards List */}
        {filteredProducts.length === 0 ? (
          <EmptyState
            icon="fast-food-outline"
            title="No Products Found"
            subtitle={searchQuery ? 'No items match your search.' : `No products found under ${activeCategory}. Tap + to add a product.`}
          />
        ) : (
          filteredProducts.map(product => (
            <ProductCard
              key={product.id}
              product={product}
              onEdit={p =>
                navigation.navigate('ProductDetail', {
                  product: p,
                  mode: 'edit',
                })
              }
              onDelete={p => deleteProduct(p.id)}
            />
          ))
        )}
      </KeyboardAwareScrollView>

      {/* Floating Action Button - Opens Add Product Screen */}
      <FloatingButton
        onPress={() => navigation.navigate('ProductDetail', { mode: 'add' })}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAF8F5',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 90,
  },
  stickySearchContainer: {
    backgroundColor: '#FAF8F5',
    paddingHorizontal: 16,
    paddingTop: 6,
    paddingBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#EFECE8',
    zIndex: 10,
  },
  categoriesRow: {
    marginVertical: 4,
    flexDirection: 'row',
  },
});
