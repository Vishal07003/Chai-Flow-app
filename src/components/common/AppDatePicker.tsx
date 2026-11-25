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
import CalendarPickerModal from './CalendarPickerModal';

export interface AppDatePickerProps {
  label?: string;
  value?: string; // YYYY-MM-DD
  placeholder?: string;
  minDate?: string;
  maxDate?: string;
  onChange: (date: string) => void;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  inputStyle?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  modalTitle?: string;
  required?: boolean;
  clearable?: boolean;
}

export const AppDatePicker: React.FC<AppDatePickerProps> = ({
  label,
  value,
  placeholder = 'Select date',
  minDate,
  maxDate,
  onChange,
  disabled = false,
  style,
  inputStyle,
  textStyle,
  modalTitle = 'Select Date',
  required = false,
  clearable = false,
}) => {
  const [modalVisible, setModalVisible] = useState(false);

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
          name="calendar-outline"
          size={18}
          color="#8C331A"
          style={styles.icon}
        />
        <Text
          style={[
            styles.valueText,
            !value && styles.placeholderText,
            textStyle,
          ]}
          numberOfLines={1}
        >
          {value || placeholder}
        </Text>

        {clearable && value && !disabled ? (
          <TouchableOpacity
            onPress={(e) => {
              e.stopPropagation();
              onChange('');
            }}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            style={styles.clearBtn}
          >
            <Ionicons name="close-circle" size={16} color="#9CA3AF" />
          </TouchableOpacity>
        ) : (
          <Ionicons
            name="chevron-down"
            size={14}
            color="#8C331A"
            style={styles.chevron}
          />
        )}
      </TouchableOpacity>

      <CalendarPickerModal
        visible={modalVisible}
        title={modalTitle}
        initialDate={value || undefined}
        minDate={minDate}
        maxDate={maxDate}
        onClose={() => setModalVisible(false)}
        onSelectDate={(selectedDate: string) => {
          onChange(selectedDate);
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
  clearBtn: {
    padding: 2,
    marginLeft: 6,
  },
  chevron: {
    marginLeft: 6,
  },
});

export default AppDatePicker;
