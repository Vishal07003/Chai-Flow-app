import React from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useApp } from '../context/AppContext';
import AuthNavigator from './AuthNavigator';
import OwnerNavigator from './OwnerNavigator';
import DeliveryNavigator from './DeliveryNavigator';

export default function RootNavigator() {
  const { isAuthLoading, isAuthenticated, userRole } = useApp();

  if (isAuthLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#8C331A" />
      </View>
    );
  }

  if (!isAuthenticated) {
    return <AuthNavigator />;
  }

  return userRole === 'DELIVERY_PARTNER' ? <DeliveryNavigator /> : <OwnerNavigator />;
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: '#FAF8F5',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
