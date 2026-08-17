import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Keyboard,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import Ionicons from 'react-native-vector-icons/Ionicons';
import Header from '../../components/common/Header';
import { useApp } from '../../context/AppContext';
import { validation } from '../../utils/validation';
import { AppToast } from '../../utils/toast';

export default function AddLeadScreen({ navigation }: any) {
  const { addCustomer } = useApp();

  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [areaAddress, setAreaAddress] = useState('');
  const [expectedCups, setExpectedCups] = useState('');
  const [notes, setNotes] = useState('');

  const handleSaveLead = () => {
    Keyboard.dismiss();

    // 1. Full Name Validation
    if (!validation.isNotEmpty(fullName)) {
      AppToast.error('Validation Error', 'Please enter customer full name.');
      return;
    }

    // 2. Mobile Number Validation
    if (!validation.isValidPhone(phone)) {
      AppToast.error('Validation Error', 'Please enter a valid 10-digit mobile number.');
      return;
    }

    // 3. Email / Gmail Validation (Optional field, but validate if entered)
    if (email.trim() && !validation.isValidEmail(email)) {
      AppToast.error('Validation Error', 'Please enter a valid email address (e.g. name@gmail.com).');
      return;
    }

    const address = areaAddress.trim() || 'Sector 14, Block B';
    const cups = expectedCups.trim() || '40';

    addCustomer({
      name: fullName.trim(),
      address: address,
      amount: 0,
      deliveryStatus: `Customer · ${cups} cups/day`,
      isOverdue: false,
    });

    AppToast.success('Success', 'Customer saved successfully!');

    setTimeout(() => {
      if (navigation.canGoBack()) {
        navigation.goBack();
      } else {
        navigation.navigate('MainTabs', { screen: 'Customers' });
      }
    }, 1200);
  };

  return (
    <SafeAreaView style={styles.container}>
      <Header title="Add Customer" showBack={true} />

      <KeyboardAwareScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        extraScrollHeight={30}
      >
        <View style={styles.headerRow}>
          <View style={styles.iconCircle}>
            <Ionicons name="person-add-outline" size={22} color="#963819" />
          </View>
          <Text style={styles.mainTitle}>New Customer</Text>
        </View>

        <Text style={styles.subtitle}>
          Add a customer and save their contact details.
        </Text>

        {/* Full Name */}
        <Text style={styles.label}>Full name *</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. Rohit Sharma"
          placeholderTextColor="#B5AAA2"
          value={fullName}
          onChangeText={setFullName}
        />

        {/* Mobile Number */}
        <Text style={styles.label}>Phone number *</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. 9876543210"
          placeholderTextColor="#B5AAA2"
          keyboardType="phone-pad"
          maxLength={10}
          value={phone}
          onChangeText={setPhone}
        />

        {/* Gmail / Email */}
        <Text style={styles.label}>Email address (Gmail)</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. rohit@gmail.com"
          placeholderTextColor="#B5AAA2"
          keyboardType="email-address"
          autoCapitalize="none"
          value={email}
          onChangeText={setEmail}
        />

        {/* Area / Address */}
        <Text style={styles.label}>Area / address</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. Sector 14, Block B"
          placeholderTextColor="#B5AAA2"
          value={areaAddress}
          onChangeText={setAreaAddress}
        />

        {/* Daily Cups */}
        <Text style={styles.label}>Expected cups / day</Text>
        <TextInput
          style={styles.input}
          placeholder="40"
          placeholderTextColor="#B5AAA2"
          keyboardType="numeric"
          value={expectedCups}
          onChangeText={setExpectedCups}
        />

        {/* Notes */}
        <Text style={styles.label}>Notes</Text>
        <TextInput
          style={[styles.input, styles.multilineInput]}
          placeholder="Prefers morning delivery"
          placeholderTextColor="#B5AAA2"
          multiline={true}
          numberOfLines={3}
          textAlignVertical="top"
          value={notes}
          onChangeText={setNotes}
        />

        {/* Save Lead Button */}
        <TouchableOpacity
          activeOpacity={0.8}
          style={styles.saveBtn}
          onPress={handleSaveLead}
        >
          <Text style={styles.saveBtnText}>Save customer</Text>
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
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 40,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FDEEEB',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  mainTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#2C201A',
  },
  subtitle: {
    fontSize: 14,
    color: '#7C6E65',
    lineHeight: 20,
    marginBottom: 24,
    fontWeight: '400',
  },
  label: {
    fontSize: 14,
    fontWeight: '700',
    color: '#2C201A',
    marginBottom: 8,
    marginTop: 4,
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#EFECE9',
    paddingHorizontal: 18,
    height: 52,
    fontSize: 15,
    color: '#2C201A',
    marginBottom: 16,
  },
  multilineInput: {
    height: 96,
    paddingTop: 14,
    paddingBottom: 14,
  },
  saveBtn: {
    backgroundColor: '#963819',
    borderRadius: 26,
    height: 54,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 12,
    marginBottom: 20,
    elevation: 3,
    shadowColor: '#963819',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
  },
  saveBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});
