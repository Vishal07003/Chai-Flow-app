import AsyncStorage from '@react-native-async-storage/async-storage';
import deliveryService, { LocationPingPayload } from '../services/delivery.service';

const LOCATION_BUFFER_KEY = '@chaiflow_buffered_location_pings';

export const locationTrackingService = {
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
};

export default locationTrackingService;

