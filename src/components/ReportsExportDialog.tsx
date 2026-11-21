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

export interface ReportsExportDialogProps {
  visible: boolean;
  format: 'pdf' | 'excel';
  status: 'loading' | 'success' | 'error';
  filename?: string;
  fileSize?: number;
  errorMessage?: string;
  onClose: () => void;
  onAction?: () => void; // "Open PDF" or "Share / Open Excel"
  onRetry?: () => void;
}

export function ReportsExportDialog({
  visible,
  format,
  status,
  filename,
  fileSize,
  errorMessage,
  onClose,
  onAction,
  onRetry,
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
        if (status !== 'loading') {
          onClose();
        }
      }}
    >
      <View style={styles.overlay}>
        <View style={styles.card}>
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
                  color={isPdf ? '#DC2626' : '#15803D'}
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
            {status === 'loading' && `Generating ${formatTitle}...`}
            {status === 'success' && `${formatTitle} Export Complete`}
            {status === 'error' && `${formatTitle} Export Failed`}
          </Text>

          {/* Dialog Description & Body */}
          {status === 'loading' && (
            <Text style={styles.subtitle}>
              Please wait while your {formatTitle} report is compiled and saved.
            </Text>
          )}

          {status === 'success' && (
            <View style={styles.fileInfoCard}>
              <View style={styles.fileIconBox}>
                <Ionicons
                  name={isPdf ? 'document-text-outline' : 'grid-outline'}
                  size={20}
                  color="#8C331A"
                />
              </View>
              <View style={styles.fileDetails}>
                <Text style={styles.fileName} numberOfLines={1} ellipsizeMode="middle">
                  {filename || `ChaiFlow_Report.${isPdf ? 'pdf' : 'xlsx'}`}
                </Text>
                <Text style={styles.fileMeta}>
                  {formatBytes(fileSize)} • Saved to device
                </Text>
              </View>
            </View>
          )}

          {status === 'error' && (
            <Text style={styles.errorText}>
              {errorMessage || `An unexpected error occurred while downloading the ${formatTitle} report.`}
            </Text>
          )}

          {/* Actions */}
          <View style={styles.actionRow}>
            {status === 'loading' ? (
              <View style={styles.loadingPlaceholder}>
                <Text style={styles.loadingTip}>Export in progress...</Text>
              </View>
            ) : status === 'success' ? (
              <>
                <TouchableOpacity
                  style={styles.cancelBtn}
                  onPress={onClose}
                  activeOpacity={0.7}
                >
                  <Text style={styles.cancelBtnText}>Close</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.primaryBtn}
                  onPress={onAction}
                  activeOpacity={0.8}
                >
                  <Ionicons
                    name={isPdf ? 'open-outline' : 'share-social-outline'}
                    size={16}
                    color="#FFFFFF"
                    style={{ marginRight: 6 }}
                  />
                  <Text style={styles.primaryBtnText}>
                    {isPdf ? 'Open PDF' : 'Share / Open'}
                  </Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <TouchableOpacity
                  style={styles.cancelBtn}
                  onPress={onClose}
                  activeOpacity={0.7}
                >
                  <Text style={styles.cancelBtnText}>Close</Text>
                </TouchableOpacity>
                {onRetry && (
                  <TouchableOpacity
                    style={styles.primaryBtn}
                    onPress={onRetry}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="refresh-outline" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
                    <Text style={styles.primaryBtnText}>Retry</Text>
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
  iconContainer: {
    marginBottom: 14,
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
    backgroundColor: '#15803D',
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
    marginVertical: 12,
  },
  fileIconBox: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#F5ECE5',
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
    marginBottom: 2,
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
    justifyContent: 'flex-end',
    width: '100%',
    marginTop: 10,
    gap: 10,
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
  cancelBtn: {
    flex: 1,
    paddingVertical: 11,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D4C9BF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#6B5E55',
  },
  primaryBtn: {
    flex: 1.3,
    flexDirection: 'row',
    paddingVertical: 11,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: '#8C331A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
