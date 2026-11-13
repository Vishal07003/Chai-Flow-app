import React from 'react';
import { View, StyleSheet } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useApp } from '../context/AppContext';

// Owner Screens (Approved 5 Tabs: Dashboard, Companies, Orders, Billing, More)
import DashboardScreen from '../Screens/owner/DashboardScreen';
import CompaniesScreen from '../Screens/owner/CompaniesScreen';
import OrdersScreen from '../Screens/owner/OrdersScreen';
import QuickBillingScreen from '../Screens/owner/QuickBillingScreen';
import MoreScreen from '../Screens/owner/MoreScreen';

// Delivery Partner Screens
import HomeScreen from '../Screens/delivery/HomeScreen';
import DeliveryOrdersScreen from '../Screens/delivery/OrdersScreen';
import DeliveryPaymentScreen from '../Screens/delivery/PaymentScreen';
import DeliveryProfileScreen from '../Screens/delivery/ProfileScreen';

const Tab = createBottomTabNavigator();

export default function BottomTabs() {
  const { userRole } = useApp();
  const isDeliveryPartner = userRole === 'DELIVERY_PARTNER';

  const activeColor = isDeliveryPartner ? '#059669' : '#8C331A';

  return (
    <Tab.Navigator
      initialRouteName={isDeliveryPartner ? 'Home' : 'Dashboard'}
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: activeColor,
        tabBarInactiveTintColor: '#8E8278',
        tabBarStyle: {
          height: 75,
          paddingBottom: 10,
          paddingTop: 6,
          backgroundColor: '#FAF8F5',
          borderTopColor: '#EFEAE4',
          borderTopWidth: 1,
        },
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '700',
          letterSpacing: 0.3,
        },
        tabBarIcon: ({ color, focused }) => {
          let iconName = 'stats-chart-outline';

          switch (route.name) {
            case 'Home':
              iconName = focused ? 'home' : 'home-outline';
              break;
            case 'DeliveryOrders':
              iconName = focused ? 'bicycle' : 'bicycle-outline';
              break;
            case 'DeliveryPayments':
              iconName = focused ? 'wallet' : 'wallet-outline';
              break;
            case 'DeliveryProfile':
              iconName = focused ? 'person' : 'person-outline';
              break;
            case 'Dashboard':
              iconName = focused ? 'grid' : 'grid-outline';
              break;
            case 'Companies':
              iconName = focused ? 'business' : 'business-outline';
              break;
            case 'Orders':
              iconName = focused ? 'cart' : 'cart-outline';
              break;
            case 'Billing':
              iconName = focused ? 'receipt' : 'receipt-outline';
              break;
            case 'More':
              iconName = focused ? 'ellipsis-horizontal-circle' : 'ellipsis-horizontal-circle-outline';
              break;
          }

          return (
            <View style={styles.iconContainer}>
              <Ionicons name={iconName} size={22} color={color} />
            </View>
          );
        },
      })}
    >
      {isDeliveryPartner ? (
        <>
          <Tab.Screen
            name="Home"
            component={HomeScreen}
            options={{ tabBarLabel: 'HOME' }}
          />
          <Tab.Screen
            name="DeliveryOrders"
            component={DeliveryOrdersScreen}
            options={{ tabBarLabel: 'MY DELIVERIES' }}
          />
          <Tab.Screen
            name="DeliveryPayments"
            component={DeliveryPaymentScreen}
            options={{ tabBarLabel: 'PAYMENTS' }}
          />
          <Tab.Screen
            name="DeliveryProfile"
            component={DeliveryProfileScreen}
            options={{ tabBarLabel: 'PROFILE' }}
          />
        </>
      ) : (
        <>
          <Tab.Screen
            name="Dashboard"
            component={DashboardScreen}
            options={{ tabBarLabel: 'HOME' }}
          />
          <Tab.Screen
            name="Companies"
            component={CompaniesScreen}
            options={{ tabBarLabel: 'COMPANIES' }}
          />
          <Tab.Screen
            name="Orders"
            component={OrdersScreen}
            options={{ tabBarLabel: 'ORDERS' }}
          />
          <Tab.Screen
            name="Billing"
            component={QuickBillingScreen}
            options={{ tabBarLabel: 'BILLING' }}
          />
          <Tab.Screen
            name="More"
            component={MoreScreen}
            options={{ tabBarLabel: 'MORE' }}
          />
        </>
      )}
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 26,
    width: 26,
  },
});
