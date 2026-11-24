import React from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { colors, typography, radius, spacing, shadows } from '../theme';

export interface ReportsExportDialogProps {
  visible: boolean;
  format: 'pdf' | 'excel';
  status: 'loading' | 'success' | 'error';
  title?: string;
  subtitle?: string;
  filename?: string;
  fileSize?: number;
  errorMessage?: string;
  onClose: () => void;
  onOpen?: () => void; // Preview / Open PDF directly
  onDownload?: () => void; // Save to public Android Downloads
  onShare?: () => void; // Open Android Share Sheet with attached file
  onRetry?: () => void;
  downloadingToPublic?: boolean;
}

export function ReportsExportDialog({
  visible,
  format,
  status,
  title,
  subtitle,
  filename,
  fileSize,
  errorMessage,
  onClose,
  onOpen,
  onDownload,
  onShare,
  onRetry,
  downloadingToPublic = false,
}: ReportsExportDialogProps) {
  if (!visible) return null;

  const isPdf = format === 'pdf';
  const formatTitle = isPdf ? 'PDF' : 'Excel';

  // Format file size nicely
  const formatBytes = (bytes?: number) => {
    if (!bytes || bytes <= 0) return '0 KB';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={() => {
        if (status !== 'loading' && !downloadingToPublic) {
          onClose();
        }
      }}
    >
      <View style={styles.overlay}>
        <View style={styles.card}>
          {/* Top-Right Close (X) Button */}
          {status !== 'loading' && !downloadingToPublic && (
            <TouchableOpacity
              style={styles.closeBtn}
              onPress={onClose}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              activeOpacity={0.7}
            >
              <Ionicons name="close" size={22} color="#6B5E55" />
            </TouchableOpacity>
          )}

          {/* Header Icon */}
          <View style={styles.iconContainer}>
            {status === 'loading' && (
              <View style={[styles.iconCircle, styles.loadingCircle]}>
                <ActivityIndicator size="small" color="#8C331A" />
              </View>
            )}
            {status === 'success' && (
              <View style={[styles.iconCircle, styles.successCircle]}>
                <Ionicons
                  name={isPdf ? 'document-text' : 'stats-chart'}
                  size={28}
                  color={isPdf ? '#DC2626' : '#16865B'}
                />
                <View style={styles.badge}>
                  <Ionicons name="checkmark" size={12} color="#FFFFFF" />
                </View>
              </View>
            )}
            {status === 'error' && (
              <View style={[styles.iconCircle, styles.errorCircle]}>
                <Ionicons name="alert-circle" size={32} color="#DC2626" />
              </View>
            )}
          </View>

          {/* Dialog Title */}
          <Text style={styles.title}>
            {title ? (
              status === 'loading' ? `Generating ${title}...` :
              status === 'success' ? `${title} Ready` :
              `${title} Failed`
            ) : (
              status === 'loading' ? `Generating ${formatTitle}...` :
              status === 'success' ? `${formatTitle} Export Complete` :
              `${formatTitle} Export Failed`
            )}
          </Text>

          {/* Dialog Description & Body */}
          {status === 'loading' && (
            <Text style={styles.subtitle}>
              {subtitle || `Please wait while your ${formatTitle} document is compiled and saved.`}
            </Text>
          )}

          {status === 'success' && (
            <View style={styles.fileInfoCard}>
              <View style={styles.fileIconBox}>
                <Ionicons
                  name={isPdf ? 'document-text-outline' : 'grid-outline'}
                  size={22}
                  color={isPdf ? '#DC2626' : '#16865B'}
                />
              </View>
              <View style={styles.fileDetails}>
                <Text style={styles.fileName} numberOfLines={1} ellipsizeMode="middle">
                  {filename || `ChaiFlow_Report.${isPdf ? 'pdf' : 'xlsx'}`}
                </Text>
                <Text style={styles.fileMeta}>
                  {formatBytes(fileSize)} • Ready for Download & Share
                </Text>
              </View>
            </View>
          )}

          {status === 'error' && (
            <Text style={styles.errorText}>
              {errorMessage || `An unexpected error occurred while downloading the ${formatTitle} report.`}
            </Text>
          )}

          {/* Actions: Download & Share (+ Open preview if provided) */}
          <View style={[styles.actionRow, onOpen && status === 'success' ? styles.actionRowCol : null]}>
            {status === 'loading' ? (
              <View style={styles.loadingPlaceholder}>
                <Text style={styles.loadingTip}>Export in progress...</Text>
              </View>
            ) : status === 'success' ? (
              <>
                {onOpen && (
                  <TouchableOpacity
                    style={[styles.actionBtn, styles.openBtn]}
                    onPress={onOpen}
                    disabled={downloadingToPublic}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="eye-outline" size={17} color="#2C201A" style={{ marginRight: 6 }} />
                    <Text style={styles.openBtnText}>Preview / Open PDF</Text>
                  </TouchableOpacity>
                )}

                <View style={styles.splitBtnRow}>
                  <TouchableOpacity
                    style={[styles.actionBtn, styles.downloadBtn, onOpen ? { flex: 1 } : null]}
                    onPress={onDownload}
                    disabled={downloadingToPublic}
                    activeOpacity={0.8}
                  >
                    {downloadingToPublic ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <>
                        <Ionicons
                          name="download-outline"
                          size={17}
                          color="#FFFFFF"
                          style={{ marginRight: 6 }}
                        />
                        <Text style={styles.downloadBtnText}>Download</Text>
                      </>
                    )}
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.actionBtn, styles.shareBtn, onOpen ? { flex: 1 } : null]}
                    onPress={onShare}
                    disabled={downloadingToPublic}
                    activeOpacity={0.8}
                  >
                    <Ionicons
                      name="share-social-outline"
                      size={17}
                      color="#FFFFFF"
                      style={{ marginRight: 6 }}
                    />
                    <Text style={styles.shareBtnText}>Share</Text>
                  </TouchableOpacity>
                </View>
              </>
            ) : (
              <>
                <TouchableOpacity
                  style={[styles.actionBtn, styles.cancelBtn]}
                  onPress={onClose}
                  activeOpacity={0.7}
                >
                  <Text style={styles.cancelBtnText}>Close</Text>
                </TouchableOpacity>
                {onRetry && (
                  <TouchableOpacity
                    style={[styles.actionBtn, styles.downloadBtn]}
                    onPress={onRetry}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="refresh-outline" size={17} color="#FFFFFF" style={{ marginRight: 6 }} />
                    <Text style={styles.downloadBtnText}>Retry</Text>
                  </TouchableOpacity>
                )}
              </>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(28, 17, 10, 0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  card: {
    position: 'relative',
    backgroundColor: '#FAF8F5',
    borderRadius: 20,
    width: '100%',
    maxWidth: 380,
    paddingHorizontal: 22,
    paddingTop: 24,
    paddingBottom: 20,
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.15,
        shadowRadius: 16,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  closeBtn: {
    position: 'absolute',
    top: 14,
    right: 14,
    zIndex: 10,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F3EDE6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconContainer: {
    marginBottom: 12,
  },
  iconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingCircle: {
    backgroundColor: '#F5ECE5',
    borderWidth: 2,
    borderColor: '#E8DCCE',
  },
  successCircle: {
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#E8E1D9',
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    backgroundColor: '#16865B',
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  errorCircle: {
    backgroundColor: '#FEF2F2',
    borderWidth: 2,
    borderColor: '#FEE2E2',
  },
  title: {
    fontSize: 17,
    fontWeight: '800',
    color: '#2C201A',
    textAlign: 'center',
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 13,
    color: '#6B5E55',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 14,
  },
  fileInfoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#EAE3DA',
    padding: 12,
    width: '100%',
    marginVertical: 14,
  },
  fileIconBox: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: '#F7F2EB',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  fileDetails: {
    flex: 1,
  },
  fileName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#2C201A',
    marginBottom: 3,
  },
  fileMeta: {
    fontSize: 11,
    color: '#8A7E75',
    fontWeight: '500',
  },
  errorText: {
    fontSize: 13,
    color: '#DC2626',
    textAlign: 'center',
    lineHeight: 18,
    marginVertical: 12,
    paddingHorizontal: 8,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    marginTop: 10,
    gap: 12,
  },
  actionRowCol: {
    flexDirection: 'column',
    gap: 10,
  },
  splitBtnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    gap: 12,
  },
  openBtn: {
    width: '100%',
    backgroundColor: '#FAF0E6',
    borderWidth: 1.5,
    borderColor: '#8C331A',
  },
  openBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#8C331A',
  },
  loadingPlaceholder: {
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  loadingTip: {
    fontSize: 12,
    color: '#8A7E75',
    fontWeight: '600',
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
  },
  downloadBtn: {
    backgroundColor: '#16865B',
  },
  downloadBtnText: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  shareBtn: {
    backgroundColor: '#8C331A',
  },
  shareBtnText: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  cancelBtn: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D4C9BF',
  },
  cancelBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#6B5E55',
  },
});
