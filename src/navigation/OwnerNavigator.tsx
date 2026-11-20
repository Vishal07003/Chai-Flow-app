import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createDrawerNavigator } from '@react-navigation/drawer';
import BottomTabs from './BottomTabs';
import ProfileScreen from '../Screens/owner/ProfileScreen';
import CustomerDetailScreen from '../Screens/owner/CustomerDetailScreen';
import InvoicesScreen from '../Screens/owner/InvoicesScreen';
import QuickBillingScreen from '../Screens/owner/QuickBillingScreen';
import InvoiceDetailScreen from '../Screens/owner/InvoiceDetailScreen';
import ProductDetailScreen from '../Screens/owner/ProductDetailScreen';
import ReportsScreen from '../Screens/owner/ReportsScreen';
import AddDeliveryBoyScreen from '../Screens/owner/AddDeliveryBoyScreen';
import SettingsScreen from '../Screens/owner/SettingsScreen';
import NotificationsScreen from '../Screens/NotificationsScreen';
import PendingPaymentsScreen from '../Screens/owner/PendingPaymentsScreen';
import MoreScreen from '../Screens/owner/MoreScreen';
import OrdersScreen from '../Screens/owner/OrdersScreen';
import OrderDetailsScreen from '../Screens/owner/OrderDetailsScreen';
import CustomersScreen from '../Screens/owner/CustomersScreen';
import ProductsScreen from '../Screens/owner/ProductsScreen';
import DeliveryScreen from '../Screens/owner/DeliveryScreen';
import OwnerDeliveryTrackingScreen from '../Screens/owner/DeliveryTrackingScreen';
import RecurringOrderScreen from '../Screens/owner/RecurringOrderScreen';
import ProfileDrawer from '../components/profile/ProfileDrawer';

export type OwnerStackParamList = {
  MainTabs: undefined;
  Profile: undefined;
  Settings: undefined;
  CustomerDetail: { customerId?: string; customer?: any } | undefined;
  Invoices: undefined;
  Orders: undefined;
  PendingPayments: undefined;
  CreateInvoice: { customer?: any; prefilledItems?: Array<{ product_id: number; product_name?: string; quantity: number }> } | undefined;
  QuickBilling: { customer?: any; prefilledItems?: Array<{ product_id: number; product_name?: string; quantity: number }>; mode?: 'billing' | 'order' } | undefined;
  InvoiceDetail: { invoice?: any } | undefined;
  Products: undefined;
  ProductDetail: { product?: any; mode?: 'add' | 'edit' } | undefined;
  Reports: undefined;
  Delivery: undefined;
  DeliveryTracking: { deliveryId: number | string };
  AddDeliveryBoy: undefined;
  Notifications: undefined;
  More: undefined;
  Customers: undefined;
  OrderDetails: { orderId?: number | string; order?: any };
  RecurringOrder: { template?: any; customer?: any; customerId?: any; prefilledItems?: any } | undefined;
  CreateOrder: { customer?: any; customerId?: any; mode?: 'order' } | undefined;
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
      <Stack.Screen name="Invoices" component={InvoicesScreen} />
      <Stack.Screen name="PendingPayments" component={PendingPaymentsScreen} />
      <Stack.Screen name="CreateInvoice" component={QuickBillingScreen} />
      <Stack.Screen name="QuickBilling" component={QuickBillingScreen} />
      <Stack.Screen name="InvoiceDetail" component={InvoiceDetailScreen} />
      <Stack.Screen name="Products" component={ProductsScreen} />
      <Stack.Screen name="ProductDetail" component={ProductDetailScreen} />
      <Stack.Screen name="Reports" component={ReportsScreen} />
      <Stack.Screen name="Delivery" component={DeliveryScreen} />
      <Stack.Screen name="DeliveryTracking" component={OwnerDeliveryTrackingScreen} />
      <Stack.Screen name="AddDeliveryBoy" component={AddDeliveryBoyScreen} />
      <Stack.Screen name="Notifications" component={NotificationsScreen} />
      <Stack.Screen name="More" component={MoreScreen} />
      <Stack.Screen name="Orders" component={OrdersScreen} />
      <Stack.Screen name="OrderDetails" component={OrderDetailsScreen} />
      <Stack.Screen name="Customers" component={CustomersScreen} />
      <Stack.Screen name="RecurringOrder" component={RecurringOrderScreen} />
      <Stack.Screen
        name="CreateOrder"
        component={QuickBillingScreen}
        initialParams={{ mode: 'order' }}
      />
    </Stack.Navigator>
  );
}
