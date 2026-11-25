import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  StyleProp,
  ViewStyle,
  TextStyle,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import TimePickerModal from './TimePickerModal';

export interface AppTimePickerProps {
  label?: string;
  value?: string; // Expects "HH:MM" or "HH:MM:SS" (24-hour format)
  placeholder?: string;
  onChange: (time24: string) => void; // Returns "HH:MM" (or "HH:MM:00")
  outputFormat?: 'HH:MM' | 'HH:MM:SS';
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  inputStyle?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  modalTitle?: string;
  required?: boolean;
}

/**
 * Converts 24-hour "HH:MM" or "HH:MM:SS" string to 12-hour "hh:mm AM/PM"
 */
export function format24To12(time24?: string): string {
  if (!time24) return '';
  const parts = time24.split(':');
  if (parts.length < 2) return time24;
  let h = parseInt(parts[0], 10);
  const m = parts[1].padStart(2, '0');
  if (isNaN(h)) return time24;
  const period = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${String(h12).padStart(2, '0')}:${m} ${period}`;
}

export const AppTimePicker: React.FC<AppTimePickerProps> = ({
  label,
  value,
  placeholder = 'Select time',
  onChange,
  outputFormat = 'HH:MM',
  disabled = false,
  style,
  inputStyle,
  textStyle,
  modalTitle = 'Select Time',
  required = false,
}) => {
  const [modalVisible, setModalVisible] = useState(false);

  // Normalize initial time for TimePickerModal (expects "HH:MM:SS")
  const initialTimeStr = value
    ? value.length === 5
      ? `${value}:00`
      : value
    : '08:00:00';

  const displayTime = value ? format24To12(value) : '';

  return (
    <View style={[styles.container, style]}>
      {label ? (
        <Text style={styles.label}>
          {label}
          {required ? <Text style={styles.requiredStar}> *</Text> : null}
        </Text>
      ) : null}

      <TouchableOpacity
        activeOpacity={disabled ? 1 : 0.75}
        onPress={() => {
          if (!disabled) {
            setModalVisible(true);
          }
        }}
        style={[
          styles.selectorBox,
          disabled && styles.selectorDisabled,
          inputStyle,
        ]}
        accessibilityRole="button"
        accessibilityLabel={label || placeholder}
      >
        <Ionicons
          name="time-outline"
          size={18}
          color="#8C331A"
          style={styles.icon}
        />
        <Text
          style={[
            styles.valueText,
            !displayTime && styles.placeholderText,
            textStyle,
          ]}
          numberOfLines={1}
        >
          {displayTime || placeholder}
        </Text>
        <Ionicons
          name="chevron-down"
          size={14}
          color="#8C331A"
          style={styles.chevron}
        />
      </TouchableOpacity>

      <TimePickerModal
        visible={modalVisible}
        title={modalTitle}
        initialTime={initialTimeStr}
        onClose={() => setModalVisible(false)}
        onSelectTime={(timeString: string) => {
          // timeString is returned as "HH:MM:00"
          const result = outputFormat === 'HH:MM' ? timeString.substring(0, 5) : timeString;
          onChange(result);
          setModalVisible(false);
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    color: '#8C331A',
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  requiredStar: {
    color: '#DC2626',
  },
  selectorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#E8D7CE',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    minHeight: 44,
  },
  selectorDisabled: {
    backgroundColor: '#F3F4F6',
    borderColor: '#E5E7EB',
  },
  icon: {
    marginRight: 8,
  },
  valueText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '700',
    color: '#1F2937',
  },
  placeholderText: {
    color: '#9CA3AF',
    fontWeight: '500',
  },
  chevron: {
    marginLeft: 6,
  },
});

export default AppTimePicker;
