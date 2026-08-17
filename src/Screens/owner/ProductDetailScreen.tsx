import React, { useState } from 'react';
import {
  Alert,
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  Keyboard,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import Ionicons from 'react-native-vector-icons/Ionicons';
import Header from '../../components/common/Header';
import { useApp, ProductItem } from '../../context/AppContext';

export default function ProductDetailScreen({ route, navigation }: any) {
  const { addProduct, updateProductStock, deleteProduct } = useApp();

  // Route parameters: product or mode 'add'
  const isAddMode = route?.params?.mode === 'add';
  const initialProduct: ProductItem = route?.params?.product || {
    id: '',
    name: '',
    price: '',
    unit: 'kg',
    description: '',
    stock: '100 kg',
    stockNumber: 100,
    maxStock: 200,
    category: 'Masala Chai',
    imageUrl:
      'https://images.unsplash.com/photo-1576092768241-dec231879fc3?auto=format&fit=crop&w=600&q=80',
  };

  const [name, setName] = useState(initialProduct.name);
  const [price, setPrice] = useState(initialProduct.price);
  const [unit, setUnit] = useState(initialProduct.unit || 'kg');
  const [stockNumber, setStockNumber] = useState(
    initialProduct.stockNumber.toString(),
  );
  const [description, setDescription] = useState(initialProduct.description);
  const [category, setCategory] = useState(
    initialProduct.category || 'Masala Chai',
  );
  const [imageUrl] = useState(initialProduct.imageUrl || '');
  const [showToast, setShowToast] = useState(false);

  const handleSaveProduct = () => {
    Keyboard.dismiss();
    const num = parseInt(stockNumber, 10) || 0;
    const isLow = num <= 15;

    if (isAddMode) {
      addProduct({
        name: name || 'New Tea Item',
        price: price || '250',
        unit: unit || 'kg',
        description: description || 'Premium store item',
        stock: `${num} ${unit || 'kg'}`,
        stockNumber: num,
        maxStock: 200,
        isLowStock: isLow,
        category: category,
        imageUrl:
          imageUrl ||
          'https://images.unsplash.com/photo-1576092768241-dec231879fc3?auto=format&fit=crop&w=600&q=80',
      });
    } else {
      // Update existing
      if (initialProduct.id) {
        updateProductStock(initialProduct.id, num);
      }
    }

    setShowToast(true);
    setTimeout(() => {
      setShowToast(false);
      navigation.goBack();
    }, 1200);
  };

  const handleDeleteProduct = () => {
    Alert.alert(
      'Delete Product',
      `Are you sure you want to delete "${name || initialProduct.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            if (initialProduct.id) {
              await deleteProduct(initialProduct.id);
              navigation.goBack();
            }
          },
        },
      ],
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <Header
        title={isAddMode ? 'Add Product' : 'Product Details'}
        showBack={true}
      />

      {/* Success Toast */}
      {showToast && (
        <View style={styles.toast}>
          <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />
          <Text style={styles.toastText}>
            Product {isAddMode ? 'added' : 'updated'} successfully!
          </Text>
        </View>
      )}

      <KeyboardAwareScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Top Product Hero Image Banner */}
        <View style={styles.heroImageCard}>
          {imageUrl ? (
            <Image
              source={{ uri: imageUrl }}
              style={styles.heroImg}
              resizeMode="cover"
            />
          ) : (
            <View style={styles.placeholderImgBox}>
              <Ionicons name="cube-outline" size={48} color="#A09489" />
              <Text style={styles.placeholderText}>Product Preview</Text>
            </View>
          )}
        </View>

        {/* Product Details Form */}
        <Text style={styles.label}>Product Name</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. Masala Chai Special Premix"
          placeholderTextColor="#B5AAA2"
          value={name}
          onChangeText={setName}
        />

        <View style={styles.rowInputs}>
          <View style={{ flex: 1, marginRight: 8 }}>
            <Text style={styles.label}>Price (₹)</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. 280"
              placeholderTextColor="#B5AAA2"
              keyboardType="numeric"
              value={price}
              onChangeText={setPrice}
            />
          </View>

          <View style={{ flex: 1, marginLeft: 8 }}>
            <Text style={styles.label}>Unit</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. kg / packet"
              placeholderTextColor="#B5AAA2"
              value={unit}
              onChangeText={setUnit}
            />
          </View>
        </View>

        <View style={styles.rowInputs}>
          <View style={{ flex: 1, marginRight: 8 }}>
            <Text style={styles.label}>Current Stock</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. 150"
              placeholderTextColor="#B5AAA2"
              keyboardType="numeric"
              value={stockNumber}
              onChangeText={setStockNumber}
            />
          </View>

          <View style={{ flex: 1, marginLeft: 8 }}>
            <Text style={styles.label}>Category</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Masala Chai"
              placeholderTextColor="#B5AAA2"
              value={category}
              onChangeText={setCategory}
            />
          </View>
        </View>

        <Text style={styles.label}>Description</Text>
        <TextInput
          style={[styles.input, styles.multilineInput]}
          placeholder="e.g. Blend of Assam tea, cardamom, cloves & ginger"
          placeholderTextColor="#B5AAA2"
          multiline={true}
          numberOfLines={3}
          textAlignVertical="top"
          value={description}
          onChangeText={setDescription}
        />

        {/* Save Product Button */}
        <TouchableOpacity
          activeOpacity={0.8}
          style={styles.saveBtn}
          onPress={handleSaveProduct}
        >
          <Ionicons
            name={isAddMode ? 'add-circle-outline' : 'checkmark-done-outline'}
            size={20}
            color="#FFFFFF"
            style={{ marginRight: 8 }}
          />
          <Text style={styles.saveBtnText}>
            {isAddMode ? 'Add Product to Catalog' : 'Save Changes'}
          </Text>
        </TouchableOpacity>

        {/* Delete Product Button (when editing existing product) */}
        {!isAddMode && (
          <TouchableOpacity
            activeOpacity={0.8}
            style={styles.deleteBtn}
            onPress={handleDeleteProduct}
          >
            <Ionicons
              name="trash-outline"
              size={20}
              color="#DC2626"
              style={{ marginRight: 8 }}
            />
            <Text style={styles.deleteBtnText}>Delete Product</Text>
          </TouchableOpacity>
        )}
      </KeyboardAwareScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAF8F5',
  },
  toast: {
    position: 'absolute',
    top: 50,
    left: 20,
    right: 20,
    backgroundColor: '#10B981',
    borderRadius: 14,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 999,
    elevation: 6,
  },
  toastText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
    marginLeft: 10,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 40,
  },

  /* Hero Image Banner */
  heroImageCard: {
    width: '100%',
    height: 200,
    borderRadius: 22,
    backgroundColor: '#EFECE8',
    overflow: 'hidden',
    marginBottom: 20,
    position: 'relative',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
  },
  heroImg: {
    width: '100%',
    height: '100%',
  },
  placeholderImgBox: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    marginTop: 8,
    fontSize: 13,
    fontWeight: '600',
    color: '#7A6E65',
  },

  /* Form Styles */
  label: {
    fontSize: 14,
    fontWeight: '700',
    color: '#2C201A',
    marginBottom: 6,
    marginTop: 4,
  },
  rowInputs: {
    flexDirection: 'row',
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#EFECE9',
    paddingHorizontal: 18,
    height: 52,
    fontSize: 15,
    color: '#2C201A',
    marginBottom: 16,
  },
  multilineInput: {
    height: 96,
    paddingTop: 14,
    paddingBottom: 14,
  },
  saveBtn: {
    backgroundColor: '#8C331A',
    borderRadius: 26,
    height: 54,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 12,
    marginBottom: 12,
    elevation: 3,
    shadowColor: '#8C331A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
  },
  saveBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  deleteBtn: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FCA5A5',
    borderRadius: 26,
    height: 54,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  deleteBtnText: {
    color: '#DC2626',
    fontSize: 16,
    fontWeight: '700',
  },
});

