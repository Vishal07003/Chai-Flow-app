import React from 'react';
import { Alert, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useApp } from '../../context/AppContext';

export type Product = {
  id: string;
  name: string;
  price: string;
  unit: string;
  description: string;
  stock: string;
  stockNumber: number;
  maxStock?: number;
  imageUrl?: string;
  badge?: string;
  isLowStock?: boolean;
  isCompact?: boolean;
};

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

  const {
    id,
    name,
    price,
    unit,
    description,
    stock,
    stockNumber,
    maxStock = 200,
    imageUrl,
    badge,
    isLowStock,
    isCompact,
  } = product;

  const handleConfirmDelete = () => {
    Alert.alert(
      'Delete Product',
      `Are you sure you want to delete "${name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            if (onDelete) {
              onDelete(product);
            } else {
              deleteProduct(id);
            }
          },
        },
      ],
    );
  };

  if (isCompact) {
    return (
      <TouchableOpacity
        activeOpacity={0.85}
        style={styles.compactCard}
        onPress={() => onEdit?.(product)}
      >
        <View style={styles.compactIconBox}>
          {imageUrl ? (
            <Image source={{ uri: imageUrl }} style={styles.compactImg} />
          ) : (
            <Ionicons name="cube-outline" size={22} color="#8C331A" />
          )}
        </View>

        <View style={styles.compactInfo}>
          <View style={styles.titleRow}>
            <Text style={styles.compactTitle} numberOfLines={1}>
              {name}
            </Text>
            <Text style={styles.compactPrice}>
              ₹{price}
              <Text style={styles.unitText}>/{unit}</Text>
            </Text>
          </View>

          <Text style={styles.compactSub} numberOfLines={1}>
            {description}
          </Text>

          <View style={styles.stockBadgeRow}>
            <Ionicons
              name="cube-outline"
              size={12}
              color="#7A2E19"
              style={{ marginRight: 4 }}
            />
            <Text style={styles.stockBadgeText}>{stock} units in stock</Text>
          </View>
        </View>

        <View style={styles.actionButtonsRow}>
          <TouchableOpacity
            activeOpacity={0.7}
            style={[styles.actionIconButton, styles.deleteIconButton]}
            onPress={handleConfirmDelete}
          >
            <Ionicons name="trash-outline" size={16} color="#DC2626" />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  }

  const progressPercent = Math.min(
    100,
    Math.max(5, (stockNumber / maxStock) * 100),
  );

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      style={styles.heroCard}
      onPress={() => onEdit?.(product)}
    >
      <View style={styles.imageContainer}>
        {imageUrl ? (
          <Image
            source={{ uri: imageUrl }}
            style={styles.productImage}
            resizeMode="cover"
          />
        ) : (
          <View style={styles.fallbackImage}>
            <Ionicons name="image-outline" size={40} color="#A09489" />
          </View>
        )}

        {badge && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{badge}</Text>
          </View>
        )}

        <View style={styles.topRightActions}>
          <TouchableOpacity
            activeOpacity={0.8}
            style={[styles.cardHeaderBtn, styles.cardDeleteBtn]}
            onPress={handleConfirmDelete}
          >
            <Ionicons name="trash-outline" size={16} color="#DC2626" />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.heroDetails}>
        <View style={styles.titleRow}>
          <Text style={styles.heroTitle}>{name}</Text>
          <Text style={styles.heroPrice}>
            ₹{price}
            <Text style={styles.unitText}>/{unit}</Text>
          </Text>
        </View>

        <Text style={styles.heroDescription}>{description}</Text>

        <View style={styles.divider} />

        <View style={styles.stockHeaderRow}>
          <Text style={[styles.stockLabel, isLowStock && styles.lowStockLabel]}>
            {isLowStock ? 'LOW STOCK' : 'CURRENT STOCK'}
          </Text>

          <View style={styles.progressTrack}>
            <View
              style={[
                styles.progressBar,
                { width: `${progressPercent}%` },
                isLowStock && styles.lowStockBar,
              ]}
            />
          </View>
        </View>

        <Text style={styles.stockValue}>{stock}</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  compactCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
  },
  compactIconBox: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#EDF2FA',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    overflow: 'hidden',
  },
  compactImg: {
    width: '100%',
    height: '100%',
  },
  compactInfo: {
    flex: 1,
  },
  compactTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#2C201A',
    flex: 1,
  },
  compactPrice: {
    fontSize: 15,
    fontWeight: '700',
    color: '#8C331A',
  },
  compactSub: {
    fontSize: 13,
    color: '#7A6E65',
    marginTop: 2,
  },
  stockBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
  },
  stockBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#4A3B32',
  },
  actionButtonsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 6,
  },
  actionIconButton: {
    padding: 8,
    borderRadius: 10,
    backgroundColor: '#FAF8F5',
    marginLeft: 4,
  },
  deleteIconButton: {
    backgroundColor: '#FEE2E2',
  },
  heroCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    marginBottom: 16,
    overflow: 'hidden',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
  },
  imageContainer: {
    height: 180,
    width: '100%',
    position: 'relative',
    backgroundColor: '#F3EFEA',
  },
  productImage: {
    width: '100%',
    height: '100%',
  },
  fallbackImage: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badge: {
    position: 'absolute',
    top: 14,
    left: 14,
    backgroundColor: '#963819',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 12,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.6,
  },
  topRightActions: {
    position: 'absolute',
    top: 14,
    right: 14,
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardHeaderBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
  },
  cardDeleteBtn: {
    backgroundColor: '#FEF2F2',
  },
  heroDetails: {
    padding: 16,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
  },
  heroTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#2C201A',
  },
  heroPrice: {
    fontSize: 17,
    fontWeight: '700',
    color: '#8C331A',
  },
  unitText: {
    fontSize: 13,
    fontWeight: '400',
    color: '#6E6259',
  },
  heroDescription: {
    fontSize: 13,
    color: '#7A6E65',
    marginTop: 4,
  },
  divider: {
    height: 1,
    backgroundColor: '#F0ECE7',
    marginVertical: 12,
  },
  stockHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  stockLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#8E8278',
    letterSpacing: 0.6,
  },
  lowStockLabel: {
    color: '#D9381E',
  },
  stockValue: {
    fontSize: 15,
    fontWeight: '700',
    color: '#2C201A',
    marginTop: 4,
  },
  progressTrack: {
    width: 110,
    height: 6,
    backgroundColor: '#EFECE8',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#963819',
    borderRadius: 3,
  },
  lowStockBar: {
    backgroundColor: '#D9381E',
  },
});

