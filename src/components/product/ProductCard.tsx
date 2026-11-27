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
  onQuickPriceEdit?: (product: Product) => void;
  onToggleStatus?: (product: Product) => void;
  onDelete?: (product: Product) => void;
};

export default function ProductCard({
  product,
  onEdit,
  onQuickPriceEdit,
  onToggleStatus,
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
    is_available = true,
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
      style={[styles.card, !is_available && styles.cardInactive]}
      onPress={() => onEdit?.(product)}
    >
      <View style={styles.infoCol}>
        <View style={styles.headerLine}>
          <Text style={[styles.nameText, !is_available && styles.textInactive]} numberOfLines={1}>
            {name}
          </Text>
          <TouchableOpacity
            activeOpacity={0.7}
            style={[styles.statusBadge, is_available ? styles.statusBadgeActive : styles.statusBadgeInactive]}
            onPress={(e) => {
              e.stopPropagation();
              onToggleStatus?.(product);
            }}
          >
            <Text style={[styles.statusBadgeText, is_available ? styles.statusTextActive : styles.statusTextInactive]}>
              {is_available ? 'Active' : 'Inactive'}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.priceLine}>
          <Text style={[styles.priceText, !is_available && styles.textInactive]}>
            {cleanPrice}
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
          <Ionicons name="power-outline" size={17} color={is_available ? '#DC2626' : '#059669'} />
        </TouchableOpacity>
      </View>

      <ConfirmDialog
        visible={showDeleteConfirm}
        title="Delete / Deactivate Product"
        description={`Are you sure you want to remove "${name}"? If it has been used in previous orders or invoices, it will be safely deactivated without deleting historical records.`}
        type="danger"
        confirmLabel="Remove Product"
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
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#EFEAE4',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  cardInactive: {
    backgroundColor: '#F7F5F2',
    opacity: 0.85,
  },
  textInactive: {
    color: '#8E8278',
  },
  statusBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  statusBadgeActive: {
    backgroundColor: '#ECFDF5',
  },
  statusBadgeInactive: {
    backgroundColor: '#FEF2F2',
  },
  statusBadgeText: {
    fontSize: 9,
    fontWeight: '700',
  },
  statusTextActive: {
    color: '#059669',
  },
  statusTextInactive: {
    color: '#DC2626',
  },
  priceTouchWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
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
