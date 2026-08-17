import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Keyboard,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import Ionicons from 'react-native-vector-icons/Ionicons';
import Header from '../../components/common/Header';
import { useApp } from '../../context/AppContext';

export default function AddRouteScheduleScreen({ navigation }: any) {
  const { addSchedule, deliveryBoys, customers } = useApp();

  const [timeSlot, setTimeSlot] = useState('06:30 AM - 08:30 AM');
  const [title, setTitle] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState(customers[0]?.name || '');
  const [address, setAddress] = useState(customers[0]?.address || '');
  const [selectedBoy, setSelectedBoy] = useState(deliveryBoys[0]?.name || 'Ramesh Patel');
  const [itemsCount, setItemsCount] = useState('45');
  const [status, setStatus] = useState<'UPCOMING' | 'IN_PROGRESS' | 'COMPLETED'>('UPCOMING');
  const [showToast, setShowToast] = useState(false);

  const handleSelectCustomer = (cust: any) => {
    setSelectedCustomer(cust.name);
    setAddress(cust.address);
  };

  const handleSaveSchedule = () => {
    Keyboard.dismiss();
    const count = parseInt(itemsCount, 10) || 30;

    addSchedule({
      timeSlot: timeSlot || '07:00 AM - 09:00 AM',
      title: title || `${selectedCustomer} Express Route`,
      customerName: selectedCustomer || 'Retail Merchant',
      address: address || 'Main Road Sector 4',
      deliveryBoy: selectedBoy || 'Ramesh Patel',
      status: status,
      itemsCount: count,
    });

    setShowToast(true);
    setTimeout(() => {
      setShowToast(false);
      navigation.goBack();
    }, 1200);
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header with Back Button */}
      <Header title="Schedule Route" showBack={true} />

      {/* Toast Notification */}
      {showToast && (
        <View style={styles.toast}>
          <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />
          <Text style={styles.toastText}>
            Route scheduled & notification sent to delivery partner!
          </Text>
        </View>
      )}

      <KeyboardAwareScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Time Slot Picker */}
        <Text style={styles.label}>Time Slot / Delivery Shift *</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. 06:30 AM - 08:30 AM"
          placeholderTextColor="#B5AAA2"
          value={timeSlot}
          onChangeText={setTimeSlot}
        />

        {/* Route Name */}
        <Text style={styles.label}>Route Title / Name</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. Commercial Street Morning Run"
          placeholderTextColor="#B5AAA2"
          value={title}
          onChangeText={setTitle}
        />

        {/* Quick Select Customer */}
        <Text style={styles.label}>Select Primary Customer</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.chipsRow}
        >
          {customers.map(c => {
            const isSelected = selectedCustomer === c.name;
            return (
              <TouchableOpacity
                key={c.id}
                activeOpacity={0.8}
                onPress={() => handleSelectCustomer(c)}
                style={[
                  styles.chip,
                  isSelected ? styles.activeChip : styles.inactiveChip,
                ]}
              >
                <Text
                  style={[
                    styles.chipText,
                    isSelected ? styles.activeChipText : styles.inactiveChipText,
                  ]}
                >
                  {c.name}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Delivery Address */}
        <Text style={styles.label}>Delivery Destination Address *</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. Shop 12, Commercial Street"
          placeholderTextColor="#B5AAA2"
          value={address}
          onChangeText={setAddress}
        />

        {/* Assigned Delivery Partner */}
        <Text style={styles.label}>Assigned Delivery Partner</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.chipsRow}
        >
          {deliveryBoys.map(boy => {
            const isSelected = selectedBoy === boy.name;
            return (
              <TouchableOpacity
                key={boy.id}
                activeOpacity={0.8}
                onPress={() => setSelectedBoy(boy.name)}
                style={[
                  styles.chip,
                  isSelected ? styles.activeChip : styles.inactiveChip,
                ]}
              >
                <Text
                  style={[
                    styles.chipText,
                    isSelected ? styles.activeChipText : styles.inactiveChipText,
                  ]}
                >
                  🚚 {boy.name} ({boy.status})
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Expected Quantity / Cups */}
        <Text style={styles.label}>Order Quantity (Cups / Units)</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. 50"
          placeholderTextColor="#B5AAA2"
          keyboardType="numeric"
          value={itemsCount}
          onChangeText={setItemsCount}
        />

        {/* Schedule Status */}
        <Text style={styles.label}>Status</Text>
        <View style={styles.statusRow}>
          {(['UPCOMING', 'IN_PROGRESS', 'COMPLETED'] as const).map(st => {
            const isActive = status === st;
            return (
              <TouchableOpacity
                key={st}
                activeOpacity={0.8}
                onPress={() => setStatus(st)}
                style={[
                  styles.statusChip,
                  isActive ? styles.activeStatusChip : styles.inactiveStatusChip,
                ]}
              >
                <Text
                  style={[
                    styles.statusChipText,
                    isActive
                      ? styles.activeStatusChipText
                      : styles.inactiveStatusChipText,
                  ]}
                >
                  {st === 'UPCOMING'
                    ? '⏰ Scheduled'
                    : st === 'IN_PROGRESS'
                    ? '🚚 In Progress'
                    : '✅ Completed'}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Submit Schedule Button */}
        <TouchableOpacity
          activeOpacity={0.8}
          style={styles.submitBtn}
          onPress={handleSaveSchedule}
        >
          <Ionicons name="calendar" size={20} color="#FFFFFF" style={{ marginRight: 8 }} />
          <Text style={styles.submitBtnText}>Confirm Route Schedule</Text>
        </TouchableOpacity>
      </KeyboardAwareScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAF8F5',
  },
  toast: {
    position: 'absolute',
    top: 50,
    left: 20,
    right: 20,
    backgroundColor: '#10B981',
    borderRadius: 14,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 999,
    elevation: 6,
  },
  toastText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
    marginLeft: 10,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 40,
  },

  label: {
    fontSize: 13,
    fontWeight: '700',
    color: '#2C201A',
    marginBottom: 6,
    marginTop: 8,
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#EFECE9',
    paddingHorizontal: 16,
    height: 50,
    fontSize: 14,
    color: '#2C201A',
    marginBottom: 10,
  },

  chipsRow: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
    marginRight: 8,
    borderWidth: 1,
  },
  activeChip: {
    backgroundColor: '#8C331A',
    borderColor: '#8C331A',
  },
  inactiveChip: {
    backgroundColor: '#FFFFFF',
    borderColor: '#EFECE9',
  },
  chipText: {
    fontSize: 13,
    fontWeight: '600',
  },
  activeChipText: {
    color: '#FFFFFF',
  },
  inactiveChipText: {
    color: '#6E6259',
  },

  statusRow: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  statusChip: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 14,
    alignItems: 'center',
    marginRight: 6,
    borderWidth: 1,
  },
  activeStatusChip: {
    backgroundColor: '#8C331A',
    borderColor: '#8C331A',
  },
  inactiveStatusChip: {
    backgroundColor: '#FFFFFF',
    borderColor: '#EFECE9',
  },
  statusChipText: {
    fontSize: 11,
    fontWeight: '700',
  },
  activeStatusChipText: {
    color: '#FFFFFF',
  },
  inactiveStatusChipText: {
    color: '#6E6259',
  },

  submitBtn: {
    backgroundColor: '#8C331A',
    borderRadius: 24,
    height: 52,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 20,
    elevation: 3,
    shadowColor: '#8C331A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
  },
  submitBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});
