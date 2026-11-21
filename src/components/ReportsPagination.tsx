import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';

export const PAGE_SIZE_OPTIONS = [10, 20, 30] as const;
export type PageSizeOption = (typeof PAGE_SIZE_OPTIONS)[number];

export interface ReportsPaginationProps {
  currentPage: number;
  totalRecords: number;
  pageSize?: number;
  onPageChange: (newPage: number) => void;
  onPageSizeChange?: (newPageSize: number) => void;
}

export function ReportsPagination({
  currentPage,
  totalRecords,
  pageSize = 10,
  onPageChange,
  onPageSizeChange,
}: ReportsPaginationProps) {
  const [dropdownOpen, setDropdownOpen] = useState(false);

  if (totalRecords <= 0) {
    return null;
  }

  const effectivePageSize = pageSize > 0 ? pageSize : 10;
  const totalPages = Math.max(1, Math.ceil(totalRecords / effectivePageSize));
  const safeCurrentPage = Math.min(Math.max(1, currentPage), totalPages);

  const startRecord = (safeCurrentPage - 1) * effectivePageSize + 1;
  const endRecord = Math.min(safeCurrentPage * effectivePageSize, totalRecords);

  const isFirstPage = safeCurrentPage <= 1;
  const isLastPage = safeCurrentPage >= totalPages;

  // Compute compact page window with ellipsis for large page counts
  const getVisiblePageNumbers = (): (number | string)[] => {
    if (totalPages <= 5) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }

    if (safeCurrentPage <= 3) {
      return [1, 2, 3, 4, '...', totalPages];
    }

    if (safeCurrentPage >= totalPages - 2) {
      return [1, '...', totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
    }

    return [1, '...', safeCurrentPage - 1, safeCurrentPage, safeCurrentPage + 1, '...', totalPages];
  };

  const visiblePages = getVisiblePageNumbers();

  const handleSelectPageSize = (size: number) => {
    setDropdownOpen(false);
    if (size !== pageSize && onPageSizeChange) {
      onPageSizeChange(size);
    }
  };

  return (
    <View style={styles.container}>
      {/* 1. Header Information: Showing 1–10 of 37 records */}
      <View style={styles.infoRow}>
        <Text style={styles.infoText}>
          Showing <Text style={styles.infoHighlight}>{startRecord}–{endRecord}</Text> of <Text style={styles.infoHighlight}>{totalRecords}</Text> records
        </Text>
      </View>

      {/* 2. Main Pagination Controls Row: Left side (Rows per page) + Right side (Navigation) */}
      <View style={styles.mainControlsRow}>
        {/* Left Side: Rows per page + Anchor for Floating Overlay Dropdown */}
        <View style={styles.leftContainer}>
          <Text style={styles.pageSizeLabel}>Rows per page:</Text>
          <View style={styles.dropdownAnchor}>
            <TouchableOpacity
              style={[styles.pageSizeBtn, dropdownOpen && styles.pageSizeBtnOpen]}
              onPress={() => setDropdownOpen(!dropdownOpen)}
              activeOpacity={0.7}
            >
              <Text style={styles.pageSizeValText}>{effectivePageSize}</Text>
              <Ionicons
                name={dropdownOpen ? 'chevron-up' : 'chevron-down'}
                size={13}
                color="#6B5E55"
                style={{ marginLeft: 3 }}
              />
            </TouchableOpacity>

            {/* Floating Overlay Dropdown Options (anchored directly below, floating with elevation/zIndex) */}
            {dropdownOpen && (
              <View style={styles.floatingDropdown}>
                {PAGE_SIZE_OPTIONS.map((opt) => {
                  const isSelected = opt === effectivePageSize;
                  return (
                    <TouchableOpacity
                      key={`opt-${opt}`}
                      style={[styles.floatingOptionRow, isSelected && styles.floatingOptionSelected]}
                      onPress={() => handleSelectPageSize(opt)}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.floatingOptionText, isSelected && styles.floatingOptionTextSelected]}>
                        {opt}
                      </Text>
                      {isSelected && (
                        <Ionicons name="checkmark" size={13} color="#8C331A" style={{ marginLeft: 4 }} />
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
          </View>
        </View>

        {/* Right Side: Page Navigation (Previous / Page Numbers / Next) */}
        {totalPages > 1 && (
          <View style={styles.rightContainer}>
            {/* Previous Button */}
            <TouchableOpacity
              style={[styles.navBtn, isFirstPage && styles.navBtnDisabled]}
              onPress={() => !isFirstPage && onPageChange(safeCurrentPage - 1)}
              disabled={isFirstPage}
              activeOpacity={0.7}
            >
              <Ionicons
                name="chevron-back"
                size={14}
                color={isFirstPage ? '#C7BEB5' : '#8C331A'}
              />
            </TouchableOpacity>

            {/* Page Numbers */}
            <View style={styles.pageNumbersRow}>
              {visiblePages.map((page, index) => {
                if (page === '...') {
                  return (
                    <View key={`ellipsis-${index}`} style={styles.ellipsisBox}>
                      <Text style={styles.ellipsisText}>••</Text>
                    </View>
                  );
                }

                const pageNum = Number(page);
                const isActive = pageNum === safeCurrentPage;

                return (
                  <TouchableOpacity
                    key={`page-${pageNum}`}
                    style={[styles.pageBtn, isActive && styles.pageBtnActive]}
                    onPress={() => onPageChange(pageNum)}
                    disabled={isActive}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.pageBtnText, isActive && styles.pageBtnTextActive]}>
                      {pageNum}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Next Button */}
            <TouchableOpacity
              style={[styles.navBtn, isLastPage && styles.navBtnDisabled]}
              onPress={() => !isLastPage && onPageChange(safeCurrentPage + 1)}
              disabled={isLastPage}
              activeOpacity={0.7}
            >
              <Ionicons
                name="chevron-forward"
                size={14}
                color={isLastPage ? '#C7BEB5' : '#8C331A'}
              />
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 10,
    marginBottom: 4,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#EFEAE4',
    width: '100%',
    zIndex: 100, // Ensure floating dropdown renders above subsequent content
  },
  infoRow: {
    marginBottom: 8,
    paddingHorizontal: 2,
  },
  infoText: {
    fontSize: 12,
    color: '#6B5E55',
    fontWeight: '500',
  },
  infoHighlight: {
    fontWeight: '700',
    color: '#2C201A',
  },
  mainControlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    flexWrap: 'wrap',
    gap: 8,
  },
  leftContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 110,
  },
  pageSizeLabel: {
    fontSize: 12,
    color: '#6B5E55',
    fontWeight: '500',
    marginRight: 6,
  },
  dropdownAnchor: {
    position: 'relative',
    zIndex: 120,
  },
  pageSizeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D4C9BF',
    borderRadius: 7,
    paddingHorizontal: 8,
    paddingVertical: 4,
    minWidth: 46,
    height: 30,
  },
  pageSizeBtnOpen: {
    borderColor: '#8C331A',
    backgroundColor: '#FAF5F2',
  },
  pageSizeValText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#2C201A',
  },
  floatingDropdown: {
    position: 'absolute',
    top: 34,
    left: 0,
    minWidth: 64,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D4C9BF',
    paddingVertical: 3,
    zIndex: 999,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.15,
        shadowRadius: 6,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  floatingOptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  floatingOptionSelected: {
    backgroundColor: '#F5ECE5',
  },
  floatingOptionText: {
    fontSize: 12.5,
    fontWeight: '500',
    color: '#2C201A',
  },
  floatingOptionTextSelected: {
    color: '#8C331A',
    fontWeight: '700',
  },
  rightContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flexShrink: 1,
  },
  navBtn: {
    width: 28,
    height: 30,
    borderRadius: 7,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D4C9BF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  navBtnDisabled: {
    backgroundColor: '#F7F3EE',
    borderColor: '#EFEAE4',
  },
  pageNumbersRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  pageBtn: {
    minWidth: 28,
    height: 30,
    paddingHorizontal: 5,
    borderRadius: 7,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2D9CE',
    justifyContent: 'center',
    alignItems: 'center',
  },
  pageBtnActive: {
    backgroundColor: '#8C331A',
    borderColor: '#8C331A',
  },
  pageBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#52433B',
  },
  pageBtnTextActive: {
    fontWeight: '800',
    color: '#FFFFFF',
  },
  ellipsisBox: {
    minWidth: 16,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  ellipsisText: {
    fontSize: 10,
    color: '#A09489',
    letterSpacing: 0.5,
  },
});
