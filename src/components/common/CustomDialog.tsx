import React from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TouchableWithoutFeedback,
  ActivityIndicator,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';

export type DialogType = 'confirm' | 'success' | 'danger' | 'info' | 'warning';

export interface DialogButton {
  text: string;
  style?: 'default' | 'cancel' | 'destructive';
  onPress?: () => void;
  loading?: boolean;
}

export interface CustomDialogProps {
  visible: boolean;
  title: string;
  message?: string;
  type?: DialogType;
  icon?: string;
  buttons?: DialogButton[];
  onClose?: () => void;
  children?: React.ReactNode;
}

export default function CustomDialog({
  visible,
  title,
  message,
  type = 'info',
  icon,
  buttons = [{ text: 'OK', style: 'default' }],
  onClose,
  children,
}: CustomDialogProps) {
  if (!visible) return null;

  // Determine icon and color scheme based on dialog type
  const getTypeConfig = () => {
    switch (type) {
      case 'success':
        return {
          icon: icon || 'checkmark-circle-outline',
          iconColor: '#059669',
          iconBg: '#ECFDF5',
          primaryBtnBg: '#059669',
        };
      case 'danger':
        return {
          icon: icon || 'alert-circle-outline',
          iconColor: '#DC2626',
          iconBg: '#FEF2F2',
          primaryBtnBg: '#DC2626',
        };
      case 'warning':
        return {
          icon: icon || 'warning-outline',
          iconColor: '#D97706',
          iconBg: '#FFFBEB',
          primaryBtnBg: '#D97706',
        };
      case 'confirm':
        return {
          icon: icon || 'help-circle-outline',
          iconColor: '#8C331A',
          iconBg: '#F7EBE4',
          primaryBtnBg: '#8C331A',
        };
      case 'info':
      default:
        return {
          icon: icon || 'information-circle-outline',
          iconColor: '#8C331A',
          iconBg: '#F7EBE4',
          primaryBtnBg: '#8C331A',
        };
    }
  };

  const config = getTypeConfig();

  return (
    <Modal
      transparent={true}
      visible={visible}
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <View style={styles.card}>
              {/* Type Icon Badge */}
              <View style={[styles.iconContainer, { backgroundColor: config.iconBg }]}>
                <Ionicons name={config.icon} size={28} color={config.iconColor} />
              </View>

              {/* Title & Body */}
              <Text style={styles.title}>{title}</Text>
              {message ? <Text style={styles.message}>{message}</Text> : null}

              {/* Optional Custom Content */}
              {children ? <View style={styles.customContent}>{children}</View> : null}

              {/* Action Buttons */}
              <View
                style={[
                  styles.buttonRow,
                  buttons.length > 2 ? styles.buttonColumn : null,
                ]}
              >
                {buttons.map((btn, index) => {
                  const isCancel = btn.style === 'cancel';
                  const isDestructive = btn.style === 'destructive';

                  const btnBg = isCancel
                    ? '#F3F4F6'
                    : isDestructive
                    ? '#DC2626'
                    : config.primaryBtnBg;

                  const textColor = isCancel ? '#4B5563' : '#FFFFFF';

                  return (
                    <TouchableOpacity
                      key={index}
                      activeOpacity={0.8}
                      style={[
                        styles.btn,
                        buttons.length === 2 && !buttons.some(b => b.text.length > 12)
                          ? styles.btnHalf
                          : styles.btnFull,
                        { backgroundColor: btnBg },
                      ]}
                      onPress={() => {
                        if (btn.onPress) {
                          btn.onPress();
                        } else if (onClose) {
                          onClose();
                        }
                      }}
                      disabled={btn.loading}
                    >
                      {btn.loading ? (
                        <ActivityIndicator
                          size="small"
                          color={isCancel ? '#4B5563' : '#FFFFFF'}
                        />
                      ) : (
                        <Text style={[styles.btnText, { color: textColor }]}>
                          {btn.text}
                        </Text>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.52)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 22,
  },
  card: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    paddingHorizontal: 22,
    paddingTop: 24,
    paddingBottom: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 16,
    elevation: 12,
  },
  iconContainer: {
    width: 58,
    height: 58,
    borderRadius: 29,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: '#111827',
    textAlign: 'center',
    letterSpacing: -0.2,
    marginBottom: 8,
  },
  message: {
    fontSize: 14,
    color: '#4B5563',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 16,
  },
  customContent: {
    width: '100%',
    marginBottom: 16,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    gap: 10,
    marginTop: 4,
  },
  buttonColumn: {
    flexDirection: 'column',
  },
  btn: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnHalf: {
    flex: 1,
  },
  btnFull: {
    width: '100%',
    marginBottom: 6,
  },
  btnText: {
    fontSize: 14,
    fontWeight: '800',
  },
});

