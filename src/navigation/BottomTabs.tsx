import React from 'react';
import { View, StyleSheet } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useApp } from '../context/AppContext';

// Owner Screens
import DashboardScreen from '../Screens/owner/DashboardScreen';
import CustomersScreen from '../Screens/owner/CustomersScreen';
import ProductsScreen from '../Screens/owner/ProductsScreen';
import DeliveryScreen from '../Screens/owner/DeliveryScreen';
import ScheduleScreen from '../Screens/owner/ScheduleScreen';

// Delivery Partner Screens
import HomeScreen from '../Screens/delivery/HomeScreen';
import OrdersScreen from '../Screens/delivery/OrdersScreen';
import PaymentScreen from '../Screens/delivery/PaymentScreen';
import ProfileScreen from '../Screens/delivery/ProfileScreen';

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
            case 'Orders':
              iconName = focused ? 'receipt' : 'receipt-outline';
              break;
            case 'Payments':
              iconName = focused ? 'wallet' : 'wallet-outline';
              break;
            case 'Profile':
              iconName = focused ? 'person' : 'person-outline';
              break;
            case 'Dashboard':
              iconName = focused ? 'grid' : 'grid-outline';
              break;
            case 'Customers':
              iconName = focused ? 'people' : 'people-outline';
              break;
            case 'Products':
              iconName = focused ? 'cube' : 'cube-outline';
              break;
            case 'Delivery':
              iconName = focused ? 'bicycle' : 'bicycle-outline';
              break;
            case 'Schedule':
              iconName = focused ? 'calendar' : 'calendar-outline';
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
            name="Orders"
            component={OrdersScreen}
            options={{ tabBarLabel: 'ORDERS' }}
          />
          <Tab.Screen
            name="Payments"
            component={PaymentScreen}
            options={{ tabBarLabel: 'PAYMENTS' }}
          />
          <Tab.Screen
            name="Profile"
            component={ProfileScreen}
            options={{ tabBarLabel: 'PROFILE' }}
          />
        </>
      ) : (
        <>
          <Tab.Screen
            name="Dashboard"
            component={DashboardScreen}
            options={{ tabBarLabel: 'DASHBOARD' }}
          />
          <Tab.Screen
            name="Customers"
            component={CustomersScreen}
            options={{ tabBarLabel: 'CUSTOMERS' }}
          />
          <Tab.Screen
            name="Products"
            component={ProductsScreen}
            options={{ tabBarLabel: 'PRODUCTS' }}
          />
          <Tab.Screen
            name="Delivery"
            component={DeliveryScreen}
            options={{ tabBarLabel: 'BOYS' }}
          />
          <Tab.Screen
            name="Schedule"
            component={ScheduleScreen}
            options={{ tabBarLabel: 'SCHEDULE' }}
          />
        </>
      )}
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  iconContainer: {
    width: 28,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
});
