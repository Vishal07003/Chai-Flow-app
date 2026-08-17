import React from 'react';
import { useApp } from '../context/AppContext';
import AuthNavigator from './AuthNavigator';
import OwnerNavigator from './OwnerNavigator';
import DeliveryNavigator from './DeliveryNavigator';

export default function RootNavigator() {
  const { isAuthenticated, userRole } = useApp();

  if (!isAuthenticated) {
    return <AuthNavigator />;
  }

  return userRole === 'DELIVERY_PARTNER' ? <DeliveryNavigator /> : <OwnerNavigator />;
}
