import AsyncStorage from '@react-native-async-storage/async-storage';
import deliveryService, { BackendDelivery } from './delivery.service';
import apiClient from './api';
import { STORAGE_KEYS } from '../constants/api.config';

export type OfflineActionType =
  | 'ACCEPT_TASK'
  | 'PICKUP'
  | 'ON_THE_WAY'
  | 'SUBMIT_QUANTITIES'
  | 'FAIL_DELIVERY';

export type SyncStatus =
  | 'PENDING_SYNC'
  | 'SYNCING'
  | 'SYNCED'
  | 'SYNC_FAILED'
  | 'NEEDS_REVIEW';

export interface OfflineActionPayload {
  status?: BackendDelivery['status'];
  notes?: string;
  items?: Array<{ product_id: number; delivered_quantity: number; discrepancy_notes?: string }>;
}

export interface QueuedDeliveryAction {
  actionId: string;
  deliveryId: number | string;
  partnerId: string | number; // Authenticated partner who created this action
  actionType: OfflineActionType;
  payload: OfflineActionPayload;
  createdAt: string; // ISO
  retryCount: number;
  syncStatus: SyncStatus;
  errorMessage?: string;
}

const OFFLINE_ACTIONS_STORAGE_KEY = '@chaiflow_delivery_offline_actions';
const MAX_RETRIES = 5;

// Listeners for UI notification on sync state change
type SyncListener = (queue: QueuedDeliveryAction[]) => void;
const syncListeners: Set<SyncListener> = new Set();

class OfflineDeliveryService {
  private isSyncing = false;

  /**
   * Subscribe to queue changes
   */
  subscribe(listener: SyncListener): () => void {
    syncListeners.add(listener);
    return () => syncListeners.delete(listener);
  }

  private notify(queue: QueuedDeliveryAction[]) {
    syncListeners.forEach(listener => {
      try {
        listener(queue);
      } catch (err) {
        console.log('[OfflineDeliveryService] Listener error:', err);
      }
    });
  }

