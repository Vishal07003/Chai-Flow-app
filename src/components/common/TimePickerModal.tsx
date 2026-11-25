import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Modal,
  ScrollView,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';

interface TimePickerModalProps {
  visible: boolean;
  title: string;
  initialTime?: string; // e.g. "06:00:00" or "06:00"
  onClose: () => void;
  onSelectTime: (timeString: string) => void; // returns "HH:MM:00"
}

export default function TimePickerModal({
  visible,
  title,
  initialTime = '06:00:00',
  onClose,
  onSelectTime,
}: TimePickerModalProps) {
  // Parse initialTime
  const parts = (initialTime || '06:00:00').split(':');
  let initHour = parseInt(parts[0] || '6', 10);
  const initMin = parseInt(parts[1] || '0', 10);
  const isPM = initHour >= 12;
  const initHour12 = initHour % 12 === 0 ? 12 : initHour % 12;

  const [hour12, setHour12] = useState<number>(initHour12);
  const [minute, setMinute] = useState<number>(Math.floor(initMin / 5) * 5);
  const [period, setPeriod] = useState<'AM' | 'PM'>(isPM ? 'PM' : 'AM');

  // Synchronize when visible or initialTime changes
  React.useEffect(() => {
    if (visible && initialTime) {
      const p = initialTime.split(':');
      let h = parseInt(p[0] || '6', 10);
      const m = parseInt(p[1] || '0', 10);
      const pm = h >= 12;
      const h12 = h % 12 === 0 ? 12 : h % 12;
      setHour12(h12);
      setMinute(Math.floor(m / 5) * 5);
      setPeriod(pm ? 'PM' : 'AM');
    }
  }, [visible, initialTime]);

  const hoursList = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
  const minutesList = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];

  const handleConfirm = () => {
    let final24Hour = hour12;
    if (period === 'PM' && hour12 < 12) final24Hour += 12;
    if (period === 'AM' && hour12 === 12) final24Hour = 0;

    const hh = String(final24Hour).padStart(2, '0');
    const mm = String(minute).padStart(2, '0');
    onSelectTime(`${hh}:${mm}:00`);
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.card}>
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>{title}</Text>
              <Text style={styles.subtitle}>Select time in Asia/Kolkata</Text>
            </View>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="close" size={22} color="#6B7280" />
            </TouchableOpacity>
          </View>

          {/* Current Selection Display */}
          <View style={styles.timePreviewRow}>
            <Text style={styles.timePreviewText}>
              {String(hour12).padStart(2, '0')}:{String(minute).padStart(2, '0')} {period}
            </Text>
          </View>

          {/* Selectors Grid */}
          <View style={styles.selectorContainer}>
            {/* Hours Column */}
            <View style={styles.column}>
              <Text style={styles.columnLabel}>Hour</Text>
              <ScrollView style={styles.scrollList} showsVerticalScrollIndicator={false}>
                {hoursList.map(h => {
                  const isSelected = h === hour12;
                  return (
                    <TouchableOpacity
                      key={h}
                      style={[styles.itemPill, isSelected && styles.itemPillActive]}
                      onPress={() => setHour12(h)}
                    >
                      <Text style={[styles.itemText, isSelected && styles.itemTextActive]}>
                        {String(h).padStart(2, '0')}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>

            {/* Minutes Column */}
            <View style={styles.column}>
              <Text style={styles.columnLabel}>Minute</Text>
              <ScrollView style={styles.scrollList} showsVerticalScrollIndicator={false}>
                {minutesList.map(m => {
                  const isSelected = m === minute;
                  return (
                    <TouchableOpacity
                      key={m}
                      style={[styles.itemPill, isSelected && styles.itemPillActive]}
                      onPress={() => setMinute(m)}
                    >
                      <Text style={[styles.itemText, isSelected && styles.itemTextActive]}>
                        {String(m).padStart(2, '0')}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>

            {/* AM/PM Column */}
            <View style={[styles.column, { flex: 0.8 }]}>
              <Text style={styles.columnLabel}>Period</Text>
              <View style={styles.periodContainer}>
                <TouchableOpacity
                  style={[styles.periodPill, period === 'AM' && styles.periodPillActive]}
                  onPress={() => setPeriod('AM')}
                >
                  <Text style={[styles.periodText, period === 'AM' && styles.periodTextActive]}>
                    AM
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.periodPill, period === 'PM' && styles.periodPillActive]}
                  onPress={() => setPeriod('PM')}
                >
                  <Text style={[styles.periodText, period === 'PM' && styles.periodTextActive]}>
                    PM
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* Action Buttons */}
          <View style={styles.footer}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.confirmBtn} onPress={handleConfirm}>
              <Text style={styles.confirmBtnText}>Set Time</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    width: '100%',
    maxWidth: 340,
    padding: 20,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: '#2A2421',
  },
  subtitle: {
    fontSize: 12,
    color: '#8E8278',
    marginTop: 2,
  },
  timePreviewRow: {
    backgroundColor: '#FAF8F5',
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#EFEAE4',
  },
  timePreviewText: {
    fontSize: 22,
    fontWeight: '800',
    color: '#8C331A',
    letterSpacing: 1,
  },
  selectorContainer: {
    flexDirection: 'row',
    height: 180,
    gap: 8,
    marginBottom: 16,
  },
  column: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#F3EFEA',
    borderRadius: 12,
    padding: 6,
    backgroundColor: '#FAF8F5',
  },
  columnLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#8E8278',
    textAlign: 'center',
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  scrollList: {
    flex: 1,
  },
  itemPill: {
    paddingVertical: 7,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 4,
  },
  itemPillActive: {
    backgroundColor: '#8C331A',
  },
  itemText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4B5563',
  },
  itemTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  periodContainer: {
    gap: 8,
    paddingTop: 8,
  },
  periodPill: {
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#EFEAE4',
    backgroundColor: '#FFFFFF',
  },
  periodPillActive: {
    backgroundColor: '#8C331A',
    borderColor: '#8C331A',
  },
  periodText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#4B5563',
  },
  periodTextActive: {
    color: '#FFFFFF',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F3EFEA',
  },
  cancelBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
  },
  cancelBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  confirmBtn: {
    backgroundColor: '#8C331A',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 10,
  },
  confirmBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
