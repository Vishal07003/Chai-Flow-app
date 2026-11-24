import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  Keyboard,
  ScrollView,
  BackHandler,
  Modal,
  ActivityIndicator,
  PermissionsAndroid,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { launchCamera, launchImageLibrary } from 'react-native-image-picker';
import { CustomDialog } from '../../components/common';
import { useApp, ProductItem } from '../../context/AppContext';
import { productService } from '../../services/product.service';
import { colors, typography, radius, spacing, shadows } from '../../theme';

export const EXACT_CATEGORIES = [
  'Snacks',
  'Tiffin',
  'Tea',
  'Coffee',
  'Packed Foods',
];

export const PRODUCT_UNITS = [
  'Pc',
  'Plate',
  'Pack',
  'Cup',
  'Glass',
  'Box',
  'Meal',
  'Kg',
  'Gram',
  'Litre',
  'Ml',
  'Dozen',
];

export default function ProductDetailScreen({ route, navigation }: any) {
  const { addProduct, updateProduct, deleteProduct, refreshBackendData } = useApp();

  const isAddMode = route?.params?.mode === 'add';
  const initialProduct: ProductItem = route?.params?.product || {
    id: '',
    name: '',
    price: '',
    unit: 'Pc',
    description: '',
    category: 'Tea',
    imageUrl: '',
  };

  const [name, setName] = useState(initialProduct.name);
  const [price, setPrice] = useState(
    initialProduct.price ? String(initialProduct.price).replace(/[^0-9.]/g, '') : '',
  );
  const [unit, setUnit] = useState(initialProduct.unit || 'Pc');
  const [description, setDescription] = useState(initialProduct.description || '');
  const [category, setCategory] = useState(
    initialProduct.category || 'Tea',
  );

  // Category Dropdown Modal state
  const [categoryDropdownOpen, setCategoryDropdownOpen] = useState(false);
  // Unit Dropdown Modal state
  const [unitDropdownOpen, setUnitDropdownOpen] = useState(false);

  // Image states: imageUrl is the final/backend URL; pendingLocalUri is a newly selected image from camera/gallery
  const [imageUrl, setImageUrl] = useState(initialProduct.imageUrl || '');
  const [pendingLocalUri, setPendingLocalUri] = useState<string | null>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);

  const [showToast, setShowToast] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Scroll ref for keyboard-aware scrolling
  const scrollRef = useRef<any>(null);

  // Unsaved changes check
  const initialPriceClean = initialProduct.price
    ? String(initialProduct.price).replace(/[^0-9.]/g, '')
    : '';
  const initialUnit = initialProduct.unit || 'Pc';
  const initialCategory = initialProduct.category || 'Tea';
  const initialDesc = initialProduct.description || '';
  const initialImg = initialProduct.imageUrl || '';

  const hasUnsavedChanges = useCallback(() => {
    return (
      name !== initialProduct.name ||
      price !== initialPriceClean ||
      unit !== initialUnit ||
      category !== initialCategory ||
      description !== initialDesc ||
      imageUrl !== initialImg ||
      pendingLocalUri !== null
    );
  }, [
    name,
    price,
    unit,
    category,
    description,
    imageUrl,
    pendingLocalUri,
    initialProduct.name,
    initialPriceClean,
    initialUnit,
    initialCategory,
    initialDesc,
    initialImg,
  ]);

  // Handle back navigation safely
  const handleBackPress = useCallback(() => {
    if (hasUnsavedChanges()) {
      setDialogConfig({
        visible: true,
        title: 'Discard Changes?',
        message: 'You have unsaved changes. Are you sure you want to discard them and go back?',
        type: 'warning',
        buttons: [
          { text: 'Keep Editing', style: 'cancel', onPress: closeDialog },
          {
            text: 'Discard',
            style: 'destructive',
            onPress: () => {
              closeDialog();
              navigation.goBack();
            },
          },
        ],
      });
      return true; // handled
    }
    navigation.goBack();
    return true; // handled
  }, [hasUnsavedChanges, navigation]);

  // Android hardware back handler
  useEffect(() => {
    const backHandler = BackHandler.addEventListener(
      'hardwareBackPress',
      handleBackPress,
    );
    return () => backHandler.remove();
  }, [handleBackPress]);

  // Custom Dialog State
  const [dialogConfig, setDialogConfig] = useState<{
    visible: boolean;
    title: string;
    message?: string;
    type?: 'confirm' | 'danger' | 'info' | 'warning' | 'success';
    buttons?: Array<{
      text: string;
      style?: 'default' | 'cancel' | 'destructive';
      onPress?: () => void;
    }>;
  }>({
    visible: false,
    title: '',
  });

  const closeDialog = () => setDialogConfig(prev => ({ ...prev, visible: false }));

  // Image Selection: Gallery
  const handleChooseFromGallery = async () => {
    try {
      const result = await launchImageLibrary({
        mediaType: 'photo',
        quality: 0.8,
        selectionLimit: 1,
      });

      if (!result.didCancel && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        if (asset.uri) {
          setPendingLocalUri(asset.uri);
        }
      }
    } catch (err: any) {
      setDialogConfig({
        visible: true,
        title: 'Gallery Error',
        message: err?.message || 'Could not access device gallery.',
        type: 'danger',
        buttons: [{ text: 'OK', onPress: closeDialog }],
      });
    }
  };

  // Image Selection: Camera with on-demand permission
  const handleCaptureFromCamera = async () => {
    try {
      if (Platform.OS === 'android') {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.CAMERA,
          {
            title: 'Camera Permission',
            message: 'Chai Flow requires camera access to take product photos.',
            buttonNeutral: 'Ask Later',
            buttonNegative: 'Cancel',
            buttonPositive: 'OK',
          },
        );
        if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
          setDialogConfig({
            visible: true,
            title: 'Permission Denied',
            message: 'Camera permission is required to capture product photos.',
            type: 'warning',
            buttons: [{ text: 'OK', onPress: closeDialog }],
          });
          return;
        }
      }

      const result = await launchCamera({
        mediaType: 'photo',
        quality: 0.8,
        saveToPhotos: false,
      });

      if (!result.didCancel && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        if (asset.uri) {
          setPendingLocalUri(asset.uri);
        }
      }
    } catch (err: any) {
      setDialogConfig({
        visible: true,
        title: 'Camera Error',
        message: err?.message || 'Could not open camera.',
        type: 'danger',
        buttons: [{ text: 'OK', onPress: closeDialog }],
      });
    }
  };

  // Remove Image
  const handleRemoveImage = () => {
    setPendingLocalUri(null);
    setImageUrl('');
  };

  const handleSaveProduct = async () => {
    Keyboard.dismiss();
    const cleanName = name.trim();
    const cleanPrice = price.trim();

    if (!cleanName) {
      setDialogConfig({
        visible: true,
        title: 'Validation Error',
        message: 'Product Name is required.',
        type: 'danger',
        buttons: [{ text: 'OK', onPress: closeDialog }],
      });
      return;
    }

    if (!cleanPrice || isNaN(Number(cleanPrice)) || Number(cleanPrice) <= 0) {
      setDialogConfig({
        visible: true,
        title: 'Validation Error',
        message: 'Please enter a valid price greater than 0.',
        type: 'danger',
        buttons: [{ text: 'OK', onPress: closeDialog }],
      });
      return;
    }

    if (!category) {
      setDialogConfig({
        visible: true,
        title: 'Validation Error',
        message: 'Please select a product category.',
        type: 'danger',
        buttons: [{ text: 'OK', onPress: closeDialog }],
      });
      return;
    }

    setIsSubmitting(true);
    let finalImageUrl = imageUrl;

    // If there is a pending local image file, upload it to the Django backend first
    if (pendingLocalUri) {
      setIsUploadingImage(true);
      try {
        const uploadedUrl = await productService.uploadProductImage(pendingLocalUri);
        finalImageUrl = uploadedUrl;
        setImageUrl(uploadedUrl);
        setPendingLocalUri(null);
      } catch (uploadErr: any) {
        setIsUploadingImage(false);
        setIsSubmitting(false);
        setDialogConfig({
          visible: true,
          title: 'Image Upload Failed',
          message: uploadErr?.message || 'Failed to upload product image to backend storage.',
          type: 'danger',
          buttons: [{ text: 'OK', onPress: closeDialog }],
        });
        return;
      }
      setIsUploadingImage(false);
    }

    try {
      if (isAddMode) {
        await addProduct({
          name: cleanName,
          price: cleanPrice,
          unit: unit || 'Pc',
          description: description.trim(),
          category: category,
          imageUrl: finalImageUrl.trim() || undefined,
        });
      } else {
        if (initialProduct.id) {
          await updateProduct(initialProduct.id, {
            name: cleanName,
            price: cleanPrice,
            unit: unit || 'Pc',
            description: description.trim(),
            category: category,
            imageUrl: finalImageUrl.trim() || undefined,
          });
        }
      }

      await refreshBackendData();
      setShowToast(true);
      setTimeout(() => {
        setShowToast(false);
        navigation.goBack();
      }, 1000);
    } catch (err: any) {
      setDialogConfig({
        visible: true,
        title: 'Save Failed',
        message: err?.message || 'Could not save product. Please try again.',
        type: 'danger',
        buttons: [{ text: 'OK', onPress: closeDialog }],
      });
    } finally {
      setIsSubmitting(false);
      setIsUploadingImage(false);
    }
  };

  const handleDeleteProduct = () => {
    setDialogConfig({
      visible: true,
      title: 'Delete Product',
      message: `Are you sure you want to delete "${name || initialProduct.name}"? Past orders and invoices will preserve their historical price records.`,
      type: 'danger',
      buttons: [
        { text: 'Cancel', style: 'cancel', onPress: closeDialog },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            closeDialog();
            if (initialProduct.id) {
              try {
                await deleteProduct(initialProduct.id);
                await refreshBackendData();
                navigation.goBack();
              } catch (err: any) {
                setDialogConfig({
                  visible: true,
                  title: 'Delete Failed',
                  message: err?.message || 'Failed to delete product.',
                  type: 'danger',
                  buttons: [{ text: 'OK', onPress: closeDialog }],
                });
              }
            }
          },
        },
      ],
    });
  };

  // Preview target is pending local URI if chosen, else existing backend imageUrl
  const activePreviewUri = pendingLocalUri || imageUrl;

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      {/* Simple Form-Specific Header */}
      <View style={styles.formHeader}>
        <TouchableOpacity
          activeOpacity={0.7}
          style={styles.backBtn}
          onPress={handleBackPress}
          accessibilityLabel="Go back"
        >
          <Ionicons name="arrow-back" size={22} color="#8C331A" />
        </TouchableOpacity>

        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>
            {isAddMode ? 'Add Product' : 'Edit Product'}
          </Text>
          <Text style={styles.headerSubtitle}>Manage product information</Text>
        </View>
      </View>

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
        ref={scrollRef}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        enableOnAndroid={true}
        enableAutomaticScroll={true}
        extraScrollHeight={Platform.OS === 'android' ? 140 : 100}
        extraHeight={Platform.OS === 'android' ? 140 : 100}
        keyboardOpeningTime={0}
        keyboardShouldPersistTaps="handled"
      >
        {/* Product Image Section */}
        <Text style={styles.label}>Product Image</Text>

        <View style={styles.imageCardContainer}>
          {activePreviewUri ? (
            <View style={styles.previewBox}>
              <Image
                source={{ uri: activePreviewUri }}
                style={styles.previewImage}
                resizeMode="cover"
              />

              {/* Status Badge */}
              <View style={styles.imageStatusBadge}>
                <Ionicons
                  name={pendingLocalUri ? 'cloud-upload-outline' : 'checkmark-circle'}
                  size={12}
                  color="#FFFFFF"
                />
                <Text style={styles.imageStatusText}>
                  {pendingLocalUri ? 'Ready to upload' : 'Saved'}
                </Text>
              </View>

              {/* Delete / Clear Action */}
              <TouchableOpacity
                style={styles.clearImageBtn}
                onPress={handleRemoveImage}
                activeOpacity={0.8}
                accessibilityLabel="Remove image"
              >
                <Ionicons name="trash" size={16} color="#DC2626" />
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.emptyImageBox}>
              <Ionicons name="image-outline" size={28} color="#C4BCB5" />
              <Text style={styles.emptyImageText}>No product image selected</Text>
              <Text style={styles.emptyImageSub}>Upload from gallery or take a live photo</Text>
            </View>
          )}

          {/* Action Buttons: Choose from Gallery & Open Camera */}
          <View style={styles.imageActionButtonsRow}>
            <TouchableOpacity
              style={styles.imageBtn}
              onPress={handleChooseFromGallery}
              activeOpacity={0.8}
            >
              <Ionicons name="images-outline" size={15} color="#8C331A" style={{ marginRight: 5 }} />
              <Text style={styles.imageBtnText}>
                {activePreviewUri ? 'Replace from Gallery' : 'Choose from Gallery'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.imageBtn, styles.cameraBtn]}
              onPress={handleCaptureFromCamera}
              activeOpacity={0.8}
            >
              <Ionicons name="camera-outline" size={15} color="#8C331A" style={{ marginRight: 5 }} />
              <Text style={styles.imageBtnText}>Open Camera</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* 1. Product Name */}
        <Text style={styles.label}>Product Name *</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. Masala Dosa, Samosa, Ginger Tea..."
          placeholderTextColor="#A3968C"
          value={name}
          onChangeText={setName}
        />

        {/* 2. Price & Unit Row */}
        <View style={styles.rowInputs}>
          <View style={{ flex: 1, marginRight: 8 }}>
            <Text style={styles.label}>Price (₹) *</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. 25"
              placeholderTextColor="#A3968C"
              keyboardType="numeric"
              value={price}
              onChangeText={setPrice}
            />
          </View>

          <View style={{ flex: 1, marginLeft: 8 }}>
            <Text style={styles.label}>Unit *</Text>
            <TouchableOpacity
              style={styles.unitDropdownInput}
              onPress={() => setUnitDropdownOpen(true)}
              activeOpacity={0.8}
            >
              <Text style={styles.dropdownSelectedText} numberOfLines={1}>
                {unit || 'Select Unit'}
              </Text>
              <Ionicons name="chevron-down" size={17} color="#8E8278" />
            </TouchableOpacity>
          </View>
        </View>

        {/* 3. Category Dropdown Field */}
        <Text style={styles.label}>Category *</Text>
        <TouchableOpacity
          style={styles.dropdownInput}
          onPress={() => setCategoryDropdownOpen(true)}
          activeOpacity={0.8}
        >
          <View style={styles.dropdownLeft}>
            <Ionicons name="pricetag-outline" size={17} color="#8C331A" style={{ marginRight: 8 }} />
            <Text style={styles.dropdownSelectedText}>{category || 'Select Category'}</Text>
          </View>
          <Ionicons name="chevron-down" size={19} color="#8E8278" />
        </TouchableOpacity>

        {/* 4. Optional Description */}
        <Text style={styles.label}>Description (Optional)</Text>
        <TextInput
          style={[styles.input, styles.multilineInput]}
          placeholder="Short notes or ingredients (e.g. Served with coconut chutney)"
          placeholderTextColor="#A3968C"
          multiline={true}
          numberOfLines={3}
          textAlignVertical="top"
          value={description}
          onChangeText={setDescription}
        />

        {/* Save Product Action */}
        <TouchableOpacity
          activeOpacity={0.85}
          style={[styles.saveBtn, isSubmitting && styles.saveBtnDisabled]}
          onPress={handleSaveProduct}
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <ActivityIndicator color="#FFFFFF" size="small" style={{ marginRight: 8 }} />
              <Text style={styles.saveBtnText}>
                {isUploadingImage ? 'Uploading Image...' : 'Saving Product...'}
              </Text>
            </View>
          ) : (
            <>
              <Ionicons name="checkmark-circle-outline" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
              <Text style={styles.saveBtnText}>
                {isAddMode ? 'Add Product' : 'Save Changes'}
              </Text>
            </>
          )}
        </TouchableOpacity>

        {/* Delete Action (Edit Mode only) */}
        {!isAddMode && (
          <TouchableOpacity
            activeOpacity={0.8}
            style={styles.deleteBtn}
            onPress={handleDeleteProduct}
          >
            <Ionicons name="trash-outline" size={17} color="#DC2626" style={{ marginRight: 6 }} />
            <Text style={styles.deleteBtnText}>Delete Product</Text>
          </TouchableOpacity>
        )}
      </KeyboardAwareScrollView>

      {/* Category Dropdown Selection Modal */}
      <Modal
        visible={categoryDropdownOpen}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setCategoryDropdownOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.dropdownModalCard}>
            <View style={styles.dropdownModalHeader}>
              <Text style={styles.dropdownModalTitle}>Select Category</Text>
              <TouchableOpacity
                onPress={() => setCategoryDropdownOpen(false)}
                style={styles.dropdownModalCloseBtn}
              >
                <Ionicons name="close" size={20} color="#554A42" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {EXACT_CATEGORIES.map(cat => {
                const isSelected = category.toLowerCase() === cat.toLowerCase();
                return (
                  <TouchableOpacity
                    key={cat}
                    style={[
                      styles.categoryOptionRow,
                      isSelected && styles.categoryOptionRowActive,
                    ]}
                    onPress={() => {
                      setCategory(cat);
                      setCategoryDropdownOpen(false);
                    }}
                    activeOpacity={0.7}
                  >
                    <View style={styles.catOptionLeft}>
                      <Ionicons
                        name={
                          cat === 'Tea' ? 'cafe-outline' :
                          cat === 'Coffee' ? 'cafe' :
                          cat === 'Snacks' ? 'fast-food-outline' :
                          cat === 'Tiffin' ? 'restaurant-outline' : 'cube-outline'
                        }
                        size={18}
                        color={isSelected ? '#8C331A' : '#6B5E55'}
                        style={{ marginRight: 10 }}
                      />
                      <Text
                        style={[
                          styles.categoryOptionText,
                          isSelected && styles.categoryOptionTextActive,
                        ]}
                      >
                        {cat}
                      </Text>
                    </View>

                    {isSelected && (
                      <Ionicons name="checkmark-circle" size={20} color="#8C331A" />
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Unit Dropdown Selection Modal */}
      <Modal
        visible={unitDropdownOpen}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setUnitDropdownOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.dropdownModalCard}>
            <View style={styles.dropdownModalHeader}>
              <Text style={styles.dropdownModalTitle}>Select Unit</Text>
              <TouchableOpacity
                onPress={() => setUnitDropdownOpen(false)}
                style={styles.dropdownModalCloseBtn}
              >
                <Ionicons name="close" size={20} color="#554A42" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {PRODUCT_UNITS.map(u => {
                const isSelected = unit.toLowerCase() === u.toLowerCase();
                return (
                  <TouchableOpacity
                    key={u}
                    style={[
                      styles.categoryOptionRow,
                      isSelected && styles.categoryOptionRowActive,
                    ]}
                    onPress={() => {
                      setUnit(u);
                      setUnitDropdownOpen(false);
                    }}
                    activeOpacity={0.7}
                  >
                    <View style={styles.catOptionLeft}>
                      <Ionicons
                        name="cube-outline"
                        size={18}
                        color={isSelected ? '#8C331A' : '#6B5E55'}
                        style={{ marginRight: 10 }}
                      />
                      <Text
                        style={[
                          styles.categoryOptionText,
                          isSelected && styles.categoryOptionTextActive,
                        ]}
                      >
                        {u}
                      </Text>
                    </View>

                    {isSelected && (
                      <Ionicons name="checkmark-circle" size={20} color="#8C331A" />
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>

      <CustomDialog
        visible={dialogConfig.visible}
        title={dialogConfig.title}
        message={dialogConfig.message}
        type={dialogConfig.type}
        buttons={dialogConfig.buttons}
        onClose={closeDialog}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAF8F5',
  },
  formHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FAF8F5',
    borderBottomWidth: 1,
    borderBottomColor: '#EFEAE4',
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F7EFE9',
    borderWidth: 1,
    borderColor: '#EFE3D9',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  headerTitleContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#7A2E19',
    letterSpacing: -0.3,
  },
  headerSubtitle: {
    fontSize: 12,
    fontWeight: '500',
    color: '#8E8278',
    marginTop: 1,
  },
  toast: {
    position: 'absolute',
    top: 50,
    left: 20,
    right: 20,
    backgroundColor: '#10B981',
    borderRadius: 12,
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
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: Platform.OS === 'android' ? 60 : 40,
  },
  imageCardContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E8E1D9',
    padding: 10,
    marginBottom: 10,
  },
  previewBox: {
    width: '100%',
    height: 96,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#EFECE8',
    marginBottom: 8,
    position: 'relative',
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
  imageStatusBadge: {
    position: 'absolute',
    bottom: 6,
    left: 6,
    backgroundColor: 'rgba(44, 32, 26, 0.75)',
    borderRadius: 10,
    paddingHorizontal: 7,
    paddingVertical: 2,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  imageStatusText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  clearImageBtn: {
    position: 'absolute',
    top: 6,
    right: 6,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    width: 28,
    height: 28,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
  },
  emptyImageBox: {
    height: 92,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: '#E8E1D9',
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
    backgroundColor: '#FAF8F5',
  },
  emptyImageText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#6B5E55',
    marginTop: 4,
  },
  emptyImageSub: {
    fontSize: 10,
    color: '#A0958D',
    marginTop: 1,
  },
  imageActionButtonsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  imageBtn: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FAF8F5',
    borderWidth: 1,
    borderColor: '#E8E1D9',
    borderRadius: 8,
    height: 32,
  },
  cameraBtn: {
    backgroundColor: '#FEF9F6',
    borderColor: '#EFE3D9',
  },
  imageBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#8C331A',
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    color: '#2C201A',
    marginBottom: 6,
    marginTop: 6,
  },
  subPillLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#8E8278',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  rowInputs: {
    flexDirection: 'row',
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E8E1D9',
    paddingHorizontal: 14,
    height: 46,
    fontSize: 14,
    color: '#2C201A',
    marginBottom: 10,
  },
  dropdownInput: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E8E1D9',
    paddingHorizontal: 14,
    height: 46,
    marginBottom: 12,
  },
  unitDropdownInput: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E8E1D9',
    paddingHorizontal: 14,
    height: 46,
    marginBottom: 10,
  },
  dropdownLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dropdownSelectedText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2C201A',
  },
  multilineInput: {
    height: 80,
    paddingTop: 10,
    paddingBottom: 10,
  },
  pillsScroll: {
    marginBottom: 12,
  },
  unitPill: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E8E1D9',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 5,
    marginRight: 8,
  },
  unitPillActive: {
    backgroundColor: '#8C331A',
    borderColor: '#8C331A',
  },
  unitPillText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#554A42',
  },
  unitPillTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  saveBtn: {
    backgroundColor: '#8C331A',
    borderRadius: 12,
    height: 48,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 10,
    elevation: 2,
    shadowColor: '#8C331A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
  },
  saveBtnDisabled: {
    backgroundColor: '#B5AAA2',
  },
  saveBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  deleteBtn: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FCA5A5',
    borderRadius: 12,
    height: 46,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  deleteBtnText: {
    color: '#DC2626',
    fontSize: 14,
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'center',
    padding: 24,
  },
  dropdownModalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    maxHeight: '60%',
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
  },
  dropdownModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#EFEAE4',
    paddingBottom: 8,
  },
  dropdownModalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#2A2421',
  },
  dropdownModalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FAF8F5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  categoryOptionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 10,
    marginBottom: 4,
  },
  categoryOptionRowActive: {
    backgroundColor: '#FEF9F6',
  },
  catOptionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  categoryOptionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#554A42',
  },
  categoryOptionTextActive: {
    color: '#8C331A',
    fontWeight: '800',
  },
});
