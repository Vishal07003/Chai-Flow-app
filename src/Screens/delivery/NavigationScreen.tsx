import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';
import DeliveryHeader from '../../components/delivery/DeliveryHeader';
import MapCard from '../../components/delivery/MapCard';

export default function NavigationScreen({ navigation }: any) {
  const activeAddress = 'Shop 12, Commercial Street, Sector 4';

  const handleOpenGoogleMaps = () => {
    const query = encodeURIComponent(activeAddress);
    Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${query}`).catch(() => {});
  };

  return (
    <SafeAreaView style={styles.container}>
      <DeliveryHeader title="GPS Navigation" showBack={true} />

      <View style={styles.content}>
        <MapCard
          destinationAddress={activeAddress}
          distanceKm="1.8 km"
          etaMinutes="5 mins"
          onPressStartNav={handleOpenGoogleMaps}
        />

        <View style={styles.instructionCard}>
          <Ionicons name="compass" size={28} color="#059669" />
          <View style={styles.instructionTextWrapper}>
            <Text style={styles.instructionTitle}>Turn Right in 200m</Text>
            <Text style={styles.instructionSub}>Onto Commercial Street Road</Text>
          </View>
        </View>

        <TouchableOpacity activeOpacity={0.8} style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.backBtnText}>Return to Route List</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAF8F5',
  },
  content: {
    padding: 16,
    flex: 1,
  },
  instructionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#EFECE8',
  },
  instructionTextWrapper: {
    marginLeft: 14,
  },
  instructionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#111827',
  },
  instructionSub: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 2,
  },
  backBtn: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#D1D5DB',
  },
  backBtnText: {
    color: '#374151',
    fontWeight: '700',
    fontSize: 14,
  },
});
