import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { colors, typography, radius, spacing, shadows } from '../theme';

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

  /**
   * Sliding window pagination:
   * Displays exactly a maximum of 5 consecutive page numbers at any time.
   * If totalPages <= 5: displays all [1..totalPages].
   * If totalPages > 5:
   *   Page 1: [1, 2, 3, 4, 5]
   *   Page 2: [1, 2, 3, 4, 5]
   *   Page 3: [1, 2, 3, 4, 5]
   *   Page 4: [2, 3, 4, 5, 6]
   *   Page 5: [3, 4, 5, 6, 7]
   *   ...
   *   Last page 10: [6, 7, 8, 9, 10]
   *   Last page 50: [46, 47, 48, 49, 50]
   */
  const getSlidingWindowPages = (): number[] => {
    const maxButtons = 5;
    if (totalPages <= maxButtons) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }

    let startPage = safeCurrentPage - 2;
    if (startPage < 1) {
      startPage = 1;
    }
    if (startPage + maxButtons - 1 > totalPages) {
      startPage = totalPages - maxButtons + 1;
    }

    return Array.from({ length: maxButtons }, (_, i) => startPage + i);
  };

  const visiblePages = getSlidingWindowPages();

  const handleSelectPageSize = (size: number) => {
    setDropdownOpen(false);
    if (size !== pageSize && onPageSizeChange) {
      onPageSizeChange(size);
    }
  };

  return (
    <View style={styles.container}>
      {/* 1. Header Information Row: Left: Rows per page selector | Right: Showing 1–10 of 37 records */}
      <View style={styles.infoRow}>
        {/* Left Side: Rows per page selector + Floating Upward Dropdown */}
        <View style={styles.leftSelectorGroup}>
          <Text style={styles.pageSizeLabel}>Rows per page:</Text>
          <View style={styles.dropdownAnchor}>
            <TouchableOpacity
              style={[styles.pageSizeBtn, dropdownOpen && styles.pageSizeBtnOpen]}
              onPress={() => setDropdownOpen(!dropdownOpen)}
              activeOpacity={0.7}
            >
              <Text style={styles.pageSizeValText}>{effectivePageSize}</Text>
              <Ionicons
                name={dropdownOpen ? 'chevron-down' : 'chevron-up'}
                size={13}
                color="#6B5E55"
                style={{ marginLeft: 3 }}
              />
            </TouchableOpacity>

            {/* Floating Overlay Dropdown Options (Opens UPWARD with bottom: 34 to prevent clipping by bottom export bar) */}
            {dropdownOpen && (
              <View style={styles.floatingDropdownUpward}>
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

        {/* Right Side: Showing 1–10 of 37 records */}
        <Text style={styles.infoText}>
          Showing <Text style={styles.infoHighlight}>{startRecord}–{endRecord}</Text> of <Text style={styles.infoHighlight}>{totalRecords}</Text> records
        </Text>
      </View>

      {/* 2. Main Centered Pagination Row: [Previous] [1] [2] [3] [4] [5] [Next] */}
      {totalPages > 1 && (
        <View style={styles.centeredPaginationRow}>
          {/* Labeled Previous Button */}
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
              style={{ marginRight: 2 }}
            />
            <Text style={[styles.navBtnText, isFirstPage && styles.navBtnTextDisabled]}>
              Previous
            </Text>
          </TouchableOpacity>

          {/* Sliding Window Page Numbers (Max 5 consecutive buttons) */}
          <View style={styles.pageNumbersGroup}>
            {visiblePages.map((pageNum) => {
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

          {/* Labeled Next Button */}
          <TouchableOpacity
            style={[styles.navBtn, isLastPage && styles.navBtnDisabled]}
            onPress={() => !isLastPage && onPageChange(safeCurrentPage + 1)}
            disabled={isLastPage}
            activeOpacity={0.7}
          >
            <Text style={[styles.navBtnText, isLastPage && styles.navBtnTextDisabled]}>
              Next
            </Text>
            <Ionicons
              name="chevron-forward"
              size={14}
              color={isLastPage ? '#C7BEB5' : '#8C331A'}
              style={{ marginLeft: 2 }}
            />
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 14,
    marginBottom: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#EFEAE4',
    width: '100%',
    paddingHorizontal: 22, // 20–24dp horizontal screen-side spacing
    zIndex: 100,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 12,
    zIndex: 110,
  },
  leftSelectorGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 120,
  },
  pageSizeLabel: {
    fontSize: 12,
    color: '#6B5E55',
    fontWeight: '500',
    marginRight: 6,
  },
  dropdownAnchor: {
    position: 'relative',
    zIndex: 130,
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
  floatingDropdownUpward: {
    position: 'absolute',
    bottom: 34, // Opens UPWARD above the selector
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
        shadowOffset: { width: 0, height: -3 },
        shadowOpacity: 0.15,
        shadowRadius: 6,
      },
      android: {
        elevation: 10,
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
  infoText: {
    fontSize: 12,
    color: '#6B5E55',
    fontWeight: '500',
  },
  infoHighlight: {
    fontWeight: '700',
    color: '#2C201A',
  },
  centeredPaginationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center', // Centered horizontally
    width: '100%',
    gap: 6,
  },
  navBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 32,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D4C9BF',
  },
  navBtnDisabled: {
    backgroundColor: '#F7F3EE',
    borderColor: '#EFEAE4',
  },
  navBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#8C331A',
  },
  navBtnTextDisabled: {
    color: '#C7BEB5',
  },
  pageNumbersGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  pageBtn: {
    minWidth: 32,
    height: 32,
    paddingHorizontal: 6,
    borderRadius: 8,
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
    fontSize: 12.5,
    fontWeight: '600',
    color: '#52433B',
  },
  pageBtnTextActive: {
    fontWeight: '800',
    color: '#FFFFFF',
  },
});
