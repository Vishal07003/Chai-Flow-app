import React from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  ScrollView,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import CustomButton from './CustomButton';
import { colors, radius, spacing, typography, shadows } from '../../theme';

export interface CustomModalProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  primaryButtonTitle?: string;
  onPrimaryPress?: () => void;
  primaryLoading?: boolean;
  animationType?: 'slide' | 'fade' | 'none';
}

export default function CustomModal({
  visible,
  onClose,
  title,
  children,
  primaryButtonTitle,
  onPrimaryPress,
  primaryLoading = false,
  animationType = 'slide',
}: CustomModalProps) {
  return (
    <Modal
      animationType={animationType}
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <TouchableOpacity
          style={styles.overlay}
          activeOpacity={1}
          onPress={Keyboard.dismiss}
        >
          <TouchableOpacity activeOpacity={1} style={styles.contentCard}>
            <View style={styles.headerRow}>
              <Text style={styles.title}>{title}</Text>
              <TouchableOpacity onPress={onClose} activeOpacity={0.7}>
                <Ionicons name="close" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              style={styles.bodyScroll}
            >
              {children}

              {primaryButtonTitle && onPrimaryPress ? (
                <CustomButton
                  title={primaryButtonTitle}
                  onPress={onPrimaryPress}
                  loading={primaryLoading}
                  style={styles.footerBtn}
                />
              ) : null}
            </ScrollView>
          </TouchableOpacity>
        </TouchableOpacity>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    justifyContent: 'flex-end',
  },
  contentCard: {
    backgroundColor: colors.surfaceContainer,
    borderTopLeftRadius: radius.XL,
    borderTopRightRadius: radius.XL,
    maxHeight: '90%',
    paddingBottom: Platform.OS === 'ios' ? 40 : 20,
    ...shadows.lg,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.LG,
    paddingVertical: spacing.LG,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: {
    ...typography.heading2,
    color: colors.primary,
  },
  bodyScroll: {
    paddingHorizontal: spacing.LG,
    paddingTop: spacing.LG,
  },
  footerBtn: {
    marginTop: spacing.LG,
    marginBottom: spacing.MD,
  },
});
