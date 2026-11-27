import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { colors, typography, radius, spacing, shadows } from '../../theme';

export interface PaginationControlProps {
  currentPage: number;
  totalPages: number;
  totalRecords?: number;
  pageSize: number;
  pageSizeOptions?: number[];
  onPageChange: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
  isLoading?: boolean;
}

export default function PaginationControl({
  currentPage,
  totalPages,
  totalRecords,
  pageSize,
  pageSizeOptions = [10, 20, 30],
  onPageChange,
  onPageSizeChange,
  isLoading = false,
}: PaginationControlProps) {
  const safeTotalPages = Math.max(1, totalPages);
  const canGoPrev = currentPage > 1 && !isLoading;
  const canGoNext = currentPage < safeTotalPages && !isLoading;

  return (
    <View style={styles.container}>
      {/* Top / Left: Record count and page size selector */}
      <View style={styles.infoRow}>
        <Text style={styles.countText}>
          {totalRecords !== undefined ? (
            <>
              Total <Text style={styles.boldText}>{totalRecords}</Text> records
            </>
          ) : (
            `Page ${currentPage} of ${safeTotalPages}`
          )}
        </Text>

        {onPageSizeChange && (
          <View style={styles.pageSizeRow}>
            <Text style={styles.sizeLabel}>Per page:</Text>
            {pageSizeOptions.map(opt => {
              const isSelected = pageSize === opt;
              return (
                <TouchableOpacity
                  key={opt}
                  onPress={() => onPageSizeChange(opt)}
                  disabled={isLoading}
                  style={[styles.sizePill, isSelected && styles.sizePillActive]}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.sizePillText, isSelected && styles.sizePillTextActive]}>
                    {opt}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </View>

      {/* Navigation Buttons Row */}
      <View style={styles.navRow}>
        <TouchableOpacity
          onPress={() => onPageChange(currentPage - 1)}
          disabled={!canGoPrev}
          style={[styles.navBtn, !canGoPrev && styles.navBtnDisabled]}
          activeOpacity={0.7}
        >
          <Ionicons
            name="chevron-back"
            size={16}
            color={canGoPrev ? colors.primary : colors.textMuted}
          />
          <Text style={[styles.navBtnText, !canGoPrev && styles.navBtnTextDisabled]}>
            Previous
          </Text>
        </TouchableOpacity>

        <View style={styles.pageIndicator}>
          <Text style={styles.pageIndicatorText}>
            Page <Text style={styles.boldText}>{currentPage}</Text> of{' '}
            <Text style={styles.boldText}>{safeTotalPages}</Text>
          </Text>
        </View>

        <TouchableOpacity
          onPress={() => onPageChange(currentPage + 1)}
          disabled={!canGoNext}
          style={[styles.navBtn, !canGoNext && styles.navBtnDisabled]}
          activeOpacity={0.7}
        >
          <Text style={[styles.navBtnText, !canGoNext && styles.navBtnTextDisabled]}>
            Next
          </Text>
          <Ionicons
            name="chevron-forward"
            size={16}
            color={canGoNext ? colors.primary : colors.textMuted}
          />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginTop: 8,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  countText: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  boldText: {
    fontWeight: '700',
    color: colors.textPrimary,
  },
  pageSizeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  sizeLabel: {
    fontSize: 11,
    color: colors.textMuted,
    marginRight: 4,
  },
  sizePill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.sm,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sizePillActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  sizePillText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  sizePillTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  navRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  navBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: '#FFFFFF',
    gap: 4,
  },
  navBtnDisabled: {
    borderColor: colors.border,
    backgroundColor: colors.surface,
    opacity: 0.5,
  },
  navBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
  },
  navBtnTextDisabled: {
    color: colors.textMuted,
    fontWeight: '500',
  },
  pageIndicator: {
    paddingHorizontal: 8,
  },
  pageIndicatorText: {
    fontSize: 12,
    color: colors.textSecondary,
  },
});
