import { Platform, PermissionsAndroid, NativeModules } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import deliveryService, { LocationPingPayload } from '../services/delivery.service';
import apiClient from './api';
import { API_BASE_URL } from '../constants/api.config';

const { LocationModule } = NativeModules;

const LOCATION_BUFFER_KEY = '@chaiflow_buffered_location_pings';

// State holder for active foreground tracking interval (fallback or monitor)
let activeTrackingInterval: any = null;
let activeTrackingDeliveryId: number | string | null = null;

export interface TrackingState {
  isActive: boolean;
  deliveryId: string | null;
  latitude?: number;
  longitude?: number;
  recordedAt?: string;
}

export const locationTrackingService = {
  /**
   * Request Location & Notification Permissions on Android
   */
  async requestLocationPermissions(): Promise<boolean> {
    if (Platform.OS !== 'android') return true;

    try {
      const permissionsToRequest = [
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION,
      ];

      // Request notification permission on Android 13+ (API 33+)
      if (Platform.Version >= 33 && PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS) {
        permissionsToRequest.push(PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS);
      }

      const results = await PermissionsAndroid.requestMultiple(permissionsToRequest);

      const fineGranted =
        results[PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION] ===
        PermissionsAndroid.RESULTS.GRANTED;
      const coarseGranted =
        results[PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION] ===
        PermissionsAndroid.RESULTS.GRANTED;

      const hasForegroundLocation = fineGranted || coarseGranted;

      // Request background location permission on Android 10+ (API 29+) if foreground granted
      if (
        hasForegroundLocation &&
        Platform.Version >= 29 &&
        PermissionsAndroid.PERMISSIONS.ACCESS_BACKGROUND_LOCATION
      ) {
        try {
          await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.ACCESS_BACKGROUND_LOCATION,
            {
              title: 'Background Location Permission',
              message:
                'Chai Flow tracks active deliveries continuously even when the app is backgrounded or screen locked.',
              buttonNeutral: 'Later',
              buttonNegative: 'Deny',
              buttonPositive: 'Allow',
            }
          );
        } catch (bgErr) {
          console.log('Background permission request skipped/failed:', bgErr);
        }
      }

      return hasForegroundLocation;
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
      const queue: Array<{ deliveryId: number | string; ping: LocationPingPayload }> = stored
        ? JSON.parse(stored)
        : [];
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

      const queue: Array<{ deliveryId: number | string; ping: LocationPingPayload }> =
        JSON.parse(stored);
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
   * Get current device GPS position
   */
  async getCurrentPosition(): Promise<{
    latitude: number;
    longitude: number;
    accuracy?: number;
    speed?: number;
  } | null> {
    if (Platform.OS === 'android' && LocationModule?.getCurrentPosition) {
      try {
        const pos = await LocationModule.getCurrentPosition();
        if (pos) {
          return {
            latitude: pos.latitude,
            longitude: pos.longitude,
            accuracy: pos.accuracy,
            speed: pos.speed,
          };
        }
      } catch (err) {
        console.log('LocationModule getCurrentPosition failed:', err);
      }
    }
    return null;
  },

  /**
   * Start tracking interval and native foreground service when delivery enters 'picked_up' or 'on_the_way'
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

    // Stop any existing tracking loop first
    await this.stopTracking();

    activeTrackingDeliveryId = deliveryId;

    // Start Android Foreground Service for true background / locked screen tracking
    if (Platform.OS === 'android' && LocationModule?.startBackgroundTracking) {
      try {
        const token = await apiClient.getAccessToken();
        if (token) {
          await LocationModule.startBackgroundTracking(
            String(deliveryId),
            token,
            API_BASE_URL
          );
          console.log(`Native Android background location tracking started for delivery #${deliveryId}`);
        }
      } catch (nativeErr) {
        console.log('Failed to start native background location service:', nativeErr);
      }
    }

    // Send initial ping
    try {
      const coords = getCurrentCoords
        ? await getCurrentCoords()
        : await this.getCurrentPosition();

      if (coords) {
        await this.pingLocation(deliveryId, {
          ...coords,
          recorded_at: new Date().toISOString(),
        });
      }
    } catch (err) {
      console.log('Error recording initial GPS ping:', err);
    }

    // JS Polling interval (15-20s) as active fallback and in-app sync
    activeTrackingInterval = setInterval(async () => {
      if (!activeTrackingDeliveryId) {
        this.stopTracking();
        return;
      }

      try {
        const coords = getCurrentCoords
          ? await getCurrentCoords()
          : await this.getCurrentPosition();

        if (coords) {
          await this.pingLocation(activeTrackingDeliveryId, {
            ...coords,
            recorded_at: new Date().toISOString(),
          });
        }
      } catch (err) {
        console.log('Error in location ping cycle:', err);
      }
    }, 20000);

    return true;
  },

  /**
   * Stop tracking after Delivered, Failed or Cancelled
   */
  async stopTracking(): Promise<void> {
    if (activeTrackingInterval) {
      clearInterval(activeTrackingInterval);
      activeTrackingInterval = null;
    }
    activeTrackingDeliveryId = null;

    if (Platform.OS === 'android' && LocationModule?.stopBackgroundTracking) {
      try {
        await LocationModule.stopBackgroundTracking();
        console.log('Native Android background location tracking stopped');
      } catch (err) {
        console.log('Error stopping native background location service:', err);
      }
    }
  },

  /**
   * Check if tracking is active
   */
  async getTrackingStatus(): Promise<TrackingState> {
    if (Platform.OS === 'android' && LocationModule?.isTrackingActive) {
      try {
        const status = await LocationModule.isTrackingActive();
        if (status && status.isActive) {
          return {
            isActive: true,
            deliveryId: status.deliveryId,
            latitude: status.latitude,
            longitude: status.longitude,
            recordedAt: status.recordedAt,
          };
        }
      } catch (err) {
        console.log('Error reading native tracking status:', err);
      }
    }

    return {
      isActive: !!activeTrackingDeliveryId,
      deliveryId: activeTrackingDeliveryId ? String(activeTrackingDeliveryId) : null,
    };
  },

  getActiveTrackingDeliveryId(): number | string | null {
    return activeTrackingDeliveryId;
  },
};

export default locationTrackingService;
