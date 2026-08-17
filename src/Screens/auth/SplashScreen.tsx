import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Image, ActivityIndicator } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';

interface SplashScreenProps {
  navigation?: any;
}

export default function SplashScreen({ navigation }: SplashScreenProps) {
  useEffect(() => {
    const timer = setTimeout(() => {
      navigation?.replace('Login');
    }, 2000);
    return () => clearTimeout(timer);
  }, [navigation]);

  return (
    <View style={styles.container}>
      <View style={styles.logoCircle}>
        <Ionicons name="cafe" size={54} color="#8C331A" />
      </View>
      <Text style={styles.title}>ChaiFlow</Text>
      <Text style={styles.subtitle}>Smart Tea Supply & Delivery Network</Text>
      <ActivityIndicator size="small" color="#8C331A" style={styles.loader} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAF4ED',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  logoCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#F7EFE9',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: '#2C1E18',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 14,
    color: '#7A6A60',
    marginTop: 8,
  },
  loader: {
    marginTop: 40,
  },
});
