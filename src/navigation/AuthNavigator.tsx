import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import SplashScreen from '../Screens/auth/SplashScreen';
import LoginScreen from '../Screens/auth/LoginScreen';
import VerifyOtpScreen from '../Screens/auth/VerifyOtpScreen';

export type AuthStackParamList = {
  Splash: undefined;
  Login: undefined;
  VerifyOtp: { phone: string; sessionId: string; cooldownSeconds?: number; userExists?: boolean; role?: 'ADMIN' | 'DELIVERY_PARTNER' };
};

const Stack = createNativeStackNavigator<AuthStackParamList>();

export default function AuthNavigator() {
  return (
    <Stack.Navigator
      initialRouteName="Splash"
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="Splash" component={SplashScreen} />
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="VerifyOtp" component={VerifyOtpScreen} />
    </Stack.Navigator>
  );
}
