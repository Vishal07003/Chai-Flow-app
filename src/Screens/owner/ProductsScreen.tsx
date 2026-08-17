import React, { useState, useEffect } from 'react';
import {
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import Ionicons from 'react-native-vector-icons/Ionicons';

import {
  Header,
  FloatingButton,
  EmptyState,
  SearchBar,
} from '../../components/common';
import { CategoryChip, ProductCard } from '../../components/owner';

import { useApp } from '../../context/AppContext';

const CATEGORIES = [
  'All Items',
  'Masala Chai',
  'Green Tea',
  'Snacks',
  'Containers',
];

export default function ProductsScreen({ navigation, route }: any) {
  const { products, totalSKUs, lowStockCount, addProduct, deleteProduct } =
    useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('All Items');
  const [modalVisible, setModalVisible] = useState(false);

  useEffect(() => {
    if (route.params?.openAddModal) {
      navigation.navigate('ProductDetail', { mode: 'add' });
      navigation.setParams({ openAddModal: undefined });
    }
  }, [route.params?.openAddModal, navigation]);

  // Form State for Add Product
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [unit, setUnit] = useState('kg');
  const [description, setDescription] = useState('');
  const [stockNumber, setStockNumber] = useState('');

  const filteredProducts = products.filter(item => {
    const matchesSearch = item.name
      .toLowerCase()
      .includes(searchQuery.toLowerCase());
    if (activeCategory === 'All Items') return matchesSearch;
    return (
      matchesSearch &&
      (item.category === activeCategory || item.name.includes(activeCategory))
    );
  });

  const handleAddProduct = () => {
    if (!name || !price || !stockNumber) return;

    const num = parseInt(stockNumber, 10) || 0;
    const isLow = num <= 15;

    addProduct({
      name,
      price,
      unit: unit || 'kg',
      description: description || 'Fresh premium store inventory',
      stock: `${num} ${unit}`,
      stockNumber: num,
      maxStock: 200,
      isLowStock: isLow,
      category: activeCategory !== 'All Items' ? activeCategory : 'Masala Chai',
      imageUrl:
        'https://images.unsplash.com/photo-1576092768241-dec231879fc3?auto=format&fit=crop&w=600&q=80',
    });

    setName('');
    setPrice('');
    setStockNumber('');
    setDescription('');
    setModalVisible(false);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      {/* Fixed Top Header */}
      <Header title="Products" />

      <KeyboardAwareScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        enableOnAndroid={true}
      >
        {/* Top Summary Cards */}
        <View style={styles.topCardsRow}>
          {/* Card 1: Total SKUs */}
          <View style={styles.statCard}>
            <View style={styles.cardHeader}>
              <Ionicons name="cube-outline" size={18} color="#6E6259" />
              <Text style={styles.cardTitle}>Total SKUs</Text>
            </View>
            <Text style={styles.cardValue}>{totalSKUs}</Text>
            <Text style={styles.cardSubTextBlue}>📈 +3 THIS MONTH</Text>
          </View>

          {/* Card 2: Low Stock */}
          <View style={styles.statCard}>
            <View style={styles.cardHeader}>
              <Ionicons name="warning-outline" size={18} color="#D9381E" />
              <Text style={styles.cardTitle}>Low Stock</Text>
            </View>
            <Text style={[styles.cardValue, styles.lowStockValue]}>
              {lowStockCount} items
            </Text>
            <Text style={styles.cardSubTextRed}>⚠️ REORDER NEEDED</Text>
          </View>
        </View>

        {/* Search Bar */}
        <SearchBar value={searchQuery} onChangeText={setSearchQuery} />

        {/* Category Filters Horizontal Scroll */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.categoriesRow}
        >
          {CATEGORIES.map(cat => (
            <CategoryChip
              key={cat}
              label={cat}
              isActive={activeCategory === cat}
              onPress={() => setActiveCategory(cat)}
            />
          ))}
        </ScrollView>

        {/* Product Cards List */}
        {filteredProducts.length === 0 ? (
          <EmptyState
            icon="cube-outline"
            title="No Products Found"
            subtitle="No items match your search or selected category."
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

      {/* Modal: Add New Product */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <TouchableOpacity
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={Keyboard.dismiss}
          >
            <TouchableOpacity activeOpacity={1} style={styles.modalCard}>
              <ScrollView
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
              >
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Add New Product</Text>
                  <TouchableOpacity onPress={() => setModalVisible(false)}>
                    <Ionicons name="close" size={24} color="#6E6259" />
                  </TouchableOpacity>
                </View>

                <Text style={styles.label}>Product Name *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. Masala Chai Premix"
                  placeholderTextColor="#999"
                  value={name}
                  onChangeText={setName}
                />

                <View style={styles.rowInputs}>
                  <View style={{ flex: 1, marginRight: 8 }}>
                    <Text style={styles.label}>Price (₹) *</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="e.g. 280"
                      placeholderTextColor="#999"
                      keyboardType="numeric"
                      value={price}
                      onChangeText={setPrice}
                    />
                  </View>

                  <View style={{ flex: 1, marginLeft: 8 }}>
                    <Text style={styles.label}>Unit</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="e.g. kg / pc"
                      placeholderTextColor="#999"
                      value={unit}
                      onChangeText={setUnit}
                    />
                  </View>
                </View>

                <Text style={styles.label}>Stock Quantity *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. 150"
                  placeholderTextColor="#999"
                  keyboardType="numeric"
                  value={stockNumber}
                  onChangeText={setStockNumber}
                />

                <Text style={styles.label}>Description</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. Premium quality CTC tea leaves"
                  placeholderTextColor="#999"
                  value={description}
                  onChangeText={setDescription}
                />

                <TouchableOpacity
                  activeOpacity={0.85}
                  style={styles.submitBtn}
                  onPress={handleAddProduct}
                >
                  <Text style={styles.submitBtnText}>
                    Add Product to Catalog
                  </Text>
                </TouchableOpacity>
              </ScrollView>
            </TouchableOpacity>
          </TouchableOpacity>
        </KeyboardAvoidingView>
      </Modal>
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
    paddingTop: 8,
    paddingBottom: 16,
  },

  /* Top Stat Cards */
  topCardsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  statCard: {
    width: '48%',
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardTitle: {
    fontSize: 14,
    color: '#6E6259',
    marginLeft: 6,
    fontWeight: '500',
  },
  cardValue: {
    fontSize: 26,
    fontWeight: '700',
    color: '#2C201A',
    marginTop: 8,
  },
  lowStockValue: {
    color: '#8C331A',
  },
  cardSubTextBlue: {
    fontSize: 11,
    fontWeight: '700',
    color: '#3B82F6',
    marginTop: 6,
    letterSpacing: 0.4,
  },
  cardSubTextRed: {
    fontSize: 11,
    fontWeight: '700',
    color: '#D9381E',
    marginTop: 6,
    letterSpacing: 0.4,
  },

  categoriesRow: {
    marginVertical: 10,
    flexDirection: 'row',
  },

  /* Modal */
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2C201A',
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#554A42',
    marginTop: 10,
    marginBottom: 4,
  },
  rowInputs: {
    flexDirection: 'row',
  },
  input: {
    backgroundColor: '#FAF8F5',
    borderWidth: 1,
    borderColor: '#EFECE8',
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 44,
    fontSize: 14,
    color: '#2C201A',
  },

  submitBtn: {
    backgroundColor: '#8C331A',
    height: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 10,
  },
  submitBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
