import React, { useState } from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useApp, ProductItem } from '../../context/AppContext';
import ConfirmDialog from '../ConfirmDialog';
import { colors, typography, radius, spacing, shadows } from '../../theme';

export type Product = ProductItem;

type ProductCardProps = {
  product: Product;
  onEdit?: (product: Product) => void;
  onDelete?: (product: Product) => void;
};

export default function ProductCard({
  product,
  onEdit,
  onDelete,
}: ProductCardProps) {
  const { deleteProduct } = useApp();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const {
    id,
    name,
    price,
    unit = 'Pc',
    category = 'Tea',
    imageUrl,
  } = product;

  const cleanPrice = price.startsWith('₹') ? price : `₹${price}`;

  const handleConfirmDelete = (e: any) => {
    e?.stopPropagation?.();
    setShowDeleteConfirm(true);
  };

  const handleExecuteDelete = () => {
    setShowDeleteConfirm(false);
    if (onDelete) {
      onDelete(product);
    } else {
      deleteProduct(id);
    }
  };

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      style={styles.card}
      onPress={() => onEdit?.(product)}
    >
      <View style={styles.imageBox}>
        {imageUrl ? (
          <Image source={{ uri: imageUrl }} style={styles.image} resizeMode="cover" />
        ) : (
          <View style={styles.placeholderBox}>
            <Ionicons name="fast-food-outline" size={20} color="#8C331A" />
          </View>
        )}
      </View>

      <View style={styles.infoCol}>
        <View style={styles.headerLine}>
          <Text style={styles.nameText} numberOfLines={1}>
            {name}
          </Text>
          <View style={styles.categoryBadge}>
            <Text style={styles.categoryBadgeText}>{category}</Text>
          </View>
        </View>

        <View style={styles.priceLine}>
          <Text style={styles.priceText}>
            {cleanPrice}
            <Text style={styles.unitText}> / {unit}</Text>
          </Text>
        </View>
      </View>

      <View style={styles.actionsCol}>
        <TouchableOpacity
          activeOpacity={0.7}
          style={styles.editBtn}
          onPress={() => onEdit?.(product)}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="create-outline" size={17} color="#6B5E55" />
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.7}
          style={styles.deleteBtn}
          onPress={handleConfirmDelete}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="trash-outline" size={17} color="#DC2626" />
        </TouchableOpacity>
      </View>

      <ConfirmDialog
        visible={showDeleteConfirm}
        title="Delete Product"
        description={`Are you sure you want to delete "${name}"? Existing invoices and past orders will preserve historical price records.`}
        type="danger"
        confirmLabel="Delete Product"
        cancelLabel="Cancel"
        onConfirm={handleExecuteDelete}
        onCancel={() => setShowDeleteConfirm(false)}
      />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#EFEAE4',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  imageBox: {
    width: 46,
    height: 46,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#FAF8F5',
    marginRight: 12,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  placeholderBox: {
    width: '100%',
    height: '100%',
    backgroundColor: '#F5ECE6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoCol: {
    flex: 1,
    justifyContent: 'center',
  },
  headerLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  nameText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#2A2421',
    flexShrink: 1,
  },
  categoryBadge: {
    backgroundColor: '#F7EBE4',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  categoryBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#8C331A',
  },
  priceLine: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  priceText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#8C331A',
  },
  unitText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#8E8278',
  },
  actionsCol: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginLeft: 8,
  },
  editBtn: {
    padding: 6,
    borderRadius: 6,
    backgroundColor: '#FAF8F5',
  },
  deleteBtn: {
    padding: 6,
    borderRadius: 6,
    backgroundColor: '#FEF2F2',
  },
});
