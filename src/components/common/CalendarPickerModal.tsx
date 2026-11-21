import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Modal,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';

interface CalendarPickerModalProps {
  visible: boolean;
  title: string;
  initialDate?: string; // YYYY-MM-DD
  minDate?: string; // YYYY-MM-DD (dates before this are disabled)
  maxDate?: string; // YYYY-MM-DD
  onClose: () => void;
  onSelectDate: (dateString: string) => void; // returns YYYY-MM-DD
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const DAY_LABELS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

export default function CalendarPickerModal({
  visible,
  title,
  initialDate,
  minDate,
  maxDate,
  onClose,
  onSelectDate,
}: CalendarPickerModalProps) {
  // Parse initial date or default to current date in Asia/Kolkata
  const parseDateParts = (dStr?: string) => {
    if (dStr && /^\d{4}-\d{2}-\d{2}$/.test(dStr)) {
      const [y, m, d] = dStr.split('-').map(Number);
      return { year: y, month: m - 1, day: d };
    }
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth(), day: now.getDate() };
  };

  const initial = parseDateParts(initialDate);
  const [currentYear, setCurrentYear] = useState<number>(initial.year);
  const [currentMonth, setCurrentMonth] = useState<number>(initial.month);
  const [selectedDate, setSelectedDate] = useState<string>(initialDate || '');

  // Keep state synchronized if initialDate changes
  React.useEffect(() => {
    if (visible && initialDate) {
      const parts = parseDateParts(initialDate);
      setCurrentYear(parts.year);
      setCurrentMonth(parts.month);
      setSelectedDate(initialDate);
    }
  }, [visible, initialDate]);

  if (!visible) return null;

  // Month navigation
  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(prev => prev - 1);
    } else {
      setCurrentMonth(prev => prev - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(prev => prev + 1);
    } else {
      setCurrentMonth(prev => prev + 1);
    }
  };

  // Calendar calculations
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const firstDayIndex = new Date(currentYear, currentMonth, 1).getDay();

  // Days array: null for padding before 1st day, then 1..daysInMonth
  const calendarCells: Array<number | null> = [];
  for (let i = 0; i < firstDayIndex; i++) {
    calendarCells.push(null);
  }
  for (let d = 1; d <= daysInMonth; d++) {
    calendarCells.push(d);
  }

  const formatIso = (year: number, month: number, day: number) => {
    const mm = String(month + 1).padStart(2, '0');
    const dd = String(day).padStart(2, '0');
    return `${year}-${mm}-${dd}`;
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>{title}</Text>
              <Text style={styles.subtitle}>Asia/Kolkata Calendar</Text>
            </View>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Ionicons name="close" size={22} color="#6B5E55" />
            </TouchableOpacity>
          </View>

          {/* Month / Year Navigator */}
          <View style={styles.monthNav}>
            <TouchableOpacity onPress={handlePrevMonth} style={styles.navBtn} activeOpacity={0.7}>
              <Ionicons name="chevron-back" size={18} color="#8C331A" />
            </TouchableOpacity>
            <Text style={styles.monthTitle}>
              {MONTH_NAMES[currentMonth]} {currentYear}
            </Text>
            <TouchableOpacity onPress={handleNextMonth} style={styles.navBtn} activeOpacity={0.7}>
              <Ionicons name="chevron-forward" size={18} color="#8C331A" />
            </TouchableOpacity>
          </View>

          {/* Weekday Labels */}
          <View style={styles.weekRow}>
            {DAY_LABELS.map((day, idx) => (
              <Text key={idx} style={[styles.weekDayText, idx === 0 && { color: '#DC2626' }]}>
                {day}
              </Text>
            ))}
          </View>

          {/* Calendar Grid */}
          <View style={styles.grid}>
            {calendarCells.map((day, idx) => {
              if (day === null) {
                return <View key={idx} style={styles.dayCellEmpty} />;
              }

              const cellIso = formatIso(currentYear, currentMonth, day);
              const isSelected = selectedDate === cellIso;
              const isDisabled = Boolean((minDate && cellIso < minDate) || (maxDate && cellIso > maxDate));

              return (
                <TouchableOpacity
                  key={idx}
                  style={[
                    styles.dayCell,
                    isSelected && styles.dayCellSelected,
                    isDisabled && styles.dayCellDisabled,
                  ]}
                  disabled={isDisabled}
                  onPress={() => {
                    setSelectedDate(cellIso);
                    onSelectDate(cellIso);
                    onClose();
                  }}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.dayText,
                      isSelected && styles.dayTextSelected,
                      isDisabled && styles.dayTextDisabled,
                    ]}
                  >
                    {day}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Footer Cancel Action */}
          <View style={styles.footer}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
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
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    zIndex: 9999,
  },
  card: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 18,
    elevation: 12,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: '800',
    color: '#2C201A',
  },
  subtitle: {
    fontSize: 11,
    color: '#8A7E75',
    marginTop: 1,
  },
  monthNav: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    marginBottom: 8,
    backgroundColor: '#FAF8F5',
    borderRadius: 8,
    paddingHorizontal: 8,
  },
  navBtn: {
    width: 32,
    height: 32,
    borderRadius: 6,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E8E1D9',
  },
  monthTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#2C201A',
  },
  weekRow: {
    flexDirection: 'row',
    marginBottom: 6,
  },
  weekDayText: {
    flex: 1,
    textAlign: 'center',
    fontSize: 11,
    fontWeight: '700',
    color: '#8A7E75',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayCellEmpty: {
    width: '14.28%',
    height: 38,
  },
  dayCell: {
    width: '14.28%',
    height: 38,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
    marginVertical: 1,
  },
  dayCellSelected: {
    backgroundColor: '#8C331A',
  },
  dayCellDisabled: {
    opacity: 0.25,
  },
  dayText: {
    fontSize: 13,
    color: '#2C201A',
    fontWeight: '600',
  },
  dayTextSelected: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  dayTextDisabled: {
    color: '#A09489',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 14,
    borderTopWidth: 1,
    borderTopColor: '#FAF8F5',
    paddingTop: 10,
  },
  cancelBtn: {
    paddingHorizontal: 16,
    paddingVertical: 6,
  },
  cancelBtnText: {
    color: '#6B5E55',
    fontSize: 13,
    fontWeight: '600',
  },
});
