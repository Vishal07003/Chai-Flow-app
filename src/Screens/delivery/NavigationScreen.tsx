import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Linking, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';
import DeliveryHeader from '../../components/delivery/DeliveryHeader';
import MapCard from '../../components/delivery/MapCard';
import deliveryService, { BackendDelivery } from '../../services/delivery.service';

export default function NavigationScreen({ route, navigation }: any) {
  const addressParam = route.params?.address;
  const [destinationAddress, setDestinationAddress] = useState<string>(addressParam || '');

  useEffect(() => {
    if (!addressParam) {
      deliveryService.getDeliveries().then(data => {
        if (Array.isArray(data)) {
          const nextRun = data.find(
            d => d.status !== 'delivered' && d.status !== 'failed'
          );
          if (nextRun?.order_details?.delivery_address) {
            setDestinationAddress(nextRun.order_details.delivery_address);
          }
        }
      }).catch(err => {
        console.log('Failed to fetch next destination for navigation:', err);
      });
    }
  }, [addressParam]);

  const handleOpenGoogleMaps = () => {
    if (!destinationAddress) return;
    const query = encodeURIComponent(destinationAddress);
    const url = Platform.select({
      ios: `maps:0,0?q=${query}`,
      android: `geo:0,0?q=${query}`,
    }) || `https://www.google.com/maps/search/?api=1&query=${query}`;

    Linking.openURL(url).catch(() => {
      Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${query}`);
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <DeliveryHeader title="GPS Navigation" showBack={true} />

      <View style={styles.content}>
        <MapCard
          destinationAddress={destinationAddress || 'No active route'}
          onPressStartNav={handleOpenGoogleMaps}
        />

        <View style={styles.instructionCard}>
          <Ionicons name="navigate-circle-outline" size={28} color="#059669" />
          <View style={styles.instructionTextWrapper}>
            <Text style={styles.instructionTitle}>External Turn-by-Turn GPS</Text>
            <Text style={styles.instructionSub}>
              {destinationAddress
                ? 'Tap "Start GPS Navigation" above to open Google Maps.'
                : 'No active delivery destination currently assigned.'}
            </Text>
          </View>
        </View>

        <TouchableOpacity activeOpacity={0.8} style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.backBtnText}>Return to Delivery List</Text>
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
    marginLeft: 12,
    flex: 1,
  },
  instructionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
  },
  instructionSub: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
    lineHeight: 16,
  },
  backBtn: {
    backgroundColor: '#F3F4F6',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 'auto',
    marginBottom: 10,
  },
  backBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#374151',
  },
});
