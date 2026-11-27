import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { colors, typography, radius } from '../../theme';

export interface BillingCycleDayModalProps {
  visible: boolean;
  currentDay: number;
  customerName?: string;
  onClose: () => void;
  onSave: (selectedDay: number) => Promise<void> | void;
}

export default function BillingCycleDayModal({
  visible,
  currentDay,
  customerName,
  onClose,
  onSave,
}: BillingCycleDayModalProps) {
  const [selectedDay, setSelectedDay] = useState<number>(currentDay || 1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (visible) {
      setSelectedDay(currentDay >= 1 && currentDay <= 31 ? currentDay : 1);
      setIsSubmitting(false);
    }
  }, [visible, currentDay]);

  const handleSave = async () => {
    try {
      setIsSubmitting(true);
      await onSave(selectedDay);
      onClose();
    } catch (_err) {
      // Handled by caller toast
    } finally {
      setIsSubmitting(false);
    }
  };

  const daysList = Array.from({ length: 31 }, (_, i) => i + 1);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={styles.backdrop}>
        <View style={styles.card}>
          {/* Header */}
          <View style={styles.header}>
            <View style={{ flex: 1, marginRight: 8 }}>
              <Text style={styles.title}>Billing Cycle Day</Text>
              <Text style={styles.subtitle} numberOfLines={1}>
                {customerName ? `For ${customerName}` : 'Select monthly anchor day'}
              </Text>
            </View>
            <TouchableOpacity
              onPress={onClose}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              style={styles.closeBtn}
              disabled={isSubmitting}
            >
              <Ionicons name="close" size={20} color="#6B7280" />
            </TouchableOpacity>
          </View>

          {/* Description / Information */}
          <View style={styles.infoBox}>
            <Ionicons name="information-circle-outline" size={16} color="#8C331A" style={{ marginRight: 6 }} />
            <Text style={styles.infoText}>
              Invoices will start on this day every month. Historical invoices and FIFO allocations are never modified.
            </Text>
          </View>

          {/* Days Grid (1 to 31) */}
          <ScrollView
            style={styles.gridScroll}
            contentContainerStyle={styles.gridContainer}
            showsVerticalScrollIndicator={false}
          >
            {daysList.map(day => {
              const isSelected = selectedDay === day;
              const isSavedDay = currentDay === day;

              return (
                <TouchableOpacity
                  key={day}
                  style={[
                    styles.dayPill,
                    isSelected && styles.dayPillSelected,
                    !isSelected && isSavedDay && styles.dayPillSaved,
                  ]}
                  onPress={() => setSelectedDay(day)}
                  activeOpacity={0.7}
                  disabled={isSubmitting}
                >
                  <Text
                    style={[
                      styles.dayPillText,
                      isSelected && styles.dayPillTextSelected,
                      !isSelected && isSavedDay && styles.dayPillTextSaved,
                    ]}
                  >
                    {day}
                  </Text>
                  {isSavedDay && !isSelected && (
                    <View style={styles.savedDot} />
                  )}
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Selected Summary Note */}
          <View style={styles.selectedDaySummary}>
            <Text style={styles.selectedDayLabel}>
              Selected:{' '}
              <Text style={styles.selectedDayValue}>
                {selectedDay === 1
                  ? '1st of every month (Calendar month)'
                  : selectedDay === 2
                  ? '2nd of every month'
                  : selectedDay === 3
                  ? '3rd of every month'
                  : `${selectedDay}th of every month`}
              </Text>
            </Text>
          </View>

          {/* Footer Actions */}
          <View style={styles.footer}>
            <TouchableOpacity
              style={styles.cancelBtn}
              onPress={onClose}
              disabled={isSubmitting}
              activeOpacity={0.7}
            >
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.saveBtn, isSubmitting && styles.saveBtnDisabled]}
              onPress={handleSave}
              disabled={isSubmitting}
              activeOpacity={0.85}
            >
              {isSubmitting ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.saveBtnText}>Save Cycle Day</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  card: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 18,
    shadowColor: '#2A2421',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 17,
    fontWeight: '800',
    color: '#1F2937',
  },
  subtitle: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  closeBtn: {
    padding: 4,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FAF5F2',
    borderWidth: 1,
    borderColor: '#F0E6DE',
    borderRadius: 8,
    padding: 10,
    marginBottom: 14,
  },
  infoText: {
    flex: 1,
    fontSize: 11,
    color: '#7A3521',
    lineHeight: 15,
  },
  gridScroll: {
    maxHeight: 210,
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingBottom: 4,
    justifyContent: 'flex-start',
  },
  dayPill: {
    width: 42,
    height: 42,
    borderRadius: 10,
    backgroundColor: '#F8F6F4',
    borderWidth: 1,
    borderColor: '#EFEAE4',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  dayPillSelected: {
    backgroundColor: '#8C331A',
    borderColor: '#8C331A',
  },
  dayPillSaved: {
    borderColor: '#C79D89',
    backgroundColor: '#FDFBF9',
  },
  dayPillText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#4B5563',
  },
  dayPillTextSelected: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  dayPillTextSaved: {
    color: '#8C331A',
  },
  savedDot: {
    position: 'absolute',
    bottom: 3,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#8C331A',
  },
  selectedDaySummary: {
    marginTop: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  selectedDayLabel: {
    fontSize: 11,
    color: '#6B7280',
  },
  selectedDayValue: {
    fontWeight: '700',
    color: '#8C331A',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  cancelBtn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D1D5DB',
  },
  cancelBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#4B5563',
  },
  saveBtn: {
    backgroundColor: '#8C331A',
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 8,
    minWidth: 120,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBtnDisabled: {
    opacity: 0.6,
  },
  saveBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
