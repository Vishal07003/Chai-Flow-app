import React from 'react';
import { View, StyleSheet } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useApp } from '../context/AppContext';
import { colors } from '../theme';

// Owner Screens (Approved 5 Tabs: Dashboard, Customers, Orders, Billing, More)
import DashboardScreen from '../Screens/owner/DashboardScreen';
import CustomersScreen from '../Screens/owner/CustomersScreen';
import OrdersScreen from '../Screens/owner/OrdersScreen';
import DailyBillsScreen from '../Screens/owner/DailyBillsScreen';
import QuickBillingScreen from '../Screens/owner/QuickBillingScreen';
import MoreScreen from '../Screens/owner/MoreScreen';

// Delivery Partner Screens (Approved 5 Tabs: Home, My Deliveries, Tracking, History, Profile)
import HomeScreen from '../Screens/delivery/HomeScreen';
import DeliveryOrdersScreen from '../Screens/delivery/OrdersScreen';
import TrackingScreen from '../Screens/delivery/TrackingScreen';
import DeliveryHistoryScreen from '../Screens/delivery/HistoryScreen';
import DeliveryProfileScreen from '../Screens/delivery/ProfileScreen';

const Tab = createBottomTabNavigator();

export default function BottomTabs() {
  const { userRole } = useApp();
  const isDeliveryPartner = userRole === 'DELIVERY_PARTNER';

  // Unified Chai Flow Brand Identity across both Owner and Delivery Partner apps
  const activeColor = colors.primary; // #8C331A

  return (
    <Tab.Navigator
      initialRouteName={isDeliveryPartner ? 'Home' : 'Dashboard'}
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: activeColor,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: {
          height: 75,
          paddingBottom: 10,
          paddingTop: 6,
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          borderTopWidth: 1,
        },
        tabBarLabelStyle: {
          fontSize: 9,
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
            case 'Tracking':
              iconName = focused ? 'navigate' : 'navigate-outline';
              break;
            case 'History':
              iconName = focused ? 'time' : 'time-outline';
              break;
            case 'DeliveryProfile':
              iconName = focused ? 'person' : 'person-outline';
              break;
            case 'Dashboard':
              iconName = focused ? 'grid' : 'grid-outline';
              break;
            case 'Customers':
              iconName = focused ? 'people' : 'people-outline';
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
            name="Tracking"
            component={TrackingScreen}
            options={{ tabBarLabel: 'TRACKING' }}
          />
          <Tab.Screen
            name="History"
            component={DeliveryHistoryScreen}
            options={{ tabBarLabel: 'HISTORY' }}
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
            name="Customers"
            component={CustomersScreen}
            options={{ tabBarLabel: 'CUSTOMERS' }}
          />
          <Tab.Screen
            name="Orders"
            component={OrdersScreen}
            options={{ tabBarLabel: 'ORDERS' }}
          />
          <Tab.Screen
            name="Billing"
            component={DailyBillsScreen}
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
