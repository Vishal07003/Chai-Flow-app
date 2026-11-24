import React, { useEffect, useRef } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TouchableWithoutFeedback,
  ActivityIndicator,
  Animated,
  Platform,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { colors, typography, radius, spacing, shadows } from '../theme';

export type ConfirmDialogType = 'danger' | 'warning' | 'info' | 'success';

export interface ConfirmDialogProps {
  visible: boolean;
  title: string;
  description?: string;
  type?: ConfirmDialogType;
  icon?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void | Promise<void>;
  onCancel?: () => void;
  loading?: boolean;
  dismissible?: boolean;
  children?: React.ReactNode;
}

export function ConfirmDialog({
  visible,
  title,
  description,
  type = 'info',
  icon,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  onConfirm,
  onCancel,
  loading = false,
  dismissible = true,
  children,
}: ConfirmDialogProps) {
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 180,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 8,
          tension: 65,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      scaleAnim.setValue(0.9);
      opacityAnim.setValue(0);
    }
  }, [visible, opacityAnim, scaleAnim]);

  if (!visible) return null;

  // Type configuration
  const getTypeConfig = () => {
    switch (type) {
      case 'danger':
        return {
          icon: icon || 'alert-circle-outline',
          iconColor: '#DC2626',
          iconBg: '#FEF2F2',
          iconBorder: '#FEE2E2',
          confirmBtnBg: '#DC2626',
          confirmBtnText: '#FFFFFF',
        };
      case 'warning':
        return {
          icon: icon || 'warning-outline',
          iconColor: '#D97706',
          iconBg: '#FFFBEB',
          iconBorder: '#FEF3C7',
          confirmBtnBg: '#D97706',
          confirmBtnText: '#FFFFFF',
        };
      case 'success':
        return {
          icon: icon || 'checkmark-circle-outline',
          iconColor: '#059669',
          iconBg: '#ECFDF5',
          iconBorder: '#D1FAE5',
          confirmBtnBg: '#059669',
          confirmBtnText: '#FFFFFF',
        };
      case 'info':
      default:
        return {
          icon: icon || 'information-circle-outline',
          iconColor: '#8C331A',
          iconBg: '#F7EBE4',
          iconBorder: '#EED9CE',
          confirmBtnBg: '#8C331A',
          confirmBtnText: '#FFFFFF',
        };
    }
  };

  const config = getTypeConfig();

  const handleBackdropPress = () => {
    if (dismissible && !loading && onCancel) {
      onCancel();
    }
  };

  return (
    <Modal
      transparent={true}
      visible={visible}
      animationType="none"
      onRequestClose={handleBackdropPress}
    >
      <TouchableWithoutFeedback onPress={handleBackdropPress}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <Animated.View
              style={[
                styles.dialogCard,
                {
                  opacity: opacityAnim,
                  transform: [{ scale: scaleAnim }],
                },
              ]}
            >
              {/* Top Accent Icon Badge */}
              <View
                style={[
                  styles.iconBadge,
                  {
                    backgroundColor: config.iconBg,
                    borderColor: config.iconBorder,
                  },
                ]}
              >
                <Ionicons name={config.icon} size={30} color={config.iconColor} />
              </View>

              {/* Title & Description */}
              <Text style={styles.titleText}>{title}</Text>
              {description ? (
                <Text style={styles.descText}>{description}</Text>
              ) : null}

              {/* Optional Custom Content (e.g. breakdown/preview) */}
              {children ? (
                <View style={styles.customContentBox}>{children}</View>
              ) : null}

              {/* Buttons Row */}
              <View style={styles.buttonRow}>
                {cancelLabel ? (
                  <TouchableOpacity
                    activeOpacity={0.7}
                    style={styles.cancelBtn}
                    onPress={onCancel}
                    disabled={loading}
                  >
                    <Text style={styles.cancelBtnText}>{cancelLabel}</Text>
                  </TouchableOpacity>
                ) : null}

                <TouchableOpacity
                  activeOpacity={0.8}
                  style={[
                    styles.confirmBtn,
                    { backgroundColor: config.confirmBtnBg },
                    !cancelLabel && { flex: 1 },
                  ]}
                  onPress={onConfirm}
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator size="small" color={config.confirmBtnText} />
                  ) : (
                    <Text
                      style={[
                        styles.confirmBtnText,
                        { color: config.confirmBtnText },
                      ]}
                    >
                      {confirmLabel}
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            </Animated.View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(17, 24, 39, 0.60)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  dialogCard: {
    width: '100%',
    maxWidth: 350,
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    paddingHorizontal: 22,
    paddingTop: 24,
    paddingBottom: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#F3F4F6',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.22,
        shadowRadius: 20,
      },
      android: {
        elevation: 14,
      },
    }),
  },
  iconBadge: {
    width: 62,
    height: 62,
    borderRadius: 31,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  titleText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#111827',
    textAlign: 'center',
    letterSpacing: -0.2,
    marginBottom: 8,
  },
  descText: {
    fontSize: 14,
    color: '#4B5563',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 18,
  },
  customContentBox: {
    width: '100%',
    marginBottom: 16,
  },
  buttonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    gap: 12,
    marginTop: 4,
  },
  cancelBtn: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#4B5563',
  },
  confirmBtn: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmBtnText: {
    fontSize: 14,
    fontWeight: '800',
  },
});

export default ConfirmDialog;

