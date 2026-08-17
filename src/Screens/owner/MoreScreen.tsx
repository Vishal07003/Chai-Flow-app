import React from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { Header } from '../../components/common';

export default function MoreScreen() {
  const navigation = useNavigation<any>();

  const tools = [
    {
      id: 'quick-billing',
      title: 'Quick Billing',
      icon: 'bag-outline',
      onPress: () => navigation.navigate('QuickBilling'),
    },
    {
      id: 'add-customer',
      title: 'Add Customer',
      icon: 'person-add-outline',
      onPress: () => navigation.navigate('AddLead'),
    },
    {
      id: 'add-product',
      title: 'Add Product',
      icon: 'add-outline',
      onPress: () => navigation.navigate('ProductDetail', { mode: 'add' }),
    },
    {
      id: 'create-order',
      title: 'Create Order',
      icon: 'bag-handle-outline',
      onPress: () => navigation.navigate('CreateInvoice'),
    },
    {
      id: 'all-orders',
      title: 'All Orders',
      icon: 'newspaper-outline',
      onPress: () => navigation.navigate('Invoices'),
    },
    {
      id: 'pending-payments',
      title: 'Pending Payments',
      icon: 'wallet-outline',
      onPress: () => navigation.navigate('PendingPayments'),
    },
    {
      id: 'invoices',
      title: 'Invoices',
      icon: 'newspaper-outline',
      onPress: () => navigation.navigate('Invoices'),
    },
    {
      id: 'route-dispatch',
      title: 'Route Dispatch',
      icon: 'bicycle-outline',
      onPress: () => navigation.navigate('AddRouteSchedule'),
    },
    {
      id: 'my-profile',
      title: 'My Profile',
      icon: 'person-outline',
      onPress: () => navigation.navigate('Profile'),
    },
    {
      id: 'settings',
      title: 'Settings',
      icon: 'settings-outline',
      onPress: () => navigation.navigate('Settings'),
    },
  ];

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      {/* Header with Title and Back Action (hides profile & drawer icons) */}
      <Header title="More" showBack={true} showNotification={false} />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Title Section */}
        <View style={styles.titleSection}>
          <Text style={styles.mainTitle}>All tools</Text>
          <Text style={styles.subTitle}>
            Every ChaiFlow screen, one tap away.
          </Text>
        </View>

        {/* 2-Column Grid */}
        <View style={styles.gridContainer}>
          {tools.map(tool => (
            <TouchableOpacity
              key={tool.id}
              activeOpacity={0.8}
              style={styles.card}
              onPress={tool.onPress}
            >
              <View style={styles.iconCircle}>
                <Ionicons name={tool.icon} size={22} color="#8C331A" />
              </View>
              <Text style={styles.cardTitle}>{tool.title}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAF8F5',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 24,
  },
  titleSection: {
    marginBottom: 16,
  },
  mainTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#1F1511',
    marginBottom: 4,
  },
  subTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#7C6E65',
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  card: {
    width: '48%',
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 18,
    marginBottom: 14,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FDEBE4',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1F1511',
  },
});
