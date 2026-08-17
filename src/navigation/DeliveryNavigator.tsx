import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createDrawerNavigator } from '@react-navigation/drawer';
import BottomTabs from './BottomTabs';
import SplashScreen from '../Screens/delivery/SplashScreen';
import LoginScreen from '../Screens/delivery/LoginScreen';
import HomeScreen from '../Screens/delivery/HomeScreen';
import OrdersScreen from '../Screens/delivery/OrdersScreen';
import OrderDetailsScreen from '../Screens/delivery/OrderDetailsScreen';
import NavigationScreen from '../Screens/delivery/NavigationScreen';
import PaymentScreen from '../Screens/delivery/PaymentScreen';
import EarningsScreen from '../Screens/delivery/EarningsScreen';
import NotificationsScreen from '../Screens/delivery/NotificationsScreen';
import ProfileScreen from '../Screens/delivery/ProfileScreen';
import SettingsScreen from '../Screens/delivery/SettingsScreen';
import ProfileDrawer from '../components/profile/ProfileDrawer';

export type DeliveryStackParamList = {
  Splash: undefined;
  Login: undefined;
  Home: undefined;
  MainTabs: undefined;
  Orders: undefined;
  OrderDetails: { order?: any };
  Navigation: undefined;
  Payment: undefined;
  Earnings: undefined;
  Notifications: undefined;
  Profile: undefined;
  Settings: undefined;
};

const Stack = createNativeStackNavigator<DeliveryStackParamList>();
const Drawer = createDrawerNavigator();

function DeliveryDrawerNavigator() {
  return (
    <Drawer.Navigator
      drawerContent={props => <ProfileDrawer {...props} />}
      screenOptions={{
        headerShown: false,
        drawerPosition: 'right',
        drawerType: 'front',
        swipeEnabled: true,
        swipeEdgeWidth: 60,
        overlayColor: 'rgba(0, 0, 0, 0.45)',
        sceneStyle: { backgroundColor: '#FAF8F5' },
        drawerStyle: {
          width: '66%',
          maxWidth: 285,
          backgroundColor: '#FFFFFF',
          shadowColor: '#000',
          shadowOffset: { width: -4, height: 0 },
          shadowOpacity: 0.15,
          shadowRadius: 10,
          elevation: 10,
        },
      }}
    >
      <Drawer.Screen name="BottomTabs" component={BottomTabs} />
    </Drawer.Navigator>
  );
}

export default function DeliveryNavigator() {
  return (
    <Stack.Navigator
      initialRouteName="MainTabs"
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="MainTabs" component={DeliveryDrawerNavigator} />
      <Stack.Screen name="Splash" component={SplashScreen} />
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Home" component={HomeScreen} />
      <Stack.Screen name="Orders" component={OrdersScreen} />
      <Stack.Screen name="OrderDetails" component={OrderDetailsScreen} />
      <Stack.Screen name="Navigation" component={NavigationScreen} />
      <Stack.Screen name="Payment" component={PaymentScreen} />
      <Stack.Screen name="Earnings" component={EarningsScreen} />
      <Stack.Screen name="Notifications" component={NotificationsScreen} />
      <Stack.Screen name="Profile" component={ProfileScreen} />
      <Stack.Screen name="Settings" component={SettingsScreen} />
    </Stack.Navigator>
  );
}
