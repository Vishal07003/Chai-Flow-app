import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createDrawerNavigator } from '@react-navigation/drawer';
import BottomTabs from './BottomTabs';
import ProfileScreen from '../Screens/owner/ProfileScreen';
import CustomerDetailScreen from '../Screens/owner/CustomerDetailScreen';
import AddLeadScreen from '../Screens/owner/AddLeadScreen';
import InvoicesScreen from '../Screens/owner/InvoicesScreen';
import CreateInvoiceScreen from '../Screens/owner/CreateInvoiceScreen';
import QuickBillingScreen from '../Screens/owner/QuickBillingScreen';
import InvoiceDetailScreen from '../Screens/owner/InvoiceDetailScreen';
import ProductDetailScreen from '../Screens/owner/ProductDetailScreen';
import ReportsScreen from '../Screens/owner/ReportsScreen';
import AddDeliveryBoyScreen from '../Screens/owner/AddDeliveryBoyScreen';
import AddRouteScheduleScreen from '../Screens/owner/AddRouteScheduleScreen';
import RouteBoysScreen from '../Screens/owner/RouteBoysScreen';
import SettingsScreen from '../Screens/owner/SettingsScreen';
import NotificationsScreen from '../Screens/NotificationsScreen';
import PendingPaymentsScreen from '../Screens/owner/PendingPaymentsScreen';
import MoreScreen from '../Screens/owner/MoreScreen';
import OrdersScreen from '../Screens/owner/OrdersScreen';
import ProfileDrawer from '../components/profile/ProfileDrawer';

export type OwnerStackParamList = {
  MainTabs: undefined;
  Profile: undefined;
  Settings: undefined;
  CustomerDetail: { customerId?: string; customer?: any } | undefined;
  AddLead: undefined;
  Invoices: undefined;
  Orders: undefined;
  PendingPayments: undefined;
  CreateInvoice: undefined;
  QuickBilling: undefined;
  InvoiceDetail: { invoice?: any } | undefined;
  ProductDetail: { product?: any; mode?: 'add' | 'edit' } | undefined;
  Reports: undefined;
  AddDeliveryBoy: undefined;
  AddRouteSchedule: undefined;
  RouteBoys: undefined;
  Notifications: undefined;
  More: undefined;
};

const Stack = createNativeStackNavigator<OwnerStackParamList>();
const Drawer = createDrawerNavigator();

function OwnerDrawerNavigator() {
  return (
    <Drawer.Navigator
      drawerContent={(props) => <ProfileDrawer {...props} />}
      screenOptions={{
        headerShown: false,
        drawerPosition: 'right',
        drawerType: 'front',
        swipeEnabled: false,
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

export default function OwnerNavigator() {
  return (
    <Stack.Navigator
      initialRouteName="MainTabs"
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="MainTabs" component={OwnerDrawerNavigator} />
      <Stack.Screen name="Profile" component={ProfileScreen} />
      <Stack.Screen name="Settings" component={SettingsScreen} />
      <Stack.Screen name="CustomerDetail" component={CustomerDetailScreen} />
      <Stack.Screen name="AddLead" component={AddLeadScreen} />
      <Stack.Screen name="Invoices" component={InvoicesScreen} />
      <Stack.Screen name="PendingPayments" component={PendingPaymentsScreen} />
      <Stack.Screen name="CreateInvoice" component={CreateInvoiceScreen} />
      <Stack.Screen name="QuickBilling" component={QuickBillingScreen} />
      <Stack.Screen name="InvoiceDetail" component={InvoiceDetailScreen} />
      <Stack.Screen name="ProductDetail" component={ProductDetailScreen} />
      <Stack.Screen name="Reports" component={ReportsScreen} />
      <Stack.Screen name="AddDeliveryBoy" component={AddDeliveryBoyScreen} />
      <Stack.Screen name="AddRouteSchedule" component={AddRouteScheduleScreen} />
      <Stack.Screen name="RouteBoys" component={RouteBoysScreen} />
      <Stack.Screen name="Notifications" component={NotificationsScreen} />
      <Stack.Screen name="More" component={MoreScreen} />
      <Stack.Screen name="Orders" component={OrdersScreen} />
    </Stack.Navigator>
  );
}
