import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, TouchableWithoutFeedback } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';

export const PAGE_SIZE_OPTIONS = [10, 15, 30, 50] as const;
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

  // Compute compact page window
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
      {/* Top Meta Row: Rows per page selector + Showing X–Y of Z */}
      <View style={styles.metaRow}>
        {/* Rows Per Page Dropdown Trigger */}
        <View style={styles.pageSizeContainer}>
          <Text style={styles.pageSizeLabel}>Rows per page:</Text>
          <TouchableOpacity
            style={styles.pageSizeDropdownBtn}
            onPress={() => setDropdownOpen(true)}
            activeOpacity={0.7}
          >
            <Text style={styles.pageSizeValText}>{effectivePageSize}</Text>
            <Ionicons name="chevron-down" size={13} color="#6B5E55" style={{ marginLeft: 3 }} />
          </TouchableOpacity>
        </View>

        {/* Counter */}
        <Text style={styles.counterText}>
          Showing <Text style={styles.counterHighlight}>{startRecord}–{endRecord}</Text> of <Text style={styles.counterHighlight}>{totalRecords}</Text> records
        </Text>
      </View>

      {/* Rows Per Page Modal Dropdown */}
      <Modal
        visible={dropdownOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setDropdownOpen(false)}
      >
        <TouchableWithoutFeedback onPress={() => setDropdownOpen(false)}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <View style={styles.modalCard}>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Rows per page</Text>
                  <TouchableOpacity
                    onPress={() => setDropdownOpen(false)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Ionicons name="close" size={18} color="#6B5E55" />
                  </TouchableOpacity>
                </View>

                {PAGE_SIZE_OPTIONS.map((opt) => {
                  const isSelected = opt === effectivePageSize;
                  return (
                    <TouchableOpacity
                      key={`opt-${opt}`}
                      style={[styles.optionRow, isSelected && styles.optionRowSelected]}
                      onPress={() => handleSelectPageSize(opt)}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.optionText, isSelected && styles.optionTextSelected]}>
                        {opt} records
                      </Text>
                      {isSelected && (
                        <Ionicons name="checkmark-circle" size={18} color="#8C331A" />
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* Pagination Controls Row (displayed only if more than 1 page) */}
      {totalPages > 1 && (
        <View style={styles.controlsRow}>
          {/* Previous Button */}
          <TouchableOpacity
            style={[styles.navBtn, isFirstPage && styles.navBtnDisabled]}
            onPress={() => !isFirstPage && onPageChange(safeCurrentPage - 1)}
            disabled={isFirstPage}
            activeOpacity={0.7}
          >
            <Ionicons
              name="chevron-back"
              size={15}
              color={isFirstPage ? '#C7BEB5' : '#8C331A'}
            />
            <Text style={[styles.navBtnText, isFirstPage && styles.navBtnTextDisabled]}>
              Prev
            </Text>
          </TouchableOpacity>

          {/* Page Numbers */}
          <View style={styles.pageList}>
            {visiblePages.map((page, index) => {
              if (page === '...') {
                return (
                  <View key={`ellipsis-${index}`} style={styles.ellipsisBox}>
                    <Text style={styles.ellipsisText}>•••</Text>
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
            <Text style={[styles.navBtnText, isLastPage && styles.navBtnTextDisabled]}>
              Next
            </Text>
            <Ionicons
              name="chevron-forward"
              size={15}
              color={isLastPage ? '#C7BEB5' : '#8C331A'}
            />
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 12,
    marginBottom: 6,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#EFEAE4',
    alignItems: 'center',
    width: '100%',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    paddingHorizontal: 4,
    marginBottom: 10,
  },
  pageSizeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  pageSizeLabel: {
    fontSize: 12,
    color: '#6B5E55',
    fontWeight: '500',
    marginRight: 6,
  },
  pageSizeDropdownBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D4C9BF',
    borderRadius: 7,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  pageSizeValText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#2C201A',
  },
  counterText: {
    fontSize: 12,
    color: '#6B5E55',
    fontWeight: '500',
  },
  counterHighlight: {
    fontWeight: '700',
    color: '#2C201A',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(28, 17, 10, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalCard: {
    backgroundColor: '#FAF8F5',
    borderRadius: 16,
    width: '100%',
    maxWidth: 280,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#EAE3DA',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#EFEAE4',
  },
  modalTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#2C201A',
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: 8,
  },
  optionRowSelected: {
    backgroundColor: '#F5ECE5',
  },
  optionText: {
    fontSize: 13,
    color: '#2C201A',
    fontWeight: '500',
  },
  optionTextSelected: {
    color: '#8C331A',
    fontWeight: '700',
  },
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    gap: 6,
  },
  navBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    height: 32,
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
    marginHorizontal: 2,
  },
  navBtnTextDisabled: {
    color: '#C7BEB5',
  },
  pageList: {
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
  ellipsisBox: {
    minWidth: 20,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  ellipsisText: {
    fontSize: 11,
    color: '#A09489',
    letterSpacing: 1,
  },
});
