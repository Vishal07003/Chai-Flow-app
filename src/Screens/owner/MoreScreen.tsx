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

interface ToolItem {
  id: string;
  title: string;
  subtitle: string;
  icon: string;
  onPress: () => void;
}

interface ToolSection {
  title: string;
  items: ToolItem[];
}

export default function MoreScreen() {
  const navigation = useNavigation<any>();

  const sections: ToolSection[] = [
    {
      title: 'CATALOG',
      items: [
        {
          id: 'products',
          title: 'Products',
          subtitle: 'Manage items, pricing & stock',
          icon: 'cube-outline',
          onPress: () => navigation.navigate('Products'),
        },
      ],
    },
    {
      title: 'BILLING',
      items: [
        {
          id: 'invoices',
          title: 'Invoices',
          subtitle: 'All daily invoices, receipts & A4 downloads',
          icon: 'receipt-outline',
          onPress: () => navigation.navigate('Invoices'),
        },
        {
          id: 'pending-payments',
          title: 'Pending Payments',
          subtitle: 'Track unpaid invoices & collect due',
          icon: 'time-outline',
          onPress: () => navigation.navigate('PendingPayments'),
        },
      ],
    },
    {
      title: 'FLEET',
      items: [
        {
          id: 'delivery-partners',
          title: 'Delivery Partners',
          subtitle: 'Fleet status, register & assignments',
          icon: 'bicycle-outline',
          onPress: () => navigation.navigate('Delivery'),
        },
      ],
    },
    {
      title: 'ACCOUNT',
      items: [
        {
          id: 'profile',
          title: 'Store Profile',
          subtitle: 'Store details & identity',
          icon: 'person-outline',
          onPress: () => navigation.navigate('Profile'),
        },
        {
          id: 'settings',
          title: 'Settings',
          subtitle: 'App preferences & configurations',
          icon: 'settings-outline',
          onPress: () => navigation.navigate('Settings'),
        },
      ],
    },
  ];

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      {/* Header */}
      <Header title="More Tools" showBack={false} showNotification={true} />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {sections.map(section => (
          <View key={section.title} style={styles.sectionContainer}>
            <Text style={styles.sectionHeaderTitle}>{section.title}</Text>
            <View style={styles.sectionCardGroup}>
              {section.items.map((item, index) => {
                const isLast = index === section.items.length - 1;
                return (
                  <TouchableOpacity
                    key={item.id}
                    activeOpacity={0.7}
                    style={[styles.rowItem, isLast && styles.rowItemLast]}
                    onPress={item.onPress}
                  >
                    <View style={styles.iconCircle}>
                      <Ionicons name={item.icon} size={20} color="#8C331A" />
                    </View>
                    <View style={styles.itemTextContainer}>
                      <Text style={styles.itemTitle}>{item.title}</Text>
                      <Text style={styles.itemSubtitle}>{item.subtitle}</Text>
                    </View>
                    <Ionicons
                      name="chevron-forward"
                      size={18}
                      color="#A09489"
                    />
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        ))}
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
    paddingBottom: 36,
  },
  sectionContainer: {
    marginBottom: 20,
  },
  sectionHeaderTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#8A7E75',
    letterSpacing: 0.8,
    marginBottom: 8,
    marginLeft: 4,
  },
  sectionCardGroup: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#EFECE9',
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
  },
  rowItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F6F3EE',
  },
  rowItemLast: {
    borderBottomWidth: 0,
  },
  iconCircle: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#FDEBE4',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  itemTextContainer: {
    flex: 1,
  },
  itemTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1F1511',
    marginBottom: 2,
  },
  itemSubtitle: {
    fontSize: 11,
    color: '#8A7E75',
  },
});