  /**
   * Get currently active user profile from storage
   */
  async getCurrentPartnerId(): Promise<string | number | null> {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEYS.USER_PROFILE);
      if (stored) {
        const parsed = JSON.parse(stored);
        return parsed.id || parsed.phone || null;
      }
    } catch {
      // Fallback
    }
    return null;
  }

  /**
   * Load entire action queue from AsyncStorage
   */
  async getQueue(): Promise<QueuedDeliveryAction[]> {
    try {
      const raw = await AsyncStorage.getItem(OFFLINE_ACTIONS_STORAGE_KEY);
      if (!raw) return [];
      return JSON.parse(raw);
    } catch (err) {
      console.log('[OfflineDeliveryService] Failed to load queue:', err);
      return [];
    }
  }

  /**
   * Save queue to AsyncStorage and notify subscribers
   */
  private async saveQueue(queue: QueuedDeliveryAction[]): Promise<void> {
    try {
      await AsyncStorage.setItem(OFFLINE_ACTIONS_STORAGE_KEY, JSON.stringify(queue));
      this.notify(queue);
    } catch (err) {
      console.log('[OfflineDeliveryService] Failed to save queue:', err);
    }
  }

  /**
   * Get sync status of a specific delivery
   */
  async getDeliverySyncStatus(deliveryId: number | string): Promise<{
    syncStatus: SyncStatus | null;
    pendingActions: QueuedDeliveryAction[];
    latestAction?: QueuedDeliveryAction;
  }> {
    const queue = await this.getQueue();
    const dIdStr = String(deliveryId);
    const pendingActions = queue.filter(
      a => String(a.deliveryId) === dIdStr && a.syncStatus !== 'SYNCED'
    );

    if (pendingActions.length === 0) {
      return { syncStatus: null, pendingActions: [] };
    }

    // Determine aggregate sync state
    const hasFailed = pendingActions.some(a => a.syncStatus === 'SYNC_FAILED');
    const hasNeedsReview = pendingActions.some(a => a.syncStatus === 'NEEDS_REVIEW');
    const hasSyncing = pendingActions.some(a => a.syncStatus === 'SYNCING');

    let syncStatus: SyncStatus = 'PENDING_SYNC';
    if (hasNeedsReview) syncStatus = 'NEEDS_REVIEW';
    else if (hasFailed) syncStatus = 'SYNC_FAILED';
    else if (hasSyncing) syncStatus = 'SYNCING';

    return {
      syncStatus,
      pendingActions,
      latestAction: pendingActions[pendingActions.length - 1],
    };
  }

  /**
   * Enqueue a new delivery operational action when offline or network fails
   */
  async enqueueAction(
    deliveryId: number | string,
    actionType: OfflineActionType,
    payload: OfflineActionPayload
  ): Promise<QueuedDeliveryAction> {
    const partnerId = (await this.getCurrentPartnerId()) || 'current_user';
    const queue = await this.getQueue();

    // Check for identical pending action to prevent rapid duplicate taps
    const existingIndex = queue.findIndex(
      a =>
        String(a.deliveryId) === String(deliveryId) &&
        a.actionType === actionType &&
        a.syncStatus === 'PENDING_SYNC'
    );

    if (existingIndex >= 0) {
      // Update payload of existing pending action
      queue[existingIndex].payload = payload;
      queue[existingIndex].createdAt = new Date().toISOString();
      await this.saveQueue(queue);
      return queue[existingIndex];
    }

    const newAction: QueuedDeliveryAction = {
      actionId: `action_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      deliveryId,
      partnerId,
      actionType,
      payload,
      createdAt: new Date().toISOString(),
      retryCount: 0,
      syncStatus: 'PENDING_SYNC',
    };

    queue.push(newAction);
    await this.saveQueue(queue);
    console.log(`[OfflineDeliveryService] Enqueued ${actionType} for delivery #${deliveryId}`);
    return newAction;
  }

  /**
   * Synchronize queued actions with backend
   * Validates partner isolation, chronological order, and server state.
   */
  async syncQueue(): Promise<{
    processed: number;
    succeeded: number;
    failed: number;
    skipped: number;
  }> {
    if (this.isSyncing) {
      console.log('[OfflineDeliveryService] Sync already in progress, skipping duplicate cycle.');
      return { processed: 0, succeeded: 0, failed: 0, skipped: 0 };
    }

    const currentPartnerId = await this.getCurrentPartnerId();
    if (!currentPartnerId) {
      console.log('[OfflineDeliveryService] No authenticated partner, aborting sync.');
      return { processed: 0, succeeded: 0, failed: 0, skipped: 0 };
    }

    this.isSyncing = true;
    let processed = 0;
    let succeeded = 0;
    let failed = 0;
    let skipped = 0;

    try {
      const queue = await this.getQueue();
      if (queue.length === 0) {
        return { processed, succeeded, failed, skipped };
      }

      // Sort chronologically ascending
      queue.sort(
        (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      );

      for (let i = 0; i < queue.length; i++) {
        const item = queue[i];

        // 1. Skip already synced items
        if (item.syncStatus === 'SYNCED') continue;

        // 2. Partner Isolation Security Rule:
        // Never sync another user's action with the current JWT token
        if (String(item.partnerId) !== String(currentPartnerId)) {
          console.warn(
            `[OfflineDeliveryService] Action owner #${item.partnerId} does not match current user #${currentPartnerId}. Quarantining as NEEDS_REVIEW.`
          );
          item.syncStatus = 'NEEDS_REVIEW';
          item.errorMessage = 'Action belongs to a different user session.';
          skipped++;
          continue;
        }

        // 3. Max retry limit guard
        if (item.retryCount >= MAX_RETRIES) {
          item.syncStatus = 'NEEDS_REVIEW';
          item.errorMessage = 'Exceeded maximum retry limit.';
          skipped++;
          continue;
        }

        processed++;
        item.syncStatus = 'SYNCING';
        await this.saveQueue(queue);

        try {
          // Fetch current backend state of the delivery to avoid replaying stale actions
          let currentDelivery: BackendDelivery | null = null;
          try {
            currentDelivery = await deliveryService.getDeliveryById(item.deliveryId);
          } catch (fetchErr: any) {
            // Check HTTP status code
            if (fetchErr?.status === 404) {
              item.syncStatus = 'SYNC_FAILED';
              item.errorMessage = 'Delivery record no longer exists on server.';
              failed++;
              continue;
            } else if (fetchErr?.status === 403) {
              item.syncStatus = 'NEEDS_REVIEW';
              item.errorMessage = 'Permission denied for this delivery.';
              failed++;
              continue;
            } else {
              // Network connectivity likely dropped again
              throw fetchErr;
            }
          }

          // If delivery reached terminal status, discard stale non-terminal actions
          if (
            currentDelivery &&
            (currentDelivery.status === 'delivered' || currentDelivery.status === 'failed') &&
            item.actionType !== 'SUBMIT_QUANTITIES'
          ) {
            console.log(
              `[OfflineDeliveryService] Delivery #${item.deliveryId} is already in terminal state '${currentDelivery.status}'. Marking action ${item.actionType} as SYNCED.`
            );
            item.syncStatus = 'SYNCED';
            succeeded++;
            continue;
          }

          // Replay action based on type
          switch (item.actionType) {
            case 'ACCEPT_TASK': {
              if (currentDelivery && currentDelivery.status !== 'assigned') {
                // Already accepted or progressed
                item.syncStatus = 'SYNCED';
              } else {
                await deliveryService.updateStatus(item.deliveryId, 'accepted');
                item.syncStatus = 'SYNCED';
              }
              succeeded++;
              break;
            }

            case 'PICKUP': {
              if (currentDelivery && ['picked_up', 'on_the_way', 'delivered'].includes(currentDelivery.status)) {
                item.syncStatus = 'SYNCED';
              } else {
                await deliveryService.updateStatus(item.deliveryId, 'picked_up', item.payload.notes);
                item.syncStatus = 'SYNCED';
              }
              succeeded++;
              break;
            }

            case 'ON_THE_WAY': {
              if (currentDelivery && ['on_the_way', 'delivered'].includes(currentDelivery.status)) {
                item.syncStatus = 'SYNCED';
              } else {
                await deliveryService.updateStatus(item.deliveryId, 'on_the_way', item.payload.notes);
                item.syncStatus = 'SYNCED';
              }
              succeeded++;
              break;
            }

            case 'SUBMIT_QUANTITIES': {
              // 1. Submit reconciled delivered items
              if (item.payload.items && item.payload.items.length > 0) {
                await deliveryService.recordDeliveredQuantities(
                  item.deliveryId,
                  item.payload.items
                );
              }
              // 2. Mark delivered on backend
              if (currentDelivery?.status !== 'delivered') {
                await deliveryService.updateStatus(
                  item.deliveryId,
                  'delivered',
                  item.payload.notes
                );
              }
              item.syncStatus = 'SYNCED';
              succeeded++;
              break;
            }

            case 'FAIL_DELIVERY': {
              if (currentDelivery?.status === 'failed') {
                item.syncStatus = 'SYNCED';
              } else {
                await deliveryService.updateStatus(
                  item.deliveryId,
                  'failed',
                  item.payload.notes
                );
              }
              item.syncStatus = 'SYNCED';
              succeeded++;
              break;
            }

            default:
              item.syncStatus = 'NEEDS_REVIEW';
              item.errorMessage = `Unknown action type: ${item.actionType}`;
              skipped++;
          }
        } catch (execErr: any) {
          console.log(`[OfflineDeliveryService] Error executing action ${item.actionId}:`, execErr);
          item.retryCount += 1;

          // Differentiate network error vs 4xx validation rejection
          const statusCode = execErr?.status || execErr?.statusCode;
          if (statusCode === 400 || statusCode === 409) {
            item.syncStatus = 'NEEDS_REVIEW';
            item.errorMessage = execErr?.message || 'Server rejected status transition.';
            failed++;
          } else if (statusCode === 403) {
            item.syncStatus = 'NEEDS_REVIEW';
            item.errorMessage = 'Delivery is no longer assigned to your account.';
            failed++;
          } else if (statusCode === 404) {
            item.syncStatus = 'SYNC_FAILED';
            item.errorMessage = 'Delivery record not found on server.';
            failed++;
          } else {
            // General network / timeout failure: keep as PENDING_SYNC for next retry
            item.syncStatus = 'PENDING_SYNC';
            failed++;
            // Stop executing remaining actions to preserve ordering
            break;
          }
        }
      }

      // Clean up successfully synced actions to keep storage lightweight
      const remainingQueue = queue.filter(item => item.syncStatus !== 'SYNCED');
      await this.saveQueue(remainingQueue);

      return { processed, succeeded, failed, skipped };
    } finally {
      this.isSyncing = false;
    }
  }

  /**
   * Reset / clear queue for current user (or all) upon explicit logout
   * Ensures no cross-user replay attacks
   */
  async clearQueueOnLogout(): Promise<void> {
    try {
      await AsyncStorage.removeItem(OFFLINE_ACTIONS_STORAGE_KEY);
      this.notify([]);
      console.log('[OfflineDeliveryService] Offline queue safely cleared on logout.');
    } catch (err) {
      console.log('[OfflineDeliveryService] Error clearing queue on logout:', err);
    }
  }

  /**
   * Retry a specific failed or needs_review action
   */
  async retryAction(actionId: string): Promise<boolean> {
    const queue = await this.getQueue();
    const action = queue.find(a => a.actionId === actionId);
    if (!action) return false;

    action.syncStatus = 'PENDING_SYNC';
    action.retryCount = 0;
    action.errorMessage = undefined;
    await this.saveQueue(queue);

    // Trigger sync cycle immediately
    this.syncQueue().catch(err => console.log('[OfflineDeliveryService] Retry sync failed:', err));
    return true;
  }
}

export const offlineDeliveryService = new OfflineDeliveryService();
export default offlineDeliveryService;
