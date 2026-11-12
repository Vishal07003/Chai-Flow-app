/**
 * Main Application Component
 * Chai Flow App
 */

import React, { useEffect, useRef } from 'react';
import { NavigationContainer, NavigationContainerRef } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'react-native';
import Toast from 'react-native-toast-message';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import RootNavigator from './navigation/RootNavigator';
import { AppProvider } from './context/AppContext';
import notificationService from './services/notification.service';

export default function App() {
  const navigationRef = useRef<NavigationContainerRef<any>>(null);

  useEffect(() => {
    // 1. Request notification permission on app mount
    notificationService.requestPermission();

    // 2. Initialize FCM notification listeners with navigation callback
    const unsubscribe = notificationService.initializeListeners((screen, params) => {
      if (navigationRef.current?.isReady()) {
        navigationRef.current.navigate(screen, params);
      }
    });

    return () => {
      unsubscribe();
    };
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StatusBar barStyle="dark-content" backgroundColor="#FAF8F5" />
        <AppProvider>
          <NavigationContainer ref={navigationRef}>
            <RootNavigator />
          </NavigationContainer>
        </AppProvider>
        <Toast />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
