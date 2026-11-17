import { Platform, PermissionsAndroid } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import deliveryService, { LocationPingPayload } from '../services/delivery.service';

const LOCATION_BUFFER_KEY = '@chaiflow_buffered_location_pings';

// State holder for active foreground tracking interval
let activeTrackingInterval: any = null;
let activeTrackingDeliveryId: number | string | null = null;

export const locationTrackingService = {
  /**
   * Request Location & Notification Permissions on Android
   */
  async requestLocationPermissions(): Promise<boolean> {
    if (Platform.OS !== 'android') return true;

    try {
      const fineLocationGranted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        {
          title: 'Chai Flow Location Permission',
          message: 'Chai Flow needs access to your GPS to track your active delivery runs.',
          buttonNeutral: 'Ask Later',
          buttonNegative: 'Deny',
          buttonPositive: 'Allow',
        }
      );

      return fineLocationGranted === PermissionsAndroid.RESULTS.GRANTED;
    } catch (err) {
      console.log('Error requesting location permissions:', err);
      return false;
    }
  },

  /**
   * Save location ping to local storage buffer (offline resilience)
   */
  async bufferLocation(deliveryId: number | string, ping: LocationPingPayload): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem(LOCATION_BUFFER_KEY);
      const queue: Array<{ deliveryId: number | string; ping: LocationPingPayload }> = stored ? JSON.parse(stored) : [];
      queue.push({ deliveryId, ping });
      await AsyncStorage.setItem(LOCATION_BUFFER_KEY, JSON.stringify(queue));
    } catch (e) {
      console.log('Failed to buffer location locally:', e);
    }
  },

  /**
   * Synchronize all buffered location updates when network is reachable
   */
  async flushBufferedPings(): Promise<number> {
    try {
      const stored = await AsyncStorage.getItem(LOCATION_BUFFER_KEY);
      if (!stored) return 0;

      const queue: Array<{ deliveryId: number | string; ping: LocationPingPayload }> = JSON.parse(stored);
      if (queue.length === 0) return 0;

      // Group pings by deliveryId
      const grouped: { [deliveryId: string]: LocationPingPayload[] } = {};
      queue.forEach(item => {
        const dId = String(item.deliveryId);
        if (!grouped[dId]) grouped[dId] = [];
        grouped[dId].push(item.ping);
      });

      let totalFlushed = 0;
      for (const [dId, pings] of Object.entries(grouped)) {
        try {
          await deliveryService.sendLocationPings(dId, pings);
          totalFlushed += pings.length;
        } catch (deliverySyncErr) {
          console.log(`Failed to flush pings for delivery #${dId}:`, deliverySyncErr);
        }
      }

      await AsyncStorage.removeItem(LOCATION_BUFFER_KEY);
      return totalFlushed;
    } catch (e) {
      console.log('Error flushing buffered pings:', e);
      return 0;
    }
  },

  /**
   * Active delivery position update: attempts direct API transmission; buffers on failure
   */
  async pingLocation(deliveryId: number | string, ping: LocationPingPayload): Promise<boolean> {
    try {
      // First attempt to flush any prior buffered offline items
      await this.flushBufferedPings();

      // Direct transmission
      const res = await deliveryService.sendLocationPings(deliveryId, ping);
      return res.success;
    } catch (networkErr) {
      console.log('Network unreachable. Buffering location update locally for offline sync.');
      await this.bufferLocation(deliveryId, ping);
      return false;
    }
  },

  /**
   * Start tracking interval when delivery enters 'on_the_way'
   */
  async startTrackingForDelivery(
    deliveryId: number | string,
    getCurrentCoords?: () => Promise<{ latitude: number; longitude: number; speed?: number; accuracy?: number } | null>
  ): Promise<boolean> {
    const hasPermission = await this.requestLocationPermissions();
    if (!hasPermission) {
      console.log('GPS tracking permission not granted');
      return false;
    }

    // Stop any existing tracking loop
    this.stopTracking();

    activeTrackingDeliveryId = deliveryId;

    // Send initial ping if coordinate getter supplied
    if (getCurrentCoords) {
      try {
        const coords = await getCurrentCoords();
        if (coords) {
          await this.pingLocation(deliveryId, {
            ...coords,
            recorded_at: new Date().toISOString(),
          });
        }
      } catch (err) {
        console.log('Error recording initial GPS ping:', err);
      }
    }

    // Poll location every 20 seconds (battery and bandwidth efficient)
    activeTrackingInterval = setInterval(async () => {
      if (!activeTrackingDeliveryId) {
        this.stopTracking();
        return;
      }

      if (getCurrentCoords) {
        try {
          const coords = await getCurrentCoords();
          if (coords) {
            await this.pingLocation(activeTrackingDeliveryId, {
              ...coords,
              recorded_at: new Date().toISOString(),
            });
          }
        } catch (err) {
          console.log('Error in location ping cycle:', err);
        }
      }
    }, 20000);

    return true;
  },

  /**
   * Stop tracking after Delivered, Failed or Cancelled
   */
  stopTracking(): void {
    if (activeTrackingInterval) {
      clearInterval(activeTrackingInterval);
      activeTrackingInterval = null;
    }
    activeTrackingDeliveryId = null;
  },

  getActiveTrackingDeliveryId(): number | string | null {
    return activeTrackingDeliveryId;
  },
};

export default locationTrackingService;
